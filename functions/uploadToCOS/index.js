const cloud = require('@cloudbase/node-sdk')
const COS = require('cos-nodejs-sdk-v5')
const Busboy = require('busboy')

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
})

// 解析 multipart/form-data
function parseMultipartFormData(event) {
  return new Promise((resolve, reject) => {
    const contentType = event.headers?.['content-type'] || event.headers?.['Content-Type'] || ''
    const busboy = Busboy({ headers: { 'content-type': contentType } })
    const fields = {}
    const files = {}

    busboy.on('file', (name, file, info) => {
      const { filename, encoding, mimeType } = info
      const chunks = []
      
      file.on('data', (data) => {
        chunks.push(data)
      })
      
      file.on('end', () => {
        files[name] = {
          filename,
          encoding,
          mimeType,
          buffer: Buffer.concat(chunks),
        }
      })
    })

    busboy.on('field', (name, value, info) => {
      fields[name] = value
    })

    busboy.on('finish', () => {
      resolve({ fields, files })
    })

    busboy.on('error', (err) => {
      reject(err)
    })

    // 处理 body
    let bodyBuffer
    if (event.isBase64Encoded && event.body) {
      bodyBuffer = Buffer.from(event.body, 'base64')
    } else if (event.body) {
      if (typeof event.body === 'string') {
        bodyBuffer = Buffer.from(event.body, 'utf8')
      } else if (Buffer.isBuffer(event.body)) {
        bodyBuffer = event.body
      } else {
        bodyBuffer = Buffer.from(JSON.stringify(event.body))
      }
    } else {
      reject(new Error('请求体为空'))
      return
    }

    busboy.write(bodyBuffer)
    busboy.end()
  })
}

/**
 * 上传文件到腾讯云COS
 * 注意：需要在云函数环境变量中配置COS的密钥
 */
exports.main = async (event, context) => {
  // 处理 CORS 预检请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '3600',
      },
      body: '',
    }
  }

  try {
    // 支持多种调用方式：
    // 1. FormData (multipart/form-data) - 推荐，避免请求体过大
    // 2. JSON with base64 - 兼容旧方式
    // 3. 直接传递参数（从管理后台调用）
    
    let file, fileName, folder = 'albums'
    let fileBuffer

    // 检查是否是 multipart/form-data
    const contentType = event.headers?.['content-type'] || event.headers?.['Content-Type'] || ''
    const isMultipart = contentType && contentType.includes('multipart/form-data')

    if (isMultipart && event.body) {
      // 解析 multipart/form-data
      try {
        const { fields, files } = await parseMultipartFormData(event)
        
        // 获取文件
        const fileData = files.file || files[Object.keys(files)[0]]
        if (!fileData || !fileData.buffer) {
          return {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
              code: 400,
              message: '未找到上传的文件',
            }),
          }
        }
        
        fileBuffer = fileData.buffer
        fileName = fields.fileName || fileData.filename || 'upload.png'
        folder = fields.folder || 'albums'
      } catch (parseError) {
        console.error('解析 multipart/form-data 失败:', parseError)
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            code: 400,
            message: '解析上传数据失败: ' + parseError.message,
          }),
        }
      }
    } else {
      // JSON 格式或直接调用
      let body = event
      if (event.body) {
        try {
          body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
        } catch (e) {
          body = event
        }
      }
      
      file = body.file
      fileName = body.fileName
      folder = body.folder || 'albums'

      if (!file || !fileName) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            code: 400,
            message: '文件或文件名不能为空',
          }),
        }
      }

      // 处理 base64 数据
      if (typeof file === 'string') {
        if (file.startsWith('data:')) {
          const base64Data = file.split(',')[1]
          fileBuffer = Buffer.from(base64Data, 'base64')
        } else {
          fileBuffer = Buffer.from(file, 'base64')
        }
      } else if (Buffer.isBuffer(file)) {
        fileBuffer = file
      } else {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            code: 400,
            message: '不支持的文件格式，请提供base64字符串或使用FormData上传',
          }),
        }
      }
    }

    // 从环境变量获取COS配置
    const COS_SECRET_ID = process.env.COS_SECRET_ID || ''
    const COS_SECRET_KEY = process.env.COS_SECRET_KEY || ''
    const COS_BUCKET_NAME = process.env.COS_BUCKET || 'myhh2'
    const COS_APP_ID = process.env.COS_APP_ID || '1257391807'
    const COS_BUCKET = `${COS_BUCKET_NAME}-${COS_APP_ID}` // Bucket格式：name-appid
    const COS_REGION = process.env.COS_REGION || 'ap-nanjing'

    if (!COS_SECRET_ID || !COS_SECRET_KEY) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          code: 500,
          message: 'COS配置未设置，请在云函数环境变量中配置 COS_SECRET_ID 和 COS_SECRET_KEY',
        }),
      }
    }

    // 初始化COS客户端
    const cos = new COS({
      SecretId: COS_SECRET_ID,
      SecretKey: COS_SECRET_KEY,
    })

    // 生成文件路径
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const fileKey = `${folder}/${timestamp}_${randomStr}_${fileName}`

    // 上传到COS
    const uploadResult = await new Promise((resolve, reject) => {
      cos.putObject(
        {
          Bucket: COS_BUCKET,
          Region: COS_REGION,
          Key: fileKey,
          Body: fileBuffer,
          ContentType: 'image/png',
        },
        (err, data) => {
          if (err) {
            reject(err)
          } else {
            resolve(data)
          }
        }
      )
    })

    // 生成访问URL
    const url = `https://${COS_BUCKET}.cos.${COS_REGION}.myqcloud.com/${fileKey}`

    // 返回结果，添加 CORS 响应头
    const response = {
      code: 200,
      message: '上传成功',
      data: {
        url: url,
        fileKey: fileKey,
        etag: uploadResult.ETag,
      },
    }

    // 如果是 HTTP 请求，返回带 CORS 头的响应
    if (event.httpMethod || event.requestContext) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
        body: JSON.stringify(response),
      }
    }

    return response
  } catch (error) {
    console.error('上传到COS失败:', error)
    const errorResponse = {
      code: 500,
      message: error.message || '上传失败',
      error: error.toString(),
    }

    // 如果是 HTTP 请求，返回带 CORS 头的错误响应
    if (event.httpMethod || event.requestContext) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
        body: JSON.stringify(errorResponse),
      }
    }

    return errorResponse
  }
}

