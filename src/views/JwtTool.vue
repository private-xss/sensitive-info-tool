<template>
  <div class="jwt-tool-page">
    <a-tabs v-model:activeKey="activeTab" type="card">
      <!-- 解码 -->
      <a-tab-pane key="decode" tab="JWT 解码">
        <a-card :bordered="false">
          <a-form layout="vertical">
            <a-form-item label="JWT Token">
              <a-textarea
                v-model:value="decodeInput"
                placeholder="请输入 JWT Token (eyJhbGciOi...)"
                :rows="4"
                style="font-family: monospace; font-size: 13px;"
              />
            </a-form-item>
            <a-space>
              <a-button type="primary" @click="handleDecode" :loading="decodeLoading">解码</a-button>
              <a-button @click="decodeInput = ''; decodeResult = null">清空</a-button>
              <a-button @click="pasteFromClipboard('decode')">粘贴</a-button>
            </a-space>
          </a-form>

          <div v-if="decodeResult" style="margin-top: 16px;">
            <a-alert
              v-if="!decodeResult.isValidFormat"
              :message="decodeResult.errors.join('; ')"
              type="error"
              show-icon
              style="margin-bottom: 12px;"
            />
            <a-alert
              v-else
              message="JWT 格式有效"
              type="success"
              show-icon
              style="margin-bottom: 12px;"
            />

            <a-row :gutter="16">
              <a-col :span="12">
                <a-card title="Header" size="small" :bordered="true">
                  <pre class="json-display">{{ formatJson(decodeResult.header) }}</pre>
                </a-card>
              </a-col>
              <a-col :span="12">
                <a-card title="Payload" size="small" :bordered="true">
                  <pre class="json-display">{{ formatJson(decodeResult.payload) }}</pre>
                  <div style="margin-top: 8px;">
                    <a-tag v-if="decodeResult.payload.exp" :color="isExpired(decodeResult.payload.exp) ? 'red' : 'green'">
                      {{ isExpired(decodeResult.payload.exp) ? '已过期' : '未过期' }}
                    </a-tag>
                    <span v-if="decodeResult.payload.exp" style="font-size: 12px; color: #666;">
                      过期时间: {{ formatTime(decodeResult.payload.exp) }}
                    </span>
                  </div>
                </a-card>
              </a-col>
            </a-row>

            <a-card title="Signature" size="small" :bordered="true" style="margin-top: 12px;">
              <code style="word-break: break-all; font-size: 12px;">{{ decodeResult.signature }}</code>
            </a-card>
          </div>
        </a-card>
      </a-tab-pane>

      <!-- 编码 -->
      <a-tab-pane key="encode" tab="JWT 编码">
        <a-card :bordered="false">
          <a-form layout="vertical">
            <a-form-item label="算法">
              <a-select v-model:value="encodeForm.algorithm" style="width: 200px;">
                <a-select-option v-for="alg in allAlgorithms" :key="alg" :value="alg">{{ alg }}</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="密钥/私钥 (PEM)">
              <a-textarea
                v-model:value="encodeForm.secret"
                :placeholder="encodeForm.algorithm.startsWith('HS') ? '请输入对称密钥' : '请输入 PEM 格式私钥'"
                :rows="3"
                style="font-family: monospace; font-size: 13px;"
              />
              <a-button
                v-if="encodeForm.algorithm.startsWith('HS')"
                size="small"
                type="link"
                @click="encodeForm.secret = JwtAPI.generateSecret()"
              >
                生成随机密钥
              </a-button>
            </a-form-item>
            <a-form-item label="Payload (JSON)">
              <a-textarea
                v-model:value="encodeForm.payloadStr"
                placeholder='{"sub": "1234567890", "name": "John Doe"}'
                :rows="4"
                style="font-family: monospace; font-size: 13px;"
              />
            </a-form-item>
            <a-form-item label="过期时间(秒)">
              <a-input-number v-model:value="encodeForm.expiresIn" :min="0" placeholder="0 = 不过期" style="width: 200px;" />
            </a-form-item>
            <a-space>
              <a-button type="primary" @click="handleEncode" :loading="encodeLoading">编码</a-button>
              <a-button @click="resetEncodeForm">重置</a-button>
            </a-space>
          </a-form>

          <div v-if="encodeResult" style="margin-top: 16px;">
            <a-alert message="JWT 编码成功" type="success" show-icon style="margin-bottom: 12px;" />
            <a-card title="生成的 JWT Token" size="small" :bordered="true">
              <code style="word-break: break-all; font-size: 12px;">{{ encodeResult }}</code>
              <template #extra>
                <a-button size="small" @click="copyToClipboard(encodeResult)">复制</a-button>
              </template>
            </a-card>
          </div>
        </a-card>
      </a-tab-pane>

      <!-- 校验 -->
      <a-tab-pane key="verify" tab="JWT 校验">
        <a-card :bordered="false">
          <a-form layout="vertical">
            <a-form-item label="JWT Token">
              <a-textarea
                v-model:value="verifyInput"
                placeholder="请输入 JWT Token"
                :rows="4"
                style="font-family: monospace; font-size: 13px;"
              />
            </a-form-item>
            <a-form-item label="算法">
              <a-select v-model:value="verifyAlgorithm" style="width: 200px;" allowClear placeholder="自动检测">
                <a-select-option v-for="alg in allAlgorithms" :key="alg" :value="alg">{{ alg }}</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="密钥/公钥">
              <a-textarea
                v-model:value="verifySecret"
                placeholder="请输入密钥(HMAC)或 PEM 格式公钥(RSA/ECDSA)"
                :rows="3"
                style="font-family: monospace; font-size: 13px;"
              />
            </a-form-item>
            <a-space>
              <a-button type="primary" @click="handleVerify" :loading="verifyLoading">校验</a-button>
              <a-button @click="verifyInput = ''; verifySecret = ''; verifyResult = null">清空</a-button>
              <a-button @click="pasteFromClipboard('verify')">粘贴 Token</a-button>
            </a-space>
          </a-form>

          <div v-if="verifyResult" style="margin-top: 16px;">
            <a-alert
              :message="verifyResult.valid ? 'JWT 验证通过' : 'JWT 验证失败'"
              :type="verifyResult.valid ? 'success' : 'error'"
              show-icon
              :description="verifyResult.error || ''"
            />
            <a-descriptions v-if="verifyResult.valid" bordered size="small" :column="1" style="margin-top: 12px;">
              <a-descriptions-item label="算法">{{ verifyResult.algorithm }}</a-descriptions-item>
              <a-descriptions-item label="是否过期">
                <a-tag :color="verifyResult.expired ? 'red' : 'green'">{{ verifyResult.expired ? '已过期' : '未过期' }}</a-tag>
              </a-descriptions-item>
              <a-descriptions-item v-if="verifyResult.expiresAt" label="过期时间">{{ verifyResult.expiresAt }}</a-descriptions-item>
              <a-descriptions-item v-if="verifyResult.issuedAt" label="签发时间">{{ verifyResult.issuedAt }}</a-descriptions-item>
              <a-descriptions-item v-if="verifyResult.notBefore" label="生效时间">{{ verifyResult.notBefore }}</a-descriptions-item>
            </a-descriptions>
          </div>
        </a-card>
      </a-tab-pane>

      <!-- 密钥爆破 -->
      <a-tab-pane key="crack" tab="密钥爆破">
        <a-card :bordered="false">
          <a-form layout="vertical">
            <a-form-item label="JWT Token">
              <a-textarea
                v-model:value="crackInput"
                placeholder="请输入需要爆破的 JWT Token (仅支持 HMAC 算法: HS256/HS384/HS512)"
                :rows="4"
                style="font-family: monospace; font-size: 13px;"
              />
            </a-form-item>
            <a-form-item label="爆破算法">
              <a-checkbox-group v-model:value="crackAlgorithms">
                <a-checkbox v-for="alg in hmacAlgorithms" :key="alg" :value="alg">{{ alg }}</a-checkbox>
              </a-checkbox-group>
            </a-form-item>
            <a-form-item>
              <a-space>
                <a-button type="primary" @click="handleCrack" :loading="crackLoading" :disabled="crackLoading">
                  {{ crackLoading ? '爆破中...' : '开始爆破' }}
                </a-button>
                <a-button @click="stopCrack" :disabled="!crackLoading">停止</a-button>
                <a-button @click="crackInput = ''; crackResult = null; crackProgress = null">清空</a-button>
                <a-button @click="pasteFromClipboard('crack')">粘贴</a-button>
                <a-button @click="initWordlist" :loading="initWordlistLoading">初始化密码本</a-button>
              </a-space>
            </a-form-item>
            <a-form-item label="密码本状态">
              <a-space>
                <a-tag :color="wordlistReady ? 'green' : 'orange'">
                  {{ wordlistReady ? '已就绪' : '未初始化' }}
                </a-tag>
                <span v-if="wordlistCount > 0" style="font-size: 12px; color: #666;">
                  密码本: {{ wordlistCount.toLocaleString() }} 条
                </span>
              </a-space>
            </a-form-item>
          </a-form>

          <!-- 爆破进度 -->
          <div v-if="crackProgress" style="margin-top: 16px;">
            <a-progress :percent="crackProgress.progress" :status="crackLoading ? 'active' : 'normal'" />
            <a-descriptions bordered size="small" :column="2" style="margin-top: 8px;">
              <a-descriptions-item label="已尝试">{{ crackProgress.triedCount.toLocaleString() }}</a-descriptions-item>
              <a-descriptions-item label="总数">{{ crackProgress.totalCount.toLocaleString() }}</a-descriptions-item>
              <a-descriptions-item label="耗时">{{ (crackProgress.elapsedTime / 1000).toFixed(1) }}s</a-descriptions-item>
              <a-descriptions-item label="速度">{{ crackProgress.elapsedTime > 0 ? Math.round(crackProgress.triedCount / (crackProgress.elapsedTime / 1000)).toLocaleString() + '/s' : '-' }}</a-descriptions-item>
            </a-descriptions>
          </div>

          <!-- 爆破结果 -->
          <div v-if="crackResult" style="margin-top: 16px;">
            <a-alert
              v-if="crackResult.found"
              message="密钥爆破成功!"
              type="success"
              show-icon
            />
            <a-alert
              v-else
              message="未找到匹配的密钥"
              type="warning"
              show-icon
            />
            <a-descriptions v-if="crackResult.found" bordered size="small" :column="1" style="margin-top: 12px;">
              <a-descriptions-item label="算法">{{ crackResult.algorithm }}</a-descriptions-item>
              <a-descriptions-item label="密钥">
                <code style="font-size: 13px;">{{ crackResult.secret }}</code>
                <a-button size="small" type="link" @click="copyToClipboard(crackResult.secret!)">复制</a-button>
              </a-descriptions-item>
              <a-descriptions-item label="尝试次数">{{ crackResult.triedCount.toLocaleString() }}</a-descriptions-item>
              <a-descriptions-item label="耗时">{{ (crackResult.elapsedTime / 1000).toFixed(2) }}s</a-descriptions-item>
            </a-descriptions>
          </div>
        </a-card>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  JwtAPI,
  JWT_ALGORITHMS,
  HMAC_ALGORITHMS,
  type JwtDecodeResult,
  type JwtVerifyResult,
  type JwtCrackResult
} from '@/utils/jwt-api'

const activeTab = ref('decode')

// 所有算法
const allAlgorithms = JWT_ALGORITHMS
const hmacAlgorithms = HMAC_ALGORITHMS

// ===== 解码 =====
const decodeInput = ref('')
const decodeLoading = ref(false)
const decodeResult = ref<JwtDecodeResult | null>(null)

const handleDecode = () => {
  if (!decodeInput.value.trim()) {
    message.warning('请输入 JWT Token')
    return
  }
  decodeLoading.value = true
  try {
    decodeResult.value = JwtAPI.decode(decodeInput.value.trim())
  } catch (e) {
    message.error(`解码失败: ${e}`)
  } finally {
    decodeLoading.value = false
  }
}

// ===== 编码 =====
const encodeLoading = ref(false)
const encodeResult = ref('')
const encodeForm = ref({
  algorithm: 'HS256',
  secret: '',
  payloadStr: '{"sub": "1234567890", "name": "John Doe", "admin": true}',
  expiresIn: 3600
})

const handleEncode = async () => {
  encodeLoading.value = true
  try {
    let payload: Record<string, any>
    try {
      payload = JSON.parse(encodeForm.value.payloadStr)
    } catch {
      message.error('Payload JSON 格式错误')
      return
    }

    if (!encodeForm.value.secret && encodeForm.value.algorithm !== 'none') {
      message.warning('请输入密钥')
      return
    }

    encodeResult.value = await JwtAPI.encode({
      algorithm: encodeForm.value.algorithm,
      secret: encodeForm.value.secret,
      payload,
      expiresIn: encodeForm.value.expiresIn || undefined
    })
    message.success('JWT 编码成功')
  } catch (e) {
    message.error(`编码失败: ${e}`)
  } finally {
    encodeLoading.value = false
  }
}

const resetEncodeForm = () => {
  encodeForm.value = {
    algorithm: 'HS256',
    secret: '',
    payloadStr: '{"sub": "1234567890", "name": "John Doe", "admin": true}',
    expiresIn: 3600
  }
  encodeResult.value = ''
}

// ===== 校验 =====
const verifyInput = ref('')
const verifySecret = ref('')
const verifyAlgorithm = ref<string | undefined>(undefined)
const verifyLoading = ref(false)
const verifyResult = ref<JwtVerifyResult | null>(null)

const handleVerify = async () => {
  if (!verifyInput.value.trim()) {
    message.warning('请输入 JWT Token')
    return
  }
  if (!verifySecret.value && verifyAlgorithm.value !== 'none') {
    message.warning('请输入密钥或公钥')
    return
  }
  verifyLoading.value = true
  try {
    verifyResult.value = await JwtAPI.verify(
      verifyInput.value.trim(),
      verifySecret.value,
      verifyAlgorithm.value
    )
  } catch (e) {
    verifyResult.value = { valid: false, error: `${e}` }
  } finally {
    verifyLoading.value = false
  }
}

// ===== 密钥爆破 =====
const crackInput = ref('')
const crackAlgorithms = ref<string[]>(['HS256'])
const crackLoading = ref(false)
const crackResult = ref<JwtCrackResult | null>(null)
const crackProgress = ref<JwtCrackResult | null>(null)
const crackAbort = ref(false)
const wordlistReady = ref(false)
const wordlistCount = ref(0)
const initWordlistLoading = ref(false)

const handleCrack = async () => {
  if (!crackInput.value.trim()) {
    message.warning('请输入 JWT Token')
    return
  }
  if (crackAlgorithms.value.length === 0) {
    message.warning('请至少选择一种算法')
    return
  }

  crackLoading.value = true
  crackResult.value = null
  crackProgress.value = null
  crackAbort.value = false

  try {
    const result = await JwtAPI.crack(
      crackInput.value.trim(),
      crackAlgorithms.value,
      (progress) => {
        crackProgress.value = { ...progress }
        if (crackAbort.value) {
          throw new Error('用户停止爆破')
        }
      }
    )
    crackResult.value = result
    crackProgress.value = result
    if (result.found) {
      message.success(`爆破成功! 密钥: ${result.secret}`)
    } else {
      message.info('未找到匹配的密钥')
    }
  } catch (e: any) {
    if (e.message === '用户停止爆破') {
      message.info('爆破已停止')
    } else {
      message.error(`爆破失败: ${e}`)
    }
  } finally {
    crackLoading.value = false
  }
}

const stopCrack = () => {
  crackAbort.value = true
}

const initWordlist = async () => {
  initWordlistLoading.value = true
  try {
    await JwtAPI.initWordlist()
    await checkWordlist()
    message.success('密码本初始化成功')
  } catch (e) {
    message.error(`初始化失败: ${e}`)
  } finally {
    initWordlistLoading.value = false
  }
}

const checkWordlist = async () => {
  wordlistReady.value = await JwtAPI.isWordlistInitialized()
  if (wordlistReady.value) {
    wordlistCount.value = await JwtAPI.getWordlistCount()
  }
}

// ===== 工具方法 =====
const formatJson = (obj: any): string => {
  try {
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(obj)
  }
}

const isExpired = (exp: number): boolean => {
  return Math.floor(Date.now() / 1000) > exp
}

const formatTime = (timestamp: number): string => {
  return JwtAPI.formatTimestamp(timestamp)
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    message.success('已复制到剪贴板')
  } catch {
    message.error('复制失败')
  }
}

const pasteFromClipboard = async (target: string) => {
  try {
    const text = await navigator.clipboard.readText()
    if (target === 'decode') decodeInput.value = text
    else if (target === 'verify') verifyInput.value = text
    else if (target === 'crack') crackInput.value = text
  } catch {
    message.error('粘贴失败，请手动粘贴')
  }
}

onMounted(async () => {
  await checkWordlist()
  // 自动初始化密码本
  if (!wordlistReady.value) {
    await JwtAPI.initWordlist()
    await checkWordlist()
  }
})
</script>

<style scoped>
.jwt-tool-page {
  max-width: 1200px;
  margin: 0 auto;
}

.json-display {
  font-family: 'SF Mono', Monaco, Menlo, Consolas, monospace;
  font-size: 12px;
  background: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
