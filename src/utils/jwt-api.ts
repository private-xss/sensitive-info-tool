// JWT 工具 API - 支持编码、解码、校验、密钥爆破
import { invoke } from '@tauri-apps/api/tauri'

// JWT Header 类型
export interface JwtHeader {
  alg: string
  typ: string
  kid?: string
}

// JWT 解码结果
export interface JwtDecodeResult {
  header: JwtHeader
  payload: Record<string, any>
  signature: string
  headerRaw: string
  payloadRaw: string
  isValidFormat: boolean
  errors: string[]
}

// JWT 编码选项
export interface JwtEncodeOptions {
  algorithm: string
  secret: string
  payload: Record<string, any>
  header?: Partial<JwtHeader>
  expiresIn?: number // 秒
}

// JWT 校验结果
export interface JwtVerifyResult {
  valid: boolean
  error?: string
  algorithm?: string
  expired?: boolean
  expiresAt?: string
  issuedAt?: string
  notBefore?: string
}

// JWT 爆破结果
export interface JwtCrackResult {
  found: boolean
  secret?: string
  algorithm?: string
  triedCount: number
  totalCount: number
  elapsedTime: number // 毫秒
  progress: number // 0-100
}

// 支持的 JWT 算法
export const JWT_ALGORITHMS = [
  // HMAC 对称加密
  'HS256', 'HS384', 'HS512',
  // RSA 非对称加密
  'RS256', 'RS384', 'RS512',
  // ECDSA 椭圆曲线
  'ES256', 'ES384', 'ES512',
  // EdDSA
  'EdDSA',
  // 无签名
  'none'
]

// HMAC 算法（支持密钥爆破）
export const HMAC_ALGORITHMS = ['HS256', 'HS384', 'HS512']

export class JwtAPI {
  /**
   * Base64URL 编码
   */
  private static base64UrlEncode(str: string): string {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }

  /**
   * Base64URL 解码
   */
  private static base64UrlDecode(str: string): string {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
    const pad = base64.length % 4
    if (pad) {
      base64 += '='.repeat(4 - pad)
    }
    return atob(base64)
  }

  /**
   * 解码 JWT Token（不验证签名）
   */
  static decode(token: string): JwtDecodeResult {
    const errors: string[] = []
    const parts = token.split('.')

    if (parts.length !== 3) {
      return {
        header: { alg: 'unknown', typ: 'JWT' },
        payload: {},
        signature: '',
        headerRaw: '',
        payloadRaw: '',
        isValidFormat: false,
        errors: [`JWT 格式错误: 应有3部分(用.分隔)，实际有${parts.length}部分`]
      }
    }

    let header: JwtHeader = { alg: 'unknown', typ: 'JWT' }
    let payload: Record<string, any> = {}
    let headerRaw = ''
    let payloadRaw = ''

    try {
      headerRaw = this.base64UrlDecode(parts[0])
      header = JSON.parse(headerRaw)
    } catch (e) {
      errors.push(`Header 解码失败: ${e}`)
    }

    try {
      payloadRaw = this.base64UrlDecode(parts[1])
      payload = JSON.parse(payloadRaw)
    } catch (e) {
      errors.push(`Payload 解码失败: ${e}`)
    }

    return {
      header,
      payload,
      signature: parts[2],
      headerRaw,
      payloadRaw,
      isValidFormat: errors.length === 0,
      errors
    }
  }

  /**
   * 编码 JWT Token（仅支持 HMAC 算法在前端实现）
   */
  static async encode(options: JwtEncodeOptions): Promise<string> {
    const { algorithm, secret, payload, header, expiresIn } = options

    // 构造 header
    const jwtHeader: JwtHeader = {
      alg: algorithm,
      typ: 'JWT',
      ...header
    }

    // 构造 payload
    const now = Math.floor(Date.now() / 1000)
    const jwtPayload: Record<string, any> = {
      iat: now,
      ...payload
    }
    if (expiresIn) {
      jwtPayload.exp = now + expiresIn
    }

    const headerB64 = this.base64UrlEncode(JSON.stringify(jwtHeader))
    const payloadB64 = this.base64UrlEncode(JSON.stringify(jwtPayload))

    if (algorithm === 'none') {
      return `${headerB64}.${payloadB64}.`
    }

    // 对于 HMAC 算法，使用 Web Crypto API
    if (algorithm.startsWith('HS')) {
      const signingInput = `${headerB64}.${payloadB64}`
      const signature = await this.hmacSign(algorithm, secret, signingInput)
      return `${signingInput}.${signature}`
    }

    // 对于 RSA/ECDSA 算法，需要 PEM 格式密钥
    if (algorithm.startsWith('RS') || algorithm.startsWith('ES') || algorithm === 'EdDSA') {
      const signingInput = `${headerB64}.${payloadB64}`
      const signature = await this.asymmetricSign(algorithm, secret, signingInput)
      return `${signingInput}.${signature}`
    }

    throw new Error(`不支持的算法: ${algorithm}`)
  }

  /**
   * HMAC 签名
   */
  private static async hmacSign(algorithm: string, secret: string, data: string): Promise<string> {
    const algoMap: Record<string, string> = {
      'HS256': 'SHA-256',
      'HS384': 'SHA-384',
      'HS512': 'SHA-512'
    }
    const cryptoAlgo = algoMap[algorithm]
    if (!cryptoAlgo) throw new Error(`不支持的 HMAC 算法: ${algorithm}`)

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: cryptoAlgo },
      false,
      ['sign']
    )
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
    return this.arrayBufferToBase64Url(signature)
  }

  /**
   * 非对称签名 (RSA/ECDSA)
   */
  private static async asymmetricSign(algorithm: string, privateKeyPem: string, data: string): Promise<string> {
    const encoder = new TextEncoder()

    if (algorithm.startsWith('RS')) {
      const hashMap: Record<string, string> = {
        'RS256': 'SHA-256',
        'RS384': 'SHA-384',
        'RS512': 'SHA-512'
      }
      const key = await crypto.subtle.importKey(
        'pkcs8',
        this.pemToArrayBuffer(privateKeyPem),
        { name: 'RSASSA-PKCS1-v1_5', hash: hashMap[algorithm] },
        false,
        ['sign']
      )
      const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(data))
      return this.arrayBufferToBase64Url(signature)
    }

    if (algorithm.startsWith('ES')) {
      const curveMap: Record<string, string> = {
        'ES256': 'P-256',
        'ES384': 'P-384',
        'ES512': 'P-521'
      }
      const key = await crypto.subtle.importKey(
        'pkcs8',
        this.pemToArrayBuffer(privateKeyPem),
        { name: 'ECDSA', namedCurve: curveMap[algorithm] },
        false,
        ['sign']
      )
      const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: algorithm === 'ES256' ? 'SHA-256' : algorithm === 'ES384' ? 'SHA-384' : 'SHA-512' },
        key,
        encoder.encode(data)
      )
      return this.arrayBufferToBase64Url(signature)
    }

    throw new Error(`不支持的算法: ${algorithm}`)
  }

  /**
   * 校验 JWT Token
   */
  static async verify(token: string, secret: string, algorithm?: string): Promise<JwtVerifyResult> {
    const decoded = this.decode(token)
    if (!decoded.isValidFormat) {
      return { valid: false, error: 'JWT 格式无效' }
    }

    const alg = algorithm || decoded.header.alg

    // none 算法
    if (alg === 'none') {
      return this.checkExpiration(decoded.payload)
    }

    // HMAC 验证
    if (alg.startsWith('HS')) {
      try {
        const parts = token.split('.')
        const signingInput = `${parts[0]}.${parts[1]}`
        const expectedSignature = await this.hmacSign(alg, secret, signingInput)
        const valid = expectedSignature === parts[2]
        if (!valid) {
          return { valid: false, error: '签名验证失败', algorithm: alg }
        }
        return {
          valid: true,
          algorithm: alg,
          ...this.checkExpiration(decoded.payload)
        }
      } catch (e) {
        return { valid: false, error: `验证失败: ${e}`, algorithm: alg }
      }
    }

    // RSA/ECDSA 验证
    if (alg.startsWith('RS') || alg.startsWith('ES')) {
      try {
        const parts = token.split('.')
        const signingInput = `${parts[0]}.${parts[1]}`
        const valid = await this.asymmetricVerify(alg, secret, signingInput, parts[2])
        if (!valid) {
          return { valid: false, error: '签名验证失败', algorithm: alg }
        }
        return {
          valid: true,
          algorithm: alg,
          ...this.checkExpiration(decoded.payload)
        }
      } catch (e) {
        return { valid: false, error: `验证失败: ${e}`, algorithm: alg }
      }
    }

    return { valid: false, error: `不支持的算法: ${alg}` }
  }

  /**
   * 非对称验签
   */
  private static async asymmetricVerify(algorithm: string, publicKeyPem: string, data: string, signatureB64: string): Promise<boolean> {
    const encoder = new TextEncoder()
    const signatureBuffer = this.base64UrlToArrayBuffer(signatureB64)

    if (algorithm.startsWith('RS')) {
      const hashMap: Record<string, string> = {
        'RS256': 'SHA-256',
        'RS384': 'SHA-384',
        'RS512': 'SHA-512'
      }
      const key = await crypto.subtle.importKey(
        'spki',
        this.pemToArrayBuffer(publicKeyPem),
        { name: 'RSASSA-PKCS1-v1_5', hash: hashMap[algorithm] },
        false,
        ['verify']
      )
      return crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signatureBuffer, encoder.encode(data))
    }

    if (algorithm.startsWith('ES')) {
      const curveMap: Record<string, string> = {
        'ES256': 'P-256',
        'ES384': 'P-384',
        'ES512': 'P-521'
      }
      const key = await crypto.subtle.importKey(
        'spki',
        this.pemToArrayBuffer(publicKeyPem),
        { name: 'ECDSA', namedCurve: curveMap[algorithm] },
        false,
        ['verify']
      )
      return crypto.subtle.verify(
        { name: 'ECDSA', hash: algorithm === 'ES256' ? 'SHA-256' : algorithm === 'ES384' ? 'SHA-384' : 'SHA-512' },
        key,
        signatureBuffer,
        encoder.encode(data)
      )
    }

    return false
  }

  /**
   * 检查过期时间
   */
  private static checkExpiration(payload: Record<string, any>): { expired?: boolean; expiresAt?: string; issuedAt?: string; notBefore?: string } {
    const result: any = {}
    const now = Math.floor(Date.now() / 1000)

    if (payload.exp) {
      result.expiresAt = new Date(payload.exp * 1000).toLocaleString()
      result.expired = now > payload.exp
    }
    if (payload.iat) {
      result.issuedAt = new Date(payload.iat * 1000).toLocaleString()
    }
    if (payload.nbf) {
      result.notBefore = new Date(payload.nbf * 1000).toLocaleString()
    }

    return result
  }

  /**
   * 密钥爆破 - 使用密码本
   */
  static async crack(
    token: string,
    algorithms: string[] = HMAC_ALGORITHMS,
    onProgress?: (result: JwtCrackResult) => void
  ): Promise<JwtCrackResult> {
    const decoded = this.decode(token)
    if (!decoded.isValidFormat) {
      return {
        found: false,
        triedCount: 0,
        totalCount: 0,
        elapsedTime: 0,
        progress: 0
      }
    }

    // 读取密码本
    let wordlist: string[]
    try {
      wordlist = await this.loadWordlist()
    } catch (e) {
      throw new Error(`加载密码本失败: ${e}`)
    }

    const startTime = Date.now()
    const totalCount = wordlist.length * algorithms.length
    let triedCount = 0

    for (const alg of algorithms) {
      for (let i = 0; i < wordlist.length; i++) {
        const secret = wordlist[i]
        triedCount++

        try {
          const result = await this.verify(token, secret, alg)
          if (result.valid) {
            const elapsedTime = Date.now() - startTime
            const crackResult: JwtCrackResult = {
              found: true,
              secret,
              algorithm: alg,
              triedCount,
              totalCount,
              elapsedTime,
              progress: Math.round((triedCount / totalCount) * 100)
            }
            onProgress?.(crackResult)
            return crackResult
          }
        } catch {
          // 忽略验证错误，继续尝试
        }

        // 每100次报告一次进度
        if (onProgress && triedCount % 100 === 0) {
          onProgress({
            found: false,
            triedCount,
            totalCount,
            elapsedTime: Date.now() - startTime,
            progress: Math.round((triedCount / totalCount) * 100)
          })
        }

        // 让出主线程，避免UI卡死
        if (triedCount % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0))
        }
      }
    }

    return {
      found: false,
      triedCount,
      totalCount,
      elapsedTime: Date.now() - startTime,
      progress: 100
    }
  }

  /**
   * 加载密码本
   */
  static async loadWordlist(): Promise<string[]> {
    try {
      // 首先尝试从 ~/.sensitive-info-tool/jwt.txt 读取
      const homeDir = await invoke<string>('get_home_dir')
      const filePath = `${homeDir}/.sensitive-info-tool/jwt.txt`
      const content = await invoke<string>('read_data_file', { filePath })
      return content.split('\n').filter(line => line.trim() !== '')
    } catch {
      // 如果密码本不存在，返回内置的常用密码
      return this.getBuiltInWordlist()
    }
  }

  /**
   * 内置常用密码本（精简版）
   */
  private static getBuiltInWordlist(): string[] {
    return [
      'secret', 'password', '123456', '12345678', 'qwerty', 'abc123',
      'monkey', 'master', 'dragon', 'login', 'princess', 'hello',
      'charlie', 'donald', 'shadow', 'sunshine', 'trustno1', 'iloveyou',
      'supersecret', 'mysecret', 'jwtsecret', 'token', 'key', 'private',
      'public', 'admin', 'root', 'test', 'dev', 'development',
      'production', 'staging', 'default', 'changeit', 'changeme',
      'passw0rd', 'p@ssw0rd', 'P@ssw0rd', 'secretkey', 'secret_key',
      'secretkey123', 'mysecretkey', 'jwt_key', 'jwt_secret',
      'signingkey', 'signing_key', 'signkey', 'sign_key',
      'hmac_secret', 'hmacsecret', 'access_token_secret',
      'refresh_token_secret', 'app_secret', 'app_secret_key',
      'your-256-bit-secret', 'your-384-bit-secret', 'your-512-bit-secret',
      'shared-secret', 'shared_secret', 'ssh-key', 'rsa-key',
      'ecdsa-key', 'eddsa-key', 'none', 'null', 'undefined',
      'true', 'false', '0', '1', '1234', '12345', '123456789',
      '1234567890', 'qwerty123', 'letmein', 'welcome', 'football',
      'baseball', 'soccer', 'hockey', 'batman', 'superman',
      '!@#$%', '!@#$%^', '!@#$%^&', '!@#$%^&*', 'q1w2e3r4',
      'q1w2e3r4t5', '1q2w3e4r', '1q2w3e4r5t', 'zaq1xsw2',
      'p0o9i8u7', 'm1n2b3v4', 'a1s2d3f4', 'z1x2c3v4',
    ]
  }

  /**
   * 初始化密码本 - 将项目中的 jwt.txt 复制到数据目录
   */
  static async initWordlist(): Promise<void> {
    try {
      const homeDir = await invoke<string>('get_home_dir')
      const targetPath = `${homeDir}/.sensitive-info-tool/jwt.txt`

      // 检查目标是否已存在
      try {
        await invoke<string>('read_data_file', { filePath: targetPath })
        // 已存在，不需要复制
        return
      } catch {
        // 不存在，需要复制
      }

      // 确保数据目录存在
      await invoke('ensure_data_dir')

      // 从项目目录读取 jwt.txt
      // 由于 Tauri 有文件系统访问权限，可以直接读取
      const projectPath = `${homeDir}/Desktop/audit/apitools/sensitive-info-tool-tauri/jwt.txt`
      try {
        const content = await invoke<string>('read_data_file', { filePath: projectPath })
        await invoke('write_data_file', { filePath: targetPath, data: content })
      } catch {
        // 如果项目目录读取失败，写入内置密码本
        const builtIn = this.getBuiltInWordlist().join('\n')
        await invoke('write_data_file', { filePath: targetPath, data: builtIn })
      }
    } catch (e) {
      console.error('初始化密码本失败:', e)
    }
  }

  /**
   * 检查密码本是否已初始化
   */
  static async isWordlistInitialized(): Promise<boolean> {
    try {
      const homeDir = await invoke<string>('get_home_dir')
      const filePath = `${homeDir}/.sensitive-info-tool/jwt.txt`
      await invoke<string>('read_data_file', { filePath })
      return true
    } catch {
      return false
    }
  }

  /**
   * 获取密码本行数
   */
  static async getWordlistCount(): Promise<number> {
    try {
      const wordlist = await this.loadWordlist()
      return wordlist.length
    } catch {
      return 0
    }
  }

  // ===== 工具方法 =====

  private static arrayBufferToBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }

  private static base64UrlToArrayBuffer(b64url: string): ArrayBuffer {
    let base64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
    const pad = base64.length % 4
    if (pad) {
      base64 += '='.repeat(4 - pad)
    }
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }

  private static pemToArrayBuffer(pem: string): ArrayBuffer {
    const b64 = pem
      .replace(/-----BEGIN.*?-----/g, '')
      .replace(/-----END.*?-----/g, '')
      .replace(/\s/g, '')
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }

  /**
   * 格式化 JWT 时间戳
   */
  static formatTimestamp(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString('zh-CN')
  }

  /**
   * 生成随机密钥
   */
  static generateSecret(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    return Array.from(array, byte => chars[byte % chars.length]).join('')
  }
}
