const cloud = require('@cloudbase/node-sdk')
const axios = require('axios')

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
})

/**
 * 调用百炼文生图接口生成图片
 * 使用阿里云百炼的万相文生图API
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

    const { prompt, negative_prompt = '', width = 1024, height = 1024, num_images = 1 } = body

    if (!prompt) {
      return {
        code: 400,
        message: '提示词不能为空',
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

    // 百炼文生图API地址
    const apiUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis'
    
    // 构建请求参数
    const requestData = {
      model: 'wanx-v1', // 万相文生图模型
      input: {
        prompt: prompt,
      },
      parameters: {
        size: `${width}*${height}`,
        n: Math.min(num_images, 2), // 最多生成2张
      },
    }

    // 添加负面提示词（如果有）
    if (negative_prompt) {
      requestData.input.negative_prompt = negative_prompt
    }

    console.log('调用百炼文生图API:', JSON.stringify(requestData))

    // 调用百炼API（异步模式）
    const response = await axios.post(
      apiUrl,
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable', // 启用异步模式
        },
        timeout: 30000, // 30秒超时
      }
    )

    // 百炼API返回任务ID（异步模式）
    if (response.data && response.data.output && response.data.output.task_id) {
      const taskId = response.data.output.task_id
      console.log('任务已提交，taskId:', taskId)

      // 直接返回 taskId，不轮询
      return {
        code: 200,
        message: '任务已提交',
        data: {
          task_id: taskId,
          request_id: response.data.request_id,
        },
      }
    } else {
      return {
        code: 500,
        message: '百炼API返回异常',
        data: response.data,
      }
    }
  } catch (error) {
    console.error('生成图片失败:', error)
    return {
      code: 500,
      message: error.response?.data?.message || error.message || '生成图片失败',
      error: error.toString(),
    }
  }
}

