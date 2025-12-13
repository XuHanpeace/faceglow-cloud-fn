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
    
    // 尝试通过 database 访问 models
    let models;
    if (db.models) {
      models = db.models;
    } else if (app.models) {
      models = app.models;
    }
    
    // 如果 models API 不可用，使用传统数据库查询方式
    if (!models) {
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
          has_more: skip + res.data.length < total
        }
      };
    }

    // 构建查询条件
    const where = {};
    
    // 默认只返回已发布的专辑，如果 include_unpublished 为 true 则不过滤
    if (!include_unpublished) {
      where.published = true;
    }
    
    if (function_types && function_types.length > 0) {
      where.function_type = {
        $in: function_types
      };
    }

    if (theme_styles && theme_styles.length > 0) {
      // theme_styles 是数组字段，检查是否包含任意一个请求的风格
      where.theme_styles = {
        $in: theme_styles
      };
    }

    if (activity_tags && activity_tags.length > 0) {
      // activity_tags 是数组字段，检查是否包含任意一个请求的标签
      where.activity_tags = {
        $in: activity_tags
      };
    }

    // 构建排序条件
    let orderBy = [];
    
    if (sort_by === 'likes') {
      orderBy = [{ field: 'likes', order: 'desc' }];
    } else if (sort_by === 'created_at') {
      orderBy = [{ field: 'created_at', order: 'desc' }];
    } else {
      // Default: sort_weight desc, then likes desc, then created_at desc
      orderBy = [
        { field: 'sort_weight', order: 'desc' },
        { field: 'likes', order: 'desc' },
        { field: 'created_at', order: 'desc' }
      ];
    }

    // 使用数据模型查询（使用方括号访问，因为模型名称包含下划线）
    const result = await models['album_list'].list({
      filter: {
        where: where
      },
      select: {
        $master: true  // 返回所有字段
      },
      orderBy: orderBy,
      pageSize: page_size,
      pageNumber: page,
      getCount: true  // 返回总数
    });

    return {
      code: 200,
      message: 'Success',
      data: {
        albums: result.data || [],
        total: result.total || 0,
        has_more: (result.data && result.data.length === page_size) || false
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


