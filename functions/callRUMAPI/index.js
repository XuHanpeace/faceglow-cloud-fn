const cloud = require('@cloudbase/node-sdk')
const tencentcloud = require('tencentcloud-sdk-nodejs-rum')

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
})

// 初始化 RUM 客户端
const RumClient = tencentcloud.rum.v20210622.Client

/**
 * 调用腾讯云RUM API（支持单个或批量调用）
 * 
 * 单个调用：
 * {
 *   Action: "DescribeRumLogList",
 *   Version: "2021-06-22",
 *   ...其他参数
 * }
 * 
 * 批量调用：
 * {
 *   batch: [
 *     { Action: "DescribeRumLogList", Version: "2021-06-22", ... },
 *     { Action: "DescribeData", Version: "2021-06-22", ... }
 *   ]
 * }
 */
exports.main = async (event, context) => {
  try {
    // 解析请求参数
    let body = event
    if (event.body) {
      try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
      } catch (e) {
        body = event
      }
    }

    // 从环境变量获取腾讯云凭证
    const SECRET_ID = process.env.TENCENT_SECRET_ID || ''
    const SECRET_KEY = process.env.TENCENT_SECRET_KEY || ''

    if (!SECRET_ID || !SECRET_KEY) {
      return {
        code: 500,
        message: '腾讯云凭证未配置，请在云函数环境变量中配置 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY',
      }
    }

    // 配置客户端
    const clientConfig = {
      credential: {
        secretId: SECRET_ID,
        secretKey: SECRET_KEY,
      },
      region: 'ap-shanghai',
      profile: {
        httpProfile: {
          endpoint: 'rum.tencentcloudapi.com',
        },
      },
    }

    const client = new RumClient(clientConfig)

    // 检查是否为批量调用
    if (body.batch && Array.isArray(body.batch)) {
      // 批量调用模式
      console.log(`批量调用模式，共 ${body.batch.length} 个请求`)
      
      const results = []
      const errors = []

      for (let i = 0; i < body.batch.length; i++) {
        const request = body.batch[i]
        const { Action, Version, ...params } = request

        if (!Action || !Version) {
          errors.push({
            index: i,
            error: 'Action 和 Version 参数必填',
          })
          continue
        }

        try {
          // 使用 SDK 调用 API（方法名就是 Action 名称，如 DescribeRumLogList）
          const methodName = Action
          if (typeof client[methodName] !== 'function') {
            throw new Error(`方法 ${methodName} 不存在`)
          }
          

          
          const response = await client[methodName](params)

          results.push({
            index: i,
            action: Action,
            success: true,
            data: response,
          })

          console.log(`批量请求 ${i + 1}/${body.batch.length} (${Action}) 成功`)
        } catch (error) {
          console.error(`批量请求 ${i + 1}/${body.batch.length} (${Action}) 失败:`, error)
          
          // 处理 project not found 错误
          let errorMessage = error.message || error.toString()
          if (error.code === 'ResourceNotFound' || errorMessage.includes('not found project')) {
            errorMessage = '项目未找到，请检查 ProjectID 参数是否正确，或确认您有该项目的访问权限'
          }
          
          errors.push({
            index: i,
            action: Action,
            success: false,
            error: errorMessage,
            code: error.code,
            params: params, // 包含请求参数，方便调试
          })
        }
      }

      return {
        code: errors.length === 0 ? 200 : 207, // 207 表示部分成功
        message: errors.length === 0 ? '全部成功' : `${results.length} 成功, ${errors.length} 失败`,
        results,
        errors: errors.length > 0 ? errors : undefined,
      }
    } else {
      // 单个调用模式（兼容旧接口）
      const { Action, Version, ...otherParams } = body

      if (!Action || !Version) {
        return {
          code: 400,
          message: 'Action 和 Version 参数必填',
        }
      }

      try {
        // 使用 SDK 调用 API（方法名就是 Action 名称，如 DescribeRumLogList）
        const methodName = Action
        if (typeof client[methodName] !== 'function') {
          return {
            code: 400,
            message: `方法 ${methodName} 不存在`,
          }
        }
        
        // 兼容处理：如果传入了 ProjectID 参数，转换为 ID（SDK 实际需要 ID 参数）

        
        const response = await client[methodName](otherParams)

        console.log(`调用 RUM API (${Action}) 成功`)

        return {
          code: 200,
          message: '成功',
          data: response,
        }
      } catch (error) {
        console.error(`调用 RUM API (${Action}) 失败:`, error)
        
        // 处理 project not found 错误
        let errorMessage = error.message || '调用RUM API失败'
        if (error.code === 'ResourceNotFound' || errorMessage.includes('not found project')) {
          errorMessage = '项目未找到，请检查 ProjectID 参数是否正确，或确认您有该项目的访问权限。请求参数: ' + JSON.stringify(otherParams)
        }
        
        return {
          code: error.code || 500,
          message: errorMessage,
          error: error.toString(),
          params: otherParams, // 包含请求参数，方便调试
        }
      }
    }
  } catch (error) {
    console.error('调用RUM API失败:', error)
    return {
      code: 500,
      message: error.message || '调用RUM API失败',
      error: error.toString(),
    }
  }
}
