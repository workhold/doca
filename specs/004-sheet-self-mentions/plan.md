# Implementation Plan: Spreadsheet self mentions

**Spec**: [spec.md](spec.md)
**Date**: 2026-11-03

## Summary

Add `SpreadsheetEditor.currentUserId` and a transient runtime identity getter/refresh in the Sheet package. Adapt only the native document drawing of validated user ranges; never write styles to the document model. Doca passes `user?.id` in `spreadsheet-editor.tsx`; readonly/history/trash and template mounts subscribe to the existing current-user store.

## Technical Context

- Baseline: official `@smartdoca/sheet` 0.2.15 / Univer 0.25.1; clean source repository `/Users/zhangsiwen/dev/exlsx`.
- Persistence: unchanged; render-time glyph presentation is restored after native drawing.
- Checks: package TypeScript/build and relevant unit tests; actual isolated spreadsheet UI in grid/draft/readonly with identity switches and snapshot equality; host TypeScript, SDD and documentation checks.

## Constitution Check

Full level and acceptance recorded before implementation. Installed exports and package source inspected. No stored-format or compatibility change. Editor and collaboration skills applied; no collaboration behavior changed. Preserve unrelated changes and keep raw outputs under artifacts/.

## Decisions and boundaries

Native Canvas rendering belongs in the package rather than a host DOM overlay or whole-cell repaint. Identity changes must dirty views only, without editor recreation or commands. Native atomic nodes, clipboard, user-card events, resources and ordinary link styling retain their established paths. A separate data model or migration artifact is unnecessary because no stored fields change.

## Acceptance mapping

| Acceptance ID | Source or contract change | Verification |
| --- | --- | --- |
| AC-001 | Sheet native user mention rendering | Unit rendering checks and grid/draft screenshots |
| AC-002 | Sheet view identity refresh | Identity switches, readonly, snapshot/history/update checks |
| AC-003 | Doca prop and integration contract | Exact package artifact, host typecheck and docs/SDD checks |

## Validation and recovery

Use only synthetic workbook content. Compare model/Yjs entrypoint bytes to 0.2.15 and record publication versus local verification. Reverting view code and package pins removes the highlight; no data conversion or recovery operation is involved.
