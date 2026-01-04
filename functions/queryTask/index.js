const axios = require('axios');

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
 * 将火山方舟任务状态映射为统一状态
 */
function mapVolcStatusToUnified(status) {
  const s = (typeof status === 'string') ? status.toLowerCase() : '';
  if (s === 'succeeded' || s === 'success' || s === 'completed') return 'SUCCEEDED';
  if (s === 'failed' || s === 'error') return 'FAILED';
  if (s === 'canceled' || s === 'cancelled') return 'CANCELED';
  if (s === 'pending' || s === 'queued') return 'PENDING';
  if (s === 'running' || s === 'processing') return 'RUNNING';
  return 'UNKNOWN';
}

/**
 * 解析请求参数
 */
function parsePayload(event) {
  let payload = event;

  // 处理 HTTP 请求的 body
  if (event.body) {
    try {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      payload = body.data || body;
    } catch (e) {
      console.error('解析 event.body 失败:', e);
    }
  } else {
    payload = event.data || event;
  }

  return payload;
}

/**
 * 格式化结果数组
 */
function formatResults(output) {
  const results = output.results || [];
  
  // 如果有 results 数组，使用 results
  if (results.length > 0) {
    return results.map((item) => {
      return {
        orig_prompt: item.orig_prompt || output.orig_prompt || null,
        url: item.url || item.video_url || item.image_url || null
      };
    });
  } 
  // 如果 results 为空但有 video_url（图生视频或视频特效）
  else if (output.video_url) {
    return [{
      orig_prompt: output.orig_prompt || null,
      url: output.video_url
    }];
  }
  // 如果 results 为空但有 image_url（其他情况）
  else if (output.image_url) {
    return [{
      orig_prompt: output.orig_prompt || null,
      url: output.image_url
    }];
  }
  
  return [];
}

/**
 * 查询任务状态的 API 地址
 * 根据 API 文档：GET https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}
 */
async function queryTaskAPI(apiUrl, apiKey) {
  console.log('查询任务 URL:', apiUrl);
  
  const response = await axios.get(apiUrl, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 10000
  });

  return response;
}

/**
 * 查询火山方舟视频生成任务
 * GET https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/{id}
 */
async function queryVolcTaskAPI(apiUrl, apiKey) {
  console.log('查询任务 URL:', apiUrl);

  const response = await axios.get(apiUrl, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 10000
  });

  return response;
}

/**
 * 查询异步任务结果的云函数
 * 用于查询通义万相2.5异步生成任务的状态和结果
 * 
 * @param {Object} event - 事件对象
 * @param {string} event.taskId - 任务ID（必填），从 callBailian 函数返回的 taskId
 * @param {Object} context - 上下文对象
 * @returns {Promise<Object>} 任务查询结果
 */
exports.main = async (event, context) => {
  // 解析请求参数
  const payload = parsePayload(event);
  const taskId = payload.taskId || payload.task_id || '';
  const taskType = payload.task_type || payload.taskType || '';
  
  if (!taskId) {
    return createErrorResponse('MISSING_TASK_ID', '请提供 taskId 参数');
  }

  console.log('任务 ID:', taskId);
  console.log('任务类型:', taskType || '(未传)');
  console.log('完整 payload:', JSON.stringify(payload));

  try {
    // ✅ 双通道查询：根据 taskId 前缀判断
    // - cgt- 开头 => 火山方舟 Seedance 查询
    // - 其他 => 万相/DashScope 查询
    const isVolcTask = taskId && taskId.startsWith('cgt-');
    
    if (isVolcTask) {
      console.log('识别为火山方舟任务（taskId 前缀: cgt-）');
      const volcApiKey = process.env.ARK_API_KEY || process.env.DOUBAO_API_KEY || '';
      if (!volcApiKey) {
        return createErrorResponse(
          'MISSING_API_KEY',
          '请先在 cloudbaserc.json 中配置 ARK_API_KEY（或 DOUBAO_API_KEY）环境变量'
        );
      }

      const apiUrl = `https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/${taskId}`;
      const response = await queryVolcTaskAPI(apiUrl, volcApiKey);

      // 火山返回：{ id, model, status, content: { video_url }, ... }
      const status = response.data?.status;
      const unifiedStatus = mapVolcStatusToUnified(status);
      const videoUrl = response.data?.content?.video_url || null;

      const output = {
        task_id: response.data?.id || taskId,
        task_status: unifiedStatus,
        video_url: videoUrl,
        submit_time: response.data?.created_at,
        end_time: response.data?.updated_at
      };

      const formattedResults = formatResults(output);

      return createSuccessResponse({
        taskId: taskId,
        taskStatus: unifiedStatus,
        output: output,
        results: formattedResults.length > 0 ? formattedResults : null,
        submitTime: response.data?.created_at || null,
        scheduledTime: null,
        endTime: response.data?.updated_at || null,
        requestId: response.data?.id || taskId,
        usage: response.data?.usage || null
      });
    }

    // 默认：万相 / DashScope 查询（非 cgt- 开头的 taskId）
    console.log('识别为万相任务（taskId 前缀: 非 cgt-）');
    const dashscopeApiKey = process.env.DASHSCOPE_API_KEY || '';
    if (!dashscopeApiKey) {
      return createErrorResponse(
        'MISSING_API_KEY',
        '请先在 cloudbaserc.json 中配置 DASHSCOPE_API_KEY 环境变量'
      );
    }

    // 查询任务状态的 API 地址
    const apiUrl = `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`;
    const response = await queryTaskAPI(apiUrl, dashscopeApiKey);

    // 检查响应中是否包含错误码（API 返回 HTTP 200 但业务失败的情况）
    if (response.data.code) {
      // API 返回了错误码，说明请求失败，需要透传 message
      const errorCode = response.data.code;
      const errorMsg = response.data.message || '查询任务失败';
      
      console.error('API 返回错误:', errorCode, errorMsg);
      console.error('错误响应数据:', JSON.stringify(response.data));
      
      return createErrorResponse(
        errorCode,
        errorMsg,
        {
          taskId: taskId,
          statusCode: 200, // HTTP 状态码是 200，但业务失败
          details: response.data || null
        }
      );
    }

    const output = response.data.output || {};
    // 万相 API 返回的 task_status 可能在 output.task_status 或 response.data.task_status
    const taskStatus = output.task_status || response.data.task_status || 'UNKNOWN';
    
    console.log('万相 API 响应结构:', JSON.stringify({
      hasOutput: !!response.data.output,
      outputTaskStatus: output.task_status,
      dataTaskStatus: response.data.task_status,
      finalTaskStatus: taskStatus,
      outputKeys: output ? Object.keys(output) : []
    }));

    // 格式化结果数组
    const formattedResults = formatResults(output);
    
    return createSuccessResponse({
      taskId: taskId,
      taskStatus: taskStatus,
      output: output,
      // 如果任务成功，提取结果（统一格式：包含 url 字段，可能是图片或视频）
      results: formattedResults.length > 0 ? formattedResults : null,
      // 任务时间信息
      submitTime: output.submit_time || null,
      scheduledTime: output.scheduled_time || null,
      endTime: output.end_time || null,
      // 完整响应数据
      requestId: response.data.request_id,
      // usage 信息（如果有）
      usage: response.data.usage || null
    });

  } catch (error) {
    console.error('查询任务状态失败:', error);
    console.error('错误响应数据:', JSON.stringify(error.response?.data || {}));
    
    // 确保透传 API 返回的 message
    const errorCode = error.response?.data?.code || `HTTP_${error.response?.status || 500}`;
    const errorMsg = error.response?.data?.message || error.message || '查询任务失败';
    
    return createErrorResponse(
      errorCode,
      errorMsg,
      {
        taskId: taskId,
        statusCode: error.response?.status || 500,
        details: error.response?.data || null
      }
    );
  }
};
