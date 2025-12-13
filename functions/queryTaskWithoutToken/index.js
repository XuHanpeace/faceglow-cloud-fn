const cloud = require('@cloudbase/node-sdk')
const axios = require('axios')

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
})

/**
 * 查询百炼任务状态（无需token，使用云函数内置的API Key）
 * 用于轮询任务状态并获取结果
 */
exports.main = async (event, context) => {
  try {
    // 解析请求参数（支持HTTP触发器和直接调用）
    let body = event
    if (event.body) {
      try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
      } catch (e) {
        body = event
      }
    }

    const { task_id } = body

    if (!task_id) {
      return {
        code: 400,
        message: 'task_id 不能为空',
      }
    }

    // 从环境变量获取百炼API Key
    const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || 'sk-a15db01142a245c68daef490a5c9bc3c'

    if (!DASHSCOPE_API_KEY) {
      return {
        code: 500,
        message: '百炼API Key未设置，请在云函数环境变量中配置 DASHSCOPE_API_KEY',
      }
    }

    // 查询任务状态
    const queryUrl = `https://dashscope.aliyuncs.com/api/v1/tasks/${task_id}`
    
    console.log('查询任务状态:', task_id)

    const response = await axios.get(queryUrl, {
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
      },
      timeout: 10000,
    })

    const taskStatus = response.data.output?.task_status
    console.log('任务状态:', taskStatus)

    if (taskStatus === 'SUCCEEDED') {
      // 任务成功，返回图片URL（不转换为base64，避免响应体过大）
      const results = response.data.output.results || []
      const imageUrls = results.map(result => result.url || '').filter(url => url)

      return {
        code: 200,
        message: '任务完成',
        data: {
          task_id: task_id,
          task_status: taskStatus,
          images: imageUrls, // 只返回URL，前端可以自行处理
        },
      }
    } else if (taskStatus === 'FAILED') {
      // 任务失败，立即终止
      return {
        code: 500,
        message: '图片生成失败',
        data: {
          task_id: task_id,
          task_status: taskStatus,
          error: response.data.output?.message || '未知错误',
        },
      }
    } else {
      // PENDING 或 RUNNING 状态
      return {
        code: 200,
        message: '任务进行中',
        data: {
          task_id: task_id,
          task_status: taskStatus,
        },
      }
    }
  } catch (error) {
    console.error('查询任务状态失败:', error)
    return {
      code: 500,
      message: error.response?.data?.message || error.message || '查询任务状态失败',
      error: error.toString(),
    }
  }
}

