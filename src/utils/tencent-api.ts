import { invoke } from '@tauri-apps/api/tauri'
import type { 
  CloudServiceResult, 
  RemoteCommandParams, 
  CommandResult, 
  SubUser 
} from '@/types'

// 腾讯云API配置
export interface TencentConfig {
  secretId: string
  secretKey: string
  region: string
  endpoint?: string
  sessionToken?: string
}

// 腾讯云控制台接管
export async function takeOverConsole(config: TencentConfig): Promise<CloudServiceResult<boolean>> {
  try {
    const result = await invoke('tencent_take_over_console', { config })
    return result as CloudServiceResult<boolean>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 取消控制台接管
export async function cancelConsoleTakeover(config: TencentConfig): Promise<CloudServiceResult<boolean>> {
  try {
    const result = await invoke('tencent_cancel_console_takeover', { config })
    return result as CloudServiceResult<boolean>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 远程命令执行
export async function executeRemoteCommand(config: TencentConfig, params: RemoteCommandParams): Promise<CloudServiceResult<CommandResult>> {
  try {
    const result = await invoke('tencent_execute_remote_command', { config, params })
    return result as CloudServiceResult<CommandResult>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 获取子用户列表
export async function getSubUsers(config: TencentConfig): Promise<CloudServiceResult<SubUser[]>> {
  try {
    const result = await invoke('tencent_get_sub_users', { config })
    return result as CloudServiceResult<SubUser[]>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 创建子用户
export async function createSubUser(config: TencentConfig, userData: Partial<SubUser>): Promise<CloudServiceResult<SubUser>> {
  try {
    const result = await invoke('tencent_create_sub_user', { config, userData })
    return result as CloudServiceResult<SubUser>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 删除子用户
export async function deleteSubUser(config: TencentConfig, userId: string): Promise<CloudServiceResult<boolean>> {
  try {
    const result = await invoke('tencent_delete_sub_user', { config, userId })
    return result as CloudServiceResult<boolean>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 更新子用户权限
export async function updateSubUserPermissions(config: TencentConfig, userId: string, permissions: string[]): Promise<CloudServiceResult<boolean>> {
  try {
    const result = await invoke('tencent_update_sub_user_permissions', { config, userId, permissions })
    return result as CloudServiceResult<boolean>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}
