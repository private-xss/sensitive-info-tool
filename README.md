# 敏感信息管理工具

一个用于管理和利用渗透测试过程中发现的敏感信息的桌面应用程序，支持微信小程序、企业微信、飞书、钉钉等平台的信息管理。

## 功能特性

- 🔐 **安全存储**: 使用加密算法保护敏感信息
- 📱 **多平台支持**: 支持微信小程序、企业微信、飞书、钉钉
- 🛠️ **利用工具**: 内置API测试和利用功能
- 💻 **桌面应用**: 基于Tauri构建的跨平台桌面应用
- 🎨 **现代UI**: 使用Vue 3 + Ant Design Vue构建的现代化界面

## 技术栈

- **前端**: Vue 3 + TypeScript + Ant Design Vue + Vue Router
- **桌面框架**: Tauri
- **构建工具**: Vite
- **数据存储**: 本地加密存储

## 使用截图
<img width="1236" height="836" alt="image" src="https://github.com/user-attachments/assets/2e6aae36-13a1-4d24-b631-e051b72f3766" />

<img width="1236" height="836" alt="image" src="https://github.com/user-attachments/assets/e00e10d4-b261-448b-9294-1e46b6254899" />

<img width="1236" height="836" alt="image" src="https://github.com/user-attachments/assets/6985a210-7005-4b45-8bc9-94579b20547d" />

<img width="1236" height="836" alt="image" src="https://github.com/user-attachments/assets/9a9724cf-f0bf-4794-a44b-7cb9c682955a" />



## 安装和运行

### 开发环境

1. 确保已安装Node.js (>= 18.0.0) 和 Rust
2. 克隆项目并安装依赖：

```bash
cd sensitive-info-tool
npm install
```

3. 启动开发服务器：

```bash
npm run tauri:dev
```

### 构建生产版本

```bash
npm run tauri:build
```

## 使用说明

### 1. 仪表盘
- 查看各类敏感信息的统计数量
- 快速访问最近添加的信息
- 提供快速操作入口

### 2. 信息管理
- **微信小程序**: 管理App ID和App Secret
- **企业微信**: 管理Corp ID、Corp Secret和Agent ID
- **飞书**: 管理App ID和App Secret
- **钉钉**: 管理App Key和App Secret

### 3. 利用工具
- 测试API认证
- 获取Access Token
- 获取用户信息
- 执行其他利用操作

## 安全说明

⚠️ **重要提醒**:
- 本工具仅用于合法的渗透测试和安全研究
- 请确保你有权限测试目标系统
- 敏感信息已加密存储，但仍需妥善保管
- 使用前请遵守相关法律法规

## 数据存储

- 数据存储在用户数据目录下的`sensitive-info-tool`文件夹
- 所有敏感信息都经过加密处理
- 支持数据的导入导出功能

## 开发说明

### 项目结构

```
sensitive-info-tool/
├── src/                    # 前端源码
│   ├── components/         # Vue组件
│   ├── views/             # 页面视图
│   ├── router/            # 路由配置
│   ├── utils/             # 工具函数
│   ├── types/             # TypeScript类型定义
│   └── stores/            # 状态管理
├── src-tauri/             # Tauri后端
│   ├── src/               # Rust源码
│   └── Cargo.toml         # Rust依赖
└── public/                # 静态资源
```

### 添加新的平台支持

1. 在`src/types/index.ts`中定义新的数据类型
2. 创建对应的Vue组件
3. 在路由中添加新页面
4. 在利用工具中添加相应的功能

## 许可证

本项目仅供学习和研究使用，请遵守相关法律法规。

## 贡献

欢迎提交Issue和Pull Request来改进这个工具。

## 免责声明

本工具仅用于合法的安全测试和研究目的。使用者需要确保：
1. 有权限对目标系统进行测试
2. 遵守当地的法律法规
3. 不将工具用于非法用途

作者不对使用本工具造成的任何后果承担责任。
