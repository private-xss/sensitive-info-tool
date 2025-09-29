<template>
  <div class="enterprise-page">
    <a-card title="企业微信信息管理" :bordered="false">
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
          <template v-if="column.key === 'corpSecret'">
            <a-input-password
              :value="record.corpSecret"
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
      :title="isEdit ? '编辑企业微信信息' : '添加企业微信信息'"
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
          <a-input v-model:value="formData.name" placeholder="请输入企业微信应用名称" />
        </a-form-item>
        <a-form-item label="Corp ID" name="corpId">
          <a-input v-model:value="formData.corpId" placeholder="请输入Corp ID" />
        </a-form-item>
        <a-form-item label="Corp Secret" name="corpSecret">
          <a-input-password v-model:value="formData.corpSecret" placeholder="请输入Corp Secret" />
        </a-form-item>
        <a-form-item label="Agent ID" name="agentId">
          <a-input v-model:value="formData.agentId" placeholder="请输入Agent ID（可选）" />
        </a-form-item>
        <a-form-item label="描述" name="description">
          <a-textarea v-model:value="formData.description" placeholder="请输入描述信息" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onActivated } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import type { EnterpriseWeChat } from '@/types'
import { SimpleStorage } from '@/utils/storage-simple'

const loading = ref(false)
const modalVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()

const dataSource = ref<EnterpriseWeChat[]>([])

const formData = ref<Partial<EnterpriseWeChat>>({
  name: '',
  corpId: '',
  corpSecret: '',
  agentId: '',
  description: ''
})

const rules = {
  name: [{ required: true, message: '请输入企业微信应用名称' }],
  corpId: [{ required: true, message: '请输入Corp ID' }],
  corpSecret: [{ required: true, message: '请输入Corp Secret' }]
}

const columns = [
  {
    title: '名称',
    dataIndex: 'name',
    key: 'name'
  },
  {
    title: 'Corp ID',
    dataIndex: 'corpId',
    key: 'corpId'
  },
  {
    title: 'Corp Secret',
    dataIndex: 'corpSecret',
    key: 'corpSecret'
  },
  {
    title: 'Agent ID',
    dataIndex: 'agentId',
    key: 'agentId'
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
    const data = await SimpleStorage.loadData('sensitive_enterprise') || []
    dataSource.value = data
    console.log('企业微信数据加载:', data)
  } catch (error) {
    console.error('加载数据失败:', error)
    message.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const saveData = async (data: EnterpriseWeChat[]) => {
  try {
    await SimpleStorage.saveData('sensitive_enterprise', data)
    console.log('企业微信数据保存成功:', data)
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
    corpId: '',
    corpSecret: '',
    agentId: '',
    description: ''
  }
  modalVisible.value = true
}

const editItem = (record: EnterpriseWeChat) => {
  isEdit.value = true
  formData.value = { ...record }
  modalVisible.value = true
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    
    const now = new Date().toISOString()
    const newItem: EnterpriseWeChat = {
      id: isEdit.value ? formData.value.id! : Date.now().toString(),
      name: formData.value.name!,
      corpId: formData.value.corpId!,
      corpSecret: formData.value.corpSecret!,
      agentId: formData.value.agentId,
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

const deleteItem = async (record: EnterpriseWeChat) => {
  try {
    if (confirm('确定要删除这条记录吗？')) {
      const newData = dataSource.value.filter(item => item.id !== record.id)
      await saveData(newData)
      dataSource.value = newData
      message.success('删除成功')
    }
  } catch (error) {
    console.error('删除失败:', error)
    message.error('删除失败')
  }
}

const copyToClipboard = async (record: EnterpriseWeChat) => {
  try {
    const text = `名称: ${record.name}\nCorp ID: ${record.corpId}\nCorp Secret: ${record.corpSecret}\nAgent ID: ${record.agentId || '无'}\n描述: ${record.description || '无'}`
    await navigator.clipboard.writeText(text)
    message.success('已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    message.error('复制失败')
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
.enterprise-page {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
