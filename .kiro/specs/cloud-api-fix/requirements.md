# Requirements Document

## Introduction

本文档定义了修复敏感信息管理工具中云服务 API 调用问题的需求。当前除阿里云和腾讯云外，其他云服务（AWS、华为云、UCloud）配置后报 403 错误，钉钉 API 也存在连接问题。需要按照各云服务商官方文档规范重新实现 API 签名和调用逻辑。

## Glossary

- **Cloud_API_Module**: 后端 Rust 代码中负责调用云服务 API 的模块
- **Signature_Algorithm**: 云服务商要求的 API 请求签名算法
- **AWS_Signature_V4**: AWS 当前要求的签名版本 4 算法 (AWS4-HMAC-SHA256)
- **Huawei_AK_SK_Signature**: 华为云 AK/SK 签名认证方式
- **UCloud_Signature**: UCloud API 签名算法
- **DingTalk_API**: 钉钉开放平台 API
- **Frontend_API_Module**: 前端 TypeScript 代码中的 API 调用模块

## Requirements

### Requirement 1: AWS API 签名修复

**User Story:** As a user, I want to connect to AWS cloud services, so that I can manage AWS resources through this tool.

#### Acceptance Criteria

1. WHEN the user configures AWS credentials and connects, THE Cloud_API_Module SHALL use AWS Signature Version 4 (AWS4-HMAC-SHA256) algorithm for request signing
2. WHEN generating AWS API requests, THE Cloud_API_Module SHALL format timestamps in ISO 8601 format (YYYYMMDD'T'HHMMSS'Z')
3. WHEN calling AWS IAM API, THE Cloud_API_Module SHALL use the global endpoint (iam.amazonaws.com) instead of regional endpoints
4. WHEN AWS API returns a successful response, THE Cloud_API_Module SHALL parse and return the user/policy data correctly
5. IF AWS API returns an error, THEN THE Cloud_API_Module SHALL return a descriptive error message to the frontend

### Requirement 2: 华为云 API 签名修复

**User Story:** As a user, I want to connect to Huawei Cloud services, so that I can manage Huawei Cloud resources through this tool.

#### Acceptance Criteria

1. WHEN the user configures Huawei Cloud credentials and connects, THE Cloud_API_Module SHALL use HMAC-SHA256 algorithm for request signing (not HMAC-SHA1)
2. WHEN generating Huawei Cloud API requests, THE Cloud_API_Module SHALL follow the official AK/SK signing process with correct canonical request format
3. WHEN calling Huawei Cloud IAM API, THE Cloud_API_Module SHALL use RESTful API format with proper headers (X-Sdk-Date, Authorization)
4. WHEN Huawei Cloud API returns a successful response, THE Cloud_API_Module SHALL parse and return the data correctly
5. IF Huawei Cloud API returns an error, THEN THE Cloud_API_Module SHALL return a descriptive error message to the frontend

### Requirement 3: UCloud API 签名修复

**User Story:** As a user, I want to connect to UCloud services, so that I can manage UCloud resources through this tool.

#### Acceptance Criteria

1. WHEN the user configures UCloud credentials and connects, THE Cloud_API_Module SHALL generate signatures without URL-encoding the parameters before concatenation
2. WHEN generating UCloud API signatures, THE Cloud_API_Module SHALL concatenate parameters in the format "key1value1key2value2...privateKey" and then SHA1 hash
3. WHEN calling UCloud API, THE Cloud_API_Module SHALL use the correct endpoint (api.ucloud.cn) with proper parameters
4. WHEN UCloud API returns a successful response, THE Cloud_API_Module SHALL parse and return the data correctly
5. IF UCloud API returns an error (RetCode != 0), THEN THE Cloud_API_Module SHALL return the error message to the frontend

### Requirement 4: 钉钉 API 修复

**User Story:** As a user, I want to connect to DingTalk API with valid credentials, so that I can access DingTalk organizational data.

#### Acceptance Criteria

1. WHEN the user provides valid DingTalk AppKey and AppSecret, THE DingTalk_API SHALL successfully obtain an access_token
2. WHEN calling DingTalk API in Tauri environment, THE Frontend_API_Module SHALL use Tauri HTTP module to bypass CORS restrictions
3. WHEN calling DingTalk API in browser environment, THE Frontend_API_Module SHALL handle CORS errors gracefully and suggest using Tauri app
4. WHEN DingTalk API returns errcode != 0, THE DingTalk_API SHALL throw an error with the errmsg description
5. WHEN fetching department or user lists, THE DingTalk_API SHALL use the correct API endpoints and parameters

### Requirement 5: 统一错误处理

**User Story:** As a user, I want to see clear error messages when API calls fail, so that I can understand and fix configuration issues.

#### Acceptance Criteria

1. WHEN any cloud API call fails with 403 status, THE Cloud_API_Module SHALL return an error indicating authentication/signature failure
2. WHEN any cloud API call fails with network error, THE Cloud_API_Module SHALL return an error indicating network connectivity issue
3. WHEN any cloud API returns a business error, THE Cloud_API_Module SHALL extract and return the specific error message from the response
4. THE Cloud_API_Module SHALL log detailed error information for debugging purposes
