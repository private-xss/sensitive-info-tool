use serde::{Deserialize, Serialize};
use tauri::command;
use std::collections::HashMap;
use chrono::Utc;
use reqwest::Client;
use sha1::Sha1;
use hmac::{Hmac, Mac};
use base64::{Engine as _, engine::general_purpose};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TencentConfig {
    pub secret_id: String,
    pub secret_key: String,
    pub region: String,
    pub endpoint: Option<String>,
    pub session_token: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RemoteCommandParams {
    pub instance_id: String,
    pub command: String,
    pub working_directory: Option<String>,
    pub timeout: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CommandResult {
    pub instance_id: String,
    pub command: String,
    pub output: String,
    pub error: String,
    pub exit_code: i32,
    pub execution_time: u64,
    pub timestamp: String,
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

// 腾讯云API响应结构
#[derive(Debug, Deserialize)]
pub struct TencentApiResponse {
    pub Response: serde_json::Value,
}

// 腾讯云用户信息
#[derive(Debug, Deserialize)]
pub struct TencentUser {
    pub Uin: String,
    pub Name: String,
    pub DisplayName: String,
    pub Email: Option<String>,
    pub Status: String,
    pub CreateTime: String,
    pub LastLoginTime: Option<String>,
}

// 腾讯云API签名函数
fn generate_tencent_signature(
    secret_key: &str,
    method: &str,
    uri: &str,
    params: &HashMap<String, String>,
) -> String {
    // 1. 构建查询字符串
    let mut sorted_params: Vec<_> = params.iter().collect();
    sorted_params.sort_by(|a, b| a.0.cmp(b.0));
    
    let query_string = sorted_params
        .iter()
        .map(|(k, v)| format!("{}={}", urlencoding::encode(k), urlencoding::encode(v)))
        .collect::<Vec<_>>()
        .join("&");
    
    // 2. 构建签名字符串
    let string_to_sign = format!("{}&{}&{}", method, urlencoding::encode(uri), urlencoding::encode(&query_string));
    
    // 3. 计算HMAC-SHA1签名
    let mut hmac = Hmac::<Sha1>::new_from_slice(secret_key.as_bytes())
        .expect("HMAC can take key of any size");
    hmac.update(string_to_sign.as_bytes());
    let signature = hmac.finalize();
    
    // 4. Base64编码
    general_purpose::STANDARD.encode(signature.into_bytes())
}

// 腾讯云API调用函数
async fn call_tencent_api(
    config: &TencentConfig,
    action: &str,
    params: HashMap<String, String>,
) -> Result<TencentApiResponse, String> {
    let client = Client::new();
    let endpoint = format!("https://{}.tencentcloudapi.com", config.region);
    
    // 构建请求参数
    let mut request_params = params;
    request_params.insert("Action".to_string(), action.to_string());
    request_params.insert("Version".to_string(), "2018-05-22".to_string());
    request_params.insert("SecretId".to_string(), config.secret_id.clone());
    request_params.insert("Timestamp".to_string(), (SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs()).to_string());
    request_params.insert("Nonce".to_string(), uuid::Uuid::new_v4().to_string());
    request_params.insert("Region".to_string(), config.region.clone());
    
    // 生成签名
    let signature = generate_tencent_signature(&config.secret_key, "POST", "/", &request_params);
    request_params.insert("Signature".to_string(), signature);
    
    // 发送请求
    let response = client
        .post(&endpoint)
        .form(&request_params)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("API调用失败，状态码: {}", response.status()));
    }
    
    let response_text = response.text().await.map_err(|e| format!("读取响应失败: {}", e))?;
    let api_response: TencentApiResponse = serde_json::from_str(&response_text)
        .map_err(|e| format!("解析响应失败: {}", e))?;
    
    Ok(api_response)
}

// 腾讯云控制台接管
#[command]
pub async fn tencent_take_over_console(config: TencentConfig) -> Result<CloudServiceResult<bool>, String> {
    // 调用腾讯云CAM API获取当前用户信息，验证权限
    let params = HashMap::new();
    
    match call_tencent_api(&config, "GetUser", params).await {
        Ok(response) => {
            if response.Response.get("Error").is_none() {
                Ok(CloudServiceResult {
                    success: true,
                    data: Some(true),
                    message: Some("腾讯云控制台接管成功".to_string()),
                    error: None,
                })
            } else {
                let error_msg = response.Response.get("Error")
                    .and_then(|e| e.get("Message").and_then(|m| m.as_str()))
                    .unwrap_or("API调用失败");
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
pub async fn tencent_cancel_console_takeover(_config: TencentConfig) -> Result<CloudServiceResult<bool>, String> {
    // 模拟取消控制台接管逻辑
    
    tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
    
    Ok(CloudServiceResult {
        success: true,
        data: Some(true),
        message: Some("腾讯云控制台接管已取消".to_string()),
        error: None,
    })
}

// 远程命令执行
#[command]
pub async fn tencent_execute_remote_command(_config: TencentConfig, params: RemoteCommandParams) -> Result<CloudServiceResult<CommandResult>, String> {
    // 模拟远程命令执行
    // 在实际实现中，这里会调用腾讯云的CVM API来执行远程命令
    
    let start_time = std::time::Instant::now();
    
    tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
    
    let execution_time = start_time.elapsed().as_millis() as u64;
    
    let result = CommandResult {
        instance_id: params.instance_id.clone(),
        command: params.command.clone(),
        output: format!("腾讯云命令执行成功: {}", params.command),
        error: String::new(),
        exit_code: 0,
        execution_time,
        timestamp: Utc::now().to_rfc3339(),
    };
    
    Ok(CloudServiceResult {
        success: true,
        data: Some(result),
        message: Some("远程命令执行成功".to_string()),
        error: None,
    })
}

// 获取子用户列表
#[command]
pub async fn tencent_get_sub_users(config: TencentConfig) -> Result<CloudServiceResult<Vec<SubUser>>, String> {
    // 调用腾讯云CAM API获取子用户列表
    let params = HashMap::new();
    
    match call_tencent_api(&config, "ListUsers", params).await {
        Ok(response) => {
            if response.Response.get("Error").is_none() {
                let mut users = Vec::new();
                
                if let Some(users_array) = response.Response.get("Data").and_then(|d| d.get("Items")).and_then(|i| i.as_array()) {
                    for user_data in users_array {
                        let user = SubUser {
                            id: user_data.get("Uin")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            username: user_data.get("Name")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            display_name: user_data.get("DisplayName")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            email: user_data.get("Email")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            status: user_data.get("Status")
                                .and_then(|v| v.as_str())
                                .unwrap_or("Unknown")
                                .to_string(),
                            permissions: vec![], // 需要额外调用获取权限
                            created_at: user_data.get("CreateTime")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            last_login: user_data.get("LastLoginTime")
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
                let error_msg = response.Response.get("Error")
                    .and_then(|e| e.get("Message").and_then(|m| m.as_str()))
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
pub async fn tencent_create_sub_user(config: TencentConfig, user_data: HashMap<String, serde_json::Value>) -> Result<CloudServiceResult<SubUser>, String> {
    // 调用腾讯云CAM API创建子用户
    let mut params = HashMap::new();
    params.insert("Name".to_string(), 
        user_data.get("username").and_then(|v| v.as_str()).unwrap_or("new_tencent_user").to_string());
    params.insert("DisplayName".to_string(), 
        user_data.get("display_name").and_then(|v| v.as_str()).unwrap_or("新腾讯云用户").to_string());
    
    if let Some(email) = user_data.get("email").and_then(|v| v.as_str()) {
        params.insert("Email".to_string(), email.to_string());
    }
    
    match call_tencent_api(&config, "CreateUser", params).await {
        Ok(response) => {
            if response.Response.get("Error").is_none() {
                let user = SubUser {
                    id: response.Response.get("Data")
                        .and_then(|d| d.get("Uin").and_then(|v| v.as_str()))
                        .unwrap_or("")
                        .to_string(),
                    username: user_data.get("username").and_then(|v| v.as_str()).unwrap_or("new_tencent_user").to_string(),
                    display_name: user_data.get("display_name").and_then(|v| v.as_str()).unwrap_or("新腾讯云用户").to_string(),
                    email: user_data.get("email").and_then(|v| v.as_str()).map(|s| s.to_string()),
                    status: "Active".to_string(),
                    permissions: vec!["QcloudCVMReadOnlyAccess".to_string()],
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
                let error_msg = response.Response.get("Error")
                    .and_then(|e| e.get("Message").and_then(|m| m.as_str()))
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
pub async fn tencent_delete_sub_user(config: TencentConfig, user_id: String) -> Result<CloudServiceResult<bool>, String> {
    // 调用腾讯云CAM API删除子用户
    let mut params = HashMap::new();
    params.insert("Uin".to_string(), user_id.clone());
    
    match call_tencent_api(&config, "DeleteUser", params).await {
        Ok(response) => {
            if response.Response.get("Error").is_none() {
                Ok(CloudServiceResult {
                    success: true,
                    data: Some(true),
                    message: Some("子用户删除成功".to_string()),
                    error: None,
                })
            } else {
                let error_msg = response.Response.get("Error")
                    .and_then(|e| e.get("Message").and_then(|m| m.as_str()))
                    .unwrap_or("删除子用户失败");
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

// 更新子用户权限
#[command]
pub async fn tencent_update_sub_user_permissions(config: TencentConfig, user_id: String, permissions: Vec<String>) -> Result<CloudServiceResult<bool>, String> {
    // 调用腾讯云CAM API更新子用户权限
    let mut params = HashMap::new();
    params.insert("Uin".to_string(), user_id.clone());
    
    // 构建权限策略列表
    let policy_list: Vec<String> = permissions.into_iter().collect();
    params.insert("PolicyList".to_string(), serde_json::to_string(&policy_list).unwrap_or_else(|_| "[]".to_string()));
    
    match call_tencent_api(&config, "AttachUserPolicies", params).await {
        Ok(response) => {
            if response.Response.get("Error").is_none() {
                Ok(CloudServiceResult {
                    success: true,
                    data: Some(true),
                    message: Some("子用户权限更新成功".to_string()),
                    error: None,
                })
            } else {
                let error_msg = response.Response.get("Error")
                    .and_then(|e| e.get("Message").and_then(|m| m.as_str()))
                    .unwrap_or("更新子用户权限失败");
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
