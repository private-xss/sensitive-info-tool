<template>
  <div class="platform-manager">
    <div class="page-header">
      <h2>平台管理</h2>
      <p>管理钉钉、企业微信、微信小程序/公众号、飞书等平台的配置</p>
    </div>

    <div class="platform-grid">
      <div
        v-for="(config, key) in platformConfigs"
        :key="key"
        class="platform-card"
        @click="openConfigModal(key as PlatformType)"
      >
        <div class="platform-icon" :style="{ backgroundColor: config.color }">
          <component :is="getIconComponent(config.icon)" />
        </div>
        <div class="platform-info">
          <h3>{{ config.name }}</h3>
          <p>{{ config.description }}</p>
          <div class="platform-status">
            <a-tag :color="getConfigStatus(key as PlatformType) ? 'green' : 'default'">
              {{ getConfigStatus(key as PlatformType) ? '已配置' : '未配置' }}
            </a-tag>
          </div>
        </div>
        <div class="platform-actions">
          <a-button type="primary" size="small" @click.stop="openConfigModal(key as PlatformType)">
            配置
          </a-button>
          <a-button 
            v-if="getConfigStatus(key as PlatformType)" 
            size="small" 
            @click.stop="testConnection(key as PlatformType)"
            :loading="testingConnections[key]"
          >
            测试
          </a-button>
        </div>
      </div>
    </div>

    <!-- 配置模态框 -->
    <a-modal
      v-model:open="configModalVisible"
      :title="`配置 ${currentPlatformConfig?.name || ''}`"
      width="600px"
      @ok="saveConfig"
      @cancel="cancelConfig"
    >
      <a-form
        ref="configFormRef"
        :model="currentConfig"
        :rules="configRules"
        layout="vertical"
      >
        <a-form-item
          v-for="field in currentPlatformConfig?.fields || []"
          :key="field.key"
          :label="field.label"
          :name="field.key"
          :required="field.required"
        >
          <a-input
            v-model:value="currentConfig[field.key]"
            :placeholder="`请输入${field.label}`"
            :type="field.key.includes('secret') || field.key.includes('Secret') ? 'password' : 'text'"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 用户列表模态框 -->
    <a-modal
      v-model:open="usersModalVisible"
      :title="`${currentPlatformConfig?.name || ''} 用户列表`"
      width="800px"
      :footer="null"
    >
      <div class="users-container">
        <div class="users-header">
          <a-input-search
            v-model:value="userSearchText"
            placeholder="搜索用户"
            style="width: 300px"
            @search="searchUsers"
          />
          <a-button type="primary" @click="loadUsers" :loading="loadingUsers">
            刷新
          </a-button>
        </div>
        
        <a-table
          :columns="userColumns"
          :data-source="filteredUsers"
          :pagination="{ pageSize: 10 }"
          row-key="id"
          :loading="loadingUsers"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'avatar'">
              <a-avatar :src="record.avatar" :size="32">
                {{ record.name?.charAt(0) }}
              </a-avatar>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button type="link" size="small" @click="sendMessage(record)">
                发送消息
              </a-button>
            </template>
          </template>
        </a-table>
      </div>
    </a-modal>

    <!-- 消息发送模态框 -->
    <a-modal
      v-model:open="messageModalVisible"
      title="发送消息"
      width="500px"
      @ok="sendMessageToUsers"
      @cancel="cancelMessage"
    >
      <a-form layout="vertical">
        <a-form-item label="接收用户">
          <a-tag
            v-for="user in selectedUsers"
            :key="user.id"
            closable
            @close="removeUser(user)"
          >
            {{ user.name }}
          </a-tag>
        </a-form-item>
        <a-form-item label="消息内容">
          <a-textarea
            v-model:value="messageContent"
            placeholder="请输入要发送的消息内容"
            :rows="4"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { 
  DingtalkOutlined, 
  WechatOutlined, 
  MessageOutlined,
  UserOutlined
} from '@ant-design/icons-vue'
import { 
  platformAPI, 
  platformConfigs, 
  type PlatformType, 
  type PlatformConfig,
  type UserInfo 
} from '@/utils/platform-apis'
import { SimpleStorage } from '@/utils/storage-simple'

// 响应式数据
const configModalVisible = ref(false)
const usersModalVisible = ref(false)
const messageModalVisible = ref(false)
const currentPlatform = ref<PlatformType>('dingtalk')
const currentConfig = ref<Record<string, any>>({})
const configFormRef = ref()
const testingConnections = ref<Record<string, boolean>>({})
const loadingUsers = ref(false)
const users = ref<UserInfo[]>([])
const userSearchText = ref('')
const selectedUsers = ref<UserInfo[]>([])
const messageContent = ref('')

// 计算属性
const currentPlatformConfig = computed(() => {
  return platformConfigs[currentPlatform.value]
})

const filteredUsers = computed(() => {
  if (!userSearchText.value) return users.value
  return users.value.filter(user => 
    user.name?.toLowerCase().includes(userSearchText.value.toLowerCase()) ||
    user.email?.toLowerCase().includes(userSearchText.value.toLowerCase()) ||
    user.mobile?.includes(userSearchText.value)
  )
})

// 表格列配置
const userColumns = [
  {
    title: '头像',
    dataIndex: 'avatar',
    key: 'avatar',
    width: 80
  },
  {
    title: '姓名',
    dataIndex: 'name',
    key: 'name'
  },
  {
    title: '邮箱',
    dataIndex: 'email',
    key: 'email'
  },
  {
    title: '手机',
    dataIndex: 'mobile',
    key: 'mobile'
  },
  {
    title: '部门',
    dataIndex: 'department',
    key: 'department'
  },
  {
    title: '操作',
    key: 'action',
    width: 100
  }
]

// 表单验证规则
const configRules = computed(() => {
  const rules: Record<string, any> = {}
  currentPlatformConfig.value?.fields.forEach(field => {
    if (field.required) {
      rules[field.key] = [
        { required: true, message: `请输入${field.label}`, trigger: 'blur' }
      ]
    }
  })
  return rules
})

// 获取图标组件
const getIconComponent = (iconName: string) => {
  switch (iconName) {
    case 'dingtalk':
      return DingtalkOutlined
    case 'wechat':
      return WechatOutlined
    case 'feishu':
      return MessageOutlined
    default:
      return UserOutlined
  }
}

// 获取配置状态
const getConfigStatus = (platform: PlatformType): boolean => {
  const config = SimpleStorage.get(`platform_config_${platform}`)
  return !!config && Object.keys(config).length > 0
}

// 打开配置模态框
const openConfigModal = (platform: PlatformType) => {
  currentPlatform.value = platform
  const existingConfig = SimpleStorage.get(`platform_config_${platform}`) || {}
  currentConfig.value = { ...existingConfig }
  configModalVisible.value = true
}

// 保存配置
const saveConfig = async () => {
  try {
    await configFormRef.value.validate()
    SimpleStorage.set(`platform_config_${currentPlatform.value}`, currentConfig.value)
    message.success('配置保存成功')
    configModalVisible.value = false
  } catch (error) {
    console.error('配置保存失败:', error)
  }
}

// 取消配置
const cancelConfig = () => {
  configModalVisible.value = false
  currentConfig.value = {}
}

// 测试连接
const testConnection = async (platform: PlatformType) => {
  const config = SimpleStorage.get(`platform_config_${platform}`)
  if (!config) {
    message.error('请先配置平台信息')
    return
  }

  testingConnections.value[platform] = true
  try {
    const result = await platformAPI.testConnection({
      provider: platform,
      ...config
    })
    
    if (result.success) {
      message.success(result.message || '连接测试成功')
      // 如果测试成功，打开用户列表
      if (platform !== 'wechat-miniprogram') {
        currentPlatform.value = platform
        usersModalVisible.value = true
        loadUsers()
      }
    } else {
      message.error(result.error || '连接测试失败')
    }
  } catch (error: any) {
    message.error(`连接测试失败: ${error.message}`)
  } finally {
    testingConnections.value[platform] = false
  }
}

// 加载用户列表
const loadUsers = async () => {
  const config = SimpleStorage.get(`platform_config_${currentPlatform.value}`)
  if (!config) {
    message.error('请先配置平台信息')
    return
  }

  loadingUsers.value = true
  try {
    const result = await platformAPI.getUsers({
      provider: currentPlatform.value,
      ...config
    })
    
    if (result.success && result.data) {
      users.value = result.data
      message.success(`获取到 ${result.data.length} 个用户`)
    } else {
      message.error(result.error || '获取用户列表失败')
    }
  } catch (error: any) {
    message.error(`获取用户列表失败: ${error.message}`)
  } finally {
    loadingUsers.value = false
  }
}

// 搜索用户
const searchUsers = () => {
  // 搜索逻辑在computed中处理
}

// 发送消息
const sendMessage = (user: UserInfo) => {
  selectedUsers.value = [user]
  messageContent.value = ''
  messageModalVisible.value = true
}

// 移除用户
const removeUser = (user: UserInfo) => {
  const index = selectedUsers.value.findIndex(u => u.id === user.id)
  if (index > -1) {
    selectedUsers.value.splice(index, 1)
  }
}

// 发送消息给用户
const sendMessageToUsers = async () => {
  if (selectedUsers.value.length === 0) {
    message.error('请选择接收用户')
    return
  }
  
  if (!messageContent.value.trim()) {
    message.error('请输入消息内容')
    return
  }

  const config = SimpleStorage.get(`platform_config_${currentPlatform.value}`)
  if (!config) {
    message.error('请先配置平台信息')
    return
  }

  try {
    const userIds = selectedUsers.value.map(user => user.id)
    const result = await platformAPI.sendMessage({
      provider: currentPlatform.value,
      ...config
    }, userIds, messageContent.value)
    
    if (result.success) {
      message.success('消息发送成功')
      messageModalVisible.value = false
      selectedUsers.value = []
      messageContent.value = ''
    } else {
      message.error(result.error || '消息发送失败')
    }
  } catch (error: any) {
    message.error(`消息发送失败: ${error.message}`)
  }
}

// 取消消息发送
const cancelMessage = () => {
  messageModalVisible.value = false
  selectedUsers.value = []
  messageContent.value = ''
}

// 组件挂载
onMounted(() => {
  // 初始化数据
})
</script>

<style scoped>
.platform-manager {
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
}

.page-header p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.platform-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.platform-card {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
  background: white;
}

.platform-card:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.platform-card {
  display: flex;
  align-items: center;
  gap: 16px;
}

.platform-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
}

.platform-info {
  flex: 1;
}

.platform-info h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
}

.platform-info p {
  margin: 0 0 8px 0;
  color: #666;
  font-size: 12px;
}

.platform-actions {
  display: flex;
  gap: 8px;
}

.users-container {
  max-height: 500px;
  overflow-y: auto;
}

.users-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
</style>
