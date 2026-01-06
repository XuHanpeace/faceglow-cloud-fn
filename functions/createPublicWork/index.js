const cloudbase = require('@cloudbase/node-sdk');
const COS = require('cos-nodejs-sdk-v5');
const https = require('https');
const http = require('http');

const app = cloudbase.init({
  env: 'startup-2gn33jt0ca955730' // 显式指定环境ID
});

/**
 * 下载文件
 */
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`下载失败，状态码: ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => {
        chunks.push(chunk);
      });

      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        // 从响应头获取 Content-Type
        const contentType = response.headers['content-type'] || 'image/png';
        resolve({ buffer, contentType });
      });

      response.on('error', (error) => {
        reject(error);
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * 上传文件到COS
 */
async function uploadToCOS(fileBuffer, fileName, contentType) {
  const COS_SECRET_ID = process.env.COS_SECRET_ID || '';
  const COS_SECRET_KEY = process.env.COS_SECRET_KEY || '';
  const COS_BUCKET_NAME = process.env.COS_BUCKET || 'myhh2';
  const COS_APP_ID = process.env.COS_APP_ID || '1257391807';
  const COS_BUCKET = `${COS_BUCKET_NAME}-${COS_APP_ID}`;
  const COS_REGION = process.env.COS_REGION || 'ap-nanjing';

  if (!COS_SECRET_ID || !COS_SECRET_KEY) {
    throw new Error('COS配置未设置，请在云函数环境变量中配置 COS_SECRET_ID 和 COS_SECRET_KEY');
  }

  const cos = new COS({
    SecretId: COS_SECRET_ID,
    SecretKey: COS_SECRET_KEY,
  });

  // 生成文件路径
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const fileKey = `public_works/${timestamp}_${randomStr}_${fileName}`;

  // 上传到COS
  const uploadResult = await new Promise((resolve, reject) => {
    cos.putObject(
      {
        Bucket: COS_BUCKET,
        Region: COS_REGION,
        Key: fileKey,
        Body: fileBuffer,
        ContentType: contentType,
      },
      (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      }
    );
  });

  // 生成访问URL
  const url = `https://${COS_BUCKET}.cos.${COS_REGION}.myqcloud.com/${fileKey}`;

  return { url, fileKey };
}

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
    };
  }

  // Normalize body if it comes as string (HTTP trigger)
  let body = event;
  if (event.body) {
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch(e) {
      body = event;
    }
  }
  
  // 支持两种参数格式：
  // 1. 直接传递：{ workId, workResourceUrl }
  // 2. 通过 data 包装：{ data: { workId, workResourceUrl } }
  const { workId, workResourceUrl } = body.data || body;

  // 验证参数
  if (!workId || !workResourceUrl) {
    const errorResponse = {
      code: 400,
      message: '缺少必要参数 workId 或 workResourceUrl',
      data: null
    };
    
    if (event.httpMethod || event.requestContext) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(errorResponse),
      };
    }
    return errorResponse;
  }

  try {
    const db = app.database();

    // 1. 查询 user_works 获取作品信息
    const workResult = await db.collection('user_works')
      .doc(workId)
      .get();

    if (!workResult.data || workResult.data.length === 0) {
      const errorResponse = {
        code: 404,
        message: '作品不存在',
        data: null
      };
      
      if (event.httpMethod || event.requestContext) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify(errorResponse),
        };
      }
      return errorResponse;
    }

    const work = workResult.data[0];
    const workTitle = work.activity_title || '';
    const albumId = work.album_id || '';
    const uid = work.uid || '';

    // 2. 查询 users 获取用户名
    let username = '';
    if (uid) {
      try {
        const userResult = await db.collection('users')
          .where({ uid: uid })
          .get();
        
        if (userResult.data && userResult.data.length > 0) {
          username = userResult.data[0].username || userResult.data[0].nickname || '';
        }
      } catch (userError) {
        console.warn('查询用户信息失败:', userError);
        // 继续执行，username 为空
      }
    }

    // 3. 检查是否已存在 public_work 记录
    let existingResult;
    try {
      existingResult = await db.collection('public_work')
        .where({ work_id: workId })
        .get();
    } catch (collectionError) {
      // 如果集合不存在，创建集合（通过首次插入数据会自动创建）
      console.warn('集合可能不存在，将在后续步骤创建:', collectionError.message);
      existingResult = { data: [] };
    }

    if (existingResult.data && existingResult.data.length > 0) {
      // 已存在，直接返回 workId
      const successResponse = {
        code: 200,
        message: '作品已存在公开记录',
        data: {
          workId: workId
        }
      };

      if (event.httpMethod || event.requestContext) {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
          body: JSON.stringify(successResponse),
        };
      }
      return successResponse;
    }

    // 4. 判断 workResourceUrl 是否已经是 COS 持久化 URL
    // 如果是 COS URL（包含 myqcloud.com 或 cos.），直接使用；否则下载并上传
    let cosUrl = workResourceUrl;
    const isCOSUrl = workResourceUrl.includes('myqcloud.com') || workResourceUrl.includes('cos.');
    
    if (!isCOSUrl) {
      // 不是 COS URL，需要下载并上传
      console.log('开始下载作品资源:', workResourceUrl);
      const { buffer, contentType } = await downloadFile(workResourceUrl);
      
      // 上传到COS
      const fileName = workResourceUrl.split('/').pop() || 'work.png';
      const uploadResult = await uploadToCOS(buffer, fileName, contentType);
      cosUrl = uploadResult.url;
      console.log('作品已上传到COS:', cosUrl);
    } else {
      console.log('作品资源已是 COS 持久化 URL，直接使用:', cosUrl);
    }

    // 6. 创建 public_work 记录
    const now = Date.now();
    const publicWorkData = {
      work_id: workId,
      work_title: workTitle,
      work_url: cosUrl,
      work_album_id: albumId,
      username: username,
    };

    try {
      await db.collection('public_work').add(publicWorkData);
      console.log('已创建 public_work 记录');
    } catch (addError) {
      console.error('创建 public_work 记录失败:', addError);
      // 如果是因为集合不存在，给出更明确的错误信息
      if (addError.message && addError.message.includes('not exist')) {
        throw new Error('数据库集合 public_work 不存在，请先在控制台创建该集合');
      }
      throw addError;
    }

    const successResponse = {
      code: 200,
      message: 'Success',
      data: {
        workId: workId
      }
    };

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
        body: JSON.stringify(successResponse),
      };
    }

    return successResponse;
  } catch (error) {
    console.error('createPublicWork error:', error);
    const errorResponse = {
      code: 500,
      message: error.message || 'Unknown error',
      data: null
    };

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
      };
    }

    return errorResponse;
  }
};

