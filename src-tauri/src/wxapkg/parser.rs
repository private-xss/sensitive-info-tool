use crate::wxapkg::types::*;
use crate::wxapkg::decrypt;
use regex::Regex;
use serde_json;
use std::fs;
use std::path::{Path, PathBuf};

/// wxapkg 文件头标记
const WXAPKG_MARK1: u8 = 0xBE;
const WXAPKG_MARK2: u8 = 0xED;

/// 大端序读取 u32
fn read_u32_be(data: &[u8], offset: usize) -> Result<u32, String> {
    if offset + 4 > data.len() {
        return Err(format!("读取 u32 越界: offset={}, len={}", offset, data.len()));
    }
    Ok(((data[offset] as u32) << 24)
        | ((data[offset + 1] as u32) << 16)
        | ((data[offset + 2] as u32) << 8)
        | (data[offset + 3] as u32))
}

/// 解析 wxapkg 文件，返回文件条目列表
pub fn parse_wxapkg(data: &[u8]) -> Result<(u32, Vec<WxapkgFileEntry>), String> {
    if data.len() < 18 {
        return Err("wxapkg 数据太短".to_string());
    }
    
    if data[0] != WXAPKG_MARK1 {
        return Err(format!("wxapkg 头标记1错误: 0x{:02X}, 期望 0xBE", data[0]));
    }
    
    if data[13] != WXAPKG_MARK2 {
        return Err(format!("wxapkg 头标记2错误: 0x{:02X}, 期望 0xED", data[13]));
    }
    
    let file_count = read_u32_be(data, 14)?;
    if file_count == 0 || file_count > 100000 {
        return Err(format!("wxapkg 文件数量异常: {}", file_count));
    }
    
    let mut entries = Vec::with_capacity(file_count as usize);
    let mut offset = 18;
    
    for _ in 0..file_count {
        if offset + 4 > data.len() {
            return Err("读取文件名长度越界".to_string());
        }
        
        let name_len = read_u32_be(data, offset)? as usize;
        if name_len > 10_485_760 {
            return Err(format!("文件名长度异常: {}", name_len));
        }
        offset += 4;
        
        if offset + name_len > data.len() {
            return Err("读取文件名越界".to_string());
        }
        let name = String::from_utf8_lossy(&data[offset..offset + name_len]).to_string();
        offset += name_len;
        
        if offset + 8 > data.len() {
            return Err("读取文件偏移/大小越界".to_string());
        }
        let file_offset = read_u32_be(data, offset)?;
        let file_size = read_u32_be(data, offset + 4)?;
        offset += 8;
        
        entries.push(WxapkgFileEntry {
            name,
            offset: file_offset,
            size: file_size,
        });
    }
    
    Ok((file_count, entries))
}

/// 从文件路径提取 AppID (wx + 16位hex)
pub fn extract_app_id(path: &str) -> Option<String> {
    let re = Regex::new(r"\bwx[a-f0-9]{16}\b").ok()?;
    re.find(path).map(|m| m.as_str().to_string())
}

/// 判断包类型
pub fn get_package_type(file_name: &str) -> String {
    if file_name == "__APP__.wxapkg" {
        "主包".to_string()
    } else {
        "分包".to_string()
    }
}

/// 解包 wxapkg 到指定目录
pub fn unpack_wxapkg(data: &[u8], output_dir: &Path) -> Result<Vec<WxapkgFileEntry>, String> {
    let (_file_count, entries) = parse_wxapkg(data)?;
    
    fs::create_dir_all(output_dir)
        .map_err(|e| format!("创建输出目录失败: {}", e))?;
    
    for entry in &entries {
        let file_path = output_dir.join(entry.name.trim_start_matches('/'));
        
        // 创建父目录
        if let Some(parent) = file_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("创建目录失败: {}", e))?;
        }
        
        // 写出文件数据
        let start = entry.offset as usize;
        let end = start + entry.size as usize;
        if end <= data.len() {
            fs::write(&file_path, &data[start..end])
                .map_err(|e| format!("写入文件失败 {}: {}", entry.name, e))?;
        }
    }
    
    Ok(entries)
}

/// 从解包目录的 app.json 中读取小程序名称
fn read_app_name(output_dir: &Path) -> String {
    let app_json_path = output_dir.join("app.json");
    if let Ok(content) = fs::read_to_string(&app_json_path) {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(name) = json.get("appName").or_else(|| json.get("name")).and_then(|v| v.as_str()) {
                if !name.is_empty() {
                    return name.to_string();
                }
            }
        }
    }
    String::new()
}

/// 完整处理一个 wxapkg 文件: 解密 + 解包
pub fn process_wxapkg(
    file_path: &str,
    output_base: &str,
) -> Result<WxapkgInfo, String> {
    let raw_data = fs::read(file_path)
        .map_err(|e| format!("读取文件失败: {}", e))?;
    
    let file_name = Path::new(file_path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();
    
    let app_id = extract_app_id(file_path)
        .ok_or_else(|| format!("无法从路径提取 AppID: {}", file_path))?;
    
    let package_type = get_package_type(&file_name);
    let file_size = raw_data.len() as u64;
    let encrypted = decrypt::is_encrypted_wxapkg(&raw_data);
    
    // 解密
    let wxapkg_data = if encrypted {
        decrypt::decrypt_v1mmwx(&raw_data, &app_id)?
    } else {
        raw_data.clone()
    };
    
    // 解析
    let (file_count, entries) = parse_wxapkg(&wxapkg_data)?;
    
    // 解包到输出目录
    let output_dir = PathBuf::from(output_base)
        .join(&app_id)
        .join(file_name.trim_end_matches(".wxapkg"));
    
    unpack_wxapkg(&wxapkg_data, &output_dir)?;
    
    // 读取小程序名称
    let app_name = read_app_name(&output_dir);
    
    Ok(WxapkgInfo {
        file_path: file_path.to_string(),
        app_id,
        app_name,
        package_type,
        file_size,
        encrypted,
        file_count,
        files: entries,
    })
}

/// 扫描目录下所有 wxapkg 文件
pub fn scan_wxapkg_files(dir: &str) -> Result<Vec<String>, String> {
    let mut result = Vec::new();
    let path = Path::new(dir);
    
    if !path.exists() {
        return Err(format!("目录不存在: {}", dir));
    }
    
    scan_recursive(path, &mut result)?;
    
    Ok(result)
}

fn scan_recursive(dir: &Path, result: &mut Vec<String>) -> Result<(), String> {
    let entries = fs::read_dir(dir)
        .map_err(|e| format!("读取目录失败: {}", e))?;
    
    for entry in entries {
        let entry = entry.map_err(|e| format!("读取目录项失败: {}", e))?;
        let path = entry.path();
        
        if path.is_dir() {
            scan_recursive(&path, result)?;
        } else if let Some(name) = path.file_name() {
            if name.to_string_lossy().to_lowercase().ends_with(".wxapkg") {
                result.push(path.to_string_lossy().to_string());
            }
        }
    }
    
    Ok(())
}

/// 获取所有可能的微信小程序包根路径 (macOS + Windows)
fn get_wxapkg_root_paths() -> Vec<std::path::PathBuf> {
    let mut paths = Vec::new();
    
    if let Some(home) = dirs::home_dir() {
        // macOS: ~/Library/Containers/com.tencent.xinWeChat/Data/Documents/app_data/radium/users
        let mac_path = home.join("Library/Containers/com.tencent.xinWeChat/Data/Documents/app_data/radium/users");
        if mac_path.exists() {
            paths.push(mac_path);
        }
        
        // Windows: C:\Users\{用户名}\AppData\Roaming\Tencent\xwechat\radium\Applet\packages
        // 注意: Windows 的 packages 目录直接包含 wxapkg 文件，没有 users 子目录
        let win_path = home.join("AppData/Roaming/Tencent/xwechat/radium/Applet/packages");
        if win_path.exists() {
            paths.push(win_path);
        }
        
        // Windows 备选路径 (部分版本): .../xwechat/files/radium/Applet/packages
        let win_path2 = home.join("AppData/Roaming/Tencent/xwechat/files/radium/Applet/packages");
        if win_path2.exists() {
            paths.push(win_path2);
        }
    }
    
    paths
}

/// 获取默认的微信小程序包路径
/// macOS: 自动找到第一个有 applet/packages 的用户目录
/// Windows: 直接返回 Applet/packages 目录
pub fn get_default_wxapkg_path() -> String {
    for root in get_wxapkg_root_paths() {
        // macOS 路径: root 是 users 目录，需要进入用户子目录
        if let Ok(entries) = fs::read_dir(&root) {
            for entry in entries.flatten() {
                let pkg_dir = entry.path().join("applet/packages");
                if pkg_dir.exists() {
                    return pkg_dir.to_string_lossy().to_string();
                }
            }
        }
        // Windows 路径: root 直接就是 packages 目录
        // 检查是否包含 .wxapkg 文件
        if let Ok(entries) = fs::read_dir(&root) {
            for entry in entries.flatten() {
                if let Some(name) = entry.file_name().to_str() {
                    if name.ends_with(".wxapkg") || entry.path().is_dir() {
                        return root.to_string_lossy().to_string();
                    }
                }
            }
        }
        // 没找到 wxapkg 文件，但目录存在，也返回
        return root.to_string_lossy().to_string();
    }
    String::new()
}

/// 列出所有微信用户的 applet/packages 路径
/// macOS: 每个用户一个路径
/// Windows: 直接返回 packages 目录
pub fn list_wxapkg_user_paths() -> Vec<String> {
    let mut result = Vec::new();
    
    for root in get_wxapkg_root_paths() {
        // macOS: root 是 users 目录，遍历用户子目录
        let mut found_user_dir = false;
        if let Ok(entries) = fs::read_dir(&root) {
            for entry in entries.flatten() {
                let pkg_dir = entry.path().join("applet/packages");
                if pkg_dir.exists() {
                    result.push(pkg_dir.to_string_lossy().to_string());
                    found_user_dir = true;
                }
            }
        }
        // Windows: root 直接就是 packages 目录
        if !found_user_dir {
            result.push(root.to_string_lossy().to_string());
        }
    }
    
    result
}
