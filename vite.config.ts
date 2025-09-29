import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  
  // 路径别名配置
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // 避免在前端打包解析到 Node-only SDK（会引用 'crypto' 等 Node 内置模块）
      'qiniu': resolve(__dirname, 'src/shims/empty.ts'),
      'aws-sdk': resolve(__dirname, 'src/shims/empty.ts')
    }
  },
  
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  
  // 构建优化
  build: {
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ['vue'],
          'ant-design-vue': ['ant-design-vue']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
