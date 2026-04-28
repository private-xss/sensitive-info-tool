import { invoke } from '@tauri-apps/api/tauri'
import type { 
  CloudServiceResult, 
  SubUser 
} from '@/types'

// 华为云API配置
export interface HuaweiConfig {
  accessKey: string
  secretKey: string
  region: string
  endpoint?: string
  sessionToken?: string
}

// 华为云控制台接管
export async function takeOverConsole(config: HuaweiConfig): Promise<CloudServiceResult<boolean>> {
  try {
    const result = await invoke('huawei_take_over_console', { config })
    return result as CloudServiceResult<boolean>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 取消控制台接管
export async function cancelConsoleTakeover(config: HuaweiConfig): Promise<CloudServiceResult<boolean>> {
  try {
    const result = await invoke('huawei_cancel_console_takeover', { config })
    return result as CloudServiceResult<boolean>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 获取子用户列表
export async function getSubUsers(config: HuaweiConfig): Promise<CloudServiceResult<SubUser[]>> {
  try {
    const result = await invoke('huawei_get_sub_users', { config })
    return result as CloudServiceResult<SubUser[]>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 创建子用户
export async function createSubUser(config: HuaweiConfig, userData: Partial<SubUser>): Promise<CloudServiceResult<SubUser>> {
  try {
    const result = await invoke('huawei_create_sub_user', { config, userData })
    return result as CloudServiceResult<SubUser>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 删除子用户
export async function deleteSubUser(config: HuaweiConfig, userId: string): Promise<CloudServiceResult<boolean>> {
  try {
    const result = await invoke('huawei_delete_sub_user', { config, userId })
    return result as CloudServiceResult<boolean>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 更新子用户权限
export async function updateSubUserPermissions(config: HuaweiConfig, userId: string, permissions: string[]): Promise<CloudServiceResult<boolean>> {
  try {
    const result = await invoke('huawei_update_sub_user_permissions', { config, userId, permissions })
    return result as CloudServiceResult<boolean>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}
