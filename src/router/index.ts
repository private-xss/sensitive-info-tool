import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue')
  },
  {
    path: '/wechat',
    name: 'WeChat',
    component: () => import('@/views/WeChat.vue')
  },
  {
    path: '/enterprise',
    name: 'Enterprise',
    component: () => import('@/views/Enterprise.vue')
  },
  {
    path: '/feishu',
    name: 'Feishu',
    component: () => import('@/views/Feishu.vue')
  },
  {
    path: '/dingtalk',
    name: 'DingTalk',
    component: () => import('@/views/DingTalk.vue')
  },
  {
    path: '/tools',
    name: 'Tools',
    component: () => import('@/views/Tools.vue')
  }
]

export default routes
