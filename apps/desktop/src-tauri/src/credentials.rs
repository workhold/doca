//! Desktop credential storage in an encrypted app-local file.
//!
//! Tokens live in `credentials.json` as one entry per endpoint, encrypted
//! with AES-256-GCM under a random key in `credential.key` (0600). The
//! macOS Keychain is only a read-only fallback for entries created by
//! older builds: reading it converts the token into the file and never
//! deletes the Keychain entry. Explicit deletion (sign-out, expiry,
//! endpoint removal) clears the file entry and tries to delete any
//! retained Keychain entry.

use aes_gcm::{
    aead::Payload,
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use rand::RngCore;
use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
};

const VERSION: u8 = 1;
const AAD: &[u8] = b"doca-desktop-credentials-v1";
const KEY_BYTES: usize = 32;
const NONCE_BYTES: usize = 12;

type Tokens = HashMap<String, String>;

fn credentials_path(directory: &Path) -> PathBuf {
    directory.join("credentials.json")
}

fn key_path(directory: &Path) -> PathBuf {
    directory.join("credential.key")
}

fn load_key(directory: &Path) -> Result<[u8; KEY_BYTES], String> {
    let path = key_path(directory);
    if path.exists() {
        let text = fs::read_to_string(&path).map_err(|e| format!("无法读取桌面凭据密钥：{e}"))?;
        let bytes = hex::decode(text.trim()).map_err(|_| "桌面凭据密钥格式无效".to_string())?;
        let key: [u8; KEY_BYTES] = bytes
            .try_into()
            .map_err(|_| "桌面凭据密钥长度无效".to_string())?;
        return Ok(key);
    }
    let mut key = [0u8; KEY_BYTES];
    rand::rngs::OsRng.fill_bytes(&mut key);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("无法创建桌面数据目录：{e}"))?;
    }
    fs::write(&path, hex::encode(key)).map_err(|e| format!("无法保存桌面凭据密钥：{e}"))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&path, fs::Permissions::from_mode(0o600))
            .map_err(|e| format!("无法收紧桌面凭据密钥权限：{e}"))?;
    }
    Ok(key)
}

fn decrypt(directory: &Path, envelope: &serde_json::Value) -> Result<Tokens, String> {
    let version = envelope
        .get("version")
        .and_then(serde_json::Value::as_u64)
        .ok_or("桌面凭据文件格式无效；原文件未被更改")?;
    if version != u64::from(VERSION) {
        return Err("桌面凭据文件版本未知；原文件未被更改".into());
    }
    let nonce_text = envelope
        .get("nonce")
        .and_then(serde_json::Value::as_str)
        .ok_or("桌面凭据文件格式无效；原文件未被更改")?;
    let ciphertext_text = envelope
        .get("ciphertext")
        .and_then(serde_json::Value::as_str)
        .ok_or("桌面凭据文件格式无效；原文件未被更改")?;
    let nonce_bytes =
        hex::decode(nonce_text).map_err(|_| "桌面凭据文件格式无效；原文件未被更改".to_string())?;
    let nonce: [u8; NONCE_BYTES] = nonce_bytes
        .try_into()
        .map_err(|_| "桌面凭据文件格式无效；原文件未被更改".to_string())?;
    let ciphertext = hex::decode(ciphertext_text)
        .map_err(|_| "桌面凭据文件格式无效；原文件未被更改".to_string())?;
    let key = load_key(directory)?;
    let cipher = Aes256Gcm::new((&key).into());
    let plaintext = cipher
        .decrypt(
            Nonce::from_slice(&nonce),
            Payload {
                msg: &ciphertext,
                aad: AAD,
            },
        )
        .map_err(|_| "桌面凭据文件无法解密；原文件未被更改".to_string())?;
    serde_json::from_slice(&plaintext)
        .map_err(|_| "桌面凭据文件内容无效；原文件未被更改".to_string())
}

fn read_tokens(directory: &Path) -> Result<Tokens, String> {
    let path = credentials_path(directory);
    if !path.exists() {
        return Ok(Tokens::new());
    }
    let bytes = fs::read(&path).map_err(|e| format!("无法读取桌面凭据文件：{e}"))?;
    let envelope: serde_json::Value = serde_json::from_slice(&bytes)
        .map_err(|_| "桌面凭据文件格式未知；原文件未被更改".to_string())?;
    decrypt(directory, &envelope)
}

fn write_tokens(directory: &Path, tokens: &Tokens) -> Result<(), String> {
    let plaintext = serde_json::to_vec(tokens).map_err(|e| format!("无法序列化桌面凭据：{e}"))?;
    let key = load_key(directory)?;
    let cipher = Aes256Gcm::new((&key).into());
    let mut nonce_bytes = [0u8; NONCE_BYTES];
    rand::rngs::OsRng.fill_bytes(&mut nonce_bytes);
    let ciphertext = cipher
        .encrypt(
            Nonce::from_slice(&nonce_bytes),
            Payload {
                msg: &plaintext,
                aad: AAD,
            },
        )
        .map_err(|_| "无法加密桌面凭据".to_string())?;
    let envelope = serde_json::json!({
        "version": VERSION,
        "nonce": hex::encode(nonce_bytes),
        "ciphertext": hex::encode(ciphertext),
    });
    let path = credentials_path(directory);
    let temp = directory.join("credentials.json.tmp");
    fs::write(
        &temp,
        serde_json::to_vec_pretty(&envelope).map_err(|e| e.to_string())?,
    )
    .map_err(|e| format!("无法保存桌面凭据文件：{e}"))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&temp, fs::Permissions::from_mode(0o600))
            .map_err(|e| format!("无法收紧桌面凭据文件权限：{e}"))?;
    }
    fs::rename(&temp, &path).map_err(|e| format!("无法保存桌面凭据文件：{e}"))?;
    Ok(())
}

fn keychain_token(id: &str) -> Result<Option<String>, String> {
    match crate::settings::vault(id)?.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(format!("无法读取系统凭据库：{error}")),
    }
}

fn keychain_delete(id: &str) {
    // Best effort: retained fallback entries for explicitly deleted
    // credentials must not block the deletion itself.
    if let Ok(vault) = crate::settings::vault(id) {
        let _ = vault.delete_credential();
    }
}

pub fn has_token(directory: &Path, id: &str) -> Result<bool, String> {
    if read_tokens(directory)?.contains_key(id) {
        return Ok(true);
    }
    // Entries from older builds may still exist only in the Keychain.
    // Existence checks read attributes only, so they never prompt.
    keychain_exists(id)
}

#[cfg(target_os = "macos")]
fn keychain_exists(id: &str) -> Result<bool, String> {
    use security_framework::item::{ItemClass, ItemSearchOptions};
    // errSecItemNotFound means "no credential yet" (freshly added endpoint or a
    // removed legacy entry), not a broken keychain; only real failures surface.
    const ERR_SEC_ITEM_NOT_FOUND: i32 = -25300;
    match ItemSearchOptions::new()
        .class(ItemClass::generic_password())
        .service("com.smartdoca.desktop")
        .account(id)
        .load_attributes(true)
        .search()
    {
        Ok(found) => Ok(!found.is_empty()),
        Err(error) if error.code() == ERR_SEC_ITEM_NOT_FOUND => Ok(false),
        Err(error) => Err(format!("无法读取系统凭据库：{error}")),
    }
}

#[cfg(not(target_os = "macos"))]
fn keychain_exists(id: &str) -> Result<bool, String> {
    match crate::settings::vault(id)?.get_password() {
        Ok(_) => Ok(true),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(e) => Err(format!("无法读取系统凭据库：{e}")),
    }
}

pub fn get_token(directory: &Path, id: &str) -> Result<Option<String>, String> {
    let mut tokens = read_tokens(directory)?;
    if let Some(token) = tokens.get(id) {
        return Ok(Some(token.clone()));
    }
    // Read-only Keychain fallback for entries from older builds. Reading the
    // secret converts it into the file; the Keychain entry itself is kept.
    let Some(token) = keychain_token(id)? else {
        return Ok(None);
    };
    tokens.insert(id.to_string(), token.clone());
    write_tokens(directory, &tokens)?;
    Ok(Some(token))
}

pub fn set_token(directory: &Path, id: &str, token: &str) -> Result<(), String> {
    let mut tokens = read_tokens(directory)?;
    tokens.insert(id.to_string(), token.to_string());
    write_tokens(directory, &tokens)
}

pub fn delete_token(directory: &Path, id: &str) -> Result<(), String> {
    let mut tokens = read_tokens(directory)?;
    tokens.remove(id);
    write_tokens(directory, &tokens)?;
    keychain_delete(id);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    struct Directory(PathBuf);
    impl Directory {
        fn new() -> Self {
            let path =
                std::env::temp_dir().join(format!("doca-credentials-{}", uuid::Uuid::new_v4()));
            fs::create_dir_all(&path).unwrap();
            Self(path)
        }
    }
    impl Drop for Directory {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn round_trip_and_remove() {
        let directory = Directory::new();
        assert_eq!(get_token(&directory.0, "endpoint-a").unwrap(), None);
        set_token(&directory.0, "endpoint-a", "token-a").unwrap();
        set_token(&directory.0, "endpoint-b", "token-b").unwrap();
        assert_eq!(
            get_token(&directory.0, "endpoint-a").unwrap().as_deref(),
            Some("token-a")
        );
        assert_eq!(
            get_token(&directory.0, "endpoint-b").unwrap().as_deref(),
            Some("token-b")
        );
        assert!(has_token(&directory.0, "endpoint-a").unwrap());
        delete_token(&directory.0, "endpoint-a").unwrap();
        assert_eq!(get_token(&directory.0, "endpoint-a").unwrap(), None);
        assert!(has_token(&directory.0, "endpoint-b").unwrap());
    }

    #[test]
    fn unknown_version_is_rejected_without_rewrite() {
        let directory = Directory::new();
        let original = br#"{"version":9,"nonce":"00","ciphertext":"00"}"#;
        fs::write(credentials_path(&directory.0), original).unwrap();
        assert!(get_token(&directory.0, "endpoint-a").is_err());
        assert!(set_token(&directory.0, "endpoint-a", "token").is_err());
        assert_eq!(fs::read(credentials_path(&directory.0)).unwrap(), original);
    }

    #[test]
    fn tampered_ciphertext_is_rejected() {
        let directory = Directory::new();
        set_token(&directory.0, "endpoint-a", "token-a").unwrap();
        let path = credentials_path(&directory.0);
        let mut envelope: serde_json::Value =
            serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
        envelope["ciphertext"] = "ff".into();
        fs::write(&path, serde_json::to_vec(&envelope).unwrap()).unwrap();
        assert!(get_token(&directory.0, "endpoint-a").is_err());
    }

    #[cfg(unix)]
    #[test]
    fn key_file_is_owner_only() {
        use std::os::unix::fs::PermissionsExt;
        let directory = Directory::new();
        set_token(&directory.0, "endpoint-a", "token-a").unwrap();
        let mode = fs::metadata(key_path(&directory.0))
            .unwrap()
            .permissions()
            .mode();
        assert_eq!(mode & 0o777, 0o600);
        let mode = fs::metadata(credentials_path(&directory.0))
            .unwrap()
            .permissions()
            .mode();
        assert_eq!(mode & 0o777, 0o600);
    }
}
