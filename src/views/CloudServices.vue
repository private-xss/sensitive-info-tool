<template>
  <div class="cloud-services">
    <a-card title="云服务工具" class="main-card">
      <!-- OSS配置选择器 -->
      <OSSConfigSelector 
        :provider="currentProvider"
        @config-selected="onConfigSelected"
        @connection-tested="onConnectionTested"
      />
      
      <!-- 当前配置状态 -->
      <div v-if="selectedOSSConfig" class="config-status">
        <a-alert 
          :message="`当前使用配置: ${selectedOSSConfig.name} (${getProviderName(selectedOSSConfig.provider)})`"
          type="success" 
          show-icon
          closable
          @close="selectedOSSConfig = null"
        />
      </div>
      
      <a-tabs v-model:activeKey="activeTab" type="card">
        <!-- 阿里云 -->
        <a-tab-pane key="aliyun" tab="阿里云">
          <div class="provider-section">
            <a-divider orientation="left">基础操作</a-divider>
            <a-row :gutter="16">
              <a-col :span="8">
                <a-card title="API连接测试" size="small">
                  <a-button type="primary" :loading="aliyunLoading.test" @click="testAliyunConnection" block>
                    测试API连接
                  </a-button>
                </a-card>
              </a-col>
              <a-col :span="8">
                <a-card title="控制台管理" size="small">
                  <a-space direction="vertical" style="width: 100%">
                    <a-button type="primary" :loading="aliyunLoading.takeover" @click="handleAliyunTakeover" block>
                      接管控制台
                    </a-button>
                    <a-button danger :loading="aliyunLoading.cancel" @click="handleAliyunCancel" block>
                      取消接管
                    </a-button>
                  </a-space>
                </a-card>
              </a-col>
              <a-col :span="8">
                <a-card title="远程命令执行" size="small">
                  <a-space direction="vertical" style="width: 100%">
                    <a-select v-model:value="aliyunCommand.instanceId" placeholder="选择ECS实例" show-search
                      :filter-option="(input: string, option: any) => option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0"
                      style="width: 100%">
                      <a-select-option v-for="instance in aliyunEcsInstances" :key="instance.instance_id" :value="instance.instance_id">
                        {{ instance.instance_name || instance.instance_id }} ({{ instance.os_type }}) - {{ instance.status }}
                      </a-select-option>
                    </a-select>
                    <a-input v-model:value="aliyunCommand.command" placeholder="执行命令" />
                    <a-button type="primary" :loading="aliyunLoading.command" @click="handleAliyunCommand" block>
                      执行命令
                    </a-button>
                  </a-space>
                </a-card>
              </a-col>
            </a-row>

            <!-- 命令输出 -->
            <CommandOutput v-if="aliyunCommandResult" :result="aliyunCommandResult" @copy="copyText" />

            <a-divider orientation="left">计算与数据库</a-divider>
            <a-row :gutter="16">
              <a-col :span="8">
                <a-card title="ECS实例管理" size="small">
                  <a-button type="primary" :loading="aliyunLoading.ecs" @click="loadAliyunEcsInstances" block style="margin-bottom: 8px">
                    获取ECS实例列表
                  </a-button>
                  <a-table :columns="ecsColumns" :data-source="aliyunEcsInstances" :pagination="false" size="small" />
                </a-card>
              </a-col>
              <a-col :span="8">
                <a-card title="数据库管理" size="small">
                  <a-button type="primary" :loading="aliyunLoading.databases" @click="loadAliyunDatabases" block style="margin-bottom: 8px">
                    获取数据库实例
                  </a-button>
                  <a-table :columns="databaseColumns" :data-source="aliyunDatabases" :pagination="false" size="small" />
                </a-card>
              </a-col>
              <a-col :span="8">
                <a-card title="告警管理" size="small">
                  <a-button type="primary" :loading="aliyunLoading.alarms" @click="loadAliyunAlarms" block style="margin-bottom: 8px">
                    获取告警信息
                  </a-button>
                  <a-table :columns="alarmColumns" :data-source="aliyunAlarms" :pagination="false" size="small" />
                </a-card>
              </a-col>
            </a-row>

            <a-divider orientation="left">子用户管理</a-divider>
            <a-row>
              <a-col :span="24">
                <a-card size="small">
                  <template #extra>
                    <a-button type="primary" size="small" @click="loadAliyunUsers" :loading="aliyunLoading.users">刷新列表</a-button>
                  </template>
                  <a-table :columns="userColumns" :data-source="aliyunUsers" :pagination="false" size="small" />
                </a-card>
              </a-col>
            </a-row>
          </div>
        </a-tab-pane>

        <!-- 腾讯云 -->
        <a-tab-pane key="tencent" tab="腾讯云">
          <div class="provider-section">
            <a-divider orientation="left">基础操作</a-divider>
            <a-row :gutter="16">
              <a-col :span="8">
                <a-card title="控制台管理" size="small">
                  <a-space direction="vertical" style="width: 100%">
                    <a-button type="primary" :loading="tencentLoading.takeover" @click="handleTencentTakeover" block>
                      接管控制台
                    </a-button>
                    <a-button danger :loading="tencentLoading.cancel" @click="handleTencentCancel" block>
                      取消接管
                    </a-button>
                  </a-space>
                </a-card>
              </a-col>
              <a-col :span="16">
                <a-card title="远程命令执行" size="small">
                  <a-row :gutter="8">
                    <a-col :span="8">
                      <a-input v-model:value="tencentCommand.instanceId" placeholder="实例ID" />
                    </a-col>
                    <a-col :span="12">
                      <a-input v-model:value="tencentCommand.command" placeholder="执行命令" />
                    </a-col>
                    <a-col :span="4">
                      <a-button type="primary" :loading="tencentLoading.command" @click="handleTencentCommand" block>
                        执行
                      </a-button>
                    </a-col>
                  </a-row>
                </a-card>
              </a-col>
            </a-row>

            <!-- 命令输出 -->
            <CommandOutput v-if="tencentCommandResult" :result="tencentCommandResult" @copy="copyText" />

            <a-divider orientation="left">子用户管理</a-divider>
            <a-row>
              <a-col :span="24">
                <a-card size="small">
                  <template #extra>
                    <a-space>
                      <a-button type="primary" size="small" @click="showTencentCreateUser = true">创建子用户</a-button>
                      <a-button size="small" @click="loadTencentUsers" :loading="tencentLoading.users">刷新列表</a-button>
                    </a-space>
                  </template>
                  <a-table :columns="userActionColumns" :data-source="tencentUsers" :pagination="false" size="small">
                    <template #bodyCell="{ column, record }">
                      <template v-if="column.key === 'actions'">
                        <a-space size="small">
                          <a-popconfirm title="确认删除该用户？" @confirm="deleteTencentUser(record)">
                            <a-button type="link" danger size="small">删除</a-button>
                          </a-popconfirm>
                          <a-button type="link" size="small" @click="editTencentUserPermissions(record)">权限</a-button>
                        </a-space>
                      </template>
                    </template>
                  </a-table>
                </a-card>
              </a-col>
            </a-row>
          </div>

          <!-- 创建子用户弹窗 -->
          <a-modal v-model:open="showTencentCreateUser" title="创建腾讯云子用户" @ok="createTencentUser">
            <a-form layout="vertical">
              <a-form-item label="用户名"><a-input v-model:value="newTencentUser.username" /></a-form-item>
              <a-form-item label="显示名"><a-input v-model:value="newTencentUser.displayName" /></a-form-item>
              <a-form-item label="邮箱"><a-input v-model:value="newTencentUser.email" /></a-form-item>
            </a-form>
          </a-modal>

          <!-- 权限编辑弹窗 -->
          <a-modal v-model:open="showTencentPermModal" title="编辑用户权限" @ok="saveTencentPermissions">
            <a-form layout="vertical">
              <a-form-item label="用户">{{ tencentPermUser.username }}</a-form-item>
              <a-form-item label="权限 (逗号分隔)">
                <a-input v-model:value="tencentPermStr" placeholder="AdministratorAccess,ReadOnlyAccess" />
              </a-form-item>
            </a-form>
          </a-modal>
        </a-tab-pane>

        <!-- 华为云 -->
        <a-tab-pane key="huawei" tab="华为云">
          <div class="provider-section">
            <a-divider orientation="left">基础操作</a-divider>
            <a-row :gutter="16">
              <a-col :span="12">
                <a-card title="控制台管理" size="small">
                  <a-space direction="vertical" style="width: 100%">
                    <a-button type="primary" :loading="huaweiLoading.takeover" @click="handleHuaweiTakeover" block>
                      接管控制台
                    </a-button>
                    <a-button danger :loading="huaweiLoading.cancel" @click="handleHuaweiCancel" block>
                      取消接管
                    </a-button>
                  </a-space>
                </a-card>
              </a-col>
              <a-col :span="12">
                <a-card title="子用户管理" size="small">
                  <template #extra>
                    <a-button type="primary" size="small" @click="showHuaweiCreateUser = true">创建</a-button>
                  </template>
                  <a-button type="primary" :loading="huaweiLoading.users" @click="loadHuaweiUsers" block style="margin-bottom: 8px">
                    获取子用户列表
                  </a-button>
                  <a-table :columns="userActionColumns" :data-source="huaweiUsers" :pagination="false" size="small">
                    <template #bodyCell="{ column, record }">
                      <template v-if="column.key === 'actions'">
                        <a-space size="small">
                          <a-popconfirm title="确认删除该用户？" @confirm="deleteHuaweiUser(record)">
                            <a-button type="link" danger size="small">删除</a-button>
                          </a-popconfirm>
                          <a-button type="link" size="small" @click="editHuaweiUserPermissions(record)">权限</a-button>
                        </a-space>
                      </template>
                    </template>
                  </a-table>
                </a-card>
              </a-col>
            </a-row>
          </div>

          <!-- 创建子用户弹窗 -->
          <a-modal v-model:open="showHuaweiCreateUser" title="创建华为云子用户" @ok="createHuaweiUser">
            <a-form layout="vertical">
              <a-form-item label="用户名"><a-input v-model:value="newHuaweiUser.username" /></a-form-item>
              <a-form-item label="显示名"><a-input v-model:value="newHuaweiUser.displayName" /></a-form-item>
              <a-form-item label="邮箱"><a-input v-model:value="newHuaweiUser.email" /></a-form-item>
            </a-form>
          </a-modal>

          <!-- 权限编辑弹窗 -->
          <a-modal v-model:open="showHuaweiPermModal" title="编辑用户权限" @ok="saveHuaweiPermissions">
            <a-form layout="vertical">
              <a-form-item label="用户">{{ huaweiPermUser.username }}</a-form-item>
              <a-form-item label="权限 (逗号分隔)">
                <a-input v-model:value="huaweiPermStr" placeholder="admin,viewer" />
              </a-form-item>
            </a-form>
          </a-modal>
        </a-tab-pane>

        <!-- UCloud -->
        <a-tab-pane key="ucloud" tab="UCloud">
          <div class="provider-section">
            <a-divider orientation="left">基础操作</a-divider>
            <a-row :gutter="16">
              <a-col :span="12">
                <a-card title="控制台管理" size="small">
                  <a-space direction="vertical" style="width: 100%">
                    <a-button type="primary" :loading="ucloudLoading.takeover" @click="handleUCloudTakeover" block>
                      接管控制台
                    </a-button>
                    <a-button danger :loading="ucloudLoading.cancel" @click="handleUCloudCancel" block>
                      取消接管
                    </a-button>
                  </a-space>
                </a-card>
              </a-col>
              <a-col :span="12">
                <a-card title="主机管理" size="small">
                  <template #extra>
                    <a-button type="primary" size="small" @click="showUCloudCreateHost = true">创建主机</a-button>
                  </template>
                  <a-button type="primary" :loading="ucloudLoading.hosts" @click="loadUCloudHosts" block style="margin-bottom: 8px">
                    获取主机列表
                  </a-button>
                  <a-table :columns="hostActionColumns" :data-source="ucloudHosts" :pagination="false" size="small">
                    <template #bodyCell="{ column, record }">
                      <template v-if="column.key === 'actions'">
                        <a-space size="small">
                          <a-button type="link" size="small" @click="ucloudHostAction(record.id, 'start')" :disabled="record.status === 'Running'">启动</a-button>
                          <a-button type="link" size="small" @click="ucloudHostAction(record.id, 'stop')" :disabled="record.status !== 'Running'">停止</a-button>
                          <a-popconfirm title="确认删除该主机？" @confirm="ucloudHostAction(record.id, 'delete')">
                            <a-button type="link" danger size="small">删除</a-button>
                          </a-popconfirm>
                        </a-space>
                      </template>
                    </template>
                  </a-table>
                </a-card>
              </a-col>
            </a-row>
            
            <a-divider orientation="left">用户与订单</a-divider>
            <a-row :gutter="16">
              <a-col :span="12">
                <a-card title="用户管理" size="small">
                  <a-space direction="vertical" style="width: 100%">
                    <a-button type="primary" :loading="ucloudLoading.users" @click="loadUCloudUsers" block>
                      获取子用户列表
                    </a-button>
                    <a-button :loading="ucloudLoading.mainUser" @click="loadUCloudMainUser" block>
                      获取主用户信息
                    </a-button>
                  </a-space>
                  <a-table :columns="userColumns" :data-source="ucloudUsers" :pagination="false" size="small" style="margin-top: 8px" />
                </a-card>
              </a-col>
              <a-col :span="12">
                <a-card title="订单管理" size="small">
                  <a-button type="primary" :loading="ucloudLoading.orders" @click="loadUCloudOrders" block style="margin-bottom: 8px">
                    获取订单列表
                  </a-button>
                  <a-table :columns="orderColumns" :data-source="ucloudOrders" :pagination="false" size="small" />
                </a-card>
              </a-col>
            </a-row>
          </div>

          <!-- 创建主机弹窗 -->
          <a-modal v-model:open="showUCloudCreateHost" title="创建UCloud主机" @ok="createUCloudHost">
            <a-form layout="vertical">
              <a-form-item label="主机名"><a-input v-model:value="newUCloudHost.name" /></a-form-item>
              <a-form-item label="实例类型"><a-input v-model:value="newUCloudHost.instanceType" placeholder="n-basic-2" /></a-form-item>
            </a-form>
          </a-modal>
        </a-tab-pane>

        <!-- AWS -->
        <a-tab-pane key="aws" tab="AWS">
          <div class="provider-section">
            <a-divider orientation="left">基础操作</a-divider>
            <a-row :gutter="16">
              <a-col :span="12">
                <a-card title="控制台管理" size="small">
                  <a-space direction="vertical" style="width: 100%">
                    <a-button type="primary" :loading="awsLoading.takeover" @click="handleAWSTakeover" block>
                      接管控制台
                    </a-button>
                    <a-button danger :loading="awsLoading.cancel" @click="handleAWSCancel" block>
                      取消接管
                    </a-button>
                  </a-space>
                </a-card>
              </a-col>
              <a-col :span="12">
                <a-card title="后门管理" size="small">
                  <template #extra>
                    <a-space>
                      <a-button type="primary" size="small" @click="handleAWSCreateBackdoor" :loading="awsLoading.createBackdoor">创建</a-button>
                      <a-button size="small" @click="loadAWSBackdoors" :loading="awsLoading.backdoors">刷新</a-button>
                    </a-space>
                  </template>
                  <a-table :columns="backdoorActionColumns" :data-source="awsBackdoors" :pagination="false" size="small">
                    <template #bodyCell="{ column, record }">
                      <template v-if="column.key === 'actions'">
                        <a-popconfirm title="确认删除该后门？" @confirm="deleteAWSBackdoor(record.id)">
                          <a-button type="link" danger size="small">删除</a-button>
                        </a-popconfirm>
                      </template>
                    </template>
                  </a-table>
                </a-card>
              </a-col>
            </a-row>
            
            <a-divider orientation="left">IAM 管理</a-divider>
            <a-row :gutter="16">
              <a-col :span="12">
                <a-card title="用户管理" size="small">
                  <template #extra>
                    <a-button size="small" @click="loadAWSUsers" :loading="awsLoading.users">刷新</a-button>
                  </template>
                  <a-table :columns="awsUserColumns" :data-source="awsUsers" :pagination="false" size="small">
                    <template #bodyCell="{ column, record }">
                      <template v-if="column.key === 'actions'">
                        <a-button type="link" size="small" @click="showAWSAttachPolicy(record)">绑定策略</a-button>
                      </template>
                    </template>
                  </a-table>
                </a-card>
              </a-col>
              <a-col :span="12">
                <a-card title="策略管理" size="small">
                  <template #extra>
                    <a-space>
                      <a-button type="primary" size="small" @click="showAWSCreatePolicy = true">创建</a-button>
                      <a-button size="small" @click="loadAWSPolicies" :loading="awsLoading.policies">刷新</a-button>
                    </a-space>
                  </template>
                  <a-table :columns="policyActionColumns" :data-source="awsPolicies" :pagination="false" size="small">
                    <template #bodyCell="{ column, record }">
                      <template v-if="column.key === 'actions'">
                        <a-popconfirm title="确认删除该策略？" @confirm="deleteAWSPolicy(record.id)">
                          <a-button type="link" danger size="small">删除</a-button>
                        </a-popconfirm>
                      </template>
                    </template>
                  </a-table>
                </a-card>
              </a-col>
            </a-row>
          </div>

          <!-- 创建策略弹窗 -->
          <a-modal v-model:open="showAWSCreatePolicy" title="创建AWS策略" @ok="createAWSPolicy">
            <a-form layout="vertical">
              <a-form-item label="策略名"><a-input v-model:value="newAWSPolicy.name" /></a-form-item>
              <a-form-item label="描述"><a-input v-model:value="newAWSPolicy.description" /></a-form-item>
            </a-form>
          </a-modal>

          <!-- 绑定策略弹窗 -->
          <a-modal v-model:open="showAWSAttachModal" title="绑定策略到用户" @ok="attachAWSPolicy">
            <a-form layout="vertical">
              <a-form-item label="用户">{{ awsAttachUser.username }}</a-form-item>
              <a-form-item label="策略ID">
                <a-select v-model:value="awsAttachPolicyId" placeholder="选择策略" style="width: 100%">
                  <a-select-option v-for="p in awsPolicies" :key="p.id" :value="p.id">{{ p.name }}</a-select-option>
                </a-select>
              </a-form-item>
            </a-form>
          </a-modal>
        </a-tab-pane>
      </a-tabs>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { message } from 'ant-design-vue'
import * as aliyunApi from '@/utils/aliyun-api'
import * as tencentApi from '@/utils/tencent-api'
import * as huaweiApi from '@/utils/huawei-api'
import * as ucloudApi from '@/utils/ucloud-api'
import * as awsApi from '@/utils/aws-api'
import OSSConfigSelector from '@/components/OSSConfigSelector.vue'
import CommandOutput from '@/components/CommandOutput.vue'
import type { 
  CloudOSSConfig, CloudProvider, SubUser, EcsInstance, DatabaseInstance, AlarmInfo,
  HostInfo, OrderInfo, BackdoorInfo, PolicyInfo, CommandResult
} from '@/types'
import { getProviderInfo } from '@/utils/cloud-providers'

// 当前激活的标签页
const activeTab = ref('aliyun')
const selectedOSSConfig = ref<CloudOSSConfig | null>(null)

const currentProvider = computed(() => {
  const providerMap: Record<string, CloudProvider> = {
    'aliyun': 'aliyun', 'tencent': 'tencent', 'huawei': 'huawei', 'ucloud': 'ucloud', 'aws': 'aws'
  }
  return providerMap[activeTab.value] || undefined
})

const onConfigSelected = (config: CloudOSSConfig | null) => {
  selectedOSSConfig.value = config
  if (config) message.success(`已选择OSS配置: ${config.name}`)
}

const onConnectionTested = (success: boolean) => {
  if (success) message.success('OSS连接测试成功，可以开始使用云服务工具')
}

const checkConfig = (): boolean => {
  if (!selectedOSSConfig.value) { message.warning('请先选择OSS配置'); return false }
  return true
}

const getProviderName = (provider: CloudProvider): string => getProviderInfo(provider).name

const copyText = async (text: string) => {
  try { await navigator.clipboard.writeText(text); message.success('已复制') } catch { message.error('复制失败') }
}

// ==================== 阿里云 ====================
const aliyunLoading = reactive({ test: false, takeover: false, cancel: false, command: false, users: false, ecs: false, databases: false, alarms: false })
const aliyunCommand = reactive({ instanceId: '', command: '' })
const aliyunCommandResult = ref<CommandResult | null>(null)
const aliyunEcsInstances = ref<EcsInstance[]>([])
const aliyunDatabases = ref<DatabaseInstance[]>([])
const aliyunAlarms = ref<AlarmInfo[]>([])
const aliyunUsers = ref<SubUser[]>([])

const getAliyunConfig = () => ({
  access_key_id: selectedOSSConfig.value!.accessKey,
  access_key_secret: selectedOSSConfig.value!.secretKey,
  region: selectedOSSConfig.value!.region || 'cn-hangzhou'
})

const testAliyunConnection = async () => {
  if (!checkConfig()) return
  aliyunLoading.test = true
  try {
    const result = await aliyunApi.testConnection(getAliyunConfig())
    result.success ? message.success('阿里云API连接测试成功') : message.error(result.error || '连接测试失败')
  } catch { message.error('连接测试失败') } finally { aliyunLoading.test = false }
}

const handleAliyunTakeover = async () => {
  if (!checkConfig()) return
  aliyunLoading.takeover = true
  try {
    const result = await aliyunApi.takeOverConsole(getAliyunConfig())
    result.success ? message.success('阿里云控制台接管成功') : message.error(result.error || '接管失败')
  } catch { message.error('操作失败') } finally { aliyunLoading.takeover = false }
}

const handleAliyunCancel = async () => {
  if (!checkConfig()) return
  aliyunLoading.cancel = true
  try {
    const result = await aliyunApi.cancelConsoleTakeover(getAliyunConfig())
    result.success ? message.success('阿里云控制台接管已取消') : message.error(result.error || '取消失败')
  } catch { message.error('操作失败') } finally { aliyunLoading.cancel = false }
}

const handleAliyunCommand = async () => {
  if (!aliyunCommand.instanceId || !aliyunCommand.command) { message.warning('请填写实例ID和命令'); return }
  if (!checkConfig()) return
  aliyunLoading.command = true
  try {
    aliyunCommandResult.value = null
    const result = await aliyunApi.executeRemoteCommand(getAliyunConfig(), aliyunCommand)
    if (result.success) { aliyunCommandResult.value = result.data as any; message.success('命令执行完成') }
    else message.error(result.error || '命令执行失败')
  } catch { message.error('操作失败') } finally { aliyunLoading.command = false }
}

const loadAliyunEcsInstances = async () => {
  if (!checkConfig()) return
  aliyunLoading.ecs = true
  try {
    const result = await aliyunApi.getEcsInstances(getAliyunConfig())
    if (result.success) { aliyunEcsInstances.value = result.data || []; message.success('ECS实例列表获取成功') }
    else message.error(result.error || '获取失败')
  } catch { message.error('操作失败') } finally { aliyunLoading.ecs = false }
}

const loadAliyunDatabases = async () => {
  if (!checkConfig()) return
  aliyunLoading.databases = true
  try {
    const result = await aliyunApi.getDatabaseInstances(getAliyunConfig())
    if (result.success) { aliyunDatabases.value = result.data || []; message.success('数据库实例列表获取成功') }
    else message.error(result.error || '获取失败')
  } catch { message.error('操作失败') } finally { aliyunLoading.databases = false }
}

const loadAliyunAlarms = async () => {
  if (!checkConfig()) return
  aliyunLoading.alarms = true
  try {
    const result = await aliyunApi.getAlarmInfo(getAliyunConfig())
    if (result.success) { aliyunAlarms.value = result.data || []; message.success('告警信息获取成功') }
    else message.error(result.error || '获取失败')
  } catch { message.error('操作失败') } finally { aliyunLoading.alarms = false }
}

const loadAliyunUsers = async () => {
  if (!checkConfig()) return
  aliyunLoading.users = true
  try {
    const result = await aliyunApi.getSubUsers(getAliyunConfig())
    if (result.success) { aliyunUsers.value = result.data || []; message.success('子用户列表获取成功') }
    else message.error(result.error || '获取失败')
  } catch { message.error('操作失败') } finally { aliyunLoading.users = false }
}

// ==================== 腾讯云 ====================
const tencentLoading = reactive({ takeover: false, cancel: false, command: false, users: false })
const tencentCommand = reactive({ instanceId: '', command: '' })
const tencentCommandResult = ref<CommandResult | null>(null)
const tencentUsers = ref<SubUser[]>([])
const showTencentCreateUser = ref(false)
const newTencentUser = reactive({ username: '', displayName: '', email: '' })
const showTencentPermModal = ref(false)
const tencentPermUser = reactive({ id: '', username: '' })
const tencentPermStr = ref('')

const getTencentConfig = () => ({
  secretId: selectedOSSConfig.value!.accessKey,
  secretKey: selectedOSSConfig.value!.secretKey,
  region: selectedOSSConfig.value!.region || 'ap-beijing'
})

const handleTencentTakeover = async () => {
  if (!checkConfig()) return
  tencentLoading.takeover = true
  try {
    const result = await tencentApi.takeOverConsole(getTencentConfig())
    result.success ? message.success('腾讯云控制台接管成功') : message.error(result.error || '接管失败')
  } catch { message.error('操作失败') } finally { tencentLoading.takeover = false }
}

const handleTencentCancel = async () => {
  if (!checkConfig()) return
  tencentLoading.cancel = true
  try {
    const result = await tencentApi.cancelConsoleTakeover(getTencentConfig())
    result.success ? message.success('腾讯云控制台接管已取消') : message.error(result.error || '取消失败')
  } catch { message.error('操作失败') } finally { tencentLoading.cancel = false }
}

const handleTencentCommand = async () => {
  if (!tencentCommand.instanceId || !tencentCommand.command) { message.warning('请填写实例ID和命令'); return }
  if (!checkConfig()) return
  tencentLoading.command = true
  try {
    tencentCommandResult.value = null
    const result = await tencentApi.executeRemoteCommand(getTencentConfig(), tencentCommand)
    if (result.success) { tencentCommandResult.value = result.data as any; message.success('命令执行完成') }
    else message.error(result.error || '命令执行失败')
  } catch { message.error('操作失败') } finally { tencentLoading.command = false }
}

const loadTencentUsers = async () => {
  if (!checkConfig()) return
  tencentLoading.users = true
  try {
    const result = await tencentApi.getSubUsers(getTencentConfig())
    if (result.success) { tencentUsers.value = result.data || []; message.success('子用户列表获取成功') }
    else message.error(result.error || '获取失败')
  } catch { message.error('操作失败') } finally { tencentLoading.users = false }
}

const createTencentUser = async () => {
  if (!checkConfig()) return
  try {
    const result = await tencentApi.createSubUser(getTencentConfig(), newTencentUser)
    if (result.success) { message.success('子用户创建成功'); showTencentCreateUser.value = false; loadTencentUsers() }
    else message.error(result.error || '创建失败')
  } catch { message.error('操作失败') }
}

const deleteTencentUser = async (user: SubUser) => {
  if (!checkConfig()) return
  try {
    const result = await tencentApi.deleteSubUser(getTencentConfig(), user.id)
    if (result.success) { message.success('子用户删除成功'); loadTencentUsers() }
    else message.error(result.error || '删除失败')
  } catch { message.error('操作失败') }
}

const editTencentUserPermissions = (user: SubUser) => {
  tencentPermUser.id = user.id
  tencentPermUser.username = user.username
  tencentPermStr.value = (user.permissions || []).join(',')
  showTencentPermModal.value = true
}

const saveTencentPermissions = async () => {
  if (!checkConfig()) return
  try {
    const permissions = tencentPermStr.value.split(',').map(s => s.trim()).filter(Boolean)
    const result = await tencentApi.updateSubUserPermissions(getTencentConfig(), tencentPermUser.id, permissions)
    if (result.success) { message.success('权限更新成功'); showTencentPermModal.value = false; loadTencentUsers() }
    else message.error(result.error || '更新失败')
  } catch { message.error('操作失败') }
}

// ==================== 华为云 ====================
const huaweiLoading = reactive({ takeover: false, cancel: false, users: false })
const huaweiUsers = ref<SubUser[]>([])
const showHuaweiCreateUser = ref(false)
const newHuaweiUser = reactive({ username: '', displayName: '', email: '' })
const showHuaweiPermModal = ref(false)
const huaweiPermUser = reactive({ id: '', username: '' })
const huaweiPermStr = ref('')

const getHuaweiConfig = () => ({
  accessKey: selectedOSSConfig.value!.accessKey,
  secretKey: selectedOSSConfig.value!.secretKey,
  region: selectedOSSConfig.value!.region || 'cn-north-1'
})

const handleHuaweiTakeover = async () => {
  if (!checkConfig()) return
  huaweiLoading.takeover = true
  try {
    const result = await huaweiApi.takeOverConsole(getHuaweiConfig())
    result.success ? message.success('华为云控制台接管成功') : message.error(result.error || '接管失败')
  } catch { message.error('操作失败') } finally { huaweiLoading.takeover = false }
}

const handleHuaweiCancel = async () => {
  if (!checkConfig()) return
  huaweiLoading.cancel = true
  try {
    const result = await huaweiApi.cancelConsoleTakeover(getHuaweiConfig())
    result.success ? message.success('华为云控制台接管已取消') : message.error(result.error || '取消失败')
  } catch { message.error('操作失败') } finally { huaweiLoading.cancel = false }
}

const loadHuaweiUsers = async () => {
  if (!checkConfig()) return
  huaweiLoading.users = true
  try {
    const result = await huaweiApi.getSubUsers(getHuaweiConfig())
    if (result.success) { huaweiUsers.value = result.data || []; message.success('子用户列表获取成功') }
    else message.error(result.error || '获取失败')
  } catch { message.error('操作失败') } finally { huaweiLoading.users = false }
}

const createHuaweiUser = async () => {
  if (!checkConfig()) return
  try {
    const result = await huaweiApi.createSubUser(getHuaweiConfig(), newHuaweiUser)
    if (result.success) { message.success('子用户创建成功'); showHuaweiCreateUser.value = false; loadHuaweiUsers() }
    else message.error(result.error || '创建失败')
  } catch { message.error('操作失败') }
}

const deleteHuaweiUser = async (user: SubUser) => {
  if (!checkConfig()) return
  try {
    const result = await huaweiApi.deleteSubUser(getHuaweiConfig(), user.id)
    if (result.success) { message.success('子用户删除成功'); loadHuaweiUsers() }
    else message.error(result.error || '删除失败')
  } catch { message.error('操作失败') }
}

const editHuaweiUserPermissions = (user: SubUser) => {
  huaweiPermUser.id = user.id
  huaweiPermUser.username = user.username
  huaweiPermStr.value = (user.permissions || []).join(',')
  showHuaweiPermModal.value = true
}

const saveHuaweiPermissions = async () => {
  if (!checkConfig()) return
  try {
    const permissions = huaweiPermStr.value.split(',').map(s => s.trim()).filter(Boolean)
    const result = await huaweiApi.updateSubUserPermissions(getHuaweiConfig(), huaweiPermUser.id, permissions)
    if (result.success) { message.success('权限更新成功'); showHuaweiPermModal.value = false; loadHuaweiUsers() }
    else message.error(result.error || '更新失败')
  } catch { message.error('操作失败') }
}

// ==================== UCloud ====================
const ucloudLoading = reactive({ takeover: false, cancel: false, hosts: false, users: false, mainUser: false, orders: false })
const ucloudHosts = ref<HostInfo[]>([])
const ucloudUsers = ref<SubUser[]>([])
const ucloudOrders = ref<OrderInfo[]>([])
const showUCloudCreateHost = ref(false)
const newUCloudHost = reactive({ name: '', instanceType: 'n-basic-2' })

const getUCloudConfig = () => ({
  publicKey: selectedOSSConfig.value!.accessKey,
  privateKey: selectedOSSConfig.value!.secretKey,
  region: selectedOSSConfig.value!.region || 'cn-bj'
})

const handleUCloudTakeover = async () => {
  if (!checkConfig()) return
  ucloudLoading.takeover = true
  try {
    const result = await ucloudApi.takeOverConsole(getUCloudConfig())
    result.success ? message.success('UCloud控制台接管成功') : message.error(result.error || '接管失败')
  } catch { message.error('操作失败') } finally { ucloudLoading.takeover = false }
}

const handleUCloudCancel = async () => {
  if (!checkConfig()) return
  ucloudLoading.cancel = true
  try {
    const result = await ucloudApi.cancelConsoleTakeover(getUCloudConfig())
    result.success ? message.success('UCloud控制台接管已取消') : message.error(result.error || '取消失败')
  } catch { message.error('操作失败') } finally { ucloudLoading.cancel = false }
}

const loadUCloudHosts = async () => {
  if (!checkConfig()) return
  ucloudLoading.hosts = true
  try {
    const result = await ucloudApi.getHosts(getUCloudConfig())
    if (result.success) { ucloudHosts.value = result.data || []; message.success('主机列表获取成功') }
    else message.error(result.error || '获取失败')
  } catch { message.error('操作失败') } finally { ucloudLoading.hosts = false }
}

const loadUCloudUsers = async () => {
  if (!checkConfig()) return
  ucloudLoading.users = true
  try {
    const result = await ucloudApi.getSubUsers(getUCloudConfig())
    if (result.success) { ucloudUsers.value = result.data || []; message.success('子用户列表获取成功') }
    else message.error(result.error || '获取失败')
  } catch { message.error('操作失败') } finally { ucloudLoading.users = false }
}

const loadUCloudMainUser = async () => {
  if (!checkConfig()) return
  ucloudLoading.mainUser = true
  try {
    const result = await ucloudApi.getMainUser(getUCloudConfig())
    if (result.success) message.success('主用户信息获取成功')
    else message.error(result.error || '获取失败')
  } catch { message.error('操作失败') } finally { ucloudLoading.mainUser = false }
}

const loadUCloudOrders = async () => {
  if (!checkConfig()) return
  ucloudLoading.orders = true
  try {
    const result = await ucloudApi.getOrders(getUCloudConfig())
    if (result.success) { ucloudOrders.value = result.data || []; message.success('订单列表获取成功') }
    else message.error(result.error || '获取失败')
  } catch { message.error('操作失败') } finally { ucloudLoading.orders = false }
}

const createUCloudHost = async () => {
  if (!checkConfig()) return
  try {
    const result = await ucloudApi.createHost(getUCloudConfig(), newUCloudHost)
    if (result.success) { message.success('主机创建成功'); showUCloudCreateHost.value = false; loadUCloudHosts() }
    else message.error(result.error || '创建失败')
  } catch { message.error('操作失败') }
}

const ucloudHostAction = async (hostId: string, action: 'start' | 'stop' | 'delete') => {
  if (!checkConfig()) return
  try {
    let result
    if (action === 'start') result = await ucloudApi.startHost(getUCloudConfig(), hostId)
    else if (action === 'stop') result = await ucloudApi.stopHost(getUCloudConfig(), hostId)
    else result = await ucloudApi.deleteHost(getUCloudConfig(), hostId)
    if (result.success) { message.success(`主机${action === 'start' ? '启动' : action === 'stop' ? '停止' : '删除'}成功`); loadUCloudHosts() }
    else message.error(result.error || '操作失败')
  } catch { message.error('操作失败') }
}

// ==================== AWS ====================
const awsLoading = reactive({ takeover: false, cancel: false, backdoors: false, createBackdoor: false, users: false, policies: false })
const awsBackdoors = ref<BackdoorInfo[]>([])
const awsUsers = ref<SubUser[]>([])
const awsPolicies = ref<PolicyInfo[]>([])
const showAWSCreatePolicy = ref(false)
const newAWSPolicy = reactive({ name: '', description: '' })
const showAWSAttachModal = ref(false)
const awsAttachUser = reactive({ id: '', username: '' })
const awsAttachPolicyId = ref('')

const getAWSConfig = () => ({
  accessKeyId: selectedOSSConfig.value!.accessKey,
  secretAccessKey: selectedOSSConfig.value!.secretKey,
  region: selectedOSSConfig.value!.region || 'us-east-1'
})

const handleAWSTakeover = async () => {
  if (!checkConfig()) return
  awsLoading.takeover = true
  try {
    const result = await awsApi.takeOverConsole(getAWSConfig())
    result.success ? message.success('AWS控制台接管成功') : message.error(result.error || '接管失败')
  } catch { message.error('操作失败') } finally { awsLoading.takeover = false }
}

const handleAWSCancel = async () => {
  if (!checkConfig()) return
  awsLoading.cancel = true
  try {
    const result = await awsApi.cancelConsoleTakeover(getAWSConfig())
    result.success ? message.success('AWS控制台接管已取消') : message.error(result.error || '取消失败')
  } catch { message.error('操作失败') } finally { awsLoading.cancel = false }
}

const loadAWSBackdoors = async () => {
  if (!checkConfig()) return
  awsLoading.backdoors = true
  try {
    const result = await awsApi.getBackdoors(getAWSConfig())
    if (result.success) { awsBackdoors.value = result.data || []; message.success('后门列表获取成功') }
    else message.error(result.error || '获取失败')
  } catch { message.error('操作失败') } finally { awsLoading.backdoors = false }
}

const handleAWSCreateBackdoor = async () => {
  if (!checkConfig()) return
  awsLoading.createBackdoor = true
  try {
    const result = await awsApi.createBackdoor(getAWSConfig(), { name: '新后门', type: 'IAM', target: 'console' })
    if (result.success) { message.success('后门创建成功'); loadAWSBackdoors() }
    else message.error(result.error || '创建失败')
  } catch { message.error('操作失败') } finally { awsLoading.createBackdoor = false }
}

const deleteAWSBackdoor = async (backdoorId: string) => {
  if (!checkConfig()) return
  try {
    const result = await awsApi.deleteBackdoor(getAWSConfig(), backdoorId)
    if (result.success) { message.success('后门删除成功'); loadAWSBackdoors() }
    else message.error(result.error || '删除失败')
  } catch { message.error('操作失败') }
}

const loadAWSUsers = async () => {
  if (!checkConfig()) return
  awsLoading.users = true
  try {
    const result = await awsApi.getSubUsers(getAWSConfig())
    if (result.success) { awsUsers.value = result.data || []; message.success('子用户列表获取成功') }
    else message.error(result.error || '获取失败')
  } catch { message.error('操作失败') } finally { awsLoading.users = false }
}

const loadAWSPolicies = async () => {
  if (!checkConfig()) return
  awsLoading.policies = true
  try {
    const result = await awsApi.getPolicies(getAWSConfig())
    if (result.success) { awsPolicies.value = result.data || []; message.success('策略列表获取成功') }
    else message.error(result.error || '获取失败')
  } catch { message.error('操作失败') } finally { awsLoading.policies = false }
}

const createAWSPolicy = async () => {
  if (!checkConfig()) return
  try {
    const result = await awsApi.createPolicy(getAWSConfig(), newAWSPolicy)
    if (result.success) { message.success('策略创建成功'); showAWSCreatePolicy.value = false; loadAWSPolicies() }
    else message.error(result.error || '创建失败')
  } catch { message.error('操作失败') }
}

const deleteAWSPolicy = async (policyId: string) => {
  if (!checkConfig()) return
  try {
    const result = await awsApi.deletePolicy(getAWSConfig(), policyId)
    if (result.success) { message.success('策略删除成功'); loadAWSPolicies() }
    else message.error(result.error || '删除失败')
  } catch { message.error('操作失败') }
}

const showAWSAttachPolicy = (user: SubUser) => {
  awsAttachUser.id = user.id
  awsAttachUser.username = user.username
  awsAttachPolicyId.value = ''
  showAWSAttachModal.value = true
}

const attachAWSPolicy = async () => {
  if (!checkConfig()) return
  if (!awsAttachPolicyId.value) { message.warning('请选择策略'); return }
  try {
    const result = await awsApi.attachPolicyToUser(getAWSConfig(), awsAttachUser.id, awsAttachPolicyId.value)
    if (result.success) { message.success('策略绑定成功'); showAWSAttachModal.value = false }
    else message.error(result.error || '绑定失败')
  } catch { message.error('操作失败') }
}

// ==================== 表格列定义 ====================
const ecsColumns = [
  { title: '实例名', dataIndex: 'instance_name', key: 'instance_name' },
  { title: '实例ID', dataIndex: 'instance_id', key: 'instance_id' },
  { title: '操作系统', dataIndex: 'os_type', key: 'os_type' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '公网IP', dataIndex: 'public_ip_address', key: 'public_ip_address' },
  { title: '私网IP', dataIndex: 'private_ip_address', key: 'private_ip_address' }
]

const userColumns = [
  { title: '用户名', dataIndex: 'username', key: 'username' },
  { title: '显示名', dataIndex: 'displayName', key: 'displayName' },
  { title: '邮箱', dataIndex: 'email', key: 'email' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt' }
]

const userActionColumns = [
  ...userColumns,
  { title: '操作', key: 'actions', width: 120 }
]

const databaseColumns = [
  { title: '实例名', dataIndex: 'name', key: 'name' },
  { title: '引擎', dataIndex: 'engine', key: 'engine' },
  { title: '版本', dataIndex: 'version', key: 'version' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '端点', dataIndex: 'endpoint', key: 'endpoint' }
]

const alarmColumns = [
  { title: '告警名', dataIndex: 'name', key: 'name' },
  { title: '严重程度', dataIndex: 'severity', key: 'severity' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '指标名', dataIndex: 'metricName', key: 'metricName' },
  { title: '当前值', dataIndex: 'currentValue', key: 'currentValue' }
]

const hostActionColumns = [
  { title: '主机名', dataIndex: 'name', key: 'name' },
  { title: '实例类型', dataIndex: 'instanceType', key: 'instanceType' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '公网IP', dataIndex: 'publicIp', key: 'publicIp' },
  { title: '私网IP', dataIndex: 'privateIp', key: 'privateIp' },
  { title: '操作', key: 'actions', width: 180 }
]

const orderColumns = [
  { title: '订单ID', dataIndex: 'id', key: 'id' },
  { title: '订单类型', dataIndex: 'orderType', key: 'orderType' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '金额', dataIndex: 'amount', key: 'amount' },
  { title: '货币', dataIndex: 'currency', key: 'currency' }
]

const backdoorActionColumns = [
  { title: '后门名', dataIndex: 'name', key: 'name' },
  { title: '类型', dataIndex: 'type', key: 'type' },
  { title: '目标', dataIndex: 'target', key: 'target' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt' },
  { title: '操作', key: 'actions', width: 80 }
]

const awsUserColumns = [
  { title: '用户名', dataIndex: 'username', key: 'username' },
  { title: '显示名', dataIndex: 'displayName', key: 'displayName' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '操作', key: 'actions', width: 100 }
]

const policyActionColumns = [
  { title: '策略名', dataIndex: 'name', key: 'name' },
  { title: '描述', dataIndex: 'description', key: 'description' },
  { title: '版本', dataIndex: 'version', key: 'version' },
  { title: '操作', key: 'actions', width: 80 }
]
</script>

<style scoped>
.cloud-services { padding: 0; }
.main-card { margin-bottom: 0; }
.provider-section { padding: 16px 0; }
.config-status { margin: 16px 0; }
</style>
