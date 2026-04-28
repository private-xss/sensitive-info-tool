<template>
  <div class="oss-config-selector">
    <a-card title="OSS配置选择" size="small" class="config-card">
      <a-space direction="vertical" style="width: 100%">
        <a-select
          v-model:value="selectedConfigId"
          placeholder="选择OSS配置"
          style="width: 100%"
          @change="onConfigChange"
          :loading="loading"
        >
          <a-select-option 
            v-for="config in configs" 
            :key="config.id" 
            :value="config.id"
          >
            <div class="config-option">
              <span class="provider-badge" :style="{ backgroundColor: getProviderColor(config.provider) }">
                {{ getProviderIcon(config.provider) }}
              </span>
              <span class="config-name">{{ config.name }}</span>
              <span class="config-provider">{{ getProviderName(config.provider) }}</span>
            </div>
          </a-select-option>
        </a-select>
        
        <div v-if="selectedConfig" class="config-details">
          <a-descriptions size="small" :column="1">
            <a-descriptions-item label="云厂商">
              <a-tag :color="getProviderColor(selectedConfig.provider)">
                {{ getProviderName(selectedConfig.provider) }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="区域">
              {{ selectedConfig.region || '未设置' }}
            </a-descriptions-item>
            <a-descriptions-item label="存储桶">
              {{ selectedConfig.bucket || '未设置' }}
            </a-descriptions-item>
            <a-descriptions-item label="认证类型">
              <a-tag :color="selectedConfig.authType === 'longterm' ? 'green' : 'orange'">
                {{ selectedConfig.authType === 'longterm' ? '长期凭证' : 'STS临时凭证' }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item v-if="selectedConfig.authType === 'sts'" label="过期时间">
              <span :class="{ 'expired': isSTSExpired(selectedConfig.expiration || '') }">
                {{ formatExpiration(selectedConfig.expiration) }}
              </span>
            </a-descriptions-item>
          </a-descriptions>
        </div>
        
        <a-button 
          type="primary" 
          :disabled="!selectedConfig"
          @click="testConnection"
          :loading="testing"
          style="width: 100%"
        >
          测试连接
        </a-button>
      </a-space>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import type { CloudOSSConfig, CloudProvider } from '@/types'
import { SimpleStorage } from '@/utils/storage-simple'
import { getProviderInfo } from '@/utils/cloud-providers'
import { invoke } from '@tauri-apps/api/tauri'
import { DebugStorage } from '@/utils/debug-storage'

interface Props {
  provider?: CloudProvider
}

const props = withDefaults(defineProps<Props>(), {
  provider: undefined
})

const emit = defineEmits<{
  configSelected: [config: CloudOSSConfig | null]
  connectionTested: [success: boolean]
}>()

const loading = ref(false)
const testing = ref(false)
const selectedConfigId = ref<string>('')
const configs = ref<CloudOSSConfig[]>([])

const selectedConfig = computed(() => {
  return configs.value.find(config => config.id === selectedConfigId.value) || null
})

// 加载OSS配置列表
const loadConfigs = async () => {
  loading.value = true
  try {
    console.log('开始加载OSS配置...')
    
    // 在开发环境中进行调试
    if (import.meta.env.DEV) {
      const debugResult = await DebugStorage.checkStorageStatus()
      console.log('存储调试结果:', debugResult)
    }
    
    const allConfigs = await SimpleStorage.loadData('cloud_oss_configs') || []
    console.log('从存储加载的配置:', allConfigs)
    
    // 如果指定了云厂商，只显示该厂商的配置
    if (props.provider) {
      configs.value = allConfigs.filter(config => config.provider === props.provider)
      console.log(`筛选${props.provider}配置:`, configs.value)
    } else {
      configs.value = allConfigs
    }
    
    console.log('最终配置列表:', configs.value)
    
    // 默认选择第一个配置
    if (configs.value.length > 0 && !selectedConfigId.value) {
      selectedConfigId.value = configs.value[0].id
      onConfigChange(configs.value[0].id)
    }
    
    if (configs.value.length === 0) {
      message.info('暂无OSS配置，请先在"云存储"页面创建配置')
    }
  } catch (error) {
    console.error('加载配置失败:', error)
    
    // 在开发环境中提供更详细的错误信息
    if (import.meta.env.DEV) {
      console.log('尝试调试存储问题...')
      try {
        await DebugStorage.testStorageReadWrite()
        await DebugStorage.listAllKeys()
      } catch (debugError) {
        console.error('调试失败:', debugError)
      }
    }
    
    message.error(`加载OSS配置失败: ${error.message || error}`)
  } finally {
    loading.value = false
  }
}

// 配置选择变化
const onConfigChange = (configId: string) => {
  const config = configs.value.find(c => c.id === configId)
  emit('configSelected', config || null)
}

// 测试连接
const testConnection = async () => {
  if (!selectedConfig.value) return
  
  testing.value = true
  try {
    const res = await invoke<any>('oss_list_buckets', {
      cfg: {
        provider: selectedConfig.value.provider,
        access_key: selectedConfig.value.accessKey,
        secret_key: selectedConfig.value.secretKey,
        session_token: selectedConfig.value.sessionToken,
        expiration: selectedConfig.value.expiration,
        region: selectedConfig.value.region,
        endpoint: selectedConfig.value.endpoint,
        bucket: selectedConfig.value.bucket,
      }
    })

    if (res?.success) {
      message.success('连接测试成功')
      emit('connectionTested', true)
    } else {
      const errMsg = res?.error || res?.message || '未知错误'
      message.error(`连接测试失败: ${errMsg}`)
      emit('connectionTested', false)
    }
  } catch (error: any) {
    const errMsg = (error && (error.message || error.error || error.reason)) || String(error)
    message.error(`连接测试失败: ${errMsg}`)
    emit('connectionTested', false)
  } finally {
    testing.value = false
  }
}

// 工具函数
const getProviderName = (provider: CloudProvider): string => {
  return getProviderInfo(provider).name
}

const getProviderIcon = (provider: CloudProvider): string => {
  return getProviderInfo(provider).icon
}

const getProviderColor = (provider: CloudProvider): string => {
  return getProviderInfo(provider).color
}

const isSTSExpired = (expiration: string): boolean => {
  try {
    const expirationDate = new Date(expiration)
    const now = new Date()
    return now >= expirationDate
  } catch {
    return true
  }
}

const formatExpiration = (expiration?: string): string => {
  if (!expiration) return '未设置'
  try {
    const date = new Date(expiration)
    return date.toLocaleString('zh-CN')
  } catch {
    return expiration
  }
}

// 监听provider变化，重新加载配置
watch(() => props.provider, async (newProvider, oldProvider) => {
  console.log('Provider changed from', oldProvider, 'to', newProvider)
  if (newProvider !== oldProvider) {
    // 清空当前选择
    selectedConfigId.value = ''
    emit('configSelected', null)
    // 重新加载配置
    await loadConfigs()
  }
}, { immediate: false })

onMounted(async () => {
  try {
    await loadConfigs()
  } catch (error) {
    console.error('组件挂载时加载配置失败:', error)
  }
})
</script>

<style scoped>
.oss-config-selector {
  margin-bottom: 16px;
}

.config-card {
  border: 1px solid #d9d9d9;
}

.config-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.provider-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.config-name {
  font-weight: 500;
}

.config-provider {
  color: #666;
  font-size: 12px;
}

.config-details {
  margin-top: 12px;
  padding: 12px;
  background-color: #fafafa;
  border-radius: 6px;
}

.expired {
  color: #ff4d4f;
  font-weight: 500;
}
</style>
