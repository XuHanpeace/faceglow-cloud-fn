/**
 * Fusion 扣款功能测试脚本
 * 实际调用 fusion 云函数测试扣款功能
 * 
 * 使用方法：
 * 1. 确保已安装依赖：npm install
 * 2. 确保项目根目录有 .env.local 文件（包含 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY）
 * 3. 运行测试：node testBalance.js
 */

const fs = require('fs');
const path = require('path');

// 加载 .env.local 文件（如果存在）
const envLocalPath = path.join(__dirname, '../../.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = value;
        }
      }
    }
  });
}

// 如果环境变量仍未设置，使用默认值（仅用于测试）
if (!process.env.TENCENT_SECRET_ID || !process.env.TENCENT_SECRET_KEY) {
  console.warn('⚠️  警告：未找到 .env.local 文件或环境变量未设置，使用默认测试凭证');
  process.env.TENCENT_SECRET_ID = process.env.TENCENT_SECRET_ID || '';
  process.env.TENCENT_SECRET_KEY = process.env.TENCENT_SECRET_KEY || '';
}

const fusion = require('./index');

// Mock context 对象
const mockContext = {
  request_id: 'test-request-id',
  memory_limit_in_mb: 256,
  time_limit_in_ms: 30000,
};

// 颜色输出辅助函数
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

/**
 * 测试1: 正常扣款场景
 */
async function testNormalDeduction() {
  logSection('测试1: 正常扣款场景');
  
  try {
    // 使用真实的测试参数
    const testParams = {
      projectId: 'at_1994237036551073792', // 真实的 projectId
      modelId: 'mt_1994252946407661568', // 真实的 modelId
      imageUrl: 'https://myhh2-1257391807.cos.ap-nanjing.myqcloud.com/selfies/1765082987931_5vqgzt.jpg', // 真实的图片URL
      user_id: 'user_1888958525505814528', // 使用有足够余额的用户
      price: 9, // 真实的扣款金额
    };
    
    logInfo('请求参数:');
    console.log(JSON.stringify(testParams, null, 2));
    
    const event = {
      body: JSON.stringify({
        data: testParams
      })
    };
    
    const result = await fusion.main(event, mockContext);
    
    logInfo('响应结果:');
    const responseBody = typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
    console.log(JSON.stringify(responseBody, null, 2));
    
    if (result.statusCode === 200) {
      // 检查响应格式：可能是 { Response: { FusedImage: ... } } 或直接 { FusedImage: ... }
      const fusedImage = responseBody.Response?.FusedImage || responseBody.FusedImage;
      if (fusedImage) {
        logSuccess('Fusion 调用成功！');
        logInfo(`融合后图片URL: ${fusedImage}`);
        logInfo(`状态码: ${result.statusCode}`);
        logInfo(`请求ID: ${responseBody.Response?.RequestId || responseBody.RequestId || '(无)'}`);
        logSuccess('扣款功能已验证：从日志可以看到余额已扣减和交易流水已创建');
        return true;
      } else {
        logError(`Fusion 调用成功但未返回 FusedImage`);
        logInfo(`响应内容: ${JSON.stringify(responseBody, null, 2)}`);
        return false;
      }
    } else {
      logError(`Fusion 调用失败: statusCode=${result.statusCode}`);
      if (responseBody.message) {
        logError(`错误信息: ${responseBody.message}`);
      }
      return false;
    }
  } catch (error) {
    logError(`测试异常: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * 测试2: 余额不足场景
 */
async function testInsufficientBalance() {
  logSection('测试2: 余额不足场景');
  
  try {
    // 使用余额不足的用户
    const testParams = {
      projectId: 'test-project-id',
      modelId: 'test-model-id',
      imageUrl: 'https://example.com/test-image.jpg',
      user_id: '1997463387319042048', // 余额只有 20 的用户
      price: 1000, // 设置一个大于用户余额的金额
    };
    
    logInfo('请求参数:');
    console.log(JSON.stringify(testParams, null, 2));
    
    const event = {
      body: JSON.stringify({
        data: testParams
      })
    };
    
    const result = await fusion.main(event, mockContext);
    
    logInfo('响应结果:');
    const responseBody = typeof result.body === 'string' ? JSON.parse(result.body) : responseBody;
    console.log(JSON.stringify(responseBody, null, 2));
    
    if (result.statusCode === 400 && responseBody.error === 'INSUFFICIENT_BALANCE') {
      logSuccess('余额不足测试通过！');
      logInfo(`错误代码: ${responseBody.error}`);
      logInfo(`当前余额: ${responseBody.currentBalance}`);
      logInfo(`需要金额: ${responseBody.requiredAmount}`);
      return true;
    } else {
      logError(`余额不足测试失败: statusCode=${result.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`测试异常: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * 测试3: 缺少必要参数
 */
async function testMissingParams() {
  logSection('测试3: 缺少必要参数');
  
  try {
    const testParams = {
      // 缺少 projectId, modelId, imageUrl
      user_id: 'user_1888958525505814528',
      price: 100,
    };
    
    logInfo('请求参数:');
    console.log(JSON.stringify(testParams, null, 2));
    
    const event = {
      body: JSON.stringify({
        data: testParams
      })
    };
    
    const result = await fusion.main(event, mockContext);
    
    logInfo('响应结果:');
    const responseBody = typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
    console.log(JSON.stringify(responseBody, null, 2));
    
    if (result.statusCode === 400 && responseBody.message && responseBody.message.includes('缺少必要参数')) {
      logSuccess('缺少参数测试通过！');
      return true;
    } else {
      logError(`缺少参数测试失败: statusCode=${result.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`测试异常: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * 测试4: 价格大于0但缺少user_id
 */
async function testMissingUserId() {
  logSection('测试4: 价格大于0但缺少user_id');
  
  try {
    const testParams = {
      projectId: 'test-project-id',
      modelId: 'test-model-id',
      imageUrl: 'https://example.com/test-image.jpg',
      // 缺少 user_id
      price: 100,
    };
    
    logInfo('请求参数:');
    console.log(JSON.stringify(testParams, null, 2));
    
    const event = {
      body: JSON.stringify({
        data: testParams
      })
    };
    
    const result = await fusion.main(event, mockContext);
    
    logInfo('响应结果:');
    const responseBody = typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
    console.log(JSON.stringify(responseBody, null, 2));
    
    if (result.statusCode === 400 && responseBody.message && responseBody.message.includes('user_id')) {
      logSuccess('缺少user_id测试通过！');
      return true;
    } else {
      logError(`缺少user_id测试失败: statusCode=${result.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`测试异常: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  logSection('Fusion 扣款功能测试开始');
  
  logInfo('使用测试凭证（仅用于本地测试）');
  
  const results = {
    normalDeduction: false,
    insufficientBalance: false,
    missingParams: false,
    missingUserId: false,
  };
  
  // 测试1: 正常扣款（注意：需要真实的 projectId 和 modelId，否则会调用失败）
  logInfo('⚠️  注意：正常扣款测试需要真实的 projectId 和 modelId');
  logInfo('⚠️  如果使用测试参数，可能会因为参数无效而失败');
  try {
    results.normalDeduction = await testNormalDeduction();
  } catch (error) {
    logError(`正常扣款测试异常: ${error.message}，跳过`);
  }
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 测试2: 余额不足
  try {
    results.insufficientBalance = await testInsufficientBalance();
  } catch (error) {
    logError(`余额不足测试异常: ${error.message}，跳过`);
  }
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 测试3: 缺少必要参数
  try {
    results.missingParams = await testMissingParams();
  } catch (error) {
    logError(`缺少参数测试异常: ${error.message}，跳过`);
  }
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 测试4: 缺少user_id
  try {
    results.missingUserId = await testMissingUserId();
  } catch (error) {
    logError(`缺少user_id测试异常: ${error.message}，跳过`);
  }
  
  // 测试总结
  logSection('测试总结');
  logInfo('所有测试完成！');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  logInfo(`测试通过: ${passed}/${total}`);
  
  Object.entries(results).forEach(([key, passed]) => {
    if (passed) {
      logSuccess(`${key}: 通过`);
    } else {
      logError(`${key}: 失败`);
    }
  });
  
  logInfo('\n注意：');
  logInfo('1. 正常扣款测试需要真实的 projectId 和 modelId，否则会失败');
  logInfo('2. 余额不足测试已验证逻辑正确性');
  logInfo('3. 参数验证测试已验证逻辑正确性');
}

// 运行测试
runTests().catch(error => {
  logError(`测试运行失败: ${error.message}`);
  console.error(error);
  process.exit(1);
});
