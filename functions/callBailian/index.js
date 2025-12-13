const axios = require('axios');
const cloudbase = require('@cloudbase/node-sdk');

// 从环境变量获取腾讯云凭证（本地测试时需要）
// 在云函数部署环境中，这些凭证会自动从云函数运行环境获取
const secretId = process.env.TENCENT_SECRET_ID || '';
const secretKey = process.env.TENCENT_SECRET_KEY || '';

// 初始化 CloudBase
// 如果在本地测试环境且提供了凭证，则使用凭证初始化
// 在云函数部署环境中，只需要 env 即可
const cloudbaseConfig = {
  env: 'startup-2gn33jt0ca955730'
};

// 本地测试时，如果提供了 secretId 和 secretKey，则添加到配置中
if (secretId && secretKey) {
  cloudbaseConfig.secretId = secretId;
  cloudbaseConfig.secretKey = secretKey;
}

const app = cloudbase.init(cloudbaseConfig);

/**
 * 标准化响应格式
 */
function createSuccessResponse(data) {
  return {
    success: true,
    data: data,
    errCode: null,
    errorMsg: null
  };
}

function createErrorResponse(errCode, errorMsg, data = null) {
  return {
    success: false,
    data: data,
    errCode: errCode,
    errorMsg: errorMsg
  };
}

/**
 * 解析请求参数
 */
function parsePayload(event) {
  let payload = event;

  // 处理 HTTP 请求的 body (TCB HTTP 触发器可能将 body 放在 event.body 中且为字符串)
  if (event.body) {
    try {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      // 如果 body 中包含 data 字段（前端包裹了 data），则使用 data
      // 否则使用 body 本身
      payload = body.data || body;
    } catch (e) {
      console.error('解析 event.body 失败:', e);
      // 解析失败，尝试直接使用 event
    }
  } else {
    // 兼容 SDK 调用
    payload = event.data || event;
  }

  return payload;
}

/**
 * 验证参数
 */
function validateParams(payload, taskType) {
  const prompt = payload.prompt || payload.text || '';
  const images = payload.images || payload.image || null;
  const videoUrl = payload.video_url || payload.videoUrl || null;

  // 验证prompt（视频特效和人像风格重绘不需要prompt）
  if (taskType !== 'video_effect' && taskType !== 'portrait_style_redraw' && taskType !== 'doubao_image_to_image' && !prompt) {
    return createErrorResponse('MISSING_PROMPT', '请提供 prompt 参数（文本提示词）');
  }

  // 根据任务类型验证必填参数
  if (taskType === 'image_to_image' || taskType === 'image_to_video' || taskType === 'doubao_image_to_image') {
    if (!images) {
      return createErrorResponse(
        'MISSING_IMAGES',
        `${taskType === 'image_to_image' || taskType === 'doubao_image_to_image' ? '图生图' : '图生视频'}任务需要提供 images 参数（图像URL或URL数组）`
      );
    }
  } else if (taskType === 'video_effect') {
    // 视频特效需要首帧图片URL（可以通过images或videoUrl传入，但实际使用img_url）
    if (!images && !videoUrl) {
      return createErrorResponse(
        'MISSING_IMAGES',
        '视频特效任务需要提供 images 参数（首帧图片URL）或 video_url 参数'
      );
    }
  } else if (taskType === 'portrait_style_redraw') {
    // 人像风格重绘需要图片URL
    if (!images) {
      return createErrorResponse(
        'MISSING_IMAGES',
        '人像风格重绘任务需要提供 images 参数（图像URL）'
      );
    }
    // 验证 style_index 参数
    const styleIndex = payload.params?.style_index;
    if (styleIndex === undefined || styleIndex === null) {
      return createErrorResponse(
        'MISSING_STYLE_INDEX',
        '人像风格重绘任务需要提供 style_index 参数（0-9为预设风格，-1为自定义风格）'
      );
    }
    // 如果 style_index 为 -1，需要提供 style_ref_url
    if (styleIndex === -1 && !payload.params?.style_ref_url) {
      return createErrorResponse(
        'MISSING_STYLE_REF_URL',
        '使用自定义风格（style_index=-1）时，需要提供 style_ref_url 参数（风格参考图URL）'
      );
    }
  } else if (taskType === 'doubao_image_to_image') {
    // 豆包图生图需要至少两张图片
    const imageArray = Array.isArray(images) ? images : [images];
    if (imageArray.length < 2) {
      return createErrorResponse(
        'MISSING_IMAGES',
        '豆包图生图任务需要提供至少2张参考图片（images参数应为URL数组）'
      );
    }
  } else {
    return createErrorResponse(
      'INVALID_TASK_TYPE',
      `不支持的任务类型: ${taskType}。支持的类型: image_to_image, image_to_video, video_effect, portrait_style_redraw, doubao_image_to_image`
    );
  }

  return null; // 验证通过
}

/**
 * 检查用户余额
 */
async function checkUserBalance(userId, price) {
  if (!userId) {
    return createErrorResponse('MISSING_USER_ID', '价格大于0时，user_id 是必填参数');
  }

  const db = app.database();
  
  // 查询用户余额（按uid维度查询）
  console.log(`🔍 [CallBailian] 查询用户余额: user_id=${userId}`);
  const userDoc = await db.collection('users')
    .where({ uid: userId })
    .get();
  
  if (!userDoc.data || userDoc.data.length === 0) {
    console.error(`❌ [CallBailian] 用户不存在: user_id=${userId}`);
    return createErrorResponse('USER_NOT_FOUND', '用户不存在');
  }

  const userBalance = userDoc.data[0].balance || 0;
  console.log(`💰 [CallBailian] 用户余额: ${userBalance}, 需要价格: ${price}`);
  
  // 检查余额是否充足
  if (userBalance < price) {
    console.error(`❌ [CallBailian] 余额不足: 当前余额=${userBalance}, 需要=${price}`);
    return createErrorResponse(
      'INSUFFICIENT_BALANCE',
      '余额不足',
      {
        currentBalance: userBalance,
        requiredAmount: price
      }
    );
  }
  
  console.log(`✅ [CallBailian] 余额充足，可以继续执行`);
  return null; // 余额充足
}

/**
 * 构建图生图请求参数
 */
function buildImageToImageRequest(payload, prompt, images) {
  const apiUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis';
  const model = 'wan2.5-i2i-preview';
  
  const input = {
    prompt: prompt,
    images: Array.isArray(images) ? images : [images]
  };

  if (payload.params?.negative_prompt) {
    input.negative_prompt = payload.params.negative_prompt;
  }

  const parameters = {};
  if (payload.params?.n !== undefined) {
    parameters.n = payload.params.n;
  } else {
    parameters.n = 1;
  }
  if (payload.params?.size) {
    parameters.size = payload.params.size;
  }
  // 写死 seed = -1
  parameters.seed = -1;
  // 写死 prompt_extend = false（不开启智能改写）
  parameters.prompt_extend = false;
  if (payload.params?.watermark !== undefined) {
    parameters.watermark = payload.params.watermark;
  }

  return {
    apiUrl,
    requestData: {
      model: model,
      input: input,
      parameters: parameters
    }
  };
}

/**
 * 构建图生视频请求参数
 */
function buildImageToVideoRequest(payload, prompt, images, audioUrl) {
  const apiUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis';
  const model = 'wan2.5-i2v-preview';
  
  const input = {
    img_url: Array.isArray(images) ? images[0] : images // 图生视频只需要一张图片，使用img_url字段（必填）
  };
  
  // prompt是可选的，如果有则添加
  if (prompt) {
    input.prompt = prompt;
  }

  // audio_url是可选的，仅wan2.5-i2v-preview支持
  if (audioUrl) {
    input.audio_url = audioUrl;
  }
  
  // parameters对象，包含resolution等参数
  const parameters = {};
  
  // resolution是可选的，支持480P、720P、1080P，默认720P
  if (payload.params?.resolution) {
    parameters.resolution = payload.params.resolution;
  }

  const requestData = {
    model: model,
    input: input,
    parameters: Object.keys(parameters).length > 0 ? parameters : undefined
  };
  
  // 如果没有parameters，移除空对象
  if (!requestData.parameters || Object.keys(requestData.parameters).length === 0) {
    delete requestData.parameters;
  }

  return {
    apiUrl,
    requestData
  };
}

/**
 * 构建视频特效请求参数
 */
function buildVideoEffectRequest(payload, images, videoUrl) {
  const apiUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis';
  const model = 'wanx2.1-i2v-turbo';
  
  // 视频特效使用首帧图片URL，而不是视频URL
  // 如果提供了images数组，使用第一张图片；否则使用videoUrl（向后兼容）
  const imgUrl = (images && Array.isArray(images) && images.length > 0) 
    ? images[0] 
    : ((images && typeof images === 'string') ? images : videoUrl);
  
  if (!imgUrl) {
    return {
      error: createErrorResponse('MISSING_IMAGES', '视频特效任务需要提供 img_url 参数（首帧图片URL）')
    };
  }
  
  const input = {
    img_url: imgUrl, // 首帧图片URL
    template: payload.params?.template || payload.params?.style_type || 'flying' // 特效模板，如 "flying", "frenchkiss" 等
  };

  const parameters = {};
  
  // resolution是可选的，支持480P、720P、1080P
  if (payload.params?.resolution) {
    parameters.resolution = payload.params.resolution;
  } else {
    parameters.resolution = '720P'; // 默认720P
  }

  return {
    apiUrl,
    requestData: {
      model: model,
      input: input,
      parameters: parameters
    }
  };
}

/**
 * 构建人像风格重绘请求参数
 */
function buildPortraitStyleRedrawRequest(payload, images) {
  const apiUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/image-generation/generation';
  const model = 'wanx-style-repaint-v1';
  
  // 获取图片URL（支持数组或单个字符串）
  const imageUrl = Array.isArray(images) ? images[0] : images;
  
  if (!imageUrl) {
    return {
      error: createErrorResponse('MISSING_IMAGES', '人像风格重绘任务需要提供 images 参数（图像URL）')
    };
  }
  
  const input = {
    image_url: imageUrl,
    style_index: payload.params?.style_index !== undefined ? payload.params.style_index : 0
  };
  
  // 如果 style_index 为 -1（自定义风格），需要提供 style_ref_url
  if (input.style_index === -1) {
    if (!payload.params?.style_ref_url) {
      return {
        error: createErrorResponse('MISSING_STYLE_REF_URL', '使用自定义风格（style_index=-1）时，需要提供 style_ref_url 参数')
      };
    }
    input.style_ref_url = payload.params.style_ref_url;
  }

  return {
    apiUrl,
    requestData: {
      model: model,
      input: input
    }
  };
}

/**
 * 构建豆包图生图请求参数
 * 
 * @param {Object} payload - 请求载荷
 * @param {string} prompt - 提示词文本
 * @param {string|Array<string>} images - 图片URL或URL数组
 * 
 * 重要说明：image 参数顺序
 * - images[0] 对应 prompt 中的"图1"或"第一张图"
 * - images[1] 对应 prompt 中的"图2"或"第二张图"
 * - images[2] 对应 prompt 中的"图3"或"第三张图"
 * - 以此类推...
 * 
 * 在相册（Album）场景中的标准构建规则：
 * - images[0] = selectedSelfieUrl（用户选择的自拍图，人物来源图）
 * - images[1] = result_image（结果图/场景图，目标场景图）
 * 
 * 示例：
 * - images: [selectedSelfieUrl, result_image]
 * - prompt: "将图2中的人物替换为图1的人物" 
 *   含义：将 images[1]（result_image，场景图）中的人物替换为 images[0]（selectedSelfieUrl，用户自拍图）中的人物
 * 
 * 注意：prompt 中提到的"图1"、"图2"等，是按照 images 数组的索引顺序（从1开始计数）
 */
function buildDoubaoImageToImageRequest(payload, prompt, images) {
  const apiUrl = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
  const model = 'doubao-seedream-4-5-251128';
  
  // 确保 images 是数组
  const imageArray = Array.isArray(images) ? images : [images];
  
  if (imageArray.length < 2) {
    return {
      error: createErrorResponse('MISSING_IMAGES', '豆包图生图任务需要提供至少2张参考图片（images参数应为URL数组）')
    };
  }
  
  // 记录图片顺序信息（用于调试）
  console.log(`📸 [CallBailian] 豆包图生图图片顺序:`);
  imageArray.forEach((url, index) => {
    console.log(`   图${index + 1} (images[${index}]): ${url.substring(0, 80)}...`);
  });
  console.log(`📝 [CallBailian] 提示词: ${prompt.substring(0, 100)}...`);
  
  const requestData = {
    model: model,
    prompt: prompt,
    image: imageArray, // 直接传递数组，顺序保持不变
    response_format: 'url',
    size: '2k', // 固定为 2k（豆包API要求小写：'1k', '2k', '4k' 或 'WIDTHxHEIGHT'）
    stream: false,
    watermark: payload.params?.watermark !== undefined ? payload.params.watermark : false,
    sequential_image_generation: payload.params?.sequential_image_generation || 'disabled'
  };

  return {
    apiUrl,
    requestData
  };
}

/**
 * 构建请求参数（根据任务类型）
 */
function buildRequestParams(payload, taskType, prompt, images, videoUrl, audioUrl) {
  if (taskType === 'image_to_image') {
    return buildImageToImageRequest(payload, prompt, images);
  } else if (taskType === 'image_to_video') {
    return buildImageToVideoRequest(payload, prompt, images, audioUrl);
  } else if (taskType === 'video_effect') {
    return buildVideoEffectRequest(payload, images, videoUrl);
  } else if (taskType === 'portrait_style_redraw') {
    return buildPortraitStyleRedrawRequest(payload, images);
  } else if (taskType === 'doubao_image_to_image') {
    return buildDoubaoImageToImageRequest(payload, prompt, images);
  } else {
    return {
      error: createErrorResponse('INVALID_TASK_TYPE', `不支持的任务类型: ${taskType}`)
    };
  }
}

/**
 * 扣减余额并创建交易流水
 */
async function deductBalanceAndCreateTransaction(userId, price, taskType, taskId, prompt) {
  try {
    const db = app.database();
    const now = Date.now();

    // 获取用户当前余额（按uid维度查询）
    console.log(`🔍 [CallBailian] 获取用户当前余额: user_id=${userId}`);
    const userDoc = await db.collection('users')
      .where({ uid: userId })
      .get();
    
    if (!userDoc.data || userDoc.data.length === 0) {
      console.error('❌ [CallBailian] 用户数据不存在，无法扣减余额');
      return;
    }

    const balanceBefore = userDoc.data[0].balance || 0;
    const balanceAfter = balanceBefore - price;
    
    console.log(`💰 [CallBailian] 余额变更: ${balanceBefore} -> ${balanceAfter} (扣除 ${price})`);

    // 更新用户余额（按uid维度更新）
    console.log(`💾 [CallBailian] 更新用户余额...`);
    const userRecord = userDoc.data[0];
    const docId = userRecord._id || userRecord._openid;
    await db.collection('users')
      .doc(docId)
      .update({
        balance: balanceAfter,
        updated_at: now
      });
    console.log(`✅ [CallBailian] 用户余额更新成功`);

    // 创建交易流水
    const taskTypeDescriptions = {
      'image_to_image': '使用AI图生图功能',
      'image_to_video': '使用AI图生视频功能',
      'video_effect': '使用AI视频特效功能',
      'portrait_style_redraw': '使用AI人像风格重绘功能',
      'doubao_image_to_image': '使用豆包图生图功能'
    };
    
    const transactionData = {
      user_id: userId,
      transaction_type: 'coin_consumption',
      status: 'completed',
      coin_amount: -price,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      payment_method: 'internal',
      description: taskTypeDescriptions[taskType] || '使用AI功能',
      related_id: taskId,
      created_at: now,
      updated_at: now,
      completed_at: now,
      metadata: {
        bailian: {
          task_type: taskType,
          task_id: taskId,
          prompt: prompt
        }
      }
    };

    console.log(`💾 [CallBailian] 创建交易流水:`, JSON.stringify(transactionData));
    await db.collection('transactions').add(transactionData);
    console.log('✅ [CallBailian] 余额扣减和流水创建成功');
  } catch (error) {
    console.error('❌ [CallBailian] 扣减余额或创建流水失败:', error);
    // 注意：这里不返回错误，因为任务已经提交成功
    // 余额扣减失败可以通过其他方式补偿
  }
}

/**
 * 调用阿里云百炼 API 或豆包 API
 */
async function callBailianAPI(apiUrl, requestData, apiKey, taskType) {
  console.log(`🚀 [CallBailian] 调用 API (任务类型: ${taskType})`);
  console.log('📡 [CallBailian] 请求 URL:', apiUrl);
  console.log('📤 [CallBailian] 请求数据:', JSON.stringify(requestData));
  
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };
  
  // 对于需要异步的任务，添加 X-DashScope-Async 头（豆包图生图是同步返回，不需要此头）
  if (taskType === 'image_to_image' || taskType === 'image_to_video' || taskType === 'video_effect' || taskType === 'portrait_style_redraw') {
    headers['X-DashScope-Async'] = 'enable';
  }
  
  const response = await axios.post(apiUrl, requestData, {
    headers: headers,
    timeout: 60000 // 豆包图生图可能需要更长时间，设置为60秒
  });

  return response;
}

/**
 * 调用阿里云百炼模型的云函数
 * 支持五种任务类型：
 * 1. image_to_image - 图生图（通义万相2.5）
 * 2. image_to_video - 图生视频
 * 3. video_effect - 视频特效
 * 4. portrait_style_redraw - 人像风格重绘
 * 5. doubao_image_to_image - 豆包图生图（同步返回，不需要TaskId轮询）
 * 
 * @param {Object} event - 事件对象
 * @param {string} event.task_type - 任务类型（必填）：'image_to_image' | 'image_to_video' | 'video_effect' | 'portrait_style_redraw' | 'doubao_image_to_image'
 * @param {string} event.prompt - 文本提示词（必填，视频特效和人像风格重绘不需要）
 * @param {string|Array} event.images - 图像URL或URL数组（图生图、图生视频、人像风格重绘、豆包图生图必填，豆包图生图需要至少2张图片）
 * @param {string} event.video_url - 视频URL（视频特效可选）
 * @param {Object} event.params - 其他可选参数
 * @param {number} event.params.n - 生成数量（图生图：1-4，默认1）
 * @param {string} event.params.size - 图像尺寸（图生图使用，格式为宽*高，如 "1280*1280"；豆包图生图固定为'2k'，此参数将被忽略）
 * @param {number} event.params.duration - 视频时长（秒），图生视频使用
 * @param {number} event.params.fps - 视频帧率，图生视频使用
 * @param {string} event.params.template - 特效模板，视频特效使用（如 "flying", "frenchkiss" 等）
 * @param {number} event.params.style_index - 风格索引，人像风格重绘使用（0-9为预设风格，-1为自定义风格）
 * @param {string} event.params.style_ref_url - 风格参考图URL，人像风格重绘使用（当style_index=-1时必填）
 * @param {number} event.params.seed - 随机种子（可选）
 * @param {string} event.params.negative_prompt - 反向提示词（可选）
 * @param {boolean} event.params.watermark - 是否添加水印（可选）
 * @param {Object} context - 上下文对象
 * @returns {Promise<Object>} API 响应结果
 *   - 异步任务（image_to_image, image_to_video, video_effect, portrait_style_redraw）：包含 taskId 用于查询任务状态
 *   - 同步任务（doubao_image_to_image）：直接返回 resultUrl
 */
exports.main = async (event, context) => {
  // 解析请求参数
  const payload = parsePayload(event);
  console.log('📥 [CallBailian] 收到请求参数:', JSON.stringify(payload));
  
  // 获取任务类型，默认为 image_to_image 以保持向后兼容
  const taskType = payload.task_type || payload.taskType || 'image_to_image';
  
  // 根据任务类型选择对应的 API Key
  // - 豆包图生图任务：使用 DOUBAO_API_KEY 或 ARK_API_KEY
  // - 其他任务（阿里百炼）：使用 DASHSCOPE_API_KEY
  let apiKey = '';
  let apiKeyEnvName = '';
  
  if (taskType === 'doubao_image_to_image') {
    // 豆包图生图任务：使用豆包 API Key
    // 优先级：DOUBAO_API_KEY > ARK_API_KEY
    apiKey = process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || '';
    apiKeyEnvName = 'DOUBAO_API_KEY 或 ARK_API_KEY';
    console.log('🔑 [CallBailian] 使用豆包 API Key（任务类型: doubao_image_to_image）');
  } else {
    // 其他任务（阿里百炼）：使用阿里云百炼 API Key
    apiKey = process.env.DASHSCOPE_API_KEY || '';
    apiKeyEnvName = 'DASHSCOPE_API_KEY';
    console.log('🔑 [CallBailian] 使用阿里云百炼 API Key（任务类型: ' + taskType + '）');
  }
  
  // 如果没有配置对应的 API Key，返回错误
  if (!apiKey) {
    return createErrorResponse(
      'MISSING_API_KEY',
      `请先在 cloudbaserc.json 中配置 ${apiKeyEnvName} 环境变量` + 
      (taskType === 'doubao_image_to_image' ? '（需要在火山方舟控制台获取）' : '（需要在阿里云百炼控制台获取）')
    );
  }
  
  console.log('✅ [CallBailian] API Key 已配置（长度: ' + apiKey.length + '）');
  const prompt = payload.prompt || payload.text || '';
  const images = payload.images || payload.image || null;
  const videoUrl = payload.video_url || payload.videoUrl || null;
  const audioUrl = payload.audio_url || payload.audioUrl || null;
  const user_id = payload.user_id;
  const price = payload.price || 0;
  
  console.log('🔍 [CallBailian] 解析参数:', { 
    taskType, 
    prompt: prompt ? (prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt) : '(无)',
    imagesCount: images ? (Array.isArray(images) ? images.length : 1) : 0,
    hasVideoUrl: !!videoUrl,
    hasAudioUrl: !!audioUrl,
    user_id, 
    price 
  });
  
  // 验证参数
  const validationError = validateParams(payload, taskType);
  if (validationError) {
    return validationError;
  }

  // 如果价格大于0，需要检查用户余额
  if (price > 0) {
    console.log(`💰 [CallBailian] 价格检查: price=${price}, user_id=${user_id}`);
    const balanceError = await checkUserBalance(user_id, price);
    if (balanceError) {
      return balanceError;
    }
  } else {
    console.log(`🆓 [CallBailian] 免费模板，无需检查余额`);
  }

  // 构建请求参数
  const requestParams = buildRequestParams(payload, taskType, prompt, images, videoUrl, audioUrl);
  if (requestParams.error) {
    return requestParams.error;
  }

  const { apiUrl, requestData } = requestParams;

  try {
    // 调用阿里云百炼 API 或豆包 API
    const response = await callBailianAPI(apiUrl, requestData, apiKey, taskType);

    // 豆包图生图是同步返回，直接返回结果URL
    if (taskType === 'doubao_image_to_image') {
      console.log(`✅ [CallBailian] 豆包图生图任务完成`);
      console.log('📥 [CallBailian] 响应数据:', JSON.stringify(response.data));
      
      // 豆包API直接返回结果，格式为 { data: [{ url: "..." }] }
      const resultUrl = response.data?.data?.[0]?.url;
      
      if (!resultUrl) {
        return createErrorResponse(
          'NO_RESULT_URL',
          '豆包图生图未返回结果URL',
          response.data
        );
      }
      
      // 如果调用成功且价格大于0，扣减余额并创建流水
      if (price > 0 && user_id) {
        await deductBalanceAndCreateTransaction(user_id, price, taskType, null, prompt);
      } else {
        if (price === 0) {
          console.log('🆓 [CallBailian] 免费模板，无需扣减余额');
        } else {
          console.log('⚠️ [CallBailian] 价格大于0但未扣减余额（可能缺少user_id）');
        }
      }
      
      return createSuccessResponse({
        resultUrl: resultUrl,
        responseData: response.data,
        message: '豆包图生图任务完成'
      });
    }

    // 如果是异步任务，返回任务ID
    if (response.data.output && response.data.output.task_id) {
      const taskId = response.data.output.task_id;
      console.log(`✅ [CallBailian] 任务提交成功，taskId=${taskId}`);
      
      // 如果调用成功且价格大于0，扣减余额并创建流水
      if (price > 0 && user_id) {
        await deductBalanceAndCreateTransaction(user_id, price, taskType, taskId, prompt);
      } else {
        if (price === 0) {
          console.log('🆓 [CallBailian] 免费模板，无需扣减余额');
        } else {
          console.log('⚠️ [CallBailian] 价格大于0但未扣减余额（可能缺少user_id）');
        }
      }
      
      return createSuccessResponse({
        taskId: taskId,
        requestId: response.data.request_id,
        message: '任务已提交，请使用 taskId 查询结果'
      });
    }

    // 同步返回结果（如果价格大于0，也需要扣减余额）
    if (price > 0 && user_id && response.data) {
      await deductBalanceAndCreateTransaction(user_id, price, taskType, null, prompt);
    }

    return createSuccessResponse({
      requestId: response.data.request_id,
      responseData: response.data
    });

  } catch (error) {
    console.error('❌ [CallBailian] 调用阿里云百炼 API 失败:', error);
    console.error('❌ [CallBailian] 错误响应数据:', JSON.stringify(error.response?.data || {}));
    console.error('❌ [CallBailian] 请求 URL:', apiUrl);
    console.error('❌ [CallBailian] 请求数据:', JSON.stringify(requestData));
    
    // 返回统一的错误信息
    const errorCode = error.response?.data?.code || `HTTP_${error.response?.status || 500}`;
    const errorMsg = error.response?.data?.message || error.message || '调用 API 失败';
    
    return createErrorResponse(
      errorCode,
      errorMsg,
      {
        statusCode: error.response?.status || 500,
        details: error.response?.data || null,
        requestUrl: apiUrl
      }
    );
  }
};
