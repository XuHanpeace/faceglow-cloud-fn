const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: 'startup-2gn33jt0ca955730' // 显式指定环境ID
});

/**
 * 生成Category ID
 */
function generateCategoryId(categoryType, categoryCode) {
  const prefixMap = {
    function_type: 'ft_',
    theme_style: 'ts_',
    activity_tag: 'at_',
  };
  const prefix = prefixMap[categoryType] || '';
  return `${prefix}${categoryCode}`;
}

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
    category_type,
    category_code,
    category_label,
    category_label_zh,
    icon,
    sort_order,
    is_active,
    extra_config
  } = body;

  if (!category_type || !category_code || !category_label) {
    return {
      code: 400,
      message: 'category_type, category_code, and category_label are required',
      data: null
    };
  }

  try {
    const db = app.database();
    
    // 生成 category_id
    const category_id = generateCategoryId(category_type, category_code);
    
    // 检查是否已存在
    const existing = await db.collection('category_config_list')
      .where({
        category_id: category_id
      })
      .get();
    
    if (existing.data && existing.data.length > 0) {
      return {
        code: 409,
        message: 'Category already exists',
        data: null
      };
    }
    
    // 创建 category 数据
    const now = Date.now();
    const categoryData = {
      category_id,
      category_type,
      category_code,
      category_label,
      category_label_zh: category_label_zh || '',
      icon: icon || '',
      sort_order: sort_order || 0,
      is_active: is_active !== undefined ? is_active : true,
      extra_config: extra_config || {},
      created_at: now,
      updated_at: now
    };
    
    await db.collection('category_config_list').add(categoryData);

    return {
      code: 200,
      message: 'Success',
      data: {
        category_id
      }
    };
  } catch (e) {
    console.error('createCategoryConfig error:', e);
    return {
      code: 500,
      message: e.message || 'Unknown error',
      data: null
    };
  }
};

