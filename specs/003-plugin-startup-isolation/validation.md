# 插件隔离验证

**Spec**: [spec.md](spec.md)
**Result**: passed

## Scope

2026-11-01，宿主候选 0.2.31 / SDK 0.2.0，Node.js 24.15.0。所有数据库、包目录和浏览器账号为隔离夹具，不操作生产部署。日志、截图和下载位于 artifacts/verification/plugin-startup-isolation/；最终镜像与附件回执位于 artifacts/verification/release-0.2.31/。

## Acceptance results

| Acceptance ID | Command or observation | Result and limits |
| --- | --- | --- |
| AC-001 | plugin-selection、plugin-manager、installation、host 回归；实际 createApp | SDK ^0.1.9 的代码不导入，必需依赖传播，健康插件及核心启动；核心/非法图仍拒绝 |
| AC-002 | DOCA_QA_ISOLATED=1 pnpm exec tsx scripts/qa-plugin-startup-isolation.mts | 实际登录和管理 API，中/英文、1440px 与 390px，零 pageerror、零横向溢出；仅远端商城列表被替换为空夹具 |
| AC-003 | 管理器隔离库、命名空间与行保留断言；浏览器真实 ZIP 上传 | 多个旧插件可逐个修复；同 dataVersion 更新、重启恢复，原业务行/命名空间不变，无重复重启误报 |
| AC-004 | 新不兼容包安装、旧卸载钩子、管理权限、损坏归档原回归 | 新包拒绝、卸载代码未执行、未登录管理 401；既有损坏归档拒绝检查仍通过 |
| AC-005 | 真实资源创建 HTTP、内容读取拒绝、checkOperation 与重启断言 | 策略覆盖写操作 503，缺席插件内容来源 404；单独停用并重启后解除保护，中英错误可翻译 |
| AC-006 | 原生镜像与 GitHub 发布 | PR #126 已合入；原生 amd64/arm64 和远端摘要验证通过；v0.2.31 发行 7 附件下载/哈希核对通过，见[发布回执](../../docs/verification/release-0.2.31.md) |

## Evidence and exclusions

- 完整回归：339 文件通过、3 条件文件跳过；3516 测试通过、11 条件测试跳过。随后补充可选依赖的输入顺序边界并执行最终相关回归，最终 13 文件、127 测试通过；升级待重启提示及禁止取消回旧 SDK 包补充断言后，4 文件、50 测试与浏览器流程再次通过。
- 类型检查、生产构建、SDK 构建、部署打包通过。SDD/文档工具共 19 测试通过；文档检查 438 文档、2420 链接、113 双语页面、140 核心表一致。文档计数随最终验收摘要增加。
- 本机 PDF 采用先前隔离安装的固定运行时，通过 DOCA_PDF_PYTHON 和 DYLD_FALLBACK_LIBRARY_PATH 运行完整回归；不改系统依赖。
- 浏览器记录：ui-USlQz2/report.json，截图已检查。首次脚本把英文确认按钮误写为 Confirm 而超时；按实际 OK 更正后完整流程通过，不是产品故障。
- 无新数据库 DDL 或格式变化。本地 SQLite 完成；另从实际发行 0.2.29 升级 SQLite，138 个业务表原行保留，重复/并发启动和拒绝无部分写入通过。PostgreSQL 17/18 每版 34 文件、403 项通过、3 项条件跳过，实际 0.2.29 升级保留 138 表；两种原生 Linux 镜像均完成插件隔离、渲染与逐文件验收。没有真实外部 AI/邮件调用或生产更新声明。

## Contracts and compatibility

用户明确要求“不兼容只让对应插件不可用，不能阻塞启动”，并单独确认“同意，保守拦截相关写操作”。新状态为实例内诊断，不持久化、不转换旧包、不扩宽 SDK 范围。更新插件 SDK、开发和部署合同的中英说明。原 SDK 包仍为 0.2.0；旧 SDK 代码不执行；恢复通过兼容升级或管理员明确停用并重启，不是自动降级。

## Process observation

上一发布只验证无业务插件的启动，漏掉了“已安装旧 SDK 插件”的宿主升级路径。本次将该场景做成可复用管理器测试、浏览器夹具及两种原生发行镜像的强制检查。SDD 明确了范围和事先同意，但不能代替真实已安装插件场景的验收。
