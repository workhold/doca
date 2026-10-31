# Implementation Plan: [FEATURE]

**Spec**: [Replace with relative link to this feature's spec.md]
**Date**: [DATE]

## Summary

[Scope, affected real source paths, baseline package versions and chosen approach]

## Technical Context

- Existing monorepo: apps/server, apps/web, apps/mobile, apps/browser-extension and packages.
- Runtime: use package.json and pnpm-lock.yaml as the version source.
- Persistence: [Affected structure/formats or not applicable with reason]
- Checks: [Relevant reusable tests, real integration requirements and isolated inputs]

## Constitution Check

- Risk level and acceptance IDs are recorded before implementation.
- Current contracts and actual exports have been checked; proposals are labelled.
- Compatibility impact: [None with reason, or actual versions/formats and explicit separate agreement]
- Apply relevant repository skills when triggered by the change.
- Preserve existing data, credentials and unrelated work; outputs go under artifacts/.

## Decisions and boundaries

[Design, rejected alternatives, error/cancellation/concurrency/permission boundaries, affected authoritative sections and same-PR updates. Add research.md, data-model.md or contracts only if needed; explain non-applicable phases briefly here.]

## Acceptance mapping

| Acceptance ID | Source or contract change | Verification |
| --- | --- | --- |
| AC-001 | [Path and behavior] | [Check and boundary] |

## Validation and recovery

[Checks against isolated fixtures, relevant versions, skipped scope, raw artifact directory and recovery plan. Application downgrade or data conversion needs explicit prior agreement.]

## References

[Doca workflow](https://github.com/workhold/doca/blob/main/docs/sdd.md) · [Module index](https://github.com/workhold/doca/blob/main/docs/sdd-module-index.md)
