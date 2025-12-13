# 云函数本地测试说明

## 测试文件

- `test.js` - 云函数本地测试用例

## 测试内容

1. **callBailian - 图生图** (image_to_image)
2. **callBailian - 图生视频** (image_to_video)
3. **callBailian - 图片特效** (video_effect)
4. **queryTask - 查询任务状态** (针对上述三个任务类型)

## 使用方法

### 1. 安装依赖

```bash
cd /Users/hanksxu/Desktop/project/cloud-func/functions/callBailian
npm install
```

### 2. 运行测试

测试文件已内置默认 API Key，直接运行即可：

```bash
node test.js
```

或者使用自定义 API Key：

```bash
DASHSCOPE_API_KEY=your_api_key_here node test.js
```

## 测试输出

测试会输出：
- ✅ 每个测试的请求参数
- ✅ 每个测试的响应结果
- ✅ 任务ID（如果成功）
- ✅ queryTask 的查询结果，包括 output 和 usage 结构

## 注意事项

1. 确保已设置正确的 `DASHSCOPE_API_KEY` 环境变量
2. 测试会调用真实的阿里云 API，会产生实际费用
3. 任务可能需要一些时间才能完成，可以稍后再次运行 queryTask 测试查看结果
4. 测试数据中的图片和音频 URL 需要是有效的可访问 URL

## 测试数据

测试使用的数据在 `test.js` 文件中的 `testData` 对象中定义：
- 图生图：使用测试图片和提示词
- 图生视频：使用测试图片、音频和提示词
- 图片特效：使用测试图片和特效模板（frenchkiss）
