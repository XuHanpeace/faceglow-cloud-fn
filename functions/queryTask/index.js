const axios = require('axios');

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
    return {
      success: false,
      error: '请先在 cloudbaserc.json 中配置 DASHSCOPE_API_KEY 环境变量'
    };
  }

  // 从事件中获取参数
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

  const taskId = payload.taskId || payload.task_id || '';
  
  if (!taskId) {
    return {
      success: false,
      error: '请提供 taskId 参数'
    };
  }

  // 查询任务状态的 API 地址
  // 根据 API 文档：GET https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}
  const apiUrl = `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`;

  try {
    console.log('查询任务 URL:', apiUrl);
    console.log('任务 ID:', taskId);
    
    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    const output = response.data.output || {};
    const taskStatus = output.task_status || 'UNKNOWN';

    // 返回完整的任务信息
    return {
      success: true,
      taskId: taskId,
      taskStatus: taskStatus,
      output: output,
      // 如果任务成功，提取结果
      results: output.results || null,
      // 任务时间信息
      submitTime: output.submit_time || null,
      scheduledTime: output.scheduled_time || null,
      endTime: output.end_time || null,
      // 完整响应数据
      data: response.data,
      requestId: response.data.request_id
    };

  } catch (error) {
    console.error('查询任务状态失败:', error);
    console.error('错误响应数据:', JSON.stringify(error.response?.data || {}));
    
    return {
      success: false,
      error: error.response?.data?.message || error.message || '查询任务失败',
      statusCode: error.response?.status || 500,
      details: error.response?.data || null,
      taskId: taskId
    };
  }
};

