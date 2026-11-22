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

## 安装包修复重发（同日）：下载保存位置与退出登录窗口

用户实测报告三个桌面问题，随本节修复并同版本重发安装包（镜像不受影响，均为桌面壳代码）：

- **下载无法选择保存位置**：原实现把所有下载直接写入系统下载目录。现改为：iframe/锚点拦截下载经 `Control::SaveFile` 通道交由应用侧，用桌面凭据取回响应头（文件名取 Content-Disposition，RFC 5987 解码复用既有实现），弹出 `tauri-plugin-dialog` 保存面板（父窗口取第一个 workspace 窗口——rfd 无父面板时 sheet 会挂在隐藏的管理器窗口上永不显示，此为面板曾不出现的根因），确认后流式写入所选路径并在文件管理器中定位；取消即不写任何文件。原生 webview 下载（含 blob 导出）先落暂存目录（`$TMPDIR/doca-download-stage`，启动时清理残留），面板与下载并行，完成后移动到所选位置（跨卷回退复制），取消或失败删除暂存。`proxy::download_endpoint_file_into` 保留为测试路径；新增两个单测覆盖 SaveFile 通道往返与越界路径拒绝（合计 23 项通过）。
- **退出登录后出现常规登录页 / 重新登录后旧窗口残留**：`sign_out` 与 `handle_session_end` 原顺序为先 `clear_account` 清除会话记录、后 `close_scope_windows`——后者按会话记录解析窗口 ID，记录已清则直接返回，窗口永不关闭；被吊销凭据的 webview 随后收到 401 并显示站点常规登录页，重新登录后新工作空间与旧登录页窗口并存。修复为两处均先关窗、再清记录（`remove_endpoint` 原顺序即正确，未改）。

隔离环境实证（`artifacts/verification/desktop-tree-drag/`，一次性调试包 + 内存 SQLite 宿主，与首轮同一方法）：

- **保存**：文件管理页双击打开预览 → 点击「Download image」→ 面板出现（建议名 `测试下载.jpg` 来自服务端 Content-Disposition）→ 按「Save」→ `~/Downloads/测试下载.jpg` 落盘且与上传源字节一致（`cmp` 通过），Finder 定位触发。链路各环节以临时 eprintln 插桩确认（shell 拦截 → 控制通道 → 桌面凭据取回 → 面板 → 落盘），插桩已移除。
- **退出登录**：管理器点击「退出登录」后，工作空间窗口全部关闭（修复前保持打开），仅剩管理器且端点显示「未登录」，无登录页残留。
- **重新登录**：「浏览器登录」+ approve 后重新打开唯一工作空间窗口，直接显示已登录首页（「你好，Drag Demo」），无旧登录页窗口。
- **限制**：面板「取消」路径未做 UI 端到端（预览重开自动化不稳定）；面板内切换目录（Cmd+Shift+G）未能自动化驱动，保存集成以默认目录验证、目录选择属 rfd/NSSavePanel 原生能力；Windows 桌面未实测（对话框插件在 Windows 为标准路径）；blob 导出（原生下载暂存路径）未实测。
