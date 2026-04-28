import { invoke } from '@tauri-apps/api/tauri'
import type { 
  CloudServiceResult, 
  SubUser, 
  BackdoorInfo, 
  PolicyInfo 
} from '@/types'

// AWS API配置
export interface AWSConfig {
  accessKeyId: string
  secretAccessKey: string
  region: string
  endpoint?: string
  sessionToken?: string
}

// AWS控制台接管
export async function takeOverConsole(config: AWSConfig): Promise<CloudServiceResult<boolean>> {
  try {
    const result = await invoke('aws_take_over_console', { config })
    return result as CloudServiceResult<boolean>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 取消控制台接管
export async function cancelConsoleTakeover(config: AWSConfig): Promise<CloudServiceResult<boolean>> {
  try {
    const result = await invoke('aws_cancel_console_takeover', { config })
    return result as CloudServiceResult<boolean>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 创建后门
export async function createBackdoor(config: AWSConfig, backdoorData: Partial<BackdoorInfo>): Promise<CloudServiceResult<BackdoorInfo>> {
  try {
    const result = await invoke('aws_create_backdoor', { config, backdoorData })
    return result as CloudServiceResult<BackdoorInfo>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 获取后门列表
export async function getBackdoors(config: AWSConfig): Promise<CloudServiceResult<BackdoorInfo[]>> {
  try {
    const result = await invoke('aws_get_backdoors', { config })
    return result as CloudServiceResult<BackdoorInfo[]>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 删除后门
export async function deleteBackdoor(config: AWSConfig, backdoorId: string): Promise<CloudServiceResult<boolean>> {
  try {
    const result = await invoke('aws_delete_backdoor', { config, backdoorId })
    return result as CloudServiceResult<boolean>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 获取子用户列表
export async function getSubUsers(config: AWSConfig): Promise<CloudServiceResult<SubUser[]>> {
  try {
    const result = await invoke('aws_get_sub_users', { config })
    return result as CloudServiceResult<SubUser[]>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 获取策略列表
export async function getPolicies(config: AWSConfig): Promise<CloudServiceResult<PolicyInfo[]>> {
  try {
    const result = await invoke('aws_get_policies', { config })
    return result as CloudServiceResult<PolicyInfo[]>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 创建策略
export async function createPolicy(config: AWSConfig, policyData: Partial<PolicyInfo>): Promise<CloudServiceResult<PolicyInfo>> {
  try {
    const result = await invoke('aws_create_policy', { config, policyData })
    return result as CloudServiceResult<PolicyInfo>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 删除策略
export async function deletePolicy(config: AWSConfig, policyId: string): Promise<CloudServiceResult<boolean>> {
  try {
    const result = await invoke('aws_delete_policy', { config, policyId })
    return result as CloudServiceResult<boolean>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 附加策略到用户
export async function attachPolicyToUser(config: AWSConfig, userId: string, policyId: string): Promise<CloudServiceResult<boolean>> {
  try {
    const result = await invoke('aws_attach_policy_to_user', { config, userId, policyId })
    return result as CloudServiceResult<boolean>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 从用户分离策略
export async function detachPolicyFromUser(config: AWSConfig, userId: string, policyId: string): Promise<CloudServiceResult<boolean>> {
  try {
    const result = await invoke('aws_detach_policy_from_user', { config, userId, policyId })
    return result as CloudServiceResult<boolean>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}
