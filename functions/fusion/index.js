'use strict';

// Depends on tencentcloud-sdk-nodejs version 4.0.3 or higher

const tencentcloud = require("tencentcloud-sdk-nodejs-facefusion");

const FacefusionClient = tencentcloud.facefusion.v20220927.Client;

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

        const params = {
            ProjectId: parsedBody.projectId,
            ModelId: parsedBody.modelId,
            RspImgType: "url",
            MergeInfos: [
                {
                    Url: parsedBody.imageUrl
                }
            ]
        };

        console.log('调用人脸融合 API，参数:', JSON.stringify(params));

        const res = await client.FuseFace(params);

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

