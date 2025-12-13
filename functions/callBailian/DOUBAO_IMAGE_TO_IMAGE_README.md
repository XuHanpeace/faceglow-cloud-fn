# 豆包图生图功能说明

## 功能概述

已新增豆包图生图（`doubao_image_to_image`）任务类型支持，该功能调用火山方舟豆包 Seedream 4.5 模型的图生图API。

## 实现位置

### 1. 云函数 (`callBailian/index.js`)
- ✅ 新增 `doubao_image_to_image` 任务类型
- ✅ 新增 `buildDoubaoImageToImageRequest` 函数构建请求参数
- ✅ 支持同步返回结果URL（不需要TaskId轮询）
- ✅ 支持余额检查和扣减
- ✅ 支持交易流水记录

### 2. 前端 (`FaceGlow/src/services/cloud/asyncTaskService.ts`)
- ✅ 新增 `DOUBAO_IMAGE_TO_IMAGE` 任务类型枚举
- ✅ 更新 `BailianResponse` 接口，支持同步返回 `resultUrl`

### 3. 管理端 (`faceglow-admin/src/services/callBailianService.ts`)
- ✅ 新增 `callBailianService` 服务
- ✅ 新增 `callDoubaoImageToImage` 方法

## API 参数说明

### 请求参数
```typescript
{
  task_type: 'doubao_image_to_image',
  prompt: string,              // 提示词（必填）
  images: string[],             // 图片URL数组，至少2张（必填）
  user_id?: string,            // 用户ID（价格>0时必填）
  price?: number,              // 模板价格，0表示免费
  params?: {
    size?: string,             // 图片尺寸（已固定为'2k'，此参数将被忽略）
    watermark?: boolean,        // 是否添加水印，默认false
    sequential_image_generation?: string  // 序列图像生成，默认'disabled'
  }
}
```

### ⚠️ 重要：image 参数顺序说明

**image 数组的顺序与 prompt 中的"图1"、"图2"对应关系：**

- `images[0]` → prompt 中的 **"图1"** 或 **"第一张图"**
- `images[1]` → prompt 中的 **"图2"** 或 **"第二张图"**
- `images[2]` → prompt 中的 **"图3"** 或 **"第三张图"**
- 以此类推...

**在相册（Album）场景中的标准构建规则：**

当从相册数据（albumData）和用户选择的自拍图构建 images 数组时，应遵循以下规则：

```typescript
// 标准构建方式
const images = [
  selectedSelfieUrl,        // image[0] = 图1 = 用户选择的自拍图（人物来源图）
  albumData.result_image    // image[1] = 图2 = 结果图/场景图（目标场景图）
]
```

**对应关系：**
- `selectedSelfieUrl`（用户选择的自拍图）→ `images[0]` → prompt 中的 **"图1"**（人物来源图）
- `result_image`（结果图/场景图）→ `images[1]` → prompt 中的 **"图2"**（目标场景图）

**示例：**

```typescript
// 从相册数据和用户选择的自拍图构建
const albumData = {
  result_image: "https://example.com/scene.png",       // 目标场景图
  prompt_text: "将图2中的人物替换为图1的人物，保持图2的图像风格不变"
}
const selectedSelfieUrl = "https://example.com/user_selfie.png"; // 用户选择的自拍图

// 构建 images 数组
const images = [
  selectedSelfieUrl,        // 图1 - 用户选择的自拍图（人物来源图）
  albumData.result_image    // 图2 - 目标场景图
]

// 调用 API
await callBailian({
  task_type: 'doubao_image_to_image',
  prompt: albumData.prompt_text,
  images: images
})
// 含义：将 images[1]（result_image，场景图）中的人物替换为 images[0]（selectedSelfieUrl，用户自拍图）中的人物
```

**注意事项：**
1. **必须遵循此顺序**：`src_image` 作为 `images[0]`（图1），`result_image` 作为 `images[1]`（图2）
2. prompt 中提到的"图1"、"图2"等，是按照 `images` 数组的索引顺序（从1开始计数）
3. 图片顺序直接影响生成结果，请确保 prompt 中的描述与 images 数组顺序一致
4. 至少需要2张图片，支持多张图片组合

### 响应格式
```typescript
{
  success: true,
  data: {
    resultUrl: string,          // 生成的图片URL（同步返回）
    responseData: any,          // 原始响应数据
    message: string
  }
}
```

## API Key 配置

⚠️ **必须通过环境变量配置**：API Key 必须通过环境变量注入，不能硬编码在代码中

### 两种 API Key 独立配置

`callBailian` 云函数支持两种 API Key，**互不冲突**，根据任务类型自动选择：

| 任务类型 | 使用的 API Key | 环境变量名 | 说明 |
|---------|--------------|----------|------|
| `doubao_image_to_image` | 豆包 API Key | `DOUBAO_API_KEY` 或 `ARK_API_KEY` | 火山方舟豆包 API |
| 其他任务（`image_to_image`, `image_to_video`, `video_effect`, `portrait_style_redraw`） | 阿里百炼 API Key | `DASHSCOPE_API_KEY` | 阿里云百炼 API |

### 环境变量配置

在 `cloudbaserc.json` 中**同时配置两种 API Key**：

```json
{
  "envId": "your-env-id",
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

**豆包 API Key 优先级**：
- `DOUBAO_API_KEY`（推荐使用）
- `ARK_API_KEY`（备选）

**工作原理**：
1. 云函数根据 `task_type` 参数判断任务类型
2. 如果是 `doubao_image_to_image`，自动使用 `DOUBAO_API_KEY` 或 `ARK_API_KEY`
3. 如果是其他任务类型，自动使用 `DASHSCOPE_API_KEY`
4. 两个 API Key **完全独立**，不会互相影响

**注意**：
- 生产环境部署时，必须通过环境变量配置两种 API Key
- 代码中不会包含任何硬编码的 API Key
- 如果未配置对应的环境变量，云函数会返回 `MISSING_API_KEY` 错误

### 获取 API Key

1. 登录火山方舟控制台：https://console.volcengine.com/ark
2. 进入 API Key 管理页面
3. 创建或查看 API Key
4. 将 API Key 配置到 `cloudbaserc.json` 的 `envVariables` 中

### 部署时配置环境变量

#### 方式一：通过 cloudbaserc.json 配置（推荐）

在 `cloudbaserc.json` 中配置后，使用以下命令部署：
```bash
tcb fn deploy callBailian
```

#### 方式二：通过控制台配置

1. 登录腾讯云开发控制台
2. 进入云函数管理页面
3. 找到 `callBailian` 函数
4. 在"环境变量"配置中添加 `DOUBAO_API_KEY`

## 测试用例

### 测试参数
- **prompt**: "将图2中的人物替换为图一的人物，保持图2的图像风格不变，保持图2人物姿态不变，身体正对电视，人物斜后方面向镜头，面带微笑，保持图1的性别、发型不变"
- **测试图1**: `https://myhh2-1257391807.cos.ap-nanjing.myqcloud.com/uploads/3dshouban/bananaSrc.png`
- **测试图2**: `https://myhh2-1257391807.cos.ap-nanjing.myqcloud.com/albums/1765610143120_l01s1q_album_cover_1765610140096.png`

### 测试脚本
```bash
# 直接测试豆包API（已配置API Key）
cd /Users/hanksxu/Desktop/project/cloud-func/functions/callBailian
node test-doubao.js direct

# 通过云函数测试
node test-doubao.js cloud
```

### 测试结果
✅ **测试成功**：API Key 已验证，可以正常调用豆包图生图接口

测试生成的图片URL示例：
```
https://ark-content-generation-v2-cn-beijing.tos-cn-beijing.volces.com/doubao-seedream-4-5/...
```

## 与异步任务的区别

| 特性 | 异步任务（其他类型） | 豆包图生图 |
|------|-------------------|-----------|
| 返回方式 | 返回 taskId，需要轮询查询 | 同步返回 resultUrl |
| 查询方式 | 需要调用 queryTask | 不需要查询，直接使用URL |
| 超时时间 | 30秒 | 60-120秒（可能需要更长时间） |

## 参考文档

- 火山方舟豆包 Seedream 4.5 API 文档：https://www.volcengine.com/docs/82379/1541523?lang=zh
- API 端点：`https://ark.cn-beijing.volces.com/api/v3/images/generations`
- 模型ID：`doubao-seedream-4-5-251128`

## 注意事项

1. **API Key 配置**：必须在生产环境配置真正的API Key
2. **图片数量**：至少需要2张参考图片
3. **同步返回**：豆包图生图是同步返回结果，不需要TaskId轮询
4. **超时设置**：建议设置较长的超时时间（60-120秒）
5. **余额扣减**：如果设置了价格，会在任务成功时自动扣减用户余额
