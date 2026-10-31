# 接入设计

**Spec**: [spec.md](spec.md)

## Decisions

1. 固定使用 GitHub Spec Kit 1.0.4，与已调查的 LightMoni 基线一致。通过固定版本 CLI 在 artifacts/ 中初始化隔离项目，复制上游 Codex skills、脚本和模板，保留许可证及来源记录；不对当前工作区运行覆盖初始化。
2. 使用项目级模板覆盖记录 Doca 的真实目录、分级规则、验收编号、契约来源、兼容决定和验证边界。AGENTS.md 声明流程入口与优先级，constitution 引用既有治理规则，避免复制全部技术契约。
3. 新增双语流程指南及模块索引，接入开发文档和文档站。每个模块指向现有源码、契约和测试；存量实现不自动获得 verified 状态。
4. 增加 PR 模板与独立的只读 SDD 检查。完整规格要求 spec/plan/tasks/validation，普通规格允许将设计、任务和验收放在同一个 spec；轻量变更仅要求 PR 问题、行为和验证记录。文档、模板和执行产物分别按现有约定保存。
5. 检查验证目录、状态、验收和 PR 关联；不以正则匹配源码推断所有语义风险，不自动批准兼容方案或验证记录。风险判断和兼容批准仍由维护者审阅。

## Validation

基线 `pnpm docs:check` 已通过：395 份仓库文档、2128 条仓库链接、109 页双语发布、140 个数据库表及 skill 引用一致。日志为本地 `artifacts/verification/sdd-adoption/docs-before.log`。

实现后运行 SDD 检查器的正反例、上游脚本隔离解析与模板覆盖检查、`pnpm test:docs`、`pnpm docs:check`、`pnpm docs:build` 和本次变更的空白检查。应用测试和生产验收不属于流程接入的证明范围；其他工作项的未提交代码不由本记录宣称通过。
