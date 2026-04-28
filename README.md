# 敏感信息管理工具 - Tauri 版本

基于 Tauri + Vue 3 + TypeScript 的敏感信息管理工具，支持云厂商 OSS 管理、平台集成、JWT 工具、小程序反编译等功能。

## 功能特性

### JWT 工具
- **JWT 解码**：解析 Header/Payload/Signature，自动检测过期状态
- **JWT 编码**：支持 HS256/HS384/HS512/RS256/RS384/RS512/ES256/ES384/ES512/EdDSA/none 算法
- **JWT 校验**：HMAC 对称验签 + RSA/ECDSA 非对称验签，自动检测过期时间
- **密钥爆破**：使用密码本对 HMAC 算法 JWT 进行密钥爆破，支持多算法并行，实时进度显示
- 密码本自动初始化到 `~/.sensitive-info-tool/jwt.txt`（12万+条常用密码）

### 小程序反编译 & 敏感信息提取
- 自动检测微信小程序包路径（macOS + Windows）
- 支持 V1MMWX 加密包解密（AES-256-CBC + XOR）
- wxapkg 解包 + 敏感信息扫描（14 种正则模式：AppSecret/AccessKey/JWT/手机号/身份证号等）
- API 接口提取，按域名分组展示
- 批量反编译支持

### 云厂商 OSS 管理
- **阿里云 OSS**（S3 兼容，经 Rust 后端实现）
- **AWS S3**（原生 S3，经 Rust 后端实现）
- **腾讯云 COS**（S3 兼容，经 Rust 后端实现）
- **华为云 OBS**（S3 兼容，经 Rust 后端实现）
- **UCloud**（S3 兼容，经 Rust 后端实现）
- **七牛云 Kodo**（S3 兼容，经 Rust 后端实现）
- **京东云 OSS**（S3 兼容，经 Rust 后端实现）
- **青云 QingStor**（S3 兼容，经 Rust 后端实现）
- **金山云 KS3**（S3 兼容，经 Rust 后端实现）
- **MinIO**（S3 兼容，经 Rust 后端实现）

### 云服务利用
- **阿里云**：控制台接管、远程命令执行、子用户管理、ECS 实例管理、数据库实例管理、告警规则管理
- **腾讯云**：控制台接管、远程命令执行、子用户 CRUD、权限更新
- **华为云**：控制台接管、子用户 CRUD、权限更新
- **UCloud**：控制台接管、主机管理、子用户管理、订单查询
- **AWS**：控制台接管、后门管理、子用户管理、IAM 策略管理

### 平台集成

#### 微信小程序/公众号
- AccessToken 获取/验证、用户信息获取（jscode2session）
- 用户列表（公众号）、用户基本信息（UnionID）、批量获取用户信息
- 菜单配置（获取/创建/删除）、模板列表、模板消息、订阅消息
- 小程序码生成、带参数二维码、短链接
- 素材列表、上传素材、自动回复规则
- 数据日报/留存/访问页面分析、微信服务器 IP、网络检测

#### 企业微信
- AccessToken 获取、部门列表/成员列表/用户详情、发送应用消息
- 部门 CRUD、成员 CRUD、标签管理、邀请成员
- 应用信息/列表、上传素材、交互式卡片消息
- 外部联系人列表/详情、客户群列表/详情
- 会话内容存档、审批模板/详情、服务器 IP

#### 飞书
- Tenant Access Token 获取、用户列表/详情、部门列表、发送消息
- 部门 CRUD/详情、部门直属用户、用户 CRUD
- 群列表/详情/创建/成员、消息详情/回复/撤回
- 云文档列表、日历列表/事件、审批定义/实例
- 多维表格、应用访问记录

#### 钉钉
- AccessToken 获取、部门列表/用户列表/用户详情、发送工作通知、按手机号查用户
- 部门 CRUD、用户 CRUD、角色列表/员工、标签管理
- 邀请用户、考勤结果/打卡、审批模板/实例
- 外部联系人列表/详情、群列表/详情/创建/消息
- 日志列表、智能人事员工列表/详情、钉盘空间、待办任务

## 技术架构

- **前端**：Vue 3 + TypeScript + Ant Design Vue 4
- **后端**：Rust (Tauri 1.5)
- **云服务**：统一通过 Rust（`rust-s3`）S3 兼容实现访问各厂商
- **平台 API**：前端通过 Tauri HTTP 模块直接调用各平台 API
- **数据存储**：本地加密存储（`~/.sensitive-info-tool/`），XOR + Base64 加密 + localStorage 缓存
- **JWT**：Web Crypto API 实现 HMAC/RSA/ECDSA 签名和验签

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
- Windows: 安装 Visual Studio，勾选"使用 C++ 的桌面开发"组件，并安装 Windows 10/11 SDK。

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

## 项目结构

```
sensitive-info-tool-tauri/
├── src/                          # 前端代码
│   ├── views/                    # Vue 页面组件
│   │   ├── Dashboard.vue         # 仪表盘
│   │   ├── CloudOSS.vue          # 云厂商 OSS 管理
│   │   ├── CloudServices.vue     # 云服务利用
│   │   ├── WeChat.vue            # 微信小程序/公众号配置
│   │   ├── Enterprise.vue        # 企业微信配置
│   │   ├── Feishu.vue            # 飞书配置
│   │   ├── DingTalk.vue          # 钉钉配置
│   │   ├── Tools.vue             # 平台利用工具
│   │   ├── JwtTool.vue           # JWT 工具（编码/解码/校验/爆破）
│   │   └── DecompilerView.vue    # 小程序反编译
│   ├── components/               # 可复用组件
│   │   ├── CommandOutput.vue     # 命令输出展示
│   │   ├── OSSBrowser.vue        # OSS 文件浏览器
│   │   └── OSSConfigSelector.vue # OSS 配置选择器
│   ├── utils/                    # 工具函数/API 封装
│   │   ├── jwt-api.ts            # JWT 工具 API
│   │   ├── wechat-api.ts         # 微信 API 封装
│   │   ├── enterprise-wechat-api.ts  # 企业微信 API 封装
│   │   ├── feishu-api.ts         # 飞书 API 封装
│   │   ├── dingtalk-api.ts       # 钉钉 API 封装
│   │   ├── platform-apis.ts      # 平台 API 统一管理
│   │   ├── aliyun-api.ts         # 阿里云 API 封装
│   │   ├── aws-api.ts            # AWS API 封装
│   │   ├── tencent-api.ts        # 腾讯云 API 封装
│   │   ├── huawei-api.ts         # 华为云 API 封装
│   │   ├── ucloud-api.ts         # UCloud API 封装
│   │   ├── cloud-providers.ts    # 云厂商信息定义
│   │   ├── tauri-api.ts          # Tauri Rust 后端 API 封装
│   │   ├── storage-simple.ts     # 本地加密存储
│   │   └── api-error-handler.ts  # 统一 API 错误处理
│   ├── types/                    # TypeScript 类型定义
│   ├── router/                   # 路由配置
│   ├── App.vue                   # 主应用组件
│   └── main.ts                   # 应用入口
├── src-tauri/                    # Rust 后端代码
│   ├── src/
│   │   ├── main.rs               # 主程序（注册所有 Tauri 命令）
│   │   ├── oss.rs                # OSS 操作实现
│   │   ├── cloud_services/       # 云服务实现
│   │   │   ├── aliyun.rs         # 阿里云
│   │   │   ├── tencent.rs        # 腾讯云
│   │   │   ├── huawei.rs         # 华为云
│   │   │   ├── ucloud.rs         # UCloud
│   │   │   └── aws.rs            # AWS
│   │   └── wxapkg/               # 微信小程序包处理
│   │       ├── decrypt.rs        # V1MMWX 解密
│   │       ├── parser.rs         # wxapkg 解析与解包
│   │       ├── scanner.rs        # 敏感信息扫描
│   │       └── types.rs          # 类型定义
│   ├── Cargo.toml                # Rust 依赖配置
│   └── tauri.conf.json           # Tauri 配置
├── jwt.txt                       # JWT 密码本（12万+条）
├── package.json                  # 前端依赖配置
├── vite.config.ts                # Vite 配置
└── README.md                     # 项目说明
```

## 使用说明

### JWT 工具

1. 点击"JWT 工具"菜单
2. **解码**：粘贴 JWT Token，点击解码查看 Header/Payload/Signature
3. **编码**：选择算法，输入密钥和 Payload，生成 JWT Token
4. **校验**：输入 JWT Token 和密钥/公钥，验证签名和过期时间
5. **密钥爆破**：输入 JWT Token，选择算法，使用密码本暴力破解密钥

### 小程序反编译

1. 点击"小程序反编译"菜单
2. 点击"自动"检测微信小程序路径，或手动"选择目录"
3. 在下拉框中选择微信用户路径
4. 点击"扫描文件"查找 wxapkg 文件
5. 单个反编译或批量反编译
6. 查看提取的 API 接口和敏感信息

### 云厂商 OSS 配置

1. 点击"对象存储 OSS"菜单
2. 点击"添加配置"按钮
3. 选择云服务商，输入 Access Key 和 Secret Key
4. 点击"测试连接"验证配置
5. 保存配置后可以"打开浏览器"管理文件

### 平台集成

1. 点击对应的平台菜单（微信、企业微信、飞书、钉钉）
2. 配置平台参数（AppID/AppSecret/CorpID 等）
3. 在"利用工具"页面选择已配置的平台，使用各项功能

## 开发说明

### 添加新的云服务商

1. 在 `src-tauri/src/cloud_services/` 中添加 Rust 实现
2. 在 `src-tauri/src/main.rs` 中注册新的 Tauri 命令
3. 在 `src/utils/` 中添加前端 API 封装
4. 在 `src/utils/cloud-providers.ts` 中添加服务商信息

### 添加新的平台集成

1. 在 `src/utils/` 中添加平台 API 封装类
2. 在 `src/views/` 中添加配置页面
3. 在 `src/views/Tools.vue` 中添加利用工具按钮
4. 在 `src/router/index.ts` 和 `src/App.vue` 中添加路由和菜单
5. 在 `src-tauri/tauri.conf.json` 中添加 HTTP 请求域名白名单

## 优势

相比 Electron 版本：

- **体积更小**：最终应用只有几 MB（vs Electron 的几十 MB）
- **性能更好**：使用系统原生 WebView，启动更快
- **内存占用更少**：没有 Node.js 运行时开销
- **更安全**：Rust 后端 + 最小化权限模型
- **跨平台**：支持 Windows、macOS、Linux

## 注意事项

1. 已在前端对 Node-only SDK 做了打包隔离处理（避免 `crypto` 等 Node 内置模块导致打包失败）
2. Tauri 配置已开启 HTTP/FS/Dialog 等权限，请按需最小化权限
3. 确保 Node、Rust、Tauri CLI、系统工具链（Xcode/VS+SDK）均已安装
4. 构建前需安装相应 Rust target（见"跨平台构建"章节）
5. JWT 密码本首次使用时会自动从项目目录复制到 `~/.sensitive-info-tool/jwt.txt`

## 许可证

Private null
