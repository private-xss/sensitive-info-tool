/**
 * Tauri API 调用封装
 * 用于调用 Rust 后端的 OSS API
 */

import { invoke } from '@tauri-apps/api/tauri'

// ===== OSS API Wrapper =====
export interface OssConfig {
  provider: string
  access_key: string
  secret_key: string
  region?: string
  endpoint?: string
  bucket?: string
}

export interface OssListParams {
  prefix?: string
  delimiter?: string
  max_keys?: number
}

export interface OssFileItem {
  key: string
  size: number
  last_modified?: string
  is_directory: boolean
}

export interface OssResult<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export async function ossListObjects(config: OssConfig, params?: OssListParams): Promise<OssResult<OssFileItem[]>> {
  try {
    const data = await invoke<OssResult<OssFileItem[]>>('oss_list_objects', { cfg: config, params })
    return data
  } catch (e: any) {
    return { success: false, error: e?.message || String(e) }
  }
}

export interface OssUploadParams {
  file_name: string
  file_data: number[] // Uint8Array as number[]
  content_type?: string
  path?: string
}

export interface OssDownloadParams {
  key: string
}

export interface OssDeleteParams {
  key: string
}

export interface OssCreateFolderParams {
  folder_name: string
  path?: string
}

export async function ossUploadFile(config: OssConfig, params: OssUploadParams): Promise<OssResult<string>> {
  try {
    const data = await invoke<OssResult<string>>('oss_upload_file', { cfg: config, params })
    return data
  } catch (e: any) {
    return { success: false, error: e?.message || String(e) }
  }
}

export async function ossDownloadFile(config: OssConfig, params: OssDownloadParams): Promise<OssResult<number[]>> {
  try {
    const data = await invoke<OssResult<number[]>>('oss_download_file', { cfg: config, params })
    return data
  } catch (e: any) {
    return { success: false, error: e?.message || String(e) }
  }
}

export async function ossDeleteFile(config: OssConfig, params: OssDeleteParams): Promise<OssResult<string>> {
  try {
    const data = await invoke<OssResult<string>>('oss_delete_file', { cfg: config, params })
    return data
  } catch (e: any) {
    return { success: false, error: e?.message || String(e) }
  }
}

export async function ossCreateFolder(config: OssConfig, params: OssCreateFolderParams): Promise<OssResult<string>> {
  try {
    const data = await invoke<OssResult<string>>('oss_create_folder', { cfg: config, params })
    return data
  } catch (e: any) {
    return { success: false, error: e?.message || String(e) }
  }
}

export interface OssBucketSummary {
  name: string
  creation_date?: string
}

export async function ossListBuckets(config: OssConfig): Promise<OssResult<OssBucketSummary[]>> {
  try {
    const data = await invoke<OssResult<OssBucketSummary[]>>('oss_list_buckets', { cfg: config })
    return data
  } catch (e: any) {
    return { success: false, error: e?.message || String(e) }
  }
}
