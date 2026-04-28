// Tauri环境检测 - 全局声明
declare global {
  interface Window {
    __TAURI__?: any;
  }
}

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
export type CloudProvider = 'aliyun' | 'tencent' | 'huawei' | 'qiniu' | 'jdcloud' | 'ksyun' | 'qingcloud' | 'aws' | 'minio' | 'ucloud'

// 云服务类型
export type CloudServiceType = 'oss' | 'ecs' | 'rds' | 'console' | 'user' | 'database' | 'alarm' | 'backdoor' | 'policy'

// 云厂商OSS配置
export interface CloudOSSConfig {
  id: string
  name: string
  provider: CloudProvider
  authType: 'longterm' | 'sts'
  accessKey: string
  secretKey: string
  region?: string
  endpoint?: string
  bucket?: string
  sessionToken?: string
  expiration?: string
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

// 云服务配置
export interface CloudServiceConfig {
  id: string
  name: string
  provider: CloudProvider
  serviceType: CloudServiceType
  accessKey: string
  secretKey: string
  region?: string
  endpoint?: string
  sessionToken?: string
  expiration?: string
  description?: string
  createdAt: string
  updatedAt: string
}

// 云服务操作结果
export interface CloudServiceResult<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// 远程命令执行参数
export interface RemoteCommandParams {
  instanceId: string
  command: string
  workingDirectory?: string
  timeout?: number
}

// 命令执行结果
export interface CommandResult {
  instanceId: string
  command: string
  output: string
  error: string
  exitCode: number
  executionTime: number
  timestamp: string
}

// 历史命令记录
export interface CommandHistory {
  id: string
  instanceId: string
  command: string
  output: string
  error: string
  exitCode: number
  executionTime: number
  timestamp: string
}

// 子用户信息
export interface SubUser {
  id: string
  username: string
  displayName: string
  email?: string
  status: 'active' | 'inactive' | 'suspended'
  permissions: string[]
  createdAt: string
  lastLogin?: string
}

// 云数据库实例
export interface DatabaseInstance {
  id: string
  name: string
  engine: string
  version: string
  status: string
  region: string
  instanceClass: string
  storage: number
  endpoint: string
  port: number
  createdAt: string
}

// 告警信息
export interface AlarmInfo {
  id: string
  name: string
  description: string
  severity: 'critical' | 'warning' | 'info'
  status: 'alarm' | 'ok' | 'insufficient_data'
  metricName: string
  threshold: number
  currentValue: number
  region: string
  resourceId: string
  createdAt: string
  updatedAt: string
}

// 主机信息
export interface HostInfo {
  id: string
  name: string
  instanceType: string
  status: string
  region: string
  zone: string
  publicIp?: string
  privateIp: string
  osType: string
  cpu: number
  memory: number
  disk: number
  createdAt: string
}

// 阿里云ECS实例信息
export interface EcsInstance {
  instance_id: string
  instance_name: string
  status: string
  instance_type: string
  region_id: string
  zone_id: string
  public_ip_address?: string
  private_ip_address: string
  os_type: string
  cpu: number
  memory: number
  creation_time: string
}

// 订单信息
export interface OrderInfo {
  id: string
  orderType: string
  status: string
  amount: number
  currency: string
  resourceId?: string
  createdAt: string
  completedAt?: string
}

// 后门信息
export interface BackdoorInfo {
  id: string
  name: string
  type: string
  target: string
  status: 'active' | 'inactive'
  createdAt: string
  lastUsed?: string
}

// 策略信息
export interface PolicyInfo {
  id: string
  name: string
  description: string
  version: string
  document: string
  createdAt: string
  updatedAt: string
}
