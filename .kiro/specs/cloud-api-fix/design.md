# Design Document: Cloud API Fix

## Overview

本设计文档描述了修复敏感信息管理工具中云服务 API 调用问题的技术方案。主要问题是 AWS、华为云、UCloud 的 API 签名算法实现不正确导致 403 错误，以及钉钉 API 的 CORS 问题。

修复策略：
1. **AWS**: 从 Signature V2 升级到 Signature V4 (AWS4-HMAC-SHA256)
2. **华为云**: 从 HMAC-SHA1 改为 HMAC-SHA256，使用正确的 RESTful 签名格式
3. **UCloud**: 修正签名算法中的 URL 编码问题
4. **钉钉**: 确保 Tauri 环境下正确使用 HTTP 模块

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Vue/TypeScript)               │
├─────────────────────────────────────────────────────────────┤
│  dingtalk-api.ts  │  aws-api.ts  │  huawei-api.ts  │ ...    │
│       ↓                  ↓              ↓                    │
│  Tauri HTTP      │   Tauri Invoke Commands                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Rust/Tauri)                      │
├─────────────────────────────────────────────────────────────┤
│  cloud_services/                                             │
│  ├── aws.rs      (AWS Signature V4)                         │
│  ├── huawei.rs   (Huawei AK/SK Signature)                   │
│  ├── ucloud.rs   (UCloud SHA1 Signature)                    │
│  ├── aliyun.rs   (Working - Reference)                      │
│  └── tencent.rs  (Working - Reference)                      │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. AWS Signature V4 Module

AWS Signature V4 签名流程：

```
1. 创建规范请求 (Canonical Request)
   CanonicalRequest =
     HTTPRequestMethod + '\n' +
     CanonicalURI + '\n' +
     CanonicalQueryString + '\n' +
     CanonicalHeaders + '\n' +
     SignedHeaders + '\n' +
     HashedPayload

2. 创建待签名字符串 (String to Sign)
   StringToSign =
     Algorithm + '\n' +
     RequestDateTime + '\n' +
     CredentialScope + '\n' +
     HashedCanonicalRequest

3. 计算签名
   kDate = HMAC-SHA256("AWS4" + SecretKey, Date)
   kRegion = HMAC-SHA256(kDate, Region)
   kService = HMAC-SHA256(kRegion, Service)
   kSigning = HMAC-SHA256(kService, "aws4_request")
   Signature = Hex(HMAC-SHA256(kSigning, StringToSign))

4. 添加签名到请求头
   Authorization: AWS4-HMAC-SHA256 
     Credential=AccessKeyId/CredentialScope,
     SignedHeaders=host;x-amz-date,
     Signature=calculated_signature
```

**Rust 伪代码**:
```rust
fn generate_aws_v4_signature(
    secret_key: &str,
    method: &str,
    uri: &str,
    query_string: &str,
    headers: &HashMap<String, String>,
    payload_hash: &str,
    region: &str,
    service: &str,
    datetime: &str,  // Format: YYYYMMDD'T'HHMMSS'Z'
) -> String {
    let date = &datetime[..8];  // YYYYMMDD
    
    // Step 1: Canonical Request
    let canonical_headers = build_canonical_headers(headers);
    let signed_headers = build_signed_headers(headers);
    let canonical_request = format!(
        "{}\n{}\n{}\n{}\n{}\n{}",
        method, uri, query_string, canonical_headers, signed_headers, payload_hash
    );
    
    // Step 2: String to Sign
    let credential_scope = format!("{}/{}/{}/aws4_request", date, region, service);
    let hashed_canonical = sha256_hex(&canonical_request);
    let string_to_sign = format!(
        "AWS4-HMAC-SHA256\n{}\n{}\n{}",
        datetime, credential_scope, hashed_canonical
    );
    
    // Step 3: Calculate Signature
    let k_date = hmac_sha256(format!("AWS4{}", secret_key).as_bytes(), date.as_bytes());
    let k_region = hmac_sha256(&k_date, region.as_bytes());
    let k_service = hmac_sha256(&k_region, service.as_bytes());
    let k_signing = hmac_sha256(&k_service, b"aws4_request");
    let signature = hmac_sha256(&k_signing, string_to_sign.as_bytes());
    
    hex::encode(signature)
}
```

### 2. Huawei Cloud AK/SK Signature Module

华为云签名流程：

```
1. 构建规范请求
   CanonicalRequest =
     HTTPMethod + '\n' +
     CanonicalURI + '\n' +
     CanonicalQueryString + '\n' +
     CanonicalHeaders + '\n' +
     SignedHeaders + '\n' +
     HashedPayload

2. 构建待签名字符串
   StringToSign =
     Algorithm + '\n' +
     RequestDateTime + '\n' +
     HashedCanonicalRequest

3. 计算签名
   Signature = Hex(HMAC-SHA256(SecretKey, StringToSign))

4. 添加请求头
   X-Sdk-Date: 20260105T120000Z
   Authorization: SDK-HMAC-SHA256 Access=AK, SignedHeaders=..., Signature=...
```

**Rust 伪代码**:
```rust
fn generate_huawei_signature(
    secret_key: &str,
    method: &str,
    uri: &str,
    query_string: &str,
    headers: &HashMap<String, String>,
    payload_hash: &str,
    datetime: &str,
) -> String {
    // Step 1: Canonical Request
    let canonical_headers = build_canonical_headers(headers);
    let signed_headers = build_signed_headers(headers);
    let canonical_request = format!(
        "{}\n{}\n{}\n{}\n{}\n{}",
        method, uri, query_string, canonical_headers, signed_headers, payload_hash
    );
    
    // Step 2: String to Sign
    let hashed_canonical = sha256_hex(&canonical_request);
    let string_to_sign = format!(
        "SDK-HMAC-SHA256\n{}\n{}",
        datetime, hashed_canonical
    );
    
    // Step 3: Calculate Signature
    let signature = hmac_sha256(secret_key.as_bytes(), string_to_sign.as_bytes());
    hex::encode(signature)
}
```

### 3. UCloud Signature Module

UCloud 签名流程（修正版）：

```
1. 按参数名升序排列所有请求参数
2. 拼接参数：key1value1key2value2... (不需要 URL 编码)
3. 在末尾拼接 PrivateKey
4. 对整个字符串计算 SHA1 哈希
5. 将哈希结果转为小写十六进制字符串
```

**Rust 伪代码**:
```rust
fn generate_ucloud_signature(
    private_key: &str,
    params: &HashMap<String, String>,
) -> String {
    // Step 1: Sort parameters by key
    let mut sorted_params: Vec<_> = params.iter().collect();
    sorted_params.sort_by(|a, b| a.0.cmp(b.0));
    
    // Step 2: Concatenate without URL encoding
    let mut sign_str = String::new();
    for (key, value) in sorted_params {
        sign_str.push_str(key);
        sign_str.push_str(value);
    }
    
    // Step 3: Append private key
    sign_str.push_str(private_key);
    
    // Step 4: SHA1 hash
    let mut hasher = Sha1::new();
    hasher.update(sign_str.as_bytes());
    let result = hasher.finalize();
    
    // Step 5: Hex encode (lowercase)
    hex::encode(result)
}
```

### 4. DingTalk API Module

钉钉 API 调用流程：

```typescript
// 环境检测
if (window.__TAURI__) {
    // Tauri 环境：使用 Tauri HTTP 模块绕过 CORS
    const { fetch } = await import('@tauri-apps/api/http');
    const response = await fetch(url, options);
} else {
    // 浏览器环境：提示用户使用 Tauri 应用
    throw new Error('请使用桌面应用访问钉钉 API');
}
```

## Data Models

### AWS Config
```rust
pub struct AWSConfig {
    pub access_key_id: String,
    pub secret_access_key: String,
    pub region: String,
    pub endpoint: Option<String>,
    pub session_token: Option<String>,
}
```

### Huawei Config
```rust
pub struct HuaweiConfig {
    pub access_key: String,
    pub secret_key: String,
    pub region: String,
    pub endpoint: Option<String>,
    pub project_id: Option<String>,
}
```

### UCloud Config
```rust
pub struct UCloudConfig {
    pub public_key: String,
    pub private_key: String,
    pub region: String,
    pub project_id: Option<String>,
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: AWS Signature V4 Correctness

*For any* valid AWS credentials (access_key_id, secret_access_key), region, service, and request parameters, the generated AWS Signature V4 SHALL produce a signature that matches the expected output when computed with the same inputs using the official AWS signing algorithm.

**Validates: Requirements 1.1, 1.2**

### Property 2: AWS Timestamp Format

*For any* datetime value, the formatted timestamp SHALL match the pattern `YYYYMMDD'T'HHMMSS'Z'` (e.g., "20260105T120000Z").

**Validates: Requirements 1.2**

### Property 3: Huawei Cloud Signature Correctness

*For any* valid Huawei Cloud credentials (access_key, secret_key) and request parameters, the generated signature using HMAC-SHA256 SHALL produce a valid authentication that the Huawei Cloud API accepts.

**Validates: Requirements 2.1, 2.2**

### Property 4: UCloud Signature Correctness

*For any* valid UCloud credentials (public_key, private_key) and request parameters, the signature SHALL be computed by:
1. Sorting parameters by key name
2. Concatenating as "key1value1key2value2..." without URL encoding
3. Appending private_key
4. Computing SHA1 hash and converting to lowercase hex

**Validates: Requirements 3.1, 3.2**

### Property 5: Error Response Parsing

*For any* cloud API error response (AWS, Huawei, UCloud), the error handler SHALL extract and return a human-readable error message from the response body.

**Validates: Requirements 1.5, 2.5, 3.5, 5.1, 5.2, 5.3**

### Property 6: DingTalk Error Handling

*For any* DingTalk API response with errcode != 0, the API module SHALL throw an error containing the errmsg value.

**Validates: Requirements 4.4**

## Error Handling

### HTTP Status Code Handling

| Status Code | Error Type | User Message |
|-------------|------------|--------------|
| 400 | Bad Request | 请求参数错误，请检查配置 |
| 401 | Unauthorized | 认证失败，请检查 Access Key |
| 403 | Forbidden | 签名验证失败或权限不足 |
| 404 | Not Found | 请求的资源不存在 |
| 500 | Server Error | 云服务内部错误，请稍后重试 |

### Error Response Structure

```rust
pub struct CloudServiceResult<T> {
    pub success: bool,
    pub data: Option<T>,
    pub message: Option<String>,
    pub error: Option<String>,
}
```

## Testing Strategy

### Unit Tests

1. **签名算法测试**: 使用官方文档中的示例数据验证签名输出
2. **时间戳格式测试**: 验证各种时间输入的格式化结果
3. **错误解析测试**: 验证各种错误响应的解析结果

### Property-Based Tests

使用 `proptest` crate 进行属性测试：

1. **AWS Signature V4 Property Test**: 生成随机请求参数，验证签名算法的一致性
2. **UCloud Signature Property Test**: 验证签名不包含 URL 编码
3. **Error Handling Property Test**: 验证所有错误响应都能正确解析

### Integration Tests

1. 使用真实凭证测试各云服务的连接
2. 验证 API 调用返回正确的数据结构

### Test Configuration

- Property tests: 最少 100 次迭代
- 使用 `proptest` crate 进行 Rust 属性测试
- 使用 `fast-check` 进行 TypeScript 属性测试（如需要）
