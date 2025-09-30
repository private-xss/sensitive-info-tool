// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod oss;

use oss::*;
use std::path::PathBuf;
use std::fs;
use std::io::Write;
use tauri::Manager;

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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
