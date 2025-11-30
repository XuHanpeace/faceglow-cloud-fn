const axios = require('axios');

/**
 * 调用阿里云百炼通义万相2.5模型的云函数
 * 支持图像编辑（Image-to-Image）功能
 * 
 * @param {Object} event - 事件对象
 * @param {string} event.prompt - 文本提示词（必填），描述要生成的图像内容
 * @param {string|Array} event.images - 图像URL或URL数组（必填），用于图像编辑
 * @param {Object} event.params - 其他可选参数
 * @param {number} event.params.n - 生成图片数量，范围 1-4，默认为 1
 * @param {string} event.params.size - 图像尺寸，格式为宽*高，如 "1280*1280"
 * @param {number} event.params.seed - 随机种子，用于可复现的结果（可选）
 * @param {string} event.params.negative_prompt - 反向提示词（可选）
 * @param {boolean} event.params.watermark - 是否添加水印（可选）
 * @param {Object} context - 上下文对象
 * @returns {Promise<Object>} API 响应结果，包含 taskId 用于查询任务状态
 */
exports.main = async (event, context) => {
  // 从环境变量获取 API Key（请在 cloudbaserc.json 中配置）
  const apiKey = process.env.DASHSCOPE_API_KEY || '';
  
  // 如果没有配置 API Key，返回错误
  if (!apiKey) {
    return {
      success: false,
      error: '请先在 cloudbaserc.json 中配置 DASHSCOPE_API_KEY 环境变量'
    };
  }

  // 阿里云百炼 DashScope API 地址 - 通义万相2.5图像编辑
  // 已验证可用的端点
  const apiUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis';
  
  // 从事件中获取参数
  const prompt = event.prompt || event.text || '';
  const images = event.images || event.image || null;
  
  if (!prompt) {
    return {
      success: false,
      error: '请提供 prompt 参数（文本提示词）'
    };
  }

  if (!images) {
    return {
      success: false,
      error: '请提供 images 参数（图像URL或URL数组）'
    };
  }

  // 构建请求参数
  // 通义万相2.5 图像编辑模型名称：wan2.5-i2i-preview
  const input = {
    prompt: prompt,
    images: Array.isArray(images) ? images : [images] // 确保 images 是数组
  };

  // 添加可选参数到 input
  if (event.params?.negative_prompt) {
    input.negative_prompt = event.params.negative_prompt;
  }

  // 构建 parameters 对象
  const parameters = {};
  
  // 添加可选参数到 parameters
  if (event.params?.n !== undefined) {
    parameters.n = event.params.n; // 生成数量，范围 1-4，默认 1
  } else {
    parameters.n = 1; // 默认生成 1 张图片
  }
  
  if (event.params?.size) {
    parameters.size = event.params.size; // 图像尺寸，格式：宽*高
  }
  
  if (event.params?.seed !== undefined && event.params?.seed !== null) {
    parameters.seed = event.params.seed; // 随机种子
  }
  
  if (event.params?.watermark !== undefined) {
    parameters.watermark = event.params.watermark; // 是否添加水印
  }

  // 构建完整的请求数据
  const requestData = {
    model: 'wan2.5-i2i-preview', // 图像编辑模型
    input: input,
    parameters: parameters
  };

  try {
    // 发送请求到阿里云百炼 API
    // 注意：如果遇到 URL 错误，请检查：
    // 1. API Key 是否有权限访问通义万相2.5模型
    // 2. 模型名称是否正确
    // 3. 端点路径是否正确
    console.log('请求 URL:', apiUrl);
    console.log('请求数据:', JSON.stringify(requestData));
    
    const response = await axios.post(
      apiUrl,
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable' // 异步调用，通义万相2.5必须使用异步模式
        },
        timeout: 30000 // 30秒超时
      }
    );

    // 如果是异步任务，返回任务ID
    if (response.data.output && response.data.output.task_id) {
      return {
        success: true,
        taskId: response.data.output.task_id,
        message: '任务已提交，请使用 taskId 查询结果',
        requestId: response.data.request_id
      };
    }

    // 同步返回结果
    return {
      success: true,
      data: response.data,
      requestId: response.data.request_id
    };

  } catch (error) {
    console.error('调用阿里云百炼 API 失败:', error);
    console.error('错误响应数据:', JSON.stringify(error.response?.data || {}));
    console.error('请求 URL:', apiUrl);
    console.error('请求数据:', JSON.stringify(requestData));
    
    // 返回详细的错误信息
    const errorResponse = {
      success: false,
      error: error.response?.data?.message || error.message || '调用 API 失败',
      statusCode: error.response?.status || 500,
      details: error.response?.data || null,
      requestUrl: apiUrl,
      requestData: requestData
    };
    
    return errorResponse;
  }
};

