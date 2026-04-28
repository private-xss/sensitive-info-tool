import { invoke } from '@tauri-apps/api/tauri'
import type { 
  CloudServiceResult, 
  SubUser, 
  HostInfo, 
  OrderInfo 
} from '@/types'

// UCloud API配置
export interface UCloudConfig {
  publicKey: string
  privateKey: string
  region: string
  endpoint?: string
  sessionToken?: string
}

// UCloud控制台接管
export async function takeOverConsole(config: UCloudConfig): Promise<CloudServiceResult<boolean>> {
  try {
    const result = await invoke('ucloud_take_over_console', { config })
    return result as CloudServiceResult<boolean>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 取消控制台接管
export async function cancelConsoleTakeover(config: UCloudConfig): Promise<CloudServiceResult<boolean>> {
  try {
    const result = await invoke('ucloud_cancel_console_takeover', { config })
    return result as CloudServiceResult<boolean>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 获取主机列表
export async function getHosts(config: UCloudConfig): Promise<CloudServiceResult<HostInfo[]>> {
  try {
    const result = await invoke('ucloud_get_hosts', { config })
    return result as CloudServiceResult<HostInfo[]>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 获取子用户列表
export async function getSubUsers(config: UCloudConfig): Promise<CloudServiceResult<SubUser[]>> {
  try {
    const result = await invoke('ucloud_get_sub_users', { config })
    return result as CloudServiceResult<SubUser[]>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 获取主用户信息
export async function getMainUser(config: UCloudConfig): Promise<CloudServiceResult<SubUser>> {
  try {
    const result = await invoke('ucloud_get_main_user', { config })
    return result as CloudServiceResult<SubUser>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 获取订单列表
export async function getOrders(config: UCloudConfig): Promise<CloudServiceResult<OrderInfo[]>> {
  try {
    const result = await invoke('ucloud_get_orders', { config })
    return result as CloudServiceResult<OrderInfo[]>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 创建主机
export async function createHost(config: UCloudConfig, hostData: Partial<HostInfo>): Promise<CloudServiceResult<HostInfo>> {
  try {
    const result = await invoke('ucloud_create_host', { config, hostData })
    return result as CloudServiceResult<HostInfo>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 删除主机
export async function deleteHost(config: UCloudConfig, hostId: string): Promise<CloudServiceResult<boolean>> {
  try {
    const result = await invoke('ucloud_delete_host', { config, hostId })
    return result as CloudServiceResult<boolean>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 启动主机
export async function startHost(config: UCloudConfig, hostId: string): Promise<CloudServiceResult<boolean>> {
  try {
    const result = await invoke('ucloud_start_host', { config, hostId })
    return result as CloudServiceResult<boolean>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 停止主机
export async function stopHost(config: UCloudConfig, hostId: string): Promise<CloudServiceResult<boolean>> {
  try {
    const result = await invoke('ucloud_stop_host', { config, hostId })
    return result as CloudServiceResult<boolean>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}
