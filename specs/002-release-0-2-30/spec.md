# Doca 0.2.30 合并发布

**Level**: full
**Status**: verified
**Created**: 2026-11-01
**Decision**: 用户明确要求“所有变更，包含其他对话的。发dockerhub、github”。MCP 解耦的具体持久化、历史保留及插件接口方案已在原对话取得明确同意。

## Scope

将当前工作区的 SDD 接入与 MCP 独立执行变更合并为 0.2.30，通过 GitHub PR 合入后发布固定 Git tag、GitHub Release 和 Docker Hub amd64/arm64 镜像及 latest。现有源码工作作为发布候选重新验证；本记录不重写其开发过程或追认未经同意的兼容方案。

## Acceptance

- **AC-001**: 当前所有受管源码、配置、测试和审阅文档纳入候选；凭据、用户数据、依赖、原始报告及构建输出不提交。
- **AC-002**: 0.2.30 版本、Compose、发行说明和文档入口一致；说明 MCP 不再创建对话、历史记录原样保留且不续跑、SDK 0.2.0/ai.v2 不提供旧接口适配及协调升级要求。
- **AC-003**: 类型检查、全量测试、生产构建、SDK 构建、SDD/文档检查及必要的数据库/浏览器验收完成，实际范围与跳过项如实记录。
- **AC-004**: 合并提交对应的原生 Linux amd64/arm64 镜像通过独立冒烟、渲染和源码文件核对后发布；固定版本和 latest 的远端摘要/版本/源码标签验证一致。
- **AC-005**: 固定 v0.2.30 tag 与 GitHub Release 发布成功；附件下载、哈希及部署配置验证通过，发布结果与限制留有审阅摘要。

## Architecture and compatibility

本次集成沿用已获同意的 MCP 方案：`ai_jobs.session_id/model_id` 和 `mcp_contexts.session_id` 原生改为可空，新增空的任务资源账本，历史行不转换、不续跑、不删除；代际不变。旧插件 SDK 范围及 AI 服务拒绝，不增加适配或自动降级。升级前备份，宿主/Web/插件协调更新；上线后的恢复先保全新增任务和文件，再单独审查。详见[升级规范](../../docs/database-schema-evolution.md)和[专项验证](../../docs/verification/mcp-execution-decoupling-2026-11-01.md)。

已有图片回执的多版本校验、历史格式拒绝规则和停用的旧 MCP 凭据存储继续按原合同执行，本次不改变这些已存在的兼容路径。SDD 接入不改变应用运行或用户数据行为。本次仅发布制品，不操作运行中的用户部署。
