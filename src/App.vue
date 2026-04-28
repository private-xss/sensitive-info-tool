<template>
  <a-config-provider :locale="zhCN">
    <a-layout style="min-height: 100vh">
      <a-layout-sider
        v-model:collapsed="collapsed"
        :trigger="null"
        collapsible
        theme="dark"
        :width="220"
        :collapsed-width="64"
      >
        <div class="logo">
          <h3 v-if="!collapsed" style="color: white; margin: 0; white-space: nowrap;">敏感信息工具</h3>
          <span v-else style="color: white; font-size: 18px; font-weight: bold;">S</span>
        </div>
        <a-menu
          v-model:selectedKeys="selectedKeys"
          v-model:openKeys="openKeys"
          theme="dark"
          mode="inline"
        >
          <a-menu-item key="dashboard">
            <DashboardOutlined />
            <router-link to="/">仪表盘</router-link>
          </a-menu-item>

          <a-sub-menu key="platform-group">
            <template #title><span><TeamOutlined /><span>平台认证</span></span></template>
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
          </a-sub-menu>

          <a-sub-menu key="cloud-group">
            <template #title><span><CloudOutlined /><span>云服务</span></span></template>
            <a-menu-item key="cloud-oss">
              <router-link to="/cloud-oss">对象存储 OSS</router-link>
            </a-menu-item>
            <a-menu-item key="cloud-services">
              <router-link to="/cloud-services">云服务利用</router-link>
            </a-menu-item>
          </a-sub-menu>

          <a-menu-item key="tools">
            <ToolOutlined />
            <router-link to="/tools">利用工具</router-link>
          </a-menu-item>

          <a-menu-item key="decompiler">
            <CodeOutlined />
            <router-link to="/decompiler">小程序反编译</router-link>
          </a-menu-item>

          <a-menu-item key="jwt">
            <KeyOutlined />
            <router-link to="/jwt">JWT 工具</router-link>
          </a-menu-item>
        </a-menu>
      </a-layout-sider>

      <a-layout>
        <a-layout-header class="header-bar">
          <a-button type="text" @click="collapsed = !collapsed" style="color: #333">
            <MenuUnfoldOutlined v-if="collapsed" />
            <MenuFoldOutlined v-else />
          </a-button>
          <span class="page-title">{{ pageTitle }}</span>
        </a-layout-header>
        <a-layout-content style="padding: 24px; background: #f0f2f5; min-height: calc(100vh - 64px - 48px);">
          <router-view />
        </a-layout-content>
        <a-layout-footer class="app-footer">
          By Private null
        </a-layout-footer>
      </a-layout>
    </a-layout>
  </a-config-provider>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import {
  DashboardOutlined,
  TeamOutlined,
  CloudOutlined,
  ToolOutlined,
  CodeOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  KeyOutlined
} from '@ant-design/icons-vue'

const route = useRoute()
const collapsed = ref(false)
const selectedKeys = ref<string[]>([])
const openKeys = ref<string[]>(['platform-group', 'cloud-group'])

const pathMap: Record<string, string> = {
  '/': 'dashboard',
  '/wechat': 'wechat',
  '/enterprise': 'enterprise',
  '/feishu': 'feishu',
  '/dingtalk': 'dingtalk',
  '/tools': 'tools',
  '/cloud-oss': 'cloud-oss',
  '/cloud-services': 'cloud-services',
  '/decompiler': 'decompiler',
  '/jwt': 'jwt'
}

const titleMap: Record<string, string> = {
  '/': '仪表盘',
  '/wechat': '微信小程序',
  '/enterprise': '企业微信',
  '/feishu': '飞书',
  '/dingtalk': '钉钉',
  '/tools': '利用工具',
  '/cloud-oss': '对象存储 OSS',
  '/cloud-services': '云服务利用',
  '/decompiler': '小程序反编译',
  '/jwt': 'JWT 工具'
}

const pageTitle = computed(() => titleMap[route.path] || '敏感信息工具')

// 根据当前路由确定所属的子菜单，自动展开
const subMenuMap: Record<string, string> = {
  'wechat': 'platform-group',
  'enterprise': 'platform-group',
  'feishu': 'platform-group',
  'dingtalk': 'platform-group',
  'cloud-oss': 'cloud-group',
  'cloud-services': 'cloud-group',
}

watch(
  () => route.path,
  (newPath) => {
    const key = pathMap[newPath] || 'dashboard'
    selectedKeys.value = [key]
    // 自动展开对应的子菜单
    const sub = subMenuMap[key]
    if (sub && !openKeys.value.includes(sub)) {
      openKeys.value = [...openKeys.value, sub]
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-bar {
  background: #fff;
  padding: 0 16px;
  display: flex;
  align-items: center;
  height: 64px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}

.page-title {
  margin-left: 12px;
  font-size: 18px;
  font-weight: 500;
  color: #333;
}

.app-footer {
  text-align: center;
  padding: 12px;
  background: #f0f2f5;
}
</style>
