import { invoke } from '@tauri-apps/api/tauri'

// 简单的加密/解密函数 - 支持中文
function simpleEncrypt(text: string, key: string): string {
  try {
    // 使用encodeURIComponent处理中文字符
    const encodedText = encodeURIComponent(text)
    let result = ''
    for (let i = 0; i < encodedText.length; i++) {
      result += String.fromCharCode(encodedText.charCodeAt(i) ^ key.charCodeAt(i % key.length))
    }
    return btoa(result)
  } catch (error) {
    // 如果加密失败，直接返回base64编码
    return btoa(encodeURIComponent(text))
  }
}

function simpleDecrypt(encryptedText: string, key: string): string {
  try {
    const text = atob(encryptedText)
    let result = ''
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length))
    }
    return decodeURIComponent(result)
  } catch (error) {
    // 如果解密失败，尝试直接解码
    try {
      return decodeURIComponent(atob(encryptedText))
    } catch {
      return encryptedText
    }
  }
}

const ENCRYPTION_KEY = 'sensitive-info-tool-key-2024'

export class SimpleStorage {
  // 获取数据文件路径
  private static async getDataFilePath(key: string): Promise<string> {
    try {
      const homeDir = await invoke<string>('get_home_dir')
      return `${homeDir}/.sensitive-info-tool/${key}.json`
    } catch (error) {
      console.error('获取数据文件路径失败:', error)
      throw error
    }
  }

  // 确保数据目录存在
  private static async ensureDataDir(): Promise<void> {
    try {
      await invoke('ensure_data_dir')
    } catch (error) {
      console.error('创建数据目录失败:', error)
      throw error
    }
  }

  // 保存数据到文件
  static async saveData(key: string, data: any): Promise<void> {
    try {
      await this.ensureDataDir()
      const filePath = await this.getDataFilePath(key)
      const encryptedData = simpleEncrypt(JSON.stringify(data), ENCRYPTION_KEY)
      
      await invoke('write_data_file', { 
        filePath, 
        data: encryptedData 
      })
      
      // 同时保存到localStorage作为缓存
      localStorage.setItem(key, encryptedData)
      console.log('数据保存成功:', key)
    } catch (error) {
      console.error('保存数据失败:', error)
      throw error
    }
  }

  // 从文件读取数据
  static async loadData(key: string): Promise<any> {
    try {
      // 首先尝试从localStorage读取缓存
      const cachedData = localStorage.getItem(key)
      if (cachedData) {
        try {
          const decryptedData = simpleDecrypt(cachedData, ENCRYPTION_KEY)
          return JSON.parse(decryptedData)
        } catch {
          // 缓存数据损坏，继续从文件读取
        }
      }

      // 从文件读取数据
      const filePath = await this.getDataFilePath(key)
      const encryptedData = await invoke<string>('read_data_file', { filePath })
      
      if (!encryptedData) return null
      
      const decryptedData = simpleDecrypt(encryptedData, ENCRYPTION_KEY)
      const parsedData = JSON.parse(decryptedData)
      
      // 更新缓存
      localStorage.setItem(key, encryptedData)
      
      return parsedData
    } catch (error) {
      console.error('读取数据失败:', error)
      return null
    }
  }

  // 删除数据
  static async deleteData(key: string): Promise<void> {
    try {
      const filePath = await this.getDataFilePath(key)
      await invoke('delete_data_file', { filePath })
      localStorage.removeItem(key)
      console.log('数据删除成功:', key)
    } catch (error) {
      console.error('删除数据失败:', error)
      throw error
    }
  }

  // 列出所有数据键
  static async listKeys(): Promise<string[]> {
    try {
      const keys = await invoke<string[]>('list_data_files')
      return keys
    } catch (error) {
      console.error('列出数据键失败:', error)
      return []
    }
  }
}
