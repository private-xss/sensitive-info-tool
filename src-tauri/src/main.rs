// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod oss;
mod cloud_services;
mod wxapkg;

use oss::*;
use cloud_services::*;
use wxapkg::*;
use std::path::PathBuf;
use std::fs;

// 获取用户家目录
#[tauri::command]
fn get_home_dir() -> Result<String, String> {
    match dirs::home_dir() {
        Some(path) => Ok(path.to_string_lossy().to_string()),
        None => Err("无法获取用户家目录".to_string()),
    }
}

// 获取数据目录
#[tauri::command]
fn get_data_dir() -> Result<String, String> {
    match dirs::home_dir() {
        Some(home) => {
            let data_dir = home.join(".sensitive-info-tool");
            Ok(data_dir.to_string_lossy().to_string())
        },
        None => Err("无法获取用户家目录".to_string()),
    }
}

// 确保数据目录存在
#[tauri::command]
fn ensure_data_dir() -> Result<(), String> {
    match dirs::home_dir() {
        Some(home) => {
            let data_dir = home.join(".sensitive-info-tool");
            if !data_dir.exists() {
                fs::create_dir_all(&data_dir)
                    .map_err(|e| format!("创建数据目录失败: {}", e))?;
            }
            Ok(())
        },
        None => Err("无法获取用户家目录".to_string()),
    }
}

// 写入数据文件
#[tauri::command]
fn write_data_file(file_path: String, data: String) -> Result<(), String> {
    // 确保父目录存在
    if let Some(parent) = PathBuf::from(&file_path).parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("创建目录失败: {}", e))?;
    }
    
    fs::write(&file_path, data)
        .map_err(|e| format!("写入文件失败: {}", e))?;
    
    Ok(())
}

// 读取数据文件
#[tauri::command]
fn read_data_file(file_path: String) -> Result<String, String> {
    fs::read_to_string(&file_path)
        .map_err(|e| format!("读取文件失败: {}", e))
}

// 删除数据文件
#[tauri::command]
fn delete_data_file(file_path: String) -> Result<(), String> {
    fs::remove_file(&file_path)
        .map_err(|e| format!("删除文件失败: {}", e))?;
    Ok(())
}

// 列出数据文件
#[tauri::command]
fn list_data_files() -> Result<Vec<String>, String> {
    match dirs::home_dir() {
        Some(home) => {
            let data_dir = home.join(".sensitive-info-tool");
            if !data_dir.exists() {
                return Ok(vec![]);
            }
            
            let mut files = Vec::new();
            if let Ok(entries) = fs::read_dir(&data_dir) {
                for entry in entries {
                    if let Ok(entry) = entry {
                        if let Some(file_name) = entry.file_name().to_str() {
                            if file_name.ends_with(".json") {
                                let key = file_name.trim_end_matches(".json");
                                files.push(key.to_string());
                            }
                        }
                    }
                }
            }
            Ok(files)
        },
        None => Err("无法获取用户家目录".to_string()),
    }
}

// ===== wxapkg 反编译相关命令 =====

/// 获取默认微信小程序包路径
#[tauri::command]
fn wxapkg_get_default_path() -> Result<String, String> {
    Ok(get_default_wxapkg_path())
}

/// 列出所有微信用户的 applet/packages 路径
#[tauri::command]
fn wxapkg_list_user_paths() -> Vec<String> {
    list_wxapkg_user_paths()
}

/// 扫描目录下所有 wxapkg 文件
#[tauri::command]
fn wxapkg_scan_files(dir: String) -> Result<Vec<String>, String> {
    scan_wxapkg_files(&dir)
}

/// 处理单个 wxapkg 文件 (解密+解包)
#[tauri::command]
fn wxapkg_process(
    file_path: String,
    output_base: String,
) -> Result<WxapkgInfo, String> {
    process_wxapkg(&file_path, &output_base)
}

/// 扫描解包后的目录，提取 API 和敏感信息
#[tauri::command]
fn wxapkg_scan_sensitive(dir: String) -> Result<(Vec<ApiEndpoint>, Vec<SensitiveMatch>), String> {
    scan_directory(&dir)
}

/// 完整反编译: 解密+解包+敏感信息扫描
#[tauri::command]
fn wxapkg_decompile(
    file_path: String,
    output_base: String,
) -> Result<DecompileResult, String> {
    let info = process_wxapkg(&file_path, &output_base)?;
    
    let output_dir = std::path::PathBuf::from(&output_base)
        .join(&info.app_id)
        .join(
            std::path::Path::new(&file_path)
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default()
                .trim_end_matches(".wxapkg")
        );
    
    let (api_endpoints, sensitive_matches) = scan_directory(output_dir.to_string_lossy().as_ref())?;
    
    Ok(DecompileResult {
        info,
        api_endpoints,
        sensitive_matches,
        output_dir: output_dir.to_string_lossy().to_string(),
    })
}

/// 批量反编译: 扫描目录下所有 wxapkg 并处理
#[tauri::command]
fn wxapkg_batch_decompile(
    dir: String,
    output_base: String,
) -> Result<BatchScanResult, String> {
    let files = scan_wxapkg_files(&dir)?;
    let mut packages = Vec::new();
    let mut results = Vec::new();
    let mut errors = Vec::new();
    
    for file_path in &files {
        match process_wxapkg(file_path, &output_base) {
            Ok(info) => {
                let output_dir = std::path::PathBuf::from(&output_base)
                    .join(&info.app_id)
                    .join(
                        std::path::Path::new(file_path)
                            .file_name()
                            .map(|n| n.to_string_lossy().to_string())
                            .unwrap_or_default()
                            .trim_end_matches(".wxapkg")
                    );
                
                match scan_directory(output_dir.to_string_lossy().as_ref()) {
                    Ok((api_endpoints, sensitive_matches)) => {
                        results.push(DecompileResult {
                            info: info.clone(),
                            api_endpoints,
                            sensitive_matches,
                            output_dir: output_dir.to_string_lossy().to_string(),
                        });
                    }
                    Err(e) => {
                        errors.push(format!("{}: 扫描敏感信息失败: {}", file_path, e));
                    }
                }
                packages.push(info);
            }
            Err(e) => {
                errors.push(format!("{}: 处理失败: {}", file_path, e));
            }
        }
    }
    
    Ok(BatchScanResult {
        packages,
        results,
        errors,
    })
}


fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            // OSS
            oss_list_objects,
            oss_list_buckets,
            oss_upload_file,
            oss_download_file,
            oss_delete_file,
            oss_create_folder,
            // 文件操作
            get_home_dir,
            get_data_dir,
            ensure_data_dir,
            write_data_file,
            read_data_file,
            delete_data_file,
            list_data_files,
            // 阿里云云服务
            aliyun_test_connection,
            aliyun_take_over_console,
            aliyun_cancel_console_takeover,
            aliyun_execute_remote_command,
            aliyun_get_command_history,
            aliyun_get_sub_users,
            aliyun_get_ecs_instances,
            aliyun_get_database_instances,
            aliyun_get_alarm_info,
            aliyun_create_database_instance,
            aliyun_delete_database_instance,
            aliyun_create_alarm_rule,
            aliyun_delete_alarm_rule,
            // 腾讯云云服务
            tencent_take_over_console,
            tencent_cancel_console_takeover,
            tencent_execute_remote_command,
            tencent_get_sub_users,
            tencent_create_sub_user,
            tencent_delete_sub_user,
            tencent_update_sub_user_permissions,
            // 华为云云服务
            huawei_take_over_console,
            huawei_cancel_console_takeover,
            huawei_get_sub_users,
            huawei_create_sub_user,
            huawei_delete_sub_user,
            huawei_update_sub_user_permissions,
            // UCloud云服务
            ucloud_take_over_console,
            ucloud_cancel_console_takeover,
            ucloud_get_hosts,
            ucloud_get_sub_users,
            ucloud_get_main_user,
            ucloud_get_orders,
            ucloud_create_host,
            ucloud_delete_host,
            ucloud_start_host,
            ucloud_stop_host,
            // AWS云服务
            aws_take_over_console,
            aws_cancel_console_takeover,
            aws_create_backdoor,
            aws_get_backdoors,
            aws_delete_backdoor,
            aws_get_sub_users,
            aws_get_policies,
            aws_create_policy,
            aws_delete_policy,
            aws_attach_policy_to_user,
            aws_detach_policy_from_user,
            // wxapkg 反编译
            wxapkg_get_default_path,
            wxapkg_list_user_paths,
            wxapkg_scan_files,
            wxapkg_process,
            wxapkg_scan_sensitive,
            wxapkg_decompile,
            wxapkg_batch_decompile,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
