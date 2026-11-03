# Validation: Spreadsheet self mentions

**Spec**: [spec.md](spec.md)
**Result**: passed

## Scope

2026-11-03; Doca base `20201bd126162c0b4b0b11e26b9cfce81ee44190` and Sheet 0.2.15 source baseline. Final Sheet 0.2.17 source commit `2fa1260` (initial view API in 0.2.16 commit `ccfc3dc`). Synthetic data only.

## Acceptance results

| Acceptance ID | Command or observation | Result and limits |
| --- | --- | --- |
| AC-001 | Package TypeScript, five-entry build, 17 targeted unit tests; actual built UI in grid, formula bar and draft | Passed locally. Self is blue/white, other users are blue, mentions have no underline, ordinary links retain it. Three final capsule-background fresh-browser screenshot checks pass, including cell draft and 200%. |
| AC-002 | Actual built UI: user switches, identity clear, draft cancellation and readonly; session counter and full native snapshot | Passed locally. Final 0.2.17 at 1131838 ms: same snapshot after identity switches/clear, ready count 1, zero local shared writes, no undo/redo after cancelling draft. Eight model/Yjs/XLSX/preferences JS runtimes are byte-identical to 0.2.15. |
| AC-003 | Official npm 0.2.17 installation; registry SHA-512/SHA-1 and all 84 installed files; `pnpm typecheck`, documentation/SDD checks and package-source check | Passed. Root manifest/lock use exact official 0.2.17. Active, readonly/history/trash and template mounts pass viewer identity. Local candidate and final installed-package type checks pass. |

## Evidence and exclusions

Raw evidence: `artifacts/verification/sheet-self-mentions/` in Doca and `artifacts/verification/self-mentions/` in the Sheet source workspace. No production document/database is used; no Doca deployment is claimed. Broad collaboration operations and Safari/Firefox were not rerun: no content or transport behavior changes. The development fixture emitted duplicate React-root warnings during hot reload before final verification; all three final fresh-browser screenshot checks report no console errors.

Investigation identified native Canvas rendering as the missing path. Investigation and record-maintenance duration were not measured; no long-term process benefit is claimed.

## Contracts and compatibility

No stored-format or compatibility behavior change. English/Chinese editor integration docs and repository/installed skill copies are updated. Official npm 0.2.17 is installed and all 84 files match the archive whose SHA-512 and SHA-1 match the registry. Source PRs [21](https://github.com/smartdoca/sheet/pull/21) and [22](https://github.com/smartdoca/sheet/pull/22) are merged. No Doca Docker/GitHub release or production deployment is included in this follow-up.

## Installation and final checks

Initial normal/prefer-offline installs and duplicate CLI checks encountered registry connection resets and slow downloads and were stopped. The scoped lockfile update changes only the Sheet version and its official registry integrity; dependency and peer edges are unchanged. The complete existing supply-chain verification passed for 2059 entries. A cache import used exact bytes matching the published registry identity; offline installation still correctly refused a missing registry tarball. Final normal registry installation with the frozen lockfile downloaded that tarball and passed in 44.4 seconds. No integrity or policy check was disabled. Raw attempts remain in artifacts/.

Final commands: Sheet `npm run build`, the four targeted Vitest files (17 tests), Doca `pnpm typecheck`, `pnpm docs:check`, `pnpm sdd:check`, `node scripts/verify-editor-package-sources.mjs`, and `git diff --check`. Host production build and broad collaboration operation tests were not required or run for this view-only rendering change.
