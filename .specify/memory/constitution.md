# Doca Constitution

**Version**: 1.0.0 | **Ratified**: 2026-11-01 | **Last Amended**: 2026-11-01

## I. Scoped specification before implementation

Apply [Doca's tiered SDD workflow](../../docs/sdd.md) across applications, packages, scripts, tests and documentation. Classify semantic impact before implementation. Full changes record spec, plan, tasks and validation; standard changes may use one spec; light changes use the PR record. Connect acceptance IDs, tasks and verification. Update scope before expanding implementation. Preserve historical records and reference module baselines instead of inventing retrospective acceptance.

## II. Current contracts and honest status

Current behavior is described by existing contracts, implementation inventories and applicable release notes. A proposal is not an exported API; a target invariant is not proof of package support. Specs record change intent and decisions and update affected authoritative documentation in the same PR. Declare draft, accepted, implemented, verified or superseded status with its actual scope. Structural checks do not prove runtime behavior, deployment or external-provider quality.

## III. Prior agreement for compatibility and data preservation

Follow [AGENTS.md](../../AGENTS.md). Before introducing, retaining as part of a redesign or changing compatibility behavior, identify affected versions, code paths and stored formats and obtain explicit agreement on preservation, validation and recovery. General feature authorization, accepted specs or checked tasks do not replace that agreement. Do not invent historical defaults, migrations, adapters or automatic conversions, or delete/reset data to bypass review. Database evolution follows [the existing upgrade contract](../../docs/database-schema-evolution.md), including current target DDL, declared additions, transactional reconciliation and isolated old-version verification.

## IV. Host authority and verified integration boundaries

Authentication, authorization, security audit and original AI usage facts stay host-owned. Plugin work follows the [public SDK contract](../../docs/plugin-sdk-contract.md) and [development guide](../../docs/plugin-development.md). Collaboration/editor/i18n work reads the applicable repository skill and source contract identified in AGENTS.md. Check actual package versions and exports before adapting. Do not expand permissions or treat UI/model input as authorization.

## V. Reproducible, bounded verification

Use relevant tests and isolated databases/documents; never run collaboration editing tests on user documents. Record commands, versions, outcomes, skipped scope and limitations. Raw screenshots, JSON, exports and logs belong in ignored artifacts/; reusable inputs in tests/fixtures/; reviewed summaries in docs/verification/. Preserve credentials and unrelated working changes. Do not claim tests, saves, deployment or synchronization without successful evidence.

## VI. Proportionate process and continued authorization

Keep small changes small. Cite current contracts rather than duplicate them; create research, models or additional contract files only when the affected scope needs them. Work within the user's established authorization without repeated routine confirmation. Concrete compatibility decisions still require separate explicit agreement. The first 3–5 real changes evaluate investigation effort, omissions, rework and documentation cost; no long-term benefit is claimed by installing the tooling alone.

## Governance

This constitution complements repository AGENTS.md and existing technical contracts. User instructions and repository-specific rules take precedence over generic upstream templates. Changes to these principles state their reason and update this version and the workflow together. This adoption changes development process only; it grants no application compatibility, data conversion or deployment approval.
