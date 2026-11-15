# Doca 0.2.32 发布验证

2026-11-03（Asia/Shanghai）。发行源码与固定 tag `v0.2.32` 为 `f613afca5a543ca5c9ec3e582e2d1c19dee9f67b`，已通过 [PR #128](https://github.com/workhold/doca/pull/128) 合入 main，合并提交为 `881a2758552065bef2d0bedc710a76e435dcc836`。发行源文件与合并后的应用、依赖和部署配置一致；本次回执不移动 tag，也不重建同版本镜像。

## 行为与范围

将当前用户 @ 提及的蓝底白字、圆角和内边距直接应用于可点击用户标签，悬停和打开资料卡时保持高亮，其他用户仍按原样显示。复用已有当前用户 ID 判断，共享 CSS 同时用于文档和评论标签，不改变表格画布原生绘制提及。

本轮为 light：仅 CSS、发行版本引用和说明，没有数据库、持久化格式、鉴权、协作或 SDK/API 变化，没有新增兼容行为。公开插件 SDK 仍为 0.2.0。其他本地未提交工作未纳入发行，也未执行生产部署或用户数据操作。

## 本地与 CI 检查

- AC-001 当前用户蓝底白字、AC-002 悬停并展开资料卡仍保持高亮、AC-003 其他用户外观不变：使用真实 Slate 0.4.26、现有宿主 mentionPlugin/UserMention 和样式渲染合成只读段落，连续三次截图检查通过，查看正常、悬停和 200% 截图。没有访问用户文档或数据库；不据此声明验证了真实账户读取和完整文档流程。
- 类型检查、生产构建、SDK 构建及打包、部署打包、独立 Compose 解析、SDD 与文档检查通过。
- 首次完整测试：336 文件通过、3 文件失败、3 条件文件跳过；3507 项通过、10 项失败、11 条件项跳过。两个图像用例在并行运行中超时，其所在两份完整测试文件单进程复跑 93/93 通过。另 8 项失败来自本机 PDF 渲染器不可用；配置固定 WeasyPrint 70.0 并直接用 Node 启动 Vitest、保留 macOS Pango 动态库环境后，PDF 文件 10/10 通过。没有修改源码或断言；首次 `pnpm check` 仍记录为失败，生产构建另行执行并通过。
- [PostgreSQL 17/18 回归](https://github.com/workhold/doca/actions/runs/41481871539) 两个任务均成功；PR 的 SDD、文档检查成功。

## Docker Hub

[原生镜像构建、验收与发布](https://github.com/workhold/doca/actions/runs/41483104708) 成功。每个架构均验证原图、登录/退出/撤销、插件隔离、PDF/Canvas/Office，以及 594 个运行源文件和 484 个 Web 文件逐一吻合。两个架构的渲染验收均为 UID 1000、真实 provider 调用数 0、未使用用户数据。

`smartdoca/doca:0.2.32` 与 `latest` 索引一致：

`sha256:6ccaaa117a2d06e5b1749eeb1c38363f3cac0ff76c0085dbbed54644fdd6890a`

| 平台 | Manifest digest | 压缩层字节 |
| --- | --- | --- |
| linux/amd64 | `sha256:f81f3c15eb22b2a241134b597eeda1540b5789bddba334e32cf404b7f11ab462` | 519904582 |
| linux/arm64 | `sha256:bd64add83b8958c982248a7ebc03767679888c5f374c3b4110bd8eba75a9f80f` | 511805435 |

本机另行读取 Docker Hub 两个标签的索引、平台 manifest 和 config digest，均与已验收镜像一致。临时发行 registry secrets 已删除并确认不存在，凭据值未写入文件或制品；本机 Docker 登录未修改。

## GitHub Release

[GitHub Release v0.2.32](https://github.com/workhold/doca/releases/tag/v0.2.32) / [官方工作流](https://github.com/workhold/doca/actions/runs/41485040510) 均已发布成功。7 个附件实际下载，逐一核对 API 大小和 SHA-256，3 个校验文件通过。部署包 7 个文件、Web 资产 479 个文件、SDK 40 个文件与本地构建逐字节一致；SDK exports/dependencies 一致且无 workspace 占位，独立 Compose 解析通过。

| 附件 | 字节 | SHA-256 |
| --- | --- | --- |
| `doca-compose-v0.2.32.yaml` | 807 | `87782005314931fb6d3ddd563a1980c5c9c339775d495be243609d8206166e77` |
| `doca-compose-v0.2.32.yaml.sha256` | 92 | `fab7eaa185626ae427bec8daf976ef327dea8d626360d7bdaf615a2b7f18d5d3` |
| `doca-deploy-v0.2.32.tar.gz` | 11415 | `12630d0a6bd3f2066336e31c35bbec31d94d3df9a847c521395ff1409d904d02` |
| `doca-deploy-v0.2.32.tar.gz.sha256` | 93 | `484ef8c68a9e4b44cc7bf75665cb7bfa90b52f52fad18a0d6e1c5b79bbe345e5` |
| `doca-web-assets-v0.2.32.tar.gz` | 19224796 | `dfdaeaa9f2b304d6f60371b88d25206bebd048fc7d6562c23238178110cecd37` |
| `smartdoca-plugin-sdk-0.2.0.tgz` | 26367 | `d40e1fae3176474d2ecbad237a59d4aa6d88a68919faa80ea12608a13fd9727b` |
| `smartdoca-plugin-sdk-0.2.0.tgz.sha256` | 97 | `86a55979bd5f911d164277fccf75b33fa9457c46d93dca64d29adec76aff9ba9` |

## 证据与限制

原始日志、截图、JSON 和下载保存在忽略的 `artifacts/verification/release-0.2.32/`，未提交。复用 `scripts/qa-release-registry.mjs` 及既有镜像验收流程。界面为局部自检，没有独立视觉评审；未添加动效或修改界面文案。调查、返工与过程开销未计时。当前发布验证不代表运行中生产实例已升级。
