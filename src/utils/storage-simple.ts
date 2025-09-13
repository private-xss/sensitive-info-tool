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
    console.error('加密失败:', error)
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
    console.error('解密失败:', error)
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
  // 保存数据到localStorage
  static async saveData(key: string, data: any): Promise<void> {
    try {
      const encryptedData = simpleEncrypt(JSON.stringify(data), ENCRYPTION_KEY)
      localStorage.setItem(key, encryptedData)
      console.log('数据保存成功:', key)
    } catch (error) {
      console.error('保存数据失败:', error)
      throw error
    }
  }

  // 从localStorage读取数据
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

  // 删除数据
  static async deleteData(key: string): Promise<void> {
    try {
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
      const keys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('sensitive_')) {
          keys.push(key)
        }
      }
      return keys
    } catch (error) {
      console.error('列出数据键失败:', error)
      return []
    }
  }
}
