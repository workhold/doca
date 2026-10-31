# 规格驱动开发

[English](sdd.md)

本流程覆盖 Doca 全项目的新工作。仓库固定使用 GitHub Spec Kit 1.0.4 的 Codex skills、脚本和模板；安装与升级方式见 [.specify/README.md](../.specify/README.md)。使用时遵守 [AGENTS.md](../AGENTS.md)、[constitution](../.specify/memory/constitution.md) 和现有技术契约。先通过[模块索引](sdd-module-index.zh-CN.md)定位当前源码、契约与可复用检查。

## 选择级别

| 级别 | 行为影响 | 实现前的最小记录 |
| --- | --- | --- |
| `full` | 数据库或持久化格式；认证/授权；协同；公共 SDK/API 契约；架构、凭据或部署边界 | 同一个规格目录中的 `spec.md`、`plan.md`、`tasks.md`、`validation.md` |
| `standard` | 在既有边界内的其他功能与可观察行为变化 | 一份 `spec.md`，包含范围、验收、设计、任务和验证 |
| `light` | 不涉及上述影响的小范围修复、文案、样式、测试或文档 | PR 中的问题、最终行为、验证和影响说明 |

按行为判断，不按代码行数判断。一行授权变更也属于 full。恢复已规定行为、且不改变契约或高风险边界的局部修复可以使用 light。纯流程改动也可以主动采用 full 来记录接入，例如[本次安装](../specs/001-sdd-adoption/spec.md)。扩大任务范围前先提升级别并更新规格。PR 说明分类理由；自动检查不能替代语义风险判断。

## 执行一次变更

1. 查模块索引、实际源码/包导出及适用 skill，记录当前版本，区分实现和提案。普通评审节点继续沿用用户已经给出的授权。
2. full/standard 在实现前创建 `specs/<number>-<short-name>/spec.md`。编号采用下一个未使用的三位数字并保持唯一；Git 分支独立命名，通常使用 `codex/`。记录 `Level`、`Status`、`Created`、`Decision`、`Scope` 和稳定的 `AC-001` 验收编号。[项目模板](../.specify/templates/overrides/spec-template.md)提供章节。
3. full 补充计划、引用验收编号的勾选任务和初始 pending 的验证记录。可使用[计划](../.specify/templates/overrides/plan-template.md)、[任务](../.specify/templates/overrides/tasks-template.md)及[验证](../.specify/templates/overrides/validation-template.md)模板。standard 在 spec 内保留 `Design`、`Tasks`、`Validation`。仅在实际需要时增加独立研究、数据模型或契约资料。
4. 兼容行为实现前，单独取得 AGENTS.md 要求的具体同意：实际版本/格式，拒绝、保留、转换或迁移行为，以及数据保留、校验和恢复方案。规格状态为 accepted 不等于已获此批准。数据库变更遵守[升级规范](database-schema-evolution.zh-CN.md)。
5. 按范围实现任务，并在同一个 PR 中更新受影响的现行契约。用验收编号关联检查与观察；记录实际结果、跳过项、版本和限制。产物遵守既有[存放规则](documentation.zh-CN.md#资源与更新)。
6. 运行 `pnpm sdd:check` 和模块相关检查，使用 [PR 模板](../.github/PULL_REQUEST_TEMPLATE.md)，声明级别与一个主规格路径。其他工作项可从主规格关联。审阅时明确检查高风险边界、契约更新及单独的兼容决定。

## Codex skills

仓库中的 `.agents/skills/speckit-*` 会在 Codex 会话发现项目 skills 时加载；若当前会话早于安装，重新打开项目聊天。以下命令在助手聊天中调用，不在终端执行。full 工作可采用：

```text
$speckit-specify 描述需要实现的行为和用户
$speckit-plan 说明真实的 Doca 模块、依赖包和限制
$speckit-tasks
$speckit-analyze
$speckit-implement
$speckit-converge
```

项目 constitution 已建立。按需要使用 clarify、checklist。standard/light 可以直接维护分级记录，无需执行完整流程的每个命令。上游通用 workflow 保留其评审门，以上默认方式遵循 Doca 的分级流程和已有用户授权；通用提示不会授予兼容决定、发消息、发布或部署权限。

需要时显式选择已有规格：

```sh
SPECIFY_FEATURE_DIRECTORY=specs/001-sdd-adoption bash .specify/scripts/bash/check-prerequisites.sh --json --require-spec --require-tasks --include-tasks
bash .specify/scripts/bash/resolve-template.sh spec-template
```

`.specify/feature.json` 是已忽略的当前检出目录本地指针，不作为共享分支或项目基线。上游脚本/模板保持原样，定制放在 `templates/overrides/`，检查器校验上游文件哈希。项目模板按 `specs/<number>-<name>/` 编写；主动选择其他目录时相应调整相对链接。

## 状态与证据

| 状态 | 含义 |
| --- | --- |
| `draft` | 范围或决定仍在准备 |
| `accepted` | 范围已同意；具体兼容批准另行记录 |
| `implemented` | 范围内实现和任务完成，验证仍可待执行或部分完成 |
| `verified` | 在已声明的验证范围内，每个验收编号都有实际结果 |
| `superseded` | 历史记录，注明替代资料 |

存在未完成任务、未解决验收或 pending/failed 结果时不得标为 verified。历史 verified 规格不重新证明当前代码；当前行为仍查现行契约，过期设计标明替代关系。已有规格、契约及验收记录保留路径与日期。模块索引仅提供入口，不追认存量实现已完成验收。

## 检查与 PR

`pnpm sdd:check` 检查规格编号、级别/状态、必要资料、验收与任务追溯、完成验证记录及已安装上游哈希。`pnpm test:sdd` 覆盖正反例和上游脚本/模板的隔离使用。`pnpm docs:check` 校验实际文档与模块链接，包括已安装 skills 和项目模板。

PR 正文使用以下独立行，并填写实际值：

```text
SDD-Level: full
SDD-Spec: specs/001-sdd-adoption/spec.md
```

轻量变更填写 `SDD-Level: light`、`SDD-Spec: none`。所有 PR 填写 `Problem`、`Behavior`、`Impacts` 和 `Verification` 章节。SDD GitHub workflow 在 PR 创建、正文编辑和代码更新时检查元数据，在 main 检查仓库记录；使用 `pull_request`、只读权限且不使用密钥。检查只能校验结构和引用，声明的级别、用户同意与测试结果是否属实仍需维护者审阅。workflow 不配置分支保护，是否设为合并必需检查属于仓库设置。

## 观察初期效果

接下来 3–5 次真实变更，在验证记录或轻量 PR 中简要记录：调查投入、评审发现的遗漏、实现后的返工，以及维护记录的成本。已测量时填写耗时，否则注明未测量。尽量对比相近类型的变更，再按实际负担调整模板深度。安装 Spec Kit 本身不证明缺陷率或交付速度已经改善。
