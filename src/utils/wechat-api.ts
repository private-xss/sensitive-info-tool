// 微信小程序/公众号API工具类

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

export interface WeChatTokenResponse {
  access_token: string
  expires_in: number
  errcode?: number
  errmsg?: string
}

export interface WeChatUserInfo {
  openid: string
  session_key: string
  unionid?: string
}

export class WeChatAPI {
  private static readonly BASE_URL = 'https://api.weixin.qq.com'

  // 检测是否在Tauri环境中
  private static isTauriEnvironment(): boolean {
    return typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined;
  }

  // 获取适当的fetch函数
  private static async getFetch() {
    if (this.isTauriEnvironment() && tauriFetch) {
      return tauriFetch;
    } else if (this.isTauriEnvironment()) {
      // 如果在Tauri环境但还没有加载，动态导入
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
   * 获取微信小程序/公众号Access Token
   * @param appId 小程序的AppID或公众号的AppID
   * @param appSecret 小程序的AppSecret或公众号的AppSecret
   * @returns Promise<WeChatTokenResponse>
   */
  static async getAccessToken(appId: string, appSecret: string): Promise<WeChatTokenResponse> {
    const url = `${this.BASE_URL}/cgi-bin/token`
    const params = new URLSearchParams({
      grant_type: 'client_credential',
      appid: appId,
      secret: appSecret
    })

    try {
      console.log(`环境检测: ${this.isTauriEnvironment() ? 'Tauri' : '浏览器'}`)
      console.log(`请求URL: ${url}?${params}`)
      console.log(`App ID: ${appId}`)
      console.log(`App Secret: ${appSecret.substring(0, 8)}...`)
      
      const fetchFn = await this.getFetch();
      const isTauri = this.isTauriEnvironment();
      
      const response = await fetchFn(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; sensitive-info-tool)'
        }
      })

      console.log(`响应状态: ${response.status}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`)
      }

      // Tauri和浏览器的响应处理方式不同
      const data = isTauri ? response.data : await response.json();
      console.log(`响应数据:`, data)
      
      if (data.errcode && data.errcode !== 0) {
        throw new Error(`微信API错误: ${data.errmsg} (错误码: ${data.errcode})`)
      }

      return data
    } catch (error) {
      console.error('获取Access Token失败:', error)
      throw error
    }
  }

  /**
   * 验证Access Token是否有效
   * @param accessToken Access Token
   * @returns Promise<boolean>
   */
  static async validateAccessToken(accessToken: string): Promise<boolean> {
    const url = `${this.BASE_URL}/cgi-bin/get_api_domain_ip`
    const params = new URLSearchParams({
      access_token: accessToken
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
        return false
      }

      const data = isTauri ? response.data : await response.json();
      return !data.errcode || data.errcode === 0
    } catch (error) {
      console.error('验证Access Token失败:', error)
      return false
    }
  }

  /**
   * 获取小程序码（需要Access Token）
   * @param accessToken Access Token
   * @param scene 场景值
   * @param page 页面路径
   * @returns Promise<Blob>
   */
  static async getWxaCode(accessToken: string, scene: string, page?: string): Promise<Blob> {
    const url = `${this.BASE_URL}/wxa/getwxacodeunlimit`
    const params = new URLSearchParams({
      access_token: accessToken
    })

    const body = {
      scene: scene,
      page: page || 'pages/index/index',
      width: 430,
      auto_color: false,
      line_color: { r: 0, g: 0, b: 0 },
      is_hyaline: false
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

      return await response.blob()
    } catch (error) {
      console.error('获取小程序码失败:', error)
      throw error
    }
  }

  /**
   * 发送模板消息（需要Access Token）
   * @param accessToken Access Token
   * @param openid 用户openid
   * @param templateId 模板ID
   * @param data 模板数据
   * @returns Promise<any>
   */
  static async sendTemplateMessage(
    accessToken: string, 
    openid: string, 
    templateId: string, 
    data: any
  ): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/message/wxopen/template/send`
    const params = new URLSearchParams({
      access_token: accessToken
    })

    const body = {
      touser: openid,
      template_id: templateId,
      page: 'pages/index/index',
      data: data
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
        throw new Error(`发送模板消息失败: ${result.errmsg} (错误码: ${result.errcode})`)
      }

      return result
    } catch (error) {
      console.error('发送模板消息失败:', error)
      throw error
    }
  }

  /**
   * 获取用户信息（通过code）
   * @param appId 小程序AppID
   * @param appSecret 小程序AppSecret
   * @param code 用户授权码
   * @returns Promise<WeChatUserInfo>
   */
  static async getUserInfo(appId: string, appSecret: string, code: string): Promise<WeChatUserInfo> {
    const url = `${this.BASE_URL}/sns/jscode2session`
    const params = new URLSearchParams({
      appid: appId,
      secret: appSecret,
      js_code: code,
      grant_type: 'authorization_code'
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
        throw new Error(`获取用户信息失败: ${data.errmsg} (错误码: ${data.errcode})`)
      }

      return data
    } catch (error) {
      console.error('获取用户信息失败:', error)
      throw error
    }
  }

  /**
   * 获取小程序码
   * @param accessToken Access Token
   * @param path 页面路径
   * @param scene 场景值
   * @returns Promise<any>
   */
  static async getQRCode(accessToken: string, path: string, scene: string): Promise<any> {
    const url = `${this.BASE_URL}/wxa/getwxacodeunlimit`
    
    const body = {
      scene: scene,
      page: path,
      width: 430,
      auto_color: false,
      line_color: { r: 0, g: 0, b: 0 },
      is_hyaline: false
    }

    try {
      const fetchFn = await this.getFetch();
      const isTauri = this.isTauriEnvironment();
      
      const response = await fetchFn(`${url}?access_token=${accessToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      if (isTauri) {
        // Tauri环境下的处理
        const data = response.data;
        if (data.errcode && data.errcode !== 0) {
          throw new Error(`获取小程序码失败: ${data.errmsg} (错误码: ${data.errcode})`)
        }
        return { url: 'data:image/jpeg;base64,' + data, type: 'image' };
      } else {
        // 浏览器环境下的处理
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json()
          if (data.errcode && data.errcode !== 0) {
            throw new Error(`获取小程序码失败: ${data.errmsg} (错误码: ${data.errcode})`)
          }
          return data
        } else {
          // 返回图片数据
          const blob = await response.blob()
          const imageUrl = URL.createObjectURL(blob)
          return { url: imageUrl, type: 'image' }
        }
      }
    } catch (error) {
      console.error('获取小程序码失败:', error)
      throw error
    }
  }


}
