mod credentials;
mod proxy;
mod session;
mod settings;

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex as SyncMutex,
    },
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};
use tauri_plugin_deep_link::DeepLinkExt;
use tokio::{sync::Mutex, task::JoinHandle};
use url::Url;
use uuid::Uuid;

struct ActiveProxy {
    server: JoinHandle<()>,
    controller: JoinHandle<()>,
    generation: Uuid,
    endpoint_id: String,
    account_id: String,
    gate_url: String,
}

struct AppState {
    directory: PathBuf,
    settings: Mutex<settings::Settings>,
    operation: Mutex<()>,
    login: Mutex<()>,
    proxy: Mutex<Vec<ActiveProxy>>,
    sessions: SyncMutex<session::Sessions>,
    closing_all: AtomicBool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct EndpointView {
    id: String,
    name: String,
    origin: String,
    account_id: Option<String>,
    connected: bool,
    credential_error: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProfilesView {
    active: String,
    endpoints: Vec<EndpointView>,
    workspace_open: bool,
}

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct PendingLogin {
    id: String,
    origin: String,
    state: String,
    verifier: String,
    created_at: u64,
}

fn timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
}
fn random_hex() -> String {
    format!("{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple())
}
fn remote_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())
}

fn restricted_write(path: &PathBuf, bytes: &[u8]) -> Result<(), String> {
    #[cfg(unix)]
    {
        use std::io::Write;
        use std::os::unix::fs::OpenOptionsExt;
        let mut file = std::fs::OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .mode(0o600)
            .open(path)
            .map_err(|e| e.to_string())?;
        file.write_all(bytes).map_err(|e| e.to_string())
    }
    #[cfg(not(unix))]
    {
        std::fs::write(path, bytes).map_err(|e| e.to_string())
    }
}

fn pending_path(state: &AppState) -> PathBuf {
    state.directory.join("pending-login.json")
}

fn session_path(state: &AppState) -> PathBuf {
    state.directory.join("workspace-session.json")
}

fn mutate_sessions<T>(
    state: &AppState,
    change: impl FnOnce(&mut session::Sessions) -> Result<T, String>,
) -> Result<T, String> {
    let mut stored = state.sessions.lock().map_err(|_| "桌面会话状态不可用")?;
    let mut next = stored.clone();
    let result = change(&mut next)?;
    session::save(&session_path(state), &next)?;
    *stored = next;
    Ok(result)
}

fn scope_mut<'a>(
    sessions: &'a mut session::Sessions,
    endpoint_id: &str,
    account_id: &str,
) -> Result<&'a mut session::Workspace, String> {
    sessions
        .workspaces
        .iter_mut()
        .find(|scope| scope.endpoint_id == endpoint_id && scope.account_id == account_id)
        .ok_or_else(|| "工作空间会话不存在".into())
}

fn window_snapshot(
    state: &AppState,
    endpoint_id: &str,
    account_id: &str,
    window_id: &str,
) -> Result<serde_json::Value, String> {
    let stored = state.sessions.lock().map_err(|_| "桌面会话状态不可用")?;
    let window = stored
        .workspaces
        .iter()
        .find(|scope| scope.endpoint_id == endpoint_id && scope.account_id == account_id)
        .and_then(|scope| scope.windows.iter().find(|window| window.id == window_id))
        .ok_or("工作空间窗口不存在")?;
    Ok(serde_json::json!({ "window": window }))
}

fn build_workspace_window(
    app: &tauri::AppHandle,
    gate_url: &str,
    endpoint_id: &str,
    account_id: &str,
    window_id: &str,
    window_title: &str,
) -> Result<(), String> {
    let url = Url::parse(&format!("{gate_url}?window={window_id}")).map_err(|e| e.to_string())?;
    let mut builder = WebviewWindowBuilder::new(
        app,
        format!("workspace-{window_id}"),
        WebviewUrl::External(url),
    )
    .title(window_title)
    .inner_size(1280.0, 820.0);
    let profile_id = format!("{endpoint_id}:{account_id}");
    #[cfg(target_os = "macos")]
    {
        let digest = Sha256::digest(profile_id.as_bytes());
        let mut identifier = [0u8; 16];
        identifier.copy_from_slice(&digest[..16]);
        builder = builder.data_store_identifier(identifier);
    }
    #[cfg(not(target_os = "macos"))]
    {
        let safe_id = hex::encode(Sha256::digest(profile_id.as_bytes()));
        builder = builder.data_directory(
            app.path()
                .app_local_data_dir()
                .map_err(|e| e.to_string())?
                .join("webviews")
                .join(safe_id),
        );
    }
    builder
        .build()
        .map_err(|e| format!("无法打开工作空间：{e}"))?;
    Ok(())
}

async fn revoke_remote(directory: &Path, id: &str, origin: &str) -> Result<(), String> {
    let token = match credentials::get_token(directory, id)? {
        Some(token) => token,
        None => return Ok(()),
    };
    let response = remote_client()?
        .post(format!("{origin}/api/v1/auth/desktop/revoke"))
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| format!("远端不可用，凭据仍已保留：{e}"))?;
    if !response.status().is_success() && response.status() != reqwest::StatusCode::UNAUTHORIZED {
        return Err(format!(
            "远端未确认退出，凭据仍已保留：{}",
            response.status()
        ));
    }
    credentials::delete_token(directory, id)
        .map_err(|e| format!("远端已退出，但无法删除桌面凭据：{e}"))
}

#[tauri::command]
async fn get_profiles(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<ProfilesView, String> {
    let stored = state.settings.lock().await.clone();
    let mut endpoints = Vec::with_capacity(stored.endpoints.len());
    for entry in stored.endpoints {
        let (connected, credential_error) =
            match credentials::has_token(&state.directory, &entry.id) {
                Ok(connected) => (connected, None),
                Err(error) => (false, Some(error)),
            };
        endpoints.push(EndpointView {
            connected,
            credential_error,
            id: entry.id,
            name: entry.name,
            origin: entry.origin,
            account_id: entry.account_id,
        });
    }
    Ok(ProfilesView {
        active: stored.active,
        endpoints,
        workspace_open: app
            .webview_windows()
            .keys()
            .any(|label| label.starts_with("workspace-")),
    })
}

#[tauri::command]
async fn add_endpoint(
    state: tauri::State<'_, AppState>,
    name: String,
    origin: String,
) -> Result<(), String> {
    let normalized = settings::canonical_origin(&origin)?;
    let name = name.trim().to_string();
    if name.is_empty() || name.len() > 80 {
        return Err("请输入 1–80 字节的名称".into());
    }
    let mut stored = state.settings.lock().await;
    if stored
        .endpoints
        .iter()
        .any(|item| item.origin == normalized)
    {
        return Err("此后端地址已经添加".into());
    }
    let mut next = stored.clone();
    next.endpoints.push(settings::Endpoint {
        id: Uuid::new_v4().to_string(),
        name,
        origin: normalized,
        account_id: None,
    });
    settings::save(&state.directory.join("profiles.json"), &next)?;
    *stored = next;
    Ok(())
}

#[tauri::command]
async fn rename_endpoint(
    state: tauri::State<'_, AppState>,
    id: String,
    name: String,
) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() || name.len() > 80 {
        return Err("请输入 1–80 字节的名称".into());
    }
    let mut stored = state.settings.lock().await;
    let mut next = stored.clone();
    let entry = next
        .endpoints
        .iter_mut()
        .find(|item| item.id == id)
        .ok_or("地址不存在")?;
    entry.name = name;
    settings::save(&state.directory.join("profiles.json"), &next)?;
    *stored = next;
    Ok(())
}

#[tauri::command]
async fn remove_endpoint(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    let _guard = state.operation.lock().await;
    let stored = state.settings.lock().await.clone();
    if !stored.endpoints.iter().any(|item| item.id == id) {
        return Err("地址不存在".into());
    }
    let origin = stored
        .endpoints
        .iter()
        .find(|item| item.id == id)
        .unwrap()
        .origin
        .clone();
    revoke_remote(&state.directory, &id, &origin).await?;
    let mut next = stored.clone();
    if next.active == id {
        next.active = "local".into();
    }
    next.endpoints.retain(|item| item.id != id);
    settings::save(&state.directory.join("profiles.json"), &next)?;
    {
        let account = stored
            .endpoints
            .iter()
            .find(|item| item.id == id)
            .and_then(|item| item.account_id.clone());
        close_scope_windows(&app, &state, &id, account.as_deref());
        stop_endpoint_proxies(&state, &id, None).await;
    }
    *state.settings.lock().await = next;
    mutate_sessions(&state, |sessions| {
        sessions.clear_endpoint(&id);
        Ok(())
    })?;
    Ok(())
}

#[tauri::command]
async fn sign_out(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    let _guard = state.operation.lock().await;
    let stored = state.settings.lock().await.clone();
    let entry = stored
        .endpoints
        .iter()
        .find(|item| item.id == id)
        .ok_or("地址不存在")?;
    revoke_remote(&state.directory, &id, &entry.origin).await?;
    mutate_sessions(&state, |sessions| {
        if let Some(account_id) = entry.account_id.as_deref() {
            sessions.clear_account(&id, account_id);
        }
        Ok(())
    })?;
    close_scope_windows(&app, &state, &id, entry.account_id.as_deref());
    stop_endpoint_proxies(&state, &id, None).await;
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
    Ok(())
}

#[derive(Deserialize)]
struct StartResponse {
    url: String,
}

#[tauri::command]
async fn start_login(state: tauri::State<'_, AppState>, id: String) -> Result<(), String> {
    let entry = state
        .settings
        .lock()
        .await
        .endpoints
        .iter()
        .find(|e| e.id == id)
        .cloned()
        .ok_or("地址不存在")?;
    let state_value = random_hex();
    let verifier = URL_SAFE_NO_PAD.encode(hex::decode(random_hex()).map_err(|e| e.to_string())?);
    let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
    let response = remote_client()?
        .post(format!("{}/api/v1/auth/desktop/start", entry.origin))
        .json(&serde_json::json!({"state": state_value, "challenge": challenge}))
        .send()
        .await
        .map_err(|e| format!("无法连接后端：{e}"))?;
    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return Err("此后端尚不支持桌面登录，请升级服务端".into());
    }
    if !response.status().is_success() {
        return Err(format!("后端拒绝桌面登录：{}", response.status()));
    }
    let result: StartResponse = response
        .json()
        .await
        .map_err(|_| "后端返回无效的桌面登录地址".to_string())?;
    let url = Url::parse(&result.url).map_err(|_| "后端登录地址无效".to_string())?;
    let expected_fragment = format!("/desktop-connect?state={state_value}");
    if url.origin().ascii_serialization() != entry.origin
        || url.fragment() != Some(expected_fragment.as_str())
    {
        return Err("后端登录地址与请求不匹配".into());
    }
    let pending = PendingLogin {
        id,
        origin: entry.origin,
        state: state_value,
        verifier,
        created_at: timestamp(),
    };
    restricted_write(
        &pending_path(&state),
        &serde_json::to_vec(&pending).map_err(|e| e.to_string())?,
    )?;
    open::that(result.url).map_err(|e| format!("无法打开系统浏览器：{e}"))
}

async fn finish_login(app: tauri::AppHandle, url: Url) -> Result<(), String> {
    let state = app.state::<AppState>();
    let _guard = state.login.lock().await;
    if url.scheme() != "doca" || url.host_str() != Some("auth") || url.path() != "/complete" {
        return Err("桌面回跳地址无效".into());
    }
    let pending: PendingLogin = serde_json::from_slice(
        &std::fs::read(pending_path(&state)).map_err(|_| "没有等待中的桌面登录".to_string())?,
    )
    .map_err(|_| "等待中的桌面登录记录无效".to_string())?;
    if timestamp().saturating_sub(pending.created_at) > 300 {
        return Err("桌面登录请求已过期".into());
    }
    let parameters: std::collections::HashMap<_, _> = url.query_pairs().into_owned().collect();
    let code = parameters.get("code").ok_or("回跳缺少授权码")?;
    if parameters.get("origin") != Some(&pending.origin)
        || parameters.get("state") != Some(&pending.state)
        || code.len() != 64
        || !code.bytes().all(|b| b.is_ascii_hexdigit())
    {
        return Err("桌面登录请求与回跳不匹配".into());
    }
    #[derive(Deserialize)]
    struct Exchange {
        token: String,
        user: User,
    }
    #[derive(Deserialize)]
    struct User {
        id: String,
    }
    let response = remote_client()?.post(format!("{}/api/v1/auth/desktop/exchange", pending.origin))
        .json(&serde_json::json!({"state":pending.state,"code":code,"verifier":pending.verifier,"deviceName":"Doca Desktop"}))
        .send().await.map_err(|e| format!("无法兑换桌面授权：{e}"))?;
    if !response.status().is_success() {
        return Err(format!("桌面授权已失效：{}", response.status()));
    }
    let exchange: Exchange = response
        .json()
        .await
        .map_err(|_| "桌面授权响应无效".to_string())?;
    if !exchange.token.starts_with("doca_desktop_v1_") {
        return Err("桌面授权凭据格式无效".into());
    }
    let mut stored = state.settings.lock().await;
    let entry = stored
        .endpoints
        .iter_mut()
        .find(|e| e.id == pending.id && e.origin == pending.origin)
        .ok_or("桌面地址已变更")?;
    credentials::set_token(&state.directory, &pending.id, &exchange.token)
        .map_err(|e| format!("无法保存桌面凭据：{e}"))?;
    entry.account_id = Some(exchange.user.id);
    if let Err(error) = settings::save(&state.directory.join("profiles.json"), &stored) {
        let _ = credentials::delete_token(&state.directory, &pending.id);
        return Err(error);
    }
    std::fs::remove_file(pending_path(&state)).map_err(|e| e.to_string())?;
    drop(stored);
    open_profile_inner(&app, &state, pending.id)
        .await
        .map_err(|error| format!("浏览器登录已完成，但工作空间未能打开：{error}"))?;
    app.emit("desktop-login-complete", ())
        .map_err(|e| e.to_string())
}

async fn process_deep_link(app: tauri::AppHandle, url: Url) {
    if let Err(error) = finish_login(app.clone(), url).await {
        let state = app.state::<AppState>();
        if pending_path(&state).exists() {
            let _ = app.emit("desktop-login-failed", error);
        }
    }
}

async fn handle_action(
    app: &tauri::AppHandle,
    generation: Uuid,
    action: proxy::Action,
) -> Result<serde_json::Value, String> {
    let state = app.state::<AppState>();
    let _guard = state.operation.lock().await;
    let (endpoint_id, account_id, gate_url) = {
        let active = state.proxy.lock().await;
        let proxy = active
            .iter()
            .find(|proxy| proxy.generation == generation)
            .ok_or("工作空间已切换")?;
        (
            proxy.endpoint_id.clone(),
            proxy.account_id.clone(),
            proxy.gate_url.clone(),
        )
    };
    match action {
        proxy::Action::Snapshot { window_id } => {
            window_snapshot(&state, &endpoint_id, &account_id, &window_id)
        }
        proxy::Action::NewTab { window_id } => {
            mutate_sessions(&state, |sessions| {
                let workspace = scope_mut(sessions, &endpoint_id, &account_id)?;
                let total: usize = workspace
                    .windows
                    .iter()
                    .map(|window| window.tabs.len())
                    .sum();
                let window = workspace
                    .windows
                    .iter_mut()
                    .find(|window| window.id == window_id)
                    .ok_or("工作空间窗口不存在")?;
                if total >= session::MAX_TABS || window.tabs.len() >= session::MAX_TABS_PER_WINDOW {
                    return Err("标签页数量已达上限".into());
                }
                let insert_at = window
                    .tabs
                    .iter()
                    .position(|tab| tab.id == window.active_tab)
                    .map(|index| index + 1)
                    .unwrap_or(window.tabs.len());
                let tab = session::Tab::home();
                window.active_tab = tab.id.clone();
                window.tabs.insert(insert_at, tab);
                Ok(())
            })?;
            window_snapshot(&state, &endpoint_id, &account_id, &window_id)
        }
        proxy::Action::OpenTab { window_id, hash } => {
            if !session::valid_hash(&hash) {
                return Err("只能打开 Doca 站内页面".into());
            }
            mutate_sessions(&state, |sessions| {
                let workspace = scope_mut(sessions, &endpoint_id, &account_id)?;
                let total: usize = workspace
                    .windows
                    .iter()
                    .map(|window| window.tabs.len())
                    .sum();
                let window = workspace
                    .windows
                    .iter_mut()
                    .find(|window| window.id == window_id)
                    .ok_or("工作空间窗口不存在")?;
                if total >= session::MAX_TABS || window.tabs.len() >= session::MAX_TABS_PER_WINDOW {
                    return Err("标签页数量已达上限".into());
                }
                let insert_at = window
                    .tabs
                    .iter()
                    .position(|tab| tab.id == window.active_tab)
                    .map(|index| index + 1)
                    .unwrap_or(window.tabs.len());
                let mut tab = session::Tab::home();
                tab.hash = hash;
                window.active_tab = tab.id.clone();
                window.tabs.insert(insert_at, tab);
                Ok(())
            })?;
            window_snapshot(&state, &endpoint_id, &account_id, &window_id)
        }
        proxy::Action::SelectTab { window_id, tab_id } => {
            mutate_sessions(&state, |sessions| {
                let workspace = scope_mut(sessions, &endpoint_id, &account_id)?;
                let window = workspace
                    .windows
                    .iter_mut()
                    .find(|window| window.id == window_id)
                    .ok_or("工作空间窗口不存在")?;
                if !window.tabs.iter().any(|tab| tab.id == tab_id) {
                    return Err("标签页不存在".into());
                }
                window.active_tab = tab_id;
                Ok(())
            })?;
            window_snapshot(&state, &endpoint_id, &account_id, &window_id)
        }
        proxy::Action::CloseTab { window_id, tab_id } => {
            let closed_window = mutate_sessions(&state, |sessions| {
                let workspace = scope_mut(sessions, &endpoint_id, &account_id)?;
                let index = workspace
                    .windows
                    .iter()
                    .position(|window| window.id == window_id)
                    .ok_or("工作空间窗口不存在")?;
                let window = &mut workspace.windows[index];
                let tab_index = window
                    .tabs
                    .iter()
                    .position(|tab| tab.id == tab_id)
                    .ok_or("标签页不存在")?;
                window.tabs.remove(tab_index);
                if window.tabs.is_empty() {
                    workspace.windows.remove(index);
                } else if window.active_tab == tab_id {
                    window.active_tab =
                        window.tabs[tab_index.min(window.tabs.len() - 1)].id.clone();
                }
                let closed = workspace
                    .windows
                    .iter()
                    .all(|window| window.id != window_id);
                if workspace.windows.is_empty() {
                    sessions.workspaces.retain(|scope| {
                        scope.endpoint_id != endpoint_id || scope.account_id != account_id
                    });
                }
                Ok(closed)
            })?;
            if closed_window {
                if let Some(window) = app.get_webview_window(&format!("workspace-{window_id}")) {
                    tokio::spawn(async move {
                        tokio::time::sleep(Duration::from_millis(120)).await;
                        let _ = window.close();
                    });
                }
                if !app.webview_windows().keys().any(|label| {
                    label.starts_with("workspace-") && label != &format!("workspace-{window_id}")
                }) {
                    if let Some(manager) = app.get_webview_window("main") {
                        let _ = manager.show();
                    }
                }
                Ok(serde_json::json!({ "window": null }))
            } else {
                window_snapshot(&state, &endpoint_id, &account_id, &window_id)
            }
        }
        proxy::Action::NewWindow { window_id, hash } => {
            let mut new_window = session::Window::home();
            if let Some(hash) = &hash {
                if !session::valid_hash(hash) {
                    return Err("只能打开 Doca 站内页面".into());
                }
                new_window.tabs[0].hash = hash.clone();
            }
            mutate_sessions(&state, |sessions| {
                let workspace = scope_mut(sessions, &endpoint_id, &account_id)?;
                if workspace.windows.len() >= session::MAX_WINDOWS {
                    return Err("窗口数量已达上限".into());
                }
                workspace.windows.push(new_window.clone());
                Ok(())
            })?;
            let window_title = {
                let stored = state.settings.lock().await;
                stored
                    .endpoints
                    .iter()
                    .find(|entry| entry.id == endpoint_id)
                    .map(|entry| format!("{} · {}", entry.name, entry.origin))
                    .unwrap_or_else(|| "Doca · 工作空间".into())
            };
            if let Err(error) = build_workspace_window(
                app,
                &gate_url,
                &endpoint_id,
                &account_id,
                &new_window.id,
                &window_title,
            ) {
                let _ = mutate_sessions(&state, |sessions| {
                    let workspace = scope_mut(sessions, &endpoint_id, &account_id)?;
                    workspace
                        .windows
                        .retain(|window| window.id != new_window.id);
                    Ok(())
                });
                return Err(error);
            }
            window_snapshot(&state, &endpoint_id, &account_id, &window_id)
        }
        proxy::Action::UpdateTab {
            window_id,
            tab_id,
            hash,
            title,
        } => {
            if !session::valid_hash(&hash) {
                return Err("只能保存 Doca 站内页面".into());
            }
            let mut title: String = title.chars().filter(|ch| !ch.is_control()).collect();
            while title.len() > 200 {
                title.pop();
            }
            if title.is_empty() {
                title = "Doca".into();
            }
            mutate_sessions(&state, |sessions| {
                let workspace = scope_mut(sessions, &endpoint_id, &account_id)?;
                let window = workspace
                    .windows
                    .iter_mut()
                    .find(|window| window.id == window_id)
                    .ok_or("工作空间窗口不存在")?;
                let tab = window
                    .tabs
                    .iter_mut()
                    .find(|tab| tab.id == tab_id)
                    .ok_or("标签页不存在")?;
                tab.hash = hash;
                tab.title = title;
                Ok(())
            })?;
            window_snapshot(&state, &endpoint_id, &account_id, &window_id)
        }
        proxy::Action::ReorderTab {
            window_id,
            tab_id,
            index,
        } => {
            mutate_sessions(&state, |sessions| {
                let workspace = scope_mut(sessions, &endpoint_id, &account_id)?;
                let window = workspace
                    .windows
                    .iter_mut()
                    .find(|window| window.id == window_id)
                    .ok_or("工作空间窗口不存在")?;
                let from = window
                    .tabs
                    .iter()
                    .position(|tab| tab.id == tab_id)
                    .ok_or("标签页不存在")?;
                let tab = window.tabs.remove(from);
                let to = index.min(window.tabs.len());
                window.tabs.insert(to, tab);
                Ok(())
            })?;
            window_snapshot(&state, &endpoint_id, &account_id, &window_id)
        }
    }
}

async fn handle_session_end(app: tauri::AppHandle, generation: Uuid) {
    tokio::time::sleep(Duration::from_millis(300)).await;
    let state = app.state::<AppState>();
    let _guard = state.operation.lock().await;
    let scope = {
        let active = state.proxy.lock().await;
        active
            .iter()
            .find(|proxy| proxy.generation == generation)
            .map(|proxy| (proxy.endpoint_id.clone(), proxy.account_id.clone()))
    };
    let Some((endpoint_id, account_id)) = scope else {
        return;
    };
    let vault_result = credentials::delete_token(&state.directory, &endpoint_id);
    let result = mutate_sessions(&state, |sessions| {
        sessions.clear_account(&endpoint_id, &account_id);
        Ok(())
    });
    close_scope_windows(&app, &state, &endpoint_id, Some(&account_id));
    stop_endpoint_proxies(&state, &endpoint_id, Some(&account_id)).await;
    if let Some(manager) = app.get_webview_window("main") {
        let _ = manager.show();
        let _ = manager.set_focus();
    }
    if let Err(error) = result {
        let _ = app.emit("desktop-session-error", error);
    }
    if let Err(error) = vault_result {
        if !error.is_empty() {
            let _ = app.emit("desktop-session-error", error);
        }
    }
    let _ = app.emit("desktop-session-ended", ());
}

// Window teardown must not run the user's CloseRequested handler: Tauri
// queues close() on the event loop, so a short-lived flag can reset before
// that handler runs and erase the restorable session.
fn close_scope_windows(
    app: &tauri::AppHandle,
    state: &AppState,
    endpoint_id: &str,
    account_id: Option<&str>,
) {
    let ids: Vec<String> = {
        let stored = match state.sessions.lock() {
            Ok(stored) => stored,
            Err(_) => return,
        };
        stored
            .workspaces
            .iter()
            .filter(|scope| {
                scope.endpoint_id == endpoint_id
                    && account_id.is_none_or(|account| scope.account_id == account)
            })
            .flat_map(|scope| scope.windows.iter().map(|window| window.id.clone()))
            .collect()
    };
    if ids.is_empty() {
        return;
    }
    let was_closing = state.closing_all.swap(true, Ordering::SeqCst);
    for (label, window) in app.webview_windows() {
        if let Some(id) = label.strip_prefix("workspace-") {
            if ids.iter().any(|item| item == id) {
                let _ = window.destroy();
            }
        }
    }
    state.closing_all.store(was_closing, Ordering::SeqCst);
}

async fn stop_endpoint_proxies(state: &AppState, endpoint_id: &str, account_id: Option<&str>) {
    let mut proxies = state.proxy.lock().await;
    let mut index = 0;
    while index < proxies.len() {
        let matches = proxies[index].endpoint_id == endpoint_id
            && account_id.is_none_or(|account| proxies[index].account_id == account);
        if matches {
            let proxy = proxies.remove(index);
            proxy.server.abort();
            proxy.controller.abort();
        } else {
            index += 1;
        }
    }
}

#[tauri::command]
async fn open_profile(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    open_profile_inner(&app, &state, id).await
}

async fn open_profile_inner(
    app: &tauri::AppHandle,
    state: &AppState,
    id: String,
) -> Result<(), String> {
    let _guard = state.operation.lock().await;
    let static_root = if cfg!(debug_assertions) {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../web/dist")
    } else {
        app.path()
            .resource_dir()
            .map_err(|e| e.to_string())?
            .join("web")
    };
    if !static_root.join("index.html").is_file() {
        return Err("内置前端缺少入口文件".into());
    }
    let stored = state.settings.lock().await.clone();
    let entry = stored
        .endpoints
        .iter()
        .find(|e| e.id == id)
        .ok_or("请选择远端服务")?
        .clone();
    let account_id = entry.account_id.clone().ok_or("请先通过浏览器登录此服务")?;
    let bearer =
        credentials::get_token(&state.directory, &entry.id)?.ok_or("请先通过浏览器登录此服务")?;
    {
        let proxies = state.proxy.lock().await;
        if proxies
            .iter()
            .any(|proxy| proxy.endpoint_id == id && proxy.account_id == account_id)
        {
            // The backend is already connected: only rebuild missing windows
            // and bring the workspace to the front. Other backends keep
            // running.
            let gate_url = proxies
                .iter()
                .find(|proxy| proxy.endpoint_id == id && proxy.account_id == account_id)
                .map(|proxy| proxy.gate_url.clone())
                .unwrap_or_default();
            drop(proxies);
            let windows = {
                let stored = state.sessions.lock().map_err(|_| "桌面会话状态不可用")?;
                stored.windows_for(&id, &account_id)
            };
            let windows = windows.filter(|windows| !windows.is_empty());
            for window in windows.iter().flatten() {
                let label = format!("workspace-{}", window.id);
                if app.get_webview_window(&label).is_none() {
                    let window_title = format!("{} · {}", entry.name, entry.origin);
                    build_workspace_window(
                        app,
                        &gate_url,
                        &id,
                        &account_id,
                        &window.id,
                        &window_title,
                    )?;
                }
            }
            let scope_ids: Vec<String> = windows
                .iter()
                .flatten()
                .map(|window| window.id.clone())
                .collect();
            if let Some((_, window)) = app.webview_windows().into_iter().find(|(label, _)| {
                label
                    .strip_prefix("workspace-")
                    .is_some_and(|id| scope_ids.iter().any(|item| item == id))
            }) {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
            if let Some(manager) = app.get_webview_window("main") {
                let _ = manager.hide();
            }
            return Ok(());
        }
    }
    // A different account on the same endpoint must not keep running. Other
    // endpoints are intentionally left untouched.
    {
        let scopes: Vec<(String, String)> = {
            let stored_sessions = state.sessions.lock().map_err(|_| "桌面会话状态不可用")?;
            stored_sessions
                .workspaces
                .iter()
                .filter(|scope| scope.endpoint_id == id)
                .map(|scope| (scope.endpoint_id.clone(), scope.account_id.clone()))
                .collect()
        };
        for (endpoint, account) in scopes {
            close_scope_windows(app, state, &endpoint, Some(&account));
        }
        stop_endpoint_proxies(state, &id, None).await;
    }
    let windows = {
        let stored = state.sessions.lock().map_err(|_| "桌面会话状态不可用")?;
        stored.windows_for(&id, &account_id)
    };
    let windows = if let Some(windows) = windows {
        if windows.is_empty() {
            vec![session::Window::home()]
        } else {
            windows
        }
    } else {
        vec![session::Window::home()]
    };
    mutate_sessions(state, |sessions| {
        if let Some(scope) = sessions
            .workspaces
            .iter_mut()
            .find(|scope| scope.endpoint_id == id && scope.account_id == account_id)
        {
            scope.windows = windows.clone();
        } else {
            sessions.workspaces.push(session::Workspace {
                endpoint_id: id.clone(),
                account_id: account_id.clone(),
                windows: windows.clone(),
            });
        }
        Ok(())
    })?;
    let (control_sender, mut control_receiver) = tokio::sync::mpsc::unbounded_channel();
    let (_origin, gate_url, server) =
        proxy::start(entry.origin.clone(), bearer, static_root, control_sender).await?;
    let generation = Uuid::new_v4();
    let control_app = app.clone();
    let controller = tokio::spawn(async move {
        while let Some(message) = control_receiver.recv().await {
            match message {
                proxy::Control::ShowManager => {
                    if let Some(window) = control_app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.unminimize();
                        let _ = window.set_focus();
                    }
                }
                proxy::Control::Action(action, reply) => {
                    let _ = reply.send(handle_action(&control_app, generation, action).await);
                }
                proxy::Control::Logout | proxy::Control::Expired => {
                    let end_app = control_app.clone();
                    tokio::spawn(async move {
                        handle_session_end(end_app, generation).await;
                    });
                }
            }
        }
    });
    state.proxy.lock().await.push(ActiveProxy {
        server,
        controller,
        generation,
        endpoint_id: id.clone(),
        account_id: account_id.clone(),
        gate_url: gate_url.clone(),
    });
    let window_title = format!("{} · {}", entry.name, entry.origin);
    for window in &windows {
        if let Err(error) =
            build_workspace_window(app, &gate_url, &id, &account_id, &window.id, &window_title)
        {
            close_scope_windows(app, state, &id, Some(&account_id));
            stop_endpoint_proxies(state, &id, Some(&account_id)).await;
            return Err(error);
        }
    }
    let mut stored = state.settings.lock().await;
    if stored.active != id {
        let mut next = stored.clone();
        next.active = id.clone();
        if let Err(error) = settings::save(&state.directory.join("profiles.json"), &next) {
            close_scope_windows(app, state, &id, Some(&account_id));
            stop_endpoint_proxies(state, &id, Some(&account_id)).await;
            return Err(error);
        }
        *stored = next;
    }
    if let Some(manager) = app.get_webview_window("main") {
        let _ = manager.hide();
    }
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _| {
            for value in args {
                if let Ok(url) = Url::parse(&value) {
                    if url.scheme() == "doca" {
                        let app = app.clone();
                        tauri::async_runtime::spawn(async move {
                            process_deep_link(app, url).await;
                        });
                    }
                }
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .on_window_event(|window, event| {
            let WindowEvent::CloseRequested { api, .. } = event else {
                return;
            };
            let label = window.label();
            let app = window.app_handle();
            let state = app.state::<AppState>();
            if state.closing_all.load(Ordering::SeqCst) {
                return;
            }
            if label == "main" {
                if app
                    .webview_windows()
                    .keys()
                    .any(|name| name.starts_with("workspace-"))
                {
                    api.prevent_close();
                    let _ = window.hide();
                }
                return;
            }
            let Some(window_id) = label.strip_prefix("workspace-") else {
                return;
            };
            let recorded = state.sessions.lock().ok().is_some_and(|sessions| {
                sessions
                    .workspaces
                    .iter()
                    .any(|scope| scope.windows.iter().any(|item| item.id == window_id))
            });
            if !recorded {
                return;
            }
            if let Err(error) = mutate_sessions(&state, |sessions| {
                for scope in &mut sessions.workspaces {
                    scope.windows.retain(|item| item.id != window_id);
                }
                sessions
                    .workspaces
                    .retain(|scope| !scope.windows.is_empty());
                Ok(())
            }) {
                api.prevent_close();
                let _ = app.emit("desktop-session-error", error);
                return;
            }
            if !app
                .webview_windows()
                .keys()
                .any(|name| name.starts_with("workspace-") && name != label)
            {
                if let Some(manager) = app.get_webview_window("main") {
                    let _ = manager.show();
                    let _ = manager.set_focus();
                }
            }
        })
        .setup(|app| {
            let directory = app.path().app_data_dir()?;
            #[cfg(debug_assertions)]
            let directory = std::env::var_os("DOCA_DESKTOP_TEST_DATA_DIR")
                .map(PathBuf::from)
                .unwrap_or(directory);
            if !directory.is_absolute() {
                return Err(std::io::Error::new(
                    std::io::ErrorKind::InvalidInput,
                    "Desktop data path must be absolute",
                )
                .into());
            }
            std::fs::create_dir_all(&directory)?;
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                std::fs::set_permissions(&directory, std::fs::Permissions::from_mode(0o700))?;
            }
            let stored =
                settings::read(&directory.join("profiles.json")).map_err(std::io::Error::other)?;
            let sessions = session::read(&directory.join("workspace-session.json"))
                .map_err(std::io::Error::other)?;
            app.manage(AppState {
                directory,
                settings: Mutex::new(stored),
                operation: Mutex::new(()),
                login: Mutex::new(()),
                proxy: Mutex::new(Vec::new()),
                sessions: SyncMutex::new(sessions),
                closing_all: AtomicBool::new(false),
            });
            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                for url in event.urls() {
                    let handle = handle.clone();
                    let url = url.clone();
                    tauri::async_runtime::spawn(async move {
                        process_deep_link(handle, url).await;
                    });
                }
            });
            let mut has_deep_link = false;
            if let Some(urls) = app.deep_link().get_current()? {
                has_deep_link = !urls.is_empty();
                for url in urls {
                    let handle = app.handle().clone();
                    tauri::async_runtime::spawn(async move {
                        process_deep_link(handle, url).await;
                    });
                }
            }
            if !has_deep_link {
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    let state = handle.state::<AppState>();
                    let active = state.settings.lock().await.active.clone();
                    if active != "local"
                        && credentials::has_token(&state.directory, &active) == Ok(true)
                    {
                        if let Err(error) = open_profile_inner(&handle, &state, active).await {
                            let _ = handle.emit("desktop-restore-failed", error);
                        }
                    }
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_profiles,
            add_endpoint,
            rename_endpoint,
            remove_endpoint,
            sign_out,
            start_login,
            open_profile
        ])
        .build(tauri::generate_context!())
        .expect("Doca desktop failed to start")
        .run(|app, event| {
            if matches!(event, tauri::RunEvent::ExitRequested { .. }) {
                app.state::<AppState>()
                    .closing_all
                    .store(true, Ordering::SeqCst);
            }
        });
}
