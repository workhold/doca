use serde::{Deserialize, Serialize};
use std::{fs, path::Path};
use url::Url;
use uuid::Uuid;

#[derive(Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Endpoint {
    pub id: String,
    pub name: String,
    pub origin: String,
    pub account_id: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Settings {
    pub version: u8,
    pub active: String,
    pub endpoints: Vec<Endpoint>,
}

impl Default for Settings {
    fn default() -> Self {
        // Version 1 used `local` for the former trial profile. Keep the value
        // unchanged so old settings remain readable; remote-only treats it as no selection.
        Self {
            version: 1,
            active: "local".into(),
            endpoints: Vec::new(),
        }
    }
}

pub fn canonical_origin(input: &str) -> Result<String, String> {
    let url = Url::parse(input.trim()).map_err(|_| "desktop.error.invalidAddress")?;
    if url.username() != ""
        || url.password().is_some()
        || url.path() != "/"
        || url.query().is_some()
        || url.fragment().is_some()
    {
        return Err("desktop.error.addressOrigin".into());
    }
    let loopback = matches!(
        url.host_str(),
        Some("127.0.0.1" | "localhost" | "[::1]" | "::1")
    );
    if url.scheme() != "https" && !(url.scheme() == "http" && loopback) {
        return Err("desktop.error.httpsRequired".into());
    }
    Ok(url.origin().ascii_serialization())
}

pub fn validate(settings: &Settings) -> Result<(), String> {
    if settings.version != 1 || settings.endpoints.len() > 64 {
        return Err("未知的桌面设置版本或地址数量".into());
    }
    if settings.active != "local" && !settings.endpoints.iter().any(|e| e.id == settings.active) {
        return Err("当前工作空间地址不存在".into());
    }
    for (index, entry) in settings.endpoints.iter().enumerate() {
        if Uuid::parse_str(&entry.id).is_err()
            || entry.name.trim().is_empty()
            || entry.name.len() > 80
            || canonical_origin(&entry.origin)? != entry.origin
            || settings.endpoints[..index]
                .iter()
                .any(|other| other.id == entry.id || other.origin == entry.origin)
        {
            return Err("桌面地址设置无效或重复；原文件未被更改".into());
        }
    }
    Ok(())
}

pub fn read(path: &Path) -> Result<Settings, String> {
    if !path.exists() {
        return Ok(Settings::default());
    }
    let bytes = fs::read(path).map_err(|e| format!("无法读取桌面设置：{e}"))?;
    let settings: Settings = serde_json::from_slice(&bytes)
        .map_err(|_| "桌面设置格式未知；原文件未被更改".to_string())?;
    validate(&settings)?;
    Ok(settings)
}

pub fn save(path: &Path, settings: &Settings) -> Result<(), String> {
    validate(settings)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let temp = path.with_extension("json.tmp");
    let bytes = serde_json::to_vec_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(&temp, bytes).map_err(|e| e.to_string())?;
    fs::rename(&temp, path).map_err(|e| e.to_string())
}

pub fn vault(id: &str) -> Result<keyring::Entry, String> {
    keyring::Entry::new("com.smartdoca.desktop", id).map_err(|e| format!("系统凭据库不可用：{e}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn endpoint_settings_round_trip_and_reject_unknown_format() {
        let directory = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../../artifacts/verification/desktop-client")
            .join(format!("settings-{}", Uuid::new_v4()));
        fs::create_dir_all(&directory).unwrap();
        let path = directory.join("profiles.json");
        let mut settings = Settings::default();
        settings.endpoints.push(Endpoint {
            id: Uuid::new_v4().to_string(),
            name: "Team".into(),
            origin: "https://doca.example.com".into(),
            account_id: None,
        });
        settings.active = settings.endpoints[0].id.clone();
        save(&path, &settings).unwrap();
        let loaded = read(&path).unwrap();
        assert_eq!(loaded.active, settings.active);
        assert_eq!(loaded.endpoints[0].origin, settings.endpoints[0].origin);

        let old_bytes = br#"{"version":1,"active":"local","endpoints":[]}"#;
        fs::write(&path, old_bytes).unwrap();
        assert_eq!(read(&path).unwrap().active, "local");
        assert_eq!(fs::read(&path).unwrap(), old_bytes);

        let unknown = br#"{"version":2,"active":"local","endpoints":[]}"#;
        fs::write(&path, unknown).unwrap();
        assert!(read(&path).is_err());
        assert_eq!(fs::read(&path).unwrap(), unknown);
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn endpoint_origins_are_strict() {
        assert_eq!(
            canonical_origin(" https://doca.example.com/ ").unwrap(),
            "https://doca.example.com"
        );
        assert_eq!(
            canonical_origin("doca.example.com").unwrap_err(),
            "desktop.error.invalidAddress"
        );
        assert_eq!(
            canonical_origin("http://doca.example.com").unwrap_err(),
            "desktop.error.httpsRequired"
        );
        assert_eq!(
            canonical_origin("https://doca.example.com/path").unwrap_err(),
            "desktop.error.addressOrigin"
        );
        assert!(canonical_origin("https://user:password@doca.example.com").is_err());
        assert_eq!(
            canonical_origin("http://127.0.0.1:3000").unwrap(),
            "http://127.0.0.1:3000"
        );
    }
}
