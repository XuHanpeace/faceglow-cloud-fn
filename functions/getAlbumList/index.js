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
  
  const {
    page = 1,
    page_size = 20,
    function_types,
    theme_styles,
    activity_tags,
    sort_by = 'default',
    include_unpublished = false  // 默认只返回已发布的，传 true 可获取所有数据
  } = body;

  try {
    const db = app.database();
    const _ = db.command;

    /**
     * 强制使用传统数据库查询，确保返回「所有字段」
     * 背景：models.list 可能受数据模型 schema 影响，新增字段（如 enable_custom_prompt/custom_prompt/custom_prompt_tips、preview_video_url 等）
     * 在管理端/APP 端无法返显或使用，导致视频不播放、编辑不返显。
     */
    const query = {};
    
    // 默认只返回已发布的专辑，如果 include_unpublished 为 true 则不过滤
    if (!include_unpublished) {
      query.published = true;
    }
    
    if (function_types && function_types.length > 0) {
      query.function_type = _.in(function_types);
    }
    
    if (theme_styles && theme_styles.length > 0) {
      query.theme_styles = _.elemMatch(_.in(theme_styles));
    }
    
    if (activity_tags && activity_tags.length > 0) {
      query.activity_tags = _.elemMatch(_.in(activity_tags));
    }
    
    const skip = (page - 1) * page_size;
    const limit = page_size;
    
    let orderByField = 'sort_weight';
    if (sort_by === 'likes') {
      orderByField = 'likes';
    } else if (sort_by === 'created_at') {
      orderByField = 'created_at';
    }
    
    const countResult = await db.collection('album_list').where(query).count();
    const total = countResult.total;
    
    let q = db.collection('album_list').where(query);
    
    if (orderByField === 'sort_weight') {
      q = q.orderBy('sort_weight', 'desc')
           .orderBy('likes', 'desc')
           .orderBy('created_at', 'desc');
    } else {
      q = q.orderBy(orderByField, 'desc');
    }
    
    const res = await q.skip(skip).limit(limit).get();
    
    return {
      code: 200,
      message: 'Success',
      data: {
        albums: res.data || [],
        total: total,
        has_more: skip + (res.data ? res.data.length : 0) < total
      }
    };
  } catch (e) {
    console.error('getAlbumList error:', e);
    return {
      code: 500,
      message: e.message || 'Unknown error',
      data: null
    };
  }
};


