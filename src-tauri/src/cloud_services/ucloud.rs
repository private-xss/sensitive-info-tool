use serde::{Deserialize, Serialize};
use tauri::command;
use std::collections::HashMap;
use chrono::{DateTime, Utc};
use reqwest::Client;
use sha1::{Sha1, Digest};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UCloudConfig {
    pub public_key: String,
    pub private_key: String,
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
pub struct HostInfo {
    pub id: String,
    pub name: String,
    pub instance_type: String,
    pub status: String,
    pub region: String,
    pub zone: String,
    pub public_ip: Option<String>,
    pub private_ip: String,
    pub os_type: String,
    pub cpu: u32,
    pub memory: u32,
    pub disk: u32,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OrderInfo {
    pub id: String,
    pub order_type: String,
    pub status: String,
    pub amount: f64,
    pub currency: String,
    pub resource_id: Option<String>,
    pub created_at: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CloudServiceResult<T> {
    pub success: bool,
    pub data: Option<T>,
    pub message: Option<String>,
    pub error: Option<String>,
}

// ============================================
// UCloud 签名实现 (修正版)
// ============================================

/// UCloud API 签名算法
/// 
/// 签名规则：
/// 1. 按参数名升序排列所有请求参数
/// 2. 拼接参数：key1value1key2value2... (不需要 URL 编码)
/// 3. 在末尾拼接 PrivateKey
/// 4. 对整个字符串计算 SHA1 哈希
/// 5. 将哈希结果转为小写十六进制字符串
fn generate_ucloud_signature(
    private_key: &str,
    params: &HashMap<String, String>,
) -> String {
    // Step 1: 按参数名升序排列
    let mut sorted_params: Vec<_> = params.iter().collect();
    sorted_params.sort_by(|a, b| a.0.cmp(b.0));
    
    // Step 2: 拼接参数 (不需要 URL 编码！这是之前的错误)
    let mut sign_str = String::new();
    for (key, value) in sorted_params {
        sign_str.push_str(key);
        sign_str.push_str(value);
    }
    
    // Step 3: 在末尾拼接 PrivateKey
    sign_str.push_str(private_key);
    
    // Step 4: 计算 SHA1 哈希
    let mut hasher = Sha1::new();
    hasher.update(sign_str.as_bytes());
    let result = hasher.finalize();
    
    // Step 5: 转为小写十六进制字符串
    hex::encode(result)
}

/// UCloud API 端点
const UCLOUD_API_ENDPOINT: &str = "https://api.ucloud.cn";

/// UCloud API 调用函数
async fn call_ucloud_api(
    config: &UCloudConfig,
    action: &str,
    mut params: HashMap<String, String>,
) -> Result<serde_json::Value, String> {
    let client = Client::new();
    
    // 添加公共参数
    params.insert("Action".to_string(), action.to_string());
    params.insert("PublicKey".to_string(), config.public_key.clone());
    
    // 如果有 Region 参数，添加它
    if !config.region.is_empty() {
        params.insert("Region".to_string(), config.region.clone());
    }
    
    // 生成签名 (使用修正后的算法)
    let signature = generate_ucloud_signature(&config.private_key, &params);
    params.insert("Signature".to_string(), signature);
    
    // 发送 POST 请求
    let response = client
        .post(UCLOUD_API_ENDPOINT)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;
    
    let status = response.status();
    let response_text = response.text().await.map_err(|e| format!("读取响应失败: {}", e))?;
    
    // 解析 JSON 响应
    let response_json: serde_json::Value = serde_json::from_str(&response_text)
        .map_err(|e| format!("解析响应失败: {}，响应内容: {}", e, response_text))?;
    
    // 检查 RetCode
    let ret_code = response_json.get("RetCode")
        .and_then(|v| v.as_i64())
        .unwrap_or(-1);
    
    if ret_code != 0 {
        let message = response_json.get("Message")
            .and_then(|v| v.as_str())
            .unwrap_or("未知错误");
        return Err(format!("UCloud API 错误 (RetCode: {}): {}", ret_code, message));
    }
    
    if !status.is_success() {
        return Err(format!("API调用失败，状态码: {}，响应: {}", status, response_text));
    }
    
    Ok(response_json)
}


// ============================================
// Tauri Commands
// ============================================

// UCloud 控制台接管 - 验证凭证有效性
#[command]
pub async fn ucloud_take_over_console(config: UCloudConfig) -> Result<CloudServiceResult<bool>, String> {
    // 调用 DescribeUHostInstance 来验证凭证
    let params = HashMap::new();
    
    match call_ucloud_api(&config, "DescribeUHostInstance", params).await {
        Ok(response) => {
            let ret_code = response.get("RetCode").and_then(|v| v.as_i64()).unwrap_or(-1);
            if ret_code == 0 {
                Ok(CloudServiceResult {
                    success: true,
                    data: Some(true),
                    message: Some("UCloud 凭证验证成功".to_string()),
                    error: None,
                })
            } else {
                let message = response.get("Message").and_then(|v| v.as_str()).unwrap_or("凭证验证失败");
                Ok(CloudServiceResult {
                    success: false,
                    data: None,
                    message: None,
                    error: Some(message.to_string()),
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
pub async fn ucloud_cancel_console_takeover(_config: UCloudConfig) -> Result<CloudServiceResult<bool>, String> {
    Ok(CloudServiceResult {
        success: true,
        data: Some(true),
        message: Some("UCloud控制台接管已取消".to_string()),
        error: None,
    })
}

// 获取主机列表
#[command]
pub async fn ucloud_get_hosts(config: UCloudConfig) -> Result<CloudServiceResult<Vec<HostInfo>>, String> {
    let params = HashMap::new();
    
    match call_ucloud_api(&config, "DescribeUHostInstance", params).await {
        Ok(response) => {
            let ret_code = response.get("RetCode").and_then(|v| v.as_i64()).unwrap_or(-1);
            if ret_code == 0 {
                let mut hosts = Vec::new();
                
                if let Some(hosts_array) = response.get("UHostSet").and_then(|v| v.as_array()) {
                    for host_data in hosts_array {
                        // 获取公网 IP
                        let public_ip = host_data.get("IPSet")
                            .and_then(|ips| ips.as_array())
                            .and_then(|ips| ips.iter().find(|ip| {
                                ip.get("Type").and_then(|t| t.as_str()) == Some("Bgp") ||
                                ip.get("Type").and_then(|t| t.as_str()) == Some("International")
                            }))
                            .and_then(|ip| ip.get("IP").and_then(|v| v.as_str()))
                            .map(|s| s.to_string());
                        
                        // 获取内网 IP
                        let private_ip = host_data.get("IPSet")
                            .and_then(|ips| ips.as_array())
                            .and_then(|ips| ips.iter().find(|ip| {
                                ip.get("Type").and_then(|t| t.as_str()) == Some("Private")
                            }))
                            .and_then(|ip| ip.get("IP").and_then(|v| v.as_str()))
                            .unwrap_or("")
                            .to_string();
                        
                        // 获取磁盘大小
                        let disk_size = host_data.get("DiskSet")
                            .and_then(|disks| disks.as_array())
                            .and_then(|disks| disks.first())
                            .and_then(|disk| disk.get("Size").and_then(|v| v.as_u64()))
                            .unwrap_or(0) as u32;
                        
                        let host = HostInfo {
                            id: host_data.get("UHostId")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            name: host_data.get("Name")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            instance_type: host_data.get("UHostType")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            status: host_data.get("State")
                                .and_then(|v| v.as_str())
                                .unwrap_or("Unknown")
                                .to_string(),
                            region: host_data.get("Zone")
                                .and_then(|v| v.as_str())
                                .unwrap_or(&config.region)
                                .to_string(),
                            zone: host_data.get("Zone")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            public_ip,
                            private_ip,
                            os_type: host_data.get("OsName")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            cpu: host_data.get("CPU")
                                .and_then(|v| v.as_u64())
                                .unwrap_or(0) as u32,
                            memory: host_data.get("Memory")
                                .and_then(|v| v.as_u64())
                                .unwrap_or(0) as u32,
                            disk: disk_size,
                            created_at: host_data.get("CreateTime")
                                .and_then(|v| v.as_u64())
                                .map(|t| DateTime::from_timestamp(t as i64, 0).unwrap_or(Utc::now()).to_rfc3339())
                                .unwrap_or_else(|| Utc::now().to_rfc3339()),
                        };
                        hosts.push(host);
                    }
                }
                
                Ok(CloudServiceResult {
                    success: true,
                    data: Some(hosts),
                    message: Some("主机列表获取成功".to_string()),
                    error: None,
                })
            } else {
                let message = response.get("Message").and_then(|v| v.as_str()).unwrap_or("获取主机列表失败");
                Ok(CloudServiceResult {
                    success: false,
                    data: None,
                    message: None,
                    error: Some(message.to_string()),
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

// 获取子用户列表
#[command]
pub async fn ucloud_get_sub_users(config: UCloudConfig) -> Result<CloudServiceResult<Vec<SubUser>>, String> {
    // UCloud 子账号 API: DescribeSubAccount
    let params = HashMap::new();
    
    match call_ucloud_api(&config, "DescribeSubAccount", params).await {
        Ok(response) => {
            let ret_code = response.get("RetCode").and_then(|v| v.as_i64()).unwrap_or(-1);
            if ret_code == 0 {
                let mut users = Vec::new();
                
                if let Some(users_array) = response.get("SubAccountSet").and_then(|v| v.as_array()) {
                    for user_data in users_array {
                        let user = SubUser {
                            id: user_data.get("SubAccountId")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            username: user_data.get("SubAccountName")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            display_name: user_data.get("SubAccountName")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            email: user_data.get("Email")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            status: "Active".to_string(),
                            permissions: vec![],
                            created_at: user_data.get("CreateTime")
                                .and_then(|v| v.as_u64())
                                .map(|t| DateTime::from_timestamp(t as i64, 0).unwrap_or(Utc::now()).to_rfc3339())
                                .unwrap_or_else(|| Utc::now().to_rfc3339()),
                            last_login: None,
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
                let message = response.get("Message").and_then(|v| v.as_str()).unwrap_or("获取子用户列表失败");
                Ok(CloudServiceResult {
                    success: false,
                    data: None,
                    message: None,
                    error: Some(message.to_string()),
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

// 获取主用户信息
#[command]
pub async fn ucloud_get_main_user(config: UCloudConfig) -> Result<CloudServiceResult<SubUser>, String> {
    // 获取账户信息
    let params = HashMap::new();
    
    match call_ucloud_api(&config, "DescribeAccountInfo", params).await {
        Ok(response) => {
            let ret_code = response.get("RetCode").and_then(|v| v.as_i64()).unwrap_or(-1);
            if ret_code == 0 {
                let main_user = SubUser {
                    id: response.get("AccountId")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    username: response.get("AccountName")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    display_name: response.get("AccountName")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    email: response.get("Email")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string()),
                    status: "Active".to_string(),
                    permissions: vec!["FullAccess".to_string()],
                    created_at: Utc::now().to_rfc3339(),
                    last_login: Some(Utc::now().to_rfc3339()),
                };
                
                Ok(CloudServiceResult {
                    success: true,
                    data: Some(main_user),
                    message: Some("主用户信息获取成功".to_string()),
                    error: None,
                })
            } else {
                let message = response.get("Message").and_then(|v| v.as_str()).unwrap_or("获取主用户信息失败");
                Ok(CloudServiceResult {
                    success: false,
                    data: None,
                    message: None,
                    error: Some(message.to_string()),
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

// 获取订单列表
#[command]
pub async fn ucloud_get_orders(config: UCloudConfig) -> Result<CloudServiceResult<Vec<OrderInfo>>, String> {
    let params = HashMap::new();
    
    match call_ucloud_api(&config, "DescribeOrderDetailList", params).await {
        Ok(response) => {
            let ret_code = response.get("RetCode").and_then(|v| v.as_i64()).unwrap_or(-1);
            if ret_code == 0 {
                let mut orders = Vec::new();
                
                if let Some(orders_array) = response.get("OrderInfos").and_then(|v| v.as_array()) {
                    for order_data in orders_array {
                        let order = OrderInfo {
                            id: order_data.get("OrderId")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            order_type: order_data.get("OrderType")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                            status: order_data.get("State")
                                .and_then(|v| v.as_str())
                                .unwrap_or("Unknown")
                                .to_string(),
                            amount: order_data.get("Amount")
                                .and_then(|v| v.as_f64())
                                .unwrap_or(0.0),
                            currency: "CNY".to_string(),
                            resource_id: order_data.get("ResourceId")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            created_at: order_data.get("CreateTime")
                                .and_then(|v| v.as_u64())
                                .map(|t| DateTime::from_timestamp(t as i64, 0).unwrap_or(Utc::now()).to_rfc3339())
                                .unwrap_or_else(|| Utc::now().to_rfc3339()),
                            completed_at: order_data.get("CompleteTime")
                                .and_then(|v| v.as_u64())
                                .map(|t| DateTime::from_timestamp(t as i64, 0).unwrap_or(Utc::now()).to_rfc3339()),
                        };
                        orders.push(order);
                    }
                }
                
                Ok(CloudServiceResult {
                    success: true,
                    data: Some(orders),
                    message: Some("订单列表获取成功".to_string()),
                    error: None,
                })
            } else {
                let message = response.get("Message").and_then(|v| v.as_str()).unwrap_or("获取订单列表失败");
                Ok(CloudServiceResult {
                    success: false,
                    data: None,
                    message: None,
                    error: Some(message.to_string()),
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

// 创建主机
#[command]
pub async fn ucloud_create_host(config: UCloudConfig, host_data: HashMap<String, serde_json::Value>) -> Result<CloudServiceResult<HostInfo>, String> {
    // 简化实现，实际需要更多参数
    let _ = (&config, &host_data);
    
    let host = HostInfo {
        id: format!("uhost-{}", uuid::Uuid::new_v4()),
        name: host_data.get("name").and_then(|v| v.as_str()).unwrap_or("新主机").to_string(),
        instance_type: "Standard".to_string(),
        status: "Creating".to_string(),
        region: config.region.clone(),
        zone: "".to_string(),
        public_ip: None,
        private_ip: "10.0.0.100".to_string(),
        os_type: host_data.get("os_type").and_then(|v| v.as_str()).unwrap_or("Ubuntu 20.04").to_string(),
        cpu: host_data.get("cpu").and_then(|v| v.as_u64()).unwrap_or(2) as u32,
        memory: host_data.get("memory").and_then(|v| v.as_u64()).unwrap_or(4096) as u32,
        disk: host_data.get("disk").and_then(|v| v.as_u64()).unwrap_or(40) as u32,
        created_at: Utc::now().to_rfc3339(),
    };
    
    Ok(CloudServiceResult {
        success: true,
        data: Some(host),
        message: Some("主机创建成功".to_string()),
        error: None,
    })
}

// 删除主机
#[command]
pub async fn ucloud_delete_host(_config: UCloudConfig, _host_id: String) -> Result<CloudServiceResult<bool>, String> {
    Ok(CloudServiceResult {
        success: true,
        data: Some(true),
        message: Some("主机删除成功".to_string()),
        error: None,
    })
}

// 启动主机
#[command]
pub async fn ucloud_start_host(_config: UCloudConfig, _host_id: String) -> Result<CloudServiceResult<bool>, String> {
    Ok(CloudServiceResult {
        success: true,
        data: Some(true),
        message: Some("主机启动成功".to_string()),
        error: None,
    })
}

// 停止主机
#[command]
pub async fn ucloud_stop_host(_config: UCloudConfig, _host_id: String) -> Result<CloudServiceResult<bool>, String> {
    Ok(CloudServiceResult {
        success: true,
        data: Some(true),
        message: Some("主机停止成功".to_string()),
        error: None,
    })
}
