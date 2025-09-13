// 微信小程序信息
export interface WeChatMiniProgram {
  id: string
  name: string
  appId: string
  appSecret: string
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
