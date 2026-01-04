const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: 'startup-2gn33jt0ca955730' // 显式指定环境ID
});

exports.main = async (event, context) => {
  try {
    const db = app.database();
    
    // 获取请求参数，includeInactive 为 true 时返回所有分类（包括下线的）
    // 
    // 参数解析逻辑：
    // 1. HTTP 调用时：event.body 是一个 JSON 字符串，需要先解析
    //    格式：event.body = '{"data":{"includeInactive":true}}'
    // 2. 控制台测试时：event 可能直接是对象，或者 event.body 已经是对象
    // 
    // 解析步骤：
    // - 如果 event.body 是字符串，先 JSON.parse 解析
    // - 然后从解析后的对象中获取 data.includeInactive
    // - 如果 event.body 不存在，尝试从 event 直接获取（控制台测试场景）
    let parsedBody;
    if (typeof event.body === 'string') {
      // HTTP 调用场景：body 是 JSON 字符串，需要解析
      try {
        parsedBody = JSON.parse(event.body);
      } catch (e) {
        console.error('解析 event.body 失败:', e);
        parsedBody = {};
      }
    } else if (event.body) {
      // body 已经是对象（某些场景）
      parsedBody = event.body;
    } else {
      // 控制台测试场景：参数可能在 event 中
      parsedBody = event;
    }
    
    // 从解析后的 body 中获取 data 对象，然后提取 includeInactive 参数
    const requestData = parsedBody.data || parsedBody;
    const { includeInactive = false } = requestData || {};
    
    // 尝试通过 database 访问 models
    let models;
    if (db.models) {
      models = db.models;
    } else if (app.models) {
      models = app.models;
    } else {
      // 如果 models API 不可用，使用传统数据库查询方式
      let query = db.collection('category_config_list');
      
      // 默认只返回生效中的，如果 includeInactive 为 true 则返回所有
      if (!includeInactive) {
        query = query.where({
          is_active: true
        });
      }
      
      const res = await query
        .orderBy('sort_order', 'asc')
        .get();
      
      return {
        code: 200,
        message: 'Success',
        data: res.data || []
      };
    }

    // 使用数据模型查询（使用方括号访问，因为模型名称包含下划线）
    const filterConfig = includeInactive 
      ? {} // 不过滤 is_active，返回所有分类
      : {
          where: {
            is_active: {
              $eq: true
            }
          }
        };
    
    const result = await models['category_config_list'].list({
      filter: filterConfig,
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


