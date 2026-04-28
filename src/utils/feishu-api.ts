// 飞书API工具类
import '../types'  // 导入全局类型声明

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

export class FeishuAPI {
  private static readonly BASE_URL = 'https://open.feishu.cn/open-apis'

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

  // 检查飞书API错误
  private static checkError(data: any, operation: string): void {
    if (data.code && data.code !== 0) {
      throw new Error(`${operation}: ${data.msg} (错误码: ${data.code})`);
    }
  }

  /**
   * 获取飞书Access Token (tenant_access_token)
   */
  static async getAccessToken(appId: string, appSecret: string): Promise<FeishuTokenResponse> {
    const url = `${this.BASE_URL}/auth/v3/tenant_access_token/internal`

    const body = {
      app_id: appId,
      app_secret: appSecret
    }

    try {
      const data = await this.httpRequest<FeishuTokenResponse>(url, 'POST', {
        headers: { 'Content-Type': 'application/json' },
        body
      });

      this.checkError(data, '飞书API错误');
      return data;
    } catch (error) {
      console.error('获取飞书Access Token失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户列表
   */
  static async getUserList(
    accessToken: string,
    pageSize: number = 50,
    pageToken?: string
  ): Promise<FeishuUserListResponse> {
    const url = `${this.BASE_URL}/contact/v3/users`
    const queryParams: Record<string, string> = { page_size: pageSize.toString() }

    if (pageToken) {
      queryParams.page_token = pageToken
    }

    try {
      const data = await this.httpRequest<FeishuUserListResponse>(url, 'GET', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        queryParams
      });

      this.checkError(data, '获取用户列表失败');
      return data;
    } catch (error) {
      console.error('获取用户列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户详细信息
   */
  static async getUserDetail(accessToken: string, userId: string): Promise<any> {
    const url = `${this.BASE_URL}/contact/v3/users/${userId}`

    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
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
   * 发送消息
   */
  static async sendMessage(
    accessToken: string,
    receiveId: string,
    msgType: string,
    content: any
  ): Promise<any> {
    const url = `${this.BASE_URL}/im/v1/messages`

    const body = {
      receive_id: receiveId,
      msg_type: msgType,
      content: JSON.stringify(content)
    }

    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        queryParams: { receive_id_type: 'open_id' },
        body
      });

      this.checkError(data, '发送消息失败');
      return data;
    } catch (error) {
      console.error('发送消息失败:', error);
      throw error;
    }
  }

  /**
   * 获取部门列表
   */
  static async getDepartmentList(accessToken: string, parentDepartmentId?: string): Promise<any> {
    const url = `${this.BASE_URL}/contact/v3/departments`
    const queryParams: Record<string, string> = { page_size: '50' }

    if (parentDepartmentId) {
      queryParams.parent_department_id = parentDepartmentId
    }

    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        queryParams
      });

      this.checkError(data, '获取部门列表失败');
      return data;
    } catch (error) {
      console.error('获取部门列表失败:', error);
      throw error;
    }
  }

  // ===== 新增: 飞书更多功能 =====

  /**
   * 获取部门详细信息
   */
  static async getDepartmentDetail(accessToken: string, departmentId: string): Promise<any> {
    const url = `${this.BASE_URL}/contact/v3/departments/${departmentId}`
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });
      this.checkError(data, '获取部门详情失败');
      return data;
    } catch (error) {
      console.error('获取部门详情失败:', error);
      throw error;
    }
  }

  /**
   * 创建部门
   */
  static async createDepartment(accessToken: string, departmentData: any): Promise<any> {
    const url = `${this.BASE_URL}/contact/v3/departments`
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: departmentData
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
  static async updateDepartment(accessToken: string, departmentId: string, departmentData: any): Promise<any> {
    const url = `${this.BASE_URL}/contact/v3/departments/${departmentId}`
    try {
      const data = await this.httpRequest<any>(url, 'PUT', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: departmentData
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
  static async deleteDepartment(accessToken: string, departmentId: string): Promise<any> {
    const url = `${this.BASE_URL}/contact/v3/departments/${departmentId}`
    try {
      const data = await this.httpRequest<any>(url, 'DELETE', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });
      this.checkError(data, '删除部门失败');
      return data;
    } catch (error) {
      console.error('删除部门失败:', error);
      throw error;
    }
  }

  /**
   * 获取部门直属用户列表
   */
  static async getDepartmentUsers(accessToken: string, departmentId: string, pageSize: number = 50, pageToken?: string): Promise<any> {
    const url = `${this.BASE_URL}/contact/v3/departments/${departmentId}/users`
    const queryParams: Record<string, string> = { page_size: pageSize.toString() }
    if (pageToken) queryParams.page_token = pageToken
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        queryParams
      });
      this.checkError(data, '获取部门用户列表失败');
      return data;
    } catch (error) {
      console.error('获取部门用户列表失败:', error);
      throw error;
    }
  }

  /**
   * 创建用户
   */
  static async createUser(accessToken: string, userData: any): Promise<any> {
    const url = `${this.BASE_URL}/contact/v3/users`
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: userData
      });
      this.checkError(data, '创建用户失败');
      return data;
    } catch (error) {
      console.error('创建用户失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户
   */
  static async updateUser(accessToken: string, userId: string, userData: any): Promise<any> {
    const url = `${this.BASE_URL}/contact/v3/users/${userId}`
    try {
      const data = await this.httpRequest<any>(url, 'PUT', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: userData
      });
      this.checkError(data, '更新用户失败');
      return data;
    } catch (error) {
      console.error('更新用户失败:', error);
      throw error;
    }
  }

  /**
   * 删除用户
   */
  static async deleteUser(accessToken: string, userId: string): Promise<any> {
    const url = `${this.BASE_URL}/contact/v3/users/${userId}`
    try {
      const data = await this.httpRequest<any>(url, 'DELETE', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });
      this.checkError(data, '删除用户失败');
      return data;
    } catch (error) {
      console.error('删除用户失败:', error);
      throw error;
    }
  }

  /**
   * 获取群列表
   */
  static async getChatList(accessToken: string, pageSize: number = 20, pageToken?: string): Promise<any> {
    const url = `${this.BASE_URL}/im/v1/chats`
    const queryParams: Record<string, string> = { page_size: pageSize.toString() }
    if (pageToken) queryParams.page_token = pageToken
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        queryParams
      });
      this.checkError(data, '获取群列表失败');
      return data;
    } catch (error) {
      console.error('获取群列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取群信息
   */
  static async getChatDetail(accessToken: string, chatId: string): Promise<any> {
    const url = `${this.BASE_URL}/im/v1/chats/${chatId}`
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });
      this.checkError(data, '获取群信息失败');
      return data;
    } catch (error) {
      console.error('获取群信息失败:', error);
      throw error;
    }
  }

  /**
   * 创建群
   */
  static async createChat(accessToken: string, chatData: any): Promise<any> {
    const url = `${this.BASE_URL}/im/v1/chats`
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: chatData
      });
      this.checkError(data, '创建群失败');
      return data;
    } catch (error) {
      console.error('创建群失败:', error);
      throw error;
    }
  }

  /**
   * 获取群成员列表
   */
  static async getChatMembers(accessToken: string, chatId: string, pageSize: number = 50): Promise<any> {
    const url = `${this.BASE_URL}/im/v1/chats/${chatId}/members`
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        queryParams: { page_size: pageSize.toString() }
      });
      this.checkError(data, '获取群成员列表失败');
      return data;
    } catch (error) {
      console.error('获取群成员列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取消息详情
   */
  static async getMessageDetail(accessToken: string, messageId: string): Promise<any> {
    const url = `${this.BASE_URL}/im/v1/messages/${messageId}`
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });
      this.checkError(data, '获取消息详情失败');
      return data;
    } catch (error) {
      console.error('获取消息详情失败:', error);
      throw error;
    }
  }

  /**
   * 回复消息
   */
  static async replyMessage(accessToken: string, messageId: string, msgType: string, content: any): Promise<any> {
    const url = `${this.BASE_URL}/im/v1/messages/${messageId}/reply`
    const body = { msg_type: msgType, content: JSON.stringify(content) }
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body
      });
      this.checkError(data, '回复消息失败');
      return data;
    } catch (error) {
      console.error('回复消息失败:', error);
      throw error;
    }
  }

  /**
   * 撤回消息
   */
  static async recallMessage(accessToken: string, messageId: string): Promise<any> {
    const url = `${this.BASE_URL}/im/v1/messages/${messageId}`
    try {
      const data = await this.httpRequest<any>(url, 'DELETE', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });
      this.checkError(data, '撤回消息失败');
      return data;
    } catch (error) {
      console.error('撤回消息失败:', error);
      throw error;
    }
  }

  /**
   * 获取云文档列表
   */
  static async getDocList(accessToken: string, folderToken?: string, pageSize: number = 20): Promise<any> {
    const url = `${this.BASE_URL}/drive/v1/files`
    const queryParams: Record<string, string> = { page_size: pageSize.toString() }
    if (folderToken) queryParams.folder_token = folderToken
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        queryParams
      });
      this.checkError(data, '获取云文档列表失败');
      return data;
    } catch (error) {
      console.error('获取云文档列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取日历列表
   */
  static async getCalendarList(accessToken: string, pageSize: number = 50): Promise<any> {
    const url = `${this.BASE_URL}/calendar/v4/calendars`
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        queryParams: { page_size: pageSize.toString() }
      });
      this.checkError(data, '获取日历列表失败');
      return data;
    } catch (error) {
      console.error('获取日历列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取日历事件列表
   */
  static async getCalendarEvents(accessToken: string, calendarId: string, startTime: string, endTime: string): Promise<any> {
    const url = `${this.BASE_URL}/calendar/v4/calendars/${calendarId}/events`
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        queryParams: { start_time: startTime, end_time: endTime }
      });
      this.checkError(data, '获取日历事件失败');
      return data;
    } catch (error) {
      console.error('获取日历事件失败:', error);
      throw error;
    }
  }

  /**
   * 获取审批定义列表
   */
  static async getApprovalDefinitionList(accessToken: string, offset?: number, limit?: number): Promise<any> {
    const url = `${this.BASE_URL}/approval/v4/definitions`
    const queryParams: Record<string, string> = {}
    if (offset !== undefined) queryParams.offset = offset.toString()
    if (limit !== undefined) queryParams.limit = limit.toString()
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        queryParams
      });
      this.checkError(data, '获取审批定义失败');
      return data;
    } catch (error) {
      console.error('获取审批定义失败:', error);
      throw error;
    }
  }

  /**
   * 获取审批实例详情
   */
  static async getApprovalInstance(accessToken: string, instanceId: string): Promise<any> {
    const url = `${this.BASE_URL}/approval/v4/instances/${instanceId}`
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });
      this.checkError(data, '获取审批实例失败');
      return data;
    } catch (error) {
      console.error('获取审批实例失败:', error);
      throw error;
    }
  }

  /**
   * 获取多维表格列表
   */
  static async getBitableList(accessToken: string, appToken: string): Promise<any> {
    const url = `${this.BASE_URL}/bitable/v1/apps/${appToken}/tables`
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });
      this.checkError(data, '获取多维表格失败');
      return data;
    } catch (error) {
      console.error('获取多维表格失败:', error);
      throw error;
    }
  }

  /**
   * 获取应用访问记录
   */
  static async getAppUsage(accessToken: string): Promise<any> {
    const url = `${this.BASE_URL}/application/v6/usage`
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });
      this.checkError(data, '获取应用访问记录失败');
      return data;
    } catch (error) {
      console.error('获取应用访问记录失败:', error);
      throw error;
    }
  }
}
