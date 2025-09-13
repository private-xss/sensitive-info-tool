// 飞书API工具类

// 动态导入Tauri API（仅在Tauri环境中可用）
let tauriFetch: any = null;
try {
  if (typeof window !== 'undefined' && (window as any).__TAURI__) {
    import('@tauri-apps/api/http').then(module => {
      tauriFetch = module.fetch;
    });
  }
} catch (error) {
  console.log('Not in Tauri environment, using browser fetch');
}

// Tauri环境检测
declare global {
  interface Window {
    __TAURI__?: any;
  }
}

export interface FeishuTokenResponse {
  code: number
  msg: string
  tenant_access_token?: string
  app_access_token?: string
  expire: number
}

export interface FeishuUser {
  union_id: string
  user_id: string
  open_id: string
  name: string
  en_name?: string
  email?: string
  mobile?: string
  avatar_url?: string
}

export interface FeishuUserListResponse {
  code: number
  msg: string
  data: {
    has_more: boolean
    page_token?: string
    items: FeishuUser[]
  }
}

export class FeishuAPI {
  private static readonly BASE_URL = 'https://open.feishu.cn/open-apis'

  // 检测是否在Tauri环境中
  private static isTauriEnvironment(): boolean {
    return typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined;
  }

  // 获取适当的fetch函数
  private static async getFetch() {
    if (this.isTauriEnvironment() && tauriFetch) {
      return tauriFetch;
    } else if (this.isTauriEnvironment()) {
      try {
        const module = await import('@tauri-apps/api/http');
        tauriFetch = module.fetch;
        return tauriFetch;
      } catch (error) {
        console.warn('Failed to load Tauri HTTP module, falling back to browser fetch');
        return fetch;
      }
    }
    return fetch;
  }

  /**
   * 获取飞书Access Token (tenant_access_token)
   * @param appId 应用ID
   * @param appSecret 应用密钥
   * @returns Promise<FeishuTokenResponse>
   */
  static async getAccessToken(appId: string, appSecret: string): Promise<FeishuTokenResponse> {
    const url = `${this.BASE_URL}/auth/v3/tenant_access_token/internal`
    
    const body = {
      app_id: appId,
      app_secret: appSecret
    }

    try {
      const fetchFn = await this.getFetch();
      const isTauri = this.isTauriEnvironment();
      
      const response = await fetchFn(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = isTauri ? response.data : await response.json();
      
      if (data.code && data.code !== 0) {
        throw new Error(`飞书API错误: ${data.msg} (错误码: ${data.code})`)
      }

      return data
    } catch (error) {
      console.error('获取飞书Access Token失败:', error)
      throw error
    }
  }

  /**
   * 获取用户列表
   * @param accessToken Access Token
   * @param pageSize 分页大小，默认50
   * @param pageToken 分页标记
   * @returns Promise<FeishuUserListResponse>
   */
  static async getUserList(
    accessToken: string, 
    pageSize: number = 50, 
    pageToken?: string
  ): Promise<FeishuUserListResponse> {
    const url = `${this.BASE_URL}/contact/v3/users`
    const params = new URLSearchParams({
      page_size: pageSize.toString()
    })

    if (pageToken) {
      params.append('page_token', pageToken)
    }

    try {
      const fetchFn = await this.getFetch();
      const isTauri = this.isTauriEnvironment();
      
      const response = await fetchFn(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = isTauri ? response.data : await response.json();
      
      if (data.code && data.code !== 0) {
        throw new Error(`获取用户列表失败: ${data.msg} (错误码: ${data.code})`)
      }

      return data
    } catch (error) {
      console.error('获取用户列表失败:', error)
      throw error
    }
  }

  /**
   * 获取用户详细信息
   * @param accessToken Access Token
   * @param userId 用户ID
   * @returns Promise<any>
   */
  static async getUserDetail(accessToken: string, userId: string): Promise<any> {
    const url = `${this.BASE_URL}/contact/v3/users/${userId}`

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.code && data.code !== 0) {
        throw new Error(`获取用户详情失败: ${data.msg} (错误码: ${data.code})`)
      }

      return data
    } catch (error) {
      console.error('获取用户详情失败:', error)
      throw error
    }
  }

  /**
   * 发送消息
   * @param accessToken Access Token
   * @param receiveId 接收者ID
   * @param msgType 消息类型
   * @param content 消息内容
   * @returns Promise<any>
   */
  static async sendMessage(
    accessToken: string,
    receiveId: string,
    msgType: string,
    content: any
  ): Promise<any> {
    const url = `${this.BASE_URL}/im/v1/messages`
    const params = new URLSearchParams({
      receive_id_type: 'open_id'
    })

    const body = {
      receive_id: receiveId,
      msg_type: msgType,
      content: JSON.stringify(content)
    }

    try {
      const response = await fetch(`${url}?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.code && result.code !== 0) {
        throw new Error(`发送消息失败: ${result.msg} (错误码: ${result.code})`)
      }

      return result
    } catch (error) {
      console.error('发送消息失败:', error)
      throw error
    }
  }

  /**
   * 获取部门列表
   * @param accessToken Access Token
   * @param parentDepartmentId 父部门ID
   * @returns Promise<any>
   */
  static async getDepartmentList(accessToken: string, parentDepartmentId?: string): Promise<any> {
    const url = `${this.BASE_URL}/contact/v3/departments`
    const params = new URLSearchParams({
      page_size: '50'
    })

    if (parentDepartmentId) {
      params.append('parent_department_id', parentDepartmentId)
    }

    try {
      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.code && data.code !== 0) {
        throw new Error(`获取部门列表失败: ${data.msg} (错误码: ${data.code})`)
      }

      return data
    } catch (error) {
      console.error('获取部门列表失败:', error)
      throw error
    }
  }
}
