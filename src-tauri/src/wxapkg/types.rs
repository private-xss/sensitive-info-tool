use serde::{Deserialize, Serialize};

/// wxapkg 文件条目
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WxapkgFileEntry {
    pub name: String,
    pub offset: u32,
    pub size: u32,
}

/// 扫描到的小程序包信息
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WxapkgInfo {
    /// 文件路径
    pub file_path: String,
    /// 小程序 AppID
    pub app_id: String,
    /// 小程序名称
    pub app_name: String,
    /// 包类型: "主包" 或 "分包"
    pub package_type: String,
    /// 文件大小
    pub file_size: u64,
    /// 是否加密
    pub encrypted: bool,
    /// 包内文件数量
    pub file_count: u32,
    /// 包内文件列表
    pub files: Vec<WxapkgFileEntry>,
}

/// 敏感信息匹配结果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SensitiveMatch {
    /// 匹配类型
    pub match_type: String,
    /// 匹配内容
    pub content: String,
    /// 所在文件
    pub file_path: String,
    /// 行号 (1-based)
    pub line_number: u32,
}

/// API 接口提取结果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiEndpoint {
    /// API URL/路径
    pub url: String,
    /// 所在文件
    pub file_path: String,
    /// 行号
    pub line_number: u32,
}

/// 反编译完整结果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DecompileResult {
    /// 小程序信息
    pub info: WxapkgInfo,
    /// 提取的 API 接口
    pub api_endpoints: Vec<ApiEndpoint>,
    /// 敏感信息匹配
    pub sensitive_matches: Vec<SensitiveMatch>,
    /// 解包输出目录
    pub output_dir: String,
}

/// 批量扫描结果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchScanResult {
    /// 扫描到的小程序包
    pub packages: Vec<WxapkgInfo>,
    /// 所有反编译结果
    pub results: Vec<DecompileResult>,
    /// 错误信息
    pub errors: Vec<String>,
}
