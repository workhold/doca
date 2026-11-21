# Implementation Plan: Desktop tabs and windows

**Spec**: [spec.md](spec.md)
**Date**: 2026-11-21

## Summary

Extend the Tauri 2 desktop shell with a lightweight same-origin tab strip per workspace window. Each tab runs the packaged Doca Web app in its own page context through the existing authenticated loopback proxy. Keep one selected backend and one proxy at a time; open as many desktop windows as the bounded session allows. Persist only the active endpoint/account's window and tab metadata in a new, separate versioned file.

## Technical context

- Current desktop 0.1.0: one `workspace` WebView, one loopback proxy, `profiles.json` v1, OS-vault bearer and endpoint/account WebView store.
- Web app: hash routing, shared authenticated bootstrap, plugin bundle imports from `/api/v1/plugin-assets`, collaboration WebSocket and document autosave.
- Plugin execution: installed server packages run remotely. The bundled Web loader validates declared bundle path and manifest version; `host.native` is null in desktop Web views.
- Persistence: the new `workspace-session.json` v1 is separate. The existing endpoint settings and trial local data are retained under the user's separately approved compatibility decision.
- Checks: isolated Rust session/proxy tests, Web build and typecheck, tab shell interaction, `pnpm sdd:check`, and a native macOS run. Windows/Linux remain separately reported.

## Constitution check

- Full level applies because window-session persistence and the desktop shell boundary change.
- AC-001 through AC-007 connect source work to validation.
- The user separately approved the exact compatibility plan in `spec.md` before implementation.
- Existing desktop/plugin contracts and package exports were inspected; no plugin SDK change is proposed.
- Preserve unrelated working-tree changes and keep generated output under `artifacts/`.

## Decisions and boundaries

1. Use a tab shell in each workspace window, with separate same-origin page contexts for tabs. Give the workspace no Tauri IPC permission; use narrowly scoped local proxy actions protected by its existing random capability, Host and Origin checks.
2. Route page title/hash updates and tab/window actions through one serialized native session controller. Bound window/tab counts and route lengths. Save a valid session atomically after navigation and structural changes.
3. Keep session records per endpoint/account. On backend switch, close all old windows and proxy, then restore the selected backend's own records. On sign-out, revoke the desktop token, close all affected windows and clear only that endpoint/account's page records.
4. Restore only local in-app hash routes. A missing route renders the existing Web unavailable state in its tab; no automatic host/path conversion.
5. Keep plugin bundle loading in the existing Web app and proxy. Verify an installed plugin if an isolated test host is available; source audit alone is reported as source audit.
6. Update `docs/desktop-client.md` and `docs/sdd-module-index.md` to distinguish implemented behavior from proposed behavior until checks pass.

## Acceptance mapping

| Acceptance ID | Source or contract change | Verification |
| --- | --- | --- |
| AC-001, AC-002 | Tauri window controller, tab shell, loopback actions | Tab/window interaction and keyboard checks |
| AC-003, AC-007 | Separate session parser/writer and lifecycle | Round-trip, bad-format preservation and relaunch checks |
| AC-004, AC-005 | Proxy logout signal and connection manager operations | Multiwindow sign-out/switch tests |
| AC-006 | Existing Web plugin loader/proxy; desktop contract | Plugin route/source audit and isolated installed-plugin smoke test if available |

## Validation and recovery

Use isolated app data directories and test hosts. Record exact commands, versions, results and skipped platform/plugin checks in `validation.md`. Preserve unreadable session bytes; recovery changes only the new session file, never endpoint settings or credentials. Do not run collaboration editing tests on user documents.

## References

[Doca workflow](../../docs/sdd.md) · [Module index](../../docs/sdd-module-index.md)
