# Doca 0.2.38 发布验证

2026-11-22（Asia/Shanghai）。本轮包含两项修复、桌面客户端文档更新与 0.2.38 版本发布：管理后台「上传限制」页打开即报「请求参数无效」；桌面客户端知识库文档树无法拖拽调整位置。

## 行为与范围

- **上传限制报错（light）**：`upload-settings.tsx` 挂载后 200ms 自动发起用户下拉搜索，无条件携带空 `q`；`/api/v1/admin/users` 的 querystring 校验（`name`：`minLength 1`、`pattern \S`）拒绝空串，Fastify 框架层 400 进入全局兜底文案。修复为 `q` 非空才携带，与 `directory-settings`、`resource-handover`、`admin` 既有调用一致。不涉及接口契约、数据库或兼容性。
- **桌面文档树拖拽（light）**：工作空间 webview 按默认启用 Tauri 原生拖放处理器。机制（wry 0.57.3 / tauri-runtime-wry 2.12.3 源码核实）：runtime 监听器固定返回 `true`，wry 的 `WryWebView` 覆写 `draggingEntered/Updated/performDragOperation`，listener 为真时直接返回 `NSDragOperation::Copy` 而不调用 super（WKWebView 自身实现），页面收不到 dragover/drop，HTML5 拖拽失效。修复为 `build_workspace_window` 对全部工作空间窗口调用 `disable_drag_drop_handler()`；桌面壳不监听任何原生拖放事件，无功能损失。OS 文件拖入工作空间页面此后按 WKWebView 原生行为作为 HTML5 drop 事件交给页面（与浏览器一致），连接管理器窗口行为不变。无兼容性决策：不涉及旧数据格式与接口适配。
- **文档与版本**：桌面客户端指南/FAQ/功能表/README 截图更新（引用 0.2.37 起的桌面最低版本要求，保持不变）；部署文档当前版本示例与发行要求链接指向 0.2.38；`package.json`、桌面 `package.json`/`Cargo.toml`/`Cargo.lock`/`tauri.conf.json`、`compose.yaml` 升至 0.2.38；新增 `docs/releases/0.2.38.md`（含中文）。

## 本地验证

- `pnpm typecheck`、`cargo check`、`cargo test --locked`（21 项）、`cargo fmt --check` 通过；`pnpm build`、`pnpm sdd:check`、`pnpm docs:check`、`pnpm test:sdd` 结果见下。
- 上传限制修复：根因定位至服务端 400 兜底路径；受影响接口的既有测试（`resource-handover`、`accounts` 38 项）通过。浏览器侧行为未回归验证（改动与其他调用方条件拼接模式一致）。
- 桌面拖拽修复（隔离环境实证，脚本与日志在 `artifacts/verification/desktop-tree-drag/`）：
  - 隔离宿主：`createApp` + 内存 SQLite + vite（127.0.0.1:39483），种子账号 dragdemo、知识库 Drag Library 含 Alpha Notes/Beta Plan/Gamma Report/Delta Log 四篇顶层文档；一次性调试包（identifier `com.smartdoca.desktop.treedrag` + `DOCA_DESKTOP_TEST_DATA_DIR` 隔离，不触碰已安装应用与用户数据）经系统浏览器授权流程（approve API + PID 直达 GURL Apple Event）登录。
  - 阳性（含修复）：真实 CGEvent 拖拽 Alpha Notes 行（361,386）至 Delta Log 行下方（361,495），2.5s 后 API 顺序由 Alpha/Beta/Gamma/Delta 变为 Beta/Gamma/Delta/Alpha（`tree_order` 0–3 重排，走真实 `/resources/:id/arrange`）。
  - 阴性（不含修复，同手势同坐标）：顺序保持 Alpha/Beta/Gamma/Delta 不变，复现用户报告的「无法拖拽」。
  - 桌面未在真实 Windows 机器验证：`disable_drag_drop_handler` 在 Windows 上同样解除 WebView2 的 HTML5 拖拽拦截（Tauri 官方文档明确该行为），本轮仅源码层面确认，未实测。
- 过程备注：macOS 26 上 `NSApplication.activate(options:)` 无效、unicode 字符串键盘事件不进 WKWebView 输入框——AX 自动化改为剪贴板 + Cmd+A/Cmd+V（键码事件）填表；两次系统 Apple Events 权限弹窗（测试脚本触发）均被拒绝，未授权任何自动化权限。

## 发布

[PR #147](https://github.com/workhold/doca/pull/147) 合入 main 为 `88ab278f`（CI：build、records、PostgreSQL 17/18 升级回归全部通过），tag `v0.2.38` 触发三个工作流，全部成功：

- [官方 Release 工作流](https://github.com/workhold/doca/actions/runs/45017275399)（1m02s）发布 [v0.2.38](https://github.com/workhold/doca/releases/tag/v0.2.38)：部署 Compose、部署包、Web 资产（19.23 MB）与插件 SDK 0.2.0 及校验和。
- [桌面发布工作流](https://github.com/workhold/doca/actions/runs/45017275357)（9m51s）附上安装包与 SHA-256：

  | 附件 | 大小 | SHA-256 |
  | --- | --- | --- |
  | `Doca_0.2.38_universal.dmg` | 32.14 MB | `b2c87f0937cd584b90645d4de40c5e63d37a153cd0f04ee36fed81e17f936bb1` |
  | `Doca_0.2.38_x64-setup.exe` | 18.71 MB | `db51da38d6699090d98f91e725686ff92768ee6e568c1289b07dfe1b1ed8f60a` |
  | `Doca_0.2.38_x64_en-US.msi` | 26.91 MB | `09ef336cd185d996db01b33cbcfa0a1f71267b7d7a762ed93d46a054e6b50e90` |

- [镜像工作流](https://github.com/workhold/doca/actions/runs/45017287080)（7m39s，workflow_dispatch 按 main）双架构各自完成原图验证、登录/退出/撤销、插件隔离、PDF/Canvas/Office 渲染与运行时文件审计后发布。`smartdoca/doca:0.2.38` 与 `latest` 同一 OCI 索引 digest，linux/amd64（`f421722d…`）+ linux/arm64（`208d72fa…`）：

  `sha256:d20bed2b624609979aadbd3f96b39848b5424542339f2c903bb2a6c1809399b5`

  （digest 取自 Docker Hub tag API 与 registry manifest 查询，未做本机拉取比对。）

## 证据与限制

- 拖拽验证为单库四文档、单次拖放路径（顶层 after 放置）；未覆盖嵌套拖入（inside）、跨父级移动的桌面端实测（同一组件与接口，浏览器路径已有既有覆盖）。
- `upload-settings` 浏览器端空搜索不再发送后的下拉行为未做端到端复验。
- 无用户生产数据、真实外部服务或生产部署参与；制品发布不代表运行中的实例已升级。
