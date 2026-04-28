use crate::wxapkg::types::*;
use regex::Regex;
use std::fs;
use std::path::Path;

/// API 提取正则 (匹配引号包裹的 URL/路径)
const API_PATTERN: &str = r#"(?:"|')(((?:[a-zA-Z]{1,10}://|//)[^"'/]{1,}\.([a-zA-Z]{2,})[^"']{0,})|((?:/|\.\./|\./)[^"'><,;| *()(%%$^/\\\[\]][^"'><,;|()]{1,})|([a-zA-Z0-9_\-/]{1,}/[a-zA-Z0-9_\-/]{1,}\.(?:[a-zA-Z]{1,4}|action)(?:[\?|/][^"|']{0,}|))|([a-zA-Z0-9_\-]{1,}\.(?:php|asp|aspx|jsp|json|action|html|js|txt|xml)(?:\?[^"|']{0,}|)))(?:"|')"#;

/// 前缀黑名单
const PREFIX_BLACKLIST: &[&str] = &[
    "pages/", "components/", "static/", "uni_modules/",
    "uview-ui/", "uview-plus/", "package/",
];

/// 后缀黑名单 (无参数 URL)
const SUFFIX_BLACKLIST: &[&str] = &[
    "js", "jpg", "png", "jpeg", "gif", "svg", "wxml", "wxss",
];

/// 敏感信息正则定义
struct SensitivePattern {
    name: &'static str,
    pattern: &'static str,
}

const SENSITIVE_PATTERNS: &[SensitivePattern] = &[
    SensitivePattern {
        name: "AppSecret",
        pattern: r#"(?i)\b\w*secret\b"#,
    },
    SensitivePattern {
        name: "session_key",
        pattern: r#"(?i)\bsession_key\b"#,
    },
    SensitivePattern {
        name: "AccessKey",
        pattern: r#"(?i)\b(?:access_?key|accesskey|ak)\b"#,
    },
    SensitivePattern {
        name: "SecretKey",
        pattern: r#"(?i)\b(?:secret_?key|secretkey|sk)\b"#,
    },
    SensitivePattern {
        name: "AppID",
        pattern: r#"\bwx[a-f0-9]{16}\b"#,
    },
    SensitivePattern {
        name: "Token",
        pattern: r#"(?i)\b(?:access_?token|refresh_?token|auth_?token|bearer)\b"#,
    },
    SensitivePattern {
        name: "手机号",
        pattern: r"1[3-9]\d{9}",
    },
    SensitivePattern {
        name: "身份证号",
        pattern: r"\b\d{17}([0-9]|X|x)\b",
    },
    SensitivePattern {
        name: "邮箱",
        pattern: r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,4}",
    },
    SensitivePattern {
        name: "OSS Endpoint",
        pattern: r#"(?i)https?://[a-z0-9\-]+\.(oss|cos|obs|s3)\.[a-z0-9\.\-]+"#,
    },
    SensitivePattern {
        name: "私钥",
        pattern: r"-----BEGIN (?:RSA |EC )?PRIVATE KEY-----",
    },
    SensitivePattern {
        name: "密码字段",
        pattern: r#"(?i)\b(?:password|passwd|pwd)\s*[:=]\s*["\']?[^"\'\s,}]{4,}"#,
    },
    SensitivePattern {
        name: "API Key",
        pattern: r#"(?i)\b(?:api_?key|apikey)\s*[:=]\s*["\']?[^"\'\s,}]{4,}"#,
    },
    SensitivePattern {
        name: "JWT",
        pattern: r"eyJ[A-Za-z0-9_\-]+\.eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+",
    },
];

/// 扫描解包后的目录，提取 API 接口和敏感信息
pub fn scan_directory(dir: &str) -> Result<(Vec<ApiEndpoint>, Vec<SensitiveMatch>), String> {
    let path = Path::new(dir);
    if !path.exists() {
        return Err(format!("目录不存在: {}", dir));
    }
    
    let mut api_endpoints = Vec::new();
    let mut sensitive_matches = Vec::new();
    
    // 编译正则
    let api_re = Regex::new(API_PATTERN)
        .map_err(|e| format!("编译 API 正则失败: {}", e))?;
    
    let mut sensitive_res: Vec<(&str, Regex)> = Vec::new();
    for sp in SENSITIVE_PATTERNS {
        if let Ok(re) = Regex::new(sp.pattern) {
            sensitive_res.push((sp.name, re));
        }
    }
    
    // 递归扫描
    scan_files_recursive(path, path, &api_re, &sensitive_res, &mut api_endpoints, &mut sensitive_matches)?;
    
    // 去重 API
    api_endpoints.sort_by(|a, b| a.url.cmp(&b.url));
    api_endpoints.dedup_by(|a, b| a.url == b.url);
    
    Ok((api_endpoints, sensitive_matches))
}

fn scan_files_recursive(
    dir: &Path,
    base: &Path,
    api_re: &Regex,
    sensitive_res: &[(&str, Regex)],
    api_endpoints: &mut Vec<ApiEndpoint>,
    sensitive_matches: &mut Vec<SensitiveMatch>,
) -> Result<(), String> {
    let entries = fs::read_dir(dir)
        .map_err(|e| format!("读取目录失败: {}", e))?;
    
    for entry in entries {
        let entry = entry.map_err(|e| format!("读取目录项失败: {}", e))?;
        let path = entry.path();
        
        if path.is_dir() {
            scan_files_recursive(&path, base, api_re, sensitive_res, api_endpoints, sensitive_matches)?;
            continue;
        }
        
        // 只扫描文本文件
        let ext = path.extension()
            .map(|e| e.to_string_lossy().to_lowercase())
            .unwrap_or_default();
        
        if !is_text_file(&ext) {
            continue;
        }
        
        // 读取文件内容
        let content = match fs::read_to_string(&path) {
            Ok(c) => c,
            Err(_) => continue,
        };
        
        let relative_path = path.strip_prefix(base)
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| path.to_string_lossy().to_string());
        
        // 提取 API 接口
        extract_apis(&content, &relative_path, api_re, api_endpoints);
        
        // 检测敏感信息
        detect_sensitive(&content, &relative_path, sensitive_res, sensitive_matches);
    }
    
    Ok(())
}

fn is_text_file(ext: &str) -> bool {
    matches!(ext,
        "js" | "json" | "wxml" | "wxss" | "wxs" |
        "html" | "css" | "xml" | "yaml" | "yml" |
        "txt" | "md" | "csv" | "tsv" |
        "ts" | "tsx" | "jsx" | "vue" | "svelte" |
        "py" | "rb" | "php" | "java" | "go" | "rs" |
        "c" | "cpp" | "h" | "hpp" |
        "sh" | "bash" | "zsh" | "bat" | "cmd" |
        "sql" | "graphql" | "gql" |
        "conf" | "cfg" | "ini" | "toml" | "env" |
        "pem" | "key" | "cert"
    )
}

fn extract_apis(
    content: &str,
    file_path: &str,
    api_re: &Regex,
    results: &mut Vec<ApiEndpoint>,
) {
    for line in content.lines().enumerate() {
        let line_num = line.0 as u32 + 1;
        let line_text = line.1;
        
        for cap in api_re.captures_iter(line_text) {
            // 提取第一个非空的分组 (分组1包含完整匹配, 分组2-5是子匹配)
            let url = cap.get(1)
                .map(|m| m.as_str().to_string())
                .unwrap_or_default();
            
            if url.is_empty() || url.len() < 4 {
                continue;
            }
            
            // 前缀黑名单过滤
            let url_lower = url.to_lowercase();
            let mut blocked = false;
            for prefix in PREFIX_BLACKLIST {
                if url_lower.starts_with(prefix) {
                    blocked = true;
                    break;
                }
            }
            if blocked {
                continue;
            }
            
            // 后缀黑名单过滤 (无参数 URL)
            if !url.contains('?') && !url.contains('&') {
                if let Some(dot_pos) = url.rfind('.') {
                    let suffix = &url[dot_pos + 1..];
                    if SUFFIX_BLACKLIST.contains(&suffix.to_lowercase().as_str()) {
                        continue;
                    }
                }
            }
            
            results.push(ApiEndpoint {
                url,
                file_path: file_path.to_string(),
                line_number: line_num,
            });
        }
    }
}

fn detect_sensitive(
    content: &str,
    file_path: &str,
    patterns: &[(&str, Regex)],
    results: &mut Vec<SensitiveMatch>,
) {
    for line in content.lines().enumerate() {
        let line_num = line.0 as u32 + 1;
        let line_text = line.1;
        
        for (name, re) in patterns {
            for m in re.find_iter(line_text) {
                let matched = m.as_str();
                
                // 过滤太短的匹配 (手机号、身份证等需要足够长度)
                if matched.len() < 3 {
                    continue;
                }
                
                // 过滤明显的假值
                if is_placeholder(matched) {
                    continue;
                }
                
                results.push(SensitiveMatch {
                    match_type: name.to_string(),
                    content: truncate(matched, 200),
                    file_path: file_path.to_string(),
                    line_number: line_num,
                });
            }
        }
    }
}

/// 判断是否为占位符/模板值
fn is_placeholder(value: &str) -> bool {
    let lower = value.to_lowercase();
    lower.contains("your_")
        || lower.contains("example")
        || lower.contains("placeholder")
        || lower.contains("xxx")
        || lower.contains("***")
        || lower.contains("change_me")
        || lower.contains("<your")
        || lower.contains("${")
}

/// 截断字符串
fn truncate(s: &str, max_len: usize) -> String {
    if s.len() <= max_len {
        s.to_string()
    } else {
        format!("{}...", &s[..max_len])
    }
}
