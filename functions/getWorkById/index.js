const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: 'startup-2gn33jt0ca955730' // 显式指定环境ID
});

exports.main = async (event, context) => {
  // Normalize body if it comes as string (HTTP trigger)
  let body = event;
  if (event.body) {
    try {
      body = JSON.parse(event.body);
    } catch(e) {
      body = event;
    }
  }
  
  const { workId } = body;

  // 验证参数
  if (!workId) {
    return {
      success: false,
      error: '缺少必要参数 workId',
      code: 'MISSING_PARAMETER'
    };
  }

  try {
    const db = app.database();
    
    // 查询作品数据
    const result = await db.collection('user_works')
      .doc(workId)
      .get();

    if (!result.data || result.data.length === 0) {
      return {
        success: false,
        error: '作品不存在',
        code: 'WORK_NOT_FOUND'
      };
    }

    const work = result.data[0];

    // 返回作品数据（公开访问，不包含敏感信息）
    return {
      success: true,
      data: {
        _id: work._id,
        activity_id: work.activity_id,
        activity_type: work.activity_type,
        activity_title: work.activity_title,
        activity_description: work.activity_description,
        activity_image: work.activity_image,
        album_id: work.album_id,
        likes: work.likes,
        download_count: work.download_count,
        result_data: work.result_data || [],
        ext_data: work.ext_data,
        createdAt: work.createdAt,
        updatedAt: work.updatedAt
      }
    };
  } catch (error) {
    console.error('获取作品失败:', error);
    return {
      success: false,
      error: error.message || '获取作品失败',
      code: 'DATABASE_ERROR'
    };
  }
};

