/**
 * 云函数本地测试用例
 * 测试 callBailian 和 queryTask 的所有功能
 * 
 * 使用方法：
 * 1. 确保已安装依赖：npm install
 * 2. 设置环境变量：
 *    - DASHSCOPE_API_KEY: 阿里云百炼 API Key
 *    - TENCENT_SECRET_ID: 腾讯云 SecretId（用于访问云数据库，本地测试时需要）
 *    - TENCENT_SECRET_KEY: 腾讯云 SecretKey（用于访问云数据库，本地测试时需要）
 * 3. 运行测试：node test.js
 * 
 * 注意：在云函数部署环境中，TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY 会自动从云函数运行环境获取，无需手动配置
 */

const callBailian = require('./index');
// queryTask 在独立的目录中
const path = require('path');
const queryTaskPath = path.join(__dirname, '../queryTask/index.js');
const queryTask = require(queryTaskPath);

// Mock context 对象
const mockContext = {
  request_id: 'test-request-id',
  memory_limit_in_mb: 256,
  time_limit_in_ms: 30000,
};

// 测试数据
const testData = {
  // 图生图测试数据
  imageToImage: {
    task_type: 'image_to_image',
    prompt: '一幅都市奇幻艺术的场景，充满动感的涂鸦艺术风格，高细节，电影级画质',
    images: ['https://cdn.wanx.aliyuncs.com/wanx/4210775650342821193/image_to_image/31e318e2f0c34854ba2f8cfc335ddecd_0_with_two_logo.png'],
    params: {
      n: 1,
      size: '720*1280',
    },
    user_id: 'test_user',
    price: 0,
  },
  
  // 图生视频测试数据
  imageToVideo: {
    task_type: 'image_to_video',
    prompt: '一幅都市奇幻艺术的场景。一个充满动感的涂鸦艺术角色。一个由喷漆所画成的少年，正从一面混凝土墙上活过来。他一边用极快的语速演唱一首英文rap，一边摆着一个经典的、充满活力的说唱歌手姿势。',
    images: ['https://cdn.wanx.aliyuncs.com/wanx/4210775650342821193/image_to_image/31e318e2f0c34854ba2f8cfc335ddecd_0_with_two_logo.png'],
    audio_url: 'https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/ozwpvi/rap.mp3',
    params: {
      resolution: '720P',
      prompt_extend: true,
      duration: 5,
    },
    user_id: 'test_user',
    price: 0,
  },
  
  // 图片特效测试数据
  videoEffect: {
    task_type: 'video_effect',
    images: ['https://cdn.wanx.aliyuncs.com/wanx/4210775650342821193/image_to_image/31e318e2f0c34854ba2f8cfc335ddecd_0_with_two_logo.png'],
    params: {
      template: 'frenchkiss',
      resolution: '720P',
    },
    user_id: 'test_user',
    price: 0,
  },
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

function logTest(name) {
  log(`\n🧪 测试: ${name}`, 'cyan');
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

// 测试 callBailian - 图生图
async function testImageToImage() {
  logTest('callBailian - 图生图');
  
  try {
    logInfo('请求参数:');
    console.log(JSON.stringify(testData.imageToImage, null, 2));
    
    const event = {
      data: testData.imageToImage,
    };
    
    const result = await callBailian.main(event, mockContext);
    
    logInfo('响应结果:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success && result.data?.taskId) {
      logSuccess('图生图测试通过！');
      return result.data.taskId;
    } else {
      logError(`图生图测试失败: ${result.errorMsg || '未知错误'}`);
      return null;
    }
  } catch (error) {
    logError(`图生图测试异常: ${error.message}`);
    console.error(error);
    return null;
  }
}

// 测试 callBailian - 图生视频
async function testImageToVideo() {
  logTest('callBailian - 图生视频');
  
  try {
    logInfo('请求参数:');
    console.log(JSON.stringify(testData.imageToVideo, null, 2));
    
    const event = {
      data: testData.imageToVideo,
    };
    
    const result = await callBailian.main(event, mockContext);
    
    logInfo('响应结果:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success && result.data?.taskId) {
      logSuccess('图生视频测试通过！');
      return result.data.taskId;
    } else {
      logError(`图生视频测试失败: ${result.errorMsg || '未知错误'}`);
      return null;
    }
  } catch (error) {
    logError(`图生视频测试异常: ${error.message}`);
    console.error(error);
    return null;
  }
}

// 测试 callBailian - 图片特效
async function testVideoEffect() {
  logTest('callBailian - 图片特效');
  
  try {
    logInfo('请求参数:');
    console.log(JSON.stringify(testData.videoEffect, null, 2));
    
    const event = {
      data: testData.videoEffect,
    };
    
    const result = await callBailian.main(event, mockContext);
    
    logInfo('响应结果:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success && result.data?.taskId) {
      logSuccess('图片特效测试通过！');
      return result.data.taskId;
    } else {
      logError(`图片特效测试失败: ${result.errorMsg || '未知错误'}`);
      return null;
    }
  } catch (error) {
    logError(`图片特效测试异常: ${error.message}`);
    console.error(error);
    return null;
  }
}

// 测试 queryTask（轮询直到任务完成）
async function testQueryTask(taskId, taskType = '') {
  logTest(`queryTask - 查询任务状态 (${taskType || '未知类型'})`);
  
  if (!taskId) {
    logError('缺少 taskId，跳过 queryTask 测试');
    return;
  }
  
  try {
    const event = {
      data: { taskId },
    };
    
    logInfo(`查询任务ID: ${taskId}`);
    logInfo('开始轮询任务状态，直到任务完成...');
    
    let attempt = 0;
    const maxAttempts = 20; // 最多轮询20次（约100秒），避免卡住
    const pollInterval = 5000; // 每5秒轮询一次
    
    while (attempt < maxAttempts) {
      attempt++;
      logInfo(`\n[轮询 ${attempt}/${maxAttempts}] 查询任务状态...`);
      
      let result;
      try {
        result = await Promise.race([
          queryTask.main(event, mockContext),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('查询超时')), 10000)
          )
        ]);
      } catch (timeoutError) {
        logError(`queryTask 查询超时: ${timeoutError.message}`);
        logInfo('跳过此任务，继续下一个测试');
        return;
      }
      
      logInfo('响应结果:');
      console.log(JSON.stringify(result, null, 2));
      
      if (!result.success) {
        logError(`queryTask 查询失败: ${result.errorMsg || '未知错误'}`);
        logInfo('跳过此任务，继续下一个测试');
        return;
      }
      
      const status = result.data?.taskStatus || 'UNKNOWN';
      logInfo(`当前任务状态: ${status}`);
      
      // 如果任务完成（成功或失败），终止轮询
      if (status === 'SUCCEEDED' || status === 'FAILED' || status === 'CANCELED') {
        if (status === 'SUCCEEDED') {
          logSuccess(`✅ 任务完成！任务状态: ${status}`);
          
          // 打印 output 和 usage
          if (result.data?.output) {
            logInfo('output 结构:');
            console.log(JSON.stringify(result.data.output, null, 2));
          }
          
          if (result.data?.usage) {
            logInfo('usage 结构:');
            console.log(JSON.stringify(result.data.usage, null, 2));
          }
          
          // 打印结果URL
          if (result.data?.output) {
            if (result.data.output.video_url) {
              logSuccess(`视频URL: ${result.data.output.video_url}`);
            }
            if (result.data.output.results && result.data.output.results.length > 0) {
              logSuccess(`图片URL: ${result.data.output.results[0].url}`);
            }
          }
        } else {
          logError(`❌ 任务失败或取消！任务状态: ${status}`);
        }
        
        logInfo(`总共轮询 ${attempt} 次，任务已${status === 'SUCCEEDED' ? '成功' : '失败'}完成`);
        return;
      }
      
      // 任务还在进行中，等待后继续轮询
      if (status === 'PENDING' || status === 'RUNNING') {
        logInfo(`任务进行中，${pollInterval / 1000}秒后继续查询...`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } else {
        logError(`未知任务状态: ${status}，终止轮询`);
        return;
      }
    }
    
    // 达到最大轮询次数
    logError(`❌ 达到最大轮询次数 (${maxAttempts})，任务可能仍在进行中`);
    logInfo('请稍后手动查询任务状态');
    
  } catch (error) {
    logError(`queryTask 测试异常: ${error.message}`);
    console.error(error);
  }
}

// ========== Bad Case 测试 ==========

// 测试 callBailian - 缺少必填参数（prompt）
async function testMissingPrompt() {
  logTest('callBailian - 缺少 prompt 参数（图生图）');
  
  try {
    const event = {
      data: {
        task_type: 'image_to_image',
        images: ['https://example.com/image.png'],
        user_id: 'test_user',
        price: 0,
      },
    };
    
    logInfo('请求参数:');
    console.log(JSON.stringify(event.data, null, 2));
    
    const result = await callBailian.main(event, mockContext);
    
    logInfo('响应结果:');
    console.log(JSON.stringify(result, null, 2));
    
    if (!result.success && result.errorMsg) {
      logSuccess('Bad case 测试通过！正确返回错误信息');
      return true;
    } else {
      logError('Bad case 测试失败：应该返回错误但返回了成功');
      return false;
    }
  } catch (error) {
    logError(`Bad case 测试异常: ${error.message}`);
    return false;
  }
}

// 测试 callBailian - 缺少必填参数（images）
async function testMissingImages() {
  logTest('callBailian - 缺少 images 参数（图生图）');
  
  try {
    const event = {
      data: {
        task_type: 'image_to_image',
        prompt: '测试提示词',
        user_id: 'test_user',
        price: 0,
      },
    };
    
    logInfo('请求参数:');
    console.log(JSON.stringify(event.data, null, 2));
    
    const result = await callBailian.main(event, mockContext);
    
    logInfo('响应结果:');
    console.log(JSON.stringify(result, null, 2));
    
    if (!result.success && result.errorMsg) {
      logSuccess('Bad case 测试通过！正确返回错误信息');
      return true;
    } else {
      logError('Bad case 测试失败：应该返回错误但返回了成功');
      return false;
    }
  } catch (error) {
    logError(`Bad case 测试异常: ${error.message}`);
    return false;
  }
}

// 测试 callBailian - 无效的任务类型
async function testInvalidTaskType() {
  logTest('callBailian - 无效的任务类型');
  
  try {
    const event = {
      data: {
        task_type: 'invalid_type',
        prompt: '测试提示词',
        images: ['https://example.com/image.png'],
        user_id: 'test_user',
        price: 0,
      },
    };
    
    logInfo('请求参数:');
    console.log(JSON.stringify(event.data, null, 2));
    
    const result = await callBailian.main(event, mockContext);
    
    logInfo('响应结果:');
    console.log(JSON.stringify(result, null, 2));
    
    if (!result.success && result.errorMsg) {
      logSuccess('Bad case 测试通过！正确返回错误信息');
      return true;
    } else {
      logError('Bad case 测试失败：应该返回错误但返回了成功');
      return false;
    }
  } catch (error) {
    logError(`Bad case 测试异常: ${error.message}`);
    return false;
  }
}

// 测试 callBailian - 图片特效缺少 template
async function testVideoEffectMissingTemplate() {
  logTest('callBailian - 图片特效缺少 template 参数');
  
  try {
    const event = {
      data: {
        task_type: 'video_effect',
        images: ['https://example.com/image.png'],
        params: {
          resolution: '720P',
        },
        user_id: 'test_user',
        price: 0,
      },
    };
    
    logInfo('请求参数:');
    console.log(JSON.stringify(event.data, null, 2));
    
    const result = await callBailian.main(event, mockContext);
    
    logInfo('响应结果:');
    console.log(JSON.stringify(result, null, 2));
    
    if (!result.success && result.errorMsg) {
      logSuccess('Bad case 测试通过！正确返回错误信息');
      return true;
    } else {
      logError('Bad case 测试失败：应该返回错误但返回了成功');
      return false;
    }
  } catch (error) {
    logError(`Bad case 测试异常: ${error.message}`);
    return false;
  }
}

// 测试 callBailian - 图生视频缺少 prompt
async function testImageToVideoMissingPrompt() {
  logTest('callBailian - 图生视频缺少 prompt 参数');
  
  try {
    const event = {
      data: {
        task_type: 'image_to_video',
        images: ['https://example.com/image.png'],
        user_id: 'test_user',
        price: 0,
      },
    };
    
    logInfo('请求参数:');
    console.log(JSON.stringify(event.data, null, 2));
    
    const result = await callBailian.main(event, mockContext);
    
    logInfo('响应结果:');
    console.log(JSON.stringify(result, null, 2));
    
    if (!result.success && result.errorMsg) {
      logSuccess('Bad case 测试通过！正确返回错误信息');
      return true;
    } else {
      logError('Bad case 测试失败：应该返回错误但返回了成功');
      return false;
    }
  } catch (error) {
    logError(`Bad case 测试异常: ${error.message}`);
    return false;
  }
}

// 测试 callBailian - 余额不足
async function testInsufficientBalance() {
  logTest('callBailian - 余额不足');
  
  try {
    const event = {
      data: {
        task_type: 'image_to_image',
        prompt: '测试提示词',
        images: ['https://cdn.wanx.aliyuncs.com/wanx/4210775650342821193/image_to_image/31e318e2f0c34854ba2f8cfc335ddecd_0_with_two_logo.png'],
        user_id: 'test_user_insufficient',
        price: 1000, // 设置一个很高的价格，确保余额不足
      },
    };
    
    logInfo('请求参数:');
    console.log(JSON.stringify(event.data, null, 2));
    
    const result = await callBailian.main(event, mockContext);
    
    logInfo('响应结果:');
    console.log(JSON.stringify(result, null, 2));
    
    if (!result.success && result.errCode === 'INSUFFICIENT_BALANCE') {
      logSuccess('Bad case 测试通过！正确返回余额不足错误');
      if (result.data) {
        logInfo(`当前余额: ${result.data.currentBalance}, 需要: ${result.data.requiredAmount}`);
      }
      return true;
    } else {
      logError('Bad case 测试失败：应该返回余额不足错误');
      return false;
    }
  } catch (error) {
    logError(`Bad case 测试异常: ${error.message}`);
    return false;
  }
}

// 测试 queryTask - 无效的 taskId
async function testQueryTaskInvalidTaskId() {
  logTest('queryTask - 无效的 taskId');
  
  try {
    const event = {
      data: {
        taskId: 'invalid-task-id-12345',
      },
    };
    
    logInfo('请求参数:');
    console.log(JSON.stringify(event.data, null, 2));
    
    const result = await queryTask.main(event, mockContext);
    
    logInfo('响应结果:');
    console.log(JSON.stringify(result, null, 2));
    
    // queryTask 对于无效的 taskId，可能会返回成功但状态为 UNKNOWN 或 FAILED
    // 或者返回错误，两种情况都是合理的
    const taskStatus = result.data?.taskStatus || 'UNKNOWN';
    if (!result.success || (result.success && (taskStatus === 'UNKNOWN' || taskStatus === 'FAILED'))) {
      logSuccess('Bad case 测试通过！正确处理了无效的 taskId');
      return true;
    } else {
      logError('Bad case 测试失败：应该返回错误或失败状态');
      return false;
    }
  } catch (error) {
    logError(`Bad case 测试异常: ${error.message}`);
    return false;
  }
}

// 测试 queryTask - 缺少 taskId
async function testQueryTaskMissingTaskId() {
  logTest('queryTask - 缺少 taskId 参数');
  
  try {
    const event = {
      data: {},
    };
    
    logInfo('请求参数:');
    console.log(JSON.stringify(event.data, null, 2));
    
    const result = await queryTask.main(event, mockContext);
    
    logInfo('响应结果:');
    console.log(JSON.stringify(result, null, 2));
    
    if (!result.success && result.errorMsg) {
      logSuccess('Bad case 测试通过！正确返回错误信息');
      return true;
    } else {
      logError('Bad case 测试失败：应该返回错误但返回了成功');
      return false;
    }
  } catch (error) {
    logError(`Bad case 测试异常: ${error.message}`);
    return false;
  }
}

// 主测试函数
async function runTests() {
  logSection('云函数本地测试开始');
  
  // 检查环境变量，如果没有设置则使用默认值
  if (!process.env.DASHSCOPE_API_KEY) {
    // 使用默认的 API Key（仅用于测试）
    process.env.DASHSCOPE_API_KEY = 'sk-a15db01142a245c68daef490a5c9bc3c';
    logInfo('使用默认 API Key（测试环境）');
  }
  
  logInfo(`API Key 已设置: ${process.env.DASHSCOPE_API_KEY.substring(0, 10)}...`);
  
  const taskIds = {
    imageToImage: null,
    imageToVideo: null,
    videoEffect: null,
  };
  
  const badCaseResults = {
    missingPrompt: false,
    missingImages: false,
    invalidTaskType: false,
    videoEffectMissingTemplate: false,
    imageToVideoMissingPrompt: false,
    insufficientBalance: false,
    queryTaskInvalidTaskId: false,
    queryTaskMissingTaskId: false,
  };
  
  // ========== Happy Case 测试 ==========
  
  // 测试 callBailian - 图生图
  logSection('1. Happy Case - 测试 callBailian - 图生图');
  try {
    taskIds.imageToImage = await testImageToImage();
  } catch (error) {
    logError(`图生图测试异常: ${error.message}，跳过`);
  }
  
  // 等待一下，避免请求过快
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 测试 callBailian - 图生视频
  logSection('2. Happy Case - 测试 callBailian - 图生视频');
  try {
    taskIds.imageToVideo = await testImageToVideo();
  } catch (error) {
    logError(`图生视频测试异常: ${error.message}，跳过`);
  }
  
  // 等待一下
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 测试 callBailian - 图片特效
  logSection('3. Happy Case - 测试 callBailian - 图片特效');
  try {
    taskIds.videoEffect = await testVideoEffect();
  } catch (error) {
    logError(`图片特效测试异常: ${error.message}，跳过`);
  }
  
  // 等待一下，让任务有时间提交
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 测试 queryTask - 图生图（轮询直到完成）
  if (taskIds.imageToImage) {
    logSection('4. Happy Case - 测试 queryTask - 图生图任务（轮询直到完成）');
    try {
      await testQueryTask(taskIds.imageToImage, '图生图');
    } catch (error) {
      logError(`图生图 queryTask 测试异常: ${error.message}，跳过`);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 测试 queryTask - 图生视频（轮询直到完成）
  if (taskIds.imageToVideo) {
    logSection('5. Happy Case - 测试 queryTask - 图生视频任务（轮询直到完成）');
    try {
      await testQueryTask(taskIds.imageToVideo, '图生视频');
    } catch (error) {
      logError(`图生视频 queryTask 测试异常: ${error.message}，跳过`);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 测试 queryTask - 图片特效（轮询直到完成）
  if (taskIds.videoEffect) {
    logSection('6. Happy Case - 测试 queryTask - 图片特效任务（轮询直到完成）');
    try {
      await testQueryTask(taskIds.videoEffect, '图片特效');
    } catch (error) {
      logError(`图片特效 queryTask 测试异常: ${error.message}，跳过`);
    }
  }
  
  // ========== Bad Case 测试 ==========
  
  logSection('7. Bad Case - 测试 callBailian - 缺少 prompt 参数');
  try {
    badCaseResults.missingPrompt = await testMissingPrompt();
  } catch (error) {
    logError(`测试异常: ${error.message}，跳过`);
  }
  await new Promise(resolve => setTimeout(resolve, 500));
  
  logSection('8. Bad Case - 测试 callBailian - 缺少 images 参数');
  try {
    badCaseResults.missingImages = await testMissingImages();
  } catch (error) {
    logError(`测试异常: ${error.message}，跳过`);
  }
  await new Promise(resolve => setTimeout(resolve, 500));
  
  logSection('9. Bad Case - 测试 callBailian - 无效的任务类型');
  try {
    badCaseResults.invalidTaskType = await testInvalidTaskType();
  } catch (error) {
    logError(`测试异常: ${error.message}，跳过`);
  }
  await new Promise(resolve => setTimeout(resolve, 500));
  
  logSection('10. Bad Case - 测试 callBailian - 图片特效缺少 template');
  try {
    badCaseResults.videoEffectMissingTemplate = await testVideoEffectMissingTemplate();
  } catch (error) {
    logError(`测试异常: ${error.message}，跳过`);
  }
  await new Promise(resolve => setTimeout(resolve, 500));
  
  logSection('11. Bad Case - 测试 callBailian - 图生视频缺少 prompt');
  try {
    badCaseResults.imageToVideoMissingPrompt = await testImageToVideoMissingPrompt();
  } catch (error) {
    logError(`测试异常: ${error.message}，跳过`);
  }
  await new Promise(resolve => setTimeout(resolve, 500));
  
  logSection('12. Bad Case - 测试 callBailian - 余额不足');
  try {
    badCaseResults.insufficientBalance = await testInsufficientBalance();
  } catch (error) {
    logError(`测试异常: ${error.message}，跳过`);
  }
  await new Promise(resolve => setTimeout(resolve, 500));
  
  logSection('13. Bad Case - 测试 queryTask - 无效的 taskId');
  try {
    badCaseResults.queryTaskInvalidTaskId = await testQueryTaskInvalidTaskId();
  } catch (error) {
    logError(`测试异常: ${error.message}，跳过`);
  }
  await new Promise(resolve => setTimeout(resolve, 500));
  
  logSection('14. Bad Case - 测试 queryTask - 缺少 taskId');
  try {
    badCaseResults.queryTaskMissingTaskId = await testQueryTaskMissingTaskId();
  } catch (error) {
    logError(`测试异常: ${error.message}，跳过`);
  }
  
  // 测试总结
  logSection('测试总结');
  logInfo('所有测试完成！');
  logInfo('注意：任务可能需要一些时间才能完成，可以稍后再次运行 queryTask 测试查看结果');
  
  logSection('Happy Case 结果');
  if (taskIds.imageToImage) {
    logSuccess(`图生图任务ID: ${taskIds.imageToImage}`);
  }
  if (taskIds.imageToVideo) {
    logSuccess(`图生视频任务ID: ${taskIds.imageToVideo}`);
  }
  if (taskIds.videoEffect) {
    logSuccess(`图片特效任务ID: ${taskIds.videoEffect}`);
  }
  
  logSection('Bad Case 结果');
  const badCasePassed = Object.values(badCaseResults).filter(r => r).length;
  const badCaseTotal = Object.keys(badCaseResults).length;
  logInfo(`Bad Case 通过: ${badCasePassed}/${badCaseTotal}`);
  
  Object.entries(badCaseResults).forEach(([key, passed]) => {
    if (passed) {
      logSuccess(`${key}: 通过`);
    } else {
      logError(`${key}: 失败`);
    }
  });
}

// 运行测试
runTests().catch(error => {
  logError(`测试运行失败: ${error.message}`);
  console.error(error);
  process.exit(1);
});
