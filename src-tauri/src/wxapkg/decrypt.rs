use aes::Aes256;
use cbc::Decryptor;
use aes::cipher::{BlockDecryptMut, KeyIvInit, block_padding::Pkcs7};
use hmac::{Hmac, Mac};
use sha1::Sha1;

type Aes256CbcDec = Decryptor<Aes256>;

/// V1MMWX 加密包常量
const V1MMWX_FLAG: &[u8; 6] = b"V1MMWX";
const DEFAULT_IV: &[u8; 16] = b"the iv: 16 bytes";
const DEFAULT_SALT: &[u8; 8] = b"saltiest";
const PBKDF2_ITERATIONS: u32 = 1000;
const AES_KEY_SIZE: usize = 32; // 256 bits
const AES_ENCRYPTED_HEAD_SIZE: usize = 1024;

/// 判断是否为加密的 wxapkg 文件 (V1MMWX 头)
pub fn is_encrypted_wxapkg(data: &[u8]) -> bool {
    data.len() >= 6 && &data[0..6] == V1MMWX_FLAG
}

/// PBKDF2-HMAC-SHA1 密钥派生
fn pbkdf2_hmac_sha1(password: &[u8], salt: &[u8], iterations: u32, dk_len: usize) -> Vec<u8> {
    let hmac_len = 20; // SHA1 输出 20 字节
    let block_count = (dk_len + hmac_len - 1) / hmac_len;
    
    let mut dk = Vec::with_capacity(dk_len);
    
    for block_idx in 1..=block_count {
        // U1 = HMAC(password, salt || INT(block_idx))
        let mut mac = Hmac::<Sha1>::new_from_slice(password).expect("HMAC key length valid");
        mac.update(salt);
        mac.update(&(block_idx as u32).to_be_bytes());
        let mut u = mac.finalize().into_bytes();
        let mut result = u.clone();
        
        // U2..Uc
        for _ in 1..iterations {
            let mut mac = Hmac::<Sha1>::new_from_slice(password).expect("HMAC key length valid");
            mac.update(&u);
            u = mac.finalize().into_bytes();
            for (r, u_byte) in result.iter_mut().zip(u.iter()) {
                *r ^= u_byte;
            }
        }
        
        dk.extend_from_slice(&result);
    }
    
    dk.truncate(dk_len);
    dk
}

/// 解密 V1MMWX 加密的 wxapkg 文件
/// 
/// 加密文件布局:
/// [V1MMWX(6)] [AES-CBC加密头部(1024)] [XOR加密剩余数据]
/// 
/// 解密步骤:
/// 1. PBKDF2(appid, "saltiest", 1000) -> 256位 AES 密钥
/// 2. AES-256-CBC 解密偏移6~1030的1024字节, IV="the iv: 16 bytes"
/// 3. XOR 解密偏移1030之后的所有字节, key=appid倒数第二个字符ASCII
/// 4. 拼接: AES解密头[0:1023] + XOR解密数据
pub fn decrypt_v1mmwx(data: &[u8], app_id: &str) -> Result<Vec<u8>, String> {
    if !is_encrypted_wxapkg(data) {
        return Err("不是 V1MMWX 加密包".to_string());
    }
    
    if data.len() < 6 + AES_ENCRYPTED_HEAD_SIZE {
        return Err("加密包数据太短".to_string());
    }
    
    // 1. PBKDF2 密钥派生
    let dk = pbkdf2_hmac_sha1(
        app_id.as_bytes(),
        DEFAULT_SALT,
        PBKDF2_ITERATIONS,
        AES_KEY_SIZE,
    );
    
    // 2. AES-256-CBC 解密头部
    let encrypted_head = &data[6..6 + AES_ENCRYPTED_HEAD_SIZE];
    let key: [u8; 32] = dk.try_into().map_err(|_| "密钥长度错误")?;
    let iv: [u8; 16] = *DEFAULT_IV;
    
    let decryptor = Aes256CbcDec::new(&key.into(), &iv.into());
    let mut buf = encrypted_head.to_vec();
    let origin_head = decryptor.decrypt_padded_mut::<Pkcs7>(&mut buf)
        .map_err(|e| format!("AES 解密失败: {:?}", e))?;
    
    // 3. XOR 解密剩余数据
    let xor_key = if app_id.len() >= 2 {
        app_id.as_bytes()[app_id.len() - 2]
    } else {
        0x66
    };
    
    let remaining_encrypted = &data[6 + AES_ENCRYPTED_HEAD_SIZE..];
    let xor_data: Vec<u8> = remaining_encrypted.iter().map(|b| b ^ xor_key).collect();
    
    // 4. 拼接: AES解密头[0:1023] + XOR解密数据
    let mut decrypted = Vec::with_capacity(1023 + xor_data.len());
    decrypted.extend_from_slice(&origin_head[..1023]);
    decrypted.extend_from_slice(&xor_data);
    
    Ok(decrypted)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_is_encrypted() {
        assert!(is_encrypted_wxapkg(b"V1MMWX\x00\x01\x02"));
        assert!(!is_encrypted_wxapkg(b"\xBE\x00\x00\x00"));
    }
    
    #[test]
    fn test_pbkdf2() {
        let dk = pbkdf2_hmac_sha1(b"wx1234567890abcdef", b"saltiest", 1000, 32);
        assert_eq!(dk.len(), 32);
    }
}
