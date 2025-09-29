/**
 * 平台API统一管理
 * 整合各个平台的API工具类
 */

import { WeChatAPI } from './wechat-api'
import { EnterpriseWeChatAPI } from './enterprise-wechat-api'
import { FeishuAPI } from './feishu-api'
import { DingTalkAPI } from './dingtalk-api'

// 平台类型定义
export type PlatformType = 'dingtalk' | 'enterprise' | 'wechat' | 'feishu'

// 平台配置接口
export interface PlatformConfig {
  name: string
  icon: string
  color: string
  fields: PlatformField[]
  description: string
}

// 配置字段接口
export interface PlatformField {
  key: string
  label: string
  type: 'text' | 'password' | 'textarea'
  required: boolean
  placeholder?: string
  description?: string
}

// 用户信息接口
export interface UserInfo {
  id: string
  name: string
  avatar?: string
  email?: string
  mobile?: string
  department?: string
  position?: string
}

// 平台配置定义
export const platformConfigs: Record<PlatformType, PlatformConfig> = {
  dingtalk: {
    name: '钉钉',
    icon: 'D',
    color: '#0089ff',
    description: '钉钉企业通讯平台',
    fields: [
      {
        key: 'appKey',
        label: 'App Key',
        type: 'text',
        required: true,
        placeholder: '请输入钉钉应用的App Key'
      },
      {
        key: 'appSecret',
        label: 'App Secret',
        type: 'password',
        required: true,
        placeholder: '请输入钉钉应用的App Secret'
      },
      {
        key: 'agentId',
        label: 'Agent ID',
        type: 'text',
        required: false,
        placeholder: '请输入钉钉应用的Agent ID（可选）'
      }
    ]
  },
  enterprise: {
    name: '企业微信',
    icon: 'E',
    color: '#1aad19',
    description: '企业微信通讯平台',
    fields: [
      {
        key: 'corpId',
        label: 'Corp ID',
        type: 'text',
        required: true,
        placeholder: '请输入企业微信的Corp ID'
      },
      {
        key: 'corpSecret',
        label: 'Corp Secret',
        type: 'password',
        required: true,
        placeholder: '请输入企业微信应用的Corp Secret'
      },
      {
        key: 'agentId',
        label: 'Agent ID',
        type: 'text',
        required: false,
        placeholder: '请输入企业微信应用的Agent ID（可选）'
      }
    ]
  },
  wechat: {
    name: '微信小程序/公众号',
    icon: 'W',
    color: '#07c160',
    description: '微信小程序和公众号平台',
    fields: [
      {
        key: 'appId',
        label: 'App ID',
        type: 'text',
        required: true,
        placeholder: '请输入微信小程序的App ID'
      },
      {
        key: 'appSecret',
        label: 'App Secret',
        type: 'password',
        required: true,
        placeholder: '请输入微信小程序的App Secret'
      }
    ]
  },
  feishu: {
    name: '飞书',
    icon: 'F',
    color: '#3370ff',
    description: '飞书企业协作平台',
    fields: [
      {
        key: 'appId',
        label: 'App ID',
        type: 'text',
        required: true,
        placeholder: '请输入飞书应用的App ID'
      },
      {
        key: 'appSecret',
        label: 'App Secret',
        type: 'password',
        required: true,
        placeholder: '请输入飞书应用的App Secret'
      }
    ]
  }
}

// 平台API统一接口
export class PlatformAPI {
  /**
   * 测试平台连接
   */
  static async testConnection(platform: PlatformType, config: Record<string, string>): Promise<{ success: boolean; message: string }> {
    try {
      switch (platform) {
        case 'dingtalk':
          const dingtalkToken = await DingTalkAPI.getAccessToken(config.appKey, config.appSecret)
          return { success: true, message: '钉钉连接成功' }
        
        case 'enterprise':
          const enterpriseToken = await EnterpriseWeChatAPI.getAccessToken(config.corpId, config.corpSecret)
          return { success: true, message: '企业微信连接成功' }
        
        case 'wechat':
          const wechatToken = await WeChatAPI.getAccessToken(config.appId, config.appSecret)
          return { success: true, message: '微信连接成功' }
        
        case 'feishu':
          const feishuToken = await FeishuAPI.getAccessToken(config.appId, config.appSecret)
          return { success: true, message: '飞书连接成功' }
        
        default:
          return { success: false, message: '不支持的平台' }
      }
    } catch (error: any) {
      return { success: false, message: error.message || '连接失败' }
    }
  }

  /**
   * 获取用户列表
   */
  static async getUsers(platform: PlatformType, config: Record<string, string>): Promise<UserInfo[]> {
    try {
      switch (platform) {
        case 'dingtalk':
          const dingtalkToken = await DingTalkAPI.getAccessToken(config.appKey, config.appSecret)
          const departments = await DingTalkAPI.getDepartmentList(dingtalkToken.access_token)
          if (departments.department && departments.department.length > 0) {
            const users = await DingTalkAPI.getDepartmentUsers(dingtalkToken.access_token, departments.department[0].id)
            return users.userlist.map((user: any) => ({
              id: user.userid,
              name: user.name,
              mobile: user.mobile,
              email: user.email
            }))
          }
          return []
        
        case 'enterprise':
          const enterpriseToken = await EnterpriseWeChatAPI.getAccessToken(config.corpId, config.corpSecret)
          const enterpriseDepts = await EnterpriseWeChatAPI.getDepartmentList(enterpriseToken.access_token)
          if (enterpriseDepts.department && enterpriseDepts.department.length > 0) {
            const enterpriseUsers = await EnterpriseWeChatAPI.getDepartmentUsers(enterpriseToken.access_token, enterpriseDepts.department[0].id)
            return enterpriseUsers.userlist.map((user: any) => ({
              id: user.userid,
              name: user.name,
              mobile: user.mobile,
              email: user.email,
              department: user.department?.join(',')
            }))
          }
          return []
        
        case 'feishu':
          const feishuToken = await FeishuAPI.getAccessToken(config.appId, config.appSecret)
          const feishuUsers = await FeishuAPI.getUserList(feishuToken.tenant_access_token!, 50)
          return feishuUsers.data.items.map((user: any) => ({
            id: user.user_id,
            name: user.name,
            email: user.email,
            mobile: user.mobile
          }))
        
        case 'wechat':
          // 微信小程序/公众号没有直接的用户列表API
          return []
        
        default:
          return []
      }
    } catch (error: any) {
      console.error(`获取${platform}用户列表失败:`, error)
      return []
    }
  }

  /**
   * 发送消息
   */
  static async sendMessage(platform: PlatformType, config: Record<string, string>, userId: string, message: string): Promise<{ success: boolean; message: string }> {
    try {
      switch (platform) {
        case 'dingtalk':
          const dingtalkToken = await DingTalkAPI.getAccessToken(config.appKey, config.appSecret)
          await DingTalkAPI.sendWorkMessage(
            dingtalkToken.access_token,
            config.agentId || '',
            [userId],
            'text',
            { content: message }
          )
          return { success: true, message: '钉钉消息发送成功' }
        
        case 'enterprise':
          const enterpriseToken = await EnterpriseWeChatAPI.getAccessToken(config.corpId, config.corpSecret)
          await EnterpriseWeChatAPI.sendMessage(
            enterpriseToken.access_token,
            config.agentId || '',
            userId,
            'text',
            { content: message }
          )
          return { success: true, message: '企业微信消息发送成功' }
        
        case 'feishu':
          const feishuToken = await FeishuAPI.getAccessToken(config.appId, config.appSecret)
          await FeishuAPI.sendMessage(
            feishuToken.tenant_access_token!,
            userId,
            'text',
            { text: message }
          )
          return { success: true, message: '飞书消息发送成功' }
        
        case 'wechat':
          // 微信小程序/公众号需要模板消息
          return { success: false, message: '微信小程序/公众号需要配置模板消息' }
        
        default:
          return { success: false, message: '不支持的平台' }
      }
    } catch (error: any) {
      return { success: false, message: error.message || '消息发送失败' }
    }
  }
}

// 导出统一API实例
export const platformAPI = new PlatformAPI()
