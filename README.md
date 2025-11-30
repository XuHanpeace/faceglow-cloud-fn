# TCB 云函数 - 调用阿里云百炼通义万相2.5

这是一个基于腾讯云 TCB（云开发）的云函数项目，用于调用阿里云百炼平台的通义万相2.5模型进行图像编辑（Image-to-Image）。

## 项目结构

```
cloud-func/
├── cloudbaserc.json          # TCB 项目配置文件
├── functions/
│   ├── callBailian/          # 云函数目录：图像编辑
│   │   ├── index.js          # 主函数：调用通义万相2.5图像编辑
│   │   └── package.json      # 依赖配置
│   └── queryTask/            # 云函数目录：查询任务结果
│       ├── index.js          # 查询异步任务结果
│       └── package.json      # 依赖配置
└── README.md                 # 说明文档
```

## 配置说明

### 1. 配置 API Key

在 `cloudbaserc.json` 文件中，找到 `envVariables` 部分，填入您的阿里云百炼 API Key：

```json
{
  "envVariables": {
    "DASHSCOPE_API_KEY": "your-api-key-here"
  }
}
```

**获取 API Key 的方法：**
1. 登录 [阿里云百炼控制台](https://bailian.console.aliyun.com/)
2. 进入 API-KEY 管理页面
3. 创建或查看您的 API Key
4. 将 API Key 填入配置文件

### 2. 配置环境 ID

在 `cloudbaserc.json` 中，将 `envId` 替换为您的 TCB 环境 ID：

```json
{
  "envId": "your-env-id"
}
```

## 安装和部署

### 1. 安装 CloudBase CLI

```bash
npm install -g @cloudbase/cli
```

### 2. 登录腾讯云账号

```bash
tcb login
```

### 3. 安装云函数依赖

```bash
# 安装图像编辑函数依赖
cd functions/callBailian
npm install

# 安装查询任务函数依赖
cd ../queryTask
npm install
```

### 4. 部署云函数

在项目根目录执行：

```bash
# 部署图像编辑函数
tcb fn deploy callBailian

# 部署查询任务函数
tcb fn deploy queryTask
```

## 使用方法

### 调用云函数

#### 方式一：使用 CLI 调用

```bash
# 图像编辑基本调用
tcb fn invoke callBailian --params '{
  "prompt": "将花卉连衣裙换成一件复古风格的蕾丝长裙，领口和袖口有精致的刺绣细节。",
  "images": ["https://img.alicdn.com/imgextra/i2/O1CN01vHOj4h28jOxUJPwY8_!!6000000007968-49-tps-1344-896.webp"],
  "params": {
    "n": 1
  }
}'

# 带更多参数的调用
tcb fn invoke callBailian --params '{
  "prompt": "将背景换成海滩场景",
  "images": ["https://example.com/image.jpg"],
  "params": {
    "n": 2,
    "size": "1280*1280",
    "seed": 12345,
    "watermark": false
  }
}'
```

#### 方式二：通过 HTTP 调用

部署后，可以通过 HTTP 触发器调用云函数。

### 参数说明

#### 输入参数（event）

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| prompt | string | 是 | 文本提示词，描述要生成的图像内容 |
| images | string/array | 是 | 图像URL或URL数组，用于图像编辑 |
| params | object | 否 | 其他可选参数 |
| params.n | number | 否 | 生成图片数量，范围 1-4，默认 1 |
| params.size | string | 否 | 图像尺寸，格式为宽*高，如 "1280*1280" |
| params.seed | number | 否 | 随机种子，用于可复现的结果 |
| params.negative_prompt | string | 否 | 反向提示词，描述不希望在画面中看到的内容 |
| params.watermark | boolean | 否 | 是否添加水印，默认 false |

#### 返回结果

**成功时：**
```json
{
  "success": true,
  "taskId": "xxx-xxx-xxx",
  "message": "任务已提交，请使用 taskId 查询结果",
  "requestId": "xxx"
}
```

**失败时：**
```json
{
  "success": false,
  "error": "错误信息",
  "statusCode": 400
}
```

### 查询异步任务结果

如果返回了 `taskId`，可以使用 `queryTask` 函数查询任务状态和结果：

```bash
tcb fn invoke queryTask --params '{"taskId": "90320a33-9249-4998-8f7d-7c43d56bda5c"}'
```

**返回结果示例：**
```json
{
  "success": true,
  "taskId": "90320a33-9249-4998-8f7d-7c43d56bda5c",
  "taskStatus": "SUCCEEDED",
  "results": [
    {
      "orig_prompt": "将花卉连衣裙换成一件复古风格的蕾丝长裙...",
      "url": "https://dashscope-result-sh.oss-cn-shanghai.aliyuncs.com/..."
    }
  ],
  "submitTime": "2025-11-30 12:36:00.133",
  "endTime": "2025-11-30 12:36:37.354"
}
```

**任务状态说明：**
- `PENDING`: 任务排队中
- `RUNNING`: 任务处理中
- `SUCCEEDED`: 任务执行成功
- `FAILED`: 任务执行失败
- `CANCELED`: 任务已取消

## 注意事项

1. **API Key 安全**：请勿将包含真实 API Key 的配置文件提交到代码仓库
2. **超时设置**：云函数默认超时时间为 60 秒，可根据需要调整
3. **异步任务**：通义万相2.5 图像编辑使用异步模式，调用后会返回 taskId，需要通过 queryTask 查询任务状态和结果。任务通常需要 1-2 分钟完成。
4. **图像URL有效期**：生成的结果图像URL有效期为 24 小时，建议及时下载并保存到永久存储。
4. **费用说明**：调用阿里云百炼 API 会产生费用，请查看[阿里云百炼定价](https://bailian.console.aliyun.com/)

## 参考文档

- [腾讯云 TCB CLI 文档](https://docs.cloudbase.net/cli-v1/intro)
- [阿里云百炼 API 文档](https://bailian.console.aliyun.com/?tab=api#/api/?type=model&url=2712193)
- [阿里云百炼使用文档](https://bailian.console.aliyun.com/?tab=doc#/doc/?type=model&url=2990456)

## 常见问题

### Q: 如何获取环境 ID？
A: 登录 [腾讯云开发控制台](https://console.cloud.tencent.com/tcb)，在环境列表中可以找到环境 ID。

### Q: API 调用失败怎么办？
A: 请检查：
1. API Key 是否正确配置
2. API Key 是否有足够的权限
3. 网络连接是否正常
4. 查看云函数日志获取详细错误信息

### Q: 如何查看云函数日志？
A: 使用命令 `tcb fn log callBailian` 查看日志，或在控制台查看。

