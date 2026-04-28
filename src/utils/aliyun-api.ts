import { invoke } from '@tauri-apps/api/tauri'
import type { 
  CloudServiceResult, 
  RemoteCommandParams, 
  CommandResult, 
  CommandHistory, 
  SubUser, 
  EcsInstance,
  DatabaseInstance, 
  AlarmInfo 
} from '@/types'

// 阿里云API配置
export interface AliyunConfig {
  access_key_id: string
  access_key_secret: string
  region: string
  endpoint?: string
  session_token?: string
}

// 测试阿里云API连接
export async function testConnection(config: AliyunConfig): Promise<CloudServiceResult<string>> {
  try {
    const result = await invoke('aliyun_test_connection', { config })
    return result as CloudServiceResult<string>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 阿里云控制台接管
export async function takeOverConsole(config: AliyunConfig): Promise<CloudServiceResult<boolean>> {
  try {
    const result = await invoke('aliyun_take_over_console', { config })
    return result as CloudServiceResult<boolean>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 取消控制台接管
export async function cancelConsoleTakeover(config: AliyunConfig): Promise<CloudServiceResult<boolean>> {
  try {
    const result = await invoke('aliyun_cancel_console_takeover', { config })
    return result as CloudServiceResult<boolean>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 远程命令执行
export async function executeRemoteCommand(config: AliyunConfig, params: RemoteCommandParams): Promise<CloudServiceResult<CommandResult>> {
  try {
    const result = await invoke('aliyun_execute_remote_command', { config, params })
    return result as CloudServiceResult<CommandResult>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 获取历史命令记录
export async function getCommandHistory(config: AliyunConfig, instanceId?: string): Promise<CloudServiceResult<CommandHistory[]>> {
  try {
    const result = await invoke('aliyun_get_command_history', { config, instanceId })
    return result as CloudServiceResult<CommandHistory[]>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 获取子用户列表
export async function getSubUsers(config: AliyunConfig): Promise<CloudServiceResult<SubUser[]>> {
  try {
    const result = await invoke('aliyun_get_sub_users', { config })
    return result as CloudServiceResult<SubUser[]>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 获取ECS实例列表
export async function getEcsInstances(config: AliyunConfig): Promise<CloudServiceResult<EcsInstance[]>> {
  try {
    const result = await invoke('aliyun_get_ecs_instances', { config })
    return result as CloudServiceResult<EcsInstance[]>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 获取云数据库实例列表
export async function getDatabaseInstances(config: AliyunConfig): Promise<CloudServiceResult<DatabaseInstance[]>> {
  try {
    const result = await invoke('aliyun_get_database_instances', { config })
    return result as CloudServiceResult<DatabaseInstance[]>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 获取告警信息
export async function getAlarmInfo(config: AliyunConfig): Promise<CloudServiceResult<AlarmInfo[]>> {
  try {
    const result = await invoke('aliyun_get_alarm_info', { config })
    return result as CloudServiceResult<AlarmInfo[]>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 创建数据库实例
export async function createDatabaseInstance(config: AliyunConfig, instanceData: Partial<DatabaseInstance>): Promise<CloudServiceResult<DatabaseInstance>> {
  try {
    const result = await invoke('aliyun_create_database_instance', { config, instanceData })
    return result as CloudServiceResult<DatabaseInstance>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 删除数据库实例
export async function deleteDatabaseInstance(config: AliyunConfig, instanceId: string): Promise<CloudServiceResult<boolean>> {
  try {
    const result = await invoke('aliyun_delete_database_instance', { config, instanceId })
    return result as CloudServiceResult<boolean>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 创建告警规则
export async function createAlarmRule(config: AliyunConfig, alarmData: Partial<AlarmInfo>): Promise<CloudServiceResult<AlarmInfo>> {
  try {
    const result = await invoke('aliyun_create_alarm_rule', { config, alarmData })
    return result as CloudServiceResult<AlarmInfo>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}

// 删除告警规则
export async function deleteAlarmRule(config: AliyunConfig, alarmId: string): Promise<CloudServiceResult<boolean>> {
  try {
    const result = await invoke('aliyun_delete_alarm_rule', { config, alarmId })
    return result as CloudServiceResult<boolean>
  } catch (error) {
    return {
      success: false,
      error: error as string
    }
  }
}
