# Doca 0.2.37 发布验证

2026-11-21（Asia/Shanghai）。发行源码与不可变 tag `v0.2.37` 均为 `22897f5b`，由 [PR #137](https://github.com/workhold/doca/pull/137) 合入 main（主体工作来自 [PR #136](https://github.com/workhold/doca/pull/136)，发布 tag 曾先指向 `8cb54fc5`，因下述两次失败移动到当前提交后重跑，未重建同版本镜像冲突）。

## 行为与范围

首次公开发布 Windows 与 macOS 桌面客户端（Tauri 2）：系统浏览器授权、本机加密凭据、多标签工作空间、按后端保存与恢复页面，插件仍运行在所选服务端；服务端新增桌面回跳接口，并在当前兼容代际以 `schemaEvolution` 声明新增空的 `desktop_auth_flows`、`desktop_sessions` 表，由启动对账自动应用，不转换、不回填既有数据。管理后台新增独立「上传限额」标签页，沿用既有策略存储与 API。富文本第一行紧贴固定工具栏：悬浮评论按钮改为零高度 sticky 锚点，不再占据评论面板关闭时的纵向流空间。

本轮为 full：桌面客户端使用 [006 发布规格](../../specs/006-desktop-client/spec.md)，标签窗口使用 [007](../../specs/007-desktop-workspace-tabs/spec.md)，上传限额使用 [008](../../specs/008-admin-upload-tab/spec.md)；契约为[桌面客户端](../desktop-client.md)与[数据库升级规范](../database-schema-evolution.md)。编辑器包与上一版一致：slate 0.4.26、sheet 0.2.19、canvas 0.5.16、markdown 0.4.4、slides 0.3.0-alpha.5；公开插件 SDK 仍为 0.2.0。

## 本地与 CI 检查

- `pnpm typecheck`、`pnpm build`、`pnpm sdd:check`、`pnpm test:sdd`、`pnpm docs:check` 在发布树全部通过。
- 完整 vitest：3534 项测试。首次完整运行 1 项失败（画板并发渲染字体用例，属记录在案的环境性抖动），串行复跑该文件通过后整体复跑全绿；没有修改源码或断言。PDF 用例按[开发文档](../development.md)使用固定 WeasyPrint 70.0 venv；macOS 下经 SIP 启动链会剥离 `DYLD_*`，故用 `node node_modules/vitest/vitest.mjs` 直接调用，结果 10/10 通过。
- [PR #136 检查](https://github.com/workhold/doca/pull/136)：PostgreSQL 17/18 升级回归（含真实旧版数据升级场景）、build、records 全部通过；合入 main 后 SDD、Documentation、Database upgrade 同样通过。
- 桌面布局修复在 Web 工作空间（21px）、移动端 shell（31px）实测，并把打包后的 `Doca.app` 内 `editor-*.css`、`document-editor-*.js` 与 Web 构建产物逐字节比对一致；本机 macOS `tauri build` 复现 `Doca.app` 77.17 MiB 与 `Doca_0.2.37_aarch64.dmg` 25.64 MiB。
- 首次 tag 运行两次失败并被如实记录：`pack-deployment` 拒绝 compose.yaml 仍为 0.2.36；Windows 桌面编译因 `base64`/`keyring`/`open`/`hex` 被声明在 macOS-only 依赖段而失败。由 [PR #137](https://github.com/workhold/doca/pull/137) 修复（compose 更新到 0.2.37；四个 crate 移入通用依赖段，keyring 使用 `apple-native`+`windows-native`，去掉 Linux 专用的 `sync-secret-service`），macOS 重建验证通过后移动 tag 重跑。

## Docker Hub

[镜像构建、验收与发布](https://github.com/workhold/doca/actions/runs/44899911867) 三个任务均成功：两个架构分别完成原图验证、登录/退出/撤销、插件隔离、PDF/Canvas/Office 渲染与运行时文件审计；该轮镜像构建自 8cb54fc5 源码，PR #137 只改 compose 钉住版本与桌面 Rust 依赖，不影响镜像内容。

`smartdoca/doca:0.2.37` 与 `latest` 同一索引 digest，linux/amd64 + linux/arm64：

`sha256:1a7ec167cd5b99f118ff8d0c4a33c5b77572b7767dae9514e2e371531edc1775`

## GitHub Release 与桌面安装包

[官方 Release 工作流](https://github.com/workhold/doca/actions/runs/44901039512) 发布 [v0.2.37](https://github.com/workhold/doca/releases/tag/v0.2.37)，附部署 Compose、部署包、Web 资产（18.34 MB）与插件 SDK。[桌面发布工作流](https://github.com/workhold/doca/actions/runs/44901039505) 在 macOS（universal-apple-darwin）与 Windows（x86_64-pc-windows-msvc）分别构建并附上安装包与 SHA-256：

| 附件 | 大小 | SHA-256 |
| --- | --- | --- |
| `Doca_0.2.37_universal.dmg` | 30.58 MB | `cf693dab73b826cc7aa4fd60b0e83fd98865d6e38eea7f7da6ca9cb85e06279d` |
| `Doca_0.2.37_x64-setup.exe` | 17.82 MB | `ab5edd074bb51c2fbd8cba50677292dbed960584de3c4a9710be835647d7de25` |
| `Doca_0.2.37_x64_en-US.msi` | 25.62 MB | `e040f173a115d24d775c1c916623de35c27eb5d3a19233bde34da2cb183352c2` |
| `doca-deploy-v0.2.37.tar.gz` | 0.01 MB | `7771bb0759e519d5fd97753a573b27fdc713c939643466ca5fae3c5dd6437ddd` |
| `doca-compose-v0.2.37.yaml` | 0.00 MB | `fdfd37c2c666aa6768f96fd9867e306d0bd29cac46e647f979a39ec891140ef3` |

校验和逐一下载核对。安装包未签名、未公证：macOS 首次打开需右键 →「打开」，Windows 可能出现 SmartScreen 提示，已在发行说明中注明。

## 安装包修复重发（同日）

用户实测发现 macOS 连接管理器把「钥匙串无该条目」当作凭据库错误（`errSecItemNotFound` 未映射为「无凭据」），首次添加的地址直接显示凭据库不可用并禁用浏览器登录。[PR #139](https://github.com/workhold/doca/pull/139)（合入 main 为 `7fe2e6f1`）把 ItemNotFound 映射为无凭据；`cargo test --locked` 17 项通过。桌面发布工作流[按 main 重跑](https://github.com/workhold/doca/actions/runs/44912895344)后同版本覆盖安装包（2026-11-21 14:24 UTC+8 前后），仅桌面 Rust 依赖行为变化，镜像不重建。重发后校验和：

| 附件 | 大小 | SHA-256 |
| --- | --- | --- |
| `Doca_0.2.37_universal.dmg` | 32.07 MB | `51638fd56d8d26f5d36598e2fac122dcbeb7943986683c61e7a93a12fa80aef7` |
| `Doca_0.2.37_x64-setup.exe` | 17.82 MB→18.68 MB | `f889bceacbd48e9c1367354e632e12977db065c0cea75e915ea466ad8370ee17` |
| `Doca_0.2.37_x64_en-US.msi` | 25.62 MB→26.87 MB | `c8b8929dcf4f7751e46d39312f73e04b700082d74a8c220a5da1c0cdb99e8967` |

下表「首次发布」一栏保留旧校验和作为历史记录；已下载旧包的用户按发行说明重新获取。


## 证据与限制

发行过程记录保留在会话内；附件校验和来自 Release API 下载，未逐一解包比对构建产物。桌面安装包由 CI 构建，尚未在真实 Windows 机器或外置 HTTPS 服务上执行；[006](../../specs/006-desktop-client/validation.md) 与 [007](../../specs/007-desktop-workspace-tabs/validation.md) 的验证记录已补充该范围与限制。镜像验收来自工作流自身的 QA 脚本，本机未复跑。没有用户生产数据、真实外部 provider 调用或生产部署；制品发布不代表运行中的实例已经升级。

## 安装包第二次修复重发（同日）：下载白屏

用户实测下载文件时工作空间整窗白屏：webview 直接导航到无法渲染的附件响应。[PR #141](https://github.com/workhold/doca/pull/141)（合入 main 为 `5a9058b3`）为工作空间窗口挂上 `on_download`：普通下载保存到系统下载目录（服务端建议文件名、自动去重）并在访达/资源管理器中定位；远端源的插件资源改为后台带桌面凭证下载，失败清理半截文件；webview 始终停留在当前页面。`cargo test --locked` 18 项通过（新增 origin 匹配与仿冒域名拒绝用例），`cargo fmt` 通过。

桌面发布工作流[再次按 main 重跑](https://github.com/workhold/doca/actions/runs/44915875714)后于 14:58 覆盖安装包。重发后校验和：

| 附件 | 大小 | SHA-256 |
| --- | --- | --- |
| `Doca_0.2.37_universal.dmg` | 32.12 MB | `6f1baee563d0dff06043822217038c34061a8ab34a48b5203f7a4c959c988b53` |
| `Doca_0.2.37_x64-setup.exe` | 18.71 MB | `2ed1eb399b81ae7b0ca46f96dff183f630be81f81f8f0ee635f4bb6f3cf0f858` |
| `Doca_0.2.37_x64_en-US.msi` | 26.89 MB | `dfc58da2c09f0ef6d26e9098b6173adfc9143ea0b4436b0491b0c8e078437515` |

以当前附件校验和为准；本记录保留的两次历史校验和仅作过程记录。下载行为仅在 CI 构建层面验证，未在真实 Windows 机器执行。

## 安装包第三次修复重发（11-22 00:00）：+ 号按钮几何

用户实测工作空间标签栏的悬浮 + 按钮渲染成放大的浮起块。[PR #143](https://github.com/workhold/doca/pull/143)（合入 main 为 `ccacb62c`）给该按钮固定 34×30 尺寸、`align-self: flex-end` 钉在标签行内，并把条带对齐从较新的 `end` 关键字换成各 WebKit 版本都支持的 `flex-end`。`cargo test --locked` 18 项通过、`cargo fmt --check` 通过；Playwright WebKit 18.2 离屏渲染确认按钮 34×30 与标签行底对齐（截图在 `artifacts/verification/desktop-shots/tabstrip-webkit-new.png`）。

桌面发布工作流[重跑](https://github.com/workhold/doca/actions/runs/44921258897)成功后于 2026-11-22 00:00 覆盖安装包。当前生效校验和：

| 附件 | 大小 | SHA-256 |
| --- | --- | --- |
| `Doca_0.2.37_universal.dmg` | 32.12 MB | `4fb872ed363e7878049073c369c7e41a73822b988aa4bf61036b0daae7abff6c` |
| `Doca_0.2.37_x64-setup.exe` | 18.71 MB | `e44ab2333e3e6d59dddc9558c3367af56bc88b255038cd235e04141549c0660c` |
| `Doca_0.2.37_x64_en-US.msi` | 26.90 MB | `075748eac00ca1e5561f86e439f147a52c6276e1e848c613fabb7df79e2ecb69` |

此前各轮校验和仅作过程记录，以下载附件自带的 `.sha256` 为准。
