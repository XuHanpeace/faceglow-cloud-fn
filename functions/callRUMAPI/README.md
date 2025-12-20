# callRUMAPI 云函数配置说明

## 功能说明

`callRUMAPI` 是一个用于调用腾讯云 RUM（前端性能监控）API 的云函数。该函数封装了腾讯云 RUM API 的调用逻辑，包括签名生成和请求发送。

## 环境变量配置

### 必需的环境变量

在部署 `callRUMAPI` 云函数之前，**必须**配置以下环境变量：

| 环境变量名 | 说明 | 是否必需 | 示例值 |
|----------|------|---------|--------|
| `TENCENT_SECRET_ID` | 腾讯云 SecretId（用于API签名） | **是** | `AKIDxxxxx...` |
| `TENCENT_SECRET_KEY` | 腾讯云 SecretKey（用于API签名） | **是** | `xxxxx...` |

### 如何获取腾讯云凭证

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 进入 [访问管理 > API密钥管理](https://console.cloud.tencent.com/cam/capi)
3. 创建或查看您的 API 密钥
4. 复制 `SecretId` 和 `SecretKey`

**安全提示**：
- 请妥善保管您的 SecretKey，不要泄露给他人
- 建议使用子账号的 API 密钥，并仅授予必要的权限
- 不要将密钥提交到代码仓库中

## 配置方式

### 方式一：通过腾讯云控制台配置（推荐，与 fusion 函数配置方式一致）

这是最常用的配置方式，与 `fusion` 函数使用相同的环境变量配置方法：

1. 登录 [腾讯云 CloudBase 控制台](https://console.cloud.tencent.com/tcb)
2. 进入您的云开发环境
3. 进入「云函数」> 找到 `callRUMAPI` 函数
4. 点击「函数配置」>「环境变量」
5. 添加以下环境变量：
   - `TENCENT_SECRET_ID`: 您的腾讯云 SecretId（**可以使用与 `fusion` 函数相同的值**）
   - `TENCENT_SECRET_KEY`: 您的腾讯云 SecretKey（**可以使用与 `fusion` 函数相同的值**）
6. 保存配置

**重要提示**：
- `callRUMAPI` 和 `fusion` 函数可以使用**相同的**腾讯云凭证（`TENCENT_SECRET_ID` 和 `TENCENT_SECRET_KEY`）
- 每个云函数的环境变量是独立的，需要在每个函数中单独配置
- 如果 `fusion` 函数已经配置好了凭证，您可以直接使用相同的值来配置 `callRUMAPI`

### 方式二：通过 cloudbaserc.json 配置

1. 复制 `cloudbaserc.json.example` 为 `cloudbaserc.json`：
   ```bash
   cp cloudbaserc.json.example cloudbaserc.json
   ```

2. 编辑 `cloudbaserc.json`，在 `callRUMAPI` 函数的 `envVariables` 中填入您的凭证：
   ```json
   {
     "envId": "your-env-id",
     "functionRoot": "functions",
     "functions": [
       {
         "name": "callRUMAPI",
         "timeout": 30,
         "envVariables": {
           "TENCENT_SECRET_ID": "您的腾讯云 SecretId",
           "TENCENT_SECRET_KEY": "您的腾讯云 SecretKey"
         },
         "runtime": "Nodejs16.13",
         "handler": "index.main",
         "memorySize": 256
       }
     ]
   }
   ```

3. 部署云函数：
   ```bash
   tcb fn deploy callRUMAPI
   ```

### 方式三：通过命令行配置

```bash
# 设置环境变量
tcb fn config set TENCENT_SECRET_ID=您的SecretId -e callRUMAPI
tcb fn config set TENCENT_SECRET_KEY=您的SecretKey -e callRUMAPI
```

## 使用方法

### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `Action` | String | 是 | RUM API 的操作名称，如 `DescribeRumLogList` |
| `Version` | String | 是 | API 版本，如 `2021-06-22` |
| `ProjectID` | String | 是 | RUM 项目 ID（如：`rum-6LsNkbT91rNlaj`），也支持使用 `ID` 参数 |
| 其他参数 | - | - | 根据具体的 RUM API 操作而定 |

**重要提示**：
- **推荐使用 `ProjectID` 参数**：前端代码可以使用 `ProjectID: 'rum-6LsNkbT91rNlaj'`，云函数会自动转换为 SDK 需要的 `ID` 参数
- 也支持直接使用 `ID` 参数：`ID: 'rum-6LsNkbT91rNlaj'`
- **当前项目 ID：`rum-6LsNkbT91rNlaj`**

### 请求示例

```javascript
// 调用示例
const response = await axios.post('https://your-env-id.ap-shanghai.app.tcloudbase.com/callRUMAPI', {
  Action: 'DescribeRumLogList',
  Version: '2021-06-22',
  // 其他 RUM API 参数...
});
```

### 响应格式

**成功响应**：
```json
{
  "code": 200,
  "message": "成功",
  "data": {
    // RUM API 返回的数据
  }
}
```

**错误响应**：
```json
{
  "code": 500,
  "message": "错误信息",
  "error": "详细错误信息"
}
```

## 常见问题

### 1. 错误：腾讯云凭证未配置

**错误信息**：
```json
{
  "code": 500,
  "message": "腾讯云凭证未配置, 请在云函数环境变量中配置 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY"
}
```

**解决方法**：
1. **通过控制台配置**（推荐）：
   - 登录 [腾讯云 CloudBase 控制台](https://console.cloud.tencent.com/tcb)
   - 进入「云函数」> `callRUMAPI` >「函数配置」>「环境变量」
   - 添加 `TENCENT_SECRET_ID` 和 `TENCENT_SECRET_KEY`
   - **提示**：如果 `fusion` 函数已经配置了这些环境变量，您可以直接复制相同的值
   - 保存后无需重新部署，立即生效

2. **检查配置**：
   - 确认环境变量名称拼写正确（区分大小写）
   - 确认环境变量值已正确填写
   - 如果通过 `cloudbaserc.json` 配置，需要重新部署云函数

### 2. 如何验证配置是否生效？

部署后，调用函数时如果不再出现凭证未配置的错误，说明配置已生效。

### 3. 本地测试时如何配置？

在本地测试时，可以通过以下方式设置环境变量：

**Linux/macOS**：
```bash
export TENCENT_SECRET_ID=您的SecretId
export TENCENT_SECRET_KEY=您的SecretKey
```

**Windows**：
```cmd
set TENCENT_SECRET_ID=您的SecretId
set TENCENT_SECRET_KEY=您的SecretKey
```

或者在代码中直接设置（仅用于测试，不要提交到代码仓库）：
```javascript
process.env.TENCENT_SECRET_ID = '您的SecretId';
process.env.TENCENT_SECRET_KEY = '您的SecretKey';
```

**注意**：本地测试时可以使用与 `fusion` 函数相同的凭证值。

### 4. 如何查看 fusion 函数已配置的凭证？

如果您想查看 `fusion` 函数已配置的凭证值（用于配置 `callRUMAPI`）：

1. 登录 [腾讯云 CloudBase 控制台](https://console.cloud.tencent.com/tcb)
2. 进入「云函数」> `fusion` >「函数配置」>「环境变量」
3. 查看 `TENCENT_SECRET_ID` 和 `TENCENT_SECRET_KEY` 的值
4. 复制这些值到 `callRUMAPI` 函数的环境变量配置中

## 相关文档

- [腾讯云 RUM API 文档](https://cloud.tencent.com/document/product/1464)
- [腾讯云 CloudBase 云函数文档](https://cloud.tencent.com/document/product/876)
- [腾讯云 API 密钥管理](https://console.cloud.tencent.com/cam/capi)
