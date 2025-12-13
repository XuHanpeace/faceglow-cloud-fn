/**
 * 豆包图生图功能测试脚本
 * 
 * 使用方法：
 * 1. 在云函数目录下运行：node test-doubao.js
 * 2. 确保已设置环境变量 DOUBAO_API_KEY（或使用默认值 doubao-seedream-4-5-251128）
 */

const axios = require('axios');

// 测试参数
// 注意：images 数组的顺序很重要！
// - images[0] = 图1（人物来源图）
// - images[1] = 图2（目标场景图）
// prompt 中的"图1"、"图2"对应 images 数组的索引（从1开始计数）
const testParams = {
  task_type: 'doubao_image_to_image',
  prompt: '将图2中的人物替换为图一的人物，保持图2的图像风格不变，保持图2人物姿态不变，身体正对电视，人物斜后方面向镜头，面带微笑，保持图1的性别、发型不变',
  images: [
    'https://myhh2-1257391807.cos.ap-nanjing.myqcloud.com/uploads/3dshouban/bananaSrc.png',  // 图1：人物来源图
    'https://myhh2-1257391807.cos.ap-nanjing.myqcloud.com/albums/1765610143120_l01s1q_album_cover_1765610140096.png'  // 图2：目标场景图
  ],
  params: {
    size: '2k', // 固定为 2k（豆包API要求小写）
    watermark: false,
    sequential_image_generation: 'disabled'
  },
  user_id: 'test_user_123',
  price: 0 // 测试时使用免费价格
};

// API Key（从环境变量获取，仅直接测试 API 时需要）
const apiKey = process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || '';

// 只有在直接测试 API 时才需要 API Key
if (require.main === module && process.argv[2] === 'direct' && !apiKey) {
  console.error('❌ 错误：未配置 API Key');
  console.error('请设置环境变量 DOUBAO_API_KEY 或 ARK_API_KEY');
  console.error('例如：DOUBAO_API_KEY=your-api-key node test-doubao.js direct');
  process.exit(1);
}

// 云函数URL（本地测试时使用）
const cloudFunctionUrl = process.env.CLOUD_FUNCTION_URL || 'http://localhost:9000/callBailian';

async function testDoubaoImageToImage() {
  console.log('🧪 开始测试豆包图生图功能...\n');
  console.log('📋 测试参数:');
  console.log(JSON.stringify(testParams, null, 2));
  console.log('\n');

  try {
    // 如果是在本地测试，直接调用云函数逻辑
    if (cloudFunctionUrl.includes('localhost')) {
      console.log('⚠️  本地测试模式：请确保云函数已启动');
      console.log('   可以使用: tcb fn run callBailian --params \'' + JSON.stringify(testParams) + '\'\n');
      return;
    }

    // 调用云函数
    console.log('📡 调用云函数:', cloudFunctionUrl);
    const response = await axios.post(cloudFunctionUrl, {
      data: testParams
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 120000 // 120秒超时
    });

    console.log('✅ 响应结果:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      if (response.data.data?.resultUrl) {
        console.log('\n🎉 测试成功！生成的图片URL:');
        console.log(response.data.data.resultUrl);
      } else {
        console.log('\n⚠️  响应成功但未找到 resultUrl');
      }
    } else {
      console.log('\n❌ 测试失败:');
      console.log('错误代码:', response.data.errCode);
      console.log('错误信息:', response.data.errorMsg);
    }
  } catch (error) {
    console.error('\n❌ 测试异常:');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('错误信息:', error.message);
    }
  }
}

// 直接测试豆包API（不通过云函数）
async function testDoubaoAPIDirectly() {
  console.log('🧪 直接测试豆包API...\n');

  const apiUrl = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
  const requestData = {
    model: 'doubao-seedream-4-5-251128',
    prompt: testParams.prompt,
    image: testParams.images,
    response_format: 'url',
    size: '2k', // 固定为 2k（豆包API要求小写）
    stream: false,
    watermark: testParams.params.watermark !== undefined ? testParams.params.watermark : false,
    sequential_image_generation: testParams.params.sequential_image_generation || 'disabled'
  };

  try {
    console.log('📡 请求URL:', apiUrl);
    console.log('📤 请求数据:', JSON.stringify(requestData, null, 2));
    console.log('🔑 API Key:', apiKey.substring(0, 10) + '...\n');

    const response = await axios.post(apiUrl, requestData, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 120000
    });

    console.log('✅ 响应结果:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data?.data && response.data.data.length > 0) {
      const resultUrl = response.data.data[0].url;
      console.log('\n🎉 测试成功！生成的图片URL:');
      console.log(resultUrl);
    } else {
      console.log('\n⚠️  响应成功但未找到图片URL');
    }
  } catch (error) {
    console.error('\n❌ 测试异常:');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('错误信息:', error.message);
    }
  }
}

// 运行测试
if (require.main === module) {
  const testMode = process.argv[2] || 'cloud';
  
  if (testMode === 'direct') {
    testDoubaoAPIDirectly();
  } else {
    testDoubaoImageToImage();
  }
}

module.exports = {
  testDoubaoImageToImage,
  testDoubaoAPIDirectly
};
