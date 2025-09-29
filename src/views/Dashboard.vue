<template>
  <div class="dashboard">
    <a-row :gutter="24">
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="云服务配置"
            :value="cloudConfigCount"
            :value-style="{ color: '#3f8600' }"
          >
            <template #prefix>
              <CloudOutlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="平台集成"
            :value="platformCount"
            :value-style="{ color: '#1890ff' }"
          >
            <template #prefix>
              <TeamOutlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="今日操作"
            :value="todayOperations"
            :value-style="{ color: '#cf1322' }"
          >
            <template #prefix>
              <ToolOutlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="系统状态"
            :value="systemStatus"
            :value-style="{ color: systemStatus === '正常' ? '#3f8600' : '#cf1322' }"
          />
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="24" style="margin-top: 24px;">
      <a-col :span="12">
        <a-card title="最近操作" :bordered="false">
          <a-list
            :data-source="recentOperations"
            :loading="loading"
          >
            <template #renderItem="{ item }">
              <a-list-item>
                <a-list-item-meta
                  :title="item.title"
                  :description="item.description"
                >
                  <template #avatar>
                    <a-avatar :style="{ backgroundColor: item.color }">
                      {{ item.icon }}
                    </a-avatar>
                  </template>
                </a-list-item-meta>
                <template #actions>
                  <span>{{ item.time }}</span>
                </template>
              </a-list-item>
            </template>
          </a-list>
        </a-card>
      </a-col>
      
      <a-col :span="12">
        <a-card title="快速操作" :bordered="false">
          <a-space direction="vertical" style="width: 100%;">
            <a-button type="primary" block @click="goToCloudOSS">
              <CloudOutlined />
              管理云服务
            </a-button>
            <a-button block @click="goToPlatforms">
              <TeamOutlined />
              平台集成
            </a-button>
            <a-button block @click="goToTools">
              <ToolOutlined />
              利用工具
            </a-button>
          </a-space>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { 
  CloudOutlined, 
  TeamOutlined, 
  ToolOutlined 
} from '@ant-design/icons-vue'
import { SimpleStorage } from '@/utils/storage-simple'

const router = useRouter()

const loading = ref(false)
const cloudConfigCount = ref(0)
const platformCount = ref(0)
const todayOperations = ref(0)
const systemStatus = ref('正常')

const recentOperations = ref<any[]>([])

const loadStats = async () => {
  loading.value = true
  try {
    // 加载云服务配置数量
    const cloudConfigs = await SimpleStorage.loadData('cloud_oss_configs') || []
    cloudConfigCount.value = cloudConfigs.length

    // 统计已集成的平台应用数量（合计）
    const [wechat, enterprise, feishu, dingtalk] = await Promise.all([
      SimpleStorage.loadData('sensitive_wechat'),
      SimpleStorage.loadData('sensitive_enterprise'),
      SimpleStorage.loadData('sensitive_feishu'),
      SimpleStorage.loadData('sensitive_dingtalk')
    ])
    const wechatCount = Array.isArray(wechat) ? wechat.length : 0
    const enterpriseCount = Array.isArray(enterprise) ? enterprise.length : 0
    const feishuCount = Array.isArray(feishu) ? feishu.length : 0
    const dingtalkCount = Array.isArray(dingtalk) ? dingtalk.length : 0
    platformCount.value = wechatCount + enterpriseCount + feishuCount + dingtalkCount

    // 加载最近操作记录（如果有）
    const storedOps = await SimpleStorage.loadData('recent_operations') || []
    recentOperations.value = Array.isArray(storedOps) ? storedOps : []

    // 计算今日操作次数（根据 timestamp 字段统计到日）
    if (Array.isArray(storedOps)) {
      const now = new Date()
      todayOperations.value = storedOps.filter((op: any) => {
        if (!op || !op.timestamp) return false
        const d = new Date(op.timestamp)
        return d.getFullYear() === now.getFullYear() &&
               d.getMonth() === now.getMonth() &&
               d.getDate() === now.getDate()
      }).length
    } else {
      todayOperations.value = 0
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  } finally {
    loading.value = false
  }
}

const goToCloudOSS = () => {
  router.push('/cloud-oss')
}

const goToPlatforms = () => {
  router.push('/dingtalk')
}

const goToTools = () => {
  router.push('/tools')
}

onMounted(() => {
  loadStats()
})

onActivated(() => {
  loadStats()
})
</script>

<style scoped>
.dashboard {
  padding: 0;
}
</style>