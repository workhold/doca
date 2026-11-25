# 验证记录

**Spec**: [文档打开状态与工作台滚动](spec.md)
**Result**: passed

## Scope

2026-11-25 至 2026-11-26，以 Doca 0.2.43 源码提交 `ba92e18` 为基线。使用 macOS Chrome 158.0.8127.37、Node 24.15.0、独立浏览器配置、内存 SQLite 和合成文档。离线与滚动回归使用当前工作区的生产 Web 构建。

## Acceptance results

| Acceptance ID | Command or observation | Result and limits |
| --- | --- | --- |
| AC-001 | 五种缓存文档延迟同步 | 基线的富文本打开时复现提示。当前构建在延迟真实 `sync-response` 时打开全部五种缓存文档，离线提示保持隐藏。 |
| AC-002 | 断网、网关中断及重连 | 五种编辑器均响应浏览器断网事件，后端停机时也能从离线目录打开。富文本在重连同步暂停时仍显示提示，离线编辑在服务端确认后清空待提交队列，原编辑器和焦点保留。 |
| AC-003 | 在线列表和离线目录滚动 | 1000 × 520 窗口中，最近访问列表、知识库卡片和离线目录均使用滚轮到达最后一项，文档页的筛选保持停靠。从文档页点击侧栏进入知识库也能滚到底。 |
| AC-004 | 知识册、文档树和文件夹滚动 | 1260 × 520 窗口中，知识册、知识库文档树、个人和共享文件夹根目录均滚到末尾。个人及共享文件夹内容的图标、列表和分栏视图均通过。基线布局在 390 × 620 隐藏了分栏列表。当前构建的个人和共享文件夹均滚到末尾，关闭实际文件的预览后保留滚动位置。 |

## Checks and evidence

- 当前生产 Web 构建、`pnpm typecheck`、`pnpm sdd:check`、`pnpm docs:check` 和 `git diff --check` 通过。10 个相关 Vitest 文件共 120 项通过，Redis 环境用例按其既有条件跳过。
- 启动回归验证了五种格式的副本恢复。富文本重连合并本地和远端编辑，随后空闲 60 秒，期间产生零次正文更新。日志见 `artifacts/verification/workspace-opening-and-scroll/`。[文档启动回归](../../scripts/qa-document-startup.mts) · [离线工作台与滚动回归](../../scripts/qa-offline-workspace.mts)
- 断网和网关中断使用浏览器与本地宿主模拟。桌面通过同源工作区标签模拟。记录适用于本地构建及上述 Chrome 视口。

## 发布验收

2026-11-26 完成 AC-005。GitHub 标签 `v0.2.44`、Release 附件、Docker Hub 镜像及桌面安装包均来自合并提交 `42f04180932f1909de921dfd67c1b3354dbfa7c3`。[发布 PR](https://github.com/workhold/doca/pull/164)

- 合并前应用、macOS、Windows、PostgreSQL 17/18、文档与 SDD 检查通过。合并后的 PostgreSQL 18 权限撤销用例曾超时，同提交重跑通过。本地 3,523 项 Vitest 测试分两批通过，11 项按既有条件跳过。另以同源 Chrome 验证 0.2.43 的离线缓存交接到 0.2.44 后可离线打开。[合并后数据库检查](https://github.com/workhold/doca/actions/runs/45652797129)
- `smartdoca/doca:0.2.44` 与 `smartdoca/doca:latest` 的实际公开清单均为 `sha256:3eabd8ca03a8f473c307561af4ddd7ea547be59043be14302c586a27f9846d25`。Linux amd64、arm64 的平台清单和配置摘要均与 CI 验收结果一致。[Docker Hub 发布任务](https://github.com/workhold/doca/actions/runs/45652898465)
- 下载了全部 13 个 GitHub Release 附件，文件 SHA-256 与 GitHub 发布摘要一致，安装包和部署文件等随附的校验文件也相符。macOS DMG 只读挂载后确认版本 0.2.44、x86_64 与 arm64 通用二进制及内置 Web 资源。Windows EXE、MSI 来自 `x86_64-pc-windows-msvc` 构建，MSI 元数据确认为 x64。[GitHub Release](https://github.com/workhold/doca/releases/tag/v0.2.44) · [桌面发布任务](https://github.com/workhold/doca/actions/runs/45652865516)

发布日志、制品和校验记录见 `artifacts/verification/release-0.2.44/`。
