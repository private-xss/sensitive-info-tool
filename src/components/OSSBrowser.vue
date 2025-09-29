<template>
  <div class="oss-browser">
    <a-card title="文件浏览器" :bordered="false">
      <template #extra>
        <a-space>
          <a-button @click="refreshFiles" :loading="loading">
            <template #icon>
              <ReloadOutlined />
            </template>
            刷新
          </a-button>
          <a-upload
            :before-upload="beforeUpload"
            :show-upload-list="false"
            multiple
          >
            <a-button type="primary">
              <template #icon>
                <UploadOutlined />
              </template>
              上传文件
            </a-button>
          </a-upload>
          <a-button @click="showCreateFolderModal">
            <template #icon>
              <FolderAddOutlined />
            </template>
            新建文件夹
          </a-button>
        </a-space>
      </template>

      <!-- 路径导航 -->
      <a-breadcrumb style="margin-bottom: 16px;">
        <a-breadcrumb-item>
          <a @click="navigateTo('')">根目录</a>
        </a-breadcrumb-item>
        <a-breadcrumb-item v-for="(path, index) in pathParts" :key="index">
          <a @click="navigateTo(pathParts.slice(0, index + 1).join('/'))">
            {{ path }}
          </a>
        </a-breadcrumb-item>
      </a-breadcrumb>

      <!-- 文件列表 -->
      <a-table
        :columns="columns"
        :data-source="files"
        :loading="loading"
        :pagination="false"
        row-key="name"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <a-space>
              <FolderOutlined v-if="record.type === 'folder'" />
              <FileOutlined v-else />
              <a v-if="record.type === 'folder'" @click="navigateTo(record.path)">
                {{ record.name }}
              </a>
              <span v-else>{{ record.name }}</span>
            </a-space>
          </template>
          
          <template v-if="column.key === 'size'">
            <span v-if="record.type === 'file'">{{ formatFileSize(record.size) }}</span>
            <span v-else>-</span>
          </template>
          
          <template v-if="column.key === 'lastModified'">
            <span>{{ formatDate(record.lastModified) }}</span>
          </template>
          
          <template v-if="column.key === 'actions'">
            <a-space>
              <a-button
                v-if="record.type === 'file'"
                size="small"
                @click="downloadFile(record)"
              >
                下载
              </a-button>
              <a-popconfirm
                title="确定要删除这个文件吗？"
                @confirm="deleteFile(record)"
              >
                <a-button size="small" danger>删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 新建文件夹模态框 -->
    <a-modal
      v-model:open="createFolderModalVisible"
      title="新建文件夹"
      @ok="handleCreateFolder"
      @cancel="handleCancelCreateFolder"
    >
      <a-form :model="createFolderForm" layout="vertical">
        <a-form-item label="文件夹名称" name="folderName">
          <a-input v-model:value="createFolderForm.folderName" placeholder="请输入文件夹名称" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  ReloadOutlined,
  UploadOutlined,
  FolderOutlined,
  FileOutlined,
  FolderAddOutlined
} from '@ant-design/icons-vue'

interface FileItem {
  name: string
  path: string
  type: 'file' | 'folder'
  size?: number
  lastModified?: Date
}

import { 
  ossListObjects, 
  ossUploadFile, 
  ossDownloadFile, 
  ossDeleteFile, 
  ossCreateFolder,
  type OssConfig, 
  type OssFileItem,
  type OssUploadParams,
  type OssDownloadParams,
  type OssDeleteParams,
  type OssCreateFolderParams
} from '@/utils/tauri-api'

interface Props {
  config: {
    provider: string
    accessKey: string
    secretKey: string
    region?: string
    endpoint?: string
    bucket?: string
  }
}

const props = defineProps<Props>()

const loading = ref(false)
const currentPath = ref('')
const files = ref<FileItem[]>([])
const createFolderModalVisible = ref(false)
const createFolderForm = ref({
  folderName: ''
})

const pathParts = computed(() => {
  return currentPath.value ? currentPath.value.split('/').filter(Boolean) : []
})

const columns = [
  {
    title: '名称',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '大小',
    dataIndex: 'size',
    key: 'size',
    width: 120,
  },
  {
    title: '修改时间',
    dataIndex: 'lastModified',
    key: 'lastModified',
    width: 180,
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
  },
]

const withTimeout = async <T>(p: Promise<T>, ms = 30000): Promise<T> => {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('请求超时，请稍后重试')), ms))
  ])
}

const refreshFiles = async () => {
  if (!props.config) {
    console.warn('OSSBrowser: config is null or undefined')
    return
  }
  
  const bucket = props.config.bucket
  if (!bucket) {
    console.warn('OSSBrowser: bucket is missing')
    message.warning('配置信息不完整，请先填写 bucket')
    return
  }

  console.log('Starting refreshFiles...')
  loading.value = true
  
  try {
    const cfg: OssConfig = {
      provider: props.config.provider,
      access_key: props.config.accessKey,
      secret_key: props.config.secretKey,
      region: props.config.region,
      endpoint: props.config.endpoint,
      bucket: bucket,
    }
    
    console.log('请求配置:', cfg)
    console.log('当前路径:', currentPath.value)
    
    // 限制每次获取的文件数量，避免大量文件导致超时
    const res = await withTimeout(ossListObjects(cfg, { 
      prefix: currentPath.value ? currentPath.value + '/' : '', 
      delimiter: '/',
      max_keys: 1000  // 限制每次最多获取1000个文件
    }))
    console.log('文件列表响应:', res)
    
    if (!res.success) {
      console.error('文件列表请求失败:', res.error)
      throw new Error(res.error || 'list failed')
    }

    const list = (res.data || []) as OssFileItem[]
    console.log('原始文件列表:', list)
    
    // 简化映射逻辑，避免复杂的数组操作，并添加进度提示
    const mapped: FileItem[] = []
    const total = list.length
    console.log(`开始处理 ${total} 个文件...`)
    
    for (let i = 0; i < list.length; i++) {
      const it = list[i]
      try {
        const isDir = it.is_directory
        const key = it.key.endsWith('/') ? it.key.slice(0, -1) : it.key
        const name = key.split('/').filter(Boolean).pop() || key
        // 安全处理日期，避免 undefined 错误
        let lastModified: Date | undefined = undefined
        if (it.last_modified) {
          try {
            lastModified = new Date(it.last_modified)
            // 检查日期是否有效
            if (isNaN(lastModified.getTime())) {
              lastModified = undefined
            }
          } catch (dateError) {
            console.warn('Invalid date format:', it.last_modified, dateError)
            lastModified = undefined
          }
        }
        
        mapped.push({
          name,
          path: key,
          type: isDir ? 'folder' : 'file',
          size: it.size || 0,
          lastModified,
        })
        
        // 每处理100个文件显示一次进度
        if ((i + 1) % 100 === 0) {
          console.log(`已处理 ${i + 1}/${total} 个文件`)
        }
      } catch (itemError) {
        console.warn('Error processing item:', it, itemError)
      }
    }
    
    console.log(`文件处理完成，共 ${mapped.length} 个文件`)
    
    console.log('映射后的文件列表:', mapped)
    files.value = mapped
    console.log('refreshFiles completed successfully')
  } catch (error) {
    console.error('获取文件列表失败:', error)
    
    // 简化错误处理
    if (error.message && error.message.includes('NoSuchBucket')) {
      message.error('存储桶不存在，请检查存储桶名称和区域配置')
    } else if (error.message && error.message.includes('AccessDenied')) {
      message.error('访问被拒绝，请检查密钥和权限')
    } else {
      message.error(`获取文件列表失败: ${error.message || error}`)
    }
  } finally {
    loading.value = false
  }
}

const navigateTo = (path: string) => {
  currentPath.value = path
  refreshFiles()
}

const beforeUpload = async (file: File) => {
  loading.value = true
  try {
    const bucket = props.config.bucket
    if (!props.config || !bucket) {
      message.error('配置信息不完整')
      return false
    }

    const cfg: OssConfig = {
      provider: props.config.provider,
      access_key: props.config.accessKey,
      secret_key: props.config.secretKey,
      region: props.config.region,
      endpoint: props.config.endpoint,
      bucket: bucket,
    }

    const fileData = new Uint8Array(await file.arrayBuffer())
    const params: OssUploadParams = {
      file_name: file.name,
      file_data: Array.from(fileData),
      content_type: file.type,
      path: currentPath.value
    }

    const res = await ossUploadFile(cfg, params)
    if (res.success) {
      message.success(`文件 ${file.name} 上传成功`)
      await refreshFiles()
    } else {
      throw new Error(res.error || '上传失败')
    }
  } catch (error) {
    console.error('文件上传失败:', error)
    message.error(`文件上传失败: ${error}`)
  } finally {
    loading.value = false
  }
  return false // 阻止默认上传行为
}

const downloadFile = async (file: FileItem) => {
  try {
    const bucket = props.config.bucket
    if (!props.config || !bucket) {
      message.error('配置信息不完整')
      return
    }

    const cfg: OssConfig = {
      provider: props.config.provider,
      access_key: props.config.accessKey,
      secret_key: props.config.secretKey,
      region: props.config.region,
      endpoint: props.config.endpoint,
      bucket: bucket,
    }

    const params: OssDownloadParams = {
      key: file.path
    }

    const res = await ossDownloadFile(cfg, params)
    if (res.success && res.data) {
      // 创建下载链接
      const blob = new Blob([new Uint8Array(res.data)])
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      message.success(`文件 ${file.name} 下载成功`)
    } else {
      throw new Error(res.error || '下载失败')
    }
  } catch (error) {
    console.error('文件下载失败:', error)
    message.error(`文件下载失败: ${error}`)
  }
}

const deleteFile = async (file: FileItem) => {
  try {
    const bucket = props.config.bucket
    if (!props.config || !bucket) {
      message.error('配置信息不完整')
      return
    }

    const cfg: OssConfig = {
      provider: props.config.provider,
      access_key: props.config.accessKey,
      secret_key: props.config.secretKey,
      region: props.config.region,
      endpoint: props.config.endpoint,
      bucket: bucket,
    }

    const params: OssDeleteParams = {
      key: file.path
    }

    const res = await ossDeleteFile(cfg, params)
    if (res.success) {
      message.success(`文件 ${file.name} 删除成功`)
      await refreshFiles()
    } else {
      throw new Error(res.error || '删除失败')
    }
  } catch (error) {
    console.error('文件删除失败:', error)
    message.error(`文件删除失败: ${error}`)
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (date: Date | undefined): string => {
  if (!date) return '-'
  try {
    return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN')
  } catch (error) {
    console.warn('Error formatting date:', date, error)
    return '-'
  }
}

const showCreateFolderModal = () => {
  createFolderForm.value.folderName = ''
  createFolderModalVisible.value = true
}

const handleCreateFolder = async () => {
  if (!createFolderForm.value.folderName.trim()) {
    message.error('请输入文件夹名称')
    return
  }

  try {
    loading.value = true
    const bucket = props.config.bucket
    if (!props.config || !bucket) {
      message.error('配置信息不完整')
      loading.value = false
      return
    }

    const cfg: OssConfig = {
      provider: props.config.provider,
      access_key: props.config.accessKey,
      secret_key: props.config.secretKey,
      region: props.config.region,
      endpoint: props.config.endpoint,
      bucket: bucket,
    }

    const params: OssCreateFolderParams = {
      folder_name: createFolderForm.value.folderName.trim(),
      path: currentPath.value
    }

    const res = await withTimeout(ossCreateFolder(cfg, params))
    if (res.success) {
      message.success(`文件夹 ${createFolderForm.value.folderName} 创建成功`)
      createFolderModalVisible.value = false
      await refreshFiles()
    } else {
      throw new Error(res.error || '创建失败')
    }
  } catch (error) {
    console.error('文件夹创建失败:', error)
    message.error(`文件夹创建失败: ${error}`)
  } finally {
    loading.value = false
  }
}

const handleCancelCreateFolder = () => {
  createFolderModalVisible.value = false
  createFolderForm.value.folderName = ''
}

// 组件挂载后延迟检查配置，避免组件初始化问题
onMounted(() => {
  console.log('OSSBrowser mounted, config:', props.config)
  
  // 使用更长的延迟确保组件完全稳定
  setTimeout(() => {
    try {
      if (props.config?.bucket && props.config?.provider && props.config?.accessKey && props.config?.secretKey) {
        console.log('Starting refreshFiles from onMounted')
        currentPath.value = ''
        refreshFiles()
      } else {
        console.warn('OSSBrowser: config incomplete on mount', {
          bucket: props.config?.bucket,
          provider: props.config?.provider,
          accessKey: props.config?.accessKey ? '***' : 'missing',
          secretKey: props.config?.secretKey ? '***' : 'missing'
        })
      }
    } catch (error) {
      console.error('Error in onMounted:', error)
    }
  }, 200)
})

// 移除 watch，避免响应式问题
</script>

<style scoped>
.oss-browser {
  height: 100%;
}
</style>
