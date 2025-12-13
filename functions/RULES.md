# 云函数开发规范

本文档总结了 `callBailian` 和 `queryTask` 云函数的开发规范，后续新增云函数应遵循这些规范。

## 一、代码结构规范

### 1. 函数抽取原则

**不要在函数体内堆砌太多逻辑，每个逻辑分支应单独抽离为独立函数。**

#### 示例：参数验证
```javascript
// ✅ 好的做法：抽取为独立函数
function validateParams(payload, taskType) {
  // 验证逻辑
  return null; // 验证通过
  // 或返回错误响应
}

// ❌ 不好的做法：在主函数中堆砌逻辑
exports.main = async (event, context) => {
  // 大量验证逻辑...
  if (!prompt) {
    return { success: false, ... };
  }
  if (!images) {
    return { success: false, ... };
  }
  // ...
}
```

#### 示例：业务逻辑
```javascript
// ✅ 好的做法：抽取业务逻辑
async function checkUserBalance(userId, price) {
  // 余额检查逻辑
}

async function deductBalanceAndCreateTransaction(...) {
  // 扣款逻辑
}

// ❌ 不好的做法：在主函数中直接实现
exports.main = async (event, context) => {
  const db = app.database();
  const userDoc = await db.collection('users')...
  // 大量业务逻辑...
}
```

### 2. 函数命名规范

- **功能函数**：使用动词开头，如 `parsePayload`, `validateParams`, `checkUserBalance`
- **构建函数**：使用 `build` 前缀，如 `buildImageToImageRequest`, `buildRequestParams`
- **工具函数**：使用 `create` 前缀，如 `createSuccessResponse`, `createErrorResponse`

### 3. 函数职责单一

每个函数只做一件事：
- `parsePayload`: 只负责解析请求参数
- `validateParams`: 只负责参数验证
- `checkUserBalance`: 只负责余额检查
- `buildRequestParams`: 只负责构建请求参数
- `callBailianAPI`: 只负责调用外部 API

## 二、输入输出标准化

### 1. 统一响应格式

所有云函数必须返回统一的响应格式：

```javascript
// 成功响应
{
  success: true,
  data: {
    // 具体数据
  },
  errCode: null,
  errorMsg: null
}

// 失败响应
{
  success: false,
  data: null | {
    // 错误详情（如余额不足时的 currentBalance, requiredAmount）
  },
  errCode: "ERROR_CODE",
  errorMsg: "错误描述"
}
```

### 2. 使用标准化函数

使用 `createSuccessResponse` 和 `createErrorResponse` 函数创建响应：

```javascript
// ✅ 好的做法
function createSuccessResponse(data) {
  return {
    success: true,
    data: data,
    errCode: null,
    errorMsg: null
  };
}

function createErrorResponse(errCode, errorMsg, data = null) {
  return {
    success: false,
    data: data,
    errCode: errCode,
    errorMsg: errorMsg
  };
}

// 使用
return createSuccessResponse({ taskId: 'xxx' });
return createErrorResponse('MISSING_PROMPT', '请提供 prompt 参数');
```

### 3. 错误代码标准化

常见错误代码：
- `MISSING_API_KEY`: 缺少API Key
- `MISSING_PROMPT`: 缺少提示词
- `MISSING_IMAGES`: 缺少图片
- `MISSING_TASK_ID`: 缺少taskId
- `MISSING_USER_ID`: 价格>0但缺少user_id
- `USER_NOT_FOUND`: 用户不存在
- `INSUFFICIENT_BALANCE`: 余额不足
- `INVALID_TASK_TYPE`: 无效的任务类型
- `HTTP_XXX`: HTTP状态码错误
- `InvalidParameter.XXX`: API参数错误

## 三、参数解析规范

### 1. 统一参数解析函数

所有云函数应使用统一的参数解析逻辑：

```javascript
function parsePayload(event) {
  let payload = event;

  // 处理 HTTP 请求的 body
  if (event.body) {
    try {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      payload = body.data || body;
    } catch (e) {
      console.error('解析 event.body 失败:', e);
    }
  } else {
    payload = event.data || event;
  }

  return payload;
}
```

### 2. 参数验证

参数验证应独立为函数，返回 `null`（验证通过）或错误响应：

```javascript
function validateParams(payload, taskType) {
  // 验证逻辑
  if (!prompt) {
    return createErrorResponse('MISSING_PROMPT', '请提供 prompt 参数');
  }
  // ...
  return null; // 验证通过
}
```

## 四、数据库操作规范

### 1. 错误处理

数据库操作应包含完整的错误处理：

```javascript
async function checkUserBalance(userId, price) {
  try {
    const db = app.database();
    const userDoc = await db.collection('users')
      .where({ uid: userId })
      .get();
    
    if (!userDoc.data || userDoc.data.length === 0) {
      return createErrorResponse('USER_NOT_FOUND', '用户不存在');
    }
    // ...
  } catch (error) {
    console.error('查询用户余额失败:', error);
    return createErrorResponse('DATABASE_ERROR', '查询用户余额失败');
  }
}
```

### 2. 事务处理

对于需要保证一致性的操作（如扣款+创建流水），应：
- 先执行主要操作（如调用外部API）
- 成功后执行数据库操作
- 数据库操作失败不应影响主流程（可通过补偿机制处理）

## 五、日志规范

### 1. 日志格式

使用统一的日志格式，包含函数名前缀：

```javascript
console.log('📥 [CallBailian] 收到请求参数:', JSON.stringify(payload));
console.log('🔍 [CallBailian] 查询用户余额: user_id=${userId}');
console.log('✅ [CallBailian] 任务提交成功，taskId=${taskId}');
console.error('❌ [CallBailian] 余额不足: 当前余额=${balance}, 需要=${price}');
```

### 2. 日志级别

- `console.log`: 正常流程日志
- `console.error`: 错误日志
- `console.warn`: 警告日志（如余额不足但任务已提交）

## 六、测试规范

### 1. 测试脚本

每个云函数应包含测试脚本（如 `test.js`），测试脚本应：
- 覆盖 Happy Case（正常流程）
- 覆盖 Bad Case（错误场景）
- 包含详细的测试输出和结果

### 2. 测试流程

**新增云函数前必须先执行测试：**

1. 编写测试脚本
2. 运行测试：`node test.js`
3. 检查测试结果
4. 修复问题后重新测试
5. 测试通过后再部署

### 3. 测试环境配置

测试脚本应支持从环境变量读取配置：
- `DASHSCOPE_API_KEY`: 阿里云百炼 API Key
- `TENCENT_SECRET_ID`: 腾讯云 SecretId（本地测试时需要）
- `TENCENT_SECRET_KEY`: 腾讯云 SecretKey（本地测试时需要）

**注意**：云函数代码中不应硬编码测试凭证，应从环境变量读取。

## 七、部署规范

### 1. 环境变量配置

在 `cloudbaserc.json` 中配置环境变量：

```json
{
  "functions": [
    {
      "name": "callBailian",
      "envVariables": {
        "DASHSCOPE_API_KEY": "your-api-key",
        "TENCENT_SECRET_ID": "your-secret-id",
        "TENCENT_SECRET_KEY": "your-secret-key"
      }
    }
  ]
}
```

### 2. 代码检查清单

部署前检查：
- [ ] 代码已通过测试
- [ ] 没有硬编码的敏感信息（如 API Key、SecretId）
- [ ] 响应格式符合统一规范
- [ ] 错误处理完整
- [ ] 日志格式统一
- [ ] 函数已抽取，代码结构清晰

## 八、示例：完整的云函数结构

```javascript
const axios = require('axios');
const cloudbase = require('@cloudbase/node-sdk');

// 初始化
const app = cloudbase.init({
  env: 'your-env-id'
});

// 1. 标准化响应函数
function createSuccessResponse(data) {
  return {
    success: true,
    data: data,
    errCode: null,
    errorMsg: null
  };
}

function createErrorResponse(errCode, errorMsg, data = null) {
  return {
    success: false,
    data: data,
    errCode: errCode,
    errorMsg: errorMsg
  };
}

// 2. 参数解析函数
function parsePayload(event) {
  // ...
}

// 3. 参数验证函数
function validateParams(payload) {
  // ...
}

// 4. 业务逻辑函数
async function checkUserBalance(userId, price) {
  // ...
}

// 5. API 调用函数
async function callExternalAPI(params) {
  // ...
}

// 6. 主函数
exports.main = async (event, context) => {
  // 1. 获取配置
  const apiKey = process.env.API_KEY || '';
  if (!apiKey) {
    return createErrorResponse('MISSING_API_KEY', '缺少API Key');
  }
  
  // 2. 解析参数
  const payload = parsePayload(event);
  
  // 3. 验证参数
  const validationError = validateParams(payload);
  if (validationError) {
    return validationError;
  }
  
  // 4. 业务逻辑
  try {
    const result = await callExternalAPI(payload);
    return createSuccessResponse(result);
  } catch (error) {
    return createErrorResponse('API_ERROR', error.message);
  }
};
```

## 九、总结

遵循以上规范可以确保：
1. **代码可维护性**：函数职责单一，易于理解和修改
2. **代码可测试性**：逻辑分离，便于单元测试
3. **响应一致性**：统一的响应格式，便于客户端处理
4. **错误处理完整性**：标准化的错误代码和信息
5. **开发效率**：规范的代码结构，提高开发效率
