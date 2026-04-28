// 微信小程序/公众号API工具类
import '../types'  // 导入全局类型声明

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

// Tauri HTTP 模块类型
interface TauriBody {
  type: string
  payload: any
}

interface TauriResponse<T> {
  url: string
  status: number
  ok: boolean
  headers: Record<string, string>
  data: T
}

// 动态导入Tauri API（仅在Tauri环境中可用）
let tauriHttpModule: any = null

export class WeChatAPI {
  private static readonly BASE_URL = 'https://api.weixin.qq.com'

  // 检测是否在Tauri环境中
  private static isTauriEnvironment(): boolean {
    return typeof window !== 'undefined' && window.__TAURI__ !== undefined;
  }

  // 获取Tauri HTTP模块
  private static async getTauriHttp() {
    if (tauriHttpModule) {
      return tauriHttpModule;
    }
    try {
      tauriHttpModule = await import('@tauri-apps/api/http');
      return tauriHttpModule;
    } catch (error) {
      console.warn('Failed to load Tauri HTTP module');
      return null;
    }
  }

  // 统一的HTTP请求方法
  private static async httpRequest<T>(
    url: string,
    method: 'GET' | 'POST',
    options?: {
      headers?: Record<string, string>
      body?: any
      queryParams?: Record<string, string>
    }
  ): Promise<T> {
    const http = await this.getTauriHttp();

    if (http && this.isTauriEnvironment()) {
      // 使用 Tauri HTTP 模块
      const fetchOptions: any = {
        method,
        headers: options?.headers || {},
      };

      if (options?.queryParams) {
        fetchOptions.query = options.queryParams;
      }

      if (options?.body && method === 'POST') {
        fetchOptions.body = http.Body.json(options.body);
      }

      const response: TauriResponse<T> = await http.fetch(url, fetchOptions);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.data;
    } else {
      // 回退到浏览器 fetch
      const response = await fetch(url, {
        method,
        headers: options?.headers || {},
        body: options?.body && method === 'POST' ? JSON.stringify(options.body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json() as T;
    }
  }

  // 检查微信API错误
  private static checkError(data: any, operation: string): void {
    if (data.errcode && data.errcode !== 0) {
      throw new Error(`${operation}: ${data.errmsg} (错误码: ${data.errcode})`);
    }
  }

  /**
   * 获取微信小程序/公众号Access Token
   */
  static async getAccessToken(appId: string, appSecret: string): Promise<WeChatTokenResponse> {
    const url = `${this.BASE_URL}/cgi-bin/token`

    try {
      const data = await this.httpRequest<WeChatTokenResponse>(url, 'GET', {
        queryParams: {
          grant_type: 'client_credential',
          appid: appId,
          secret: appSecret
        }
      });

      this.checkError(data, '微信API错误');
      return data;
    } catch (error) {
      console.error('获取Access Token失败:', error);
      throw error;
    }
  }

  /**
   * 验证Access Token是否有效
   */
  static async validateAccessToken(accessToken: string): Promise<boolean> {
    const url = `${this.BASE_URL}/cgi-bin/get_api_domain_ip`

    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        queryParams: { access_token: accessToken }
      });

      return !data.errcode || data.errcode === 0;
    } catch (error) {
      console.error('验证Access Token失败:', error);
      return false;
    }
  }

  /**
   * 获取小程序码（需要Access Token）
   */
  static async getWxaCode(accessToken: string, scene: string, page?: string): Promise<any> {
    const url = `${this.BASE_URL}/wxa/getwxacodeunlimit`

    const body = {
      scene: scene,
      page: page || 'pages/index/index',
      width: 430,
      auto_color: false,
      line_color: { r: 0, g: 0, b: 0 },
      is_hyaline: false
    }

    try {
      const http = await this.getTauriHttp();

      if (http && this.isTauriEnvironment()) {
        const response = await http.fetch(url, {
          method: 'POST',
          query: { access_token: accessToken },
          headers: { 'Content-Type': 'application/json' },
          body: http.Body.json(body),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = response.data;
        if (data.errcode && data.errcode !== 0) {
          throw new Error(`获取小程序码失败: ${data.errmsg} (错误码: ${data.errcode})`);
        }
        return { url: 'data:image/jpeg;base64,' + data, type: 'image' };
      } else {
        const response = await fetch(`${url}?access_token=${accessToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          this.checkError(data, '获取小程序码失败');
          return data;
        } else {
          const blob = await response.blob();
          const imageUrl = URL.createObjectURL(blob);
          return { url: imageUrl, type: 'image' };
        }
      }
    } catch (error) {
      console.error('获取小程序码失败:', error);
      throw error;
    }
  }

  /**
   * 发送模板消息（需要Access Token）
   */
  static async sendTemplateMessage(
    accessToken: string,
    openid: string,
    templateId: string,
    data: any
  ): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/message/wxopen/template/send`

    const body = {
      touser: openid,
      template_id: templateId,
      page: 'pages/index/index',
      data: data
    }

    try {
      const result = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body
      });

      this.checkError(result, '发送模板消息失败');
      return result;
    } catch (error) {
      console.error('发送模板消息失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户信息（通过code）
   */
  static async getUserInfo(appId: string, appSecret: string, code: string): Promise<WeChatUserInfo> {
    const url = `${this.BASE_URL}/sns/jscode2session`

    try {
      const data = await this.httpRequest<WeChatUserInfo>(url, 'GET', {
        queryParams: {
          appid: appId,
          secret: appSecret,
          js_code: code,
          grant_type: 'authorization_code'
        }
      });

      this.checkError(data as any, '获取用户信息失败');
      return data;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取小程序码 (别名方法)
   */
  static async getQRCode(accessToken: string, path: string, scene: string): Promise<any> {
    return this.getWxaCode(accessToken, scene, path);
  }

  // ===== 新增: 微信公众号/小程序更多功能 =====

  /**
   * 获取关注该公众号/小程序的用户列表 (公众号)
   */
  static async getUserList(accessToken: string, nextOpenid?: string): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/user/get`
    const queryParams: Record<string, string> = { access_token: accessToken }
    if (nextOpenid) {
      queryParams.next_openid = nextOpenid
    }
    try {
      const data = await this.httpRequest<any>(url, 'GET', { queryParams });
      this.checkError(data, '获取用户列表失败');
      return data;
    } catch (error) {
      console.error('获取用户列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户基本信息 (公众号 - UnionID机制)
   */
  static async getUserInfoByOpenid(accessToken: string, openid: string, lang: string = 'zh_CN'): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/user/info`
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        queryParams: { access_token: accessToken, openid, lang }
      });
      this.checkError(data, '获取用户基本信息失败');
      return data;
    } catch (error) {
      console.error('获取用户基本信息失败:', error);
      throw error;
    }
  }

  /**
   * 批量获取用户基本信息
   */
  static async batchGetUserInfo(accessToken: string, userList: { openid: string; lang?: string }[]): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/user/info/batchget`
    const body = {
      user_list: userList.map(u => ({ openid: u.openid, lang: u.lang || 'zh_CN' }))
    }
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body
      });
      this.checkError(data, '批量获取用户信息失败');
      return data;
    } catch (error) {
      console.error('批量获取用户信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取菜单配置
   */
  static async getMenu(accessToken: string): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/menu/get`
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        queryParams: { access_token: accessToken }
      });
      this.checkError(data, '获取菜单失败');
      return data;
    } catch (error) {
      console.error('获取菜单失败:', error);
      throw error;
    }
  }

  /**
   * 创建自定义菜单
   */
  static async createMenu(accessToken: string, menuData: any): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/menu/create`
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body: menuData
      });
      this.checkError(data, '创建菜单失败');
      return data;
    } catch (error) {
      console.error('创建菜单失败:', error);
      throw error;
    }
  }

  /**
   * 删除自定义菜单
   */
  static async deleteMenu(accessToken: string): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/menu/delete`
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        queryParams: { access_token: accessToken }
      });
      this.checkError(data, '删除菜单失败');
      return data;
    } catch (error) {
      console.error('删除菜单失败:', error);
      throw error;
    }
  }

  /**
   * 获取模板列表 (小程序)
   */
  static async getTemplateList(accessToken: string): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/wxopen/template/list`
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        queryParams: { access_token: accessToken }
      });
      this.checkError(data, '获取模板列表失败');
      return data;
    } catch (error) {
      console.error('获取模板列表失败:', error);
      throw error;
    }
  }

  /**
   * 发送订阅消息 (小程序)
   */
  static async sendSubscribeMessage(accessToken: string, openid: string, templateId: string, data: any, page?: string): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/message/subscribe/send`
    const body: any = {
      touser: openid,
      template_id: templateId,
      data
    }
    if (page) body.page = page
    try {
      const result = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body
      });
      this.checkError(result, '发送订阅消息失败');
      return result;
    } catch (error) {
      console.error('发送订阅消息失败:', error);
      throw error;
    }
  }

  /**
   * 获取素材列表
   */
  static async getMaterialList(accessToken: string, type: string = 'image', offset: number = 0, count: number = 20): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/material/batchget_material`
    const body = { type, offset, count }
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body
      });
      this.checkError(data, '获取素材列表失败');
      return data;
    } catch (error) {
      console.error('获取素材列表失败:', error);
      throw error;
    }
  }

  /**
   * 上传临时素材
   */
  static async uploadMedia(accessToken: string, mediaType: string, mediaData: any): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/media/upload`
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken, type: mediaType },
        body: mediaData
      });
      this.checkError(data, '上传素材失败');
      return data;
    } catch (error) {
      console.error('上传素材失败:', error);
      throw error;
    }
  }

  /**
   * 获取公众号的自动回复规则
   */
  static async getCurrentAutoreplyInfo(accessToken: string): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/get_current_autoreply_info`
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        queryParams: { access_token: accessToken }
      });
      this.checkError(data, '获取自动回复规则失败');
      return data;
    } catch (error) {
      console.error('获取自动回复规则失败:', error);
      throw error;
    }
  }

  /**
   * 生成带参数的二维码 (公众号)
   */
  static async createQrCode(accessToken: string, sceneStr: string, expireSeconds?: number): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/qrcode/create`
    const body: any = expireSeconds
      ? { expire_seconds: expireSeconds, action_name: 'QR_STR_SCENE', action_info: { scene: { scene_str } } }
      : { action_name: 'QR_LIMIT_STR_SCENE', action_info: { scene: { scene_str } } }
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body
      });
      this.checkError(data, '生成二维码失败');
      return data;
    } catch (error) {
      console.error('生成二维码失败:', error);
      throw error;
    }
  }

  /**
   * 短key托管 (获取短链接)
   */
  static async getShortUrl(accessToken: string, longUrl: string): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/shorten/gen`
    const body = { long_url: longUrl }
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body
      });
      this.checkError(data, '获取短链接失败');
      return data;
    } catch (error) {
      console.error('获取短链接失败:', error);
      throw error;
    }
  }

  /**
   * 获取小程序数据日报
   */
  static async getDailySummary(accessToken: string, date: string, days: number = 7): Promise<any> {
    const url = `${this.BASE_URL}/datacube/getweanalysisappiddailysummarytrend`
    const body = { begin_date: date, end_date: date }
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body
      });
      this.checkError(data, '获取数据日报失败');
      return data;
    } catch (error) {
      console.error('获取数据日报失败:', error);
      throw error;
    }
  }

  /**
   * 获取小程序访问留存
   */
  static async getDailyRetain(accessToken: string, date: string): Promise<any> {
    const url = `${this.BASE_URL}/datacube/getweanalysisappiddailyretaininfo`
    const body = { begin_date: date, end_date: date }
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body
      });
      this.checkError(data, '获取访问留存失败');
      return data;
    } catch (error) {
      console.error('获取访问留存失败:', error);
      throw error;
    }
  }

  /**
   * 获取小程序访问页面数据
   */
  static async getDailyVisitPage(accessToken: string, date: string): Promise<any> {
    const url = `${this.BASE_URL}/datacube/getweanalysisappidvisitpage`
    const body = { begin_date: date, end_date: date }
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body
      });
      this.checkError(data, '获取访问页面数据失败');
      return data;
    } catch (error) {
      console.error('获取访问页面数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取接口分析数据
   */
  static async getApiAnalysis(accessToken: string, date: string): Promise<any> {
    const url = `${this.BASE_URL}/datacube/getweanalysisapiddailysummarytrend`
    const body = { begin_date: date, end_date: date }
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body
      });
      this.checkError(data, '获取接口分析数据失败');
      return data;
    } catch (error) {
      console.error('获取接口分析数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取微信服务器IP地址
   */
  static async getCallbackIp(accessToken: string): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/getcallbackip`
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        queryParams: { access_token: accessToken }
      });
      this.checkError(data, '获取微信服务器IP失败');
      return data;
    } catch (error) {
      console.error('获取微信服务器IP失败:', error);
      throw error;
    }
  }

  /**
   * 网络检测
   */
  static async netCheck(accessToken: string, action: string = 'all', checkOperator: string = 'DEFAULT'): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/callback/check`
    const body = { action, check_operator: checkOperator }
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body
      });
      this.checkError(data, '网络检测失败');
      return data;
    } catch (error) {
      console.error('网络检测失败:', error);
      throw error;
    }
  }
}
