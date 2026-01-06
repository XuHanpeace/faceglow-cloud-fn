const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: 'startup-2gn33jt0ca955730' // 显式指定环境ID
});

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
  // 1. 直接传递：{ workId }
  // 2. 通过 data 包装：{ data: { workId } }
  const { workId } = body.data || body;

  // 验证参数
  if (!workId) {
    const errorResponse = {
      success: false,
      error: '缺少必要参数 workId',
      code: 'MISSING_PARAMETER'
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
    
    // 查询 public_work 集合
    const result = await db.collection('public_work')
      .where({
        work_id: workId
      })
      .get();

    if (!result.data || result.data.length === 0) {
      const errorResponse = {
        success: false,
        error: '作品不存在',
        code: 'WORK_NOT_FOUND'
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

    const work = result.data[0];

    // 返回作品数据
    const successResponse = {
      success: true,
      data: {
        work_id: work.work_id,
        work_title: work.work_title || '',
        work_url: work.work_url || '',
        work_album_id: work.work_album_id || '',
        username: work.username || '',
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
  } catch (error) {
    console.error('获取作品失败:', error);
    const errorResponse = {
      success: false,
      error: error.message || '获取作品失败',
      code: 'DATABASE_ERROR'
    };

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

