'use strict';

// Depends on tencentcloud-sdk-nodejs version 4.0.3 or higher

const tencentcloud = require("tencentcloud-sdk-nodejs-facefusion");
const cloudbase = require('@cloudbase/node-sdk');
const axios = require('axios');

const FacefusionClient = tencentcloud.facefusion.v20220927.Client;

// 初始化 CloudBase
const app = cloudbase.init({
  env: 'startup-2gn33jt0ca955730'
});

// 实例化一个认证对象，入参需要传入腾讯云账户 SecretId 和 SecretKey，此处还需注意密钥对的保密
// 代码泄露可能会导致 SecretId 和 SecretKey 泄露，并威胁账号下所有资源的安全性
// 以下代码示例仅供参考，建议采用更安全的方式来使用密钥
// 请参见：https://cloud.tencent.com/document/product/1278/85305
// 密钥可前往官网控制台 https://console.cloud.tencent.com/cam/capi 进行获取

// 从环境变量获取密钥（请在 cloudbaserc.json 中配置）
const secretId = process.env.TENCENT_SECRET_ID || '';
const secretKey = process.env.TENCENT_SECRET_KEY || '';

// 如果环境变量中没有配置密钥，使用默认值（仅用于开发，生产环境请使用环境变量）
const clientConfig = {
    credential: {
        secretId: secretId,
        secretKey: secretKey,
    },
    region: "ap-shanghai",
    profile: {
        httpProfile: {
            endpoint: "facefusion.tencentcloudapi.com",
        },
    },
};

// 实例化要请求产品的client对象,clientProfile是可选的
const client = new FacefusionClient(clientConfig);

exports.main = async (event, context) => {
    try {
        // 处理 HTTP 请求的 body (TCB HTTP 触发器可能将 body 放在 event.body 中且为字符串)
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
        const parsedBody = body.data || body;

        console.log('📥 [Fusion] 收到请求参数:', JSON.stringify(parsedBody));

        const { projectId, modelId, imageUrl, user_id, price = 0 } = parsedBody;

        console.log('🔍 [Fusion] 解析参数:', { projectId, modelId, user_id, price });

        // 参数验证
        if (!projectId || !modelId || !imageUrl) {
            console.error('❌ [Fusion] 缺少必要参数');
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    code: -1,
                    message: '缺少必要参数：projectId, modelId, imageUrl'
                })
            };
        }

        // 如果价格大于0，需要检查用户余额
        if (price > 0) {
            console.log(`💰 [Fusion] 价格检查: price=${price}, user_id=${user_id}`);
            
            if (!user_id) {
                console.error('❌ [Fusion] 价格大于0但缺少user_id');
                return {
                    statusCode: 400,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        code: -1,
                        message: '价格大于0时，user_id 是必填参数'
                    })
                };
            }

            const db = app.database();
            
            // 查询用户余额（按uid维度查询）
            console.log(`🔍 [Fusion] 查询用户余额: user_id=${user_id}`);
            const userDoc = await db.collection('users')
                .where({ uid: user_id })
                .get();
            
            if (!userDoc.data || userDoc.data.length === 0) {
                console.error(`❌ [Fusion] 用户不存在: user_id=${user_id}`);
                return {
                    statusCode: 404,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        code: -1,
                        message: '用户不存在'
                    })
                };
            }

            const userBalance = userDoc.data[0].balance || 0;
            console.log(`💰 [Fusion] 用户余额: ${userBalance}, 需要价格: ${price}`);
            
            // 检查余额是否充足
            if (userBalance < price) {
                console.error(`❌ [Fusion] 余额不足: 当前余额=${userBalance}, 需要=${price}`);
                return {
                    statusCode: 400,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        code: -2, // 余额不足错误码
                        message: '余额不足',
                        error: 'INSUFFICIENT_BALANCE',
                        currentBalance: userBalance,
                        requiredAmount: price
                    })
                };
            }
            
            console.log(`✅ [Fusion] 余额充足，可以继续执行`);
        } else {
            console.log(`🆓 [Fusion] 免费模板，无需检查余额`);
        }

        const params = {
            ProjectId: projectId,
            ModelId: modelId,
            RspImgType: "url",
            MergeInfos: [
                {
                    Url: imageUrl
                }
            ]
        };

        console.log('🚀 [Fusion] 调用人脸融合 API，参数:', JSON.stringify(params));

        const res = await client.FuseFace(params);
        
        console.log('✅ [Fusion] 人脸融合 API 调用成功');

        // 如果调用成功且价格大于0，扣减余额并创建流水
        if (price > 0 && user_id && res.Response && res.Response.FusedImage) {
            console.log(`💰 [Fusion] 开始扣减余额和创建流水: price=${price}, user_id=${user_id}`);
            try {
                const db = app.database();
                const now = Date.now();

                // 获取用户当前余额（按uid维度查询）
                console.log(`🔍 [Fusion] 获取用户当前余额: user_id=${user_id}`);
                const userDoc = await db.collection('users')
                    .where({ uid: user_id })
                    .get();
                
                if (userDoc.data && userDoc.data.length > 0) {
                    const balanceBefore = userDoc.data[0].balance || 0;
                    const balanceAfter = balanceBefore - price;
                    
                    console.log(`💰 [Fusion] 余额变更: ${balanceBefore} -> ${balanceAfter} (扣除 ${price})`);

                    // 更新用户余额（按uid维度更新）
                    console.log(`💾 [Fusion] 更新用户余额...`);
                    // 先查询到文档ID
                    const userRecord = userDoc.data[0];
                    const docId = userRecord._id || userRecord._openid;
                    await db.collection('users')
                        .doc(docId)
                        .update({
                            balance: balanceAfter,
                            updated_at: now
                        });
                    console.log(`✅ [Fusion] 用户余额更新成功`);

                    // 创建交易流水
                    const transactionData = {
                        user_id: user_id,
                        transaction_type: 'coin_consumption',
                        status: 'completed',
                        coin_amount: -price,
                        balance_before: balanceBefore,
                        balance_after: balanceAfter,
                        payment_method: 'internal',
                        description: '使用AI换脸功能',
                        related_id: `${projectId}_${modelId}`,
                        created_at: now,
                        updated_at: now,
                        completed_at: now,
                        metadata: {
                            fusion: {
                                project_id: projectId,
                                model_id: modelId
                            }
                        }
                    };

                    console.log(`💾 [Fusion] 创建交易流水:`, JSON.stringify(transactionData));
                    await db.collection('transactions').add(transactionData);
                    console.log('✅ [Fusion] 余额扣减和流水创建成功');
                } else {
                    console.error('❌ [Fusion] 用户数据不存在，无法扣减余额');
                }
            } catch (error) {
                console.error('❌ [Fusion] 扣减余额或创建流水失败:', error);
                // 注意：这里不返回错误，因为人脸融合已经成功
                // 余额扣减失败可以通过其他方式补偿
            }
        } else {
            if (price === 0) {
                console.log('🆓 [Fusion] 免费模板，无需扣减余额');
            } else {
                console.log('⚠️ [Fusion] 价格大于0但未扣减余额（可能缺少user_id或融合失败）');
            }
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(res),
        };
    } catch (error) {
        console.error('人脸融合失败:', error);
        return {
            statusCode: 503,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                code: -1,
                message: error.message || '人脸融合失败',
                error: error.toString()
            })
        };
    }
};

