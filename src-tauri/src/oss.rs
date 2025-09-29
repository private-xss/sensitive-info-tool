use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use s3::bucket::Bucket;
use s3::creds::Credentials;
use s3::region::Region;
use tauri::command;
use std::str::FromStr;
use std::borrow::Cow;
use std::time::Duration;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OssConfig {
    pub provider: String,
    pub access_key: String,
    pub secret_key: String,
    pub region: Option<String>,
    pub endpoint: Option<String>,
    pub bucket: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OssListParams {
    pub prefix: Option<String>,
    pub delimiter: Option<String>,
    pub max_keys: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OssFileItem {
    pub key: String,
    pub size: u64,
    pub last_modified: Option<String>,
    pub is_directory: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OssResult<T> {
    pub success: bool,
    pub data: Option<T>,
    pub message: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OssUploadParams {
    pub file_name: String,
    pub file_data: Vec<u8>,
    pub content_type: Option<String>,
    pub path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OssDownloadParams {
    pub key: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OssDeleteParams {
    pub key: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OssCreateFolderParams {
    pub folder_name: String,
    pub path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OssBucketSummary {
    pub name: String,
    pub creation_date: Option<String>,
}

fn resolve_region_and_endpoint(cfg: &OssConfig) -> Result<(Region, Option<String>), String> {
    // 如果用户提供了自定义endpoint，优先使用
    if let Some(ep) = &cfg.endpoint {
        let region = Region::Custom {
            region: cfg.region.clone().unwrap_or_else(|| "custom".to_string()),
            endpoint: ep.clone(),
        };
        return Ok((region, Some(ep.clone())));
    }

    // 根据云厂商自动生成endpoint
    let (region, endpoint) = match cfg.provider.as_str() {
        "aws" => {
            let region_name = cfg.region.clone().unwrap_or_else(|| "us-east-1".to_string());
            (Region::from_str(&region_name).map_err(|e| e.to_string())?, None)
        }
        "aliyun" => {
            let region_name = cfg.region.clone().unwrap_or_else(|| "oss-cn-hangzhou".to_string());
            let endpoint = format!("https://{}.aliyuncs.com", region_name);
            (Region::Custom { region: region_name, endpoint: endpoint.clone() }, Some(endpoint))
        }
        "tencent" => {
            let region_name = cfg.region.clone().unwrap_or_else(|| "ap-beijing".to_string());
            let endpoint = format!("https://cos.{}.myqcloud.com", region_name);
            (Region::Custom { region: region_name, endpoint: endpoint.clone() }, Some(endpoint))
        }
        "huawei" => {
            let region_name = cfg.region.clone().unwrap_or_else(|| "cn-north-1".to_string());
            let endpoint = format!("https://obs.{}.myhuaweicloud.com", region_name);
            (Region::Custom { region: region_name, endpoint: endpoint.clone() }, Some(endpoint))
        }
        "qiniu" => {
            let region_name = cfg.region.clone().unwrap_or_else(|| "z0".to_string());
            let endpoint = match region_name.as_str() {
                "z0" => "https://s3-cn-east-1.qiniucs.com".to_string(),
                "z1" => "https://s3-cn-north-1.qiniucs.com".to_string(),
                "z2" => "https://s3-cn-south-1.qiniucs.com".to_string(),
                "na0" => "https://s3-us-north-1.qiniucs.com".to_string(),
                "as0" => "https://s3-ap-southeast-1.qiniucs.com".to_string(),
                _ => format!("https://s3-{}.qiniucs.com", region_name),
            };
            (Region::Custom { region: region_name, endpoint: endpoint.clone() }, Some(endpoint))
        }
        "jdcloud" => {
            let region_name = cfg.region.clone().unwrap_or_else(|| "cn-north-1".to_string());
            let endpoint = format!("https://s3.{}.jdcloud-oss.com", region_name);
            (Region::Custom { region: region_name, endpoint: endpoint.clone() }, Some(endpoint))
        }
        "ksyun" => {
            let region_name = cfg.region.clone().unwrap_or_else(|| "cn-beijing-6".to_string());
            let endpoint = format!("https://ks3-{}.ksyuncs.com", region_name);
            (Region::Custom { region: region_name, endpoint: endpoint.clone() }, Some(endpoint))
        }
        "qingcloud" => {
            let region_name = cfg.region.clone().unwrap_or_else(|| "pek3a".to_string());
            let endpoint = format!("https://s3.{}.qingstor.com", region_name);
            (Region::Custom { region: region_name, endpoint: endpoint.clone() }, Some(endpoint))
        }
        "minio" => {
            let endpoint = "http://localhost:9000".to_string();
            (Region::Custom { region: "us-east-1".to_string(), endpoint: endpoint.clone() }, Some(endpoint))
        }
        _ => return Err(format!("不支持的云厂商: {}", cfg.provider)),
    };

    Ok((region, endpoint))
}

fn build_bucket(cfg: &OssConfig) -> Result<Bucket, String> {
    let bucket_name = cfg
        .bucket
        .clone()
        .ok_or_else(|| "Missing bucket name".to_string())?;

    let (region, _endpoint) = resolve_region_and_endpoint(cfg)?;

    let credentials = Credentials::new(
        Some(&cfg.access_key),
        Some(&cfg.secret_key),
        None,
        None,
        None,
    )
    .map_err(|e| e.to_string())?;

    let mut bucket = Bucket::new(&bucket_name, region, credentials).map_err(|e| e.to_string())?;
    // 设置底层请求超时，避免长时间挂起
    bucket.set_request_timeout(Some(Duration::from_secs(12)));
    Ok(bucket)
}

#[command]
pub async fn oss_list_buckets(cfg: OssConfig) -> Result<OssResult<Vec<OssBucketSummary>>, String> {
    // 使用 rust-s3 的关联函数 Bucket::list_buckets(region, creds)
    let mut cfg_mut = cfg.clone();
    
    // 为腾讯云等厂商使用特殊的 ListBuckets 端点
    let (mut region, _) = match cfg_mut.provider.as_str() {
        "tencent" => {
            // 腾讯云 ListBuckets 使用服务端点，需要指定区域
            let region_name = cfg_mut.region.clone().unwrap_or_else(|| "ap-beijing".to_string());
            let region = Region::Custom {
                region: region_name,
                endpoint: "https://service.cos.myqcloud.com".to_string(),
            };
            (region, Some("https://service.cos.myqcloud.com".to_string()))
        }
        "aliyun" => {
            // 阿里云 ListBuckets 使用服务端点
            let region = Region::Custom {
                region: "".to_string(),
                endpoint: "https://oss.aliyuncs.com".to_string(),
            };
            (region, Some("https://oss.aliyuncs.com".to_string()))
        }
        _ => resolve_region_and_endpoint(&cfg_mut)?
    };
    
    let mut credentials = Credentials::new(
        Some(&cfg_mut.access_key),
        Some(&cfg_mut.secret_key),
        None,
        None,
        None,
    ).map_err(|e| e.to_string())?;

    // 首次尝试
    let list_res = tokio::time::timeout(
        Duration::from_secs(12),
        Bucket::list_buckets(region.clone(), credentials.clone())
    ).await.map_err(|_| "请求超时，请检查网络或 Endpoint 配置".to_string());

    let list = match list_res {
        Ok(Ok(resp)) => resp,
        Ok(Err(e)) => {
            let err_text = e.to_string();
            if let Some(ep) = extract_endpoint_from_error_xml(&err_text) {
                if let Some(new_region) = infer_region_from_endpoint(&cfg_mut.provider, &ep) {
                    let full_ep = ensure_scheme(&ep);
                    cfg_mut.endpoint = Some(full_ep.into_owned());
                    cfg_mut.region = Some(new_region);
                    // 依据修正后的 region/endpoint 重建 region
                    region = resolve_region_and_endpoint(&cfg_mut)?.0;
                    credentials = Credentials::new(
                        Some(&cfg_mut.access_key),
                        Some(&cfg_mut.secret_key),
                        None,
                        None,
                        None,
                    ).map_err(|e| e.to_string())?;
                    tokio::time::timeout(
                        Duration::from_secs(12),
                        Bucket::list_buckets(region.clone(), credentials.clone())
                    ).await.map_err(|_| "请求超时，请检查网络或 Endpoint 配置".to_string())?
                     .map_err(|e| e.to_string())?
                } else { return Err(err_text); }
            } else { return Err(err_text); }
        }
        Err(e) => { return Err(e); }
    };

    // 将结果映射
    let mut buckets: Vec<OssBucketSummary> = Vec::new();
    for b in list.buckets.bucket.into_iter() { // BucketContainer 持有 bucket 向量
        buckets.push(OssBucketSummary {
            name: b.name,
            creation_date: Some(b.creation_date),
        });
    }

    Ok(OssResult { success: true, data: Some(buckets), message: None, error: None })
}

fn extract_endpoint_from_error_xml(err_text: &str) -> Option<String> {
    // 通用：从 PermanentRedirect XML 中提取 <Endpoint>...</Endpoint>
    let start_tag = "<Endpoint>";
    let end_tag = "</Endpoint>";
    let start = err_text.find(start_tag)? + start_tag.len();
    let end = err_text[start..].find(end_tag)? + start;
    let endpoint = err_text.get(start..end)?.trim();
    if endpoint.is_empty() { return None; }
    Some(endpoint.to_string())
}

fn infer_region_from_endpoint(provider: &str, endpoint: &str) -> Option<String> {
    // 输入可能是带 schema 的 URL 或 host
    let host = if let Some(pos) = endpoint.find("://") { &endpoint[pos + 3..] } else { endpoint };
    let host = host.split('/').next().unwrap_or(host);
    match provider {
        "aliyun" => {
            // oss-cn-xxx.aliyuncs.com => oss-cn-xxx
            let prefix = "oss-";
            let suffix = ".aliyuncs.com";
            if let (Some(p), Some(s)) = (host.find(prefix), host.find(suffix)) { if s > p { return Some(host[p..s].to_string()); } }
            None
        }
        "tencent" => {
            // cos.<region>.myqcloud.com
            let parts: Vec<&str> = host.split('.').collect();
            if parts.len() >= 3 && parts[0] == "cos" { return Some(parts[1].to_string()); }
            None
        }
        "huawei" => {
            // obs.<region>.myhuaweicloud.com
            let parts: Vec<&str> = host.split('.').collect();
            if parts.len() >= 3 && parts[0] == "obs" { return Some(parts[1].to_string()); }
            None
        }
        "jdcloud" => {
            // s3.<region>.jdcloud-oss.com
            let parts: Vec<&str> = host.split('.').collect();
            if parts.len() >= 3 && parts[0] == "s3" { return Some(parts[1].to_string()); }
            None
        }
        "ksyun" => {
            // ks3-<region>.ksyuncs.com
            if let Some(rest) = host.strip_prefix("ks3-") { return Some(rest.split('.').next().unwrap_or(rest).to_string()); }
            None
        }
        "qingcloud" => {
            // s3.<region>.qingstor.com
            let parts: Vec<&str> = host.split('.').collect();
            if parts.len() >= 3 && parts[0] == "s3" { return Some(parts[1].to_string()); }
            None
        }
        "qiniu" => {
            // s3-<region>.qiniucs.com => region 例：z0、z1、z2、na0、as0
            if let Some(rest) = host.strip_prefix("s3-") { return Some(rest.split('.').next().unwrap_or(rest).to_string()); }
            None
        }
        _ => None,
    }
}

fn ensure_scheme(endpoint: &str) -> Cow<'_, str> {
    if endpoint.starts_with("http://") || endpoint.starts_with("https://") { Cow::from(endpoint) } else { Cow::from(format!("https://{}", endpoint)) }
}

#[command]
pub async fn oss_list_objects(cfg: OssConfig, params: Option<OssListParams>) -> Result<OssResult<Vec<OssFileItem>>, String> {
    println!("oss_list_objects called with config: provider={}, bucket={}, region={}, endpoint={}", 
             cfg.provider, 
             cfg.bucket.as_deref().unwrap_or("None"), 
             cfg.region.as_deref().unwrap_or("None"),
             cfg.endpoint.as_deref().unwrap_or("None"));
    
    let mut cfg_mut = cfg.clone();
    let mut bucket = build_bucket(&cfg_mut).map_err(|e| {
        println!("build_bucket failed: {}", e);
        e
    })?;

    let prefix = params.as_ref().and_then(|p| p.prefix.clone()).unwrap_or_default();
    let delimiter = params
        .as_ref()
        .and_then(|p| p.delimiter.clone())
        .unwrap_or_else(|| "/".to_string());

    println!("Starting list request with prefix='{}', delimiter='{}'", prefix, delimiter);
    let result = match tokio::time::timeout(Duration::from_secs(30), bucket.list(prefix.clone(), Some(delimiter.clone()))).await {
        Err(_) => {
            println!("List request timed out after 30 seconds");
            return Err("请求超时，请检查网络或 Endpoint 配置".to_string())
        },
        Ok(res) => match res {
        Ok(ok) => ok,
        Err(e) => {
            let err_text = e.to_string();
            if let Some(ep) = extract_endpoint_from_error_xml(&err_text) {
                if let Some(region) = infer_region_from_endpoint(&cfg_mut.provider, &ep) {
                    let full_ep = ensure_scheme(&ep);
                    cfg_mut.endpoint = Some(full_ep.into_owned());
                    cfg_mut.region = Some(region);
                    bucket = build_bucket(&cfg_mut).map_err(|e| e.to_string())?;
                    tokio::time::timeout(Duration::from_secs(30), bucket.list(prefix.clone(), Some(delimiter))).await.map_err(|_| "请求超时，请检查网络或 Endpoint 配置".to_string())?.map_err(|e| e.to_string())?
                } else { return Err(err_text); }
            } else { return Err(err_text); }
        }
    }};

    let mut items: Vec<OssFileItem> = Vec::new();
    if let Some(first) = result.get(0) {
        if let Some(prefix_group) = &first.common_prefixes {
            for cp in prefix_group {
                let key = cp.prefix.clone();
                items.push(OssFileItem {
                    key,
                    size: 0,
                    last_modified: None,
                    is_directory: true,
                });
            }
        }
        for content in &first.contents {
            // rust-s3 returns RFC3339-ish or RFC2822 strings; try parse flexibly
            let lm_str = content.last_modified.clone();
            let last_modified = DateTime::parse_from_rfc2822(&lm_str)
                .map(|dt| DateTime::<Utc>::from(dt).to_rfc3339())
                .or_else(|_| DateTime::parse_from_rfc3339(&lm_str).map(|dt| dt.to_rfc3339()))
                .ok();

            items.push(OssFileItem {
                key: content.key.clone(),
                size: content.size as u64,
                last_modified,
                is_directory: false,
            });
        }
    }

    Ok(OssResult {
        success: true,
        data: Some(items),
        message: None,
        error: None,
    })
}

#[command]
pub async fn oss_upload_file(cfg: OssConfig, params: OssUploadParams) -> Result<OssResult<String>, String> {
    let mut cfg_mut = cfg.clone();
    let mut bucket = build_bucket(&cfg_mut).map_err(|e| e.to_string())?;
    
    let key = if let Some(path) = &params.path {
        if path.is_empty() {
            params.file_name.clone()
        } else {
            format!("{}/{}", path.trim_end_matches('/'), params.file_name)
        }
    } else {
        params.file_name.clone()
    };

    let content_type = params.content_type.unwrap_or_else(|| {
        mime_guess::from_path(&params.file_name)
            .first_or_octet_stream()
            .to_string()
    });

    match tokio::time::timeout(Duration::from_secs(20), bucket
        .put_object_with_content_type(&key, &params.file_data, &content_type))
        .await
    {
        Err(_) => return Err("上传超时，请检查网络或 Endpoint 配置".to_string()),
        Ok(Ok(_)) => {}
        Ok(Err(e)) => {
            let err_text = e.to_string();
            if let Some(ep) = extract_endpoint_from_error_xml(&err_text) {
                if let Some(region) = infer_region_from_endpoint(&cfg_mut.provider, &ep) {
                    let full_ep = ensure_scheme(&ep);
                    cfg_mut.endpoint = Some(full_ep.into_owned());
                    cfg_mut.region = Some(region);
                    bucket = build_bucket(&cfg_mut).map_err(|e| e.to_string())?;
                    tokio::time::timeout(Duration::from_secs(20), bucket
                        .put_object_with_content_type(&key, &params.file_data, &content_type))
                        .await
                        .map_err(|_| "上传超时，请检查网络或 Endpoint 配置".to_string())?
                        .map_err(|e| e.to_string())?;
                } else { return Err(err_text); }
            } else { return Err(err_text); }
        }
    }

    Ok(OssResult {
        success: true,
        data: Some(key),
        message: Some("文件上传成功".to_string()),
        error: None,
    })
}

#[command]
pub async fn oss_download_file(cfg: OssConfig, params: OssDownloadParams) -> Result<OssResult<Vec<u8>>, String> {
    let mut cfg_mut = cfg.clone();
    let mut bucket = build_bucket(&cfg_mut).map_err(|e| e.to_string())?;
    
    let result = match tokio::time::timeout(Duration::from_secs(20), bucket.get_object(&params.key)).await {
        Err(_) => return Err("下载超时，请检查网络或 Endpoint 配置".to_string()),
        Ok(Ok(r)) => r,
        Ok(Err(e)) => {
            let err_text = e.to_string();
            if let Some(ep) = extract_endpoint_from_error_xml(&err_text) {
                if let Some(region) = infer_region_from_endpoint(&cfg_mut.provider, &ep) {
                    let full_ep = ensure_scheme(&ep);
                    cfg_mut.endpoint = Some(full_ep.into_owned());
                    cfg_mut.region = Some(region);
                    bucket = build_bucket(&cfg_mut).map_err(|e| e.to_string())?;
                    tokio::time::timeout(Duration::from_secs(20), bucket.get_object(&params.key)).await.map_err(|_| "下载超时，请检查网络或 Endpoint 配置".to_string())?.map_err(|e| e.to_string())?
                } else { return Err(err_text); }
            } else { return Err(err_text); }
        }
    };

    Ok(OssResult {
        success: true,
        data: Some(result.bytes().to_vec()),
        message: Some("文件下载成功".to_string()),
        error: None,
    })
}

#[command]
pub async fn oss_delete_file(cfg: OssConfig, params: OssDeleteParams) -> Result<OssResult<String>, String> {
    let mut cfg_mut = cfg.clone();
    let mut bucket = build_bucket(&cfg_mut).map_err(|e| e.to_string())?;
    
    match tokio::time::timeout(Duration::from_secs(12), bucket.delete_object(&params.key)).await {
        Err(_) => return Err("删除超时，请检查网络或 Endpoint 配置".to_string()),
        Ok(Ok(_)) => {}
        Ok(Err(e)) => {
            let err_text = e.to_string();
            if let Some(ep) = extract_endpoint_from_error_xml(&err_text) {
                if let Some(region) = infer_region_from_endpoint(&cfg_mut.provider, &ep) {
                    let full_ep = ensure_scheme(&ep);
                    cfg_mut.endpoint = Some(full_ep.into_owned());
                    cfg_mut.region = Some(region);
                    bucket = build_bucket(&cfg_mut).map_err(|e| e.to_string())?;
                    tokio::time::timeout(Duration::from_secs(12), bucket.delete_object(&params.key)).await.map_err(|_| "删除超时，请检查网络或 Endpoint 配置".to_string())?.map_err(|e| e.to_string())?;
                } else { return Err(err_text); }
            } else { return Err(err_text); }
        }
    }

    Ok(OssResult {
        success: true,
        data: Some(params.key),
        message: Some("文件删除成功".to_string()),
        error: None,
    })
}

#[command]
pub async fn oss_create_folder(cfg: OssConfig, params: OssCreateFolderParams) -> Result<OssResult<String>, String> {
    let mut cfg_mut = cfg.clone();
    let mut bucket = build_bucket(&cfg_mut).map_err(|e| e.to_string())?;
    
    let folder_key = if let Some(path) = &params.path {
        if path.is_empty() {
            format!("{}/", params.folder_name)
        } else {
            format!("{}/{}/", path.trim_end_matches('/'), params.folder_name)
        }
    } else {
        format!("{}/", params.folder_name)
    };

    // 创建一个空文件来模拟文件夹
    match tokio::time::timeout(Duration::from_secs(12), bucket.put_object(&folder_key, b"")).await {
        Err(_) => return Err("创建文件夹超时，请检查网络或 Endpoint 配置".to_string()),
        Ok(Ok(_)) => {}
        Ok(Err(e)) => {
            let err_text = e.to_string();
            if let Some(ep) = extract_endpoint_from_error_xml(&err_text) {
                if let Some(region) = infer_region_from_endpoint(&cfg_mut.provider, &ep) {
                    let full_ep = ensure_scheme(&ep);
                    cfg_mut.endpoint = Some(full_ep.into_owned());
                    cfg_mut.region = Some(region);
                    bucket = build_bucket(&cfg_mut).map_err(|e| e.to_string())?;
                    tokio::time::timeout(Duration::from_secs(12), bucket.put_object(&folder_key, b""))
                        .await
                        .map_err(|_| "创建文件夹超时，请检查网络或 Endpoint 配置".to_string())?
                        .map_err(|e| e.to_string())?;
                } else { return Err(err_text); }
            } else { return Err(err_text); }
        }
    }

    Ok(OssResult {
        success: true,
        data: Some(folder_key),
        message: Some("文件夹创建成功".to_string()),
        error: None,
    })
}


