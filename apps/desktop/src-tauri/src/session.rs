use serde::{Deserialize, Serialize};
use std::{collections::HashSet, fs, path::Path};
use uuid::Uuid;

pub const MAX_WINDOWS: usize = 16;
pub const MAX_TABS_PER_WINDOW: usize = 32;
pub const MAX_TABS: usize = 128;

#[derive(Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Tab {
    pub id: String,
    pub hash: String,
    pub title: String,
}

impl Tab {
    pub fn home() -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            hash: "#/home".into(),
            title: "Doca".into(),
        }
    }
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Window {
    pub id: String,
    pub tabs: Vec<Tab>,
    pub active_tab: String,
}

impl Window {
    pub fn home() -> Self {
        let tab = Tab::home();
        Self {
            id: Uuid::new_v4().to_string(),
            active_tab: tab.id.clone(),
            tabs: vec![tab],
        }
    }
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Workspace {
    pub endpoint_id: String,
    pub account_id: String,
    pub windows: Vec<Window>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Sessions {
    pub version: u8,
    pub workspaces: Vec<Workspace>,
}

impl Default for Sessions {
    fn default() -> Self {
        Self {
            version: 1,
            workspaces: Vec::new(),
        }
    }
}

impl Sessions {
    pub fn windows_for(&self, endpoint_id: &str, account_id: &str) -> Option<Vec<Window>> {
        self.workspaces
            .iter()
            .find(|scope| scope.endpoint_id == endpoint_id && scope.account_id == account_id)
            .map(|scope| scope.windows.clone())
    }

    pub fn clear_account(&mut self, endpoint_id: &str, account_id: &str) {
        self.workspaces
            .retain(|scope| scope.endpoint_id != endpoint_id || scope.account_id != account_id);
    }

    pub fn clear_endpoint(&mut self, endpoint_id: &str) {
        self.workspaces
            .retain(|scope| scope.endpoint_id != endpoint_id);
    }
}

pub fn valid_hash(hash: &str) -> bool {
    hash.starts_with("#/")
        && !hash.starts_with("#//")
        && hash.len() <= 2048
        && !hash.chars().any(char::is_control)
}

pub fn validate(sessions: &Sessions) -> Result<(), String> {
    if sessions.version != 1 || sessions.workspaces.len() > 64 {
        return Err("未知的桌面会话版本或后端数量".into());
    }
    let mut scopes = HashSet::new();
    let mut ids = HashSet::new();
    for workspace in &sessions.workspaces {
        if Uuid::parse_str(&workspace.endpoint_id).is_err()
            || Uuid::parse_str(&workspace.account_id).is_err()
            || !scopes.insert((&workspace.endpoint_id, &workspace.account_id))
            || workspace.windows.len() > MAX_WINDOWS
        {
            return Err("桌面会话的后端或窗口记录无效".into());
        }
        let mut tab_count = 0;
        for window in &workspace.windows {
            if Uuid::parse_str(&window.id).is_err()
                || !ids.insert(&window.id)
                || window.tabs.is_empty()
                || window.tabs.len() > MAX_TABS_PER_WINDOW
                || !window.tabs.iter().any(|tab| tab.id == window.active_tab)
            {
                return Err("桌面会话的窗口记录无效".into());
            }
            tab_count += window.tabs.len();
            for tab in &window.tabs {
                if Uuid::parse_str(&tab.id).is_err()
                    || !ids.insert(&tab.id)
                    || !valid_hash(&tab.hash)
                    || tab.title.len() > 200
                    || tab.title.chars().any(char::is_control)
                {
                    return Err("桌面会话的标签记录无效".into());
                }
            }
        }
        if tab_count > MAX_TABS {
            return Err("桌面会话的标签过多".into());
        }
    }
    Ok(())
}

pub fn read(path: &Path) -> Result<Sessions, String> {
    if !path.exists() {
        return Ok(Sessions::default());
    }
    let bytes = fs::read(path).map_err(|e| format!("无法读取桌面会话：{e}"))?;
    let sessions: Sessions = serde_json::from_slice(&bytes)
        .map_err(|_| "桌面会话格式未知；原文件未被更改".to_string())?;
    validate(&sessions)?;
    Ok(sessions)
}

pub fn save(path: &Path, sessions: &Sessions) -> Result<(), String> {
    validate(sessions)?;
    // Do not replace a session file changed to an unknown or corrupt format
    // while this process is running. Startup already applies the same check.
    if path.exists() {
        read(path)?;
    }
    let parent = path.parent().ok_or("桌面会话路径无效")?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let temporary = path.with_extension("json.tmp");
    let bytes = serde_json::to_vec_pretty(sessions).map_err(|e| e.to_string())?;
    #[cfg(unix)]
    {
        use std::io::Write;
        use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .mode(0o600)
            .open(&temporary)
            .map_err(|e| e.to_string())?;
        file.set_permissions(fs::Permissions::from_mode(0o600))
            .map_err(|e| e.to_string())?;
        file.write_all(&bytes).map_err(|e| e.to_string())?;
        file.sync_all().map_err(|e| e.to_string())?;
    }
    #[cfg(not(unix))]
    fs::write(&temporary, bytes).map_err(|e| e.to_string())?;
    fs::rename(&temporary, path).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixture_path() -> std::path::PathBuf {
        let directory = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../../artifacts/verification/desktop-tabs")
            .join(Uuid::new_v4().to_string());
        fs::create_dir_all(&directory).unwrap();
        directory.join("workspace-session.json")
    }

    #[test]
    fn isolated_accounts_and_windows_round_trip() {
        let path = fixture_path();
        let endpoint = Uuid::new_v4().to_string();
        let first = Workspace {
            endpoint_id: endpoint.clone(),
            account_id: Uuid::new_v4().to_string(),
            windows: vec![Window::home(), Window::home()],
        };
        let second = Workspace {
            endpoint_id: endpoint,
            account_id: Uuid::new_v4().to_string(),
            windows: vec![Window::home()],
        };
        let sessions = Sessions {
            version: 1,
            workspaces: vec![first, second],
        };
        save(&path, &sessions).unwrap();
        let restored = read(&path).unwrap();
        assert_eq!(restored.workspaces.len(), 2);
        assert_eq!(restored.workspaces[0].windows.len(), 2);
        assert_ne!(
            restored.workspaces[0].account_id,
            restored.workspaces[1].account_id
        );
        assert_eq!(
            restored
                .windows_for(
                    &restored.workspaces[0].endpoint_id,
                    &restored.workspaces[0].account_id
                )
                .unwrap()
                .len(),
            2
        );
        let mut after_sign_out = restored.clone();
        after_sign_out.clear_account(
            &restored.workspaces[0].endpoint_id,
            &restored.workspaces[0].account_id,
        );
        assert_eq!(after_sign_out.workspaces.len(), 1);
        assert!(after_sign_out
            .windows_for(
                &restored.workspaces[0].endpoint_id,
                &restored.workspaces[0].account_id
            )
            .is_none());
        assert_eq!(
            after_sign_out
                .windows_for(
                    &restored.workspaces[1].endpoint_id,
                    &restored.workspaces[1].account_id
                )
                .unwrap()
                .len(),
            1
        );
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            assert_eq!(
                fs::metadata(&path).unwrap().permissions().mode() & 0o777,
                0o600
            );
        }
        fs::remove_dir_all(path.parent().unwrap()).unwrap();
    }

    #[test]
    fn rejects_unknown_or_corrupt_format_without_rewriting() {
        let path = fixture_path();
        for bytes in [
            br#"{"version":2,"workspaces":[]}"#.as_slice(),
            br#"{"version":1,"workspaces":{},"unexpected":true}"#.as_slice(),
        ] {
            fs::write(&path, bytes).unwrap();
            assert!(read(&path).is_err());
            assert!(save(&path, &Sessions::default()).is_err());
            assert_eq!(fs::read(&path).unwrap(), bytes);
        }
        fs::remove_dir_all(path.parent().unwrap()).unwrap();
    }

    #[test]
    fn rejects_cross_origin_and_duplicate_tab_ids() {
        assert!(!valid_hash("https://other.example/"));
        assert!(!valid_hash("#//other.example"));
        assert!(valid_hash("#/r/123?view=edit"));
        let mut window = Window::home();
        window.tabs.push(window.tabs[0].clone());
        let sessions = Sessions {
            version: 1,
            workspaces: vec![Workspace {
                endpoint_id: Uuid::new_v4().to_string(),
                account_id: Uuid::new_v4().to_string(),
                windows: vec![window],
            }],
        };
        assert!(validate(&sessions).is_err());
    }
}
