<template>
  <div class="decompiler-container">
    <a-card title="小程序反编译 & 敏感信息提取" :bordered="false" style="margin-bottom: 16px">
      <template #extra>
        <a-tag color="blue">微信 4.1.8.x 支持</a-tag>
      </template>

      <a-row :gutter="16" style="margin-bottom: 16px">
        <a-col :span="24">
          <a-space direction="vertical" style="width: 100%" :size="8">
            <a-input-group compact>
              <a-input
                v-model:value="scanDir"
                placeholder="微信小程序包路径 (自动检测或手动选择)"
                style="width: calc(100% - 220px)"
                @pressEnter="scanFiles"
              />
              <a-tooltip :title="scanDir || '请选择路径'">
                <a-button @click="copyPath(scanDir)" style="width: 40px">
                  <CopyOutlined />
                </a-button>
              </a-tooltip>
              <a-button type="primary" @click="selectDir" style="width: 80px">选择目录</a-button>
              <a-button @click="autoDetectPath" style="width: 60px">自动</a-button>
            </a-input-group>
            <a-select
              v-if="userPaths.length > 0"
              v-model:value="selectedUserPath"
              style="width: 100%"
              @change="onUserPathChange"
              placeholder="选择微信用户路径"
            >
              <a-select-option v-for="(p, i) in userPaths" :key="i" :value="i">
                <a-tooltip :title="p" placement="topLeft">
                  <span>用户{{ i + 1 }}: {{ shortenPath(p) }}</span>
                </a-tooltip>
              </a-select-option>
            </a-select>
            <a-space>
              <a-button type="primary" @click="scanFiles" :loading="scanning">扫描文件</a-button>
              <a-button type="primary" danger @click="batchDecompile" :loading="decompiling" :disabled="wxapkgFiles.length === 0">
                批量反编译
              </a-button>
            </a-space>
          </a-space>
        </a-col>
      </a-row>

      <!-- 输出目录 -->
      <a-row :gutter="16" style="margin-bottom: 16px">
        <a-col :span="24">
          <a-input-group compact>
            <a-input v-model:value="outputBase" placeholder="解包输出目录" style="width: calc(100% - 140px)" />
            <a-tooltip :title="outputBase || '请选择输出目录'">
              <a-button @click="copyPath(outputBase)" style="width: 40px">
                <CopyOutlined />
              </a-button>
            </a-tooltip>
            <a-button @click="selectOutputDir" style="width: 80px">选择目录</a-button>
          </a-input-group>
        </a-col>
      </a-row>
    </a-card>

    <!-- 扫描到的文件列表 -->
    <a-card title="扫描结果" :bordered="false" style="margin-bottom: 16px" v-if="wxapkgFiles.length > 0">
      <template #extra>
        <a-tag color="green">{{ wxapkgFiles.length }} 个 wxapkg 文件</a-tag>
      </template>
      <a-table :columns="fileColumns" :data-source="wxapkgFiles" :pagination="false" size="small" :row-key="(r: any) => r.path">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'action'">
            <a-button type="link" size="small" @click="decompileSingle(record.path)">反编译</a-button>
          </template>
          <template v-else-if="column.key === 'appId'">
            <a-tag color="blue">{{ record.appId }}</a-tag>
          </template>
          <template v-else-if="column.key === 'packageType'">
            <a-tag :color="record.packageType === '主包' ? 'green' : 'orange'">{{ record.packageType }}</a-tag>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 反编译结果 -->
    <a-card
      v-for="result in decompileResults"
      :key="result.info.filePath"
      :title="result.info.appName ? `${result.info.appName} (${result.info.appId})` : result.info.appId"
      :bordered="false"
      style="margin-bottom: 16px"
    >
      <template #extra>
        <a-space>
          <a-tag color="green">{{ result.info.fileCount }} 个文件</a-tag>
          <a-tag color="blue">{{ result.apiEndpoints.length }} 个 API</a-tag>
          <a-tag color="red">{{ result.sensitiveMatches.length }} 个敏感信息</a-tag>
        </a-space>
      </template>

      <!-- 小程序信息 -->
      <a-descriptions size="small" :column="3" bordered style="margin-bottom: 16px">
        <a-descriptions-item label="AppID">
          <a-typography-text copyable>{{ result.info.appId }}</a-typography-text>
        </a-descriptions-item>
        <a-descriptions-item label="小程序名称">{{ result.info.appName || '未知' }}</a-descriptions-item>
        <a-descriptions-item label="包类型">{{ result.info.packageType }}</a-descriptions-item>
        <a-descriptions-item label="文件大小">{{ formatSize(result.info.fileSize) }}</a-descriptions-item>
        <a-descriptions-item label="加密">{{ result.info.encrypted ? '是 (V1MMWX)' : '否' }}</a-descriptions-item>
        <a-descriptions-item label="文件数量">{{ result.info.fileCount }}</a-descriptions-item>
        <a-descriptions-item label="输出目录" :span="3">
          <a-typography-text copyable style="font-size: 12px">{{ result.outputDir }}</a-typography-text>
        </a-descriptions-item>
      </a-descriptions>

      <!-- API 接口 - 按类型分标签页 -->
      <a-card title="API 接口" size="small" style="margin-bottom: 16px">
        <template #extra>
          <a-space>
            <a-button size="small" type="primary" @click="copyAllApis(result)">
              <CopyOutlined /> 复制全部
            </a-button>
            <a-tag color="blue">{{ result.apiEndpoints.length }}</a-tag>
          </a-space>
        </template>
        <a-tabs v-if="result.apiEndpoints.length > 0" type="card" size="small">
          <a-tab-pane v-for="group in groupApis(result.apiEndpoints)" :key="group.key" :tab="`${group.label} (${group.items.length})`">
            <template #extra>
              <a-button size="small" @click="copyApiGroup(group.items)">复制数据</a-button>
            </template>
            <div class="result-list">
              <div v-for="(item, i) in group.items" :key="i" class="result-item">
                <span class="result-index">{{ i + 1 }}.</span>
                <span class="result-file">{{ item.filePath }}:{{ item.lineNumber }}</span>
                <span class="result-value">{{ item.url }}</span>
              </div>
            </div>
          </a-tab-pane>
        </a-tabs>
        <a-empty v-else description="无 API 接口" :image="null" />
      </a-card>

      <!-- 敏感信息 - 按类型分标签页 -->
      <a-card title="敏感信息" size="small">
        <template #extra>
          <a-space>
            <a-button size="small" type="primary" danger @click="copyAllSensitive(result)">
              <CopyOutlined /> 复制全部
            </a-button>
            <a-tag color="red">{{ result.sensitiveMatches.length }}</a-tag>
          </a-space>
        </template>
        <a-tabs v-if="result.sensitiveMatches.length > 0" type="card" size="small">
          <a-tab-pane v-for="group in groupSensitive(result.sensitiveMatches)" :key="group.key" :tab="`${group.label} (${group.items.length})`">
            <div class="result-list-header">
              <a-button size="small" type="primary" @click="copySensitiveGroup(group.items)">
                <CopyOutlined /> 复制数据
              </a-button>
            </div>
            <div class="result-list">
              <div v-for="(item, i) in group.items" :key="i" class="result-item">
                <span class="result-index">{{ i + 1 }}.</span>
                <span class="result-file">{{ item.filePath }}:{{ item.lineNumber }}</span>
                <span class="result-value">{{ item.content }}</span>
              </div>
            </div>
          </a-tab-pane>
        </a-tabs>
        <a-empty v-else description="无敏感信息" :image="null" />
      </a-card>
    </a-card>

    <!-- 错误信息 -->
    <a-card v-if="errors.length > 0" title="错误信息" :bordered="false">
      <a-alert v-for="(err, i) in errors" :key="i" :message="err" type="error" show-icon style="margin-bottom: 8px" />
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { invoke } from '@tauri-apps/api/tauri'
import { open } from '@tauri-apps/api/dialog'
import { message } from 'ant-design-vue'
import { CopyOutlined } from '@ant-design/icons-vue'

// 状态
const scanDir = ref('')
const outputBase = ref('')
const scanning = ref(false)
const decompiling = ref(false)
const wxapkgFiles = ref<any[]>([])
const decompileResults = ref<any[]>([])
const errors = ref<string[]>([])
const userPaths = ref<string[]>([])
const selectedUserPath = ref(0)

// 页面加载时自动检测路径
onMounted(async () => {
  try {
    const paths = await invoke<string[]>('wxapkg_list_user_paths')
    userPaths.value = paths
    if (paths.length > 0) {
      scanDir.value = paths[0]
      selectedUserPath.value = 0
    }
  } catch {
    try {
      const path = await invoke<string>('wxapkg_get_default_path')
      if (path) scanDir.value = path
    } catch {}
  }
  if (!outputBase.value) {
    try {
      const home = await invoke<string>('get_home_dir')
      outputBase.value = home + '/.sensitive-info-tool/wxapkg-output'
    } catch {}
  }
})

function onUserPathChange(idx: number) {
  if (userPaths.value[idx]) scanDir.value = userPaths.value[idx]
}

// 表格列定义
const fileColumns = [
  { title: 'AppID', key: 'appId', dataIndex: 'appId', width: 180 },
  { title: '小程序名称', key: 'appName', dataIndex: 'appName', width: 150 },
  { title: '包类型', key: 'packageType', dataIndex: 'packageType', width: 80 },
  { title: '文件路径', key: 'path', dataIndex: 'path', ellipsis: true },
  { title: '操作', key: 'action', width: 100 },
]

// API 接口按域名分组
interface GroupedResult {
  key: string
  label: string
  items: any[]
}

function groupApis(apis: any[]): GroupedResult[] {
  const groups: Record<string, any[]> = {}
  for (const api of apis) {
    let domain = '其他'
    try {
      const url = new URL(api.url)
      domain = url.hostname
    } catch {
      // 非 URL 格式，按路径前缀分组
      domain = api.url.startsWith('/') ? 'Path' : '其他'
    }
    if (!groups[domain]) groups[domain] = []
    groups[domain].push(api)
  }
  return Object.entries(groups)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([key, items]) => ({ key, label: key, items }))
}

// 敏感信息按类型分组
function groupSensitive(matches: any[]): GroupedResult[] {
  const groups: Record<string, any[]> = {}
  for (const m of matches) {
    const type = m.matchType || '其他'
    if (!groups[type]) groups[type] = []
    groups[type].push(m)
  }
  return Object.entries(groups)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([key, items]) => ({ key, label: key, items }))
}

// 复制功能
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    message.success('已复制到剪贴板')
  } catch {
    message.error('复制失败')
  }
}

function copyApiGroup(items: any[]) {
  const text = items.map((item, i) => `${i + 1}. ${item.filePath}:${item.lineNumber}  ${item.url}`).join('\n')
  copyToClipboard(text)
}

function copyAllApis(result: any) {
  const text = result.apiEndpoints.map((item: any, i: number) => `${i + 1}. ${item.filePath}:${item.lineNumber}  ${item.url}`).join('\n')
  copyToClipboard(text)
}

function copySensitiveGroup(items: any[]) {
  const text = items.map((item, i) => `${i + 1}. [${item.matchType}] ${item.filePath}:${item.lineNumber}  ${item.content}`).join('\n')
  copyToClipboard(text)
}

function copyAllSensitive(result: any) {
  const text = result.sensitiveMatches.map((item: any, i: number) => `${i + 1}. [${item.matchType}] ${item.filePath}:${item.lineNumber}  ${item.content}`).join('\n')
  copyToClipboard(text)
}

// 自动检测路径
async function autoDetectPath() {
  try {
    const paths = await invoke<string[]>('wxapkg_list_user_paths')
    userPaths.value = paths
    if (paths.length > 0) {
      scanDir.value = paths[0]
      selectedUserPath.value = 0
      message.success(`检测到 ${paths.length} 个微信用户`)
    } else {
      const path = await invoke<string>('wxapkg_get_default_path')
      if (path) {
        scanDir.value = path
        message.success('已自动检测到微信小程序路径')
      } else {
        message.warning('未检测到微信小程序路径，请手动选择')
      }
    }
  } catch (e: any) {
    message.error('自动检测失败: ' + e)
  }
}

async function selectDir() {
  const dir = await open({ directory: true, multiple: false })
  if (dir && typeof dir === 'string') scanDir.value = dir
}

async function selectOutputDir() {
  const dir = await open({ directory: true, multiple: false })
  if (dir && typeof dir === 'string') outputBase.value = dir
}

// 扫描文件
async function scanFiles() {
  if (!scanDir.value) { message.warning('请先选择扫描目录'); return }
  scanning.value = true
  try {
    const files = await invoke<string[]>('wxapkg_scan_files', { dir: scanDir.value })
    wxapkgFiles.value = files.map(f => {
      const match = f.match(/\b(wx[a-f0-9]{16})\b/)
      const appId = match ? match[1] : 'unknown'
      const fileName = f.split('/').pop() || ''
      const packageType = fileName === '__APP__.wxapkg' ? '主包' : '分包'
      return { path: f, appId, appName: '', packageType }
    })
    message.success(`扫描到 ${files.length} 个 wxapkg 文件`)
  } catch (e: any) {
    message.error('扫描失败: ' + e)
  } finally {
    scanning.value = false
  }
}

// 单个反编译
async function decompileSingle(filePath: string) {
  if (!outputBase.value) { message.warning('请先设置输出目录'); return }
  decompiling.value = true
  try {
    const result = await invoke<any>('wxapkg_decompile', { filePath, outputBase: outputBase.value })
    const idx = decompileResults.value.findIndex(r => r.info.filePath === filePath)
    if (idx >= 0) decompileResults.value[idx] = result
    else decompileResults.value.push(result)
    message.success(`反编译完成: ${result.info.appName ? result.info.appName + ' ' : ''}${result.info.appId} (${result.info.fileCount} 文件, ${result.apiEndpoints.length} API, ${result.sensitiveMatches.length} 敏感信息)`)
  } catch (e: any) {
    message.error('反编译失败: ' + e)
    errors.value.push(`${filePath}: ${e}`)
  } finally {
    decompiling.value = false
  }
}

// 批量反编译
async function batchDecompile() {
  if (!outputBase.value) { message.warning('请先设置输出目录'); return }
  if (!scanDir.value) { message.warning('请先选择扫描目录'); return }
  decompiling.value = true
  decompileResults.value = []
  errors.value = []
  try {
    const result = await invoke<any>('wxapkg_batch_decompile', { dir: scanDir.value, outputBase: outputBase.value })
    decompileResults.value = result.results || []
    errors.value = result.errors || []
    wxapkgFiles.value = (result.packages || []).map((p: any) => ({
      path: p.filePath, appId: p.appId, appName: p.appName || '', packageType: p.packageType,
    }))
    const totalApis = decompileResults.value.reduce((sum: number, r: any) => sum + r.apiEndpoints.length, 0)
    const totalSensitive = decompileResults.value.reduce((sum: number, r: any) => sum + r.sensitiveMatches.length, 0)
    message.success(`批量反编译完成: ${decompileResults.value.length} 个包, ${totalApis} 个 API, ${totalSensitive} 个敏感信息`)
  } catch (e: any) {
    message.error('批量反编译失败: ' + e)
  } finally {
    decompiling.value = false
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

// 缩短路径显示：保留前2级和最后2级目录
function shortenPath(path: string): string {
  if (!path) return ''
  const parts = path.split('/')
  if (parts.length <= 5) return path
  const start = parts.slice(0, 3).join('/')
  const end = parts.slice(-2).join('/')
  return `${start}/.../${end}`
}

// 复制路径到剪贴板
async function copyPath(path: string) {
  if (!path) {
    message.warning('路径为空')
    return
  }
  await copyToClipboard(path)
}
</script>

<style scoped>
.decompiler-container {
  max-width: 1400px;
  margin: 0 auto;
}

.result-list-header {
  margin-bottom: 8px;
}

.result-list {
  max-height: 400px;
  overflow-y: auto;
  font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.8;
}

.result-item {
  display: flex;
  gap: 8px;
  padding: 2px 0;
  border-bottom: 1px solid #f0f0f0;
}

.result-item:hover {
  background: #f5f5f5;
}

.result-index {
  color: #999;
  min-width: 28px;
  text-align: right;
  flex-shrink: 0;
}

.result-file {
  color: #888;
  flex-shrink: 0;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-value {
  color: #333;
  word-break: break-all;
  flex: 1;
}
</style>
