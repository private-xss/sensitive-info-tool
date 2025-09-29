import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('../views/Dashboard.vue')
  },
  {
    path: '/cloud-oss',
    name: 'cloud-oss',
    component: () => import('../views/CloudOSS.vue')
  },
  {
    path: '/platform-manager',
    name: 'platform-manager',
    component: () => import('../views/PlatformManager.vue')
  },
  {
    path: '/dingtalk',
    name: 'dingtalk',
    component: () => import('../views/DingTalk.vue')
  },
  {
    path: '/enterprise',
    name: 'enterprise',
    component: () => import('../views/Enterprise.vue')
  },
  {
    path: '/wechat',
    name: 'wechat',
    component: () => import('../views/WeChat.vue')
  },
  {
    path: '/feishu',
    name: 'feishu',
    component: () => import('../views/Feishu.vue')
  },
  {
    path: '/tools',
    name: 'tools',
    component: () => import('../views/Tools.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
