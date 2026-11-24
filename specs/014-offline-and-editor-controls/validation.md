# 离线状态、用户分页和纯净编辑验证

**Spec**: [spec.md](spec.md)
**Result**: passed

2026-11-24 在 macOS 使用 Chrome 158、Node 24.15.0、隔离 SQLite 和测试文档验证。前端使用 `v0.2.42` 源码基线和当前工作区的生产构建。

| 验收 | 本地结果 |
| --- | --- |
| AC-001 | Chrome 模拟断网时，五种已打开的编辑器显示离线编辑提示，恢复后回到云端保存状态。富文本在 WebSocket 仍为 OPEN 时收到离线事件，随后保存本地输入，重连后收到持久 ACK 并清空队列，原编辑器和焦点保留。另一次挂起启动请求的验证在重连后观察了 60 秒，期间未新增正文提交。 |
| AC-002 | 登录工作台自动缓存 225 个静态 URL。旧版 Worker 仍控制导航时，同源在线打开获取当前构建的 JS，新版静态资源准备成功。关闭页面并等待正常交接后，停止后端，以新版应用壳离线启动。桌面标签模拟从内置静态资源与本地副本打开文档。 |
| AC-003 | 对 205 个测试账号分真实服务端页面读取。延迟第二页期间，100 行和滚动偏移保留。追加 100 行后保留偏移。切换搜索词后，旧分页响应未混入新结果。 |
| AC-004 | 五种编辑器以两个独立会话验证他人选区显示、隐藏和恢复。表格验证收到远端选区时纯净模式不再绘制协作者标签。富文本在纯净模式继续同步正文和发布本会话光标。只读账号只显示阅读模式。 |

## 检查和范围

- `pnpm typecheck`、`pnpm build`、`pnpm sdd:check` 和 `pnpm docs:check` 通过。全量 Vitest 在配置本地 PDF 运行时后 3523 项通过、11 项跳过。
- [离线和纯净编辑浏览器验收](../../scripts/qa-offline-workspace.mts)接受当前生产构建路径及可选的上一版生产构建路径。[用户分页](../../scripts/qa-admin-users.mts)使用当前生产构建路径。[文档启动](../../scripts/qa-document-startup.mts)通过启动恢复和重连回归。日志和浏览器记录位于 `artifacts/verification/offline-editor-controls/`。
- AC-001 至 AC-004 的结论适用于本地构建。断网使用 Chrome 网络模拟，桌面场景使用同源工作区标签及网关故障模拟。

## 发布验收

2026-11-25 完成 AC-005 验收。GitHub 标签 `v0.2.43`、GitHub Release、Docker Hub 镜像和桌面安装包均来自合并提交 `753f6f983e6cdd8bb18b28c4fe697a8078b96e7e`。合并前应用、macOS、Windows、PostgreSQL 17/18、文档和 SDD 检查通过。[发布 PR](https://github.com/workhold/doca/pull/161)

- `smartdoca/doca:0.2.43` 和 `smartdoca/doca:latest` 均指向 Linux amd64/arm64 镜像清单 `sha256:b7dfe259b80065ff788fe26c0be2b8e9170052e67db0c506cc190493b65810e6`。已核对 Docker Hub 实际清单、两种架构的镜像摘要和 CI 来源提交。[镜像发布任务](https://github.com/workhold/doca/actions/runs/45430156863)
- GitHub Release 提供 13 个附件。已下载并校验 Web 资源、部署归档、Compose 文件、插件 SDK 和校验文件。macOS 通用 DMG、Windows x64 EXE 和 MSI 的发布摘要与各自的 SHA-256 校验文件一致。[GitHub Release](https://github.com/workhold/doca/releases/tag/v0.2.43) · [桌面发布任务](https://github.com/workhold/doca/actions/runs/45430154696)

本轮发布日志、浏览器验收和制品核验结果见 `artifacts/verification/release-0.2.43/`。
