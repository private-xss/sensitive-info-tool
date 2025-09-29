// 微信小程序信息
export interface WeChatMiniProgram {
  id: string
  name: string
  appId: string
  appSecret: string
  type?: 'miniprogram' | 'official'
  description?: string
  createdAt: string
  updatedAt: string
}

// 企业微信信息
export interface EnterpriseWeChat {
  id: string
  name: string
  corpId: string
  corpSecret: string
  agentId?: string
  description?: string
  createdAt: string
  updatedAt: string
}

// 飞书信息
export interface Feishu {
  id: string
  name: string
  appId: string
  appSecret: string
  description?: string
  createdAt: string
  updatedAt: string
}

// 钉钉信息
export interface DingTalk {
  id: string
  name: string
  appKey: string
  appSecret: string
  agentId?: string
  description?: string
  createdAt: string
  updatedAt: string
}

// 通用敏感信息
export interface SensitiveInfo {
  id: string
  type: 'wechat' | 'enterprise' | 'feishu' | 'dingtalk'
  name: string
  data: Record<string, any>
  description?: string
  createdAt: string
  updatedAt: string
}

// 利用工具配置
export interface ToolConfig {
  id: string
  name: string
  type: string
  config: Record<string, any>
  enabled: boolean
}

// 云厂商类型
export type CloudProvider = 'aliyun' | 'tencent' | 'huawei' | 'qiniu' | 'jdcloud' | 'ksyun' | 'qingcloud' | 'aws' | 'minio'

// 云厂商OSS配置
export interface CloudOSSConfig {
  id: string
  name: string
  provider: CloudProvider
  accessKey: string
  secretKey: string
  region?: string
  endpoint?: string
  bucket?: string
  description?: string
  createdAt: string
  updatedAt: string
}

// OSS文件对象
export interface OSSFile {
  key: string
  name: string
  size: number
  lastModified: string
  etag: string
  storageClass?: string
  isDirectory: boolean
  url?: string
}

// OSS操作结果
export interface OSSOperationResult {
  success: boolean
  message: string
  data?: any
}

// 云厂商提供商信息
export interface CloudProviderInfo {
  key: CloudProvider
  name: string
  icon: string
  color: string
  regions: string[]
  defaultEndpoint: string
}
