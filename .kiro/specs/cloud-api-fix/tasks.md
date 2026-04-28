# Implementation Plan: Cloud API Fix

## Overview

本实现计划将修复 AWS、华为云、UCloud 的 API 签名问题以及钉钉 API 的 CORS 问题。按照云服务商逐个修复，每个修复后进行验证。

## Tasks

- [x] 1. 添加必要的 Rust 依赖
  - 在 Cargo.toml 中添加 sha2 crate（已有）确认版本
  - 确认 hmac、hex、chrono 等依赖版本正确
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 2. 修复 AWS API 签名
  - [x] 2.1 实现 AWS Signature V4 签名算法
    - 创建 `generate_aws_v4_signature` 函数
    - 实现规范请求构建 (Canonical Request)
    - 实现待签名字符串构建 (String to Sign)
    - 实现签名密钥派生 (Signing Key)
    - 使用 HMAC-SHA256 计算最终签名
    - _Requirements: 1.1_
  - [x] 2.2 修复 AWS 时间戳格式
    - 使用 ISO 8601 格式: YYYYMMDD'T'HHMMSS'Z'
    - _Requirements: 1.2_
  - [x] 2.3 修复 AWS IAM 端点
    - IAM 使用全局端点 iam.amazonaws.com
    - 其他服务使用区域端点
    - _Requirements: 1.3_
  - [x] 2.4 更新 AWS API 调用函数
    - 使用新的签名算法
    - 添加正确的请求头 (Authorization, X-Amz-Date)
    - _Requirements: 1.1, 1.4_
  - [ ]* 2.5 编写 AWS 签名算法属性测试
    - **Property 1: AWS Signature V4 Correctness**
    - **Property 2: AWS Timestamp Format**
    - **Validates: Requirements 1.1, 1.2**

- [x] 3. 修复华为云 API 签名
  - [x] 3.1 实现华为云 AK/SK 签名算法
    - 创建 `generate_huawei_signature` 函数
    - 使用 HMAC-SHA256 替代 HMAC-SHA1
    - 实现规范请求构建
    - _Requirements: 2.1, 2.2_
  - [x] 3.2 更新华为云 API 调用函数
    - 使用 RESTful API 格式
    - 添加正确的请求头 (X-Sdk-Date, Authorization)
    - 修正端点 URL 格式
    - _Requirements: 2.2, 2.3_
  - [ ]* 3.3 编写华为云签名算法属性测试
    - **Property 3: Huawei Cloud Signature Correctness**
    - **Validates: Requirements 2.1, 2.2**

- [x] 4. 修复 UCloud API 签名
  - [x] 4.1 修正 UCloud 签名算法
    - 修改 `generate_ucloud_signature` 函数
    - 移除参数拼接时的 URL 编码
    - 使用正确的格式: key1value1key2value2...privateKey
    - _Requirements: 3.1, 3.2_
  - [x] 4.2 验证 UCloud API 调用
    - 确认端点 URL 正确
    - 确认参数传递正确
    - _Requirements: 3.3_
  - [ ]* 4.3 编写 UCloud 签名算法属性测试
    - **Property 4: UCloud Signature Correctness**
    - **Validates: Requirements 3.1, 3.2**

- [x] 5. Checkpoint - 验证后端云服务修复
  - 确保所有 Rust 代码编译通过
  - 运行属性测试验证签名算法
  - 如有问题请询问用户

- [x] 6. 修复钉钉 API
  - [x] 6.1 优化 Tauri 环境检测
    - 确保 `window.__TAURI__` 检测可靠
    - 在非 Tauri 环境提供友好提示
    - _Requirements: 4.2, 4.3_
  - [x] 6.2 完善错误处理
    - 正确解析 errcode 和 errmsg
    - 提供清晰的错误信息
    - _Requirements: 4.4_
  - [ ]* 6.3 编写钉钉 API 错误处理测试
    - **Property 6: DingTalk Error Handling**
    - **Validates: Requirements 4.4**

- [x] 7. 统一错误处理
  - [x] 7.1 实现统一的错误分类
    - 403 错误: 签名/认证失败
    - 网络错误: 连接问题
    - 业务错误: 提取具体错误信息
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ]* 7.2 编写错误处理属性测试
    - **Property 5: Error Response Parsing**
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 8. Final Checkpoint - 完整验证
  - 确保所有测试通过
  - 验证各云服务 API 调用正常
  - 如有问题请询问用户

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- 建议按顺序执行，每个云服务修复后进行验证
- 属性测试使用 `proptest` crate
- 如果没有真实凭证，可以使用官方文档的示例数据验证签名算法
