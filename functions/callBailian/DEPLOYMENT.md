# 豆包图生图功能部署说明

## 环境变量配置

### 必需的环境变量

在部署 `callBailian` 云函数之前，必须配置以下环境变量：

| 环境变量名 | 说明 | 是否必需 | 使用的任务类型 | 示例值 |
|----------|------|---------|--------------|--------|
| `DASHSCOPE_API_KEY` | 阿里云百炼 API Key | 是 | `image_to_image`, `image_to_video`, `video_effect`, `portrait_style_redraw` | `sk-xxxxx...` |
| `DOUBAO_API_KEY` | 火山方舟豆包 API Key | 是 | `doubao_image_to_image` | `00c2e7af-207c-4af1-b46e-6786fe84a907` |

**重要说明**：
- 两种 API Key **必须同时配置**，互不冲突
- 云函数会根据 `task_type` 参数自动选择对应的 API Key
- 如果只使用豆包图生图功能，可以不配置 `DASHSCOPE_API_KEY`（但建议都配置）
- 如果只使用阿里百炼功能，可以不配置 `DOUBAO_API_KEY`（但建议都配置）

### 配置方式

#### 方式一：通过 cloudbaserc.json 配置（推荐）

1. 复制 `cloudbaserc.json.example` 为 `cloudbaserc.json`：
   ```bash
   cp cloudbaserc.json.example cloudbaserc.json
   ```

2. 编辑 `cloudbaserc.json`，在 `callBailian` 函数的 `envVariables` 中添加：
   ```json
   {
     "envId": "startup-2gn33jt0ca955730",
     "functionRoot": "functions",
     "functions": [
       {
         "name": "callBailian",
         "timeout": 60,
         "envVariables": {
           "DASHSCOPE_API_KEY": "您的阿里云百炼 API Key（用于阿里百炼任务）",
           "DOUBAO_API_KEY": "00c2e7af-207c-4af1-b46e-6786fe84a907（用于豆包图生图任务）",
           "TENCENT_SECRET_ID": "您的腾讯云 SecretId（本地测试时需要）",
           "TENCENT_SECRET_KEY": "您的腾讯云 SecretKey（本地测试时需要）"
         },
         "runtime": "Nodejs16.13",
         "handler": "index.main",
         "memorySize": 512
       }
     ]
   }
   ```

3. 部署云函数：
   ```bash
   cd /Users/hanksxu/Desktop/project/cloud-func
   tcb fn deploy callBailian
   ```

#### 方式二：通过腾讯云控制台配置

1. 登录腾讯云开发控制台：https://console.cloud.tencent.com/tcb
2. 进入"云函数"页面
3. 找到 `callBailian` 函数
4. 点击"函数配置" → "环境变量"
5. 添加以下环境变量：
   - `DOUBAO_API_KEY`: `00c2e7af-207c-4af1-b46e-6786fe84a907`
   - `DASHSCOPE_API_KEY`: 您的阿里云百炼 API Key

### 验证配置

部署后，可以通过以下方式验证环境变量是否配置成功：

1. **查看云函数日志**：
   ```bash
   tcb fn log callBailian --tail
   ```

2. **测试调用**：
   调用豆包图生图接口，如果环境变量未配置，会返回 `MISSING_API_KEY` 错误。

## 安全建议

1. **不要将 API Key 提交到代码仓库**
   - 确保 `cloudbaserc.json` 已添加到 `.gitignore`
   - 使用 `cloudbaserc.json.example` 作为模板

2. **定期轮换 API Key**
   - 定期更换 API Key 以提高安全性
   - 更换后及时更新环境变量

3. **使用不同的 API Key 用于不同环境**
   - 开发环境、测试环境、生产环境使用不同的 API Key
   - 通过不同的 `cloudbaserc.json` 文件管理

## 故障排查

### 错误：MISSING_API_KEY

**原因**：环境变量未配置或配置错误

**解决方法**：
1. 检查 `cloudbaserc.json` 中是否配置了 `DOUBAO_API_KEY`
2. 检查云函数控制台中的环境变量配置
3. 重新部署云函数

### 错误：AuthenticationError

**原因**：API Key 无效或格式错误

**解决方法**：
1. 确认 API Key 是否正确（不是模型ID）
2. 从火山方舟控制台重新获取 API Key
3. 更新环境变量并重新部署

## 相关文档

- [豆包图生图功能说明](./DOUBAO_IMAGE_TO_IMAGE_README.md)
- [火山方舟 API 文档](https://www.volcengine.com/docs/82379/1541523?lang=zh)
