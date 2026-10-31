# Specification-driven development

[中文](sdd.zh-CN.md)

This workflow applies to new work throughout Doca. GitHub Spec Kit 1.0.4 supplies the checked-in Codex skills, scripts and templates; installation and upgrade details are in [.specify/README.md](../.specify/README.md). [AGENTS.md](../AGENTS.md), the [constitution](../.specify/memory/constitution.md) and existing technical contracts govern its use. Start with the [module index](sdd-module-index.md) to locate current source, contracts and reusable checks.

## Choose the level

| Level | Semantic impact | Minimum record before implementation |
| --- | --- | --- |
| `full` | Database or persisted formats; authentication/authorization; collaboration; public SDK/API contracts; architectural, credential or deployment boundaries | `spec.md`, `plan.md`, `tasks.md`, `validation.md` in one feature directory |
| `standard` | Other features and observable behavior changes within established boundaries | One `spec.md` with scope, acceptance, design, tasks and validation |
| `light` | Bounded fixes, copy, styles, tests or documentation with none of the above impacts | PR problem, final behavior, verification and impact explanation |

Judge behavior, not line count. A one-line authorization change is full. A fix that restores specified behavior can be light if it changes no contract or high-risk boundary. Process-only changes may choose full to document adoption, as [this installation](../specs/001-sdd-adoption/spec.md) does. Raise the level and update scope before expanding a task. State the classification reason in the PR; automated checks cannot establish the correct semantic level.

## Work on a change

1. Inspect the module index, actual source/package exports and applicable skills. Record the current version and distinguish implemented behavior from proposals. Existing user authorization continues across review checkpoints.
2. For full/standard work, create `specs/<number>-<short-name>/spec.md` before implementation. Use the next unused three-digit number; identifiers are unique. Git branches are independent and normally use `codex/`. Record `Level`, `Status`, `Created`, `Decision`, `Scope` and stable `AC-001` acceptance IDs. The [project template](../.specify/templates/overrides/spec-template.md) provides the sections.
3. Full work adds a plan, checkbox tasks referencing acceptance IDs and an initially pending validation record. The [plan](../.specify/templates/overrides/plan-template.md), [tasks](../.specify/templates/overrides/tasks-template.md) and [validation](../.specify/templates/overrides/validation-template.md) templates are available. Standard work keeps `Design`, `Tasks` and `Validation` in its spec. Add separate research, data models and contracts only when the scope requires them.
4. Before compatibility implementation, separately obtain the concrete agreement required by AGENTS.md: affected versions/formats, reject/retain/convert/migrate behavior, preservation, validation and recovery. A spec's accepted status is not that approval. Database changes follow the [upgrade contract](database-schema-evolution.md).
5. Implement the scoped tasks and update affected current contracts in the same PR. Map acceptance IDs to checks and observations. Record actual results, skipped cases, versions and limitations. Outputs follow the existing [artifact rules](documentation.md#assets-and-updates).
6. Run `pnpm sdd:check` and relevant module checks. Use the [PR template](../.github/PULL_REQUEST_TEMPLATE.md); record the declared level and one primary spec path. Additional work items can be linked from the primary spec. Review high-risk boundaries, contracts and separate compatibility decisions explicitly.

## Codex skills

The checked-in `.agents/skills/speckit-*` skills become available when a Codex session discovers the project skills; open a new project chat if the current session predates installation. Invoke skills in the agent chat, not the terminal. Full work can use this sequence:

```text
$speckit-specify Describe the requested behavior and affected users
$speckit-plan State the actual Doca modules, packages and constraints
$speckit-tasks
$speckit-analyze
$speckit-implement
$speckit-converge
```

The constitution is already established. Clarify and checklist skills are optional when useful. Standard/light work may use the tiered records directly without running every full-workflow command. The upstream generic workflow remains installed with its review gates; the sequence above follows Doca's proportionate workflow and existing user authorization. Generic prompts do not grant compatibility decisions or authorize messaging, publication or deployment.

Select an existing feature explicitly when needed:

```sh
SPECIFY_FEATURE_DIRECTORY=specs/001-sdd-adoption bash .specify/scripts/bash/check-prerequisites.sh --json --require-spec --require-tasks --include-tasks
bash .specify/scripts/bash/resolve-template.sh spec-template
```

The feature pointer in `.specify/feature.json` is ignored checkout-local state. Do not share it as a branch or project baseline. Upstream scripts/templates stay unchanged; customize `templates/overrides/`. The checker verifies the bundled upstream hashes. The project templates are written for `specs/<number>-<name>/`; adjust their relative links if intentionally using another location.

## Status and evidence

| Status | Meaning |
| --- | --- |
| `draft` | Scope or decisions still being prepared |
| `accepted` | Scope agreed; any concrete compatibility approval is recorded separately |
| `implemented` | Scoped code/tasks complete; verification can still be pending or partial |
| `verified` | All acceptance IDs have recorded results within the stated verification scope |
| `superseded` | Historical record; point readers to its replacement |

Do not mark verified with unfinished tasks, unresolved acceptance or a pending/failed result. A historical verified spec does not revalidate current code. Current contracts remain the source for current behavior; label superseded designs and link replacements. Existing specifications, contracts and acceptance records retain their paths and dates. The module index is an entry point, not retrospective acceptance.

## Checks and PRs

`pnpm sdd:check` validates numbered spec directories, levels/statuses, required records, acceptance/task traceability, completed verification and installed upstream hashes. `pnpm test:sdd` covers positive and negative cases and isolated upstream script/template use. `pnpm docs:check` validates actual document and module-index links, including installed skills and project templates.

PR bodies declare these standalone lines, with real values:

```text
SDD-Level: full
SDD-Spec: specs/001-sdd-adoption/spec.md
```

Light changes use `SDD-Level: light` and `SDD-Spec: none`. All PRs fill the `Problem`, `Behavior`, `Impacts` and `Verification` sections. The SDD GitHub workflow checks PR metadata on opened, edited and synchronized requests, and checks repository records on main. It runs on `pull_request`, with read-only permissions and no secrets. It checks structure and references, not whether the declared risk, human agreement or test result is truthful. Maintainers review those claims. The workflow does not configure branch protection; requiring it for merges is a repository setting.

## Evaluate the first changes

For the next 3–5 real changes, add a brief observation to validation or the light PR: investigation effort, missing requirements caught in review, rework after implementation and record-maintenance cost. Use durations if measured; otherwise say not measured. Compare similar changes where possible, and adjust template depth based on the observed burden. Installing Spec Kit itself does not demonstrate improved defect rates or delivery speed.
