import { writeTextFile, readTextFile, removeFile, exists, readDir } from '@tauri-apps/api/fs'
import { join } from '@tauri-apps/api/path'

// 简单的加密/解密函数（实际项目中应使用更强的加密算法）
function simpleEncrypt(text: string, key: string): string {
  let result = ''
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  }
  return btoa(result)
}

function simpleDecrypt(encryptedText: string, key: string): string {
  const text = atob(encryptedText)
  let result = ''
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  }
  return result
}

const ENCRYPTION_KEY = 'sensitive-info-tool-key-2024'

export class SecureStorage {
  // 保存数据到本地文件
  static async saveData(key: string, data: any): Promise<void> {
    try {
      const encryptedData = simpleEncrypt(JSON.stringify(data), ENCRYPTION_KEY)
      const filePath = await join('data', `${key}.json`)
      await writeTextFile(filePath, encryptedData)
    } catch (error) {
      console.error('保存数据失败:', error)
      throw error
    }
  }

  // 从本地文件读取数据
  static async loadData(key: string): Promise<any> {
    try {
      const filePath = await join('data', `${key}.json`)
      const fileExists = await exists(filePath)
      if (!fileExists) return null
      
      const encryptedData = await readTextFile(filePath)
      const decryptedData = simpleDecrypt(encryptedData, ENCRYPTION_KEY)
      return JSON.parse(decryptedData)
    } catch (error) {
      console.error('读取数据失败:', error)
      return null
    }
  }

  // 删除数据
  static async deleteData(key: string): Promise<void> {
    try {
      const filePath = await join('data', `${key}.json`)
      const fileExists = await exists(filePath)
      if (fileExists) {
        await removeFile(filePath)
      }
    } catch (error) {
      console.error('删除数据失败:', error)
      throw error
    }
  }

  // 列出所有数据键
  static async listKeys(): Promise<string[]> {
    try {
      const dataDirExists = await exists('data')
      if (!dataDirExists) return []
      
      const entries = await readDir('data')
      return entries
        .filter(entry => entry.name?.endsWith('.json'))
        .map(entry => entry.name?.replace('.json', '') || '')
        .filter(name => name)
    } catch (error) {
      console.error('列出数据键失败:', error)
      return []
    }
  }
}

// 如果Tauri不可用，使用localStorage作为后备
export class LocalStorage {
  static async saveData(key: string, data: any): Promise<void> {
    try {
      const encryptedData = simpleEncrypt(JSON.stringify(data), ENCRYPTION_KEY)
      localStorage.setItem(key, encryptedData)
    } catch (error) {
      console.error('保存数据失败:', error)
      throw error
    }
  }

  static async loadData(key: string): Promise<any> {
    try {
      const encryptedData = localStorage.getItem(key)
      if (!encryptedData) return null
      const decryptedData = simpleDecrypt(encryptedData, ENCRYPTION_KEY)
      return JSON.parse(decryptedData)
    } catch (error) {
      console.error('读取数据失败:', error)
      return null
    }
  }

  static async deleteData(key: string): Promise<void> {
    localStorage.removeItem(key)
  }

  static async listKeys(): Promise<string[]> {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('sensitive_')) {
        keys.push(key)
      }
    }
    return keys
  }
}
