<template>
  <div class="dashboard">
    <a-row :gutter="24">
      <a-col :span="6">
        <a-card title="微信小程序/公众号" :bordered="false">
          <a-statistic
            title="已保存"
            :value="stats.wechat"
            :value-style="{ color: '#3f8600' }"
          />
          <template #extra>
            <router-link to="/wechat">查看详情</router-link>
          </template>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card title="企业微信" :bordered="false">
          <a-statistic
            title="已保存"
            :value="stats.enterprise"
            :value-style="{ color: '#3f8600' }"
          />
          <template #extra>
            <router-link to="/enterprise">查看详情</router-link>
          </template>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card title="飞书" :bordered="false">
          <a-statistic
            title="已保存"
            :value="stats.feishu"
            :value-style="{ color: '#3f8600' }"
          />
          <template #extra>
            <router-link to="/feishu">查看详情</router-link>
          </template>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card title="钉钉" :bordered="false">
          <a-statistic
            title="已保存"
            :value="stats.dingtalk"
            :value-style="{ color: '#3f8600' }"
          />
          <template #extra>
            <router-link to="/dingtalk">查看详情</router-link>
          </template>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="24" style="margin-top: 24px;">
      <a-col :span="12">
        <a-card title="最近添加" :bordered="false">
          <a-list
            :data-source="recentItems"
            item-layout="horizontal"
          >
            <template #renderItem="{ item }">
              <a-list-item>
                <a-list-item-meta
                  :description="item.description"
                >
                  <template #title>
                    <a>{{ item.name }}</a>
                  </template>
                  <template #avatar>
                    <a-avatar :style="{ backgroundColor: getTypeColor(item.type) }">
                      {{ getTypeIcon(item.type) }}
                    </a-avatar>
                  </template>
                </a-list-item-meta>
                <template #actions>
                  <a-button type="link" size="small" @click="editItem(item)">编辑</a-button>
                  <a-button type="link" size="small" danger @click="deleteItem(item)">删除</a-button>
                </template>
              </a-list-item>
            </template>
          </a-list>
        </a-card>
      </a-col>
      <a-col :span="12">
        <a-card title="快速操作" :bordered="false">
          <a-space direction="vertical" style="width: 100%;">
            <a-button type="primary" block @click="$router.push('/wechat')">
              添加微信小程序/公众号信息
            </a-button>
            <a-button type="primary" block @click="$router.push('/enterprise')">
              添加企业微信信息
            </a-button>
            <a-button type="primary" block @click="$router.push('/feishu')">
              添加飞书信息
            </a-button>
            <a-button type="primary" block @click="$router.push('/dingtalk')">
              添加钉钉信息
            </a-button>
            <a-button type="default" block @click="$router.push('/tools')">
              打开利用工具
            </a-button>
          </a-space>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { SimpleStorage } from '@/utils/storage-simple'

const router = useRouter()

const stats = ref({
  wechat: 0,
  enterprise: 0,
  feishu: 0,
  dingtalk: 0
})

const recentItems = ref<any[]>([])

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    wechat: '#07c160',
    enterprise: '#1296db',
    feishu: '#3370ff',
    dingtalk: '#0089ff'
  }
  return colors[type] || '#1890ff'
}

const getTypeIcon = (type: string) => {
  const icons: Record<string, string> = {
    wechat: '微',
    enterprise: '企',
    feishu: '飞',
    dingtalk: '钉'
  }
  return icons[type] || '?'
}

const loadStats = async () => {
  try {
    const wechatData = await SimpleStorage.loadData('sensitive_wechat') || []
    const enterpriseData = await SimpleStorage.loadData('sensitive_enterprise') || []
    const feishuData = await SimpleStorage.loadData('sensitive_feishu') || []
    const dingtalkData = await SimpleStorage.loadData('sensitive_dingtalk') || []

    stats.value = {
      wechat: wechatData.length,
      enterprise: enterpriseData.length,
      feishu: feishuData.length,
      dingtalk: dingtalkData.length
    }

    // 获取最近添加的项目
    const allItems = [
      ...wechatData.map((item: any) => ({ ...item, type: 'wechat' })),
      ...enterpriseData.map((item: any) => ({ ...item, type: 'enterprise' })),
      ...feishuData.map((item: any) => ({ ...item, type: 'feishu' })),
      ...dingtalkData.map((item: any) => ({ ...item, type: 'dingtalk' }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    recentItems.value = allItems.slice(0, 5)
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

const editItem = (item: any) => {
  // 根据类型跳转到对应的编辑页面
  const routeMap: Record<string, string> = {
    wechat: '/wechat',
    enterprise: '/enterprise',
    feishu: '/feishu',
    dingtalk: '/dingtalk'
  }
  
  const route = routeMap[item.type]
  if (route) {
    router.push({
      path: route,
      query: { edit: item.id }
    })
  }
}

const deleteItem = async (item: any) => {
  try {
    const confirmed = confirm(`确定要删除 "${item.name}" 吗？`)
    if (!confirmed) return

    // 根据类型加载对应的数据
    const storageKeys: Record<string, string> = {
      wechat: 'sensitive_wechat',
      enterprise: 'sensitive_enterprise',
      feishu: 'sensitive_feishu',
      dingtalk: 'sensitive_dingtalk'
    }
    
    const storageKey = storageKeys[item.type]
    if (!storageKey) {
      message.error('未知的类型')
      return
    }

    const data = await SimpleStorage.loadData(storageKey) || []
    const filteredData = data.filter((record: any) => record.id !== item.id)
    
    await SimpleStorage.saveData(storageKey, filteredData)
    message.success('删除成功')
    
    // 重新加载数据
    await loadStats()
  } catch (error) {
    console.error('删除失败:', error)
    message.error('删除失败')
  }
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
