# Design Document

## Overview

本设计文档描述微信小程序反编译器的技术架构和实现方案。该功能将在 Tauri 后端（Rust）实现核心解析逻辑，前端（Vue）提供用户界面。

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Vue)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ ScannerView │  │ DecompileView│  │ SensitiveInfoView  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Tauri IPC
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Rust)                            │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  PathScanner    │  │  WxapkgParser   │                   │
│  │  - Windows路径   │  │  - 二进制解析    │                   │
│  │  - macOS路径     │  │  - 文件提取      │                   │
│  └─────────────────┘  └─────────────────┘                   │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  CodeRestorer   │  │ SensitiveScanner│                   │
│  │  - WXML还原     │  │  - 正则匹配      │                   │
│  │  - WXSS还原     │  │  - 模式识别      │                   │
│  │  - JS美化       │  │  - 结果聚合      │                   │
│  └─────────────────┘  └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. PathScanner (路径扫描器)

负责自动检测和扫描微信小程序缓存目录。

```rust
pub struct PathScanner;

impl PathScanner {
    /// 获取当前操作系统的所有可能的小程序缓存路径
    pub fn get_wechat_applet_paths() -> Vec<PathBuf>;
    
    /// 扫描指定路径下的所有 wxapkg 文件
    pub fn scan_wxapkg_files(paths: &[PathBuf]) -> Vec<WxapkgInfo>;
    
    /// 根据 AppID 分组 wxapkg 文件（识别主包和分包）
    pub fn group_by_appid(files: Vec<WxapkgInfo>) -> HashMap<String, AppPackages>;
}

pub struct WxapkgInfo {
    pub path: PathBuf,
    pub app_id: String,
    pub app_name: Option<String>,  // 小程序名称（如果能获取）
    pub size: u64,
    pub modified_time: DateTime<Utc>,
    pub is_subpackage: bool,
    pub subpackage_name: Option<String>,
}

pub struct AppPackages {
    pub app_id: String,
    pub app_name: Option<String>,
    pub main_package: Option<WxapkgInfo>,
    pub sub_packages: Vec<WxapkgInfo>,
}

/// 批量反编译管理器
pub struct BatchDecompiler;

impl BatchDecompiler {
    /// 批量反编译多个小程序
    pub fn decompile_batch(
        apps: Vec<AppPackages>,
        output_base_dir: &Path,
        progress_callback: impl Fn(BatchProgress),
    ) -> BatchResult;
    
    /// 反编译单个小程序
    pub fn decompile_single(
        app: &AppPackages,
        output_dir: &Path,
    ) -> Result<DecompileResult, DecompilerError>;
}

pub struct BatchProgress {
    pub current: u32,
    pub total: u32,
    pub current_app_id: String,
    pub status: BatchStatus,
}

pub enum BatchStatus {
    Processing,
    Success,
    Failed(String),
}

pub struct BatchResult {
    pub total: u32,
    pub success_count: u32,
    pub failure_count: u32,
    pub results: Vec<(String, Result<DecompileResult, DecompilerError>)>,
    pub total_sensitive_findings: u32,
}

pub struct DecompileResult {
    pub app_id: String,
    pub output_dir: PathBuf,
    pub extracted_files: u32,
    pub restored_wxml: u32,
    pub restored_wxss: u32,
    pub beautified_js: u32,
    pub sensitive_matches: Vec<SensitiveMatch>,
}
```

### 2. WxapkgParser (wxapkg 解析器)

负责解析 wxapkg 二进制格式并提取文件。

```rust
pub struct WxapkgParser;

impl WxapkgParser {
    /// 解析 wxapkg 文件头
    pub fn parse_header(data: &[u8]) -> Result<WxapkgHeader, ParseError>;
    
    /// 解析文件索引
    pub fn parse_file_index(data: &[u8], header: &WxapkgHeader) -> Result<Vec<FileEntry>, ParseError>;
    
    /// 提取所有文件到指定目录
    pub fn extract_all(data: &[u8], output_dir: &Path) -> Result<Vec<ExtractedFile>, ParseError>;
}

pub struct WxapkgHeader {
    pub magic: u8,           // 首字节标识 (0xBE)
    pub version: u32,        // 版本号
    pub index_length: u32,   // 索引段长度
    pub body_length: u32,    // 数据段长度
    pub file_count: u32,     // 文件数量
}

pub struct FileEntry {
    pub name: String,
    pub offset: u32,
    pub size: u32,
}
```

### 3. CodeRestorer (代码还原器)

负责将编译后的代码还原为可读格式。

```rust
pub struct CodeRestorer;

impl CodeRestorer {
    /// 还原 WXML 模板
    pub fn restore_wxml(app_service_js: &str) -> Result<HashMap<String, String>, RestoreError>;
    
    /// 还原 WXSS 样式
    pub fn restore_wxss(app_wxss_js: &str) -> Result<HashMap<String, String>, RestoreError>;
    
    /// 美化 JavaScript 代码
    pub fn beautify_js(code: &str) -> Result<String, RestoreError>;
}
```

### 4. SensitiveScanner (敏感信息扫描器)

负责扫描代码中的敏感信息。

```rust
pub struct SensitiveScanner;

impl SensitiveScanner {
    /// 扫描文件中的敏感信息
    pub fn scan_file(content: &str, file_path: &str) -> Vec<SensitiveMatch>;
    
    /// 扫描整个项目
    pub fn scan_project(project_dir: &Path) -> ScanReport;
}

pub struct SensitiveMatch {
    pub category: SensitiveCategory,
    pub value: String,
    pub file_path: String,
    pub line_number: u32,
    pub context: String,        // 上下文代码片段
    pub confidence: f32,        // 置信度 0.0-1.0
}

pub enum SensitiveCategory {
    ApiEndpoint,        // API 接口地址
    EncryptionKey,      // 加密密钥 (AES key, IV, secret)
    PhoneNumber,        // 手机号
    IdCardNumber,       // 身份证号
    EncryptionAlgo,     // 加密算法使用 (AES, DES, RSA, MD5, SHA)
    Credential,         // 凭证 (password, token, apikey)
    PrivateKey,         // 私钥
    DatabaseConn,       // 数据库连接串
    CloudConfig,        // 云服务配置 (AppID, AppSecret)
}

pub struct ScanReport {
    pub total_files: u32,
    pub scanned_files: u32,
    pub matches: Vec<SensitiveMatch>,
    pub statistics: HashMap<SensitiveCategory, u32>,
}
```

## Data Models

### wxapkg 文件格式

```
┌──────────────────────────────────────────────────────────┐
│ Header (14 bytes)                                         │
│ ┌─────────┬─────────┬─────────┬─────────┬─────────┐      │
│ │ Magic   │ Version │ IdxLen  │ BodyLen │ FileCount│      │
│ │ 1 byte  │ 4 bytes │ 4 bytes │ 4 bytes │ 4 bytes │      │
│ │ (0xBE)  │ (LE)    │ (LE)    │ (LE)    │ (LE)    │      │
│ └─────────┴─────────┴─────────┴─────────┴─────────┘      │
├──────────────────────────────────────────────────────────┤
│ File Index (variable length)                              │
│ For each file:                                            │
│ ┌─────────┬─────────────────┬─────────┬─────────┐        │
│ │ NameLen │ FileName        │ Offset  │ Size    │        │
│ │ 4 bytes │ NameLen bytes   │ 4 bytes │ 4 bytes │        │
│ └─────────┴─────────────────┴─────────┴─────────┘        │
├──────────────────────────────────────────────────────────┤
│ File Data (variable length)                               │
│ Raw file contents concatenated                            │
└──────────────────────────────────────────────────────────┘
```

### 敏感信息检测规则

| 类别 | 正则模式 | 示例 |
|------|---------|------|
| API Endpoint | `https?://[^\s"'<>]+` | `https://api.example.com/v1/` |
| AES Key | `['"](key\|aeskey\|secretkey)['"]\s*[:=]\s*['"][A-Za-z0-9+/=]{16,}['"]` | `key: "abc123..."` |
| AES IV | `['"](iv\|aesiv)['"]\s*[:=]\s*['"][A-Za-z0-9+/=]{16,}['"]` | `iv: "1234567890123456"` |
| Phone Number | `1[3-9]\d{9}` | `13812345678` |
| ID Card | `[1-9]\d{5}(19\|20)\d{2}(0[1-9]\|1[0-2])(0[1-9]\|[12]\d\|3[01])\d{3}[\dXx]` | `110101199001011234` |
| Encryption Algo | `(AES\|DES\|RSA\|MD5\|SHA\|HMAC)\.(encrypt\|decrypt\|sign)` | `AES.encrypt(...)` |
| Password | `['"](password\|passwd\|pwd)['"]\s*[:=]\s*['"][^'"]+['"]` | `password: "123456"` |
| Token | `['"](token\|access_token\|api_key\|apikey\|secret)['"]\s*[:=]\s*['"][^'"]+['"]` | `token: "eyJ..."` |
| AppSecret | `['"](appsecret\|app_secret\|appkey)['"]\s*[:=]\s*['"][a-f0-9]{32}['"]` | `appsecret: "abc..."` |


## Error Handling

### 错误类型定义

```rust
#[derive(Debug, thiserror::Error)]
pub enum DecompilerError {
    #[error("无效的 wxapkg 文件: {0}")]
    InvalidWxapkg(String),
    
    #[error("文件读取失败: {0}")]
    IoError(#[from] std::io::Error),
    
    #[error("解析失败: {0}")]
    ParseError(String),
    
    #[error("WXML 还原失败: {0}")]
    WxmlRestoreError(String),
    
    #[error("WXSS 还原失败: {0}")]
    WxssRestoreError(String),
    
    #[error("未找到微信小程序缓存目录")]
    CacheNotFound,
    
    #[error("不支持的操作系统")]
    UnsupportedOS,
}
```

### 错误处理策略

1. **文件级容错** - 单个文件解析失败不影响其他文件
2. **详细日志** - 记录所有错误和警告信息
3. **用户友好提示** - 将技术错误转换为用户可理解的消息

## Testing Strategy

### 单元测试

- wxapkg 头部解析测试
- 文件索引解析测试
- 敏感信息正则匹配测试
- 路径检测测试（模拟不同操作系统）

### 属性测试

- 解析后重新打包应保持文件完整性
- 敏感信息扫描应覆盖所有定义的模式

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system.*

### Property 1: wxapkg 解析完整性

*For any* valid wxapkg file, parsing and extracting all files SHALL produce the exact same file count as declared in the header.

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 2: 敏感信息检测覆盖率

*For any* JavaScript code containing known sensitive patterns, the SensitiveScanner SHALL detect and categorize them correctly with confidence >= 0.8.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6**

### Property 3: 路径扫描一致性

*For any* operating system (Windows/macOS), the PathScanner SHALL return consistent results for the same file system state.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 4: 分包合并正确性

*For any* mini-program with subpackages, merging main package and subpackages SHALL produce a complete project structure without file conflicts.

**Validates: Requirements 7.1, 7.2, 7.3**

### Property 5: 代码还原可读性

*For any* successfully restored WXML/WXSS/JS file, the output SHALL be syntactically valid and human-readable.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4**

### Property 6: 批量反编译隔离性

*For any* batch decompilation of N mini-programs, each mini-program SHALL be processed independently, and failure of one SHALL NOT affect the processing of others.

**Validates: Requirements 9.4, 9.5, 9.6**

### Property 7: 批量反编译完整性

*For any* batch decompilation, the sum of success_count and failure_count SHALL equal the total number of selected mini-programs.

**Validates: Requirements 9.7**
