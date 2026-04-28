// 统一的API错误处理工具类

/**
 * API错误类型枚举
 */
export enum ApiErrorType {
  // 认证/签名错误
  AUTH_ERROR = 'AUTH_ERROR',
  // 网络连接错误
  NETWORK_ERROR = 'NETWORK_ERROR',
  // 业务逻辑错误
  BUSINESS_ERROR = 'BUSINESS_ERROR',
  // 参数错误
  PARAM_ERROR = 'PARAM_ERROR',
  // 未知错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * 统一的API错误类
 */
export class ApiError extends Error {
  public readonly type: ApiErrorType;
  public readonly code: string | number;
  public readonly originalError?: Error;
  public readonly provider: string;

  constructor(
    message: string,
    type: ApiErrorType,
    code: string | number,
    provider: string,
    originalError?: Error
  ) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.code = code;
    this.provider = provider;
    this.originalError = originalError;
  }
}

/**
 * 错误处理工具类
 */
export class ApiErrorHandler {
  /**
   * 解析HTTP状态码错误
   */
  static parseHttpError(status: number, provider: string): ApiError {
    switch (status) {
      case 401:
      case 403:
        return new ApiError(
          `认证失败: 请检查 ${provider} 的密钥配置是否正确`,
          ApiErrorType.AUTH_ERROR,
          status,
          provider
        );
      case 400:
        return new ApiError(
          `请求参数错误: 请检查 ${provider} 的请求参数`,
          ApiErrorType.PARAM_ERROR,
          status,
          provider
        );
      case 404:
        return new ApiError(
          `资源不存在: ${provider} API端点可能已变更`,
          ApiErrorType.BUSINESS_ERROR,
          status,
          provider
        );
      case 429:
        return new ApiError(
          `请求过于频繁: ${provider} API限流，请稍后重试`,
          ApiErrorType.BUSINESS_ERROR,
          status,
          provider
        );
      case 500:
      case 502:
      case 503:
        return new ApiError(
          `${provider} 服务暂时不可用，请稍后重试`,
          ApiErrorType.NETWORK_ERROR,
          status,
          provider
        );
      default:
        return new ApiError(
          `HTTP错误 ${status}: ${provider} 请求失败`,
          ApiErrorType.UNKNOWN_ERROR,
          status,
          provider
        );
    }
  }

  /**
   * 解析钉钉API错误
   */
  static parseDingTalkError(errcode: number, errmsg: string): ApiError {
    const provider = '钉钉';
    
    // 常见错误码映射
    const authErrors = [40001, 40014, 40078, 88];
    const paramErrors = [40035, 40058, 40060];
    
    if (authErrors.includes(errcode)) {
      return new ApiError(
        `${provider}认证失败: ${errmsg}`,
        ApiErrorType.AUTH_ERROR,
        errcode,
        provider
      );
    }
    
    if (paramErrors.includes(errcode)) {
      return new ApiError(
        `${provider}参数错误: ${errmsg}`,
        ApiErrorType.PARAM_ERROR,
        errcode,
        provider
      );
    }
    
    return new ApiError(
      `${provider}业务错误: ${errmsg}`,
      ApiErrorType.BUSINESS_ERROR,
      errcode,
      provider
    );
  }

  /**
   * 解析企业微信API错误
   */
  static parseEnterpriseWeChatError(errcode: number, errmsg: string): ApiError {
    const provider = '企业微信';
    
    const authErrors = [40001, 40014, 42001, 40056];
    const paramErrors = [40003, 40035, 40058];
    
    if (authErrors.includes(errcode)) {
      return new ApiError(
        `${provider}认证失败: ${errmsg}`,
        ApiErrorType.AUTH_ERROR,
        errcode,
        provider
      );
    }
    
    if (paramErrors.includes(errcode)) {
      return new ApiError(
        `${provider}参数错误: ${errmsg}`,
        ApiErrorType.PARAM_ERROR,
        errcode,
        provider
      );
    }
    
    return new ApiError(
      `${provider}业务错误: ${errmsg}`,
      ApiErrorType.BUSINESS_ERROR,
      errcode,
      provider
    );
  }

  /**
   * 解析飞书API错误
   */
  static parseFeishuError(code: number, msg: string): ApiError {
    const provider = '飞书';
    
    const authErrors = [99991663, 99991664, 99991665];
    const paramErrors = [99991400, 99991401];
    
    if (authErrors.includes(code)) {
      return new ApiError(
        `${provider}认证失败: ${msg}`,
        ApiErrorType.AUTH_ERROR,
        code,
        provider
      );
    }
    
    if (paramErrors.includes(code)) {
      return new ApiError(
        `${provider}参数错误: ${msg}`,
        ApiErrorType.PARAM_ERROR,
        code,
        provider
      );
    }
    
    return new ApiError(
      `${provider}业务错误: ${msg}`,
      ApiErrorType.BUSINESS_ERROR,
      code,
      provider
    );
  }

  /**
   * 解析微信API错误
   */
  static parseWeChatError(errcode: number, errmsg: string): ApiError {
    const provider = '微信';
    
    const authErrors = [40001, 40014, 42001, 40125];
    const paramErrors = [40003, 40035, 40066];
    
    if (authErrors.includes(errcode)) {
      return new ApiError(
        `${provider}认证失败: ${errmsg}`,
        ApiErrorType.AUTH_ERROR,
        errcode,
        provider
      );
    }
    
    if (paramErrors.includes(errcode)) {
      return new ApiError(
        `${provider}参数错误: ${errmsg}`,
        ApiErrorType.PARAM_ERROR,
        errcode,
        provider
      );
    }
    
    return new ApiError(
      `${provider}业务错误: ${errmsg}`,
      ApiErrorType.BUSINESS_ERROR,
      errcode,
      provider
    );
  }

  /**
   * 解析网络错误
   */
  static parseNetworkError(error: Error, provider: string): ApiError {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return new ApiError(
        `网络连接失败: 无法连接到 ${provider} 服务器`,
        ApiErrorType.NETWORK_ERROR,
        'NETWORK_ERROR',
        provider,
        error
      );
    }
    
    if (message.includes('timeout')) {
      return new ApiError(
        `请求超时: ${provider} 服务器响应超时`,
        ApiErrorType.NETWORK_ERROR,
        'TIMEOUT',
        provider,
        error
      );
    }
    
    if (message.includes('cors')) {
      return new ApiError(
        `跨域错误: 请确保在Tauri环境中运行`,
        ApiErrorType.NETWORK_ERROR,
        'CORS_ERROR',
        provider,
        error
      );
    }
    
    return new ApiError(
      `未知错误: ${error.message}`,
      ApiErrorType.UNKNOWN_ERROR,
      'UNKNOWN',
      provider,
      error
    );
  }

  /**
   * 获取用户友好的错误提示
   */
  static getUserFriendlyMessage(error: ApiError): string {
    switch (error.type) {
      case ApiErrorType.AUTH_ERROR:
        return `🔐 ${error.message}\n\n建议:\n1. 检查密钥是否正确\n2. 确认密钥是否过期\n3. 验证权限配置`;
      case ApiErrorType.NETWORK_ERROR:
        return `🌐 ${error.message}\n\n建议:\n1. 检查网络连接\n2. 确认在Tauri应用中运行\n3. 稍后重试`;
      case ApiErrorType.PARAM_ERROR:
        return `⚠️ ${error.message}\n\n建议:\n1. 检查输入参数\n2. 确认参数格式正确`;
      case ApiErrorType.BUSINESS_ERROR:
        return `❌ ${error.message}`;
      default:
        return `❓ ${error.message}`;
    }
  }
}
