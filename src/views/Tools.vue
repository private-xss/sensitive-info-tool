<template>
  <div class="tools-page">
    <a-row :gutter="24">
      <a-col :span="12">
        <a-card title="微信小程序/公众号利用工具" :bordered="false">
          <a-space direction="vertical" style="width: 100%;">
            <a-select
              v-model:value="selectedWeChat"
              placeholder="选择微信小程序/公众号"
              style="width: 100%;"
              :options="wechatOptions"
            />
            <a-button type="primary" block @click="testWeChatAuth" :loading="wechatLoading">
              测试认证
            </a-button>
            <a-button type="default" block @click="getWeChatToken" :loading="wechatLoading">
              获取Access Token
            </a-button>
            <a-button type="default" block @click="showUserInfoModal" :loading="wechatLoading">
              获取用户信息
            </a-button>
            <a-button type="default" block @click="qrCodeModalVisible = true" :loading="wechatLoading">
              获取小程序码
            </a-button>
            <a-button type="default" block @click="templateMessageModalVisible = true" :loading="wechatLoading">
              发送模板消息
            </a-button>
          </a-space>
        </a-card>
      </a-col>
      <a-col :span="12">
        <a-card title="企业微信利用工具" :bordered="false">
          <a-space direction="vertical" style="width: 100%;">
            <a-select
              v-model:value="selectedEnterprise"
              placeholder="选择企业微信应用"
              style="width: 100%;"
              :options="enterpriseOptions"
            />
            <a-button type="primary" block @click="testEnterpriseAuth" :loading="enterpriseLoading">
              测试认证
            </a-button>
            <a-button type="default" block @click="getEnterpriseToken" :loading="enterpriseLoading">
              获取Access Token
            </a-button>
            <a-button type="default" block @click="getEnterpriseUserList" :loading="enterpriseLoading">
              获取用户列表
            </a-button>
            <a-button type="default" block @click="getEnterpriseDepartmentList" :loading="enterpriseLoading">
              获取部门列表
            </a-button>
            <a-button type="default" block @click="enterpriseMessageModalVisible = true" :loading="enterpriseLoading">
              发送应用消息
            </a-button>
          </a-space>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="24" style="margin-top: 24px;">
      <a-col :span="12">
        <a-card title="飞书利用工具" :bordered="false">
          <a-space direction="vertical" style="width: 100%;">
            <a-select
              v-model:value="selectedFeishu"
              placeholder="选择飞书应用"
              style="width: 100%;"
              :options="feishuOptions"
            />
            <a-button type="primary" block @click="testFeishuAuth" :loading="feishuLoading">
              测试认证
            </a-button>
            <a-button type="default" block @click="getFeishuToken" :loading="feishuLoading">
              获取Access Token
            </a-button>
            <a-button type="default" block @click="getFeishuUserList" :loading="feishuLoading">
              获取用户列表
            </a-button>
            <a-button type="default" block @click="getFeishuDepartmentList" :loading="feishuLoading">
              获取部门列表
            </a-button>
            <a-button type="default" block @click="feishuMessageModalVisible = true" :loading="feishuLoading">
              发送消息
            </a-button>
          </a-space>
        </a-card>
      </a-col>
      <a-col :span="12">
        <a-card title="钉钉利用工具" :bordered="false">
          <a-space direction="vertical" style="width: 100%;">
            <a-select
              v-model:value="selectedDingTalk"
              placeholder="选择钉钉应用"
              style="width: 100%;"
              :options="dingtalkOptions"
            />
            <a-button type="primary" block @click="testDingTalkAuth" :loading="dingtalkLoading">
              测试认证
            </a-button>
            <a-button type="default" block @click="getDingTalkToken" :loading="dingtalkLoading">
              获取Access Token
            </a-button>
            <a-button type="default" block @click="getDingTalkUserList" :loading="dingtalkLoading">
              获取用户列表
            </a-button>
            <a-button type="default" block @click="getDingTalkDepartmentList" :loading="dingtalkLoading">
              获取部门列表
            </a-button>
            <a-button type="default" block @click="dingtalkMessageModalVisible = true" :loading="dingtalkLoading">
              发送工作通知
            </a-button>
          </a-space>
        </a-card>
      </a-col>
    </a-row>

    <!-- 结果显示区域 -->
    <a-card title="执行结果" style="margin-top: 24px;" :bordered="false">
      <a-textarea
        v-model:value="resultText"
        placeholder="执行结果将显示在这里..."
        :rows="10"
        readonly
        style="font-family: monospace;"
      />
      <template #extra>
        <a-space>
          <a-button @click="clearResult">清空</a-button>
          <a-button @click="copyResult">复制结果</a-button>
        </a-space>
      </template>
    </a-card>

    <!-- 用户信息模态框 -->
    <a-modal
      v-model:open="userInfoModalVisible"
      title="获取微信小程序用户信息"
      @ok="getWeChatUserInfo"
      @cancel="userInfoModalVisible = false"
    >
      <p>请输入用户授权码（code）：</p>
      <a-input
        v-model:value="userCode"
        placeholder="请输入从微信小程序获取的code"
        style="margin-top: 8px;"
      />
      <p style="margin-top: 12px; color: #666; font-size: 12px;">
        注意：code只能使用一次，且有效期5分钟
      </p>
    </a-modal>

    <!-- 小程序码生成模态框 -->
    <a-modal
      v-model:open="qrCodeModalVisible"
      title="生成小程序码"
      @ok="getWeChatQRCode"
      @cancel="qrCodeModalVisible = false"
    >
      <a-form-item label="页面路径">
        <a-input v-model:value="qrCodePath" placeholder="pages/index/index" />
      </a-form-item>
      <a-form-item label="场景值">
        <a-input v-model:value="qrCodeScene" placeholder="scene=123" />
      </a-form-item>
    </a-modal>

    <!-- 模板消息发送模态框 -->
    <a-modal
      v-model:open="templateMessageModalVisible"
      title="发送模板消息"
      @ok="sendWeChatTemplateMessage"
      @cancel="templateMessageModalVisible = false"
    >
      <a-form-item label="用户OpenID">
        <a-input v-model:value="templateOpenId" placeholder="用户OpenID" />
      </a-form-item>
      <a-form-item label="模板ID">
        <a-input v-model:value="templateId" placeholder="模板ID" />
      </a-form-item>
      <a-form-item label="消息内容">
        <a-textarea v-model:value="templateContent" placeholder='{"keyword1":{"value":"测试内容"}}' />
      </a-form-item>
    </a-modal>

    <!-- 企业微信消息发送模态框 -->
    <a-modal
      v-model:open="enterpriseMessageModalVisible"
      title="发送企业微信消息"
      @ok="sendEnterpriseMessage"
      @cancel="enterpriseMessageModalVisible = false"
    >
      <a-form-item label="接收用户">
        <a-input v-model:value="enterpriseToUser" placeholder="用户ID，多个用|分隔" />
      </a-form-item>
      <a-form-item label="应用ID">
        <a-input v-model:value="enterpriseAgentId" placeholder="应用ID" />
      </a-form-item>
      <a-form-item label="消息内容">
        <a-textarea v-model:value="enterpriseMessageContent" placeholder="消息内容" />
      </a-form-item>
    </a-modal>

    <!-- 飞书消息发送模态框 -->
    <a-modal
      v-model:open="feishuMessageModalVisible"
      title="发送飞书消息"
      @ok="sendFeishuMessage"
      @cancel="feishuMessageModalVisible = false"
    >
      <a-form-item label="接收者ID">
        <a-input v-model:value="feishuReceiveId" placeholder="用户OpenID" />
      </a-form-item>
      <a-form-item label="消息内容">
        <a-textarea v-model:value="feishuMessageContent" placeholder="消息内容" />
      </a-form-item>
    </a-modal>

    <!-- 钉钉工作通知发送模态框 -->
    <a-modal
      v-model:open="dingtalkMessageModalVisible"
      title="发送钉钉工作通知"
      @ok="sendDingTalkWorkMessage"
      @cancel="dingtalkMessageModalVisible = false"
    >
      <a-form-item label="接收用户ID">
        <a-input v-model:value="dingtalkUserIds" placeholder="用户ID，多个用逗号分隔" />
      </a-form-item>
      <a-form-item label="应用ID">
        <a-input v-model:value="dingtalkAgentId" placeholder="应用ID" />
      </a-form-item>
      <a-form-item label="消息内容">
        <a-textarea v-model:value="dingtalkMessageContent" placeholder="消息内容" />
      </a-form-item>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { message } from 'ant-design-vue'
import { SimpleStorage } from '@/utils/storage-simple'
import { WeChatAPI } from '@/utils/wechat-api'
import { EnterpriseWeChatAPI } from '@/utils/enterprise-wechat-api'
import { FeishuAPI } from '@/utils/feishu-api'
import { DingTalkAPI } from '@/utils/dingtalk-api'
import type { WeChatMiniProgram, EnterpriseWeChat, Feishu, DingTalk } from '@/types'

const wechatLoading = ref(false)
const enterpriseLoading = ref(false)
const feishuLoading = ref(false)
const dingtalkLoading = ref(false)

const selectedWeChat = ref<string>()
const selectedEnterprise = ref<string>()
const selectedFeishu = ref<string>()
const selectedDingTalk = ref<string>()

// 用户信息模态框
const userInfoModalVisible = ref(false)
const userCode = ref('')

// 小程序码模态框
const qrCodeModalVisible = ref(false)
const qrCodePath = ref('pages/index/index')
const qrCodeScene = ref('scene=123')

// 模板消息模态框
const templateMessageModalVisible = ref(false)
const templateOpenId = ref('')
const templateId = ref('')
const templateContent = ref('{"keyword1":{"value":"测试内容"}}')

// 企业微信消息模态框
const enterpriseMessageModalVisible = ref(false)
const enterpriseToUser = ref('')
const enterpriseAgentId = ref('')
const enterpriseMessageContent = ref('测试消息内容')

// 飞书消息模态框
const feishuMessageModalVisible = ref(false)
const feishuReceiveId = ref('')
const feishuMessageContent = ref('测试消息内容')

// 钉钉消息模态框
const dingtalkMessageModalVisible = ref(false)
const dingtalkUserIds = ref('')
const dingtalkAgentId = ref('')
const dingtalkMessageContent = ref('测试消息内容')

const wechatData = ref<WeChatMiniProgram[]>([])
const enterpriseData = ref<EnterpriseWeChat[]>([])
const feishuData = ref<Feishu[]>([])
const dingtalkData = ref<DingTalk[]>([])

const resultText = ref('')

const wechatOptions = computed(() => 
  wechatData.value.map(item => ({ label: item.name, value: item.id }))
)

const enterpriseOptions = computed(() => 
  enterpriseData.value.map(item => ({ label: item.name, value: item.id }))
)

const feishuOptions = computed(() => 
  feishuData.value.map(item => ({ label: item.name, value: item.id }))
)

const dingtalkOptions = computed(() => 
  dingtalkData.value.map(item => ({ label: item.name, value: item.id }))
)

const loadData = async () => {
  try {
    wechatData.value = await SimpleStorage.loadData('sensitive_wechat') || []
    enterpriseData.value = await SimpleStorage.loadData('sensitive_enterprise') || []
    feishuData.value = await SimpleStorage.loadData('sensitive_feishu') || []
    dingtalkData.value = await SimpleStorage.loadData('sensitive_dingtalk') || []
    
    console.log('Tools页面加载的数据:', {
      wechat: wechatData.value,
      enterprise: enterpriseData.value,
      feishu: feishuData.value,
      dingtalk: dingtalkData.value
    })
  } catch (error) {
    console.error('加载数据失败:', error)
    message.error('加载数据失败')
  }
}

const appendResult = (text: string) => {
  const timestamp = new Date().toLocaleString()
  resultText.value += `[${timestamp}] ${text}\n`
}

// 微信小程序工具函数
const testWeChatAuth = async () => {
  if (!selectedWeChat.value) {
    message.warning('请先选择微信小程序')
    return
  }

  wechatLoading.value = true
  try {
    const item = wechatData.value.find(i => i.id === selectedWeChat.value)
    if (!item) {
      message.error('未找到选中的微信小程序')
      return
    }

    appendResult(`开始测试微信小程序认证: ${item.name}`)
    appendResult(`App ID: ${item.appId}`)
    appendResult(`App Secret: ${item.appSecret.substring(0, 8)}...`)
    
    // 调用真实的微信API获取Access Token来测试认证
    const tokenResponse = await WeChatAPI.getAccessToken(item.appId, item.appSecret)
    
    appendResult('✅ 认证测试成功！')
    appendResult(`Access Token: ${tokenResponse.access_token.substring(0, 20)}...`)
    appendResult(`有效期: ${tokenResponse.expires_in} 秒`)
    
    message.success('认证测试成功')
  } catch (error) {
    appendResult(`❌ 认证测试失败: ${error}`)
    message.error('认证测试失败')
  } finally {
    wechatLoading.value = false
  }
}

const getWeChatToken = async () => {
  if (!selectedWeChat.value) {
    message.warning('请先选择微信小程序')
    return
  }

  wechatLoading.value = true
  try {
    const item = wechatData.value.find(i => i.id === selectedWeChat.value)
    if (!item) {
      message.error('未找到选中的微信小程序')
      return
    }

    appendResult(`获取微信小程序Access Token: ${item.name}`)
    appendResult(`请求URL: https://api.weixin.qq.com/cgi-bin/token`)
    
    // 调用真实的微信API
    const tokenResponse = await WeChatAPI.getAccessToken(item.appId, item.appSecret)
    
    appendResult('✅ Token获取成功！')
    appendResult(`Access Token: ${tokenResponse.access_token}`)
    appendResult(`有效期: ${tokenResponse.expires_in} 秒 (约 ${Math.round(tokenResponse.expires_in / 3600)} 小时)`)
    appendResult(`获取时间: ${new Date().toLocaleString()}`)
    
    // 验证Token是否有效
    appendResult('正在验证Token有效性...')
    const isValid = await WeChatAPI.validateAccessToken(tokenResponse.access_token)
    appendResult(`Token验证结果: ${isValid ? '✅ 有效' : '❌ 无效'}`)
    
    message.success('Token获取成功')
  } catch (error) {
    appendResult(`❌ Token获取失败: ${error}`)
    message.error('Token获取失败')
  } finally {
    wechatLoading.value = false
  }
}

const showUserInfoModal = () => {
  if (!selectedWeChat.value) {
    message.warning('请先选择微信小程序')
    return
  }
  userInfoModalVisible.value = true
  userCode.value = ''
}

const getWeChatUserInfo = async () => {
  if (!selectedWeChat.value) {
    message.warning('请先选择微信小程序')
    return
  }

  if (!userCode.value.trim()) {
    message.warning('请输入用户授权码')
    return
  }

  wechatLoading.value = true
  try {
    const item = wechatData.value.find(i => i.id === selectedWeChat.value)
    if (!item) {
      message.error('未找到选中的微信小程序')
      return
    }

    appendResult(`获取微信小程序用户信息: ${item.name}`)
    appendResult(`用户授权码: ${userCode.value}`)
    appendResult(`请求URL: https://api.weixin.qq.com/sns/jscode2session`)
    
    // 调用真实的微信API获取用户信息
    const userInfo = await WeChatAPI.getUserInfo(item.appId, item.appSecret, userCode.value)
    
    appendResult('✅ 用户信息获取成功！')
    appendResult(`OpenID: ${userInfo.openid}`)
    appendResult(`Session Key: ${userInfo.session_key}`)
    if (userInfo.unionid) {
      appendResult(`UnionID: ${userInfo.unionid}`)
    }
    appendResult(`获取时间: ${new Date().toLocaleString()}`)
    
    userInfoModalVisible.value = false
    userCode.value = ''
    message.success('用户信息获取成功')
  } catch (error) {
    appendResult(`❌ 用户信息获取失败: ${error}`)
    message.error('用户信息获取失败')
  } finally {
    wechatLoading.value = false
  }
}

// 企业微信工具函数
const testEnterpriseAuth = async () => {
  if (!selectedEnterprise.value) {
    message.warning('请先选择企业微信应用')
    return
  }

  enterpriseLoading.value = true
  try {
    const item = enterpriseData.value.find(i => i.id === selectedEnterprise.value)
    if (!item) {
      message.error('未找到选中的企业微信应用')
      return
    }

    appendResult(`开始测试企业微信认证: ${item.name}`)
    appendResult(`Corp ID: ${item.corpId}`)
    appendResult(`Corp Secret: ${item.corpSecret.substring(0, 8)}...`)
    
    // 调用真实的企业微信API获取Access Token来测试认证
    const tokenResponse = await EnterpriseWeChatAPI.getAccessToken(item.corpId, item.corpSecret)
    
    appendResult('✅ 企业微信认证测试成功！')
    appendResult(`Access Token: ${tokenResponse.access_token.substring(0, 20)}...`)
    appendResult(`有效期: ${tokenResponse.expires_in} 秒`)
    
    message.success('企业微信认证测试成功')
  } catch (error) {
    appendResult(`❌ 企业微信认证测试失败: ${error}`)
    message.error('企业微信认证测试失败')
  } finally {
    enterpriseLoading.value = false
  }
}

const getEnterpriseToken = async () => {
  if (!selectedEnterprise.value) {
    message.warning('请先选择企业微信应用')
    return
  }

  enterpriseLoading.value = true
  try {
    const item = enterpriseData.value.find(i => i.id === selectedEnterprise.value)
    if (!item) {
      message.error('未找到选中的企业微信应用')
      return
    }

    appendResult(`获取企业微信Access Token: ${item.name}`)
    appendResult(`请求URL: https://qyapi.weixin.qq.com/cgi-bin/gettoken`)
    
    // 调用真实的企业微信API
    const tokenResponse = await EnterpriseWeChatAPI.getAccessToken(item.corpId, item.corpSecret)
    
    appendResult('✅ 企业微信Token获取成功！')
    appendResult(`Access Token: ${tokenResponse.access_token}`)
    appendResult(`有效期: ${tokenResponse.expires_in} 秒 (约 ${Math.round(tokenResponse.expires_in / 3600)} 小时)`)
    appendResult(`获取时间: ${new Date().toLocaleString()}`)
    
    message.success('企业微信Token获取成功')
  } catch (error) {
    appendResult(`❌ 企业微信Token获取失败: ${error}`)
    message.error('企业微信Token获取失败')
  } finally {
    enterpriseLoading.value = false
  }
}

const getEnterpriseUserList = async () => {
  if (!selectedEnterprise.value) {
    message.warning('请先选择企业微信应用')
    return
  }

  enterpriseLoading.value = true
  try {
    const item = enterpriseData.value.find(i => i.id === selectedEnterprise.value)
    if (!item) {
      message.error('未找到选中的企业微信应用')
      return
    }

    appendResult(`获取企业微信用户列表: ${item.name}`)
    appendResult(`请求URL: https://qyapi.weixin.qq.com/cgi-bin/user/simplelist`)
    
    // 先获取Access Token
    const tokenResponse = await EnterpriseWeChatAPI.getAccessToken(item.corpId, item.corpSecret)
    appendResult(`Access Token获取成功: ${tokenResponse.access_token.substring(0, 20)}...`)
    
    // 获取部门列表
    appendResult('正在获取部门列表...')
    const departmentList = await EnterpriseWeChatAPI.getDepartmentList(tokenResponse.access_token)
    appendResult(`部门数量: ${departmentList.department?.length || 0}`)
    
    // 获取第一个部门的用户列表
    if (departmentList.department && departmentList.department.length > 0) {
      const firstDept = departmentList.department[0]
      appendResult(`获取部门 ${firstDept.name} (ID: ${firstDept.id}) 的用户列表...`)
      
      const userList = await EnterpriseWeChatAPI.getDepartmentUsers(tokenResponse.access_token, firstDept.id)
      appendResult(`✅ 用户列表获取成功！`)
      appendResult(`用户数量: ${userList.userlist?.length || 0}`)
      
      if (userList.userlist && userList.userlist.length > 0) {
        appendResult('用户列表:')
        userList.userlist.slice(0, 5).forEach((user, index) => {
          appendResult(`  ${index + 1}. ${user.name} (${user.userid})`)
        })
        if (userList.userlist.length > 5) {
          appendResult(`  ... 还有 ${userList.userlist.length - 5} 个用户`)
        }
      }
    }
    
    message.success('企业微信用户列表获取成功')
  } catch (error) {
    appendResult(`❌ 企业微信用户列表获取失败: ${error}`)
    message.error('企业微信用户列表获取失败')
  } finally {
    enterpriseLoading.value = false
  }
}

// 飞书工具函数
const testFeishuAuth = async () => {
  if (!selectedFeishu.value) {
    message.warning('请先选择飞书应用')
    return
  }

  feishuLoading.value = true
  try {
    const item = feishuData.value.find(i => i.id === selectedFeishu.value)
    if (!item) {
      message.error('未找到选中的飞书应用')
      return
    }

    appendResult(`开始测试飞书认证: ${item.name}`)
    appendResult(`App ID: ${item.appId}`)
    appendResult(`App Secret: ${item.appSecret.substring(0, 8)}...`)
    
    // 调用真实的飞书API获取Access Token来测试认证
    const tokenResponse = await FeishuAPI.getAccessToken(item.appId, item.appSecret)
    
    appendResult('✅ 飞书认证测试成功！')
    appendResult(`Tenant Access Token: ${tokenResponse.tenant_access_token?.substring(0, 20)}...`)
    appendResult(`有效期: ${tokenResponse.expire} 秒`)
    
    message.success('飞书认证测试成功')
  } catch (error) {
    appendResult(`❌ 飞书认证测试失败: ${error}`)
    message.error('飞书认证测试失败')
  } finally {
    feishuLoading.value = false
  }
}

const getFeishuToken = async () => {
  if (!selectedFeishu.value) {
    message.warning('请先选择飞书应用')
    return
  }

  feishuLoading.value = true
  try {
    const item = feishuData.value.find(i => i.id === selectedFeishu.value)
    if (!item) {
      message.error('未找到选中的飞书应用')
      return
    }

    appendResult(`获取飞书Access Token: ${item.name}`)
    appendResult(`请求URL: https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal`)
    
    // 调用真实的飞书API
    const tokenResponse = await FeishuAPI.getAccessToken(item.appId, item.appSecret)
    
    appendResult('✅ 飞书Token获取成功！')
    appendResult(`Tenant Access Token: ${tokenResponse.tenant_access_token}`)
    appendResult(`App Access Token: ${tokenResponse.app_access_token}`)
    appendResult(`有效期: ${tokenResponse.expire} 秒 (约 ${Math.round(tokenResponse.expire / 3600)} 小时)`)
    appendResult(`获取时间: ${new Date().toLocaleString()}`)
    
    message.success('飞书Token获取成功')
  } catch (error) {
    appendResult(`❌ 飞书Token获取失败: ${error}`)
    message.error('飞书Token获取失败')
  } finally {
    feishuLoading.value = false
  }
}

const getFeishuUserList = async () => {
  if (!selectedFeishu.value) {
    message.warning('请先选择飞书应用')
    return
  }

  feishuLoading.value = true
  try {
    const item = feishuData.value.find(i => i.id === selectedFeishu.value)
    if (!item) {
      message.error('未找到选中的飞书应用')
      return
    }

    appendResult(`获取飞书用户列表: ${item.name}`)
    appendResult(`请求URL: https://open.feishu.cn/open-apis/contact/v3/users`)
    
    // 先获取Access Token
    const tokenResponse = await FeishuAPI.getAccessToken(item.appId, item.appSecret)
    appendResult(`Access Token获取成功: ${tokenResponse.tenant_access_token?.substring(0, 20)}...`)
    
    // 获取用户列表
    appendResult('正在获取用户列表...')
    const userList = await FeishuAPI.getUserList(tokenResponse.tenant_access_token!, 20)
    
    appendResult(`✅ 飞书用户列表获取成功！`)
    appendResult(`用户数量: ${userList.data.items?.length || 0}`)
    appendResult(`是否有更多: ${userList.data.has_more ? '是' : '否'}`)
    
    if (userList.data.items && userList.data.items.length > 0) {
      appendResult('用户列表:')
      userList.data.items.slice(0, 5).forEach((user, index) => {
        appendResult(`  ${index + 1}. ${user.name} (${user.user_id})`)
        if (user.email) {
          appendResult(`      邮箱: ${user.email}`)
        }
      })
      if (userList.data.items.length > 5) {
        appendResult(`  ... 还有 ${userList.data.items.length - 5} 个用户`)
      }
    }
    
    message.success('飞书用户列表获取成功')
  } catch (error) {
    appendResult(`❌ 飞书用户列表获取失败: ${error}`)
    message.error('飞书用户列表获取失败')
  } finally {
    feishuLoading.value = false
  }
}

// 钉钉工具函数
const testDingTalkAuth = async () => {
  if (!selectedDingTalk.value) {
    message.warning('请先选择钉钉应用')
    return
  }

  dingtalkLoading.value = true
  try {
    const item = dingtalkData.value.find(i => i.id === selectedDingTalk.value)
    if (!item) {
      message.error('未找到选中的钉钉应用')
      return
    }

    appendResult(`开始测试钉钉认证: ${item.name}`)
    appendResult(`App Key: ${item.appKey}`)
    appendResult(`App Secret: ${item.appSecret.substring(0, 8)}...`)
    
    // 调用真实的钉钉API获取Access Token来测试认证
    const tokenResponse = await DingTalkAPI.getAccessToken(item.appKey, item.appSecret)
    
    appendResult('✅ 钉钉认证测试成功！')
    appendResult(`Access Token: ${tokenResponse.access_token.substring(0, 20)}...`)
    appendResult(`有效期: ${tokenResponse.expires_in} 秒`)
    
    message.success('钉钉认证测试成功')
  } catch (error) {
    appendResult(`❌ 钉钉认证测试失败: ${error}`)
    message.error('钉钉认证测试失败')
  } finally {
    dingtalkLoading.value = false
  }
}

const getDingTalkToken = async () => {
  if (!selectedDingTalk.value) {
    message.warning('请先选择钉钉应用')
    return
  }

  dingtalkLoading.value = true
  try {
    const item = dingtalkData.value.find(i => i.id === selectedDingTalk.value)
    if (!item) {
      message.error('未找到选中的钉钉应用')
      return
    }

    appendResult(`获取钉钉Access Token: ${item.name}`)
    appendResult(`请求URL: https://oapi.dingtalk.com/gettoken`)
    
    // 调用真实的钉钉API
    const tokenResponse = await DingTalkAPI.getAccessToken(item.appKey, item.appSecret)
    
    appendResult('✅ 钉钉Token获取成功！')
    appendResult(`Access Token: ${tokenResponse.access_token}`)
    appendResult(`有效期: ${tokenResponse.expires_in} 秒 (约 ${Math.round(tokenResponse.expires_in / 3600)} 小时)`)
    appendResult(`获取时间: ${new Date().toLocaleString()}`)
    
    message.success('钉钉Token获取成功')
  } catch (error) {
    appendResult(`❌ 钉钉Token获取失败: ${error}`)
    message.error('钉钉Token获取失败')
  } finally {
    dingtalkLoading.value = false
  }
}

const getDingTalkUserList = async () => {
  if (!selectedDingTalk.value) {
    message.warning('请先选择钉钉应用')
    return
  }

  dingtalkLoading.value = true
  try {
    const item = dingtalkData.value.find(i => i.id === selectedDingTalk.value)
    if (!item) {
      message.error('未找到选中的钉钉应用')
      return
    }

    appendResult(`获取钉钉用户列表: ${item.name}`)
    appendResult(`请求URL: https://oapi.dingtalk.com/user/simplelist`)
    
    // 先获取Access Token
    const tokenResponse = await DingTalkAPI.getAccessToken(item.appKey, item.appSecret)
    appendResult(`Access Token获取成功: ${tokenResponse.access_token.substring(0, 20)}...`)
    
    // 获取部门列表
    appendResult('正在获取部门列表...')
    const departmentList = await DingTalkAPI.getDepartmentList(tokenResponse.access_token)
    appendResult(`部门数量: ${departmentList.department?.length || 0}`)
    
    // 获取第一个部门的用户列表
    if (departmentList.department && departmentList.department.length > 0) {
      const firstDept = departmentList.department[0]
      appendResult(`获取部门 ${firstDept.name} (ID: ${firstDept.id}) 的用户列表...`)
      
      const userList = await DingTalkAPI.getDepartmentUsers(tokenResponse.access_token, firstDept.id)
      appendResult(`✅ 钉钉用户列表获取成功！`)
      appendResult(`用户数量: ${userList.userlist?.length || 0}`)
      appendResult(`是否有更多: ${userList.hasMore ? '是' : '否'}`)
      
      if (userList.userlist && userList.userlist.length > 0) {
        appendResult('用户列表:')
        userList.userlist.slice(0, 5).forEach((user, index) => {
          appendResult(`  ${index + 1}. ${user.name} (${user.userid})`)
          if (user.mobile) {
            appendResult(`      手机: ${user.mobile}`)
          }
        })
        if (userList.userlist.length > 5) {
          appendResult(`  ... 还有 ${userList.userlist.length - 5} 个用户`)
        }
      }
    }
    
    message.success('钉钉用户列表获取成功')
  } catch (error) {
    appendResult(`❌ 钉钉用户列表获取失败: ${error}`)
    message.error('钉钉用户列表获取失败')
  } finally {
    dingtalkLoading.value = false
  }
}

// 微信小程序新增功能
const getWeChatQRCode = async () => {
  if (!selectedWeChat.value) {
    message.warning('请先选择微信小程序')
    return
  }

  wechatLoading.value = true
  try {
    const item = wechatData.value.find(i => i.id === selectedWeChat.value)
    if (!item) {
      message.error('未找到选中的微信小程序')
      return
    }

    appendResult(`生成微信小程序码: ${item.name}`)
    appendResult(`页面路径: ${qrCodePath.value}`)
    appendResult(`场景值: ${qrCodeScene.value}`)
    
    // 先获取Access Token
    const tokenResponse = await WeChatAPI.getAccessToken(item.appId, item.appSecret)
    appendResult(`Access Token获取成功: ${tokenResponse.access_token.substring(0, 20)}...`)
    
    // 生成小程序码
    const qrCodeResponse = await WeChatAPI.getQRCode(
      tokenResponse.access_token,
      qrCodePath.value,
      qrCodeScene.value
    )
    
    appendResult('✅ 小程序码生成成功！')
    appendResult(`二维码URL: ${qrCodeResponse.url}`)
    appendResult(`生成时间: ${new Date().toLocaleString()}`)
    
    qrCodeModalVisible.value = false
    message.success('小程序码生成成功')
  } catch (error) {
    appendResult(`❌ 小程序码生成失败: ${error}`)
    message.error('小程序码生成失败')
  } finally {
    wechatLoading.value = false
  }
}

const sendWeChatTemplateMessage = async () => {
  if (!selectedWeChat.value) {
    message.warning('请先选择微信小程序')
    return
  }

  wechatLoading.value = true
  try {
    const item = wechatData.value.find(i => i.id === selectedWeChat.value)
    if (!item) {
      message.error('未找到选中的微信小程序')
      return
    }

    appendResult(`发送微信模板消息: ${item.name}`)
    appendResult(`接收用户: ${templateOpenId.value}`)
    appendResult(`模板ID: ${templateId.value}`)
    
    // 先获取Access Token
    const tokenResponse = await WeChatAPI.getAccessToken(item.appId, item.appSecret)
    appendResult(`Access Token获取成功: ${tokenResponse.access_token.substring(0, 20)}...`)
    
    // 解析消息内容
    let messageData
    try {
      messageData = JSON.parse(templateContent.value)
    } catch (error) {
      throw new Error('消息内容格式错误，请使用正确的JSON格式')
    }
    
    // 发送模板消息
    const messageResponse = await WeChatAPI.sendTemplateMessage(
      tokenResponse.access_token,
      templateOpenId.value,
      templateId.value,
      messageData
    )
    
    appendResult('✅ 模板消息发送成功！')
    appendResult(`消息ID: ${messageResponse.msgid}`)
    appendResult(`发送时间: ${new Date().toLocaleString()}`)
    
    templateMessageModalVisible.value = false
    message.success('模板消息发送成功')
  } catch (error) {
    appendResult(`❌ 模板消息发送失败: ${error}`)
    message.error('模板消息发送失败')
  } finally {
    wechatLoading.value = false
  }
}

// 企业微信新增功能
const getEnterpriseDepartmentList = async () => {
  if (!selectedEnterprise.value) {
    message.warning('请先选择企业微信应用')
    return
  }

  enterpriseLoading.value = true
  try {
    const item = enterpriseData.value.find(i => i.id === selectedEnterprise.value)
    if (!item) {
      message.error('未找到选中的企业微信应用')
      return
    }

    appendResult(`获取企业微信部门列表: ${item.name}`)
    
    // 先获取Access Token
    const tokenResponse = await EnterpriseWeChatAPI.getAccessToken(item.corpId, item.corpSecret)
    appendResult(`Access Token获取成功: ${tokenResponse.access_token.substring(0, 20)}...`)
    
    // 获取部门列表
    const departmentList = await EnterpriseWeChatAPI.getDepartmentList(tokenResponse.access_token)
    
    appendResult('✅ 企业微信部门列表获取成功！')
    appendResult(`部门数量: ${departmentList.department?.length || 0}`)
    
    if (departmentList.department && departmentList.department.length > 0) {
      appendResult('部门列表:')
      departmentList.department.forEach((dept, index) => {
        appendResult(`  ${index + 1}. ${dept.name} (ID: ${dept.id})`)
        if (dept.parentid) {
          appendResult(`      父部门ID: ${dept.parentid}`)
        }
      })
    }
    
    message.success('企业微信部门列表获取成功')
  } catch (error) {
    appendResult(`❌ 企业微信部门列表获取失败: ${error}`)
    message.error('企业微信部门列表获取失败')
  } finally {
    enterpriseLoading.value = false
  }
}

const sendEnterpriseMessage = async () => {
  if (!selectedEnterprise.value) {
    message.warning('请先选择企业微信应用')
    return
  }

  enterpriseLoading.value = true
  try {
    const item = enterpriseData.value.find(i => i.id === selectedEnterprise.value)
    if (!item) {
      message.error('未找到选中的企业微信应用')
      return
    }

    appendResult(`发送企业微信消息: ${item.name}`)
    appendResult(`接收用户: ${enterpriseToUser.value}`)
    appendResult(`应用ID: ${enterpriseAgentId.value}`)
    
    // 先获取Access Token
    const tokenResponse = await EnterpriseWeChatAPI.getAccessToken(item.corpId, item.corpSecret)
    appendResult(`Access Token获取成功: ${tokenResponse.access_token.substring(0, 20)}...`)
    
    // 发送消息
    const messageResponse = await EnterpriseWeChatAPI.sendMessage(
      tokenResponse.access_token,
      enterpriseAgentId.value,
      enterpriseToUser.value,
      'text',
      { content: enterpriseMessageContent.value }
    )
    
    appendResult('✅ 企业微信消息发送成功！')
    appendResult(`消息ID: ${messageResponse.msgid}`)
    appendResult(`发送时间: ${new Date().toLocaleString()}`)
    
    enterpriseMessageModalVisible.value = false
    message.success('企业微信消息发送成功')
  } catch (error) {
    appendResult(`❌ 企业微信消息发送失败: ${error}`)
    message.error('企业微信消息发送失败')
  } finally {
    enterpriseLoading.value = false
  }
}

// 飞书新增功能
const getFeishuDepartmentList = async () => {
  if (!selectedFeishu.value) {
    message.warning('请先选择飞书应用')
    return
  }

  feishuLoading.value = true
  try {
    const item = feishuData.value.find(i => i.id === selectedFeishu.value)
    if (!item) {
      message.error('未找到选中的飞书应用')
      return
    }

    appendResult(`获取飞书部门列表: ${item.name}`)
    appendResult(`请求URL: https://open.feishu.cn/open-apis/contact/v3/departments`)
    
    // 先获取Access Token
    const tokenResponse = await FeishuAPI.getAccessToken(item.appId, item.appSecret)
    appendResult(`Access Token获取成功: ${tokenResponse.tenant_access_token?.substring(0, 20)}...`)
    
    // 获取部门列表
    const departmentList = await FeishuAPI.getDepartmentList(tokenResponse.tenant_access_token!)
    
    appendResult('✅ 飞书部门列表获取成功！')
    appendResult(`部门数量: ${departmentList.data.items?.length || 0}`)
    appendResult(`是否有更多: ${departmentList.data.has_more ? '是' : '否'}`)
    
    if (departmentList.data.items && departmentList.data.items.length > 0) {
      appendResult('部门列表:')
      departmentList.data.items.forEach((dept, index) => {
        appendResult(`  ${index + 1}. ${dept.name} (ID: ${dept.department_id})`)
        if (dept.parent_department_id) {
          appendResult(`      父部门ID: ${dept.parent_department_id}`)
        }
      })
    }
    
    message.success('飞书部门列表获取成功')
  } catch (error) {
    appendResult(`❌ 飞书部门列表获取失败: ${error}`)
    message.error('飞书部门列表获取失败')
  } finally {
    feishuLoading.value = false
  }
}

const sendFeishuMessage = async () => {
  if (!selectedFeishu.value) {
    message.warning('请先选择飞书应用')
    return
  }

  feishuLoading.value = true
  try {
    const item = feishuData.value.find(i => i.id === selectedFeishu.value)
    if (!item) {
      message.error('未找到选中的飞书应用')
      return
    }

    appendResult(`发送飞书消息: ${item.name}`)
    appendResult(`接收者ID: ${feishuReceiveId.value}`)
    
    // 先获取Access Token
    const tokenResponse = await FeishuAPI.getAccessToken(item.appId, item.appSecret)
    appendResult(`Access Token获取成功: ${tokenResponse.tenant_access_token?.substring(0, 20)}...`)
    
    // 发送消息
    const messageResponse = await FeishuAPI.sendMessage(
      tokenResponse.tenant_access_token!,
      feishuReceiveId.value,
      'text',
      { text: feishuMessageContent.value }
    )
    
    appendResult('✅ 飞书消息发送成功！')
    appendResult(`消息ID: ${messageResponse.data?.message_id}`)
    appendResult(`发送时间: ${new Date().toLocaleString()}`)
    
    feishuMessageModalVisible.value = false
    message.success('飞书消息发送成功')
  } catch (error) {
    appendResult(`❌ 飞书消息发送失败: ${error}`)
    message.error('飞书消息发送失败')
  } finally {
    feishuLoading.value = false
  }
}

// 钉钉新增功能
const getDingTalkDepartmentList = async () => {
  if (!selectedDingTalk.value) {
    message.warning('请先选择钉钉应用')
    return
  }

  dingtalkLoading.value = true
  try {
    const item = dingtalkData.value.find(i => i.id === selectedDingTalk.value)
    if (!item) {
      message.error('未找到选中的钉钉应用')
      return
    }

    appendResult(`获取钉钉部门列表: ${item.name}`)
    
    // 先获取Access Token
    const tokenResponse = await DingTalkAPI.getAccessToken(item.appKey, item.appSecret)
    appendResult(`Access Token获取成功: ${tokenResponse.access_token.substring(0, 20)}...`)
    
    // 获取部门列表
    const departmentList = await DingTalkAPI.getDepartmentList(tokenResponse.access_token)
    
    appendResult('✅ 钉钉部门列表获取成功！')
    appendResult(`部门数量: ${departmentList.department?.length || 0}`)
    
    if (departmentList.department && departmentList.department.length > 0) {
      appendResult('部门列表:')
      departmentList.department.forEach((dept, index) => {
        appendResult(`  ${index + 1}. ${dept.name} (ID: ${dept.id})`)
        if (dept.parentid) {
          appendResult(`      父部门ID: ${dept.parentid}`)
        }
      })
    }
    
    message.success('钉钉部门列表获取成功')
  } catch (error) {
    appendResult(`❌ 钉钉部门列表获取失败: ${error}`)
    message.error('钉钉部门列表获取失败')
  } finally {
    dingtalkLoading.value = false
  }
}

const sendDingTalkWorkMessage = async () => {
  if (!selectedDingTalk.value) {
    message.warning('请先选择钉钉应用')
    return
  }

  dingtalkLoading.value = true
  try {
    const item = dingtalkData.value.find(i => i.id === selectedDingTalk.value)
    if (!item) {
      message.error('未找到选中的钉钉应用')
      return
    }

    appendResult(`发送钉钉工作通知: ${item.name}`)
    appendResult(`接收用户: ${dingtalkUserIds.value}`)
    appendResult(`应用ID: ${dingtalkAgentId.value}`)
    
    // 先获取Access Token
    const tokenResponse = await DingTalkAPI.getAccessToken(item.appKey, item.appSecret)
    appendResult(`Access Token获取成功: ${tokenResponse.access_token.substring(0, 20)}...`)
    
    // 解析用户ID列表
    const userIdList = dingtalkUserIds.value.split(',').map(id => id.trim()).filter(id => id)
    
    // 发送工作通知
    const messageResponse = await DingTalkAPI.sendWorkMessage(
      tokenResponse.access_token,
      dingtalkAgentId.value,
      userIdList,
      'text',
      { content: dingtalkMessageContent.value }
    )
    
    appendResult('✅ 钉钉工作通知发送成功！')
    appendResult(`任务ID: ${messageResponse.task_id}`)
    appendResult(`发送时间: ${new Date().toLocaleString()}`)
    
    dingtalkMessageModalVisible.value = false
    message.success('钉钉工作通知发送成功')
  } catch (error) {
    appendResult(`❌ 钉钉工作通知发送失败: ${error}`)
    message.error('钉钉工作通知发送失败')
  } finally {
    dingtalkLoading.value = false
  }
}

const clearResult = () => {
  resultText.value = ''
}

const copyResult = async () => {
  try {
    await navigator.clipboard.writeText(resultText.value)
    message.success('结果已复制到剪贴板')
  } catch (error) {
    message.error('复制失败')
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.tools-page {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
