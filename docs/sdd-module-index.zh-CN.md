# SDD 模块索引

[English](sdd-module-index.md) · [执行流程](sdd.zh-CN.md)

本索引关联已有模块的源码、现行契约和可复用检查，不证明存量功能已经验收，也不重跑历史验收。开发前核对实际导出与锁文件版本，当前限制参照[架构](architecture.zh-CN.md)及适用发行说明。修改模块时建立新的 SDD，并在同一个 PR 中更新权威契约。

| 模块 | 源码入口 | 现行契约与指引 | 可复用检查 |
| --- | --- | --- | --- |
| 宿主组装与生命周期 | [服务端](../apps/server/src)、[核心](../packages/core/src) | [架构](architecture.zh-CN.md)、[开发](development.zh-CN.md) | [宿主隔离/集成](../tests/cloud.test.ts) |
| 认证、授权与用户组 | [核心规则](../packages/core/src)、[HTTP 路由](../apps/server/src/routes) | [认证](authentication.zh-CN.md)、[权限](permission-inheritance.zh-CN.md)、[用户组](user-groups.zh-CN.md) | [权限](../tests/permissions-v2.test.ts)、[继承](../tests/permission-inheritance.test.ts)、[用户组](../tests/user-groups.test.ts) |
| 文档编辑器与文件交换 | [文档 UI](../apps/web/src/features/documents)、[文档核心](../packages/core/src/modules/documents) | [编辑器集成](editor-integration.zh-CN.md)、[文件交换](editor-file-exchange-contract.zh-CN.md)；仓库编辑器 skill | [包升级](../tests/editor-package-upgrade.test.ts)、[集成](../tests/document-integration.test.ts)、[PDF](../tests/document-pdf.test.ts) |
| 协同、在线状态与评论 | [文档 codec](../packages/core/src/modules/documents/codecs)、[服务端服务](../apps/server/src/services) | [协同契约](collaboration-sdk-contract.zh-CN.md)、[评论](comments-and-community.zh-CN.md)；仓库协同 skill | [协同](../tests/collaboration.test.ts)、[选区](../tests/rich-text-collaboration-selection.test.ts) |
| 数据库结构与持久化格式 | [数据库包](../packages/db/src)、[最新 DDL](../packages/db/src/create-schema.ts) | [升级规范](database-schema-evolution.zh-CN.md)、[结构清单](database.zh-CN.md) | [结构对账](../tests/schema-reconciliation.test.ts)、[字段属性](../tests/schema-column-alignment.test.ts)、[PostgreSQL CI](../.github/workflows/database-upgrade.yml) |
| 文件、存储与历史 | [文件路由](../apps/server/src/routes/files.ts)、[文档核心](../packages/core/src/modules/documents) | [存储](storage.zh-CN.md)、[文档行为](document-experience.zh-CN.md) | [文件](../tests/files.test.ts)、[存储](../tests/storage.test.ts)、[历史](../tests/history-storage.test.ts) |
| 插件安装与公开 SDK | [SDK](../packages/plugin-sdk)、[插件宿主](../packages/plugin-host)、[Web 注册](../packages/web-plugin-registry) | [SDK 契约](plugin-sdk-contract.zh-CN.md)、[开发](plugin-development.zh-CN.md)、[存储](plugin-horizontal-scaling.zh-CN.md) | [SDK](../tests/plugin-sdk.test.ts)、[管理](../tests/plugin-manager.test.ts)、[托管存储](../tests/plugin-managed-storage.test.ts) |
| AI 执行、工具与用量 | [AI 核心](../packages/core/src/modules/ai)、[服务端 AI](../apps/server/src/services/ai)、[宿主包](../packages/ai-host) | [AI 边界](ai-efficiency.md)、[附件](ai-attachments.md)、[续接](plugin-ai-continuations.zh-CN.md)、[SDK 契约](plugin-sdk-contract.zh-CN.md) | [能力](../tests/plugin-ai-capability.test.ts)、[续接](../tests/ai-continuations.test.ts)、[文档读取](../tests/ai-document-read.test.ts) |
| 搜索与知识册 | [搜索宿主](../packages/search-host)、[知识](../packages/core/src/modules/knowledge)、[知识册](../packages/core/src/modules/knowledge-books) | [内容来源](plugin-content.zh-CN.md)、[知识册](knowledge-books.zh-CN.md)、[检查点](knowledge-book-generation-performance.zh-CN.md) | [搜索](../tests/search-host-query.test.ts)、[知识册](../tests/knowledge-books.test.ts)、[正文存储](../tests/knowledge-book-payload-storage.test.ts) |
| MCP 与浏览器助手 | [MCP 路由](../apps/server/src/routes/mcp-management.ts)、[浏览器扩展](../apps/browser-extension) | [MCP](mcp.zh-CN.md)、[浏览器助手](browser-assistant.zh-CN.md) | [MCP](../tests/mcp.test.ts)、[收录](../tests/browser-clipper.test.ts)、[助手](../tests/browser-assistant.test.ts) |
| Web 外壳、原生客户端与语言 | [Web](../apps/web/src)、[移动端](../apps/mobile)、[i18n](../packages/i18n) | [原生集成](plugin-native.zh-CN.md)、[国际化](i18n.zh-CN.md)；仓库 i18n skill | [语言](../tests/i18n.test.ts)、[原生会话](../tests/plugin-mobile-session.test.ts)、[原生能力](../tests/plugin-native.test.ts) |
| 任务、Webhook 与多实例 | [任务宿主](../packages/job-host)、[Webhook](../apps/server/src/services/webhooks) | [Webhook](webhooks.zh-CN.md)、[水平扩展](horizontal-scaling.zh-CN.md)、[插件存储](plugin-horizontal-scaling.zh-CN.md) | [Webhook](../tests/webhooks.test.ts)、[集群监控](../tests/plugin-monitoring-cluster.test.ts) |
| 打包、发布与文档 | [脚本](../scripts)、[Docker](../docker)、[工作流](../.github/workflows) | [部署](deployment.zh-CN.md)、[文档维护](documentation.zh-CN.md)、[验收索引](verification/README.md) | [文档检查器](../scripts/tests/documentation.test.mjs)、[SDD 检查器](../scripts/tests/sdd.test.mjs)、模块/发布专项脚本 |

测试链接仅提供入口，不构成每次变更的完整验证方案。按验收条件与真实边界选择检查：SQLite 结果不能证明 PostgreSQL 升级，模拟对端不能证明外部服务，本地测试不能证明原生设备或生产部署。修改对应领域前阅读适用 skill。独立版本的编辑器包和业务插件还需各自仓库的检查及明确的集成版本记录。
