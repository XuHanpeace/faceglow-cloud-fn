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
 * 查询异步任务结果的云函数
 * 用于查询通义万相2.5异步生成任务的状态和结果
 * 
 * @param {Object} event - 事件对象
 * @param {string} event.taskId - 任务ID（必填），从 callBailian 函数返回的 taskId
 * @param {Object} context - 上下文对象
 * @returns {Promise<Object>} 任务查询结果
 */
exports.main = async (event, context) => {
  // 从环境变量获取 API Key
  const apiKey = process.env.DASHSCOPE_API_KEY || '';
  
  if (!apiKey) {
    return createErrorResponse(
      'MISSING_API_KEY',
      '请先在 cloudbaserc.json 中配置 DASHSCOPE_API_KEY 环境变量'
    );
  }

  // 解析请求参数
  const payload = parsePayload(event);
  const taskId = payload.taskId || payload.task_id || '';
  
  if (!taskId) {
    return createErrorResponse('MISSING_TASK_ID', '请提供 taskId 参数');
  }

  // 查询任务状态的 API 地址
  const apiUrl = `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`;
  console.log('任务 ID:', taskId);

  try {
    // 调用查询 API
    const response = await queryTaskAPI(apiUrl, apiKey);

    const output = response.data.output || {};
    const taskStatus = output.task_status || 'UNKNOWN';

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
