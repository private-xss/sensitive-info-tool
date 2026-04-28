use serde::{Deserialize, Serialize};
use tauri::command;
use std::collections::HashMap;
use chrono::Utc;
use reqwest::Client;
use sha1::Sha1;
use hmac::{Hmac, Mac};
use base64::{Engine as _, engine::general_purpose};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AliyunConfig {
    pub access_key_id: String,
    pub access_key_secret: String,
    pub region: String,
    pub endpoint: Option<String>,
    pub session_token: Option<String>,
}

// 规范化阿里云区域：有些来自 OSS 配置的区域前缀为 "oss-"，
// 非 OSS 的阿里云服务端点应使用不带 "oss-" 的区域（如 cn-hangzhou）。
fn normalize_aliyun_region(region: &str) -> &str {
    region.strip_prefix("oss-").unwrap_or(region)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RemoteCommandParams {
    // 接受前端 camelCase 字段名（instanceId、workingDirectory）
    #[serde(rename = "instanceId")]
    pub instance_id: String,
    pub command: String,
    #[serde(rename = "workingDirectory")]
    pub working_directory: Option<String>,
    pub timeout: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CommandResult {
    #[serde(rename = "instanceId")]
    pub instance_id: String,
    pub command: String,
    pub output: String,
    pub error: String,
    #[serde(rename = "exitCode")]
    pub exit_code: i32,
    #[serde(rename = "executionTime")]
    pub execution_time: u64,
    pub timestamp: String,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CommandHistory {
    pub id: String,
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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DatabaseInstance {
    pub id: String,
    pub name: String,
    pub engine: String,
    pub version: String,
    pub status: String,
    pub region: String,
    pub instance_class: String,
    pub storage: u64,
    pub endpoint: String,
    pub port: u16,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AlarmInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub severity: String,
    pub status: String,
    pub metric_name: String,
    pub threshold: f64,
    pub current_value: f64,
    pub region: String,
    pub resource_id: String,
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

// 阿里云API响应结构
#[derive(Debug, Deserialize)]
pub struct AliyunApiResponse<T> {
    pub request_id: Option<String>,
    pub success: bool,
    pub data: Option<T>,
    pub message: Option<String>,
    pub code: Option<String>,
}

// 阿里云用户信息
#[derive(Debug, Deserialize)]
pub struct AliyunUser {
    pub user_id: String,
    pub user_name: String,
    pub display_name: String,
    pub email: Option<String>,
    pub status: String,
    pub create_date: String,
    pub last_login_date: Option<String>,
}

// 阿里云ECS实例信息
#[derive(Debug, Serialize, Deserialize)]
pub struct AliyunEcsInstance {
    pub instance_id: String,
    pub instance_name: String,
    pub status: String,
    pub instance_type: String,
    pub region_id: String,
    pub zone_id: String,
    pub public_ip_address: Option<String>,
    pub private_ip_address: String,
    pub os_type: String,
    pub cpu: u32,
    pub memory: u32,
    pub creation_time: String,
}

// 阿里云RDS实例信息
#[derive(Debug, Deserialize)]
pub struct AliyunRdsInstance {
    pub db_instance_id: String,
    pub db_instance_description: String,
    pub engine: String,
    pub engine_version: String,
    pub db_instance_status: String,
    pub region_id: String,
    pub db_instance_class: String,
    pub db_instance_storage: u32,
    pub connection_string: String,
    pub port: u16,
    pub create_time: String,
}

// 阿里云告警信息
#[derive(Debug, Deserialize)]
pub struct AliyunAlarm {
    pub alarm_task_id: String,
    pub alarm_task_name: String,
    pub metric_name: String,
    pub threshold: f64,
    pub current_value: f64,
    pub state: String,
    pub severity: String,
    pub region_id: String,
    pub resource_id: String,
    pub create_time: String,
    pub update_time: String,
}

// 阿里云API签名函数
fn generate_aliyun_signature(
    access_key_secret: &str,
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
    
    // 2. 构建签名字符串 - 阿里云格式：METHOD&URI&QUERY_STRING
    let string_to_sign = format!("{}&{}&{}", method, urlencoding::encode(uri), urlencoding::encode(&query_string));
    
    // 3. 计算HMAC-SHA1签名 - 使用access_key_secret&作为密钥
    let key = format!("{}&", access_key_secret);
    let mut hmac = Hmac::<Sha1>::new_from_slice(key.as_bytes())
        .expect("HMAC can take key of any size");
    hmac.update(string_to_sign.as_bytes());
    let signature = hmac.finalize();
    
    // 4. Base64编码
    general_purpose::STANDARD.encode(signature.into_bytes())
}

// 阿里云API调用函数
async fn call_aliyun_api<T>(
    config: &AliyunConfig,
    action: &str,
    params: HashMap<String, String>,
) -> Result<AliyunApiResponse<T>, String> 
where
    T: for<'de> serde::Deserialize<'de>,
{
    let client = Client::new();
    
    // 纠正区域，防止使用 OSS 风格区域（如 oss-cn-hangzhou）拼接成错误端点
    let region = normalize_aliyun_region(&config.region);
    
    // 根据不同的API选择不同的端点和版本
    let (endpoint, version) = match action {
        "DescribeInstances" | "DescribeRegions" => (format!("https://ecs.{}.aliyuncs.com", region), "2014-05-26"),
        "RunCommand" => (format!("https://ecs.{}.aliyuncs.com", region), "2014-05-26"),
        "DescribeInvocationResults" | "DescribeInvocations" => (format!("https://ecs.{}.aliyuncs.com", region), "2014-05-26"),
        "GetUser" | "ListUsers" => ("https://ram.aliyuncs.com".to_string(), "2015-05-01"),
        "DescribeDBInstances" => (format!("https://rds.{}.aliyuncs.com", region), "2014-08-15"),
        "DescribeMetricRuleList" => (format!("https://cms.{}.aliyuncs.com", region), "2019-01-01"),
        _ => (format!("https://{}.aliyuncs.com", region), "2015-05-01"),
    };
    
    // 构建请求参数
    let mut request_params = params;
    request_params.insert("Action".to_string(), action.to_string());
    request_params.insert("Version".to_string(), version.to_string());
    request_params.insert("AccessKeyId".to_string(), config.access_key_id.clone());
    request_params.insert("Format".to_string(), "JSON".to_string());
    request_params.insert("SignatureMethod".to_string(), "HMAC-SHA1".to_string());
    request_params.insert("SignatureVersion".to_string(), "1.0".to_string());
    request_params.insert("SignatureNonce".to_string(), uuid::Uuid::new_v4().to_string());
    // 阿里云API要求的时间戳格式：ISO8601格式，UTC时间
    let timestamp = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    request_params.insert("Timestamp".to_string(), timestamp);
    // 统一覆盖 RegionId 为规范化后的区域，避免将 oss- 前缀传入服务端或用于主机名
    request_params.insert("RegionId".to_string(), region.to_string());
    
    // 生成签名（POST）
    let signature_post = generate_aliyun_signature(&config.access_key_secret, "POST", "/", &request_params);
    request_params.insert("Signature".to_string(), signature_post.clone());
    
    // 发送请求（调试输出可通过设置环境变量 ALIYUN_API_DEBUG=1 开启）
    if std::env::var("ALIYUN_API_DEBUG").ok().as_deref() == Some("1") {
        println!("阿里云API调用调试信息:");
        println!("  端点: {}", endpoint);
        println!("  动作: {}", action);
        println!("  参数: {:?}", request_params);
    }
    
    let response = client
        .post(&endpoint)
        .form(&request_params)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;
    
    if !response.status().is_success() {
        let status = response.status();
        let response_text = response.text().await.unwrap_or_else(|_| "无法读取响应".to_string());
        // 若出现 405 或响应包含 MethodNotAllowed，则尝试使用 GET 方式重试一次
        let should_retry_get = status.as_u16() == 405 || response_text.contains("MethodNotAllowed");
        if should_retry_get {
            // 重新以 GET 方法签名
            let mut get_params = request_params.clone();
            let signature_get = generate_aliyun_signature(&config.access_key_secret, "GET", "/", &get_params);
            get_params.insert("Signature".to_string(), signature_get);
            let query_string = get_params
                .iter()
                .map(|(k, v)| format!("{}={}", urlencoding::encode(k), urlencoding::encode(v)))
                .collect::<Vec<_>>()
                .join("&");
            let url = format!("{}?{}", endpoint, query_string);
            let resp_get = client
                .get(&url)
                .send()
                .await
                .map_err(|e| format!("GET 重试请求失败: {}", e))?;
            if !resp_get.status().is_success() {
                let s = resp_get.status();
                let body = resp_get.text().await.unwrap_or_else(|_| "无法读取响应".to_string());
                return Err(format!("API调用失败，状态码: {}，响应: {}", s, body));
            }
            let response_text = resp_get.text().await.map_err(|e| format!("读取响应失败: {}", e))?;
            let response_json: serde_json::Value = serde_json::from_str(&response_text)
                .map_err(|e| format!("解析响应失败: {}，响应内容: {}", e, response_text))?;
            if let Some(code) = response_json.get("Code") {
                if code != "Success" {
                    let message = response_json.get("Message")
                        .and_then(|v| v.as_str())
                        .unwrap_or("未知错误");
                    return Ok(AliyunApiResponse {
                        request_id: response_json.get("RequestId").and_then(|v| v.as_str()).map(|s| s.to_string()),
                        success: false,
                        data: None,
                        message: Some(message.to_string()),
                        code: Some(code.as_str().unwrap_or("").to_string()),
                    });
                }
            }
            let data: T = serde_json::from_value(response_json.clone())
                .map_err(|e| format!("解析数据失败: {}，响应内容: {}", e, response_text))?;
            return Ok(AliyunApiResponse {
                request_id: response_json.get("RequestId").and_then(|v| v.as_str()).map(|s| s.to_string()),
                success: true,
                data: Some(data),
                message: None,
                code: None,
            });
        }
        return Err(format!("API调用失败，状态码: {}，响应: {}", status, response_text));
    }
    
    let response_text = response.text().await.map_err(|e| format!("读取响应失败: {}", e))?;
    
    // 解析阿里云API响应
    let response_json: serde_json::Value = serde_json::from_str(&response_text)
        .map_err(|e| format!("解析响应失败: {}，响应内容: {}", e, response_text))?;

    // 判断成功：有的 POP API 没有 Code 字段；若存在 Code 且不等于 Success，则视为错误
    let is_error = response_json
        .get("Code")
        .and_then(|v| v.as_str())
        .map(|code| code != "Success")
        .unwrap_or(false);
    if is_error {
        let message = response_json
            .get("Message")
            .and_then(|v| v.as_str())
            .unwrap_or("未知错误");
        return Ok(AliyunApiResponse {
            request_id: response_json.get("RequestId").and_then(|v| v.as_str()).map(|s| s.to_string()),
            success: false,
            data: None,
            message: Some(message.to_string()),
            code: response_json.get("Code").and_then(|v| v.as_str()).map(|s| s.to_string()),
        });
    }

    // 解析数据部分（直传整个 JSON，交由上层按字段取值）
    let data: T = serde_json::from_value(response_json.clone())
        .map_err(|e| format!("解析数据失败: {}，响应内容: {}", e, response_text))?;

    Ok(AliyunApiResponse {
        request_id: response_json.get("RequestId").and_then(|v| v.as_str()).map(|s| s.to_string()),
        success: true,
        data: Some(data),
        message: None,
        code: None,
    })
}

// 阿里云控制台接管
#[command]
pub async fn aliyun_take_over_console(config: AliyunConfig) -> Result<CloudServiceResult<bool>, String> {
    // 使用 ListUsers 简单校验凭证有效性，避免 GetUser 需 UserName 的必填
    let mut params = HashMap::new();
    params.insert("RegionId".to_string(), config.region.clone());
    
    match call_aliyun_api::<serde_json::Value>(&config, "ListUsers", params).await {
        Ok(response) => {
            if response.success {
                Ok(CloudServiceResult {
                    success: true,
                    data: Some(true),
                    message: Some("阿里云控制台接管成功".to_string()),
                    error: None,
                })
            } else {
                Ok(CloudServiceResult {
                    success: false,
                    data: None,
                    message: None,
                    error: Some(response.message.unwrap_or_else(|| "API调用失败".to_string())),
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
pub async fn aliyun_cancel_console_takeover(config: AliyunConfig) -> Result<CloudServiceResult<bool>, String> {
    // 同上，使用 ListUsers 验证凭证
    let mut params = HashMap::new();
    params.insert("RegionId".to_string(), config.region.clone());
    
    match call_aliyun_api::<serde_json::Value>(&config, "ListUsers", params).await {
        Ok(response) => {
            if response.success {
                Ok(CloudServiceResult {
                    success: true,
                    data: Some(true),
                    message: Some("阿里云控制台接管已取消".to_string()),
                    error: None,
                })
            } else {
                Ok(CloudServiceResult {
                    success: false,
                    data: None,
                    message: None,
                    error: Some(response.message.unwrap_or_else(|| "API调用失败".to_string())),
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

// 远程命令执行
#[command]
pub async fn aliyun_execute_remote_command(config: AliyunConfig, params: RemoteCommandParams) -> Result<CloudServiceResult<CommandResult>, String> {
    let start_time = std::time::Instant::now();
    
    // 调用阿里云ECS API执行远程命令
    let mut api_params = HashMap::new();
    api_params.insert("RegionId".to_string(), config.region.clone());
    // RunCommand 正确参数：InstanceId.1、Type、CommandContent(Base64)
    api_params.insert("InstanceId.1".to_string(), params.instance_id.clone());
    // 缺省按 Linux Shell 处理；如需 PowerShell 可在前端扩展类型选择
    api_params.insert("Type".to_string(), "RunShellScript".to_string());
    let cmd_b64 = general_purpose::STANDARD.encode(params.command.as_bytes());
    api_params.insert("CommandContent".to_string(), cmd_b64);
    // 指定内容编码，确保服务端按 Base64 解码
    api_params.insert("ContentEncoding".to_string(), "Base64".to_string());
    
    if let Some(working_dir) = &params.working_directory {
        // ECS API 使用 WorkingDir 字段
        api_params.insert("WorkingDir".to_string(), working_dir.clone());
    }
    
    if let Some(timeout) = params.timeout {
        api_params.insert("Timeout".to_string(), timeout.to_string());
    }
    
    match call_aliyun_api::<serde_json::Value>(&config, "RunCommand", api_params).await {
        Ok(response) => {
            if response.success {
                // RunCommand 为异步调用，需轮询 DescribeInvocationResults 获取结果
                let mut command_id = String::new();
                let mut invoke_id = String::new();
                if let Some(d) = &response.data {
                    command_id = d.get("CommandId").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    invoke_id = d.get("InvokeId").and_then(|v| v.as_str()).unwrap_or("").to_string();
                }
                if command_id.is_empty() && invoke_id.is_empty() {
                    return Ok(CloudServiceResult {
                        success: false,
                        data: None,
                        message: None,
                        error: Some("RunCommand 未返回 CommandId/InvokeId，无法获取结果".to_string()),
                    });
                }

                // 轮询查询执行结果，最长等待 30 秒
                let mut final_output = String::new();
                let mut final_error = String::new();
                let mut final_exit_code: i32 = 0;
                let mut finished = false;
                let mut last_status = String::new();
                let max_attempts = 30u32;
                for _ in 0..max_attempts {
                    let mut q = HashMap::new();
                    q.insert("RegionId".to_string(), config.region.clone());
                    if !command_id.is_empty() { q.insert("CommandId".to_string(), command_id.clone()); }
                    if !invoke_id.is_empty() { q.insert("InvokeId".to_string(), invoke_id.clone()); }
                    // 支持使用 InstanceId.1 定位具体实例
                    q.insert("InstanceId.1".to_string(), params.instance_id.clone());
                    // 返回输出内容
                    q.insert("IncludeOutput".to_string(), "true".to_string());

                    let q_res = call_aliyun_api::<serde_json::Value>(&config, "DescribeInvocationResults", q).await;
                    if let Ok(q_resp) = q_res {
                        if q_resp.success {
                            if let Some(data) = q_resp.data {
                                // 兼容结构：{"Invocation":{"InvocationResults":{"InvocationResult":[...]}}}
                                let results_opt = data
                                    .get("Invocation")
                                    .and_then(|v| v.get("InvocationResults"))
                                    .and_then(|v| v.get("InvocationResult"))
                                    .and_then(|v| v.as_array())
                                    .or_else(|| data.get("InvocationResult").and_then(|v| v.as_array()));
                                if let Some(results) = results_opt {
                                    if let Some(first) = results.first() {
                                        // 状态判断：Success/Failed/Running 等
                                        let status = first.get("InvokeStatus").or_else(|| first.get("Status"))
                                            .and_then(|v| v.as_str()).unwrap_or("");
                                        // 输出 base64，尝试解码
                                        let output_b64 = first.get("Output").and_then(|v| v.as_str()).unwrap_or("");
                                        let decoded = general_purpose::STANDARD.decode(output_b64.as_bytes()).ok()
                                            .and_then(|bytes| String::from_utf8(bytes).ok())
                                            .unwrap_or_else(|| output_b64.to_string());
                                        final_output = decoded;
                                        final_exit_code = first.get("ExitCode").and_then(|v| v.as_i64()).unwrap_or(0) as i32;

                                        // 失败信息（若有）
                                        final_error = first.get("ErrorInfo").and_then(|v| v.as_str()).unwrap_or("").to_string();

                                        last_status = status.to_string();
                                        match status {
                                            "Success" | "Failed" | "Error" | "Finished" | "PartialSuccess" => {
                                                finished = true;
                                            }
                                            _ => {}
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if finished { break; }
                    tokio::time::sleep(std::time::Duration::from_millis(1000)).await;
                }

                // 若已结束但未取到输出，尝试调用 DescribeInvocations 作为兜底
                if final_output.is_empty() {
                    let mut dq = HashMap::new();
                    dq.insert("RegionId".to_string(), config.region.clone());
                    if !invoke_id.is_empty() { dq.insert("InvokeId".to_string(), invoke_id.clone()); }
                    dq.insert("InstanceId.1".to_string(), params.instance_id.clone());
                    dq.insert("IncludeOutput".to_string(), "true".to_string());
                    if let Ok(di_resp) = call_aliyun_api::<serde_json::Value>(&config, "DescribeInvocations", dq).await {
                        if di_resp.success {
                            if let Some(d) = di_resp.data {
                                // 可能结构：{"Invocations":{"Invocation":[{"Instances":{"Instance":[{"Output":"..."}]}}]}}
                                if let Some(inv_list) = d.get("Invocations").and_then(|v| v.get("Invocation")).and_then(|v| v.as_array()) {
                                    if let Some(inv) = inv_list.first() {
                                        if let Some(inst_list) = inv.get("Instances").and_then(|v| v.get("Instance")).and_then(|v| v.as_array()) {
                                            if let Some(inst) = inst_list.first() {
                                                if let Some(ob64) = inst.get("Output").and_then(|v| v.as_str()) {
                                                    if let Ok(bytes) = general_purpose::STANDARD.decode(ob64.as_bytes()) {
                                                        if let Ok(s) = String::from_utf8(bytes) { final_output = s; }
                                                    }
                                                }
                                                if final_exit_code == 0 {
                                                    final_exit_code = inst.get("ExitCode").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                let execution_time = start_time.elapsed().as_millis() as u64;
                let result = CommandResult {
                    instance_id: params.instance_id.clone(),
                    command: params.command.clone(),
                    output: if final_output.is_empty() { "(空输出)".to_string() } else { final_output },
                    error: final_error,
                    exit_code: final_exit_code,
                    execution_time,
                    timestamp: Utc::now().to_rfc3339(),
                    status: if finished { if last_status.is_empty() { "Finished".to_string() } else { last_status } } else { "Running".to_string() },
                };

                Ok(CloudServiceResult {
                    success: true,
                    data: Some(result),
                    message: Some(if finished { "远程命令执行完成".to_string() } else { "已发起命令，结果查询超时".to_string() }),
                    error: None,
                })
            } else {
                Ok(CloudServiceResult {
                    success: false,
                    data: None,
                    message: None,
                    error: Some(response.message.unwrap_or_else(|| "命令执行失败".to_string())),
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

// 获取历史命令记录
#[command]
pub async fn aliyun_get_command_history(_config: AliyunConfig, instance_id: Option<String>) -> Result<CloudServiceResult<Vec<CommandHistory>>, String> {
    // 模拟获取历史命令记录
    // 在实际实现中，这里会从数据库或缓存中获取历史记录
    
    tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
    
    let mut history = Vec::new();
    
    // 模拟历史记录数据
    for i in 1..=5 {
        history.push(CommandHistory {
            id: format!("cmd_{}", i),
            instance_id: instance_id.clone().unwrap_or_else(|| "i-1234567890abcdef0".to_string()),
            command: format!("ls -la /home/user{}", i),
            output: format!("total 8\ndrwxr-xr-x 2 user user 4096 Jan 1 12:00 .\ndrwxr-xr-x 3 root root 4096 Jan 1 12:00 .."),
            error: String::new(),
            exit_code: 0,
            execution_time: 100 + i * 10,
            timestamp: Utc::now().to_rfc3339(),
        });
    }
    
    Ok(CloudServiceResult {
        success: true,
        data: Some(history),
        message: Some("历史命令记录获取成功".to_string()),
        error: None,
    })
}

// 获取子用户列表
#[command]
pub async fn aliyun_get_sub_users(config: AliyunConfig) -> Result<CloudServiceResult<Vec<SubUser>>, String> {
    // 调用阿里云RAM API获取子用户列表
    let mut api_params = HashMap::new();
    api_params.insert("RegionId".to_string(), config.region.clone());
    
    match call_aliyun_api::<serde_json::Value>(&config, "ListUsers", api_params).await {
        Ok(response) => {
            if response.success {
                let mut users = Vec::new();
                
                if let Some(data) = response.data {
                    if let Some(users_array) = data.get("Users").and_then(|v| v.as_array()) {
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
                                created_at: user_data.get("CreateDate")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                                last_login: user_data.get("LastLoginDate")
                                    .and_then(|v| v.as_str())
                                    .map(|s| s.to_string()),
                            };
                            users.push(user);
                        }
                    }
                }
                
                Ok(CloudServiceResult {
                    success: true,
                    data: Some(users),
                    message: Some("子用户列表获取成功".to_string()),
                    error: None,
                })
            } else {
                Ok(CloudServiceResult {
                    success: false,
                    data: None,
                    message: None,
                    error: Some(response.message.unwrap_or_else(|| "获取子用户列表失败".to_string())),
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

// 获取云数据库实例列表
#[command]
pub async fn aliyun_get_database_instances(config: AliyunConfig) -> Result<CloudServiceResult<Vec<DatabaseInstance>>, String> {
    // 调用阿里云RDS API获取数据库实例列表
    let mut api_params = HashMap::new();
    api_params.insert("RegionId".to_string(), config.region.clone());
    
    match call_aliyun_api::<serde_json::Value>(&config, "DescribeDBInstances", api_params).await {
        Ok(response) => {
            if response.success {
                let mut instances = Vec::new();
                
                if let Some(data) = response.data {
                    if let Some(instances_array) = data.get("Items").and_then(|v| v.get("DBInstance")).and_then(|v| v.as_array()) {
                        for instance_data in instances_array {
                            let instance = DatabaseInstance {
                                id: instance_data.get("DBInstanceId")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                                name: instance_data.get("DBInstanceDescription")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                                engine: instance_data.get("Engine")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                                version: instance_data.get("EngineVersion")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                                status: instance_data.get("DBInstanceStatus")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("Unknown")
                                    .to_string(),
                                region: instance_data.get("RegionId")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or(&config.region)
                                    .to_string(),
                                instance_class: instance_data.get("DBInstanceClass")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                                storage: instance_data.get("DBInstanceStorage")
                                    .and_then(|v| v.as_u64())
                                    .unwrap_or(0),
                                endpoint: instance_data.get("ConnectionString")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                                port: instance_data.get("Port")
                                    .and_then(|v| v.as_u64())
                                    .unwrap_or(3306) as u16,
                                created_at: instance_data.get("CreateTime")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                            };
                            instances.push(instance);
                        }
                    }
                }
                
                Ok(CloudServiceResult {
                    success: true,
                    data: Some(instances),
                    message: Some("数据库实例列表获取成功".to_string()),
                    error: None,
                })
            } else {
                Ok(CloudServiceResult {
                    success: false,
                    data: None,
                    message: None,
                    error: Some(response.message.unwrap_or_else(|| "获取数据库实例列表失败".to_string())),
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

// 获取告警信息
#[command]
pub async fn aliyun_get_alarm_info(config: AliyunConfig) -> Result<CloudServiceResult<Vec<AlarmInfo>>, String> {
    // 调用阿里云云监控API获取告警信息
    let mut api_params = HashMap::new();
    api_params.insert("RegionId".to_string(), config.region.clone());
    
    match call_aliyun_api::<serde_json::Value>(&config, "DescribeMetricRuleList", api_params).await {
        Ok(response) => {
            if response.success {
                let mut alarms = Vec::new();
                
                if let Some(data) = response.data {
                    // 兼容不同返回结构：可能是 {"Alarms":{"Alarm":[...]}} 或直接 {"Alarm":[...]}
                    let alarms_array_opt = data
                        .get("Alarms")
                        .and_then(|v| v.get("Alarm"))
                        .and_then(|v| v.as_array())
                        .or_else(|| data.get("Alarm").and_then(|v| v.as_array()));
                    if let Some(alarms_array) = alarms_array_opt {
                        for alarm_data in alarms_array {
                            let alarm = AlarmInfo {
                                id: alarm_data.get("AlarmTaskId")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                                name: alarm_data.get("AlarmTaskName")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                                description: alarm_data.get("AlarmTaskDescription")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                                severity: alarm_data.get("Severity")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("Warning")
                                    .to_string(),
                                status: alarm_data.get("State")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("OK")
                                    .to_string(),
                                metric_name: alarm_data.get("MetricName")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                                threshold: alarm_data.get("Threshold")
                                    .and_then(|v| v.as_f64())
                                    .unwrap_or(0.0),
                                current_value: alarm_data.get("CurrentValue")
                                    .and_then(|v| v.as_f64())
                                    .unwrap_or(0.0),
                                region: alarm_data.get("RegionId")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or(&config.region)
                                    .to_string(),
                                resource_id: alarm_data.get("ResourceId")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                                created_at: alarm_data.get("CreateTime")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                                updated_at: alarm_data.get("UpdateTime")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                            };
                            alarms.push(alarm);
                        }
                    }
                }
                
                Ok(CloudServiceResult {
                    success: true,
                    data: Some(alarms),
                    message: Some("告警信息获取成功".to_string()),
                    error: None,
                })
            } else {
                Ok(CloudServiceResult {
                    success: false,
                    data: None,
                    message: None,
                    error: Some(response.message.unwrap_or_else(|| "获取告警信息失败".to_string())),
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

// 测试阿里云API连接
#[command]
pub async fn aliyun_test_connection(config: AliyunConfig) -> Result<CloudServiceResult<String>, String> {
    // 使用简化的方式测试连接，直接调用ECS API
    let client = Client::new();
    
    // 阿里云ECS API的正确端点格式
    // 将区域代码转换为正确的格式
    let region_endpoint = match config.region.as_str() {
        "cn-hangzhou" => "cn-hangzhou",
        "cn-beijing" => "cn-beijing", 
        "cn-shanghai" => "cn-shanghai",
        "cn-shenzhen" => "cn-shenzhen",
        "cn-guangzhou" => "cn-guangzhou",
        "cn-qingdao" => "cn-qingdao",
        "cn-zhangjiakou" => "cn-zhangjiakou",
        "cn-huhehaote" => "cn-huhehaote",
        "cn-wulanchabu" => "cn-wulanchabu",
        "cn-chengdu" => "cn-chengdu",
        "cn-heyuan" => "cn-heyuan",
        "cn-wuhan-lr" => "cn-wuhan-lr",
        "cn-fuzhou" => "cn-fuzhou",
        "cn-wuhan-cm" => "cn-wuhan-cm",
        "cn-nanjing" => "cn-nanjing",
        "cn-hongkong" => "cn-hongkong",
        "ap-southeast-1" => "ap-southeast-1",
        "ap-southeast-2" => "ap-southeast-2",
        "ap-southeast-3" => "ap-southeast-3",
        "ap-southeast-5" => "ap-southeast-5",
        "ap-southeast-6" => "ap-southeast-6",
        "ap-southeast-7" => "ap-southeast-7",
        "ap-northeast-1" => "ap-northeast-1",
        "ap-south-1" => "ap-south-1",
        "us-east-1" => "us-east-1",
        "us-west-1" => "us-west-1",
        "eu-west-1" => "eu-west-1",
        "eu-central-1" => "eu-central-1",
        "me-east-1" => "me-east-1",
        _ => "cn-hangzhou", // 默认使用杭州
    };
    
    // 使用映射后的区域构造 ECS 端点进行测试，避免因传入 oss- 前缀导致错误主机名
    let endpoint = format!("https://ecs.{}.aliyuncs.com", region_endpoint);
    
    // 构建基本参数 - 使用DescribeRegions API，这个API不需要特殊权限
    let mut params = HashMap::new();
    params.insert("Action".to_string(), "DescribeRegions".to_string());
    params.insert("Version".to_string(), "2014-05-26".to_string());
    params.insert("AccessKeyId".to_string(), config.access_key_id.clone());
    params.insert("Format".to_string(), "JSON".to_string());
    params.insert("SignatureMethod".to_string(), "HMAC-SHA1".to_string());
    params.insert("SignatureVersion".to_string(), "1.0".to_string());
    params.insert("SignatureNonce".to_string(), uuid::Uuid::new_v4().to_string());
    params.insert("Timestamp".to_string(), Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string());
    
    // 生成签名
    let signature = generate_aliyun_signature(&config.access_key_secret, "POST", "/", &params);
    params.insert("Signature".to_string(), signature);
    
    println!("测试连接调试信息:");
    println!("  原始区域: {}", config.region);
    println!("  映射区域: {}", region_endpoint);
    println!("  端点: {}", endpoint);
    println!("  AccessKeyId: {}", config.access_key_id);
    println!("  参数: {:?}", params);
    
    match client.post(&endpoint).form(&params).send().await {
        Ok(response) => {
            let status = response.status();
            let response_text = response.text().await.unwrap_or_else(|_| "无法读取响应".to_string());
            
            println!("响应状态: {}", status);
            println!("响应内容: {}", response_text);
            
            if status.is_success() {
                Ok(CloudServiceResult {
                    success: true,
                    data: Some("阿里云API连接测试成功".to_string()),
                    message: Some("连接正常".to_string()),
                    error: None,
                })
            } else {
                Ok(CloudServiceResult {
                    success: false,
                    data: None,
                    message: None,
                    error: Some(format!("API调用失败，状态码: {}，响应: {}", status, response_text)),
                })
            }
        }
        Err(e) => {
            Ok(CloudServiceResult {
                success: false,
                data: None,
                message: None,
                error: Some(format!("请求失败: {}", e)),
            })
        }
    }
}

// 获取ECS实例列表
#[command]
pub async fn aliyun_get_ecs_instances(config: AliyunConfig) -> Result<CloudServiceResult<Vec<AliyunEcsInstance>>, String> {
    // 调用阿里云ECS API获取实例列表
    let mut api_params = HashMap::new();
    api_params.insert("RegionId".to_string(), config.region.clone());
    
    match call_aliyun_api::<serde_json::Value>(&config, "DescribeInstances", api_params).await {
        Ok(response) => {
            if response.success {
                let mut instances = Vec::new();
                
                if let Some(data) = response.data {
                    // 阿里云ECS API返回的实例列表在Instances.Instance数组中
                    if let Some(instances_array) = data.get("Instances")
                        .and_then(|v| v.get("Instance"))
                        .and_then(|v| v.as_array()) {
                        
                        for instance_data in instances_array {
                            let instance = AliyunEcsInstance {
                                instance_id: instance_data.get("InstanceId")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                                instance_name: instance_data.get("InstanceName")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                                status: instance_data.get("Status")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("Unknown")
                                    .to_string(),
                                instance_type: instance_data.get("InstanceType")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                                region_id: instance_data.get("RegionId")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or(&config.region)
                                    .to_string(),
                                zone_id: instance_data.get("ZoneId")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                                public_ip_address: instance_data.get("PublicIpAddress")
                                    .and_then(|v| v.get("IpAddress"))
                                    .and_then(|v| v.as_array())
                                    .and_then(|arr| arr.first())
                                    .and_then(|v| v.as_str())
                                    .map(|s| s.to_string()),
                                private_ip_address: instance_data.get("VpcAttributes")
                                    .and_then(|v| v.get("PrivateIpAddress"))
                                    .and_then(|v| v.get("IpAddress"))
                                    .and_then(|v| v.as_array())
                                    .and_then(|arr| arr.first())
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                                os_type: instance_data.get("OSName")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("Unknown")
                                    .to_string(),
                                cpu: instance_data.get("Cpu")
                                    .and_then(|v| v.as_u64())
                                    .unwrap_or(0) as u32,
                                memory: instance_data.get("Memory")
                                    .and_then(|v| v.as_u64())
                                    .unwrap_or(0) as u32,
                                creation_time: instance_data.get("CreationTime")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                            };
                            instances.push(instance);
                        }
                    }
                }
                
                Ok(CloudServiceResult {
                    success: true,
                    data: Some(instances),
                    message: Some("ECS实例列表获取成功".to_string()),
                    error: None,
                })
            } else {
                Ok(CloudServiceResult {
                    success: false,
                    data: None,
                    message: None,
                    error: Some(response.message.unwrap_or_else(|| "获取ECS实例列表失败".to_string())),
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

// 创建数据库实例
#[command]
pub async fn aliyun_create_database_instance(config: AliyunConfig, instance_data: HashMap<String, serde_json::Value>) -> Result<CloudServiceResult<DatabaseInstance>, String> {
    // 调用阿里云RDS API创建数据库实例
    let mut api_params = HashMap::new();
    api_params.insert("RegionId".to_string(), config.region.clone());
    api_params.insert("DBInstanceDescription".to_string(), 
        instance_data.get("name").and_then(|v| v.as_str()).unwrap_or("新数据库实例").to_string());
    api_params.insert("Engine".to_string(), 
        instance_data.get("engine").and_then(|v| v.as_str()).unwrap_or("MySQL").to_string());
    api_params.insert("EngineVersion".to_string(), 
        instance_data.get("version").and_then(|v| v.as_str()).unwrap_or("8.0").to_string());
    api_params.insert("DBInstanceClass".to_string(), 
        instance_data.get("instance_class").and_then(|v| v.as_str()).unwrap_or("rds.mysql.s1.small").to_string());
    api_params.insert("DBInstanceStorage".to_string(), 
        instance_data.get("storage").and_then(|v| v.as_u64()).unwrap_or(20).to_string());
    api_params.insert("DBInstanceNetType".to_string(), "Intranet".to_string());
    api_params.insert("PayType".to_string(), "Postpaid".to_string());
    
    match call_aliyun_api::<serde_json::Value>(&config, "CreateDBInstance", api_params).await {
        Ok(response) => {
            if response.success {
                let instance = DatabaseInstance {
                    id: response.data
                        .as_ref()
                        .and_then(|data| data.get("DBInstanceId").and_then(|v| v.as_str()))
                        .unwrap_or("")
                        .to_string(),
                    name: instance_data.get("name").and_then(|v| v.as_str()).unwrap_or("新数据库实例").to_string(),
                    engine: instance_data.get("engine").and_then(|v| v.as_str()).unwrap_or("MySQL").to_string(),
                    version: instance_data.get("version").and_then(|v| v.as_str()).unwrap_or("8.0").to_string(),
                    status: "Creating".to_string(),
                    region: config.region.clone(),
                    instance_class: instance_data.get("instance_class").and_then(|v| v.as_str()).unwrap_or("rds.mysql.s1.small").to_string(),
                    storage: instance_data.get("storage").and_then(|v| v.as_u64()).unwrap_or(20),
                    endpoint: response.data
                        .as_ref()
                        .and_then(|data| data.get("ConnectionString").and_then(|v| v.as_str()))
                        .unwrap_or("")
                        .to_string(),
                    port: 3306,
                    created_at: Utc::now().to_rfc3339(),
                };
                
                Ok(CloudServiceResult {
                    success: true,
                    data: Some(instance),
                    message: Some("数据库实例创建成功".to_string()),
                    error: None,
                })
            } else {
                Ok(CloudServiceResult {
                    success: false,
                    data: None,
                    message: None,
                    error: Some(response.message.unwrap_or_else(|| "创建数据库实例失败".to_string())),
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

// 删除数据库实例
#[command]
pub async fn aliyun_delete_database_instance(config: AliyunConfig, instance_id: String) -> Result<CloudServiceResult<bool>, String> {
    // 调用阿里云RDS API删除数据库实例
    let mut api_params = HashMap::new();
    api_params.insert("RegionId".to_string(), config.region.clone());
    api_params.insert("DBInstanceId".to_string(), instance_id.clone());
    
    match call_aliyun_api::<serde_json::Value>(&config, "DeleteDBInstance", api_params).await {
        Ok(response) => {
            if response.success {
                Ok(CloudServiceResult {
                    success: true,
                    data: Some(true),
                    message: Some("数据库实例删除成功".to_string()),
                    error: None,
                })
            } else {
                Ok(CloudServiceResult {
                    success: false,
                    data: None,
                    message: None,
                    error: Some(response.message.unwrap_or_else(|| "删除数据库实例失败".to_string())),
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

// 创建告警规则
#[command]
pub async fn aliyun_create_alarm_rule(config: AliyunConfig, alarm_data: HashMap<String, serde_json::Value>) -> Result<CloudServiceResult<AlarmInfo>, String> {
    // 调用阿里云云监控API创建告警规则
    let mut api_params = HashMap::new();
    api_params.insert("RegionId".to_string(), config.region.clone());
    api_params.insert("AlarmTaskName".to_string(), 
        alarm_data.get("name").and_then(|v| v.as_str()).unwrap_or("新告警规则").to_string());
    api_params.insert("AlarmTaskDescription".to_string(), 
        alarm_data.get("description").and_then(|v| v.as_str()).unwrap_or("新创建的告警规则").to_string());
    api_params.insert("MetricName".to_string(), 
        alarm_data.get("metric_name").and_then(|v| v.as_str()).unwrap_or("CPUUtilization").to_string());
    api_params.insert("Threshold".to_string(), 
        alarm_data.get("threshold").and_then(|v| v.as_f64()).unwrap_or(80.0).to_string());
    api_params.insert("ResourceId".to_string(), 
        alarm_data.get("resource_id").and_then(|v| v.as_str()).unwrap_or("i-1234567890abcdef0").to_string());
    api_params.insert("Severity".to_string(), 
        alarm_data.get("severity").and_then(|v| v.as_str()).unwrap_or("Warning").to_string());
    
    match call_aliyun_api::<serde_json::Value>(&config, "CreateMetricRule", api_params).await {
        Ok(response) => {
            if response.success {
                let alarm = AlarmInfo {
                    id: response.data
                        .as_ref()
                        .and_then(|data| data.get("AlarmTaskId").and_then(|v| v.as_str()))
                        .unwrap_or("")
                        .to_string(),
                    name: alarm_data.get("name").and_then(|v| v.as_str()).unwrap_or("新告警规则").to_string(),
                    description: alarm_data.get("description").and_then(|v| v.as_str()).unwrap_or("新创建的告警规则").to_string(),
                    severity: alarm_data.get("severity").and_then(|v| v.as_str()).unwrap_or("Warning").to_string(),
                    status: "OK".to_string(),
                    metric_name: alarm_data.get("metric_name").and_then(|v| v.as_str()).unwrap_or("CPUUtilization").to_string(),
                    threshold: alarm_data.get("threshold").and_then(|v| v.as_f64()).unwrap_or(80.0),
                    current_value: 0.0,
                    region: config.region.clone(),
                    resource_id: alarm_data.get("resource_id").and_then(|v| v.as_str()).unwrap_or("i-1234567890abcdef0").to_string(),
                    created_at: Utc::now().to_rfc3339(),
                    updated_at: Utc::now().to_rfc3339(),
                };
                
                Ok(CloudServiceResult {
                    success: true,
                    data: Some(alarm),
                    message: Some("告警规则创建成功".to_string()),
                    error: None,
                })
            } else {
                Ok(CloudServiceResult {
                    success: false,
                    data: None,
                    message: None,
                    error: Some(response.message.unwrap_or_else(|| "创建告警规则失败".to_string())),
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

// 删除告警规则
#[command]
pub async fn aliyun_delete_alarm_rule(config: AliyunConfig, alarm_id: String) -> Result<CloudServiceResult<bool>, String> {
    // 调用阿里云云监控API删除告警规则
    let mut api_params = HashMap::new();
    api_params.insert("RegionId".to_string(), config.region.clone());
    api_params.insert("AlarmTaskId".to_string(), alarm_id.clone());
    
    match call_aliyun_api::<serde_json::Value>(&config, "DeleteMetricRule", api_params).await {
        Ok(response) => {
            if response.success {
                Ok(CloudServiceResult {
                    success: true,
                    data: Some(true),
                    message: Some("告警规则删除成功".to_string()),
                    error: None,
                })
            } else {
                Ok(CloudServiceResult {
                    success: false,
                    data: None,
                    message: None,
                    error: Some(response.message.unwrap_or_else(|| "删除告警规则失败".to_string())),
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
