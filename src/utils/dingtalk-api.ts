// 钉钉API工具类
import '../types'  // 导入全局类型声明

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

export class DingTalkAPI {
  private static readonly BASE_URL = 'https://oapi.dingtalk.com'

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

  // 检查钉钉API错误
  private static checkError(data: any, operation: string): void {
    if (data.errcode && data.errcode !== 0) {
      throw new Error(`${operation}: ${data.errmsg} (错误码: ${data.errcode})`);
    }
  }

  /**
   * 获取钉钉Access Token
   */
  static async getAccessToken(appKey: string, appSecret: string): Promise<DingTalkTokenResponse> {
    const url = `${this.BASE_URL}/gettoken`

    try {
      const data = await this.httpRequest<DingTalkTokenResponse>(url, 'GET', {
        queryParams: {
          appkey: appKey,
          appsecret: appSecret
        }
      });

      this.checkError(data, '钉钉API错误');
      return data;
    } catch (error) {
      console.error('获取钉钉Access Token失败:', error);
      throw error;
    }
  }

  /**
   * 获取部门列表
   */
  static async getDepartmentList(accessToken: string, parentId?: number): Promise<any> {
    const url = `${this.BASE_URL}/department/list`
    const queryParams: Record<string, string> = { access_token: accessToken }

    if (parentId) {
      queryParams.id = parentId.toString()
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
   * 获取部门用户列表
   */
  static async getDepartmentUsers(
    accessToken: string,
    departmentId: number,
    offset: number = 0,
    size: number = 100
  ): Promise<DingTalkUserListResponse> {
    const url = `${this.BASE_URL}/user/simplelist`

    try {
      const data = await this.httpRequest<DingTalkUserListResponse>(url, 'GET', {
        queryParams: {
          access_token: accessToken,
          department_id: departmentId.toString(),
          offset: offset.toString(),
          size: size.toString()
        }
      });

      this.checkError(data, '获取部门用户失败');
      return data;
    } catch (error) {
      console.error('获取部门用户失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户详细信息
   */
  static async getUserDetail(accessToken: string, userid: string): Promise<any> {
    const url = `${this.BASE_URL}/user/get`

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
   * 发送工作通知消息
   */
  static async sendWorkMessage(
    accessToken: string,
    agentId: string,
    userIdList: string[],
    msgType: string,
    content: any
  ): Promise<any> {
    const url = `${this.BASE_URL}/topapi/message/corpconversation/asyncsend_v2`

    const body = {
      agent_id: agentId,
      userid_list: userIdList.join(','),
      msg: {
        msgtype: msgType,
        [msgType]: content
      }
    }

    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body
      });

      this.checkError(data, '发送工作通知失败');
      return data;
    } catch (error) {
      console.error('发送工作通知失败:', error);
      throw error;
    }
  }

  /**
   * 根据手机号获取用户
   */
  static async getUserMobile(accessToken: string, mobile: string): Promise<any> {
    const url = `${this.BASE_URL}/user/get_by_mobile`

    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        queryParams: {
          access_token: accessToken,
          mobile: mobile
        }
      });

      this.checkError(data, '获取用户手机号失败');
      return data;
    } catch (error) {
      console.error('获取用户手机号失败:', error);
      throw error;
    }
  }

  // ===== 新增: 钉钉更多功能 =====

  /**
   * 创建部门
   */
  static async createDepartment(accessToken: string, name: string, parentId: number, order?: number): Promise<any> {
    const url = `${this.BASE_URL}/department/create`
    const body: any = { name, parentid: parentId }
    if (order !== undefined) body.order = order
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
  static async updateDepartment(accessToken: string, id: number, name?: string, parentId?: number): Promise<any> {
    const url = `${this.BASE_URL}/department/update`
    const body: any = { id }
    if (name !== undefined) body.name = name
    if (parentId !== undefined) body.parentid = parentId
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
    const url = `${this.BASE_URL}/department/delete`
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
   * 创建用户
   */
  static async createUser(accessToken: string, userData: any): Promise<any> {
    const url = `${this.BASE_URL}/user/create`
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
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
  static async updateUser(accessToken: string, userData: any): Promise<any> {
    const url = `${this.BASE_URL}/user/update`
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
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
  static async deleteUser(accessToken: string, userid: string): Promise<any> {
    const url = `${this.BASE_URL}/user/delete`
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        queryParams: { access_token: accessToken, userid }
      });
      this.checkError(data, '删除用户失败');
      return data;
    } catch (error) {
      console.error('删除用户失败:', error);
      throw error;
    }
  }

  /**
   * 获取角色列表
   */
  static async getRoleList(accessToken: string, offset: number = 0, size: number = 50): Promise<any> {
    const url = `${this.BASE_URL}/role/list`
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        queryParams: { access_token: accessToken, offset: offset.toString(), size: size.toString() }
      });
      this.checkError(data, '获取角色列表失败');
      return data;
    } catch (error) {
      console.error('获取角色列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取角色下的员工列表
   */
  static async getRoleUsers(accessToken: string, roleId: number, offset: number = 0, size: number = 50): Promise<any> {
    const url = `${this.BASE_URL}/role/roleMember`
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        queryParams: { access_token: accessToken, roleId: roleId.toString(), offset: offset.toString(), size: size.toString() }
      });
      this.checkError(data, '获取角色员工失败');
      return data;
    } catch (error) {
      console.error('获取角色员工失败:', error);
      throw error;
    }
  }

  /**
   * 获取标签列表
   */
  static async getTagList(accessToken: string, offset: number = 0, size: number = 50): Promise<any> {
    const url = `${this.BASE_URL}/tag/list`
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        queryParams: { access_token: accessToken, offset: offset.toString(), size: size.toString() }
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
    const url = `${this.BASE_URL}/tag/create`
    const body = { name: tagName }
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
   * 获取标签下的用户列表
   */
  static async getTagUsers(accessToken: string, tagId: number): Promise<any> {
    const url = `${this.BASE_URL}/tag/getTagMember`
    try {
      const data = await this.httpRequest<any>(url, 'GET', {
        queryParams: { access_token: accessToken, tagId: tagId.toString() }
      });
      this.checkError(data, '获取标签用户失败');
      return data;
    } catch (error) {
      console.error('获取标签用户失败:', error);
      throw error;
    }
  }

  /**
   * 邀请用户加入企业
   */
  static async inviteUser(accessToken: string, userIds: string[]): Promise<any> {
    const url = `${this.BASE_URL}/topapi/v2/user/listinvitation`
    const body = { userid_list: userIds }
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body
      });
      this.checkError(data, '邀请用户失败');
      return data;
    } catch (error) {
      console.error('邀请用户失败:', error);
      throw error;
    }
  }

  /**
   * 获取考勤结果
   */
  static async getAttendanceResult(accessToken: string, workDateFrom: string, workDateTo: string, userIds?: string[], offset: number = 0, limit: number = 50): Promise<any> {
    const url = `${this.BASE_URL}/topapi/attendance/listRecord`
    const body: any = { workDateFrom, workDateTo, offset, limit }
    if (userIds && userIds.length > 0) body.userIdList = userIds
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body
      });
      this.checkError(data, '获取考勤结果失败');
      return data;
    } catch (error) {
      console.error('获取考勤结果失败:', error);
      throw error;
    }
  }

  /**
   * 获取考勤打卡结果
   */
  static async getAttendanceList(accessToken: string, workDateFrom: string, workDateTo: string, userIds?: string[], offset: number = 0, limit: number = 50): Promise<any> {
    const url = `${this.BASE_URL}/topapi/attendance/list`
    const body: any = { workDateFrom, workDateTo, offset, limit }
    if (userIds && userIds.length > 0) body.userIdList = userIds
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body
      });
      this.checkError(data, '获取考勤打卡失败');
      return data;
    } catch (error) {
      console.error('获取考勤打卡失败:', error);
      throw error;
    }
  }

  /**
   * 获取审批模板列表
   */
  static async getProcessTemplateList(accessToken: string, offset: number = 0, size: number = 20): Promise<any> {
    const url = `${this.BASE_URL}/topapi/process/listbyuserid`
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body: { offset, size }
      });
      this.checkError(data, '获取审批模板失败');
      return data;
    } catch (error) {
      console.error('获取审批模板失败:', error);
      throw error;
    }
  }

  /**
   * 获取审批实例详情
   */
  static async getProcessInstance(accessToken: string, processCode: string): Promise<any> {
    const url = `${this.BASE_URL}/topapi/process/instance/get`
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body: { process_code: processCode }
      });
      this.checkError(data, '获取审批实例失败');
      return data;
    } catch (error) {
      console.error('获取审批实例失败:', error);
      throw error;
    }
  }

  /**
   * 获取外部联系人列表
   */
  static async getExternalContactList(accessToken: string, offset: number = 0, size: number = 50): Promise<any> {
    const url = `${this.BASE_URL}/topapi/extcontact/list`
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body: { offset, size }
      });
      this.checkError(data, '获取外部联系人失败');
      return data;
    } catch (error) {
      console.error('获取外部联系人失败:', error);
      throw error;
    }
  }

  /**
   * 获取外部联系人详情
   */
  static async getExternalContactDetail(accessToken: string, userId: string): Promise<any> {
    const url = `${this.BASE_URL}/topapi/extcontact/get`
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body: { userid: userId }
      });
      this.checkError(data, '获取外部联系人详情失败');
      return data;
    } catch (error) {
      console.error('获取外部联系人详情失败:', error);
      throw error;
    }
  }

  /**
   * 获取群列表
   */
  static async getChatList(accessToken: string, offset: number = 0, size: number = 20): Promise<any> {
    const url = `${this.BASE_URL}/topapi/chat/list`
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body: { offset, size }
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
    const url = `${this.BASE_URL}/topapi/chat/get`
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body: { chatid: chatId }
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
    const url = `${this.BASE_URL}/topapi/chat/create`
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
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
   * 发送群消息
   */
  static async sendChatMessage(accessToken: string, chatId: string, msg: any): Promise<any> {
    const url = `${this.BASE_URL}/topapi/message/corpconversation/asyncsend_v2`
    const body = { chatid: chatId, msg }
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body
      });
      this.checkError(data, '发送群消息失败');
      return data;
    } catch (error) {
      console.error('发送群消息失败:', error);
      throw error;
    }
  }

  /**
   * 获取日志列表
   */
  static async getReportList(accessToken: string, reportTemplateId: string, startTime: string, endTime: string, offset: number = 0, size: number = 20): Promise<any> {
    const url = `${this.BASE_URL}/topapi/report/list`
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body: { report_template_id: reportTemplateId, start_time: startTime, end_time: endTime, offset, size }
      });
      this.checkError(data, '获取日志列表失败');
      return data;
    } catch (error) {
      console.error('获取日志列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取智能人事员工列表
   */
  static async getHrmEmployeeList(accessToken: string, offset: number = 0, size: number = 50): Promise<any> {
    const url = `${this.BASE_URL}/topapi/smartwork/hrm/employee/v2/list`
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body: { offset, size }
      });
      this.checkError(data, '获取人事员工列表失败');
      return data;
    } catch (error) {
      console.error('获取人事员工列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取智能人事员工详情
   */
  static async getHrmEmployeeDetail(accessToken: string, userId: string): Promise<any> {
    const url = `${this.BASE_URL}/topapi/smartwork/hrm/employee/v2/get`
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body: { userid: userId }
      });
      this.checkError(data, '获取人事员工详情失败');
      return data;
    } catch (error) {
      console.error('获取人事员工详情失败:', error);
      throw error;
    }
  }

  /**
   * 获取钉盘空间列表
   */
  static async getDriveSpaceList(accessToken: string): Promise<any> {
    const url = `${this.BASE_URL}/topapi/drive/spaces/list`
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body: {}
      });
      this.checkError(data, '获取钉盘空间失败');
      return data;
    } catch (error) {
      console.error('获取钉盘空间失败:', error);
      throw error;
    }
  }

  /**
   * 获取待办任务列表
   */
  static async getWorkTodoList(accessToken: string, userId: string, offset: number = 0, size: number = 20): Promise<any> {
    const url = `${this.BASE_URL}/topapi/workrecord/getbyuserid`
    try {
      const data = await this.httpRequest<any>(url, 'POST', {
        queryParams: { access_token: accessToken },
        body: { userid: userId, offset, size }
      });
      this.checkError(data, '获取待办任务失败');
      return data;
    } catch (error) {
      console.error('获取待办任务失败:', error);
      throw error;
    }
  }
}
