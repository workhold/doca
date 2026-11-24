# 本地离线工作台验证

**Spec**: [spec.md](spec.md)
**Result**: partial

## 验证范围

2026-11-24，本地验证 0.2.42 候选，使用 Node 24.15.0、Chrome 158、macOS Rust 1.100 和隔离 SQLite。浏览器验收创建两个测试账号及测试文档。五种编辑器使用锁文件中的 Slate 0.4.26、Markdown 0.4.4、Sheet 0.2.20、Canvas 0.5.16 和 Slides 0.3.0-alpha.5。

| 验收 | 本地结果 |
| --- | --- |
| AC-001 | 本地真实服务关闭后，Web 首页的「最近编辑」显示 14 篇文档，按文库名搜索后可点开第一篇。桌面 Rust 测试和浏览器桌面标签模拟验证了内置前端在纯文本 502 时进入本地副本。 |
| AC-002 | 五种格式的副本可从目录打开，可编辑时显示提示。用第二个账号验证只读副本，编辑提示不会出现。 |
| AC-003 | 富文本正文离线编辑后刷新仍可恢复，待同步消息 ID 和字节一致。重启后端后原编辑器和焦点保留，持久确认清空队列，另一个无本地副本的浏览器会话读到已同步正文。另一次恢复场景中，双页合并后 60 秒空闲期间没有新增正文提交。其他格式验证打开和状态提示。 |
| AC-004 | 退出会在同源其他标签撤下目录。换账号只显示其自己的文档。访问撤销隐藏被拒绝的条目，正文副本仍保留。已有标题和正文的隔离旧条目，仅在用新版在线重新打开后加入目录，旧存储值原样保留。 |
| AC-005 | Vite 生产构建通过，下载得到 224 个静态 URL。实际缓存清单仅有应用构建资源。使用可用后端登录、下载前端及重连均成功。 |
| AC-006 | 本地验收和合并前 CI 通过后，GitHub Release、Docker Hub 多架构镜像、macOS 和 Windows 桌面制品从同一提交发布。已核对标签、镜像清单及附件校验值。 |

## 检查与证据

类型、生产构建、部署归档、SDD 与文档检查通过。配置固定 WeasyPrint 70.0 及本机 Pango 后，全量 Vitest 3523 项通过、11 项跳过。桌面 Rust 测试 27 项通过，macOS arm64 本地构建已核对应用版本和内置前端。浏览器检查使用 `scripts/qa-offline-workspace.mts` 和 `scripts/qa-document-startup.mts`，日志与截图位于 `artifacts/verification/offline-workspace/` 和 `artifacts/verification/document-startup/`。本地离线交互使用浏览器和桌面标签模拟，原生安装包的交互场景仍需实测。

调查确认了两个需要分别准备的运行时条件：可在停机时加载的前端，以及带授权元数据的正文副本。浏览器验收修订了只读、账号切换和显式拒绝的覆盖。调查及记录维护用时未单独统计。

## 发布记录

版本标签 `v0.2.42` 指向合并提交 `2ce903c60d93b8aa154ef20a9ecd14a793a1d9c0`。合并前通过应用、macOS、Windows、PostgreSQL 17/18、SDD 和文档检查。[发布 PR](https://github.com/workhold/doca/pull/159)

- `smartdoca/doca:0.2.42` 与 `smartdoca/doca:latest` 指向 Linux amd64/arm64 清单 `sha256:fa06a4aefadbaa05186b6e4497dbdf06f55ad192075cd2935e32528f9903d483`。核对了两种原生镜像的 CI 验收记录、来源提交及仓库中的实际清单。[Docker Hub 发布任务](https://github.com/workhold/doca/actions/runs/45304952794)
- GitHub Release 提供 13 个附件。已下载并校验 Web 资源、部署归档、Compose 文件和 SDK 包。macOS 通用 DMG、Windows x64 NSIS EXE 和 MSI 的发布摘要与各自的 SHA-256 附件一致。[GitHub Release](https://github.com/workhold/doca/releases/tag/v0.2.42) · [桌面发布任务](https://github.com/workhold/doca/actions/runs/45304951300)
