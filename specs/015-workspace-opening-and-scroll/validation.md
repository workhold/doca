# 验证记录

**Spec**: [文档打开状态与工作台滚动](spec.md)
**Result**: partial

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

AC-005 等待 0.2.44 的 GitHub、Docker Hub 和桌面发布结果。
