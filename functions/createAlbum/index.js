const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: 'startup-2gn33jt0ca955730' // 显式指定环境ID
});

/**
 * 生成 UUID
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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
  
  const albumData = body;

  // 验证必填字段
  if (!albumData.album_name) {
    const errorResponse = {
      code: 400,
      message: 'album_name is required',
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
    const albumId = generateUUID();
    const now = Date.now();

    // 构建完整的 Album 数据
    const newAlbum = {
      album_id: albumId,
      album_name: albumData.album_name,
      album_description: albumData.album_description || '',
      album_image: albumData.album_image || '',
      theme_styles: albumData.theme_styles || [],
      function_type: albumData.function_type || '',
      activity_tags: albumData.activity_tags || [],
      task_execution_type: albumData.task_execution_type || 'async',
      level: albumData.level || '0',
      price: albumData.price || 0,
      original_price: albumData.original_price,
      activity_tag_type: albumData.activity_tag_type,
      activity_tag_text: albumData.activity_tag_text,
      template_list: albumData.template_list || [],
      src_image: albumData.src_image,
      result_image: albumData.result_image,
      prompt_text: albumData.prompt_text,
      style_description: albumData.style_description,
      likes: albumData.likes || 0,
      sort_weight: albumData.sort_weight || 0,
      preview_video_url: albumData.preview_video_url,
      allow_custom_prompt: albumData.allow_custom_prompt,
      custom_prompt_placeholder: albumData.custom_prompt_placeholder,
      audio_url: albumData.audio_url,
      video_effect_template: albumData.video_effect_template,
      style_index: albumData.style_index,
      style_ref_url: albumData.style_ref_url,
      published: albumData.published !== undefined ? albumData.published : false,
      created_at: now,
      updated_at: now,
    };
    
    // 插入数据库
    const result = await db.collection('album_list').add(newAlbum);

    const successResponse = {
      code: 200,
      message: 'Success',
      data: {
        album_id: albumId,
        _id: result.id,
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
  } catch (e) {
    console.error('createAlbum error:', e);
    const errorResponse = {
      code: 500,
      message: e.message || 'Unknown error',
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

