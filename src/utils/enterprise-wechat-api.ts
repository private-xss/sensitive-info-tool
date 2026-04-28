// 企业微信API工具类
import '../types'  // 导入全局类型声明

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

// Tauri HTTP 模块类型
interface TauriResponse<T> {
  url: string
  status: number
  ok: boolean
  headers: Record<string, string>
  data: T
}

// 动态导入Tauri API（仅在Tauri环境中可用）
let tauriHttpModule: any = null

export class EnterpriseWeChatAPI {
  private static readonly BASE_URL = 'https://qyapi.weixin.qq.com'

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

  // 检查企业微信API错误
  private static checkError(data: any, operation: string): void {
    if (data.errcode && data.errcode !== 0) {
      throw new Error(`${operation}: ${data.errmsg} (错误码: ${data.errcode})`);
    }
  }

  /**
   * 获取企业微信Access Token
   */
  static async getAccessToken(corpId: string, corpSecret: string): Promise<EnterpriseWeChatTokenResponse> {
    const url = `${this.BASE_URL}/cgi-bin/gettoken`

    try {
      const data = await this.httpRequest<EnterpriseWeChatTokenResponse>(url, 'GET', {
        queryParams: {
          corpid: corpId,
          corpsecret: corpSecret
        }
      });

      this.checkError(data, '企业微信API错误');
      return data;
    } catch (error) {
      console.error('获取企业微信Access Token失败:', error);
      throw error;
    }
  }

  /**
   * 获取部门列表
   */
  static async getDepartmentList(accessToken: string, departmentId?: number): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/department/list`
    const queryParams: Record<string, string> = { access_token: accessToken }

    if (departmentId) {
      queryParams.id = departmentId.toString()
    }

    try {
      const data = await this.httpRequest<any>(url, 'GET', { queryParams });
      this.checkError(data, '获取部门列表失败');
      return data;
    } catch (error) {
      console.error('获取部门列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取部门成员列表
   */
  static async getDepartmentUsers(
    accessToken: string,
    departmentId: number,
    fetchChild: boolean = false
  ): Promise<EnterpriseWeChatUserListResponse> {
    const url = `${this.BASE_URL}/cgi-bin/user/simplelist`

    try {
      const data = await this.httpRequest<EnterpriseWeChatUserListResponse>(url, 'GET', {
        queryParams: {
          access_token: accessToken,
          department_id: departmentId.toString(),
          fetch_child: fetchChild ? '1' : '0'
        }
      });

      this.checkError(data, '获取部门成员失败');
      return data;
    } catch (error) {
      console.error('获取部门成员失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户详细信息
   */
  static async getUserDetail(accessToken: string, userid: string): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/user/get`

    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        queryParams: {
          access_token: accessToken,
          userid: userid
        }
      });

      this.checkError(data, '获取用户详情失败');
      return data;
    } catch (error) {
      console.error('获取用户详情失败:', error);
      throw error;
    }
  }

  /**
   * 发送应用消息
   */
  static async sendMessage(
    accessToken: string,
    agentid: string,
    touser: string,
    msgtype: string,
    content: any
  ): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/message/send`

    const body = {
      touser: touser,
      agentid: agentid,
      msgtype: msgtype,
      [msgtype]: content
    }

    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body
      });

      this.checkError(data, '发送消息失败');
      return data;
    } catch (error) {
      console.error('发送消息失败:', error);
      throw error;
    }
  }

  // ===== 新增: 企业微信更多功能 =====

  /**
   * 创建部门
   */
  static async createDepartment(accessToken: string, name: string, parentid: number, order?: number, id?: number): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/department/create`
    const body: any = { name, parentid }
    if (order !== undefined) body.order = order
    if (id !== undefined) body.id = id
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body
      });
      this.checkError(data, '创建部门失败');
      return data;
    } catch (error) {
      console.error('创建部门失败:', error);
      throw error;
    }
  }

  /**
   * 更新部门
   */
  static async updateDepartment(accessToken: string, id: number, name?: string, parentid?: number, order?: number): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/department/update`
    const body: any = { id }
    if (name !== undefined) body.name = name
    if (parentid !== undefined) body.parentid = parentid
    if (order !== undefined) body.order = order
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body
      });
      this.checkError(data, '更新部门失败');
      return data;
    } catch (error) {
      console.error('更新部门失败:', error);
      throw error;
    }
  }

  /**
   * 删除部门
   */
  static async deleteDepartment(accessToken: string, id: number): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/department/delete`
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        queryParams: { access_token: accessToken, id: id.toString() }
      });
      this.checkError(data, '删除部门失败');
      return data;
    } catch (error) {
      console.error('删除部门失败:', error);
      throw error;
    }
  }

  /**
   * 创建成员
   */
  static async createUser(accessToken: string, userData: any): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/user/create`
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body: userData
      });
      this.checkError(data, '创建成员失败');
      return data;
    } catch (error) {
      console.error('创建成员失败:', error);
      throw error;
    }
  }

  /**
   * 更新成员
   */
  static async updateUser(accessToken: string, userData: any): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/user/update`
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body: userData
      });
      this.checkError(data, '更新成员失败');
      return data;
    } catch (error) {
      console.error('更新成员失败:', error);
      throw error;
    }
  }

  /**
   * 删除成员
   */
  static async deleteUser(accessToken: string, userid: string): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/user/delete`
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        queryParams: { access_token: accessToken, userid }
      });
      this.checkError(data, '删除成员失败');
      return data;
    } catch (error) {
      console.error('删除成员失败:', error);
      throw error;
    }
  }

  /**
   * 获取标签列表
   */
  static async getTagList(accessToken: string): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/tag/list`
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        queryParams: { access_token: accessToken }
      });
      this.checkError(data, '获取标签列表失败');
      return data;
    } catch (error) {
      console.error('获取标签列表失败:', error);
      throw error;
    }
  }

  /**
   * 创建标签
   */
  static async createTag(accessToken: string, tagName: string): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/tag/create`
    const body = { tagname: tagName }
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body
      });
      this.checkError(data, '创建标签失败');
      return data;
    } catch (error) {
      console.error('创建标签失败:', error);
      throw error;
    }
  }

  /**
   * 获取标签成员
   */
  static async getTagUsers(accessToken: string, tagId: number): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/tag/get`
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        queryParams: { access_token: accessToken, tagid: tagId.toString() }
      });
      this.checkError(data, '获取标签成员失败');
      return data;
    } catch (error) {
      console.error('获取标签成员失败:', error);
      throw error;
    }
  }

  /**
   * 邀请成员加入企业
   */
  static async inviteUser(accessToken: string, userIds: string[]): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/batch/invite`
    const body = { user: userIds }
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body
      });
      this.checkError(data, '邀请成员失败');
      return data;
    } catch (error) {
      console.error('邀请成员失败:', error);
      throw error;
    }
  }

  /**
   * 获取企业微信服务器IP
   */
  static async getCallbackIp(accessToken: string): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/getcallbackip`
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        queryParams: { access_token: accessToken }
      });
      this.checkError(data, '获取服务器IP失败');
      return data;
    } catch (error) {
      console.error('获取服务器IP失败:', error);
      throw error;
    }
  }

  /**
   * 获取应用信息
   */
  static async getAgent(accessToken: string, agentid: string): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/agent/get`
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        queryParams: { access_token: accessToken, agentid }
      });
      this.checkError(data, '获取应用信息失败');
      return data;
    } catch (error) {
      console.error('获取应用信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取应用列表
   */
  static async getAgentList(accessToken: string): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/agent/list`
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        queryParams: { access_token: accessToken }
      });
      this.checkError(data, '获取应用列表失败');
      return data;
    } catch (error) {
      console.error('获取应用列表失败:', error);
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
   * 发送交互式卡片消息
   */
  static async sendInteractiveCard(accessToken: string, agentid: string, touser: string, cardData: any): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/message/send`
    const body = {
      touser,
      agentid,
      msgtype: 'interactive_card',
      interactive_card: cardData
    }
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body
      });
      this.checkError(data, '发送卡片消息失败');
      return data;
    } catch (error) {
      console.error('发送卡片消息失败:', error);
      throw error;
    }
  }

  /**
   * 获取外部联系人列表
   */
  static async getExternalContactList(accessToken: string, offset?: number): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/externalcontact/list`
    const queryParams: Record<string, string> = { access_token: accessToken }
    if (offset !== undefined) queryParams.offset = offset.toString()
    try {
      const data = await this.httpRequest<any>(url, 'GET', { queryParams });
      this.checkError(data, '获取外部联系人列表失败');
      return data;
    } catch (error) {
      console.error('获取外部联系人列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取外部联系人详情
   */
  static async getExternalContactDetail(accessToken: string, externalUserId: string): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/externalcontact/get`
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        queryParams: { access_token: accessToken, external_userid: externalUserId }
      });
      this.checkError(data, '获取外部联系人详情失败');
      return data;
    } catch (error) {
      console.error('获取外部联系人详情失败:', error);
      throw error;
    }
  }

  /**
   * 获取客户群列表
   */
  static async getExternalGroupChatList(accessToken: string, offset?: number, limit?: number): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/externalcontact/groupchat/list`
    const body: any = { offset: offset || 0, limit: limit || 50, status_filter: 0 }
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body
      });
      this.checkError(data, '获取客户群列表失败');
      return data;
    } catch (error) {
      console.error('获取客户群列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取客户群详情
   */
  static async getExternalGroupChatDetail(accessToken: string, chatId: string): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/externalcontact/groupchat/get`
    const body = { chat_id: chatId }
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body
      });
      this.checkError(data, '获取客户群详情失败');
      return data;
    } catch (error) {
      console.error('获取客户群详情失败:', error);
      throw error;
    }
  }

  /**
   * 获取会话内容存档 (需开通会话存档功能)
   */
  static async getChatData(accessToken: string, seq: number, limit: number = 50): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/msgaudit/get_chatdata`
    const body = { seq, limit }
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body
      });
      this.checkError(data, '获取会话内容失败');
      return data;
    } catch (error) {
      console.error('获取会话内容失败:', error);
      throw error;
    }
  }

  /**
   * 获取审批模板列表
   */
  static async getApprovalTemplateList(accessToken: string, offset?: number, limit?: number): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/oa/gettemplatedetail`
    const body = { offset: offset || 0, limit: limit || 10 }
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body
      });
      this.checkError(data, '获取审批模板失败');
      return data;
    } catch (error) {
      console.error('获取审批模板失败:', error);
      throw error;
    }
  }

  /**
   * 获取审批申请详情
   */
  static async getApprovalDetail(accessToken: string, spNo: string): Promise<any> {
    const url = `${this.BASE_URL}/cgi-bin/oa/getapprovaldetail`
    const body = { sp_no: spNo }
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body
      });
      this.checkError(data, '获取审批详情失败');
      return data;
    } catch (error) {
      console.error('获取审批详情失败:', error);
      throw error;
    }
  }
}
