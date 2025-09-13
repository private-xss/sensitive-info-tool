<template>
  <a-config-provider :locale="zhCN">
    <a-layout style="min-height: 100vh">
      <a-layout-header class="header">
        <div class="logo">
          <h2 style="color: white; margin: 0;">敏感信息管理工具</h2>
        </div>
        <a-menu
          v-model:selectedKeys="selectedKeys"
          theme="dark"
          mode="horizontal"
          :style="{ lineHeight: '64px' }"
        >
          <a-menu-item key="dashboard">
            <router-link to="/">仪表盘</router-link>
          </a-menu-item>
          <a-menu-item key="wechat">
            <router-link to="/wechat">微信小程序</router-link>
          </a-menu-item>
          <a-menu-item key="enterprise">
            <router-link to="/enterprise">企业微信</router-link>
          </a-menu-item>
          <a-menu-item key="feishu">
            <router-link to="/feishu">飞书</router-link>
          </a-menu-item>
          <a-menu-item key="dingtalk">
            <router-link to="/dingtalk">钉钉</router-link>
          </a-menu-item>
          <a-menu-item key="tools">
            <router-link to="/tools">利用工具</router-link>
          </a-menu-item>
        </a-menu>
      </a-layout-header>
      <a-layout-content style="padding: 24px; background: #f0f2f5;">
        <router-view />
      </a-layout-content>
      <a-layout-footer class="app-footer">
                   By Private null
      </a-layout-footer>
    </a-layout>
  </a-config-provider>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import zhCN from 'ant-design-vue/es/locale/zh_CN'

const route = useRoute()
const selectedKeys = ref<string[]>([])

watch(
  () => route.path,
  (newPath) => {
    const pathMap: Record<string, string> = {
      '/': 'dashboard',
      '/wechat': 'wechat',
      '/enterprise': 'enterprise',
      '/feishu': 'feishu',
      '/dingtalk': 'dingtalk',
      '/tools': 'tools'
    }
    selectedKeys.value = [pathMap[newPath] || 'dashboard']
  },
  { immediate: true }
)
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  padding: 0 24px;
}

.logo {
  margin-right: 24px;
}

.ant-menu-horizontal {
  flex: 1;
}
</style>
