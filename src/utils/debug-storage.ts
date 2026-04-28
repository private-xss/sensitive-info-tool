import { SimpleStorage } from './storage-simple'

// 调试存储工具
export class DebugStorage {
  // 检查存储状态
  static async checkStorageStatus() {
    try {
      console.log('=== 存储状态检查 ===')
      
      // 检查localStorage
      const cachedData = localStorage.getItem('cloud_oss_configs')
      console.log('localStorage缓存:', cachedData ? '存在' : '不存在')
      
      // 检查文件存储
      const fileData = await SimpleStorage.loadData('cloud_oss_configs')
      console.log('文件存储数据:', fileData)
      console.log('数据类型:', typeof fileData)
      console.log('数据长度:', Array.isArray(fileData) ? fileData.length : '不是数组')
      
      if (Array.isArray(fileData)) {
        console.log('配置详情:')
        fileData.forEach((config, index) => {
          console.log(`配置${index + 1}:`, {
            id: config.id,
            name: config.name,
            provider: config.provider,
            hasAccessKey: !!config.accessKey,
            hasSecretKey: !!config.secretKey
          })
        })
      }
      
      return {
        hasLocalStorage: !!cachedData,
        hasFileData: !!fileData,
        dataType: typeof fileData,
        dataLength: Array.isArray(fileData) ? fileData.length : 0,
        data: fileData
      }
    } catch (error) {
      console.error('存储状态检查失败:', error)
      return {
        error: error.message || error
      }
    }
  }
  
  // 测试存储读写
  static async testStorageReadWrite() {
    try {
      console.log('=== 存储读写测试 ===')
      
      // 测试数据
      const testData = [
        {
          id: 'test-1',
          name: '测试配置',
          provider: 'aliyun',
          accessKey: 'test-key',
          secretKey: 'test-secret',
          createdAt: new Date().toISOString()
        }
      ]
      
      // 写入测试
      console.log('写入测试数据...')
      await SimpleStorage.saveData('test_oss_configs', testData)
      console.log('写入成功')
      
      // 读取测试
      console.log('读取测试数据...')
      const readData = await SimpleStorage.loadData('test_oss_configs')
      console.log('读取结果:', readData)
      
      // 清理测试数据
      await SimpleStorage.deleteData('test_oss_configs')
      console.log('测试数据已清理')
      
      return {
        success: true,
        readData
      }
    } catch (error) {
      console.error('存储读写测试失败:', error)
      return {
        success: false,
        error: error.message || error
      }
    }
  }
  
  // 列出所有存储键
  static async listAllKeys() {
    try {
      console.log('=== 所有存储键 ===')
      const keys = await SimpleStorage.listKeys()
      console.log('存储键列表:', keys)
      return keys
    } catch (error) {
      console.error('列出存储键失败:', error)
      return []
    }
  }
}

// 在开发环境中自动暴露调试工具
if (import.meta.env.DEV) {
  (window as any).DebugStorage = DebugStorage
  console.log('调试工具已加载，使用 window.DebugStorage 访问')
}
