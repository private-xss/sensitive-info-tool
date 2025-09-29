// 企业微信API工具类

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

export interface EnterpriseWeChatTokenResponse {
  access_token: string
  expires_in: number
  errcode?: number
  errmsg?: string
}

export interface EnterpriseWeChatUser {
  userid: string
  name: string
  department: number[]
  position?: string
  mobile?: string
  email?: string
  avatar?: string
}

export interface EnterpriseWeChatUserListResponse {
  errcode: number
  errmsg: string
  userlist: EnterpriseWeChatUser[]
}

export class EnterpriseWeChatAPI {
  private static readonly BASE_URL = 'https://qyapi.weixin.qq.com'

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
   * 获取企业微信Access Token
   * @param corpId 企业ID
   * @param corpSecret 应用的凭证密钥
   * @returns Promise<EnterpriseWeChatTokenResponse>
   */
  static async getAccessToken(corpId: string, corpSecret: string): Promise<EnterpriseWeChatTokenResponse> {
    const url = `${this.BASE_URL}/cgi-bin/gettoken`
    const params = new URLSearchParams({
      corpid: corpId,
      corpsecret: corpSecret
    })

    try {
      const fetchFn = await this.getFetch();
      const isTauri = this.isTauriEnvironment();
      
      const response = await fetchFn(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = isTauri ? response.data : await response.json();
      
      if (data.errcode && data.errcode !== 0) {
        throw new Error(`企业微信API错误: ${data.errmsg} (错误码: ${data.errcode})`)
      }

      return data
    } catch (error) {
      console.error('获取企业微信Access Token失败:', error)
      throw error
    }
  }

  /**
   * 获取部门列表
   * @param accessToken Access Token
   * @param departmentId 部门ID，不传获取所有部门
   * @returns Promise<any>
   */
  static async getDepartmentList(accessToken: string, departmentId?: number): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/department/list`
    const params = new URLSearchParams({
      access_token: accessToken
    })

    if (departmentId) {
      params.append('id', departmentId.toString())
    }

    try {
      const fetchFn = await this.getFetch();
      const isTauri = this.isTauriEnvironment();
      
      const response = await fetchFn(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = isTauri ? response.data : await response.json();
      
      if (data.errcode && data.errcode !== 0) {
        throw new Error(`获取部门列表失败: ${data.errmsg} (错误码: ${data.errcode})`)
      }

      return data
    } catch (error) {
      console.error('获取部门列表失败:', error)
      throw error
    }
  }

  /**
   * 获取部门成员列表
   * @param accessToken Access Token
   * @param departmentId 部门ID
   * @param fetchChild 是否递归获取子部门成员
   * @returns Promise<EnterpriseWeChatUserListResponse>
   */
  static async getDepartmentUsers(
    accessToken: string, 
    departmentId: number, 
    fetchChild: boolean = false
  ): Promise<EnterpriseWeChatUserListResponse> {
    const url = `${this.BASE_URL}/cgi-bin/user/simplelist`
    const params = new URLSearchParams({
      access_token: accessToken,
      department_id: departmentId.toString(),
      fetch_child: fetchChild ? '1' : '0'
    })

    try {
      const fetchFn = await this.getFetch();
      const isTauri = this.isTauriEnvironment();
      
      const response = await fetchFn(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = isTauri ? response.data : await response.json();
      
      if (data.errcode && data.errcode !== 0) {
        throw new Error(`获取部门成员失败: ${data.errmsg} (错误码: ${data.errcode})`)
      }

      return data
    } catch (error) {
      console.error('获取部门成员失败:', error)
      throw error
    }
  }

  /**
   * 获取用户详细信息
   * @param accessToken Access Token
   * @param userid 用户ID
   * @returns Promise<any>
   */
  static async getUserDetail(accessToken: string, userid: string): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/user/get`
    const params = new URLSearchParams({
      access_token: accessToken,
      userid: userid
    })

    try {
      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.errcode && data.errcode !== 0) {
        throw new Error(`获取用户详情失败: ${data.errmsg} (错误码: ${data.errcode})`)
      }

      return data
    } catch (error) {
      console.error('获取用户详情失败:', error)
      throw error
    }
  }

  /**
   * 发送应用消息
   * @param accessToken Access Token
   * @param agentid 应用ID
   * @param touser 接收用户ID，多个用|分隔
   * @param msgtype 消息类型
   * @param content 消息内容
   * @returns Promise<any>
   */
  static async sendMessage(
    accessToken: string,
    agentid: string,
    touser: string,
    msgtype: string,
    content: any
  ): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/message/send`
    const params = new URLSearchParams({
      access_token: accessToken
    })

    const body = {
      touser: touser,
      agentid: agentid,
      msgtype: msgtype,
      [msgtype]: content
    }

    try {
      const response = await fetch(`${url}?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.errcode && result.errcode !== 0) {
        throw new Error(`发送消息失败: ${result.errmsg} (错误码: ${result.errcode})`)
      }

      return result
    } catch (error) {
      console.error('发送消息失败:', error)
      throw error
    }
  }
}
