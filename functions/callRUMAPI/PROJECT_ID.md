# RUM 项目 ID 配置说明

## 项目 ID

**当前 RUM 项目 ID：`rum-6LsNkbT91rNlaj`**

## 重要提示

### 1. 推荐使用 `ProjectID` 参数，也支持 `ID`

**推荐使用 `ProjectID` 参数**，云函数会自动转换为 SDK 需要的 `ID` 参数。也支持直接使用 `ID` 参数。

```javascript
// ✅ 推荐：使用 ProjectID（前端代码推荐使用这个）
{
  Action: 'DescribeRumLogList',
  Version: '2021-06-22',
  ProjectID: 'rum-6LsNkbT91rNlaj', // 使用 ProjectID 参数（推荐，会自动转换为 ID）
  // ... 其他参数
}

// ✅ 也支持：直接使用 ID
{
  Action: 'DescribeRumLogList',
  Version: '2021-06-22',
  ID: 'rum-6LsNkbT91rNlaj', // 直接使用 ID 参数（也可以）
  // ... 其他参数
}
```

**注意**：云函数内部会将 `ProjectID` 自动转换为 `ID`，因为 SDK 实际需要的是 `ID` 参数。

### 2. 项目 ID 格式

RUM 项目 ID 格式：`rum-` 开头的字符串

- ✅ 正确格式：`rum-6LsNkbT91rNlaj`
- ❌ 错误格式：`6LsNkbT91rNlaj`（缺少 `rum-` 前缀）
- ❌ 错误格式：`123456`（数字格式）

### 3. 批量调用时每个请求都需要 ID

```javascript
{
  batch: [
    {
      Action: 'DescribeRumLogList',
      Version: '2021-06-22',
      ID: 'rum-6LsNkbT91rNlaj', // 每个请求都需要 ID
      // ... 其他参数
    },
    {
      Action: 'DescribeDataPerformancePage',
      Version: '2021-06-22',
      ID: 'rum-6LsNkbT91rNlaj', // 每个请求都需要 ID
      // ... 其他参数
    },
  ],
}
```

## 常见错误

### 错误 1：ResourceNotFound - project not found

**错误信息：**
```json
{
  "code": "ResourceNotFound",
  "message": "accessPermissionFilter: not found project"
}
```

**可能原因：**
1. 项目 ID 值错误：使用了错误的项目 ID
2. 项目 ID 格式错误：项目 ID 应该是 `rum-6LsNkbT91rNlaj`
3. 没有项目访问权限
4. 参数未正确传递

**解决方法：**
1. 确认使用 `ProjectID` 参数（推荐）或 `ID` 参数（兼容）
2. 确认项目 ID 值：`rum-6LsNkbT91rNlaj`
3. 检查是否有该项目的访问权限
4. 检查参数是否正确传递到云函数

## 使用示例

### 单个调用

```javascript
const response = await fetch('/callRUMAPI', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    Action: 'DescribeRumLogList',
    Version: '2021-06-22',
    ProjectID: 'rum-6LsNkbT91rNlaj', // ✅ 使用 ProjectID 参数（推荐）
    StartTime: Math.floor(Date.now() / 1000) - 3600,
    EndTime: Math.floor(Date.now() / 1000),
    Limit: 10,
  }),
});
```

### 批量调用

```javascript
const response = await fetch('/callRUMAPI', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    batch: [
      {
        Action: 'DescribeRumLogList',
        Version: '2021-06-22',
        ProjectID: 'rum-6LsNkbT91rNlaj', // ✅ 每个请求都需要 ProjectID
        StartTime: Math.floor(Date.now() / 1000) - 3600,
        EndTime: Math.floor(Date.now() / 1000),
        Limit: 10,
      },
      {
        Action: 'DescribeDataPerformancePage',
        Version: '2021-06-22',
        ProjectID: 'rum-6LsNkbT91rNlaj', // ✅ 每个请求都需要 ProjectID
        StartTime: Math.floor(Date.now() / 1000) - 3600,
        EndTime: Math.floor(Date.now() / 1000),
      },
    ],
  }),
});
```

## 如何获取项目 ID

1. 登录 [腾讯云 RUM 控制台](https://console.cloud.tencent.com/rum)
2. 进入您的项目
3. 在项目设置中查看项目 ID
4. 项目 ID 格式：`rum-xxxxx`
