# Requirements Document

## Introduction

本功能为敏感信息管理工具添加微信小程序反编译能力，支持自动扫描本地微信小程序缓存目录，解包 wxapkg 文件，还原源代码（WXML/WXSS/JS），并自动提取代码中的敏感信息（API接口、密钥、手机号、身份证号等）。

## Glossary

- **Decompiler**: 微信小程序反编译器模块
- **WxapkgParser**: wxapkg 文件解析器
- **CodeRestorer**: 代码还原器（WXML/WXSS/JS）
- **SensitiveScanner**: 敏感信息扫描器
- **MiniProgram**: 微信小程序实体

## Requirements

### Requirement 1: 自动扫描小程序缓存

**User Story:** As a security researcher, I want to automatically scan local WeChat mini-program cache directories, so that I can quickly find all cached mini-programs without manual searching.

#### Acceptance Criteria

1. WHEN the user clicks the scan button, THE Decompiler SHALL automatically detect the operating system and locate WeChat mini-program cache directories
2. WHEN scanning on Windows, THE Decompiler SHALL search in the following paths:
   - `%USERPROFILE%\Documents\WeChat Files\[wxid_xxx]\Applet\[appid]\`
   - `%USERPROFILE%\Documents\WeChat Files\Applet\`
   - `%APPDATA%\Tencent\WeChat\XPlugin\Plugins\appbrand\[version]\Applet\`
   - `%APPDATA%\Tencent\xwechat\radium\Applet\packages\`
3. WHEN scanning on macOS, THE Decompiler SHALL search in the following paths:
   - `~/Library/Containers/com.tencent.xinWeChat/Data/Library/Application Support/com.tencent.xinWeChat/[version]/[wxid]/Applet/`
   - `~/Library/Containers/com.tencent.xinWeChat/Data/.wxapplet/`
   - `~/Library/Application Support/微信web开发者工具/`
   - `~/Library/Containers/com.tencent.xinWeChat/Data/Documents/app_data/radium/Applet/packages/`
4. WHEN scanning, THE Decompiler SHALL recursively search for files with `.wxapkg` extension
5. WHEN wxapkg files are found, THE Decompiler SHALL display a list showing AppID (from folder name), mini-program name (if available), file size, last modified time, and package type (main/sub)
6. WHEN multiple mini-programs are found, THE Decompiler SHALL group them by AppID and display as a selectable list with checkboxes
7. WHEN no wxapkg files are found, THE Decompiler SHALL display a friendly message suggesting manual file selection or drag-and-drop
8. WHERE the user prefers manual selection, THE Decompiler SHALL provide a file picker to select wxapkg files directly

### Requirement 10: 自动获取 wxid 实现无人工干预反编译

**User Story:** As a security researcher, I want the decompiler to automatically find and use wxid for decryption, so that I can decompile encrypted wxapkg files without manual intervention.

#### Acceptance Criteria

1. WHEN scanning wxapkg files, THE PathScanner SHALL automatically detect and extract wxid from the directory structure
2. WHEN wxid is not found in the path, THE PathScanner SHALL search in common WeChat data directories for wxid
3. WHEN wxid is found, THE PathScanner SHALL associate it with the corresponding AppPackages for later decryption
4. WHEN decompiling V1MMWX encrypted files, THE WxapkgParser SHALL automatically use the associated wxid without user input
5. WHEN multiple wxids are found in the system, THE PathScanner SHALL try each wxid until decryption succeeds
6. IF automatic wxid detection fails, THEN THE Decompiler SHALL attempt decryption with all available wxids before reporting failure
7. WHEN all automatic decryption attempts fail, THE Decompiler SHALL provide a clear error message with instructions for manual wxid input

### Requirement 11: 自动获取小程序名称

**User Story:** As a security researcher, I want to see the mini-program names in the scan results, so that I can easily identify which mini-programs I want to analyze.

#### Acceptance Criteria

1. WHEN scanning wxapkg files, THE PathScanner SHALL attempt to extract mini-program name from multiple sources
2. WHEN extracting name, THE PathScanner SHALL check the following locations in order:
   - `app-config.json` in the same directory (field: `appname` or `window.navigationBarTitleText`)
   - `__APP__/app-config.json` subdirectory
   - `app.json` in the same directory (field: `window.navigationBarTitleText`)
   - `page-frame.html` for embedded app name
   - WeChat's local database or cache files containing app metadata
3. WHEN name is found in `app-config.json`, THE PathScanner SHALL extract from `appname` field or `window.navigationBarTitleText`
4. WHEN name cannot be extracted from files, THE PathScanner SHALL use AppID as fallback display name
5. WHEN decompilation completes, THE Decompiler SHALL attempt to extract name from decompiled `app.json` and update the display

### Requirement 9: 单选与批量反编译

**User Story:** As a security researcher, I want to select one or multiple mini-programs for decompilation, so that I can efficiently analyze multiple applications at once.

#### Acceptance Criteria

1. WHEN viewing the scanned mini-program list, THE Decompiler SHALL provide checkboxes for each mini-program to enable selection
2. WHEN the user selects a single mini-program, THE Decompiler SHALL enable the "Decompile" button for single decompilation
3. WHEN the user selects multiple mini-programs, THE Decompiler SHALL enable the "Batch Decompile" button for batch processing
4. WHEN batch decompiling, THE Decompiler SHALL process each mini-program sequentially and display progress (e.g., "Processing 3/10")
5. WHEN batch decompiling, THE Decompiler SHALL create separate output directories for each mini-program named by AppID
6. WHEN batch decompiling, THE Decompiler SHALL continue processing remaining mini-programs even if one fails
7. WHEN batch decompilation completes, THE Decompiler SHALL display a summary showing success count, failure count, and total sensitive findings
8. WHERE the user wants to select all mini-programs, THE Decompiler SHALL provide a "Select All" checkbox
9. WHERE the user wants to deselect all, THE Decompiler SHALL provide a "Deselect All" option

### Requirement 2: wxapkg 文件解包

**User Story:** As a security researcher, I want to unpack wxapkg files, so that I can access the compiled mini-program resources.

#### Acceptance Criteria

1. WHEN a wxapkg file is selected, THE WxapkgParser SHALL parse the binary header to extract file count and metadata
2. WHEN parsing the file index, THE WxapkgParser SHALL extract each file's name, offset, and size
3. WHEN extracting files, THE WxapkgParser SHALL write all embedded files to the output directory preserving the original structure
4. WHEN the wxapkg is a subpackage, THE WxapkgParser SHALL correctly handle the subpackage structure and merge with main package
5. IF the wxapkg file is corrupted or invalid, THEN THE WxapkgParser SHALL return a descriptive error message

### Requirement 3: WXML 代码还原

**User Story:** As a security researcher, I want to restore WXML templates from compiled code, so that I can understand the mini-program's UI structure.

#### Acceptance Criteria

1. WHEN processing app-service.js, THE CodeRestorer SHALL locate and parse the $gwx function definitions
2. WHEN restoring WXML, THE CodeRestorer SHALL convert the virtual DOM structure back to WXML syntax
3. WHEN restoring WXML, THE CodeRestorer SHALL preserve wx:if, wx:for, and other directives
4. WHEN restoring WXML, THE CodeRestorer SHALL restore data bindings in {{}} format
5. WHEN WXML restoration fails for a file, THE CodeRestorer SHALL log the error and continue with other files

### Requirement 4: WXSS 代码还原

**User Story:** As a security researcher, I want to restore WXSS stylesheets from compiled code, so that I can analyze the mini-program's styling.

#### Acceptance Criteria

1. WHEN processing app-wxss.js, THE CodeRestorer SHALL extract the compiled CSS rules
2. WHEN restoring WXSS, THE CodeRestorer SHALL convert rpx units correctly
3. WHEN restoring WXSS, THE CodeRestorer SHALL reconstruct @import statements
4. WHEN restoring WXSS, THE CodeRestorer SHALL format the output with proper indentation

### Requirement 5: JavaScript 代码美化

**User Story:** As a security researcher, I want to beautify minified JavaScript code, so that I can easily read and analyze the logic.

#### Acceptance Criteria

1. WHEN processing JavaScript files, THE CodeRestorer SHALL apply code formatting with proper indentation
2. WHEN beautifying code, THE CodeRestorer SHALL preserve string literals and comments
3. WHEN beautifying code, THE CodeRestorer SHALL handle ES6+ syntax correctly
4. WHEN beautifying code, THE CodeRestorer SHALL split long lines for readability

### Requirement 6: 敏感信息扫描

**User Story:** As a security researcher, I want to automatically scan for sensitive information in decompiled code, so that I can quickly identify potential security issues.

#### Acceptance Criteria

1. WHEN scanning JavaScript code, THE SensitiveScanner SHALL detect API endpoints (URLs starting with http/https)
2. WHEN scanning JavaScript code, THE SensitiveScanner SHALL detect potential encryption keys (AES key, IV, secret patterns)
3. WHEN scanning JavaScript code, THE SensitiveScanner SHALL detect phone number patterns (Chinese mobile numbers)
4. WHEN scanning JavaScript code, THE SensitiveScanner SHALL detect ID card number patterns (18-digit Chinese ID)
5. WHEN scanning JavaScript code, THE SensitiveScanner SHALL detect common encryption algorithm usage (AES, DES, RSA, MD5, SHA)
6. WHEN scanning JavaScript code, THE SensitiveScanner SHALL detect hardcoded credentials (password, token, apikey patterns)
7. WHEN sensitive information is found, THE SensitiveScanner SHALL display results grouped by category with file location and context
8. WHEN scanning is complete, THE SensitiveScanner SHALL generate a summary report with statistics

### Requirement 7: 分包支持

**User Story:** As a security researcher, I want to handle mini-programs with subpackages, so that I can analyze complete applications.

#### Acceptance Criteria

1. WHEN multiple wxapkg files belong to the same AppID, THE Decompiler SHALL identify main package and subpackages
2. WHEN decompiling with subpackages, THE Decompiler SHALL merge all packages into a unified project structure
3. WHEN displaying results, THE Decompiler SHALL indicate which files come from which package

### Requirement 8: 结果导出

**User Story:** As a security researcher, I want to export decompiled code and scan results, so that I can save and share my findings.

#### Acceptance Criteria

1. WHEN the user clicks export, THE Decompiler SHALL save all decompiled files to a specified directory
2. WHEN exporting, THE Decompiler SHALL generate a JSON report of all detected sensitive information
3. WHEN exporting, THE Decompiler SHALL preserve the original mini-program directory structure
