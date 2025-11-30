'use strict';

const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: 'startup-2gn33jt0ca955730' // 显式指定环境ID
});

/**
 * 交易流水云函数
 * 创建一条交易记录到数据库
 * 
 * 请求参数：
 * {
 *   user_id: string,                    // 用户ID（必填）
 *   transaction_type: string,            // 交易类型：coin_purchase | coin_consumption | subscription | refund | bonus
 *   coin_amount: number,                 // 金币变动数量（正数为收入，负数为支出）
 *   payment_method: string,              // 支付方式：apple_pay | system_bonus | admin_gift | internal
 *   description: string,                 // 交易描述（必填）
 *   balance_before?: number,            // 交易前余额（可选，如果不提供则从用户表查询）
 *   apple_transaction_id?: string,      // 苹果交易ID（可选）
 *   apple_product_id?: string,          // 苹果产品ID（可选）
 *   related_id?: string,                // 关联的业务ID（可选）
 *   metadata?: object                    // 交易元数据（可选）
 * }
 */
exports.main = async (event, context) => {
  try {
    // 处理 HTTP 请求的 body
    let body = event.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.error('解析 event.body 失败:', e);
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            code: -1,
            message: '请求体格式错误'
          })
        };
      }
    }

    // 如果 body 中包含 data 字段（前端包裹了 data），则使用 data
    const params = body.data || body;

    // 参数验证
    if (!params.user_id) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: -1,
          message: 'user_id 是必填参数'
        })
      };
    }

    if (!params.transaction_type) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: -1,
          message: 'transaction_type 是必填参数'
        })
      };
    }

    if (typeof params.coin_amount !== 'number') {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: -1,
          message: 'coin_amount 必须是数字'
        })
      };
    }

    if (!params.payment_method) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: -1,
          message: 'payment_method 是必填参数'
        })
      };
    }

    if (!params.description) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: -1,
          message: 'description 是必填参数'
        })
      };
    }

    const db = app.database();
    const now = Date.now();

    // 获取用户当前余额（如果未提供 balance_before）
    let balanceBefore = params.balance_before;
    if (balanceBefore === undefined || balanceBefore === null) {
      try {
        const userDoc = await db.collection('users')
          .where({
            _id: params.user_id
          })
          .get();
        
        if (userDoc.data && userDoc.data.length > 0) {
          balanceBefore = userDoc.data[0].balance || 0;
        } else {
          balanceBefore = 0;
        }
      } catch (error) {
        console.warn('获取用户余额失败，使用默认值 0:', error);
        balanceBefore = 0;
      }
    }

    // 计算交易后余额
    const balanceAfter = balanceBefore + params.coin_amount;

    // 构建交易记录数据
    const transactionData = {
      user_id: params.user_id,
      transaction_type: params.transaction_type,
      status: 'completed', // 默认状态为已完成
      coin_amount: params.coin_amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      payment_method: params.payment_method,
      description: params.description,
      created_at: now,
      updated_at: now,
      completed_at: now,
    };

    // 可选字段
    if (params.apple_transaction_id) {
      transactionData.apple_transaction_id = params.apple_transaction_id;
    }

    if (params.apple_product_id) {
      transactionData.apple_product_id = params.apple_product_id;
    }

    if (params.related_id) {
      transactionData.related_id = params.related_id;
    }

    if (params.metadata) {
      transactionData.metadata = params.metadata;
    }

    // 插入交易记录
    const result = await db.collection('transactions').add(transactionData);

    // 如果交易是收入（coin_amount > 0），更新用户余额
    if (params.coin_amount > 0) {
      try {
        await db.collection('users')
          .doc(params.user_id)
          .update({
            balance: balanceAfter,
            updated_at: now
          });
      } catch (error) {
        console.error('更新用户余额失败:', error);
        // 注意：这里不返回错误，因为交易记录已经创建成功
        // 余额更新失败可以通过其他方式补偿
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: 0,
        message: '交易记录创建成功',
        data: {
          transaction_id: result.id,
          ...transactionData
        }
      })
    };
  } catch (error) {
    console.error('创建交易记录失败:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: -1,
        message: error.message || '创建交易记录失败',
        error: error.toString()
      })
    };
  }
};

