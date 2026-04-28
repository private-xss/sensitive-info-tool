<template>
  <div class="command-output" style="margin-top: 12px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <div style="display:flex;gap:8px;align-items:center">
        <a-tag :color="statusColor">{{ result.status || 'Unknown' }}</a-tag>
        <span style="color:#888">exitCode: {{ result.exitCode }}</span>
        <span style="color:#888">{{ result.timestamp }}</span>
      </div>
      <a-space>
        <a-button size="small" @click="showFull = true">全屏查看</a-button>
        <a-button size="small" @click="$emit('copy', result.output || '')" :disabled="!result.output">复制输出</a-button>
      </a-space>
    </div>
    <pre class="output-pre">{{ result.output || '(无输出)' }}</pre>

    <a-drawer v-model:open="showFull" title="终端输出" placement="right" :width="'100vw'" :bodyStyle="{padding: '0'}">
      <div style="padding: 16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="display:flex;gap:8px;align-items:center">
            <a-tag :color="statusColor">{{ result.status || 'Unknown' }}</a-tag>
            <span style="color:#888">exitCode: {{ result.exitCode }}</span>
            <span style="color:#888">{{ result.timestamp }}</span>
          </div>
          <a-button size="small" @click="$emit('copy', result.output || '')" :disabled="!result.output">复制输出</a-button>
        </div>
        <pre class="output-pre" style="height: calc(100vh - 150px)">{{ result.output || '(无输出)' }}</pre>
      </div>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { CommandResult } from '@/types'

const props = defineProps<{ result: CommandResult }>()
defineEmits<{ copy: [text: string] }>()

const showFull = ref(false)

const statusColor = computed(() => {
  if (props.result.status === 'Success' && props.result.exitCode === 0) return 'green'
  if (props.result.status === 'Running') return 'blue'
  return 'red'
})
</script>

<style scoped>
.output-pre {
  background: #0b1021;
  color: #d1d5db;
  padding: 12px;
  border-radius: 6px;
  max-height: 260px;
  overflow: auto;
  white-space: pre-wrap;
  margin: 0;
}
</style>
