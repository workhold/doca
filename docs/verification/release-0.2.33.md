# Doca 0.2.33 发布验证

2026-11-03（Asia/Shanghai）。发行源码与不可变 tag `v0.2.33` 均为 `cc29f4ffb211f3a1417a89e32256e7c3270750ff`，由 [PR #130](https://github.com/workhold/doca/pull/130) 合入 main。合并后的源码树与本地检查的候选 `f1c4db2b` 相同；本次回执不移动 tag，也不重建同版本镜像。

## 行为与范围

富文本、在线文档用户链接和在线表格中，@ 当前用户统一使用胶囊圆角的蓝底白字，去掉用户提及下划线并平衡上下留白。普通链接保留原有样式。正式 Sheet 0.2.17 覆盖网格、公式栏、单元格编辑态和只读预览；宿主为正文、历史/回收站及模板入口传入当前身份。身份切换只刷新视图，不写入共享内容。

本轮为 full：发布包含表格公共视图 API 接入的功能，使用 [005 发布规格](../../specs/005-release-0-2-33/spec.md) 和 [004 功能验收](../../specs/004-sheet-self-mentions/validation.md)，契约为[编辑器集成](../editor-integration.md)。没有数据库、持久化格式、协作协议、历史读取、转换或迁移变化，也没有新增兼容行为。Sheet 仍为 schema 6，公开插件 SDK 仍为 0.2.0。其他本地未提交工作未纳入发行，未执行生产部署或用户数据操作。

## 本地与 CI 检查

- AC-001：正式 npm Sheet 0.2.17 注册表 SHA-512/SHA-1 及全部 84 个安装文件一致；004 的 17 项包测试、原生界面三轮截图（含 200% 和单元格草稿）通过。切换、清空身份与取消草稿后原生快照不变、ready 次数 1、共享写入 0；功能验收只使用合成数据。
- AC-002：版本、Compose、双语发行说明及文档入口统一为 0.2.33。
- AC-003：`pnpm typecheck`、`pnpm build`、`pnpm build:plugin-sdk`、SDK 打包、部署打包、独立 Compose 解析、`pnpm sdd:check` 与 `pnpm docs:check` 通过。
- 完整测试初次为 3516 项通过、1 项失败、11 条件项跳过。并行执行构建与测试时，画板并发渲染用例报告 `canvas_font_unavailable`；构建完成后串行复跑其完整测试文件，13/13 通过。没有修改源码或断言；首次完整运行仍记录为失败，不据复跑宣称首次全绿。测试使用固定 WeasyPrint 70.0 和 macOS Pango 动态库环境。
- [PostgreSQL 17/18 回归](https://github.com/workhold/doca/actions/runs/41657982433) 两个任务成功，包含真实已发行 0.2.29 生成数据的升级场景；本轮没有 schema 变化。[SDD](https://github.com/workhold/doca/actions/runs/41657982429) 和[文档 CI](https://github.com/workhold/doca/actions/runs/41657982564) 通过。

## Docker Hub

AC-004：[原生镜像构建、验收与发布](https://github.com/workhold/doca/actions/runs/41659258036) 三个任务均成功。两个架构分别验证原图、登录/退出/撤销、插件隔离、PDF/Canvas/Office；各自 594 个运行源文件和 484 个 Web 文件逐一吻合。渲染验收均为 UID 1000、真实 provider 调用数 0、未使用用户数据。

`smartdoca/doca:0.2.33` 与 `latest` 索引一致：

`sha256:6dcc67ccf73ffeea39cd048ff18fe30b3f34975b50d768c316713f0b5b7c0e3e`

| 平台 | Manifest digest | 压缩层字节 |
| --- | --- | --- |
| linux/amd64 | `sha256:39a9f39b33007527a257727b9f6f38c25c9a469dfedf616784d7943fd43aa986` | 519910517 |
| linux/arm64 | `sha256:7b85a97291e5903ab68e41e6451f40170d6bb129af9cbfe26bb640a0a4881001` | 511809917 |

本机另行读取两个远端标签的索引、平台 manifest 和 config digest，均与已验收镜像一致。临时发行 registry secrets 已删除并确认不存在，凭据值未写入文件或制品，本机 Docker 登录未修改。

## GitHub Release

AC-005：[GitHub Release v0.2.33](https://github.com/workhold/doca/releases/tag/v0.2.33) / [官方工作流](https://github.com/workhold/doca/actions/runs/41661062733) 均已发布成功，源码提交与镜像一致。7 个附件实际下载，逐一核对 API 大小和 SHA-256，3 个校验文件通过。部署包 7 个文件、Web 资产 479 个文件、SDK 40 个文件与本地构建逐字节一致；SDK exports/dependencies 一致且无 workspace 占位，独立 Compose 解析通过。

Web 包单连接下载较慢，保留已下载前缀并用 8 个范围请求取得余下字节；每段检查 HTTP 206 与精确 Content-Range，合并后再次核对完整大小与 API SHA-256。没有跳过摘要、解包内容或策略检查。

| 附件 | 字节 | SHA-256 |
| --- | --- | --- |
| `doca-compose-v0.2.33.yaml` | 807 | `2050a5f3a9fe7623980ac191d43b6db339ce2f225037f41da0d10db662e1b60b` |
| `doca-compose-v0.2.33.yaml.sha256` | 92 | `8c45a8a5599d2bc846ae82b8a911615636bb957cf6c9c8a53ab325abedc686b3` |
| `doca-deploy-v0.2.33.tar.gz` | 11416 | `b7420c4be8a88f6083045ab3f1047b302027ad168c52930972162aba31527944` |
| `doca-deploy-v0.2.33.tar.gz.sha256` | 93 | `71cf843ee72eebebf6bff613b63b174fb30c3a0323412884d3d78b0cbaee80b2` |
| `doca-web-assets-v0.2.33.tar.gz` | 19228693 | `bcb5e56f97450616eafda05f4a95cecc522fb76f543032b6d656c564f365d889` |
| `smartdoca-plugin-sdk-0.2.0.tgz` | 26367 | `d40e1fae3176474d2ecbad237a59d4aa6d88a68919faa80ea12608a13fd9727b` |
| `smartdoca-plugin-sdk-0.2.0.tgz.sha256` | 97 | `86a55979bd5f911d164277fccf75b33fa9457c46d93dca64d29adec76aff9ba9` |

## 证据与限制

原始日志、截图、JSON 和附件下载在忽略的 `artifacts/verification/release-0.2.33/`，未提交。复用既有镜像验收及 `scripts/qa-release-registry.mjs`。局部界面自检没有独立视觉评审；没有复跑 Safari/Firefox 或广泛协作操作。没有用户生产数据、真实外部 provider 调用、生产部署或迁移，发布验收不代表运行中的实例已经升级。调查、返工与过程开销未计时。
