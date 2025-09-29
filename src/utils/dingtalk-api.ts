// 钉钉API工具类
// 检测是否在Tauri环境中
const isTauri = (() => {
  try {
    import('@tauri-apps/api/http').then(module => {
      console.log('Tauri HTTP模块可用');
    });
    return true;
  } catch {
    return false;
  }
})();

// Tauri环境检测
declare global {
  interface Window {
    __TAURI__?: any;
  }
}

export interface DingTalkTokenResponse {
  access_token: string
  expires_in: number
  errcode?: number
  errmsg?: string
}

export interface DingTalkUser {
  userid: string
  name: string
  mobile?: string
  email?: string
  avatar?: string
  department?: number[]
  position?: string
}

export interface DingTalkUserListResponse {
  errcode: number
  errmsg: string
  hasMore: boolean
  userlist: DingTalkUser[]
}

export class DingTalkAPI {
  private static readonly BASE_URL = 'https://oapi.dingtalk.com'

  /**
   * 获取钉钉Access Token
   * @param appKey 应用的唯一标识key
   * @param appSecret 应用的密钥
   * @returns Promise<DingTalkTokenResponse>
   */
  static async getAccessToken(appKey: string, appSecret: string): Promise<DingTalkTokenResponse> {
    const url = `${this.BASE_URL}/gettoken`
    const params = new URLSearchParams({
      appkey: appKey,
      appsecret: appSecret
    })

    try {
      // 在Tauri环境中使用Tauri的HTTP模块
      if (window.__TAURI__) {
        const module = await import('@tauri-apps/api/http');
        const response = await module.fetch(`${url}?${params}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = response.data as DingTalkTokenResponse;
        
        if (data.errcode && data.errcode !== 0) {
          throw new Error(`钉钉API错误: ${data.errmsg} (错误码: ${data.errcode})`);
        }

        return data;
      } else {
        // 在浏览器环境中使用fetch
        const response = await fetch(`${url}?${params}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.errcode && data.errcode !== 0) {
          throw new Error(`钉钉API错误: ${data.errmsg} (错误码: ${data.errcode})`);
        }

        return data;
      }
    } catch (error) {
      console.error('获取钉钉Access Token失败:', error);
      throw error;
    }
  }

  /**
   * 获取部门列表
   * @param accessToken Access Token
   * @param parentId 父部门ID，不传获取根部门
   * @returns Promise<any>
   */
  static async getDepartmentList(accessToken: string, parentId?: number): Promise<any> {
    const url = `${this.BASE_URL}/department/list`
    const params = new URLSearchParams({
      access_token: accessToken
    })

    if (parentId) {
      params.append('id', parentId.toString())
    }

    try {
      // 在Tauri环境中使用Tauri的HTTP模块
      if (window.__TAURI__) {
        const module = await import('@tauri-apps/api/http');
        const response = await module.fetch(`${url}?${params}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = response.data as any;
        
        if (data.errcode && data.errcode !== 0) {
          throw new Error(`获取部门列表失败: ${data.errmsg} (错误码: ${data.errcode})`);
        }

        return data;
      } else {
        // 在浏览器环境中使用fetch
        const response = await fetch(`${url}?${params}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.errcode && data.errcode !== 0) {
          throw new Error(`获取部门列表失败: ${data.errmsg} (错误码: ${data.errcode})`);
        }

        return data;
      }
    } catch (error) {
      console.error('获取部门列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取部门用户列表
   * @param accessToken Access Token
   * @param departmentId 部门ID
   * @param offset 偏移量，默认0
   * @param size 分页大小，默认100
   * @returns Promise<DingTalkUserListResponse>
   */
  static async getDepartmentUsers(
    accessToken: string, 
    departmentId: number, 
    offset: number = 0, 
    size: number = 100
  ): Promise<DingTalkUserListResponse> {
    const url = `${this.BASE_URL}/user/simplelist`
    const params = new URLSearchParams({
      access_token: accessToken,
      department_id: departmentId.toString(),
      offset: offset.toString(),
      size: size.toString()
    })

    try {
      // 在Tauri环境中使用Tauri的HTTP模块
      if (window.__TAURI__) {
        const module = await import('@tauri-apps/api/http');
        const response = await module.fetch(`${url}?${params}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = response.data as DingTalkUserListResponse;
        
        if (data.errcode && data.errcode !== 0) {
          throw new Error(`获取部门用户失败: ${data.errmsg} (错误码: ${data.errcode})`);
        }

        return data;
      } else {
        // 在浏览器环境中使用fetch
        const response = await fetch(`${url}?${params}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.errcode && data.errcode !== 0) {
          throw new Error(`获取部门用户失败: ${data.errmsg} (错误码: ${data.errcode})`);
        }

        return data;
      }
    } catch (error) {
      console.error('获取部门用户失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户详细信息
   * @param accessToken Access Token
   * @param userid 用户ID
   * @returns Promise<any>
   */
  static async getUserDetail(accessToken: string, userid: string): Promise<any> {
    const url = `${this.BASE_URL}/user/get`
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
   * 发送工作通知消息
   * @param accessToken Access Token
   * @param agentId 应用ID
   * @param userIdList 接收者用户ID列表
   * @param msgType 消息类型
   * @param content 消息内容
   * @returns Promise<any>
   */
  static async sendWorkMessage(
    accessToken: string,
    agentId: string,
    userIdList: string[],
    msgType: string,
    content: any
  ): Promise<any> {
    const url = `${this.BASE_URL}/topapi/message/corpconversation/asyncsend_v2`
    const params = new URLSearchParams({
      access_token: accessToken
    })

    const body = {
      agent_id: agentId,
      userid_list: userIdList.join(','),
      msg: {
        msgtype: msgType,
        [msgType]: content
      }
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
        throw new Error(`发送工作通知失败: ${result.errmsg} (错误码: ${result.errcode})`)
      }

      return result
    } catch (error) {
      console.error('发送工作通知失败:', error)
      throw error
    }
  }

  /**
   * 获取用户手机号
   * @param accessToken Access Token
   * @param code 免登授权码
   * @returns Promise<any>
   */
  static async getUserMobile(accessToken: string, code: string): Promise<any> {
    const url = `${this.BASE_URL}/user/get_by_mobile`
    const params = new URLSearchParams({
      access_token: accessToken,
      mobile: code
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
        throw new Error(`获取用户手机号失败: ${data.errmsg} (错误码: ${data.errcode})`)
      }

      return data
    } catch (error) {
      console.error('获取用户手机号失败:', error)
      throw error
    }
  }
}
