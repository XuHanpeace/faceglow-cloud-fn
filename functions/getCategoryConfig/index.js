const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: 'startup-2gn33jt0ca955730' // 显式指定环境ID
});

exports.main = async (event, context) => {
  try {
    const db = app.database();
    
    // 尝试通过 database 访问 models
    let models;
    if (db.models) {
      models = db.models;
    } else if (app.models) {
      models = app.models;
    } else {
      // 如果 models API 不可用，使用传统数据库查询方式
      const res = await db.collection('category_config_list')
        .where({
          is_active: true
        })
        .orderBy('sort_order', 'asc')
        .get();
      
      return {
        code: 200,
        message: 'Success',
        data: res.data || []
      };
    }

    // 使用数据模型查询（使用方括号访问，因为模型名称包含下划线）
    const result = await models['category_config_list'].list({
      filter: {
        where: {
          is_active: {
            $eq: true
          }
        }
      },
      select: {
        $master: true  // 返回所有字段
      },
      orderBy: [
        { field: 'sort_order', order: 'asc' }
      ],
      getCount: false  // 不需要总数
    });

    return {
      code: 200,
      message: 'Success',
      data: result.data || []
    };
  } catch (e) {
    console.error('getCategoryConfig error:', e);
    return {
      code: 500,
      message: e.message || 'Unknown error',
      data: null
    };
  }
};


