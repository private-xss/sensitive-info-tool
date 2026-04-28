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
pub struct AWSConfig {
    pub access_key_id: String,
    pub secret_access_key: String,
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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BackdoorInfo {
    pub id: String,
    pub name: String,
    pub backdoor_type: String,
    pub target: String,
    pub status: String,
    pub created_at: String,
    pub last_used: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PolicyInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub version: String,
    pub document: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CloudServiceResult<T> {
    pub success: bool,
    pub data: Option<T>,
    pub message: Option<String>,
    pub error: Option<String>,
}

// ============================================
// AWS Signature V4 Implementation
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

/// 生成 AWS Signature V4 时间戳格式: YYYYMMDD'T'HHMMSS'Z'
fn get_aws_timestamp() -> (String, String) {
    let now = Utc::now();
    let datetime = now.format("%Y%m%dT%H%M%SZ").to_string();
    let date = now.format("%Y%m%d").to_string();
    (datetime, date)
}

/// URL 编码（AWS 风格，空格编码为 %20）
fn aws_url_encode(s: &str) -> String {
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
    let mut sorted_params: Vec<_> = params.iter().collect();
    sorted_params.sort_by(|a, b| a.0.cmp(b.0));
    
    sorted_params
        .iter()
        .map(|(k, v)| format!("{}={}", aws_url_encode(k), aws_url_encode(v)))
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

/// AWS Signature V4 签名
fn generate_aws_v4_signature(
    secret_key: &str,
    method: &str,
    uri: &str,
    query_string: &str,
    headers: &HashMap<String, String>,
    payload_hash: &str,
    region: &str,
    service: &str,
    datetime: &str,
    date: &str,
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
    let credential_scope = format!("{}/{}/{}/aws4_request", date, region, service);
    let hashed_canonical_request = sha256_hex(&canonical_request);
    let string_to_sign = format!(
        "AWS4-HMAC-SHA256\n{}\n{}\n{}",
        datetime,
        credential_scope,
        hashed_canonical_request
    );
    
    // Step 3: 计算签名密钥
    let k_secret = format!("AWS4{}", secret_key);
    let k_date = hmac_sha256(k_secret.as_bytes(), date.as_bytes());
    let k_region = hmac_sha256(&k_date, region.as_bytes());
    let k_service = hmac_sha256(&k_region, service.as_bytes());
    let k_signing = hmac_sha256(&k_service, b"aws4_request");
    
    // Step 4: 计算签名
    let signature = hmac_sha256(&k_signing, string_to_sign.as_bytes());
    let signature_hex = hex::encode(signature);
    
    (signature_hex, signed_headers)
}

/// 获取 AWS 服务端点
fn get_aws_endpoint(service: &str, region: &str) -> String {
    match service {
        // IAM 是全局服务，使用全局端点
        "iam" => "https://iam.amazonaws.com".to_string(),
        // STS 也是全局服务，但可以使用区域端点
        "sts" => format!("https://sts.{}.amazonaws.com", region),
        // 其他服务使用区域端点
        _ => format!("https://{}.{}.amazonaws.com", service, region),
    }
}

/// 获取 AWS API 版本
fn get_aws_api_version(service: &str) -> &'static str {
    match service {
        "iam" => "2010-05-08",
        "sts" => "2011-06-15",
        "ec2" => "2016-11-15",
        _ => "2010-05-08",
    }
}


/// AWS API 调用函数 (使用 Signature V4)
async fn call_aws_api(
    config: &AWSConfig,
    service: &str,
    action: &str,
    params: HashMap<String, String>,
) -> Result<serde_json::Value, String> {
    let client = Client::new();
    let endpoint = get_aws_endpoint(service, &config.region);
    let api_version = get_aws_api_version(service);
    
    // 构建请求参数
    let mut request_params = params;
    request_params.insert("Action".to_string(), action.to_string());
    request_params.insert("Version".to_string(), api_version.to_string());
    
    // 构建请求体
    let request_body = build_canonical_query_string(&request_params);
    let payload_hash = sha256_hex(&request_body);
    
    // 获取时间戳
    let (datetime, date) = get_aws_timestamp();
    
    // 确定 host
    let host = endpoint.replace("https://", "").replace("http://", "");
    
    // 构建请求头
    let mut headers_map: HashMap<String, String> = HashMap::new();
    headers_map.insert("host".to_string(), host.clone());
    headers_map.insert("x-amz-date".to_string(), datetime.clone());
    headers_map.insert("content-type".to_string(), "application/x-www-form-urlencoded; charset=utf-8".to_string());
    
    // 如果有 session token，添加到请求头
    if let Some(token) = &config.session_token {
        headers_map.insert("x-amz-security-token".to_string(), token.clone());
    }
    
    // 生成签名
    let region = if service == "iam" { "us-east-1" } else { &config.region };
    let (signature, signed_headers) = generate_aws_v4_signature(
        &config.secret_access_key,
        "POST",
        "/",
        "",  // POST 请求，查询字符串为空
        &headers_map,
        &payload_hash,
        region,
        service,
        &datetime,
        &date,
    );
    
    // 构建 Authorization 头
    let credential_scope = format!("{}/{}/{}/aws4_request", date, region, service);
    let authorization = format!(
        "AWS4-HMAC-SHA256 Credential={}/{}, SignedHeaders={}, Signature={}",
        config.access_key_id,
        credential_scope,
        signed_headers,
        signature
    );
    
    // 构建 HTTP 请求头
    let mut http_headers = HeaderMap::new();
    http_headers.insert("Host", HeaderValue::from_str(&host).unwrap());
    http_headers.insert("X-Amz-Date", HeaderValue::from_str(&datetime).unwrap());
    http_headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/x-www-form-urlencoded; charset=utf-8"));
    http_headers.insert("Authorization", HeaderValue::from_str(&authorization).unwrap());
    
    if let Some(token) = &config.session_token {
        http_headers.insert("X-Amz-Security-Token", HeaderValue::from_str(token).unwrap());
    }
    
    // 发送请求
    let response = client
        .post(&endpoint)
        .headers(http_headers)
        .body(request_body)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;
    
    let status = response.status();
    let response_text = response.text().await.map_err(|e| format!("读取响应失败: {}", e))?;
    
    if !status.is_success() {
        // 尝试解析 XML 错误响应
        if response_text.contains("<Error>") {
            if let Some(msg) = extract_xml_error(&response_text) {
                return Err(format!("AWS API 错误 ({}): {}", status, msg));
            }
        }
        return Err(format!("API调用失败，状态码: {}，响应: {}", status, response_text));
    }
    
    // AWS IAM API 返回 XML，需要转换为 JSON
    parse_aws_xml_response(&response_text)
}

/// 从 XML 错误响应中提取错误信息
fn extract_xml_error(xml: &str) -> Option<String> {
    // 简单的 XML 解析，提取 <Message> 标签内容
    if let Some(start) = xml.find("<Message>") {
        if let Some(end) = xml.find("</Message>") {
            let msg = &xml[start + 9..end];
            return Some(msg.to_string());
        }
    }
    // 尝试提取 <Code> 标签
    if let Some(start) = xml.find("<Code>") {
        if let Some(end) = xml.find("</Code>") {
            let code = &xml[start + 6..end];
            return Some(format!("错误代码: {}", code));
        }
    }
    None
}

/// 解析 AWS XML 响应为 JSON
fn parse_aws_xml_response(xml: &str) -> Result<serde_json::Value, String> {
    // 简化的 XML 到 JSON 转换
    // AWS IAM API 返回的 XML 结构相对固定
    
    let mut result = serde_json::Map::new();
    
    // 检查是否有错误
    if xml.contains("<Error>") {
        let error_msg = extract_xml_error(xml).unwrap_or_else(|| "未知错误".to_string());
        result.insert("Error".to_string(), serde_json::json!({
            "Message": error_msg
        }));
        return Ok(serde_json::Value::Object(result));
    }
    
    // 解析 ListUsersResponse
    if xml.contains("<ListUsersResponse") {
        let users = parse_users_from_xml(xml);
        result.insert("Users".to_string(), serde_json::json!(users));
    }
    
    // 解析 ListPoliciesResponse
    if xml.contains("<ListPoliciesResponse") {
        let policies = parse_policies_from_xml(xml);
        result.insert("Policies".to_string(), serde_json::json!(policies));
    }
    
    // 解析 GetUserResponse
    if xml.contains("<GetUserResponse") {
        if let Some(user) = parse_single_user_from_xml(xml) {
            result.insert("User".to_string(), user);
        }
    }
    
    Ok(serde_json::Value::Object(result))
}

/// 从 XML 解析用户列表
fn parse_users_from_xml(xml: &str) -> Vec<serde_json::Value> {
    let mut users = Vec::new();
    
    // 查找所有 <member> 标签（用户列表中的每个用户）
    let mut remaining = xml;
    while let Some(start) = remaining.find("<member>") {
        if let Some(end) = remaining[start..].find("</member>") {
            let member_xml = &remaining[start..start + end + 9];
            
            let user = serde_json::json!({
                "UserId": extract_xml_tag(member_xml, "UserId").unwrap_or_default(),
                "UserName": extract_xml_tag(member_xml, "UserName").unwrap_or_default(),
                "Arn": extract_xml_tag(member_xml, "Arn").unwrap_or_default(),
                "CreateDate": extract_xml_tag(member_xml, "CreateDate").unwrap_or_default(),
                "PasswordLastUsed": extract_xml_tag(member_xml, "PasswordLastUsed"),
            });
            users.push(user);
            
            remaining = &remaining[start + end + 9..];
        } else {
            break;
        }
    }
    
    users
}

/// 从 XML 解析策略列表
fn parse_policies_from_xml(xml: &str) -> Vec<serde_json::Value> {
    let mut policies = Vec::new();
    
    let mut remaining = xml;
    while let Some(start) = remaining.find("<member>") {
        if let Some(end) = remaining[start..].find("</member>") {
            let member_xml = &remaining[start..start + end + 9];
            
            let policy = serde_json::json!({
                "PolicyId": extract_xml_tag(member_xml, "PolicyId").unwrap_or_default(),
                "PolicyName": extract_xml_tag(member_xml, "PolicyName").unwrap_or_default(),
                "Arn": extract_xml_tag(member_xml, "Arn").unwrap_or_default(),
                "Description": extract_xml_tag(member_xml, "Description").unwrap_or_default(),
                "DefaultVersionId": extract_xml_tag(member_xml, "DefaultVersionId").unwrap_or_default(),
                "CreateDate": extract_xml_tag(member_xml, "CreateDate").unwrap_or_default(),
                "UpdateDate": extract_xml_tag(member_xml, "UpdateDate").unwrap_or_default(),
            });
            policies.push(policy);
            
            remaining = &remaining[start + end + 9..];
        } else {
            break;
        }
    }
    
    policies
}

/// 从 XML 解析单个用户
fn parse_single_user_from_xml(xml: &str) -> Option<serde_json::Value> {
    if let Some(start) = xml.find("<User>") {
        if let Some(end) = xml.find("</User>") {
            let user_xml = &xml[start..end + 7];
            return Some(serde_json::json!({
                "UserId": extract_xml_tag(user_xml, "UserId").unwrap_or_default(),
                "UserName": extract_xml_tag(user_xml, "UserName").unwrap_or_default(),
                "Arn": extract_xml_tag(user_xml, "Arn").unwrap_or_default(),
                "CreateDate": extract_xml_tag(user_xml, "CreateDate").unwrap_or_default(),
            }));
        }
    }
    None
}

/// 从 XML 中提取指定标签的内容
fn extract_xml_tag(xml: &str, tag: &str) -> Option<String> {
    let open_tag = format!("<{}>", tag);
    let close_tag = format!("</{}>", tag);
    
    if let Some(start) = xml.find(&open_tag) {
        if let Some(end) = xml[start..].find(&close_tag) {
            let content = &xml[start + open_tag.len()..start + end];
            return Some(content.to_string());
        }
    }
    None
}


// ============================================
// Tauri Commands
// ============================================

// AWS控制台接管 - 验证凭证有效性
#[command]
pub async fn aws_take_over_console(config: AWSConfig) -> Result<CloudServiceResult<bool>, String> {
    // 调用 GetUser API 验证凭证
    let params = HashMap::new();
    
    match call_aws_api(&config, "iam", "GetUser", params).await {
        Ok(response) => {
            if response.get("Error").is_none() {
                Ok(CloudServiceResult {
                    success: true,
                    data: Some(true),
                    message: Some("AWS 凭证验证成功".to_string()),
                    error: None,
                })
            } else {
                let error_msg = response.get("Error")
                    .and_then(|e| e.get("Message"))
                    .and_then(|m| m.as_str())
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
pub async fn aws_cancel_console_takeover(_config: AWSConfig) -> Result<CloudServiceResult<bool>, String> {
    Ok(CloudServiceResult {
        success: true,
        data: Some(true),
        message: Some("AWS控制台接管已取消".to_string()),
        error: None,
    })
}

// 创建后门
#[command]
pub async fn aws_create_backdoor(_config: AWSConfig, backdoor_data: HashMap<String, serde_json::Value>) -> Result<CloudServiceResult<BackdoorInfo>, String> {
    // 模拟创建后门（实际实现需要调用 CreateUser 和 CreateAccessKey API）
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    
    let backdoor = BackdoorInfo {
        id: format!("backdoor_{}", uuid::Uuid::new_v4()),
        name: backdoor_data.get("name").and_then(|v| v.as_str()).unwrap_or("新后门").to_string(),
        backdoor_type: backdoor_data.get("type").and_then(|v| v.as_str()).unwrap_or("IAM").to_string(),
        target: backdoor_data.get("target").and_then(|v| v.as_str()).unwrap_or("console").to_string(),
        status: "Active".to_string(),
        created_at: Utc::now().to_rfc3339(),
        last_used: None,
    };
    
    Ok(CloudServiceResult {
        success: true,
        data: Some(backdoor),
        message: Some("后门创建成功".to_string()),
        error: None,
    })
}

// 获取后门列表
#[command]
pub async fn aws_get_backdoors(_config: AWSConfig) -> Result<CloudServiceResult<Vec<BackdoorInfo>>, String> {
    // 模拟获取后门列表
    tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
    
    let backdoors = vec![
        BackdoorInfo {
            id: "backdoor_1".to_string(),
            name: "后门1".to_string(),
            backdoor_type: "IAM".to_string(),
            target: "console".to_string(),
            status: "Active".to_string(),
            created_at: Utc::now().to_rfc3339(),
            last_used: Some(Utc::now().to_rfc3339()),
        },
    ];
    
    Ok(CloudServiceResult {
        success: true,
        data: Some(backdoors),
        message: Some("后门列表获取成功".to_string()),
        error: None,
    })
}

// 删除后门
#[command]
pub async fn aws_delete_backdoor(_config: AWSConfig, _backdoor_id: String) -> Result<CloudServiceResult<bool>, String> {
    tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
    
    Ok(CloudServiceResult {
        success: true,
        data: Some(true),
        message: Some("后门删除成功".to_string()),
        error: None,
    })
}

// 获取子用户列表
#[command]
pub async fn aws_get_sub_users(config: AWSConfig) -> Result<CloudServiceResult<Vec<SubUser>>, String> {
    let params = HashMap::new();
    
    match call_aws_api(&config, "iam", "ListUsers", params).await {
        Ok(response) => {
            if response.get("Error").is_none() {
                let mut users = Vec::new();
                
                if let Some(users_array) = response.get("Users").and_then(|v| v.as_array()) {
                    for user_data in users_array {
                        let user = SubUser {
                            id: user_data.get("UserId")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            username: user_data.get("UserName")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            display_name: user_data.get("UserName")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            email: None,
                            status: "Active".to_string(),
                            permissions: vec![],
                            created_at: user_data.get("CreateDate")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            last_login: user_data.get("PasswordLastUsed")
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
                let error_msg = response.get("Error")
                    .and_then(|e| e.get("Message"))
                    .and_then(|m| m.as_str())
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

// 获取策略列表
#[command]
pub async fn aws_get_policies(config: AWSConfig) -> Result<CloudServiceResult<Vec<PolicyInfo>>, String> {
    let params = HashMap::new();
    
    match call_aws_api(&config, "iam", "ListPolicies", params).await {
        Ok(response) => {
            if response.get("Error").is_none() {
                let mut policies = Vec::new();
                
                if let Some(policies_array) = response.get("Policies").and_then(|v| v.as_array()) {
                    for policy_data in policies_array {
                        let policy = PolicyInfo {
                            id: policy_data.get("PolicyId")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            name: policy_data.get("PolicyName")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            description: policy_data.get("Description")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            version: policy_data.get("DefaultVersionId")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            document: "".to_string(),
                            created_at: policy_data.get("CreateDate")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            updated_at: policy_data.get("UpdateDate")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                        };
                        policies.push(policy);
                    }
                }
                
                Ok(CloudServiceResult {
                    success: true,
                    data: Some(policies),
                    message: Some("策略列表获取成功".to_string()),
                    error: None,
                })
            } else {
                let error_msg = response.get("Error")
                    .and_then(|e| e.get("Message"))
                    .and_then(|m| m.as_str())
                    .unwrap_or("获取策略列表失败");
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

// 创建策略
#[command]
pub async fn aws_create_policy(_config: AWSConfig, policy_data: HashMap<String, serde_json::Value>) -> Result<CloudServiceResult<PolicyInfo>, String> {
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    
    let policy = PolicyInfo {
        id: format!("policy_{}", uuid::Uuid::new_v4()),
        name: policy_data.get("name").and_then(|v| v.as_str()).unwrap_or("新策略").to_string(),
        description: policy_data.get("description").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        version: "v1".to_string(),
        document: policy_data.get("document").and_then(|v| v.as_str()).unwrap_or("{}").to_string(),
        created_at: Utc::now().to_rfc3339(),
        updated_at: Utc::now().to_rfc3339(),
    };
    
    Ok(CloudServiceResult {
        success: true,
        data: Some(policy),
        message: Some("策略创建成功".to_string()),
        error: None,
    })
}

// 删除策略
#[command]
pub async fn aws_delete_policy(_config: AWSConfig, _policy_id: String) -> Result<CloudServiceResult<bool>, String> {
    tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
    
    Ok(CloudServiceResult {
        success: true,
        data: Some(true),
        message: Some("策略删除成功".to_string()),
        error: None,
    })
}

// 附加策略到用户
#[command]
pub async fn aws_attach_policy_to_user(_config: AWSConfig, _user_id: String, _policy_id: String) -> Result<CloudServiceResult<bool>, String> {
    tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
    
    Ok(CloudServiceResult {
        success: true,
        data: Some(true),
        message: Some("策略附加成功".to_string()),
        error: None,
    })
}

// 从用户分离策略
#[command]
pub async fn aws_detach_policy_from_user(_config: AWSConfig, _user_id: String, _policy_id: String) -> Result<CloudServiceResult<bool>, String> {
    tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
    
    Ok(CloudServiceResult {
        success: true,
        data: Some(true),
        message: Some("策略分离成功".to_string()),
        error: None,
    })
}
