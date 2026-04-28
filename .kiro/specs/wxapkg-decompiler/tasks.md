# Implementation Plan: 微信小程序反编译器

## Overview

本实现计划将微信小程序反编译器功能分解为可执行的编码任务。后端使用 Rust 实现核心解析逻辑，前端使用 Vue 提供用户界面。支持单选和批量反编译功能。

## Tasks

- [x] 1. 创建 wxapkg 模块基础结构
  - [x] 1.1 创建 `src-tauri/src/wxapkg/mod.rs` 模块入口文件
    - 定义模块导出和公共接口
    - 定义错误类型 `DecompilerError`
    - _Requirements: 2.5_
  - [x] 1.2 创建数据结构定义 `src-tauri/src/wxapkg/types.rs`
    - 定义 `WxapkgInfo`, `AppPackages`, `WxapkgHeader`, `FileEntry` 等结构体
    - 定义 `BatchProgress`, `BatchResult`, `DecompileResult` 批量处理相关结构
    - _Requirements: 1.5, 1.6, 9.4, 9.7_

- [x] 2. 实现路径扫描器 PathScanner
  - [x] 2.1 创建 `src-tauri/src/wxapkg/scanner.rs`
    - 实现 `get_wechat_applet_paths()` 获取 Windows/macOS 缓存路径
    - 实现 `scan_wxapkg_files()` 递归扫描 .wxapkg 文件
    - 实现 `group_by_appid()` 按 AppID 分组并识别主包/分包
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 7.1_

- [x] 3. 实现 wxapkg 解析器 WxapkgParser
  - [x] 3.1 创建 `src-tauri/src/wxapkg/parser.rs`
    - 实现 `parse_header()` 解析二进制头部 (magic 0xBE, version, lengths, file_count)
    - 实现 `parse_file_index()` 解析文件索引表
    - 实现 `extract_all()` 提取所有文件到输出目录
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [ ]* 3.2 编写 wxapkg 解析器属性测试
    - **Property 1: wxapkg 解析完整性**
    - **Validates: Requirements 2.1, 2.2, 2.3**

- [x] 4. 实现代码还原器 CodeRestorer
  - [x] 4.1 创建 `src-tauri/src/wxapkg/restorer.rs` - WXML 还原
    - 实现 `restore_wxml()` 从 app-service.js 中解析 $gwx 函数
    - 还原 wx:if, wx:for 指令和 {{}} 数据绑定
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 4.2 实现 WXSS 还原功能
    - 实现 `restore_wxss()` 从 app-wxss.js 提取样式
    - 处理 rpx 单位和 @import 语句
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [x] 4.3 实现 JavaScript 美化功能
    - 实现 `beautify_js()` 格式化压缩的 JS 代码
    - 处理 ES6+ 语法，保留字符串和注释
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 5. 实现敏感信息扫描器 SensitiveScanner
  - [x] 5.1 创建 `src-tauri/src/wxapkg/sensitive.rs`
    - 定义 `SensitiveCategory` 枚举和 `SensitiveMatch` 结构
    - 实现所有敏感信息正则模式 (API, Key, IV, Phone, ID Card, Algo, Credential)
    - 实现 `scan_file()` 扫描单个文件
    - 实现 `scan_project()` 扫描整个项目并生成报告
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_
  - [ ]* 5.2 编写敏感信息扫描器属性测试
    - **Property 2: 敏感信息检测覆盖率**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6**

- [x] 6. 实现批量反编译管理器
  - [x] 6.1 创建 `src-tauri/src/wxapkg/batch.rs`
    - 实现 `decompile_single()` 反编译单个小程序
    - 实现 `decompile_batch()` 批量反编译多个小程序
    - 实现进度回调和错误隔离（单个失败不影响其他）
    - _Requirements: 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_
  - [ ]* 6.2 编写批量反编译属性测试
    - **Property 6: 批量反编译隔离性**
    - **Property 7: 批量反编译完整性**
    - **Validates: Requirements 9.4, 9.5, 9.6, 9.7**

- [x] 7. 注册 Tauri 命令
  - [x] 7.1 在 `src-tauri/src/main.rs` 中注册 wxapkg 命令
    - `scan_wxapkg_paths` - 扫描小程序缓存路径
    - `decompile_wxapkg` - 反编译单个小程序
    - `decompile_wxapkg_batch` - 批量反编译
    - `export_decompile_result` - 导出结果
    - _Requirements: 1.1, 8.1, 8.2, 8.3, 9.2, 9.3_

- [x] 8. Checkpoint - 后端功能验证
  - 确保所有 Rust 代码编译通过
  - 确保 Tauri 命令可以正常调用
  - 如有问题请询问用户

- [x] 9. 创建前端反编译器视图
  - [x] 9.1 创建 `src/views/DecompilerView.vue`
    - 实现扫描按钮和小程序列表展示
    - 实现复选框选择（单选/多选/全选/取消全选）
    - 实现反编译按钮和批量反编译按钮
    - 实现进度显示 (Processing X/Y)
    - _Requirements: 1.1, 1.5, 1.6, 1.7, 1.8, 9.1, 9.2, 9.3, 9.4, 9.8, 9.9_
  - [x] 9.2 实现敏感信息结果展示
    - 按类别分组显示敏感信息
    - 显示文件位置和上下文代码
    - 显示批量反编译汇总统计
    - _Requirements: 6.7, 6.8, 9.7_
  - [x] 9.3 实现导出功能
    - 选择导出目录
    - 导出反编译文件和 JSON 报告
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 10. 添加路由配置
  - [x] 10.1 在 `src/router/index.ts` 中添加反编译器路由
    - 添加 `/decompiler` 路由指向 DecompilerView
    - _Requirements: 1.1_

- [x] 11. Final Checkpoint - 完整功能验证
  - 确保所有测试通过
  - 确保前后端集成正常
  - 如有问题请询问用户

- [x] 12. 增强 wxid 自动获取功能
  - [x] 12.1 改进 `scanner.rs` 中的 wxid 自动检测
    - 扩展 wxid 搜索范围，包括微信数据目录、配置文件
    - 从 `AccInfo.dat`、`config` 目录等位置提取 wxid
    - 实现多 wxid 尝试机制
    - _Requirements: 10.1, 10.2, 10.3, 10.5_
  - [x] 12.2 改进 `batch.rs` 中的自动解密逻辑
    - 当单个 wxid 解密失败时，尝试系统中所有可用的 wxid
    - 实现解密重试机制
    - _Requirements: 10.4, 10.5, 10.6, 10.7_

- [-] 13. 增强小程序名称获取功能
  - [ ] 13.1 改进 `scanner.rs` 中的名称提取逻辑
    - 从 `app-config.json` 提取 `appname` 或 `window.navigationBarTitleText`
    - 从 `page-frame.html` 提取嵌入的应用名称
    - 搜索 `__APP__` 子目录中的配置文件
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  - [ ] 13.2 实现反编译后名称更新
    - 从解压后的 `app.json` 中提取名称
    - 更新 `DecompileResult` 包含提取的名称
    - _Requirements: 11.5_

- [ ] 14. Checkpoint - 验证自动化改进
  - 确保 wxid 自动获取正常工作
  - 确保小程序名称正确显示
  - 如有问题请询问用户

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- 后端使用 Rust 实现，前端使用 Vue 3 + TypeScript
- 所有 Tauri 命令需要在 main.rs 中注册
- 敏感信息扫描使用正则表达式匹配
- 批量反编译需要实现进度回调和错误隔离
