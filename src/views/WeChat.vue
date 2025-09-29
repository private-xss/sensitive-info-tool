<template>
  <div class="wechat-page">
    <a-card title="微信小程序/公众号信息管理" :bordered="false">
      <template #extra>
        <a-button type="primary" @click="showAddModal">
          <template #icon>
            <PlusOutlined />
          </template>
          添加信息
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
          <template v-if="column.key === 'appSecret'">
            <a-input-password
              :value="record.appSecret"
              readonly
              style="border: none; background: transparent;"
            />
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
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
      :title="isEdit ? '编辑微信小程序信息' : '添加微信小程序信息'"
      @ok="handleSubmit"
      @cancel="handleCancel"
    >
      <a-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        layout="vertical"
      >
        <a-form-item label="名称" name="name">
          <a-input v-model:value="formData.name" placeholder="请输入小程序/公众号名称" />
        </a-form-item>
        <a-form-item label="App ID" name="appId">
          <a-input v-model:value="formData.appId" placeholder="小程序的AppID或公众号的AppID" />
        </a-form-item>
        <a-form-item label="App Secret" name="appSecret">
          <a-input-password v-model:value="formData.appSecret" placeholder="小程序的AppSecret或公众号的AppSecret" />
        </a-form-item>
        <a-form-item label="描述" name="description">
          <a-textarea v-model:value="formData.description" placeholder="请输入描述信息" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onActivated, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import type { WeChatMiniProgram } from '@/types'
import { SimpleStorage } from '@/utils/storage-simple'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const modalVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()

const dataSource = ref<WeChatMiniProgram[]>([])

const formData = ref<Partial<WeChatMiniProgram>>({
  name: '',
  appId: '',
  appSecret: '',
  description: ''
})

const rules = {
  name: [{ required: true, message: '请输入小程序/公众号名称' }],
  appId: [{ required: true, message: '请输入App ID' }],
  appSecret: [{ required: true, message: '请输入App Secret' }]
}

const columns = [
  {
    title: '名称',
    dataIndex: 'name',
    key: 'name'
  },
  {
    title: 'App ID',
    dataIndex: 'appId',
    key: 'appId'
  },
  {
    title: 'App Secret',
    dataIndex: 'appSecret',
    key: 'appSecret'
  },
  {
    title: '描述',
    dataIndex: 'description',
    key: 'description'
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt'
  },
  {
    title: '操作',
    key: 'action',
    width: 200
  }
]

const loadData = async () => {
  loading.value = true
  try {
    const data = await SimpleStorage.loadData('sensitive_wechat') || []
    dataSource.value = data
    console.log('加载的数据:', data)
  } catch (error) {
    console.error('加载数据失败:', error)
    message.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const saveData = async (data: WeChatMiniProgram[]) => {
  try {
    await SimpleStorage.saveData('sensitive_wechat', data)
    console.log('保存成功，数据:', data)
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
    appId: '',
    appSecret: '',
    description: ''
  }
  modalVisible.value = true
}

const editItem = (record: WeChatMiniProgram) => {
  isEdit.value = true
  formData.value = { ...record }
  modalVisible.value = true
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    
    const now = new Date().toISOString()
    const newItem: WeChatMiniProgram = {
      id: isEdit.value ? formData.value.id! : Date.now().toString(),
      name: formData.value.name!,
      appId: formData.value.appId!,
      appSecret: formData.value.appSecret!,
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

const deleteItem = async (record: WeChatMiniProgram) => {
  try {
    await new Promise<void>((resolve, reject) => {
      const modal = message.warning({
        content: '确定要删除这条记录吗？',
        duration: 0,
        onClose: () => reject(new Error('用户取消'))
      })
      
      // 这里应该显示确认对话框，简化处理
      if (confirm('确定要删除这条记录吗？')) {
        modal()
        resolve()
      } else {
        modal()
        reject(new Error('用户取消'))
      }
    })

    const newData = dataSource.value.filter(item => item.id !== record.id)
    await saveData(newData)
    dataSource.value = newData
    message.success('删除成功')
  } catch (error) {
    // 用户取消或其他错误
  }
}

const copyToClipboard = async (record: WeChatMiniProgram) => {
  try {
    const text = `名称: ${record.name}\nApp ID: ${record.appId}\nApp Secret: ${record.appSecret}\n描述: ${record.description || '无'}`
    await navigator.clipboard.writeText(text)
    message.success('已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    message.error('复制失败')
  }
}

onMounted(() => {
  loadData()
  
  // 检查是否有编辑参数
  const editId = route.query.edit as string
  if (editId) {
    setTimeout(() => {
      const record = dataSource.value.find(item => item.id === editId)
      if (record) {
        editItem(record)
      }
    }, 100)
  }
})

// 当组件被激活时（从其他页面返回时）重新加载数据
onActivated(() => {
  loadData()
})

// 监听路由参数变化
watch(() => route.query.edit, (editId) => {
  if (editId && dataSource.value.length > 0) {
    const record = dataSource.value.find(item => item.id === editId)
    if (record) {
      editItem(record)
    }
  }
})
</script>

<style scoped>
.wechat-page {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
