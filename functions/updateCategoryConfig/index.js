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
    category_id,
    updates
  } = body;

  if (!category_id) {
    return {
      code: 400,
      message: 'category_id is required',
      data: null
    };
  }

  if (!updates || typeof updates !== 'object') {
    return {
      code: 400,
      message: 'updates is required and must be an object',
      data: null
    };
  }

  try {
    const db = app.database();
    
    // 更新 category 数据
    const result = await db
      .collection('category_config_list')
      .where({
        category_id: category_id
      })
      .update({
        ...updates,
        updated_at: Date.now()
      });

    if (result.updated === 0) {
      return {
        code: 404,
        message: 'Category not found',
        data: null
      };
    }

    return {
      code: 200,
      message: 'Success',
      data: {
        updated: result.updated
      }
    };
  } catch (e) {
    console.error('updateCategoryConfig error:', e);
    return {
      code: 500,
      message: e.message || 'Unknown error',
      data: null
    };
  }
};

