# API 测试结果记录模板

运行测试后，请将实际输出填写到此文档中。

## 测试环境

- **API Key**: `sk-a15db01142a245c68daef490a5c9bc3c`
- **测试时间**: _______________
- **测试人员**: _______________

---

## 一、callBailian Happy Case 测试结果

### 1.1 图生图 (image_to_image)

#### 输入
```json
{
  "task_type": "image_to_image",
  "prompt": "一幅都市奇幻艺术的场景，充满动感的涂鸦艺术风格，高细节，电影级画质",
  "images": ["https://cdn.wanx.aliyuncs.com/wanx/4210775650342821193/image_to_image/31e318e2f0c34854ba2f8cfc335ddecd_0_with_two_logo.png"],
  "params": {"n": 1, "size": "720*1280"},
  "user_id": "test_user",
  "price": 0
}
```

#### 实际输出
```json
{
  "success": _______________,
  "taskId": _______________,
  "requestId": _______________,
  "message": _______________
}
```

#### 测试结果
- [ ] 通过
- [ ] 失败
- **备注**: _______________

---

### 1.2 图生视频 (image_to_video)

#### 输入
```json
{
  "task_type": "image_to_video",
  "prompt": "一幅都市奇幻艺术的场景。一个充满动感的涂鸦艺术角色。一个由喷漆所画成的少年，正从一面混凝土墙上活过来。他一边用极快的语速演唱一首英文rap，一边摆着一个经典的、充满活力的说唱歌手姿势。",
  "images": ["https://cdn.wanx.aliyuncs.com/wanx/4210775650342821193/image_to_image/31e318e2f0c34854ba2f8cfc335ddecd_0_with_two_logo.png"],
  "audio_url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/ozwpvi/rap.mp3",
  "params": {"resolution": "720P", "prompt_extend": true, "duration": 5},
  "user_id": "test_user",
  "price": 0
}
```

#### 实际输出
```json
{
  "success": _______________,
  "taskId": _______________,
  "requestId": _______________,
  "message": _______________
}
```

#### 测试结果
- [ ] 通过
- [ ] 失败
- **备注**: _______________

---

### 1.3 图片特效 (video_effect)

#### 输入
```json
{
  "task_type": "video_effect",
  "images": ["https://cdn.wanx.aliyuncs.com/wanx/4210775650342821193/image_to_image/31e318e2f0c34854ba2f8cfc335ddecd_0_with_two_logo.png"],
  "params": {"template": "frenchkiss", "resolution": "720P"},
  "user_id": "test_user",
  "price": 0
}
```

#### 实际输出
```json
{
  "success": _______________,
  "taskId": _______________,
  "requestId": _______________,
  "message": _______________
}
```

#### 测试结果
- [ ] 通过
- [ ] 失败
- **备注**: _______________

---

## 二、queryTask Happy Case 测试结果

### 2.1 查询图生图任务

#### 输入
```json
{
  "taskId": "从上面 1.1 返回的 taskId"
}
```

#### 实际输出
```json
{
  "success": _______________,
  "taskId": _______________,
  "taskStatus": _______________,
  "requestId": _______________,
  "output": {
    "task_id": _______________,
    "task_status": _______________,
    "submit_time": _______________,
    "scheduled_time": _______________,
    "end_time": _______________,
    "results": _______________
  },
  "results": _______________,
  "submitTime": _______________,
  "scheduledTime": _______________,
  "endTime": _______________
}
```

#### 测试结果
- [ ] 通过
- [ ] 失败
- **备注**: _______________

---

### 2.2 查询图生视频任务

#### 输入
```json
{
  "taskId": "从上面 1.2 返回的 taskId"
}
```

#### 实际输出
```json
{
  "success": _______________,
  "taskId": _______________,
  "taskStatus": _______________,
  "requestId": _______________,
  "output": {
    "task_id": _______________,
    "task_status": _______________,
    "submit_time": _______________,
    "scheduled_time": _______________,
    "end_time": _______________,
    "video_url": _______________,
    "orig_prompt": _______________,
    "actual_prompt": _______________
  },
  "usage": {
    "duration": _______________,
    "video_count": _______________,
    "SR": _______________
  },
  "results": _______________,
  "submitTime": _______________,
  "scheduledTime": _______________,
  "endTime": _______________
}
```

#### 测试结果
- [ ] 通过
- [ ] 失败
- **备注**: _______________

---

### 2.3 查询图片特效任务

#### 输入
```json
{
  "taskId": "从上面 1.3 返回的 taskId"
}
```

#### 实际输出
```json
{
  "success": _______________,
  "taskId": _______________,
  "taskStatus": _______________,
  "requestId": _______________,
  "output": {
    "task_id": _______________,
    "task_status": _______________,
    "submit_time": _______________,
    "scheduled_time": _______________,
    "end_time": _______________,
    "video_url": _______________
  },
  "usage": {
    "duration": _______________,
    "video_count": _______________,
    "SR": _______________
  },
  "results": _______________,
  "submitTime": _______________,
  "scheduledTime": _______________,
  "endTime": _______________
}
```

#### 测试结果
- [ ] 通过
- [ ] 失败
- **备注**: _______________

---

## 三、callBailian Bad Case 测试结果

### 3.1 缺少 prompt 参数（图生图）

#### 输入
```json
{
  "task_type": "image_to_image",
  "images": ["https://example.com/image.png"],
  "user_id": "test_user",
  "price": 0
}
```

#### 实际输出
```json
{
  "success": _______________,
  "error": _______________
}
```

#### 测试结果
- [ ] 通过（正确返回错误）
- [ ] 失败（未返回错误）
- **备注**: _______________

---

### 3.2 缺少 images 参数（图生图）

#### 输入
```json
{
  "task_type": "image_to_image",
  "prompt": "测试提示词",
  "user_id": "test_user",
  "price": 0
}
```

#### 实际输出
```json
{
  "success": _______________,
  "error": _______________
}
```

#### 测试结果
- [ ] 通过（正确返回错误）
- [ ] 失败（未返回错误）
- **备注**: _______________

---

### 3.3 无效的任务类型

#### 输入
```json
{
  "task_type": "invalid_type",
  "prompt": "测试提示词",
  "images": ["https://example.com/image.png"],
  "user_id": "test_user",
  "price": 0
}
```

#### 实际输出
```json
{
  "success": _______________,
  "error": _______________
}
```

#### 测试结果
- [ ] 通过（正确返回错误）
- [ ] 失败（未返回错误）
- **备注**: _______________

---

### 3.4 图片特效缺少 template 参数

#### 输入
```json
{
  "task_type": "video_effect",
  "images": ["https://example.com/image.png"],
  "params": {"resolution": "720P"},
  "user_id": "test_user",
  "price": 0
}
```

#### 实际输出
```json
{
  "success": _______________,
  "error": _______________
}
```

#### 测试结果
- [ ] 通过（正确返回错误）
- [ ] 失败（未返回错误）
- **备注**: _______________

---

### 3.5 图生视频缺少 prompt 参数

#### 输入
```json
{
  "task_type": "image_to_video",
  "images": ["https://example.com/image.png"],
  "user_id": "test_user",
  "price": 0
}
```

#### 实际输出
```json
{
  "success": _______________,
  "error": _______________
}
```

#### 测试结果
- [ ] 通过（正确返回错误）
- [ ] 失败（未返回错误）
- **备注**: _______________

---

## 四、queryTask Bad Case 测试结果

### 4.1 无效的 taskId

#### 输入
```json
{
  "taskId": "invalid-task-id-12345"
}
```

#### 实际输出
```json
{
  "success": _______________,
  "taskId": _______________,
  "taskStatus": _______________,
  "error": _______________
}
```

#### 测试结果
- [ ] 通过（正确处理无效 taskId）
- [ ] 失败（未正确处理）
- **备注**: _______________

---

### 4.2 缺少 taskId 参数

#### 输入
```json
{}
```

#### 实际输出
```json
{
  "success": _______________,
  "error": _______________
}
```

#### 测试结果
- [ ] 通过（正确返回错误）
- [ ] 失败（未返回错误）
- **备注**: _______________

---

## 五、测试总结

### 测试统计

- **Happy Case 总数**: 6
- **Happy Case 通过**: _____
- **Happy Case 失败**: _____

- **Bad Case 总数**: 7
- **Bad Case 通过**: _____
- **Bad Case 失败**: _____

- **总通过率**: _____%

### 问题记录

1. _______________
2. _______________
3. _______________

### 改进建议

1. _______________
2. _______________
3. _______________

---

## 六、客户端对齐确认

- [ ] 已确认 callBailian 统一返回体结构
- [ ] 已确认 queryTask output 原样透传
- [ ] 已确认错误处理逻辑
- [ ] 已确认任务状态处理
- [ ] 已确认结果获取方式

**对齐人员**: _______________
**对齐时间**: _______________
