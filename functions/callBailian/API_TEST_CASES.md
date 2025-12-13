# API 测试用例文档

本文档记录了 callBailian 和 queryTask 云函数的所有测试用例，包括输入参数和预期输出结果。

## 环境配置

- **API Key**: `sk-a15db01142a245c68daef490a5c9bc3c`
- **测试环境**: 本地测试
- **测试时间**: 2025-01-XX

---

## 一、callBailian 测试用例

### 1.1 Happy Case - 图生图 (image_to_image)

#### 输入参数

```json
{
  "task_type": "image_to_image",
  "prompt": "一幅都市奇幻艺术的场景，充满动感的涂鸦艺术风格，高细节，电影级画质",
  "images": [
    "https://cdn.wanx.aliyuncs.com/wanx/4210775650342821193/image_to_image/31e318e2f0c34854ba2f8cfc335ddecd_0_with_two_logo.png"
  ],
  "params": {
    "n": 1,
    "size": "720*1280"
  },
  "user_id": "test_user",
  "price": 0
}
```

#### 预期输出

```json
{
  "success": true,
  "taskId": "xxx-xxx-xxx",
  "requestId": "xxx-xxx-xxx",
  "message": "任务已提交，请使用 taskId 查询结果"
}
```

#### 实际输出

（运行测试后填写）

---

### 1.2 Happy Case - 图生视频 (image_to_video)

#### 输入参数

```json
{
  "task_type": "image_to_video",
  "prompt": "一幅都市奇幻艺术的场景。一个充满动感的涂鸦艺术角色。一个由喷漆所画成的少年，正从一面混凝土墙上活过来。他一边用极快的语速演唱一首英文rap，一边摆着一个经典的、充满活力的说唱歌手姿势。",
  "images": [
    "https://cdn.wanx.aliyuncs.com/wanx/4210775650342821193/image_to_image/31e318e2f0c34854ba2f8cfc335ddecd_0_with_two_logo.png"
  ],
  "audio_url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/ozwpvi/rap.mp3",
  "params": {
    "resolution": "720P",
    "prompt_extend": true,
    "duration": 5
  },
  "user_id": "test_user",
  "price": 0
}
```

#### 预期输出

```json
{
  "success": true,
  "taskId": "xxx-xxx-xxx",
  "requestId": "xxx-xxx-xxx",
  "message": "任务已提交，请使用 taskId 查询结果"
}
```

#### 实际输出

（运行测试后填写）

---

### 1.3 Happy Case - 图片特效 (video_effect)

#### 输入参数

```json
{
  "task_type": "video_effect",
  "images": [
    "https://cdn.wanx.aliyuncs.com/wanx/4210775650342821193/image_to_image/31e318e2f0c34854ba2f8cfc335ddecd_0_with_two_logo.png"
  ],
  "params": {
    "template": "frenchkiss",
    "resolution": "720P"
  },
  "user_id": "test_user",
  "price": 0
}
```

#### 预期输出

```json
{
  "success": true,
  "taskId": "xxx-xxx-xxx",
  "requestId": "xxx-xxx-xxx",
  "message": "任务已提交，请使用 taskId 查询结果"
}
```

#### 实际输出

（运行测试后填写）

---

### 1.4 Bad Case - 缺少 prompt 参数（图生图）

#### 输入参数

```json
{
  "task_type": "image_to_image",
  "images": [
    "https://example.com/image.png"
  ],
  "user_id": "test_user",
  "price": 0
}
```

#### 预期输出

```json
{
  "success": false,
  "error": "请提供 prompt 参数（文本提示词）"
}
```

#### 实际输出

（运行测试后填写）

---

### 1.5 Bad Case - 缺少 images 参数（图生图）

#### 输入参数

```json
{
  "task_type": "image_to_image",
  "prompt": "测试提示词",
  "user_id": "test_user",
  "price": 0
}
```

#### 预期输出

```json
{
  "success": false,
  "error": "图生图任务需要提供 images 参数（图像URL或URL数组）"
}
```

#### 实际输出

（运行测试后填写）

---

### 1.6 Bad Case - 无效的任务类型

#### 输入参数

```json
{
  "task_type": "invalid_type",
  "prompt": "测试提示词",
  "images": [
    "https://example.com/image.png"
  ],
  "user_id": "test_user",
  "price": 0
}
```

#### 预期输出

```json
{
  "success": false,
  "error": "不支持的任务类型: invalid_type。支持的类型: image_to_image, image_to_video, video_effect"
}
```

#### 实际输出

（运行测试后填写）

---

### 1.7 Bad Case - 图片特效缺少 template 参数

#### 输入参数

```json
{
  "task_type": "video_effect",
  "images": [
    "https://example.com/image.png"
  ],
  "params": {
    "resolution": "720P"
  },
  "user_id": "test_user",
  "price": 0
}
```

#### 预期输出

```json
{
  "success": false,
  "error": "图片特效任务需要提供 params.template 参数（特效模板，如 \"flying\", \"frenchkiss\"）"
}
```

#### 实际输出

（运行测试后填写）

---

### 1.8 Bad Case - 图生视频缺少 prompt 参数

#### 输入参数

```json
{
  "task_type": "image_to_video",
  "images": [
    "https://example.com/image.png"
  ],
  "user_id": "test_user",
  "price": 0
}
```

#### 预期输出

```json
{
  "success": false,
  "error": "请提供 prompt 参数（文本提示词）"
}
```

#### 实际输出

（运行测试后填写）

---

## 二、queryTask 测试用例

### 2.1 Happy Case - 查询图生图任务

#### 输入参数

```json
{
  "taskId": "从 callBailian 返回的 taskId"
}
```

#### 预期输出

```json
{
  "success": true,
  "taskId": "xxx-xxx-xxx",
  "taskStatus": "SUCCEEDED",
  "requestId": "xxx-xxx-xxx",
  "output": {
    "task_id": "xxx-xxx-xxx",
    "task_status": "SUCCEEDED",
    "submit_time": "2025-01-XX XX:XX:XX.XXX",
    "scheduled_time": "2025-01-XX XX:XX:XX.XXX",
    "end_time": "2025-01-XX XX:XX:XX.XXX",
    "results": [
      {
        "url": "https://xxx.com/image.png",
        "orig_prompt": "原始提示词"
      }
    ]
  },
  "results": [
    {
      "orig_prompt": "原始提示词",
      "url": "https://xxx.com/image.png"
    }
  ],
  "submitTime": "2025-01-XX XX:XX:XX.XXX",
  "scheduledTime": "2025-01-XX XX:XX:XX.XXX",
  "endTime": "2025-01-XX XX:XX:XX.XXX"
}
```

#### 实际输出

（运行测试后填写）

---

### 2.2 Happy Case - 查询图生视频任务

#### 输入参数

```json
{
  "taskId": "从 callBailian 返回的 taskId"
}
```

#### 预期输出

```json
{
  "success": true,
  "taskId": "xxx-xxx-xxx",
  "taskStatus": "SUCCEEDED",
  "requestId": "xxx-xxx-xxx",
  "output": {
    "task_id": "xxx-xxx-xxx",
    "task_status": "SUCCEEDED",
    "submit_time": "2025-01-XX XX:XX:XX.XXX",
    "scheduled_time": "2025-01-XX XX:XX:XX.XXX",
    "end_time": "2025-01-XX XX:XX:XX.XXX",
    "video_url": "https://xxx.com/video.mp4?Expires=xxx",
    "orig_prompt": "原始提示词",
    "actual_prompt": "实际使用的提示词"
  },
  "usage": {
    "duration": 5,
    "video_count": 1,
    "SR": 720
  },
  "results": [
    {
      "orig_prompt": "原始提示词",
      "url": "https://xxx.com/video.mp4?Expires=xxx"
    }
  ],
  "submitTime": "2025-01-XX XX:XX:XX.XXX",
  "scheduledTime": "2025-01-XX XX:XX:XX.XXX",
  "endTime": "2025-01-XX XX:XX:XX.XXX"
}
```

#### 实际输出

（运行测试后填写）

---

### 2.3 Happy Case - 查询图片特效任务

#### 输入参数

```json
{
  "taskId": "从 callBailian 返回的 taskId"
}
```

#### 预期输出

```json
{
  "success": true,
  "taskId": "xxx-xxx-xxx",
  "taskStatus": "SUCCEEDED",
  "requestId": "xxx-xxx-xxx",
  "output": {
    "task_id": "xxx-xxx-xxx",
    "task_status": "SUCCEEDED",
    "submit_time": "2025-01-XX XX:XX:XX.XXX",
    "scheduled_time": "2025-01-XX XX:XX:XX.XXX",
    "end_time": "2025-01-XX XX:XX:XX.XXX",
    "video_url": "https://xxx.com/video.mp4?Expires=xxx"
  },
  "usage": {
    "duration": 5,
    "video_count": 1,
    "SR": 720
  },
  "results": [
    {
      "orig_prompt": null,
      "url": "https://xxx.com/video.mp4?Expires=xxx"
    }
  ],
  "submitTime": "2025-01-XX XX:XX:XX.XXX",
  "scheduledTime": "2025-01-XX XX:XX:XX.XXX",
  "endTime": "2025-01-XX XX:XX:XX.XXX"
}
```

#### 实际输出

（运行测试后填写）

---

### 2.4 Bad Case - 无效的 taskId

#### 输入参数

```json
{
  "taskId": "invalid-task-id-12345"
}
```

#### 预期输出

```json
{
  "success": false,
  "error": "查询任务失败",
  "statusCode": 404,
  "taskId": "invalid-task-id-12345"
}
```

或者

```json
{
  "success": true,
  "taskId": "invalid-task-id-12345",
  "taskStatus": "UNKNOWN"
}
```

#### 实际输出

（运行测试后填写）

---

### 2.5 Bad Case - 缺少 taskId 参数

#### 输入参数

```json
{}
```

#### 预期输出

```json
{
  "success": false,
  "error": "请提供 taskId 参数"
}
```

#### 实际输出

（运行测试后填写）

---

## 三、统一返回体结构说明

### callBailian 成功返回

```json
{
  "success": true,
  "taskId": "string",
  "requestId": "string",
  "message": "string"
}
```

### callBailian 失败返回

```json
{
  "success": false,
  "error": "string",
  "errorCode": "string",
  "currentBalance": number,  // 余额不足时返回
  "requiredAmount": number    // 余额不足时返回
}
```

### queryTask 成功返回

```json
{
  "success": true,
  "taskId": "string",
  "taskStatus": "PENDING | RUNNING | SUCCEEDED | FAILED | CANCELED | UNKNOWN",
  "requestId": "string",
  "output": {
    // 原样透传的 output 结构
  },
  "usage": {
    // 原样透传的 usage 结构（图生视频、图片特效）
  },
  "results": [
    {
      "orig_prompt": "string",
      "url": "string"
    }
  ],
  "submitTime": "string",
  "scheduledTime": "string",
  "endTime": "string",
  "data": {
    // 完整响应数据
  }
}
```

### queryTask 失败返回

```json
{
  "success": false,
  "error": "string",
  "statusCode": number,
  "details": {},
  "taskId": "string"
}
```

---

## 四、错误代码说明

| 错误代码 | 说明 |
|---------|------|
| `MISSING_USER_ID` | 价格>0但缺少user_id |
| `USER_NOT_FOUND` | 用户不存在 |
| `INSUFFICIENT_BALANCE` | 余额不足 |
| `HTTP_XXX` | HTTP状态码错误 |
| `API_ERROR` | API调用失败 |

---

## 五、测试执行说明

1. 运行测试前，确保已设置环境变量 `DASHSCOPE_API_KEY`
2. 执行测试：`DASHSCOPE_API_KEY=sk-a15db01142a245c68daef490a5c9bc3c node test.js`
3. 测试会依次执行所有 Happy Case 和 Bad Case
4. 将实际输出填写到对应的"实际输出"字段中
5. 对比预期输出和实际输出，验证接口行为是否符合预期

---

## 六、客户端对齐要点

1. **统一返回体结构**：所有任务类型（image_to_image、image_to_video、video_effect）的 callBailian 返回结构完全一致
2. **output 原样透传**：queryTask 的 output 和 usage 结构原样透传，客户端需要从 output 中读取具体字段
3. **错误处理**：客户端需要根据 `success` 字段判断是否成功，失败时从 `error` 字段获取错误信息
4. **任务状态**：queryTask 返回的 `taskStatus` 字段表示任务状态，客户端需要根据状态进行相应处理
5. **结果获取**：
   - 图生图：从 `output.results[0].url` 获取图片URL
   - 图生视频：从 `output.video_url` 获取视频URL
   - 图片特效：从 `output.video_url` 获取视频URL

---

## 七、注意事项

1. 视频URL仅保留24小时，超时后会被自动清除，请及时保存
2. 任务可能需要一些时间才能完成，建议使用轮询机制查询任务状态
3. 所有时间字段格式为：`YYYY-MM-DD HH:mm:ss.SSS`
4. 测试数据中的图片和音频URL需要是有效的可访问URL
