# 插件故障隔离计划

**Spec**: [spec.md](spec.md)
**Date**: 2026-11-01

## Summary

静态选择先严格验证核心，再从业务插件中排除 SDK 不匹配项，并传播必需依赖故障；只将可运行图交给原 PluginHost。PluginManager 保存配置快照与实例故障，管理写操作只允许保留既有故障或修复故障，拒绝新制造的兼容性故障。启动目录导入保留原包，不执行其服务端入口。

## Constitution Check

full：改变启动隔离边界及管理 API。用户明确决定仅隔离不兼容插件，并单独同意保守拦截策略写操作。沿用现有数据格式和归档哈希校验，无迁移。界面采用 doca-i18n，日志和截图进入 artifacts/verification/plugin-startup-isolation/。

## Decisions and boundaries

安装意愿与实际运行分开，故障不标成 pending。升级时允许别的既有旧插件继续隔离，避免管理死锁。运行诊断为稳定代码和结构化参数，由界面翻译。不可用插件不执行卸载代码；升级后才可按原卸载流程处理。默认不吞掉生命周期异常、非法 manifest、哈希损坏或核心启动错误，本次只改变兼容性校验的影响范围。

## Acceptance mapping

| Acceptance ID | Source | Verification |
| --- | --- | --- |
| AC-001 | plugins/selection.ts, manager.ts, composition.ts | SDK/必需与可选依赖/核心严格校验、实际 createApp |
| AC-002 | core/shared/plugin-store.ts, Web plugins.tsx, i18n | 状态断言、双语浏览器验证 |
| AC-003 | PluginManager 更新与配置快照 | 升级、重启、原始行和命名空间保留 |
| AC-004 | 管理写入与归档检查 | 拒绝新不兼容、依赖破坏、卸载代码执行 |
| AC-005 | 资源授权及策略检查 | 未注册权限拒绝、checkOperation 在未知策略缺席时返回 503；停用并重启后解除 |
| AC-006 | 0.2.31 版本、发行说明与原生镜像工作流 | GitHub PR/Release、两个原生架构的真实镜像隔离检查、远端摘要复核 |

## Validation and recovery

使用独立 SQLite / 测试夹具验证；受影响代码执行类型检查、管理/安装/Host/权限测试及生产构建。此变更无表结构变化，不声称生产恢复或运行部署完成。回退保留所有数据与归档；恢复旧启动策略会重新阻塞旧插件，优先用兼容插件升级恢复。
