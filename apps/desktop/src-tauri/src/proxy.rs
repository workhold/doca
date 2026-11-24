use axum::{
    body::Body,
    extract::{
        ws::{Message, WebSocket},
        Path, Query, State, WebSocketUpgrade,
    },
    http::{header, HeaderMap, Method, Request, Response, StatusCode, Uri},
    response::{
        sse::{Event, KeepAlive, Sse},
        Html, IntoResponse, Redirect,
    },
    routing::{any, get, post},
    Router,
};
use futures_util::{SinkExt, StreamExt};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::{
    convert::Infallible,
    path::{Path as FsPath, PathBuf},
    sync::Arc,
};
use tokio::sync::{broadcast, mpsc, oneshot};
use tokio_tungstenite::tungstenite::{client::IntoClientRequest, Message as UpstreamMessage};

pub struct ProxyConfig {
    pub origin: String,
    pub target: String,
    pub capability: String,
    pub bearer: String,
    pub static_root: PathBuf,
    pub client: reqwest::Client,
    pub control: mpsc::UnboundedSender<Control>,
    pub updated: broadcast::Sender<()>,
}

#[derive(Deserialize)]
#[serde(
    tag = "type",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum Action {
    Snapshot {
        window_id: String,
    },
    NewTab {
        window_id: String,
    },
    OpenTab {
        window_id: String,
        hash: String,
    },
    SelectTab {
        window_id: String,
        tab_id: String,
    },
    CloseTab {
        window_id: String,
        tab_id: String,
    },
    NewWindow {
        window_id: String,
        hash: Option<String>,
    },
    UpdateTab {
        window_id: String,
        tab_id: String,
        hash: String,
        title: String,
    },
    ReorderTab {
        window_id: String,
        tab_id: String,
        index: usize,
    },
    DownloadFile {
        url: String,
    },
    OpenExternal {
        url: String,
    },
}

pub enum Control {
    ShowManager,
    Action(Action, oneshot::Sender<Result<serde_json::Value, String>>),
    SaveFile {
        path: String,
        reply: oneshot::Sender<Result<Option<String>, String>>,
    },
    Logout,
    Expired,
}

#[derive(Deserialize)]
struct GateQuery {
    window: String,
}

fn allowed(config: &ProxyConfig, headers: &HeaderMap) -> bool {
    let host = config.origin.trim_start_matches("http://");
    if headers.get(header::HOST).and_then(|v| v.to_str().ok()) != Some(host) {
        return false;
    }
    if let Some(origin) = headers.get(header::ORIGIN) {
        if origin.to_str().ok() != Some(config.origin.as_str()) {
            return false;
        }
    }
    headers
        .get(header::COOKIE)
        .and_then(|v| v.to_str().ok())
        .is_some_and(|cookie| {
            cookie
                .split(';')
                .map(str::trim)
                .any(|item| item == format!("doca_desktop_proxy={}", config.capability))
        })
}

async fn gate(
    Path(secret): Path<String>,
    State(config): State<Arc<ProxyConfig>>,
    Query(query): Query<GateQuery>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let host = config.origin.trim_start_matches("http://");
    if secret != config.capability
        || uuid::Uuid::parse_str(&query.window).is_err()
        || headers.get(header::HOST).and_then(|v| v.to_str().ok()) != Some(host)
    {
        return StatusCode::FORBIDDEN.into_response();
    }
    let mut response = Redirect::to(&format!("/_doca/window/{}", query.window)).into_response();
    response.headers_mut().insert(
        header::SET_COOKIE,
        format!(
            "doca_desktop_proxy={}; HttpOnly; SameSite=Strict; Path=/",
            config.capability
        )
        .parse()
        .unwrap(),
    );
    response
}

async fn show_manager(State(config): State<Arc<ProxyConfig>>, headers: HeaderMap) -> StatusCode {
    if !allowed(&config, &headers)
        || headers
            .get(header::ORIGIN)
            .and_then(|value| value.to_str().ok())
            != Some(config.origin.as_str())
    {
        return StatusCode::FORBIDDEN;
    }
    if config.control.send(Control::ShowManager).is_err() {
        return StatusCode::SERVICE_UNAVAILABLE;
    }
    StatusCode::NO_CONTENT
}

async fn tab_shell(
    Path(window_id): Path<String>,
    State(config): State<Arc<ProxyConfig>>,
    headers: HeaderMap,
) -> impl IntoResponse {
    if !allowed(&config, &headers) || uuid::Uuid::parse_str(&window_id).is_err() {
        return StatusCode::FORBIDDEN.into_response();
    }
    (
        [
            (header::CACHE_CONTROL, "no-store"),
            (header::X_CONTENT_TYPE_OPTIONS, "nosniff"),
        ],
        Html(include_str!("tab-shell.html")),
    )
        .into_response()
}

async fn execute_action(config: &ProxyConfig, action: Action) -> Result<serde_json::Value, String> {
    if let Action::DownloadFile { url } = &action {
        // Keep the /api/v1 scope check at the shell trust boundary; the app
        // side fetches with the endpoint credential and asks where to save.
        let path = sanitized_api_path(url).ok_or("下载地址不在允许的接口范围内")?;
        let (reply, receiver) = oneshot::channel();
        config
            .control
            .send(Control::SaveFile { path, reply })
            .map_err(|_| "桌面工作空间不可用".to_string())?;
        let saved = receiver
            .await
            .map_err(|_| "桌面工作空间已关闭".to_string())??;
        return Ok(serde_json::json!({ "saved": saved }));
    }
    if let Action::OpenExternal { url } = &action {
        // Webviews cannot host popups, so the shell routes outside links here.
        // Restrict schemes: LaunchServices would otherwise be reachable for
        // arbitrary protocols from page markup.
        let parsed = url::Url::parse(url).map_err(|_| "无效的外部链接".to_string())?;
        if !matches!(parsed.scheme(), "http" | "https" | "mailto" | "tel") {
            return Err("不支持的外部链接类型".to_string());
        }
        open::that(parsed.as_str()).map_err(|error| format!("无法打开系统浏览器：{error}"))?;
        return Ok(serde_json::json!({ "opened": true }));
    }
    let (reply, response) = oneshot::channel();
    config
        .control
        .send(Control::Action(action, reply))
        .map_err(|_| "桌面工作空间不可用".to_string())?;
    response
        .await
        .map_err(|_| "桌面工作空间已关闭".to_string())?
}

async fn session_snapshot(
    State(config): State<Arc<ProxyConfig>>,
    headers: HeaderMap,
    Query(query): Query<GateQuery>,
) -> impl IntoResponse {
    if !allowed(&config, &headers) {
        return StatusCode::FORBIDDEN.into_response();
    }
    match execute_action(
        &config,
        Action::Snapshot {
            window_id: query.window,
        },
    )
    .await
    {
        Ok(value) => axum::Json(value).into_response(),
        Err(message) => (StatusCode::CONFLICT, message).into_response(),
    }
}

async fn session_action(
    State(config): State<Arc<ProxyConfig>>,
    headers: HeaderMap,
    axum::Json(action): axum::Json<Action>,
) -> impl IntoResponse {
    if !allowed(&config, &headers)
        || headers.get(header::ORIGIN).and_then(|v| v.to_str().ok()) != Some(config.origin.as_str())
    {
        return StatusCode::FORBIDDEN.into_response();
    }
    match execute_action(&config, action).await {
        Ok(value) => {
            // Every successful mutation can affect other workspace windows;
            // broadcast so their shells refresh through the SSE stream.
            let _ = config.updated.send(());
            axum::Json(value).into_response()
        }
        Err(message) => (StatusCode::CONFLICT, message).into_response(),
    }
}

async fn session_events(
    State(config): State<Arc<ProxyConfig>>,
    headers: HeaderMap,
) -> impl IntoResponse {
    if !allowed(&config, &headers) {
        return StatusCode::FORBIDDEN.into_response();
    }
    let rx = config.updated.subscribe();
    let stream = futures_util::stream::unfold(rx, |mut rx| async move {
        loop {
            match rx.recv().await {
                Ok(()) => {
                    return Some((
                        Ok::<Event, Infallible>(Event::default().data("refresh")),
                        rx,
                    ))
                }
                Err(broadcast::error::RecvError::Lagged(_)) => continue,
                Err(_) => return None,
            }
        }
    });
    Sse::new(stream)
        .keep_alive(KeepAlive::default())
        .into_response()
}

fn skip_header(name: &header::HeaderName) -> bool {
    matches!(
        name.as_str(),
        "host"
            | "cookie"
            | "authorization"
            | "origin"
            | "referer"
            | "connection"
            | "upgrade"
            | "proxy-authorization"
            | "proxy-authenticate"
            | "keep-alive"
            | "transfer-encoding"
            | "te"
            | "trailer"
    )
}

fn static_file(path: &str) -> Option<&str> {
    if path == "/" {
        return Some("index.html");
    }
    if path == "/favicon.svg" {
        return Some("favicon.svg");
    }
    if path == "/doca.webmanifest" {
        return Some("doca.webmanifest");
    }
    if let Some(name) = path.strip_prefix("/assets/") {
        if !name.is_empty()
            && name != "."
            && name != ".."
            && name.len() <= 255
            && name
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-' | b'.'))
        {
            return Some(&path[1..]);
        }
    }
    match path {
        "/cad/libredwg-web.wasm"
        | "/cad/libredwg-parser-worker.js"
        | "/cad/mtext-renderer-worker.js" => Some(&path[1..]),
        _ => None,
    }
}

async fn bundled_asset(root: &FsPath, path: &str, method: &Method) -> Response<Body> {
    let Some(relative) = static_file(path) else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let Ok(file) = tokio::fs::canonicalize(root.join(relative)).await else {
        return StatusCode::NOT_FOUND.into_response();
    };
    if !file.starts_with(root) {
        return StatusCode::NOT_FOUND.into_response();
    }
    let Ok(bytes) = tokio::fs::read(&file).await else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let mime = match file
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
    {
        "html" => "text/html; charset=utf-8",
        "js" | "mjs" => "text/javascript; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "svg" => "image/svg+xml",
        "webmanifest" => "application/manifest+json; charset=utf-8",
        "wasm" => "application/wasm",
        "ttf" => "font/ttf",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        _ => "application/octet-stream",
    };
    Response::builder()
        .header(header::CONTENT_TYPE, mime)
        .header(header::X_CONTENT_TYPE_OPTIONS, "nosniff")
        .header(
            header::CACHE_CONTROL,
            if path.starts_with("/assets/") {
                "public, max-age=31536000, immutable"
            } else {
                "no-cache"
            },
        )
        .header(header::CONTENT_LENGTH, bytes.len().to_string())
        .body(if *method == Method::HEAD {
            Body::empty()
        } else {
            Body::from(bytes)
        })
        .unwrap_or_else(|_| StatusCode::INTERNAL_SERVER_ERROR.into_response())
}

async fn forward(
    State(config): State<Arc<ProxyConfig>>,
    request: Request<Body>,
) -> impl IntoResponse {
    if !allowed(&config, request.headers()) {
        return StatusCode::FORBIDDEN.into_response();
    }
    if matches!(*request.method(), Method::GET | Method::HEAD) {
        if static_file(request.uri().path()).is_some() {
            return bundled_asset(&config.static_root, request.uri().path(), request.method())
                .await;
        }
    }
    if !request.uri().path().starts_with("/api/v1/") {
        return StatusCode::NOT_FOUND.into_response();
    }
    let path = request
        .uri()
        .path_and_query()
        .map(|p| p.as_str())
        .unwrap_or("/")
        .to_string();
    let is_logout =
        request.method() == Method::POST && request.uri().path() == "/api/v1/auth/logout";
    let is_bootstrap = request.uri().path() == "/api/v1/bootstrap";
    let target = format!("{}{}", config.target, path);
    let mut upstream = config.client.request(request.method().clone(), target);
    for (name, value) in request.headers() {
        if !skip_header(name) {
            upstream = upstream.header(name, value);
        }
    }
    upstream = upstream.header(header::ORIGIN, &config.target);
    upstream = upstream.bearer_auth(&config.bearer);
    let response = match upstream
        .body(reqwest::Body::wrap_stream(
            request.into_body().into_data_stream(),
        ))
        .send()
        .await
    {
        Ok(response) => response,
        Err(_) => return StatusCode::BAD_GATEWAY.into_response(),
    };
    if is_logout && response.status().is_success() {
        let _ = config.control.send(Control::Logout);
    } else if is_bootstrap && response.status() == StatusCode::UNAUTHORIZED {
        let _ = config.control.send(Control::Expired);
    }
    let mut builder = Response::builder().status(response.status());
    for (name, value) in response.headers() {
        if name != header::SET_COOKIE && !skip_header(name) {
            builder = builder.header(name, value);
        }
    }
    if path.starts_with("/api/v1/bootstrap") {
        builder = builder.header("X-Doca-Desktop-Mode", "remote");
        builder = builder.header("X-Doca-Desktop-Origin", &config.target);
    }
    builder
        .body(Body::from_stream(response.bytes_stream()))
        .unwrap_or_else(|_| StatusCode::BAD_GATEWAY.into_response())
}

async fn websocket(
    State(config): State<Arc<ProxyConfig>>,
    headers: HeaderMap,
    uri: Uri,
    upgrade: WebSocketUpgrade,
) -> impl IntoResponse {
    if !allowed(&config, &headers) {
        return StatusCode::FORBIDDEN.into_response();
    }
    upgrade.on_upgrade(move |socket| relay(socket, config, uri))
}

async fn relay(socket: WebSocket, config: Arc<ProxyConfig>, uri: Uri) {
    let scheme = if config.target.starts_with("https://") {
        "wss://"
    } else {
        "ws://"
    };
    let url = format!(
        "{}{}{}",
        scheme,
        config.target.split_once("://").unwrap().1,
        uri.path_and_query()
            .map(|p| p.as_str())
            .unwrap_or("/api/v1/ws")
    );
    let Ok(mut request) = url.into_client_request() else {
        return;
    };
    request
        .headers_mut()
        .insert(header::ORIGIN, config.target.parse().unwrap());
    request.headers_mut().insert(
        header::AUTHORIZATION,
        format!("Bearer {}", config.bearer).parse().unwrap(),
    );
    let Ok((upstream, _)) = tokio_tungstenite::connect_async(request).await else {
        return;
    };
    let (mut client_write, mut client_read) = socket.split();
    let (mut server_write, mut server_read) = upstream.split();
    loop {
        tokio::select! {
            message = client_read.next() => match message {
                Some(Ok(Message::Text(value))) => if server_write.send(UpstreamMessage::Text(value.to_string().into())).await.is_err() { break; },
                Some(Ok(Message::Binary(value))) => if server_write.send(UpstreamMessage::Binary(value)).await.is_err() { break; },
                Some(Ok(Message::Ping(value))) => if server_write.send(UpstreamMessage::Ping(value)).await.is_err() { break; },
                Some(Ok(Message::Pong(value))) => if server_write.send(UpstreamMessage::Pong(value)).await.is_err() { break; },
                Some(Ok(Message::Close(_))) | None | Some(Err(_)) => break,
            },
            message = server_read.next() => match message {
                Some(Ok(UpstreamMessage::Text(value))) => if client_write.send(Message::Text(value.to_string().into())).await.is_err() { break; },
                Some(Ok(UpstreamMessage::Binary(value))) => if client_write.send(Message::Binary(value)).await.is_err() { break; },
                Some(Ok(UpstreamMessage::Ping(value))) => if client_write.send(Message::Ping(value)).await.is_err() { break; },
                Some(Ok(UpstreamMessage::Pong(value))) => if client_write.send(Message::Pong(value)).await.is_err() { break; },
                Some(Ok(UpstreamMessage::Close(_))) | None | Some(Err(_)) => break,
                Some(Ok(UpstreamMessage::Frame(_))) => {},
            }
        }
    }
}

// Workspace proxies keep one stable loopback port per endpoint+account so the
// WebView origin survives relaunch and client-side localStorage/IndexedDB
// (locale, AI pending queue, offline replica) persist like on the web. The
// window sits below the macOS ephemeral-port range to avoid OS allocations.
// When every candidate is taken -- for example a second app instance sharing
// the profile -- the proxy falls back to an ephemeral port and that launch
// behaves like before (client-side storage starts empty).
const PROXY_PORT_BASE: u16 = 42152;
const PROXY_PORT_SPAN: u16 = 100;

fn proxy_port_base(port_key: &str) -> u16 {
    let digest = Sha256::digest(port_key.as_bytes());
    let seed = u16::from_be_bytes([digest[0], digest[1]]);
    PROXY_PORT_BASE + (seed % PROXY_PORT_SPAN)
}

async fn bind_workspace_listener(port_key: &str) -> std::io::Result<tokio::net::TcpListener> {
    let base = proxy_port_base(port_key);
    for offset in 0..PROXY_PORT_SPAN {
        let candidate = PROXY_PORT_BASE + (base - PROXY_PORT_BASE + offset) % PROXY_PORT_SPAN;
        if let Ok(listener) = tokio::net::TcpListener::bind(("127.0.0.1", candidate)).await {
            return Ok(listener);
        }
    }
    eprintln!("doca-desktop: 稳定代理端口被占用，本次启动回退随机端口，客户端本地偏好将不保留");
    tokio::net::TcpListener::bind("127.0.0.1:0").await
}

pub async fn start(
    target: String,
    bearer: String,
    static_root: PathBuf,
    control: mpsc::UnboundedSender<Control>,
    port_key: &str,
) -> Result<(String, String, tokio::task::JoinHandle<()>), String> {
    let static_root = tokio::fs::canonicalize(static_root)
        .await
        .map_err(|e| format!("无法找到内置前端：{e}"))?;
    if !static_root.join("index.html").is_file() {
        return Err("内置前端缺少入口文件".into());
    }
    let listener = bind_workspace_listener(port_key)
        .await
        .map_err(|error| error.to_string())?;
    let origin = format!(
        "http://{}",
        listener.local_addr().map_err(|e| e.to_string())?
    );
    let capability = format!(
        "{}{}",
        uuid::Uuid::new_v4().simple(),
        uuid::Uuid::new_v4().simple()
    );
    let (updated, _) = broadcast::channel(64);
    let config = Arc::new(ProxyConfig {
        origin: origin.clone(),
        target,
        capability: capability.clone(),
        bearer,
        static_root,
        control,
        updated,
        client: reqwest::Client::builder()
            .redirect(reqwest::redirect::Policy::none())
            .build()
            .map_err(|e| e.to_string())?,
    });
    let router = Router::new()
        .route("/_doca_gate/{secret}", get(gate))
        .route("/_doca/window/{id}", get(tab_shell))
        .route("/_doca/manager", post(show_manager))
        .route("/_doca/session", get(session_snapshot))
        .route("/_doca/action", post(session_action))
        .route("/_doca/events", get(session_events))
        .route("/api/v1/ws", get(websocket))
        .fallback(any(forward))
        .with_state(config);
    let server = tokio::spawn(async move {
        let _ = axum::serve(listener, router).await;
    });
    Ok((
        origin.clone(),
        format!("{origin}/_doca_gate/{capability}"),
        server,
    ))
}

fn sanitized_api_path(url: &str) -> Option<String> {
    if !url.starts_with("/api/v1/") || url.contains("..") || url.contains("://") {
        return None;
    }
    Some(url.to_string())
}

pub(crate) fn filename_from_disposition(
    value: Option<&reqwest::header::HeaderValue>,
) -> Option<String> {
    let raw = value?.to_str().ok()?.to_string();
    // Prefer RFC 5987 filename*=UTF-8''<percent-encoded>, then plain filename.
    if let Some(start) = raw.find("filename*=") {
        let tail = &raw[start + "filename*=".len()..];
        let encoded = tail
            .split_once("\u{27}")
            .and_then(|(_, rest)| rest.split_once("\u{27}"))
            .map(|(_, value)| value)
            .unwrap_or(tail)
            .trim_end_matches(';')
            .trim()
            .to_string();
        if let Ok(decoded) = percent_decode_utf8(&encoded) {
            let name = decoded.trim().to_string();
            if !name.is_empty() {
                return Some(name);
            }
        }
    }
    let plain = raw
        .split(';')
        .map(str::trim)
        .find_map(|part| part.strip_prefix("filename="))
        .map(|name| name.trim_matches('"').trim().to_string());
    plain.filter(|name| !name.is_empty())
}

fn percent_decode_utf8(value: &str) -> Result<String, String> {
    let bytes = value.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'%' {
            let hex = bytes.get(index + 1..index + 3).ok_or("截断的百分号编码")?;
            let high = char::from(hex[0]).to_digit(16).ok_or("非法百分号编码")?;
            let low = char::from(hex[1]).to_digit(16).ok_or("非法百分号编码")?;
            out.push(((high << 4) | low) as u8);
            index += 3;
        } else {
            out.push(bytes[index]);
            index += 1;
        }
    }
    String::from_utf8(out).map_err(|_| "文件名编码无效".to_string())
}

#[cfg(test)]
async fn download_endpoint_file_into(
    config: &ProxyConfig,
    url: &str,
    folder: &std::path::Path,
) -> Result<String, String> {
    let path = sanitized_api_path(url).ok_or("下载地址不在允许的接口范围内")?;
    let response = config
        .client
        .get(format!("{}{}", config.target, path))
        .bearer_auth(&config.bearer)
        .send()
        .await
        .map_err(|e| format!("下载失败：{e}"))?;
    if !response.status().is_success() {
        return Err(format!("下载失败：{}", response.status()));
    }
    let filename =
        filename_from_disposition(response.headers().get(reqwest::header::CONTENT_DISPOSITION))
            .or_else(|| {
                url.split("filename=")
                    .nth(1)
                    .map(|value| value.split('&').next().unwrap_or(value).to_string())
                    .filter(|name| !name.is_empty())
            })
            .unwrap_or_else(|| "doca-download".to_string());
    let safe_name: String = filename
        .chars()
        .map(|c| {
            if c == '/' || c == '\\' || c == ':' || c == '\u{0}' {
                '_'
            } else {
                c
            }
        })
        .collect();
    let mut folder = folder.to_path_buf();
    folder.push(&safe_name);
    let mut counter = 1;
    while folder.exists() {
        let stem = folder
            .file_stem()
            .and_then(|stem| stem.to_str())
            .unwrap_or("doca-download")
            .to_string();
        let extension = folder
            .extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| format!(".{ext}"))
            .unwrap_or_default();
        folder.set_file_name(format!("{stem} ({counter}){extension}"));
        counter += 1;
    }
    let mut file = tokio::fs::File::create(&folder)
        .await
        .map_err(|e| format!("无法创建下载文件：{e}"))?;
    use tokio::io::AsyncWriteExt;
    let mut written: u64 = 0;
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("下载中断：{e}"))?;
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("无法写入下载文件：{e}"))?;
        written += chunk.len() as u64;
        if written > 4 * 1024 * 1024 * 1024 {
            return Err("下载文件超过 4 GB 上限".into());
        }
    }
    file.flush()
        .await
        .map_err(|e| format!("无法写入下载文件：{e}"))?;
    #[cfg(not(test))]
    crate::reveal_in_file_manager(&folder);
    Ok(safe_name)
}

#[cfg(test)]
mod download_tests {
    use super::{
        download_endpoint_file_into, execute_action, filename_from_disposition, sanitized_api_path,
        Action, Control, ProxyConfig,
    };
    use tokio::sync::mpsc;

    #[test]
    fn api_path_scope_rejects_traversal_and_foreign_urls() {
        assert!(sanitized_api_path("/api/v1/files/items/abc/content?download=1").is_some());
        assert!(sanitized_api_path("/api/v1/plugin-file-bindings/x/content?download=1").is_some());
        assert!(sanitized_api_path("/api/v1/../secret").is_none());
        assert!(sanitized_api_path("https://evil.test/api/v1/files").is_none());
        assert!(sanitized_api_path("/internal/only").is_none());
    }

    fn action_config(control: &mpsc::UnboundedSender<Control>) -> ProxyConfig {
        let folder =
            std::env::temp_dir().join(format!("doca-download-test-{}", std::process::id()));
        std::fs::create_dir_all(&folder).unwrap();
        ProxyConfig {
            origin: "http://127.0.0.1:43111".into(),
            target: "http://127.0.0.1:1".into(),
            capability: "test-capability".into(),
            bearer: "test-token".into(),
            static_root: folder,
            client: reqwest::Client::new(),
            control: control.clone(),
            updated: tokio::sync::broadcast::channel(1).0,
        }
    }

    #[tokio::test]
    async fn download_action_round_trips_through_the_control_channel() {
        let (control, mut receiver) = mpsc::unbounded_channel();
        let config = action_config(&control);
        let action = Action::DownloadFile {
            url: "/api/v1/files/items/abc/content?download=1".into(),
        };
        let responder = tokio::spawn(async move {
            match receiver.recv().await {
                Some(Control::SaveFile { path, reply }) => {
                    assert!(path.starts_with("/api/v1/files/"));
                    let _ = reply.send(Ok(Some("saved.txt".into())));
                }
                _ => panic!("unexpected control message"),
            }
        });
        let result = execute_action(&config, action)
            .await
            .expect("action resolves");
        assert_eq!(result["saved"], "saved.txt");
        responder.await.unwrap();
    }

    #[tokio::test]
    async fn download_action_rejects_out_of_scope_paths_without_control() {
        let (control, mut receiver) = mpsc::unbounded_channel();
        let config = action_config(&control);
        let action = Action::DownloadFile {
            url: "/internal/only".into(),
        };
        let error = execute_action(&config, action)
            .await
            .expect_err("out-of-scope path must fail");
        assert_eq!(error, "下载地址不在允许的接口范围内");
        assert!(receiver.try_recv().is_err());
    }

    #[tokio::test]
    async fn endpoint_download_saves_decoded_filename_and_bytes() {
        use axum::response::IntoResponse;
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap().to_string();
        let app = axum::Router::new().route(
            "/api/v1/files/items/abc/content",
            axum::routing::get(|| async {
                (
                    [
                        ("Content-Type", "image/jpeg"),
                        (
                            "Content-Disposition",
                            "attachment; filename*=UTF-8''%E8%90%A5%E4%B8%9A%E6%89%A7%E7%85%A7.jpg",
                        ),
                    ],
                    "jpeg-bytes",
                )
                    .into_response()
            }),
        );
        tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });
        let folder =
            std::env::temp_dir().join(format!("doca-download-test-{}", std::process::id()));
        std::fs::create_dir_all(&folder).unwrap();
        let config = ProxyConfig {
            origin: "http://127.0.0.1:43111".into(),
            target: format!("http://{address}"),
            capability: "test-capability".into(),
            bearer: "test-token".into(),
            static_root: folder.clone(),
            client: reqwest::Client::new(),
            control: mpsc::unbounded_channel().0,
            updated: tokio::sync::broadcast::channel(1).0,
        };
        let saved = download_endpoint_file_into(
            &config,
            "/api/v1/files/items/abc/content?download=1",
            &folder,
        )
        .await
        .expect("download should succeed");
        assert_eq!(saved, "营业执照.jpg");
        let saved_path = folder.join("营业执照.jpg");
        let bytes = std::fs::read(&saved_path).unwrap();
        assert_eq!(bytes, b"jpeg-bytes");
        std::fs::remove_file(&saved_path).ok();
        std::fs::remove_dir_all(&folder).ok();
    }

    #[test]
    fn disposition_filename_prefers_rfc5987_and_decodes() {
        let header = reqwest::header::HeaderValue::from_static(
            "attachment; filename*=UTF-8''%E8%90%A5%E4%B8%9A%E6%89%A7%E7%85%A7.jpg",
        );
        assert_eq!(
            filename_from_disposition(Some(&header)).as_deref(),
            Some("营业执照.jpg")
        );
        let plain = reqwest::header::HeaderValue::from_static("attachment; filename=\"a b.png\"");
        assert_eq!(
            filename_from_disposition(Some(&plain)).as_deref(),
            Some("a b.png")
        );
        assert_eq!(filename_from_disposition(None), None);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_config(control: mpsc::UnboundedSender<Control>) -> Arc<ProxyConfig> {
        Arc::new(ProxyConfig {
            origin: "http://127.0.0.1:43111".into(),
            target: "https://doca.example.com".into(),
            capability: "test-capability".into(),
            bearer: "test-token".into(),
            static_root: PathBuf::new(),
            client: reqwest::Client::new(),
            control,
            updated: broadcast::channel(16).0,
        })
    }

    #[test]
    fn tab_actions_accept_the_shells_camel_case_fields() {
        let action: Action = serde_json::from_str(
            r##"{"type":"updateTab","windowId":"window","tabId":"tab","hash":"#/home","title":"Doca"}"##,
        ).unwrap();
        assert!(matches!(action, Action::UpdateTab { window_id, tab_id, .. }
            if window_id == "window" && tab_id == "tab"));
    }

    #[tokio::test]
    async fn manager_action_requires_capability_and_exact_origin() {
        let (control, mut receiver) = mpsc::unbounded_channel();
        let config = Arc::new(ProxyConfig {
            origin: "http://127.0.0.1:43111".into(),
            target: "https://doca.example.com".into(),
            capability: "test-capability".into(),
            bearer: "test-token".into(),
            static_root: PathBuf::new(),
            client: reqwest::Client::new(),
            control,
            updated: broadcast::channel(16).0,
        });
        let mut headers = HeaderMap::new();
        headers.insert(header::HOST, "127.0.0.1:43111".parse().unwrap());
        headers.insert(header::ORIGIN, "http://127.0.0.1:43111".parse().unwrap());
        assert_eq!(
            show_manager(State(config.clone()), headers.clone()).await,
            StatusCode::FORBIDDEN
        );
        assert!(receiver.try_recv().is_err());

        headers.insert(
            header::COOKIE,
            "doca_desktop_proxy=test-capability".parse().unwrap(),
        );
        headers.insert(header::ORIGIN, "https://other.example.com".parse().unwrap());
        assert_eq!(
            show_manager(State(config.clone()), headers.clone()).await,
            StatusCode::FORBIDDEN
        );
        assert!(receiver.try_recv().is_err());

        headers.insert(header::ORIGIN, "http://127.0.0.1:43111".parse().unwrap());
        assert_eq!(
            show_manager(State(config), headers).await,
            StatusCode::NO_CONTENT
        );
        assert!(matches!(receiver.try_recv(), Ok(Control::ShowManager)));
    }

    #[tokio::test]
    async fn tab_actions_require_capability_and_exact_origin() {
        let (control, mut receiver) = mpsc::unbounded_channel();
        let config = test_config(control);
        let mut headers = HeaderMap::new();
        headers.insert(header::HOST, "127.0.0.1:43111".parse().unwrap());
        headers.insert(header::ORIGIN, "http://127.0.0.1:43111".parse().unwrap());
        let response = session_action(
            State(config.clone()),
            headers.clone(),
            axum::Json(Action::NewTab {
                window_id: "test".into(),
            }),
        )
        .await
        .into_response();
        assert_eq!(response.status(), StatusCode::FORBIDDEN);
        assert!(receiver.try_recv().is_err());

        headers.insert(
            header::COOKIE,
            "doca_desktop_proxy=test-capability".parse().unwrap(),
        );
        headers.insert(header::ORIGIN, "https://other.example".parse().unwrap());
        let response = session_action(
            State(config.clone()),
            headers.clone(),
            axum::Json(Action::NewTab {
                window_id: "test".into(),
            }),
        )
        .await
        .into_response();
        assert_eq!(response.status(), StatusCode::FORBIDDEN);
        assert!(receiver.try_recv().is_err());

        headers.insert(header::ORIGIN, "http://127.0.0.1:43111".parse().unwrap());
        let request = tokio::spawn(session_action(
            State(config),
            headers,
            axum::Json(Action::NewTab {
                window_id: "test".into(),
            }),
        ));
        match receiver.recv().await.unwrap() {
            Control::Action(Action::NewTab { window_id }, reply) => {
                assert_eq!(window_id, "test");
                reply.send(Ok(serde_json::json!({"window": null}))).unwrap();
            }
            _ => panic!("unexpected desktop control message"),
        }
        assert_eq!(
            request.await.unwrap().into_response().status(),
            StatusCode::OK
        );
    }

    #[tokio::test]
    async fn successful_web_logout_notifies_the_native_session() {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let target = format!("http://{}", listener.local_addr().unwrap());
        let upstream = Router::new().route("/api/v1/auth/logout", post(|| async { "signed out" }));
        let server = tokio::spawn(async move {
            axum::serve(listener, upstream).await.unwrap();
        });
        let (control, mut receiver) = mpsc::unbounded_channel();
        let config = Arc::new(ProxyConfig {
            origin: "http://127.0.0.1:43111".into(),
            target,
            capability: "test-capability".into(),
            bearer: "test-token".into(),
            static_root: PathBuf::new(),
            client: reqwest::Client::new(),
            control,
            updated: broadcast::channel(16).0,
        });
        let request = Request::builder()
            .method(Method::POST)
            .uri("/api/v1/auth/logout")
            .header(header::HOST, "127.0.0.1:43111")
            .header(header::ORIGIN, "http://127.0.0.1:43111")
            .header(header::COOKIE, "doca_desktop_proxy=test-capability")
            .body(Body::empty())
            .unwrap();
        let response = forward(State(config), request).await.into_response();
        assert_eq!(response.status(), StatusCode::OK);
        assert!(matches!(receiver.try_recv(), Ok(Control::Logout)));
        server.abort();
    }

    #[tokio::test]
    async fn rejected_bootstrap_notifies_every_desktop_page() {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let target = format!("http://{}", listener.local_addr().unwrap());
        let upstream = Router::new().route(
            "/api/v1/bootstrap",
            get(|| async { StatusCode::UNAUTHORIZED }),
        );
        let server = tokio::spawn(async move {
            axum::serve(listener, upstream).await.unwrap();
        });
        let (control, mut receiver) = mpsc::unbounded_channel();
        let config = Arc::new(ProxyConfig {
            origin: "http://127.0.0.1:43111".into(),
            target,
            capability: "test-capability".into(),
            bearer: "revoked-token".into(),
            static_root: PathBuf::new(),
            client: reqwest::Client::new(),
            control,
            updated: broadcast::channel(16).0,
        });
        let request = Request::builder()
            .uri("/api/v1/bootstrap")
            .header(header::HOST, "127.0.0.1:43111")
            .header(header::COOKIE, "doca_desktop_proxy=test-capability")
            .body(Body::empty())
            .unwrap();
        let response = forward(State(config), request).await.into_response();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
        assert!(matches!(receiver.try_recv(), Ok(Control::Expired)));
        server.abort();
    }

    #[tokio::test]
    async fn serves_the_bundled_frontend_without_contacting_the_selected_host() {
        let directory = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../../../artifacts/verification/desktop-client")
            .join(format!("static-{}", uuid::Uuid::new_v4()));
        tokio::fs::create_dir_all(&directory).await.unwrap();
        tokio::fs::write(directory.join("index.html"), b"bundled desktop frontend")
            .await
            .unwrap();
        let (control, mut events) = mpsc::unbounded_channel();
        let config = Arc::new(ProxyConfig {
            origin: "http://127.0.0.1:43111".into(),
            target: "http://127.0.0.1:9".into(),
            capability: "test-capability".into(),
            bearer: "test-token".into(),
            static_root: tokio::fs::canonicalize(&directory).await.unwrap(),
            client: reqwest::Client::new(),
            control,
            updated: broadcast::channel(16).0,
        });
        let request = Request::builder()
            .uri("/")
            .header(header::HOST, "127.0.0.1:43111")
            .header(header::COOKIE, "doca_desktop_proxy=test-capability")
            .body(Body::empty())
            .unwrap();
        let response = forward(State(config.clone()), request)
            .await
            .into_response();
        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(
            axum::body::to_bytes(response.into_body(), 1024)
                .await
                .unwrap(),
            "bundled desktop frontend"
        );

        let request = Request::builder()
            .uri("/api/v1/bootstrap")
            .header(header::HOST, "127.0.0.1:43111")
            .header(header::COOKIE, "doca_desktop_proxy=test-capability")
            .body(Body::empty())
            .unwrap();
        let response = forward(State(config.clone()), request)
            .await
            .into_response();
        assert_eq!(response.status(), StatusCode::BAD_GATEWAY);
        assert!(matches!(events.try_recv(), Err(mpsc::error::TryRecvError::Empty)));

        let request = Request::builder()
            .uri("/server-controlled-page")
            .header(header::HOST, "127.0.0.1:43111")
            .header(header::COOKIE, "doca_desktop_proxy=test-capability")
            .body(Body::empty())
            .unwrap();
        let response = forward(State(config), request).await.into_response();
        assert_eq!(response.status(), StatusCode::NOT_FOUND);
        tokio::fs::remove_dir_all(directory).await.unwrap();
    }

    #[test]
    fn static_paths_do_not_escape_the_bundle() {
        assert_eq!(static_file("/"), Some("index.html"));
        assert_eq!(static_file("/doca.webmanifest"), Some("doca.webmanifest"));
        assert_eq!(
            static_file("/assets/index-123.js"),
            Some("assets/index-123.js")
        );
        assert_eq!(static_file("/assets/../secret"), None);
        assert_eq!(static_file("/assets/%2e%2e"), None);
        assert_eq!(static_file("/api/v1/bootstrap"), None);
    }

    #[tokio::test]
    async fn forwards_only_the_selected_hosts_api_with_its_credential() {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let target = format!("http://{}", listener.local_addr().unwrap());
        let target_for_request = target.clone();
        let upstream = Router::new()
            .route(
                "/api/v1/bootstrap",
                get(move |headers: HeaderMap| {
                    let target = target_for_request.clone();
                    async move {
                        assert_eq!(
                            headers.get(header::AUTHORIZATION).unwrap(),
                            "Bearer selected-host-token"
                        );
                        assert_eq!(headers.get(header::ORIGIN).unwrap(), target.as_str());
                        assert!(headers.get(header::COOKIE).is_none());
                        (
                            [(header::SET_COOKIE, "remote-session=ignored")],
                            "remote bootstrap",
                        )
                    }
                }),
            )
            .route(
                "/api/v1/plugin-assets/demo/1.0.0/index.js",
                get(|headers: HeaderMap| async move {
                    assert_eq!(
                        headers.get(header::AUTHORIZATION).unwrap(),
                        "Bearer selected-host-token"
                    );
                    assert!(headers.get(header::COOKIE).is_none());
                    "export default 1;"
                }),
            );
        let server = tokio::spawn(async move {
            axum::serve(listener, upstream).await.unwrap();
        });
        let directory = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../../../artifacts/verification/desktop-client")
            .join(format!("proxy-{}", uuid::Uuid::new_v4()));
        tokio::fs::create_dir_all(&directory).await.unwrap();
        tokio::fs::write(directory.join("index.html"), b"bundled")
            .await
            .unwrap();
        let config = Arc::new(ProxyConfig {
            origin: "http://127.0.0.1:43111".into(),
            target: target.clone(),
            capability: "test-capability".into(),
            bearer: "selected-host-token".into(),
            static_root: tokio::fs::canonicalize(&directory).await.unwrap(),
            client: reqwest::Client::new(),
            control: mpsc::unbounded_channel().0,
            updated: broadcast::channel(16).0,
        });
        let request = Request::builder()
            .uri("/api/v1/bootstrap")
            .header(header::HOST, "127.0.0.1:43111")
            .header(
                header::COOKIE,
                "doca_desktop_proxy=test-capability; web-session=never-forward",
            )
            .body(Body::empty())
            .unwrap();
        let response = forward(State(config.clone()), request)
            .await
            .into_response();
        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(
            response.headers().get("X-Doca-Desktop-Mode").unwrap(),
            "remote"
        );
        assert_eq!(
            response.headers().get("X-Doca-Desktop-Origin").unwrap(),
            target.as_str()
        );
        assert!(response.headers().get(header::SET_COOKIE).is_none());
        assert_eq!(
            axum::body::to_bytes(response.into_body(), 1024)
                .await
                .unwrap(),
            "remote bootstrap"
        );
        let asset = Request::builder()
            .uri("/api/v1/plugin-assets/demo/1.0.0/index.js")
            .header(header::HOST, "127.0.0.1:43111")
            .header(header::COOKIE, "doca_desktop_proxy=test-capability")
            .body(Body::empty())
            .unwrap();
        let response = forward(State(config), asset).await.into_response();
        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(
            axum::body::to_bytes(response.into_body(), 1024)
                .await
                .unwrap(),
            "export default 1;"
        );
        server.abort();
        tokio::fs::remove_dir_all(directory).await.unwrap();
    }
}

#[cfg(test)]
mod stable_port_tests {
    use super::*;

    #[test]
    fn port_base_is_stable_and_inside_the_window() {
        let first = proxy_port_base("92e5724a-b77d-4cea-83bf-7c34ed6d7b3f:account-1");
        assert_eq!(
            first,
            proxy_port_base("92e5724a-b77d-4cea-83bf-7c34ed6d7b3f:account-1")
        );
        assert!((PROXY_PORT_BASE..PROXY_PORT_BASE + PROXY_PORT_SPAN).contains(&first));
    }

    #[test]
    fn port_base_spreads_across_the_window() {
        let bases: std::collections::HashSet<u16> = (0..32)
            .map(|index| proxy_port_base(&format!("endpoint-{index}:account")))
            .collect();
        assert!(
            bases.len() > 8,
            "hash collapsed into {} buckets",
            bases.len()
        );
    }

    #[tokio::test]
    async fn bind_reuses_the_deterministic_port_for_the_same_key() {
        let first = bind_workspace_listener("endpoint-a:account-1")
            .await
            .unwrap();
        let first_port = first.local_addr().unwrap().port();
        drop(first);
        let second = bind_workspace_listener("endpoint-a:account-1")
            .await
            .unwrap();
        assert_eq!(second.local_addr().unwrap().port(), first_port);
    }

    #[tokio::test]
    async fn bind_falls_forward_when_the_port_is_taken() {
        let held = bind_workspace_listener("endpoint-b:account-1")
            .await
            .unwrap();
        let held_port = held.local_addr().unwrap().port();
        let next = bind_workspace_listener("endpoint-b:account-1")
            .await
            .unwrap();
        assert_ne!(next.local_addr().unwrap().port(), held_port);
        assert!((PROXY_PORT_BASE..PROXY_PORT_BASE + PROXY_PORT_SPAN)
            .contains(&next.local_addr().unwrap().port()));
    }
}
