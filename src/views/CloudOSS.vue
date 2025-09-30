<template>
  <div class="cloud-oss-page">
    <a-card title="云厂商OSS配置管理" :bordered="false">
      <template #extra>
        <a-button type="primary" @click="showAddModal">
          <template #icon>
            <PlusOutlined />
          </template>
          添加配置
        </a-button>
      </template>

      <a-table
        :columns="columns"
        :data-source="dataSource"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 10 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'provider'">
            <a-tag :color="getProviderColor(record.provider)">
              {{ getProviderName(record.provider) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'authType'">
            <a-tag :color="record.authType === 'sts' ? '#52c41a' : '#1890ff'">
              {{ record.authType === 'sts' ? 'STS临时凭证' : '长期凭证' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'accessKey'">
            <a-input-password
              :value="record.accessKey"
              readonly
              style="border: none; background: transparent;"
            />
          </template>
          <template v-else-if="column.key === 'secretKey'">
            <a-input-password
              :value="record.secretKey"
              readonly
              style="border: none; background: transparent;"
            />
          </template>
          <template v-else-if="column.key === 'sessionToken'">
            <div>
              <a-input-password
                :value="record.sessionToken || '未设置'"
                readonly
                style="border: none; background: transparent;"
              />
              <div v-if="record.expiration" style="font-size: 12px; color: #666; margin-top: 4px;">
                过期时间: {{ formatDate(record.expiration) }}
                <span v-if="isSTSExpired(record.expiration)" style="color: #ff4d4f;">(已过期)</span>
                <span v-else style="color: #52c41a;">
                  (剩余: {{ Math.floor(getSTSRemainingTime(record.expiration) / 60) }}分钟)
                </span>
              </div>
            </div>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="testConnection(record)">
                测试连接
              </a-button>
              <a-button type="link" size="small" @click="openBrowser(record)">
                打开浏览器
              </a-button>
              <a-button type="link" size="small" @click="editItem(record)">
                编辑
              </a-button>
              <a-button type="link" size="small" @click="copyToClipboard(record)">
                复制
              </a-button>
              <a-button type="link" size="small" danger @click="deleteItem(record)">
                删除
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 添加/编辑模态框 -->
    <a-modal
      v-model:open="modalVisible"
      :title="isEdit ? '编辑云厂商配置' : '添加云厂商配置'"
      width="600px"
      @ok="handleSubmit"
      @cancel="handleCancel"
    >
      <a-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        layout="vertical"
      >
        <a-form-item label="配置名称" name="name">
          <a-input v-model:value="formData.name" placeholder="请输入配置名称" />
        </a-form-item>
        <a-form-item label="云厂商" name="provider">
          <a-select v-model:value="formData.provider" placeholder="请选择云厂商" @change="onProviderChange">
            <a-select-option
              v-for="provider in providerList"
              :key="provider.key"
              :value="provider.key"
            >
              <a-space>
                <span :style="{ color: provider.color }">{{ provider.icon }}</span>
                {{ provider.name }}
              </a-space>
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="认证方式" name="authType">
          <a-radio-group v-model:value="formData.authType" @change="onAuthTypeChange">
            <a-radio value="longterm">长期凭证 (Access Key + Secret Key)</a-radio>
            <a-radio value="sts">STS临时凭证 (Access Key + Secret Key + Session Token)</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="Access Key" name="accessKey">
          <a-input v-model:value="formData.accessKey" placeholder="请输入Access Key" />
        </a-form-item>
        <a-form-item label="Secret Key" name="secretKey">
          <a-input-password v-model:value="formData.secretKey" placeholder="请输入Secret Key" />
        </a-form-item>
        <a-form-item 
          v-if="formData.authType === 'sts'" 
          label="Session Token" 
          name="sessionToken"
        >
          <a-input-password 
            v-model:value="formData.sessionToken" 
            placeholder="请输入Session Token（STS临时凭证必需）" 
          />
        </a-form-item>
        <a-form-item 
          v-if="formData.authType === 'sts'" 
          label="凭证过期时间" 
          name="expiration"
        >
          <a-input 
            v-model:value="formData.expiration" 
            placeholder="凭证过期时间（可选，格式：2024-01-01T12:00:00Z）" 
          />
        </a-form-item>
        <a-form-item label="区域" name="region">
          <a-select v-model:value="formData.region" placeholder="请选择区域" @change="onRegionChange">
            <a-select-option
              v-for="region in getCurrentProviderRegions()"
              :key="region"
              :value="region"
            >
              {{ region }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Endpoint" name="endpoint">
          <a-input v-model:value="formData.endpoint" placeholder="请输入Endpoint（可选）" />
        </a-form-item>
        <a-form-item label="存储桶" name="bucket">
          <a-input-group compact>
            <a-input 
              v-model:value="formData.bucket" 
              placeholder="请输入存储桶名称（可选）" 
              style="width: calc(100% - 100px)"
            />
            <a-button 
              type="default" 
              @click="fetchBuckets"
              :loading="fetchingBuckets"
              style="width: 100px"
            >
              获取列表
            </a-button>
          </a-input-group>
          <div v-if="availableBuckets.length > 0" style="margin-top: 8px;">
            <a-select 
              v-model:value="formData.bucket" 
              placeholder="选择存储桶"
              style="width: 100%"
              @change="onBucketSelect"
            >
              <a-select-option 
                v-for="bucket in availableBuckets" 
                :key="bucket.name" 
                :value="bucket.name"
              >
                {{ bucket.name }}
                <span v-if="bucket.creation_date" style="color: #999; font-size: 12px;">
                  ({{ formatDate(bucket.creation_date) }})
                </span>
              </a-select-option>
            </a-select>
          </div>
        </a-form-item>
        <a-form-item label="描述" name="description">
          <a-textarea v-model:value="formData.description" placeholder="请输入描述信息" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- OSS浏览器模态框 -->
    <a-modal
      v-model:open="browserModalVisible"
      :title="`${selectedConfig?.name} - OSS文件浏览器`"
      width="90%"
      :footer="null"
      :destroy-on-close="true"
      @cancel="browserModalVisible = false"
    >
      <OSSBrowser v-if="selectedConfig" :config="selectedConfig" />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import type { CloudOSSConfig, CloudProvider } from '@/types'
import { SimpleStorage } from '@/utils/storage-simple'
import { getProviderList, getProviderInfo } from '@/utils/cloud-providers'
import { invoke } from '@tauri-apps/api/tauri'
import OSSBrowser from '@/components/OSSBrowser.vue'
import { ossListBuckets, type OssBucketSummary } from '@/utils/tauri-api'
// STS相关工具函数
const isSTSExpired = (expiration: string): boolean => {
  try {
    const expirationDate = new Date(expiration)
    const now = new Date()
    return now >= expirationDate
  } catch {
    return true // 如果解析失败，认为已过期
  }
}

const getSTSRemainingTime = (expiration: string): number => {
  try {
    const expirationDate = new Date(expiration)
    const now = new Date()
    const remaining = Math.floor((expirationDate.getTime() - now.getTime()) / 1000)
    return Math.max(0, remaining)
  } catch {
    return 0
  }
}

const loading = ref(false)
const modalVisible = ref(false)
const browserModalVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const selectedConfig = ref<CloudOSSConfig | null>(null)
const fetchingBuckets = ref(false)
const availableBuckets = ref<OssBucketSummary[]>([])

const dataSource = ref<CloudOSSConfig[]>([])
const providerList = getProviderList()

const formData = ref<Partial<CloudOSSConfig>>({
  name: '',
  provider: undefined,
  authType: 'longterm',
  accessKey: '',
  secretKey: '',
  sessionToken: '',
  expiration: '',
  region: '',
  endpoint: '',
  bucket: '',
  description: ''
})

const rules = computed(() => ({
  name: [{ required: true, message: '请输入配置名称' }],
  provider: [{ required: true, message: '请选择云厂商' }],
  authType: [{ required: true, message: '请选择认证方式' }],
  accessKey: [{ required: true, message: '请输入Access Key' }],
  secretKey: [{ required: true, message: '请输入Secret Key' }],
  sessionToken: formData.value.authType === 'sts' 
    ? [{ required: true, message: 'STS认证方式需要输入Session Token' }]
    : []
}))

const columns = [
  {
    title: '名称',
    dataIndex: 'name',
    key: 'name'
  },
  {
    title: '云厂商',
    dataIndex: 'provider',
    key: 'provider'
  },
  {
    title: '认证方式',
    dataIndex: 'authType',
    key: 'authType'
  },
  {
    title: 'Access Key',
    dataIndex: 'accessKey',
    key: 'accessKey'
  },
  {
    title: 'Secret Key',
    dataIndex: 'secretKey',
    key: 'secretKey'
  },
  {
    title: 'Session Token',
    dataIndex: 'sessionToken',
    key: 'sessionToken'
  },
  {
    title: '区域',
    dataIndex: 'region',
    key: 'region'
  },
  {
    title: 'Endpoint',
    dataIndex: 'endpoint',
    key: 'endpoint'
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt'
  },
  {
    title: '操作',
    key: 'action',
    width: 300
  }
]

const loadData = async () => {
  loading.value = true
  try {
    const data = await SimpleStorage.loadData('cloud_oss_configs') || []
    dataSource.value = data
  } catch (error) {
    console.error('加载数据失败:', error)
    message.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const saveData = async (data: CloudOSSConfig[]) => {
  try {
    await SimpleStorage.saveData('cloud_oss_configs', data)
  } catch (error) {
    console.error('保存数据失败:', error)
    message.error('保存数据失败')
    throw error
  }
}

const showAddModal = () => {
  isEdit.value = false
  formData.value = {
    name: '',
    provider: undefined,
    authType: 'longterm',
    accessKey: '',
    secretKey: '',
    sessionToken: '',
    expiration: '',
    region: '',
    endpoint: '',
    bucket: '',
    description: ''
  }
  modalVisible.value = true
}

const editItem = (record: CloudOSSConfig) => {
  isEdit.value = true
  formData.value = { ...record }
  modalVisible.value = true
}

const onProviderChange = (provider: CloudProvider) => {
  const providerInfo = getProviderInfo(provider)
  formData.value.region = providerInfo.regions[0] || ''
  formData.value.endpoint = providerInfo.defaultEndpoint
}

const onAuthTypeChange = (authType: 'longterm' | 'sts') => {
  if (authType === 'longterm') {
    // 切换到长期凭证时，清空STS相关字段
    formData.value.sessionToken = ''
    formData.value.expiration = ''
  }
}

const onRegionChange = (region: string) => {
  if (!formData.value.provider) return
  
  // 根据云厂商和区域自动生成 Endpoint
  const provider = formData.value.provider
  let endpoint = ''
  
  switch (provider) {
    case 'tencent':
      endpoint = `https://cos.${region}.myqcloud.com`
      break
    case 'aliyun':
      endpoint = `https://${region}.aliyuncs.com`
      break
    case 'huawei':
      endpoint = `https://obs.${region}.myhuaweicloud.com`
      break
    case 'jdcloud':
      endpoint = `https://s3.${region}.jdcloud-oss.com`
      break
    case 'ksyun':
      endpoint = `https://ks3-${region}.ksyuncs.com`
      break
    case 'qingcloud':
      endpoint = `https://s3.${region}.qingstor.com`
      break
    case 'qiniu':
      // 七牛云的特殊处理
      const qiniuEndpoints: Record<string, string> = {
        'z0': 'https://s3-cn-east-1.qiniucs.com',
        'z1': 'https://s3-cn-north-1.qiniucs.com',
        'z2': 'https://s3-cn-south-1.qiniucs.com',
        'na0': 'https://s3-us-north-1.qiniucs.com',
        'as0': 'https://s3-ap-southeast-1.qiniucs.com',
      }
      endpoint = qiniuEndpoints[region] || `https://s3-${region}.qiniucs.com`
      break
  }
  
  if (endpoint) {
    formData.value.endpoint = endpoint
  }
}

const getCurrentProviderRegions = () => {
  if (!formData.value.provider) return []
  const providerInfo = getProviderInfo(formData.value.provider)
  return providerInfo.regions
}

const getProviderName = (provider: CloudProvider) => {
  const providerInfo = getProviderInfo(provider)
  return providerInfo.name
}

const getProviderColor = (provider: CloudProvider) => {
  const providerInfo = getProviderInfo(provider)
  return providerInfo.color
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    
    const now = new Date().toISOString()
    const newItem: CloudOSSConfig = {
      id: isEdit.value ? formData.value.id! : Date.now().toString(),
      name: formData.value.name!,
      provider: formData.value.provider!,
      authType: formData.value.authType!,
      accessKey: formData.value.accessKey!,
      secretKey: formData.value.secretKey!,
      sessionToken: formData.value.sessionToken,
      expiration: formData.value.expiration,
      region: formData.value.region,
      endpoint: formData.value.endpoint,
      bucket: formData.value.bucket,
      description: formData.value.description,
      createdAt: isEdit.value ? formData.value.createdAt! : now,
      updatedAt: now
    }

    let newData = [...dataSource.value]
    if (isEdit.value) {
      const index = newData.findIndex(item => item.id === newItem.id)
      if (index !== -1) {
        newData[index] = newItem
      }
    } else {
      newData.push(newItem)
    }

    await saveData(newData)
    dataSource.value = newData
    modalVisible.value = false
    message.success(isEdit.value ? '更新成功' : '添加成功')
  } catch (error) {
    console.error('提交失败:', error)
  }
}

const handleCancel = () => {
  modalVisible.value = false
  formRef.value?.resetFields()
}

const deleteItem = async (record: CloudOSSConfig) => {
  try {
    const confirmed = confirm(`确定要删除 "${record.name}" 吗？`)
    if (!confirmed) return

    const newData = dataSource.value.filter(item => item.id !== record.id)
    await saveData(newData)
    dataSource.value = newData
    message.success('删除成功')
  } catch (error) {
    console.error('删除失败:', error)
    message.error('删除失败')
  }
}

const testConnection = async (record: CloudOSSConfig) => {
  try {
    loading.value = true
    
    // 优先尝试获取存储桶列表来测试连接（不需要指定 bucket）
    const res = await invoke<any>('oss_list_buckets', {
      cfg: {
        provider: record.provider,
        access_key: record.accessKey,
        secret_key: record.secretKey,
        session_token: record.sessionToken,
        expiration: record.expiration,
        region: record.region,
        endpoint: record.endpoint,
        bucket: record.bucket, // 可以为空
      }
    })

    if (res?.success) {
      message.success('连接测试成功')
    } else {
      // 如果 ListBuckets 失败，尝试用现有 bucket 测试（如果有的话）
      if (record.bucket && String(record.bucket).trim()) {
        const bucketRes = await invoke<any>('oss_list_objects', {
          cfg: {
            provider: record.provider,
            access_key: record.accessKey,
            secret_key: record.secretKey,
            session_token: record.sessionToken,
            expiration: record.expiration,
            region: record.region,
            endpoint: record.endpoint,
            bucket: record.bucket,
          },
          params: { prefix: '', delimiter: '/' }
        })
        
        if (bucketRes?.success) {
          message.success('连接测试成功')
        } else {
          const errMsg = bucketRes?.error || bucketRes?.message || res?.error || '未知错误'
          message.error(`连接测试失败: ${errMsg}`)
        }
      } else {
        const errMsg = res?.error || res?.message || '未知错误'
        message.error(`连接测试失败: ${errMsg}`)
      }
    }
  } catch (error: any) {
    const errMsg = (error && (error.message || error.error || error.reason)) || String(error)
    message.error(`连接测试失败: ${errMsg}`)
  } finally {
    loading.value = false
  }
}


const openBrowser = (record: CloudOSSConfig) => {
  selectedConfig.value = record
  browserModalVisible.value = true
}

const copyToClipboard = async (record: CloudOSSConfig) => {
  try {
    const text = `名称: ${record.name}
云厂商: ${getProviderName(record.provider)}
认证方式: ${record.authType === 'sts' ? 'STS临时凭证' : '长期凭证'}
Access Key: ${record.accessKey}
Secret Key: ${record.secretKey}
Session Token: ${record.sessionToken || '未设置'}
过期时间: ${record.expiration || '未设置'}
区域: ${record.region || '默认'}
Endpoint: ${record.endpoint || '默认'}
存储桶: ${record.bucket || '未设置'}
描述: ${record.description || '无'}`
    await navigator.clipboard.writeText(text)
    message.success('已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    message.error('复制失败')
  }
}

const fetchBuckets = async () => {
  if (!formData.value.provider || !formData.value.accessKey || !formData.value.secretKey) {
    message.warning('请先填写云厂商、Access Key 和 Secret Key')
    return
  }

  fetchingBuckets.value = true
  try {
    const cfg = {
      provider: formData.value.provider,
      access_key: formData.value.accessKey,
      secret_key: formData.value.secretKey,
      session_token: formData.value.sessionToken,
      expiration: formData.value.expiration,
      region: formData.value.region,
      endpoint: formData.value.endpoint,
      bucket: formData.value.bucket,
    }
    
    const res = await ossListBuckets(cfg)
    console.log('获取存储桶响应:', res)
    if (res.success && res.data) {
      availableBuckets.value = res.data
      message.success(`获取到 ${res.data.length} 个存储桶`)
    } else {
      console.error('获取存储桶失败:', res.error)
      // 对于某些云厂商，ListBuckets 可能不支持，提供手动输入提示
      if (res.error && res.error.includes("AccessDenied")) {
        message.warning('当前云厂商的 ListBuckets API 暂不支持，请手动输入存储桶名称')
      } else {
        throw new Error(res.error || '获取存储桶列表失败')
      }
    }
  } catch (error: any) {
    console.error('获取存储桶列表失败:', error)
    if (error.message && error.message.includes('AccessDenied')) {
      message.warning('当前云厂商的 ListBuckets API 暂不支持，请手动输入存储桶名称')
    } else {
      message.error(`获取存储桶列表失败: ${error.message || error}`)
    }
    availableBuckets.value = []
  } finally {
    fetchingBuckets.value = false
  }
}

const onBucketSelect = (bucketName: string) => {
  formData.value.bucket = bucketName
}

const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString('zh-CN')
  } catch {
    return dateStr
  }
}


onMounted(() => {
  loadData()
})

// 当组件被激活时（从其他页面返回时）重新加载数据
onActivated(() => {
  loadData()
})
</script>

<style scoped>
.cloud-oss-page {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
