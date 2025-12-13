const cloud = require('@cloudbase/node-sdk')
const axios = require('axios')
const crypto = require('crypto')

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
})

/**
 * 生成腾讯云API签名
 */
function sign(secretKey, signString, signMethod) {
  if (signMethod === 'HmacSHA256') {
    return crypto.createHmac('sha256', secretKey).update(signString).digest('hex')
  } else {
    return crypto.createHmac('sha1', secretKey).update(signString).digest('hex')
  }
}

/**
 * 调用腾讯云RUM API
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

    const { Action, Version, ...otherParams } = body

    if (!Action || !Version) {
      return {
        code: 400,
        message: 'Action 和 Version 参数必填',
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

    // 构建请求参数
    const params = {
      Action,
      Version,
      Region: 'ap-shanghai',
      Timestamp: Math.floor(Date.now() / 1000),
      Nonce: Math.floor(Math.random() * 1000000),
      SecretId: SECRET_ID,
      ...otherParams,
    }

    // 排序参数
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key]
        return acc
      }, {})

    // 构建签名字符串
    const signString = Object.keys(sortedParams)
      .map(key => `${key}=${encodeURIComponent(sortedParams[key])}`)
      .join('&')

    const stringToSign = `GETrum.tencentcloudapi.com/?${signString}`

    // 生成签名
    const signature = sign(SECRET_KEY, stringToSign, 'HmacSHA256')

    // 添加签名到参数
    params.Signature = signature

    // 构建请求URL
    const requestUrl = `https://rum.tencentcloudapi.com/?${Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&')}`

    console.log('调用RUM API:', requestUrl)

    // 发送请求
    const response = await axios.get(requestUrl, {
      timeout: 30000,
    })

    return {
      code: 200,
      message: '成功',
      data: response.data,
    }
  } catch (error) {
    console.error('调用RUM API失败:', error)
    return {
      code: 500,
      message: error.response?.data?.Response?.Error?.Message || error.message || '调用RUM API失败',
      error: error.toString(),
    }
  }
}

