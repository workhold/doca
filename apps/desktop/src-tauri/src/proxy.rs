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
}

pub enum Control {
    ShowManager,
    Action(Action, oneshot::Sender<Result<serde_json::Value, String>>),
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

pub async fn start(
    target: String,
    bearer: String,
    static_root: PathBuf,
    control: mpsc::UnboundedSender<Control>,
) -> Result<(String, String, tokio::task::JoinHandle<()>), String> {
    let static_root = tokio::fs::canonicalize(static_root)
        .await
        .map_err(|e| format!("无法找到内置前端：{e}"))?;
    if !static_root.join("index.html").is_file() {
        return Err("内置前端缺少入口文件".into());
    }
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| e.to_string())?;
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
        let config = Arc::new(ProxyConfig {
            origin: "http://127.0.0.1:43111".into(),
            target: "http://127.0.0.1:9".into(),
            capability: "test-capability".into(),
            bearer: "test-token".into(),
            static_root: tokio::fs::canonicalize(&directory).await.unwrap(),
            client: reqwest::Client::new(),
            control: mpsc::unbounded_channel().0,
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
