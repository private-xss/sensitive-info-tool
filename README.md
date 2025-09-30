# 敏感信息管理工具 - Tauri 版本

这是一个基于 Tauri + Vue 3 + TypeScript 的敏感信息管理工具，支持云厂商 OSS 管理和平台集成功能。

## 功能特性

### 云厂商 OSS 管理
- **阿里云 OSS**（S3 兼容，经 Rust 后端实现）
- **AWS S3**（原生 S3，经 Rust 后端实现）  
- **腾讯云 COS**（S3 兼容，经 Rust 后端实现）
- **华为云 OBS**（S3 兼容，经 Rust 后端实现）
- **七牛云 Kodo（S3 接入域）**（S3 兼容，经 Rust 后端实现）
- **京东云 OSS**（S3 兼容，经 Rust 后端实现）
- **青云 QingStor**（S3 兼容，经 Rust 后端实现）
- **金山云 KS3**（S3 兼容，经 Rust 后端实现）
- **MinIO**（S3 兼容，经 Rust 后端实现）

### 平台集成
- **钉钉**：使用 Rust 后端实现
- **企业微信**：使用 Rust 后端实现
- **微信小程序/公众号**：使用 Rust 后端实现
- **飞书**：使用 Rust 后端实现

## 技术架构

- **前端**：Vue 3 + TypeScript + Ant Design Vue
- **后端**：Rust (Tauri)
- **云服务**：统一通过 Rust（`rust-s3`）S3 兼容实现访问各厂商（前端不直接引入 Node-only SDK）
- **平台 API**：Rust 后端实现
- **数据存储**：本地加密存储

## 安装和运行

### 前置要求

1. **Node.js** (v16 或更高版本)
2. **Rust** (最新稳定版)
3. **Tauri CLI**

```bash
# 安装 Tauri CLI
npm install -g @tauri-apps/cli
```

### 安装依赖

```bash
# 安装前端依赖
npm install

# 安装 Rust 依赖（自动执行）
cargo build
```

### 开发模式

```bash
# 启动开发服务器
npm run tauri:dev
```

### 构建应用

```bash
# 构建生产版本
npm run tauri:build
```

### 跨平台构建（mac Intel / mac Apple Silicon / Windows）

前置准备：

1. 安装目标工具链

```bash
# mac Intel 目标
rustup target add x86_64-apple-darwin

# mac Apple Silicon 目标
rustup target add aarch64-apple-darwin

# Windows 目标（在 Windows 主机上执行）
rustup target add x86_64-pc-windows-msvc
```

2. 安装系统工具链

- macOS: 安装 Xcode 命令行工具
```bash
xcode-select --install
```
- Windows: 安装 Visual Studio，勾选“使用 C++ 的桌面开发”组件，并安装 Windows 10/11 SDK。

3. 执行构建

```bash
# 先构建前端静态资源
npm run build

# mac Intel 包（x86_64-apple-darwin）
npm run build:mac:intel

# mac Apple Silicon 包（aarch64-apple-darwin）
npm run build:mac:arm

# mac Universal 通用包（需同时安装 x86_64 与 aarch64 目标）
npm run build:mac:universal

# Windows 包（在 Windows 主机上构建）
npm run build:win
```

构建产物输出目录：

```
src-tauri/target/<triple>/release/bundle/
```

注意：
- Windows 安装包（MSI/NSIS）建议在 Windows 上原生构建。
- 首次构建可能有代码签名提示，可先使用开发签名或跳过，后续再配置正式证书。

## 项目结构

```
sensitive-info-tool-tauri/
├── src/                          # 前端代码
│   ├── views/                    # Vue 页面组件
│   │   ├── Dashboard.vue         # 仪表盘
│   │   ├── CloudOSS.vue          # 云厂商 OSS 管理
│   │   ├── DingTalk.vue          # 钉钉集成
│   │   ├── Enterprise.vue        # 企业微信集成
│   │   ├── WeChat.vue            # 微信集成
│   │   ├── Feishu.vue            # 飞书集成
│   │   └── Tools.vue             # 工具页面
│   ├── utils/                    # 工具函数
│   │   ├── cloud-sdk-manager.ts  # 云服务 SDK 管理器
│   │   ├── tauri-api.ts          # Tauri API 封装
│   │   ├── storage-simple.ts     # 本地存储
│   │   └── cloud-providers.ts    # 云服务商信息
│   ├── types/                    # TypeScript 类型定义
│   ├── router/                   # 路由配置
│   ├── App.vue                   # 主应用组件
│   └── main.ts                   # 应用入口
├── src-tauri/                    # Rust 后端代码
│   ├── src/
│   │   ├── main.rs               # 主程序
│   │   ├── platform_apis.rs      # 平台 API 实现
│   │   └── lib.rs                # 库文件
│   ├── Cargo.toml                # Rust 依赖配置
│   └── tauri.conf.json           # Tauri 配置
├── package.json                  # 前端依赖配置
├── vite.config.ts                # Vite 配置
└── README.md                     # 项目说明
```

## 使用说明

### 云厂商 OSS 配置

1. 点击"云厂商OSS"菜单
2. 点击"添加配置"按钮
3. 选择云服务商（阿里云、AWS、腾讯云等）
4. 输入 Access Key 和 Secret Key
5. 选择区域
6. 点击"测试连接"验证配置
7. 保存配置后可以"打开浏览器"管理文件
8. 目前只测试了腾讯云和阿里云，其他暂时没测

### 平台集成

1. 点击对应的平台菜单（钉钉、企业微信、微信、飞书）
2. 配置平台参数（App Key、App Secret 等）
3. 测试连接
4. 使用平台功能（发送消息、获取用户列表等）

## 开发说明

### 添加新的云服务商

1. 在 `src/utils/cloud-sdk-manager.ts` 中添加新的 SDK 导入
2. 实现对应的连接测试和文件操作方法
3. 在 `src/utils/cloud-providers.ts` 中添加服务商信息

### 添加新的平台集成

1. 在 `src-tauri/src/platform_apis.rs` 中添加新的 API 函数
2. 在 `src-tauri/src/main.rs` 中注册新的命令
3. 在 `src/utils/tauri-api.ts` 中添加前端调用封装
4. 创建对应的 Vue 组件

## 优势

相比 Electron 版本：

- **体积更小**：最终应用只有几 MB（vs Electron 的几十 MB）
- **性能更好**：使用系统原生 WebView，启动更快
- **内存占用更少**：没有 Node.js 运行时开销
- **更安全**：Rust 后端 + 最小化权限模型
- **跨平台**：支持 Windows、macOS、Linux

## 注意事项

1. 已在前端对 Node-only SDK 做了打包隔离处理（避免 `crypto` 等 Node 内置模块导致打包失败）。
2. Tauri 配置已开启 HTTP/FS/Dialog 等权限，请按需最小化权限。
3. 确保 Node、Rust、Tauri CLI、系统工具链（Xcode/VS+SDK）均已安装。
4. 构建前需安装相应 Rust target（见“跨平台构建”章节）。

## 许可证

Private null
