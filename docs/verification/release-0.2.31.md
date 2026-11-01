# Doca 0.2.31 发布验证

2026-11-01。源码及固定 tag：`ba50c896f0493e88d70e77db461c3fedd675bad8`，经 [PR #126](https://github.com/workhold/doca/pull/126) 合入。合并提交的 tree 与本地最终候选 `3038e91480f65fd990a8565fd703e0f6893d15df` 一致。后续验收回执提交不移动此 tag，也不重建同版本镜像。

## 行为与事先同意

本轮用户明确要求“不兼容最多对应插件不可用，不能阻塞启动”，并对保守拦截策略写操作回复“同意，保守拦截相关写操作”。SDK/依赖不兼容的业务插件在导入代码前隔离，必需依赖方也隔离，无关插件及核心继续启动。管理页中英提示原因、升级与待重启状态；兼容更新不能取消回旧 SDK 包。

保留启用意愿、归档、业务数据、凭据及安装代次，不修改 SDK 范围或做旧接口适配。存在启用但不可用的插件时，既有策略检查覆盖的写操作返回 503，登录、读取、插件管理保持可用。升级或管理员明确停用后须重启各实例，才解除本实例保护。缺席的插件内容与权限来源继续拒绝访问。不执行 SDK 不兼容包的卸载代码；应先升级。

无新数据库结构或格式变化。非法元数据、损坏归档、核心插件失败和实际生命周期异常仍明确失败；本次范围是兼容性隔离。没有生产部署操作、数据转换、应用自动降级或 SDK npm 发布。

## 本地与数据库检查

- 完整回归：339 文件通过、3 条件文件跳过；3516 测试通过、11 条件测试跳过。补充可选依赖输入顺序后，13 文件 127 项相关测试通过；待重启提示与取消保护的最终补丁又通过 4 文件 50 项测试及浏览器流程。
- 类型检查、生产构建、SDK 0.2.0 构建、部署打包通过；SDD/文档工具共 19 项测试通过。
- 真实 HTTP/管理夹具验证旧 SDK 模块不导入、健康插件运行、管理 401/200、策略写入 503、缺席内容来源 404、逐个升级、重启恢复，以及原业务行和命名空间保留。新在线不兼容包仍拒绝。
- 浏览器使用隔离账号及数据库，覆盖中/英文、1440px 和 390px、零 pageerror/横向溢出、真实登录、清单、ZIP 上传与待重启指导；仅远端商城列表被替换为空夹具，不依赖真实 AI 或邮件服务。
- SQLite 从实际发行 0.2.29 升级，138 个业务表原行保留，重复/并发启动与拒绝无部分写入通过。
- [PostgreSQL 17/18 CI](https://github.com/workhold/doca/actions/runs/41266244121)：每个版本 34 文件、403 项通过、3 条件测试跳过；各自从实际发行 0.2.29 升级并保留 138 个业务表。

## 镜像

[原生镜像构建与验收](https://github.com/workhold/doca/actions/runs/41266662752) 已成功。两个架构均验证旧 SDK 模块及必需依赖方不导入、健康插件运行、登录/管理 200、策略写入 503、重启后注册表不变。每个架构另通过原图、登录/退出/撤销、PDF/Canvas/Office 与逐文件核对：594 个运行源文件、484 个 Web 文件吻合；UID 1000，渲染验收真实 provider 调用数为 0。

Docker Hub `smartdoca/doca:0.2.31` 与 `latest` 的索引一致：

`sha256:c72a4e82ac9644d17d986321b8995bdccf6bda8b256fa5b4e73195e1cc38ab77`

| 平台 | Manifest digest | 压缩层字节 |
| --- | --- | --- |
| linux/amd64 | `sha256:099e4ba538f581ea7c85ec516d5b9578726b6165f9a28ba4f255671511df6ed5` | 519904596 |
| linux/arm64 | `sha256:334e702c30617b4ae1af55d083c9039351024a76d9fa159e7bb943e74d6c7c53` | 511805564 |

工作流验证后，本机再次独立从远端读取版本/latest 索引、两平台 manifest 和 config digest，均与验收记录一致。临时发行 registry secrets 已删除并确认不存在，凭据值未写入日志或制品；本机 Docker 登录未修改。

## GitHub 制品

[GitHub Release v0.2.31](https://github.com/workhold/doca/releases/tag/v0.2.31) / [官方发行工作流](https://github.com/workhold/doca/actions/runs/41267403720)。7 个附件实际下载后逐个核对 API 大小与 SHA-256，并验证 3 个校验文件。7 个部署文件、479 个 Web 资产、40 个 SDK 文件与本地构建一致；公开 SDK exports/dependencies 一致且无 workspace 占位；独立 Compose 解析通过。

| 附件 | 字节 | SHA-256 |
| --- | --- | --- |
| `doca-compose-v0.2.31.yaml` | 807 | `1081c110afc06621db5ee1a3788f7e63172051ad79e7070e96bf3e619443f6da` |
| `doca-compose-v0.2.31.yaml.sha256` | 92 | `f6bf1b19620751209e15f9c7dd7fa12a9ae46bc8693b9aab890e0e81eb152718` |
| `doca-deploy-v0.2.31.tar.gz` | 11148 | `eb400dcbeb74a39b955ad28923a85eb832e13a4bfec341371ffc7ea5e455f119` |
| `doca-deploy-v0.2.31.tar.gz.sha256` | 93 | `684b782f462afc9134e3a578d1d9efa52e30bb50823885453f2ba6bc682abaf8` |
| `doca-web-assets-v0.2.31.tar.gz` | 19236242 | `1ef9adb994c05c9b36ff7a44afaabc28a2aaa391ff70ac134c041fda9cbd06fb` |
| `smartdoca-plugin-sdk-0.2.0.tgz` | 26367 | `d40e1fae3176474d2ecbad237a59d4aa6d88a68919faa80ea12608a13fd9727b` |
| `smartdoca-plugin-sdk-0.2.0.tgz.sha256` | 97 | `86a55979bd5f911d164277fccf75b33fa9457c46d93dca64d29adec76aff9ba9` |

## 证据与范围

可复用检查：`tests/plugin-selection.test.ts`、`tests/plugin-manager.test.ts`、`scripts/qa-plugin-startup-isolation.mts`、`scripts/qa-release-plugin-image.mjs`。完整规格及验收映射见 [003](../../specs/003-plugin-startup-isolation/spec.md)。原始日志/截图/JSON/下载仅在忽略的 `artifacts/verification/plugin-startup-isolation/` 和 `artifacts/verification/release-0.2.31/`，未提交。

本次把“已安装旧 SDK 插件”的场景加入发行镜像强制验收；此前空插件启动的通过结果无法覆盖该场景。插件本体的新版业务流程和运行中生产实例不在本次发布验证范围。
