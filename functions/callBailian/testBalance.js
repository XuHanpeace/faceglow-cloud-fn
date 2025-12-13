/**
 * 扣款功能测试脚本
 * 专门测试余额查询、扣减和交易流水创建功能
 * 
 * 使用方法：
 * node testBalance.js
 */

const cloudbase = require('@cloudbase/node-sdk');

// 使用提供的凭证初始化 CloudBase
const secretId = '';
const secretKey = '';

const app = cloudbase.init({
  env: 'startup-2gn33jt0ca955730',
  secretId: secretId,
  secretKey: secretKey
});

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
 * 测试1: 查询用户余额
 */
async function testQueryBalance(userId) {
  logSection('测试1: 查询用户余额');
  
  try {
    const db = app.database();
    logInfo(`查询用户余额: user_id=${userId}`);
    
    const userDoc = await db.collection('users')
      .where({ uid: userId })
      .get();
    
    if (!userDoc.data || userDoc.data.length === 0) {
      logError(`用户不存在: user_id=${userId}`);
      return null;
    }
    
    const user = userDoc.data[0];
    const balance = user.balance || 0;
    
    logSuccess(`用户余额查询成功！`);
    logInfo(`用户ID: ${userId}`);
    logInfo(`当前余额: ${balance}`);
    logInfo(`用户文档ID: ${user._id || user._openid}`);
    logInfo(`完整用户信息: ${JSON.stringify(user, null, 2)}`);
    
    return {
      user: user,
      balance: balance,
      docId: user._id || user._openid
    };
  } catch (error) {
    logError(`查询用户余额失败: ${error.message}`);
    console.error(error);
    return null;
  }
}

/**
 * 测试2: 检查余额是否充足
 */
async function testCheckBalance(userId, requiredAmount) {
  logSection('测试2: 检查余额是否充足');
  
  try {
    const userInfo = await testQueryBalance(userId);
    if (!userInfo) {
      return false;
    }
    
    const { balance } = userInfo;
    logInfo(`需要金额: ${requiredAmount}`);
    logInfo(`当前余额: ${balance}`);
    
    if (balance < requiredAmount) {
      logError(`余额不足: 当前余额=${balance}, 需要=${requiredAmount}`);
      return false;
    } else {
      logSuccess(`余额充足: 当前余额=${balance}, 需要=${requiredAmount}`);
      return true;
    }
  } catch (error) {
    logError(`检查余额失败: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * 测试3: 扣减余额并创建交易流水
 */
async function testDeductBalance(userId, price, taskType = 'image_to_image', taskId = 'test-task-id-' + Date.now()) {
  logSection('测试3: 扣减余额并创建交易流水');
  
  try {
    const db = app.database();
    const now = Date.now();
    
    // 先查询用户当前余额
    logInfo(`获取用户当前余额: user_id=${userId}`);
    const userDoc = await db.collection('users')
      .where({ uid: userId })
      .get();
    
    if (!userDoc.data || userDoc.data.length === 0) {
      logError(`用户不存在: user_id=${userId}`);
      return false;
    }
    
    const userRecord = userDoc.data[0];
    const docId = userRecord._id || userRecord._openid;
    const balanceBefore = userRecord.balance || 0;
    const balanceAfter = balanceBefore - price;
    
    logInfo(`扣款前余额: ${balanceBefore}`);
    logInfo(`扣款金额: ${price}`);
    logInfo(`扣款后余额: ${balanceAfter}`);
    
    if (balanceAfter < 0) {
      logError(`余额不足，无法扣款: 当前余额=${balanceBefore}, 需要=${price}`);
      return false;
    }
    
    // 更新用户余额
    logInfo(`更新用户余额...`);
    await db.collection('users')
      .doc(docId)
      .update({
        balance: balanceAfter,
        updated_at: now
      });
    logSuccess(`用户余额更新成功: ${balanceBefore} -> ${balanceAfter}`);
    
    // 创建交易流水
    const taskTypeDescriptions = {
      'image_to_image': '使用AI图生图功能',
      'image_to_video': '使用AI图生视频功能',
      'video_effect': '使用AI视频特效功能'
    };
    
    const transactionData = {
      user_id: userId,
      transaction_type: 'coin_consumption',
      status: 'completed',
      coin_amount: -price,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      payment_method: 'internal',
      description: taskTypeDescriptions[taskType] || '使用AI功能',
      related_id: taskId,
      created_at: now,
      updated_at: now,
      completed_at: now,
      metadata: {
        bailian: {
          task_type: taskType,
          task_id: taskId,
          prompt: '测试扣款'
        }
      }
    };
    
    logInfo(`创建交易流水...`);
    logInfo(`交易数据: ${JSON.stringify(transactionData, null, 2)}`);
    
    const transactionResult = await db.collection('transactions').add(transactionData);
    logSuccess(`交易流水创建成功！`);
    logInfo(`交易流水ID: ${transactionResult.id}`);
    
    // 验证余额是否已更新
    logInfo(`验证余额更新...`);
    const verifyDoc = await db.collection('users')
      .where({ uid: userId })
      .get();
    
    if (verifyDoc.data && verifyDoc.data.length > 0) {
      const verifyBalance = verifyDoc.data[0].balance || 0;
      if (verifyBalance === balanceAfter) {
        logSuccess(`余额验证成功: ${verifyBalance}`);
      } else {
        logError(`余额验证失败: 期望=${balanceAfter}, 实际=${verifyBalance}`);
      }
    }
    
    return {
      success: true,
      balanceBefore: balanceBefore,
      balanceAfter: balanceAfter,
      transactionId: transactionResult.id
    };
  } catch (error) {
    logError(`扣减余额失败: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * 测试4: 查询交易流水
 */
async function testQueryTransactions(userId, limit = 5) {
  logSection('测试4: 查询交易流水');
  
  try {
    const db = app.database();
    logInfo(`查询用户交易流水: user_id=${userId}, limit=${limit}`);
    
    const transactions = await db.collection('transactions')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .get();
    
    if (!transactions.data || transactions.data.length === 0) {
      logInfo(`用户暂无交易流水`);
      return [];
    }
    
    logSuccess(`查询到 ${transactions.data.length} 条交易流水`);
    
    transactions.data.forEach((tx, index) => {
      console.log(`\n--- 交易 ${index + 1} ---`);
      logInfo(`交易ID: ${tx._id}`);
      logInfo(`交易类型: ${tx.transaction_type}`);
      logInfo(`金额: ${tx.coin_amount}`);
      logInfo(`余额变更: ${tx.balance_before} -> ${tx.balance_after}`);
      logInfo(`描述: ${tx.description}`);
      logInfo(`创建时间: ${new Date(tx.created_at).toLocaleString()}`);
      if (tx.metadata) {
        logInfo(`元数据: ${JSON.stringify(tx.metadata, null, 2)}`);
      }
    });
    
    return transactions.data;
  } catch (error) {
    logError(`查询交易流水失败: ${error.message}`);
    console.error(error);
    return [];
  }
}

/**
 * 查询用户列表（用于找到测试用户）
 */
async function listUsers(limit = 10) {
  logSection('查询用户列表');
  
  try {
    const db = app.database();
    logInfo(`查询用户列表，最多显示 ${limit} 个用户`);
    
    const users = await db.collection('users')
      .limit(limit)
      .get();
    
    if (!users.data || users.data.length === 0) {
      logError('数据库中没有用户');
      return [];
    }
    
    logSuccess(`找到 ${users.data.length} 个用户`);
    
    users.data.forEach((user, index) => {
      console.log(`\n--- 用户 ${index + 1} ---`);
      logInfo(`用户ID (uid): ${user.uid || '(无)'}`);
      logInfo(`文档ID: ${user._id || user._openid}`);
      logInfo(`余额: ${user.balance || 0}`);
      logInfo(`创建时间: ${user.created_at ? new Date(user.created_at).toLocaleString() : '(无)'}`);
    });
    
    return users.data;
  } catch (error) {
    logError(`查询用户列表失败: ${error.message}`);
    console.error(error);
    return [];
  }
}

/**
 * 测试5: 余额不足场景
 */
async function testInsufficientBalance(userId, requiredAmount) {
  logSection('测试5: 余额不足场景');
  
  try {
    const db = app.database();
    
    // 先查询用户当前余额
    logInfo(`查询用户当前余额: user_id=${userId}`);
    const userDoc = await db.collection('users')
      .where({ uid: userId })
      .get();
    
    if (!userDoc.data || userDoc.data.length === 0) {
      logError(`用户不存在: user_id=${userId}`);
      return false;
    }
    
    const userRecord = userDoc.data[0];
    const currentBalance = userRecord.balance || 0;
    
    logInfo(`当前余额: ${currentBalance}`);
    logInfo(`需要金额: ${requiredAmount}`);
    
    // 检查余额是否充足（模拟 callBailian 中的检查逻辑）
    if (currentBalance < requiredAmount) {
      logSuccess(`余额不足检查通过！`);
      logInfo(`当前余额=${currentBalance}, 需要=${requiredAmount}`);
      logInfo(`差额: ${requiredAmount - currentBalance}`);
      
      // 返回余额不足的错误响应（模拟 callBailian 的返回格式）
      const errorResponse = {
        success: false,
        data: {
          currentBalance: currentBalance,
          requiredAmount: requiredAmount
        },
        errCode: 'INSUFFICIENT_BALANCE',
        errorMsg: '余额不足'
      };
      
      logInfo(`错误响应格式: ${JSON.stringify(errorResponse, null, 2)}`);
      return true;
    } else {
      logError(`余额充足，无法测试余额不足场景`);
      logInfo(`当前余额=${currentBalance}, 需要=${requiredAmount}`);
      logInfo(`提示: 需要找一个余额小于 ${requiredAmount} 的用户来测试此场景`);
      return false;
    }
  } catch (error) {
    logError(`测试余额不足场景失败: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  logSection('扣款功能测试开始');
  
  // 先查询用户列表
  const users = await listUsers(10);
  
  if (users.length === 0) {
    logError('没有找到任何用户，无法进行测试');
    logInfo('提示: 请先在数据库中创建用户，或手动指定用户ID');
    return;
  }
  
  // 找到有足够余额的用户用于正常扣款测试
  let testUserId = null;
  let testUserBalance = 0;
  for (const user of users) {
    if (user.uid && (user.balance || 0) >= 100) {
      testUserId = user.uid;
      testUserBalance = user.balance || 0;
      logInfo(`选择用户用于正常扣款测试: ${testUserId} (余额: ${testUserBalance})`);
      break;
    }
  }
  
  // 找到余额不足的用户用于余额不足测试
  let insufficientBalanceUserId = null;
  let insufficientBalance = 0;
  for (const user of users) {
    if (user.uid && (user.balance || 0) < 1000 && (user.balance || 0) >= 0) {
      insufficientBalanceUserId = user.uid;
      insufficientBalance = user.balance || 0;
      logInfo(`选择用户用于余额不足测试: ${insufficientBalanceUserId} (余额: ${insufficientBalance})`);
      break;
    }
  }
  
  // 如果没找到有足够余额的用户，使用第一个用户
  if (!testUserId && users[0].uid) {
    testUserId = users[0].uid;
    testUserBalance = users[0].balance || 0;
    logInfo(`使用第一个用户: ${testUserId} (余额: ${testUserBalance})`);
  }
  
  // ========== 正常扣款测试 ==========
  if (testUserId) {
    const testPrice = 100; // 测试扣款金额
    const testTaskType = 'image_to_image';
    
    logSection('========== 正常扣款测试 ==========');
    logInfo(`测试用户ID: ${testUserId}`);
    logInfo(`测试扣款金额: ${testPrice}`);
    logInfo(`测试任务类型: ${testTaskType}`);
    
    // 测试1: 查询用户余额
    const userInfo = await testQueryBalance(testUserId);
    if (!userInfo) {
      logError('无法获取用户信息，跳过正常扣款测试');
    } else {
      // 测试2: 检查余额是否充足
      const hasEnoughBalance = await testCheckBalance(testUserId, testPrice);
      if (hasEnoughBalance) {
        // 测试3: 扣减余额并创建交易流水
        const deductResult = await testDeductBalance(testUserId, testPrice, testTaskType);
        if (deductResult) {
          // 等待一下，确保数据已写入
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // 测试4: 查询交易流水
          await testQueryTransactions(testUserId, 5);
          
          logSection('正常扣款测试总结');
          logSuccess('正常扣款测试完成！');
          logInfo(`扣款前余额: ${deductResult.balanceBefore}`);
          logInfo(`扣款金额: ${testPrice}`);
          logInfo(`扣款后余额: ${deductResult.balanceAfter}`);
          logInfo(`交易流水ID: ${deductResult.transactionId}`);
        }
      }
    }
  }
  
  // ========== 余额不足测试 ==========
  if (insufficientBalanceUserId) {
    logSection('========== 余额不足测试 ==========');
    const insufficientTestPrice = 1000; // 设置一个大于用户余额的金额
    
    logInfo(`测试用户ID: ${insufficientBalanceUserId}`);
    logInfo(`用户当前余额: ${insufficientBalance}`);
    logInfo(`测试扣款金额: ${insufficientTestPrice}`);
    
    // 测试余额不足场景
    const insufficientTestResult = await testInsufficientBalance(insufficientBalanceUserId, insufficientTestPrice);
    
    if (insufficientTestResult) {
      logSection('余额不足测试总结');
      logSuccess('余额不足测试完成！');
      logInfo(`测试用户ID: ${insufficientBalanceUserId}`);
      logInfo(`用户余额: ${insufficientBalance}`);
      logInfo(`需要金额: ${insufficientTestPrice}`);
      logInfo(`错误代码: INSUFFICIENT_BALANCE`);
      logInfo(`错误信息: 余额不足`);
    }
  } else {
    logSection('========== 余额不足测试 ==========');
    logInfo('未找到合适的用户进行余额不足测试');
    logInfo('提示: 需要找一个余额小于测试金额的用户');
  }
  
  // 最终总结
  logSection('========== 所有测试总结 ==========');
  logSuccess('所有测试完成！');
}

// 运行测试
runTests().catch(error => {
  logError(`测试运行失败: ${error.message}`);
  console.error(error);
  process.exit(1);
});
