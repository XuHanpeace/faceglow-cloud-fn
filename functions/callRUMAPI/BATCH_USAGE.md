# callRUMAPI 批量调用使用说明

## 问题说明

数据大盘需要调用多个 RUM API 来获取不同的数据，如果每个 API 都单独调用，会导致：
1. **请求次数过多**：一个页面可能触发 10+ 次 API 调用
2. **性能问题**：多次网络请求增加延迟
3. **资源浪费**：增加服务器负载

## 解决方案：批量调用

使用 `batch` 参数，将多个 API 请求合并为一次调用。

## 使用方法

### 单个调用（兼容旧接口）

```javascript
// 前端代码
const response = await fetch('https://your-env-id.ap-shanghai.app.tcloudbase.com/callRUMAPI', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    Action: 'DescribeRumLogList',
    Version: '2021-06-22',
    ProjectID: 'rum-6LsNkbT91rNlaj', // 必填：RUM 项目ID（也支持使用 ID 参数）
    StartTime: Math.floor(Date.now() / 1000) - 3600,
    EndTime: Math.floor(Date.now() / 1000),
    // ... 其他参数
  }),
});

const result = await response.json();
```

### 批量调用（推荐）

```javascript
// 前端代码 - 将多个请求合并为一次调用
const response = await fetch('https://your-env-id.ap-shanghai.app.tcloudbase.com/callRUMAPI', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    batch: [
      {
        Action: 'DescribeRumLogList',
        Version: '2021-06-22',
        ProjectID: 'rum-6LsNkbT91rNlaj', // 必填：RUM 项目ID（也支持使用 ID 参数）
        StartTime: Math.floor(Date.now() / 1000) - 3600,
        EndTime: Math.floor(Date.now() / 1000),
      },
      {
        Action: 'DescribeDataPerformancePage',
        Version: '2021-06-22',
        ProjectID: 'rum-6LsNkbT91rNlaj', // 必填：RUM 项目ID（也支持使用 ID 参数）
        StartTime: Math.floor(Date.now() / 1000) - 3600,
        EndTime: Math.floor(Date.now() / 1000),
      },
      {
        Action: 'DescribeDataLogUrlStatistics',
        Version: '2021-06-22',
        ProjectID: 'rum-6LsNkbT91rNlaj', // 必填：RUM 项目ID（也支持使用 ID 参数）
        StartTime: Math.floor(Date.now() / 1000) - 3600,
        EndTime: Math.floor(Date.now() / 1000),
      },
      // 可以添加更多请求...
    ],
  }),
});

const result = await response.json();

// 处理结果
if (result.code === 200) {
  // 全部成功
  result.results.forEach((item, index) => {
    console.log(`请求 ${index + 1} (${item.action}) 成功:`, item.data);
  });
} else if (result.code === 207) {
  // 部分成功
  console.log('部分成功:', result.message);
  result.results.forEach((item) => {
    console.log(`成功: ${item.action}`, item.data);
  });
  result.errors.forEach((error) => {
    console.error(`失败: ${error.action}`, error.error);
  });
} else {
  // 全部失败
  console.error('批量调用失败:', result.message);
}
```

## 响应格式

### 批量调用成功响应

```json
{
  "code": 200,
  "message": "全部成功",
  "results": [
    {
      "index": 0,
      "action": "DescribeRumLogList",
      "success": true,
      "data": {
        "Response": {
          // API 返回的数据
        }
      }
    },
    {
      "index": 1,
      "action": "DescribeDataPerformancePage",
      "success": true,
      "data": {
        "Response": {
          // API 返回的数据
        }
      }
    }
  ]
}
```

### 部分成功响应（207）

```json
{
  "code": 207,
  "message": "2 成功, 1 失败",
  "results": [
    {
      "index": 0,
      "action": "DescribeRumLogList",
      "success": true,
      "data": { ... }
    }
  ],
  "errors": [
    {
      "index": 1,
      "action": "DescribeDataPerformancePage",
      "success": false,
      "error": "项目未找到，请检查 ProjectID 参数是否正确",
      "code": "ResourceNotFound",
      "params": { ... }
    }
  ]
}
```

## 常见错误处理

### 1. Project Not Found 错误

**错误信息：**
```json
{
  "code": "ResourceNotFound",
  "message": "项目未找到，请检查 ProjectID 参数是否正确，或确认您有该项目的访问权限"
}
```

**解决方法：**
- 检查 `ProjectID` 参数是否正确（推荐使用 `ProjectID`，也支持 `ID` 参数）
- RUM 项目 ID：`rum-6LsNkbT91rNlaj`
- 确认您有该项目的访问权限
- 检查项目是否已创建并激活

### 2. 缺少必填参数

**错误信息：**
```json
{
  "code": "MissingParameter",
  "message": "The request is missing the required parameter `EndTime`."
}
```

**解决方法：**
- 检查每个请求是否包含所有必填参数
- 参考 [腾讯云 RUM API 文档](https://cloud.tencent.com/document/product/1464) 确认必填参数

## 优化建议

### 1. 数据大盘页面优化

将页面加载时的多个 API 调用改为批量调用：

```javascript
// 优化前：多次单独调用
const logList = await callRUMAPI({ Action: 'DescribeRumLogList', ... });
const performance = await callRUMAPI({ Action: 'DescribeDataPerformancePage', ... });
const statistics = await callRUMAPI({ Action: 'DescribeDataLogUrlStatistics', ... });

// 优化后：一次批量调用
const batchResult = await callRUMAPI({
  batch: [
    { Action: 'DescribeRumLogList', ... },
    { Action: 'DescribeDataPerformancePage', ... },
    { Action: 'DescribeDataLogUrlStatistics', ... },
  ],
});
```

### 2. 错误处理

```javascript
async function callRUMAPIBatch(requests) {
  try {
    const response = await fetch('/callRUMAPI', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch: requests }),
    });
    
    const result = await response.json();
    
    if (result.code === 200) {
      return { success: true, data: result.results };
    } else if (result.code === 207) {
      // 部分成功，返回成功和失败的结果
      return {
        success: true,
        data: result.results,
        errors: result.errors,
      };
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('批量调用失败:', error);
    throw error;
  }
}
```

## 性能对比

- **优化前**：10 个 API 调用 = 10 次网络请求 ≈ 2-5 秒
- **优化后**：10 个 API 调用 = 1 次网络请求 ≈ 0.5-1 秒

**性能提升：约 50-80%**

## 注意事项

1. **ProjectID 必填**：每个请求都必须包含正确的 `ProjectID` 参数（也支持使用 `ID` 参数作为别名）
2. **参数验证**：批量调用时，每个请求的参数都需要单独验证
3. **错误隔离**：批量调用中某个请求失败不会影响其他请求
4. **超时设置**：批量调用可能需要更长的超时时间（建议 30-60 秒）
