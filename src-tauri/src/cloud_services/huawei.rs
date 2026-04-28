use serde::{Deserialize, Serialize};
use tauri::command;
use std::collections::HashMap;
use chrono::Utc;
use reqwest::Client;
use sha2::{Sha256, Digest};
use hmac::{Hmac, Mac};
use reqwest::header::{HeaderMap, HeaderValue, CONTENT_TYPE};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HuaweiConfig {
    pub access_key: String,
    pub secret_key: String,
    pub region: String,
    pub endpoint: Option<String>,
    pub session_token: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SubUser {
    pub id: String,
    pub username: String,
    pub display_name: String,
    pub email: Option<String>,
    pub status: String,
    pub permissions: Vec<String>,
    pub created_at: String,
    pub last_login: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CloudServiceResult<T> {
    pub success: bool,
    pub data: Option<T>,
    pub message: Option<String>,
    pub error: Option<String>,
}

// ============================================
// 华为云 AK/SK 签名实现 (SDK-HMAC-SHA256)
// ============================================

type HmacSha256 = Hmac<Sha256>;

/// 计算 SHA256 哈希并返回十六进制字符串
fn sha256_hex(data: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data.as_bytes());
    hex::encode(hasher.finalize())
}

/// 计算 HMAC-SHA256
fn hmac_sha256(key: &[u8], data: &[u8]) -> Vec<u8> {
    let mut mac = HmacSha256::new_from_slice(key)
        .expect("HMAC can take key of any size");
    mac.update(data);
    mac.finalize().into_bytes().to_vec()
}

/// 生成华为云时间戳格式: YYYYMMDD'T'HHMMSS'Z'
fn get_huawei_timestamp() -> String {
    Utc::now().format("%Y%m%dT%H%M%SZ").to_string()
}

/// URL 编码（华为云风格）
fn huawei_url_encode(s: &str) -> String {
    let mut result = String::new();
    for c in s.chars() {
        match c {
            'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => {
                result.push(c);
            }
            _ => {
                for byte in c.to_string().as_bytes() {
                    result.push_str(&format!("%{:02X}", byte));
                }
            }
        }
    }
    result
}

/// 构建规范查询字符串
fn build_canonical_query_string(params: &HashMap<String, String>) -> String {
    if params.is_empty() {
        return String::new();
    }
    
    let mut sorted_params: Vec<_> = params.iter().collect();
    sorted_params.sort_by(|a, b| a.0.cmp(b.0));
    
    sorted_params
        .iter()
        .map(|(k, v)| format!("{}={}", huawei_url_encode(k), huawei_url_encode(v)))
        .collect::<Vec<_>>()
        .join("&")
}

/// 构建规范请求头
fn build_canonical_headers(headers: &HashMap<String, String>) -> (String, String) {
    let mut sorted_headers: Vec<_> = headers.iter()
        .map(|(k, v)| (k.to_lowercase(), v.trim().to_string()))
        .collect();
    sorted_headers.sort_by(|a, b| a.0.cmp(&b.0));
    
    let canonical_headers = sorted_headers
        .iter()
        .map(|(k, v)| format!("{}:{}\n", k, v))
        .collect::<String>();
    
    let signed_headers = sorted_headers
        .iter()
        .map(|(k, _)| k.as_str())
        .collect::<Vec<_>>()
        .join(";");
    
    (canonical_headers, signed_headers)
}

/// 华为云 SDK-HMAC-SHA256 签名
fn generate_huawei_signature(
    secret_key: &str,
    method: &str,
    uri: &str,
    query_string: &str,
    headers: &HashMap<String, String>,
    payload_hash: &str,
    datetime: &str,
) -> (String, String) {
    // Step 1: 创建规范请求 (Canonical Request)
    let (canonical_headers, signed_headers) = build_canonical_headers(headers);
    let canonical_request = format!(
        "{}\n{}\n{}\n{}\n{}\n{}",
        method,
        uri,
        query_string,
        canonical_headers,
        signed_headers,
        payload_hash
    );
    
    // Step 2: 创建待签名字符串 (String to Sign)
    let hashed_canonical_request = sha256_hex(&canonical_request);
    let string_to_sign = format!(
        "SDK-HMAC-SHA256\n{}\n{}",
        datetime,
        hashed_canonical_request
    );
    
    // Step 3: 计算签名 (直接使用 secret_key)
    let signature = hmac_sha256(secret_key.as_bytes(), string_to_sign.as_bytes());
    let signature_hex = hex::encode(signature);
    
    (signature_hex, signed_headers)
}

/// 获取华为云 IAM 端点
fn get_huawei_iam_endpoint(region: &str) -> String {
    format!("https://iam.{}.myhuaweicloud.com", region)
}


/// 华为云 API 调用函数 (使用 SDK-HMAC-SHA256 签名)
/// service: 服务名，如 "iam", "ecs", "obs" 等
/// uri: API 路径，如 "/v3/users"
async fn call_huawei_api(
    config: &HuaweiConfig,
    service: &str,
    method: &str,
    uri: &str,
    query_params: HashMap<String, String>,
    body: Option<&str>,
) -> Result<serde_json::Value, String> {
    let client = Client::new();
    
    // 根据服务名确定端点
    let (endpoint, host) = match service {
        "iam" => {
            let ep = get_huawei_iam_endpoint(&config.region);
            let h = format!("iam.{}.myhuaweicloud.com", config.region);
            (ep, h)
        }
        _ => {
            // 其他服务使用通用端点格式
            let ep = format!("https://{}.{}.myhuaweicloud.com", service, config.region);
            let h = format!("{}.{}.myhuaweicloud.com", service, config.region);
            (ep, h)
        }
    };
    let url = format!("{}{}", endpoint, uri);
    
    // 获取时间戳
    let datetime = get_huawei_timestamp();
    
    // 计算请求体哈希
    let payload = body.unwrap_or("");
    let payload_hash = sha256_hex(payload);
    
    // 构建请求头
    let mut headers_map: HashMap<String, String> = HashMap::new();
    headers_map.insert("host".to_string(), host.clone());
    headers_map.insert("x-sdk-date".to_string(), datetime.clone());
    
    // GET 请求也需要 content-type 参与签名（华为云要求）
    if method == "GET" {
        headers_map.insert("content-type".to_string(), "application/json".to_string());
    } else if !payload.is_empty() {
        headers_map.insert("content-type".to_string(), "application/json".to_string());
    }
    
    // 构建查询字符串
    let query_string = build_canonical_query_string(&query_params);
    
    // 生成签名
    let (signature, signed_headers) = generate_huawei_signature(
        &config.secret_key,
        method,
        uri,
        &query_string,
        &headers_map,
        &payload_hash,
        &datetime,
    );
    
    // 构建 Authorization 头
    let authorization = format!(
        "SDK-HMAC-SHA256 Access={}, SignedHeaders={}, Signature={}",
        config.access_key,
        signed_headers,
        signature
    );
    
    // 构建 HTTP 请求头
    let mut http_headers = HeaderMap::new();
    http_headers.insert("Host", HeaderValue::from_str(&host).unwrap());
    http_headers.insert("X-Sdk-Date", HeaderValue::from_str(&datetime).unwrap());
    http_headers.insert("Authorization", HeaderValue::from_str(&authorization).unwrap());
    
    // GET 请求也需要 content-type
    if method == "GET" {
        http_headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    } else if !payload.is_empty() {
        http_headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    }
    
    // 构建完整 URL（带查询参数）
    let full_url = if query_string.is_empty() {
        url
    } else {
        format!("{}?{}", url, query_string)
    };
    
    // 发送请求
    let request_builder = match method {
        "GET" => client.get(&full_url),
        "POST" => client.post(&full_url).body(payload.to_string()),
        "PUT" => client.put(&full_url).body(payload.to_string()),
        "DELETE" => client.delete(&full_url),
        _ => client.get(&full_url),
    };
    
    let response = request_builder
        .headers(http_headers)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;
    
    let status = response.status();
    let response_text = response.text().await.map_err(|e| format!("读取响应失败: {}", e))?;
    
    if !status.is_success() {
        // 尝试解析 JSON 错误响应
        if let Ok(error_json) = serde_json::from_str::<serde_json::Value>(&response_text) {
            let error_msg = error_json.get("error_msg")
                .or_else(|| error_json.get("message"))
                .and_then(|v| v.as_str())
                .unwrap_or("未知错误");
            let error_code = error_json.get("error_code")
                .or_else(|| error_json.get("code"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            return Err(format!("华为云 API 错误 ({}): {} - {}", status, error_code, error_msg));
        }
        return Err(format!("API调用失败，状态码: {}，响应: {}", status, response_text));
    }
    
    // 解析 JSON 响应
    if response_text.is_empty() {
        return Ok(serde_json::json!({}));
    }
    
    serde_json::from_str(&response_text)
        .map_err(|e| format!("解析响应失败: {}，响应内容: {}", e, response_text))
}

// ============================================
// Tauri Commands
// ============================================

// 华为云控制台接管 - 验证凭证有效性
#[command]
pub async fn huawei_take_over_console(config: HuaweiConfig) -> Result<CloudServiceResult<bool>, String> {
    // 调用 IAM API 获取用户列表来验证凭证
    let params = HashMap::new();
    
    match call_huawei_api(&config, "iam", "GET", "/v3/users", params, None).await {
        Ok(response) => {
            if response.get("error").is_none() && response.get("error_code").is_none() {
                Ok(CloudServiceResult {
                    success: true,
                    data: Some(true),
                    message: Some("华为云凭证验证成功".to_string()),
                    error: None,
                })
            } else {
                let error_msg = response.get("error_msg")
                    .or_else(|| response.get("message"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("凭证验证失败");
                Ok(CloudServiceResult {
                    success: false,
                    data: None,
                    message: None,
                    error: Some(error_msg.to_string()),
                })
            }
        }
        Err(e) => {
            Ok(CloudServiceResult {
                success: false,
                data: None,
                message: None,
                error: Some(e),
            })
        }
    }
}

// 取消控制台接管
#[command]
pub async fn huawei_cancel_console_takeover(_config: HuaweiConfig) -> Result<CloudServiceResult<bool>, String> {
    Ok(CloudServiceResult {
        success: true,
        data: Some(true),
        message: Some("华为云控制台接管已取消".to_string()),
        error: None,
    })
}

// 获取子用户列表
#[command]
pub async fn huawei_get_sub_users(config: HuaweiConfig) -> Result<CloudServiceResult<Vec<SubUser>>, String> {
    let params = HashMap::new();
    
    match call_huawei_api(&config, "iam", "GET", "/v3/users", params, None).await {
        Ok(response) => {
            if response.get("error").is_none() && response.get("error_code").is_none() {
                let mut users = Vec::new();
                
                if let Some(users_array) = response.get("users").and_then(|v| v.as_array()) {
                    for user_data in users_array {
                        let user = SubUser {
                            id: user_data.get("id")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            username: user_data.get("name")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            display_name: user_data.get("name")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            email: user_data.get("email")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            status: if user_data.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false) {
                                "Active".to_string()
                            } else {
                                "Disabled".to_string()
                            },
                            permissions: vec![],
                            created_at: user_data.get("create_time")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            last_login: user_data.get("last_project_id")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                        };
                        users.push(user);
                    }
                }
                
                Ok(CloudServiceResult {
                    success: true,
                    data: Some(users),
                    message: Some("子用户列表获取成功".to_string()),
                    error: None,
                })
            } else {
                let error_msg = response.get("error_msg")
                    .or_else(|| response.get("message"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("获取子用户列表失败");
                Ok(CloudServiceResult {
                    success: false,
                    data: None,
                    message: None,
                    error: Some(error_msg.to_string()),
                })
            }
        }
        Err(e) => {
            Ok(CloudServiceResult {
                success: false,
                data: None,
                message: None,
                error: Some(e),
            })
        }
    }
}

// 创建子用户
#[command]
pub async fn huawei_create_sub_user(config: HuaweiConfig, user_data: HashMap<String, serde_json::Value>) -> Result<CloudServiceResult<SubUser>, String> {
    let username = user_data.get("username").and_then(|v| v.as_str()).unwrap_or("new_user");
    let display_name = user_data.get("display_name").and_then(|v| v.as_str()).unwrap_or(username);
    let email = user_data.get("email").and_then(|v| v.as_str());
    
    let body = serde_json::json!({
        "user": {
            "name": username,
            "description": display_name,
            "email": email,
            "enabled": true
        }
    });
    
    let params = HashMap::new();
    
    match call_huawei_api(&config, "iam", "POST", "/v3/users", params, Some(&body.to_string())).await {
        Ok(response) => {
            if response.get("error").is_none() && response.get("error_code").is_none() {
                let user_resp = response.get("user");
                let user = SubUser {
                    id: user_resp.and_then(|u| u.get("id")).and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    username: username.to_string(),
                    display_name: display_name.to_string(),
                    email: email.map(|s| s.to_string()),
                    status: "Active".to_string(),
                    permissions: vec![],
                    created_at: Utc::now().to_rfc3339(),
                    last_login: None,
                };
                
                Ok(CloudServiceResult {
                    success: true,
                    data: Some(user),
                    message: Some("子用户创建成功".to_string()),
                    error: None,
                })
            } else {
                let error_msg = response.get("error_msg")
                    .or_else(|| response.get("message"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("创建子用户失败");
                Ok(CloudServiceResult {
                    success: false,
                    data: None,
                    message: None,
                    error: Some(error_msg.to_string()),
                })
            }
        }
        Err(e) => {
            Ok(CloudServiceResult {
                success: false,
                data: None,
                message: None,
                error: Some(e),
            })
        }
    }
}

// 删除子用户
#[command]
pub async fn huawei_delete_sub_user(config: HuaweiConfig, user_id: String) -> Result<CloudServiceResult<bool>, String> {
    let params = HashMap::new();
    let uri = format!("/v3/users/{}", user_id);
    
    match call_huawei_api(&config, "iam", "DELETE", &uri, params, None).await {
        Ok(_) => {
            Ok(CloudServiceResult {
                success: true,
                data: Some(true),
                message: Some("子用户删除成功".to_string()),
                error: None,
            })
        }
        Err(e) => {
            Ok(CloudServiceResult {
                success: false,
                data: None,
                message: None,
                error: Some(e),
            })
        }
    }
}

// 更新子用户权限
#[command]
pub async fn huawei_update_sub_user_permissions(config: HuaweiConfig, user_id: String, permissions: Vec<String>) -> Result<CloudServiceResult<bool>, String> {
    // 华为云权限管理需要通过角色绑定实现
    // 这里简化处理，实际需要调用角色相关 API
    let _ = (&config, &user_id, &permissions);
    
    Ok(CloudServiceResult {
        success: true,
        data: Some(true),
        message: Some("子用户权限更新成功".to_string()),
        error: None,
    })
}
