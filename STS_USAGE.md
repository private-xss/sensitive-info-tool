# STS临时安全凭证使用说明

## 概述

本工具现在支持使用STS（Security Token Service）临时安全凭证来访问阿里云、华为云、腾讯云的OSS服务。STS临时凭证相比长期凭证更加安全，具有以下优势：

- **临时性**：凭证有明确的过期时间，降低安全风险
- **权限控制**：可以精确控制访问权限和资源范围
- **审计友好**：便于追踪和审计访问行为

## 支持的云厂商

- ✅ 阿里云OSS
- ✅ 腾讯云COS  
- ✅ 华为云OBS

## 使用方法

### 1. 选择认证方式

在添加云厂商配置时，首先选择认证方式：
- **长期凭证**：使用主账号的Access Key + Secret Key
- **STS临时凭证**：使用临时凭证 Access Key + Secret Key + Session Token

### 2. 配置STS临时凭证

如果选择STS临时凭证认证方式，需要填写：
- **Access Key**：STS返回的临时Access Key ID
- **Secret Key**：STS返回的临时Secret Key
- **Session Token**：STS返回的Session Token（必需）
- **凭证过期时间**：临时凭证的过期时间（可选）

### 3. 获取STS凭证

STS凭证需要通过云厂商的控制台或API获取：

#### 阿里云
1. 在阿里云RAM控制台创建角色
2. 使用AssumeRole API获取临时凭证
3. 将返回的凭证信息填入表单

#### 腾讯云
1. 在腾讯云CAM控制台创建角色
2. 使用AssumeRole API获取临时凭证
3. 将返回的凭证信息填入表单

#### 华为云
1. 在华为云IAM控制台创建角色
2. 使用AssumeRole API获取临时凭证
3. 将返回的凭证信息填入表单

### 3. 配置说明

- **Session Token**：STS返回的临时安全令牌
- **凭证过期时间**：临时凭证的过期时间，通常为1小时
- **区域**：选择对应的云服务区域
- **Endpoint**：系统会根据区域自动生成

## 权限配置

### 阿里云RAM角色配置

1. 在阿里云RAM控制台创建角色
2. 配置信任策略，允许主账号AssumeRole
3. 配置权限策略，授予OSS访问权限

示例权限策略：
```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "oss:GetObject",
        "oss:PutObject",
        "oss:DeleteObject",
        "oss:ListObjects",
        "oss:ListBuckets"
      ],
      "Resource": "*"
    }
  ]
}
```

### 腾讯云CAM角色配置

1. 在腾讯云CAM控制台创建角色
2. 配置信任关系，允许主账号AssumeRole
3. 配置权限策略，授予COS访问权限

### 华为云IAM角色配置

1. 在华为云IAM控制台创建角色
2. 配置信任关系，允许主账号AssumeRole
3. 配置权限策略，授予OBS访问权限

## 安全建议

1. **最小权限原则**：只授予必要的权限
2. **定期轮换**：定期更新主账号凭证
3. **监控审计**：启用云服务商的访问日志
4. **网络隔离**：限制访问来源IP

## 故障排除

### 常见错误

1. **AccessDenied**：检查角色权限配置
2. **InvalidRoleArn**：检查角色ARN格式
3. **ExpiredToken**：重新获取STS凭证
4. **NetworkError**：检查网络连接和Endpoint配置

### 调试步骤

1. 确认主账号凭证有效
2. 验证角色ARN正确
3. 检查角色权限策略
4. 确认网络连接正常

## 注意事项

- STS临时凭证有有效期限制，过期后需要重新获取
- 不同云厂商的STS API可能有差异
- 建议在生产环境中通过后端代理获取STS凭证
- 定期检查凭证过期时间，避免服务中断
