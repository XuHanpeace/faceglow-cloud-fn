/**
 * 本地测试 callRUMAPI 函数
 * 
 * 使用方法：
 * 1. 设置环境变量：
 *    export TENCENT_SECRET_ID=您的SecretId
 *    export TENCENT_SECRET_KEY=您的SecretKey
 * 
 * 2. 运行测试：
 *    node test.js
 */

const { main } = require('./index')

// 测试单个调用
async function testSingleCall() {
  console.log('=== 测试单个调用 ===')
  
  const event = {
    Action: 'DescribeRumLogList',
    Version: '2021-06-22',
    ProjectID: 'rum-6LsNkbT91rNlaj', // RUM 项目ID（必填，也可以使用 ID 参数）
    StartTime: Math.floor(Date.now() / 1000) - 3600, // 1小时前（必填）
    EndTime: Math.floor(Date.now() / 1000), // 当前时间（必填）
    Limit: 10, // 返回数量限制（必填）
    OrderBy: 'Time', // 排序字段（必填）
  }

  try {
    const result = await main(event, {})
    console.log('单个调用结果:', JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('单个调用失败:', error)
  }
}

// 测试批量调用
async function testBatchCall() {
  console.log('\n=== 测试批量调用 ===')
  
  const event = {
    batch: [
      {
        Action: 'DescribeRumLogList',
        Version: '2021-06-22',
        ProjectID: 'rum-6LsNkbT91rNlaj', // RUM 项目ID（必填，也可以使用 ID 参数）
        StartTime: Math.floor(Date.now() / 1000) - 3600,
        EndTime: Math.floor(Date.now() / 1000),
        Limit: 10, // 返回数量限制（必填）
        OrderBy: 'Time', // 排序字段（必填）
      },
      // 可以添加更多请求
      // {
      //   Action: 'DescribeData',
      //   Version: '2021-06-22',
      //   ...其他参数
      // },
    ],
  }

  try {
    const result = await main(event, {})
    console.log('批量调用结果:', JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('批量调用失败:', error)
  }
}

// 运行测试
async function runTests() {
  // 检查环境变量
  if (!process.env.TENCENT_SECRET_ID || !process.env.TENCENT_SECRET_KEY) {
    console.error('错误: 请先设置环境变量 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY')
    console.log('\n设置方法:')
    console.log('export TENCENT_SECRET_ID=您的SecretId')
    console.log('export TENCENT_SECRET_KEY=您的SecretKey')
    process.exit(1)
  }

  console.log('开始测试 callRUMAPI 函数...\n')

  // 测试单个调用
  await testSingleCall()

  // 测试批量调用
  await testBatchCall()

  console.log('\n测试完成!')
}

runTests().catch(console.error)
