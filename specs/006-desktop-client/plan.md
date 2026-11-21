# Implementation Plan: remote-only Tauri desktop client

**Spec**: [spec.md](spec.md)
**Date**: 2026-11-20
**Compatibility decision**: The user explicitly approved the remote-only revision and preservation policy in `spec.md` after the measured 612 MiB macOS package.

## Summary

Package the Doca Web build and a small Tauri 2 connection manager. The native loopback transport serves packaged Web assets and forwards `/api/v1/` HTTP/WebSocket traffic to the selected remote Doca service, injecting a host-scoped desktop credential held in the OS vault. Login starts in the system browser and completes with a state/PKCE-bound one-time deep link. No Node sidecar, SQLite runtime or local business host is packaged.

## Technical context and boundaries

- Current Web frontend uses same-origin `/api/v1` requests, plugin assets, SSE and `/api/v1/ws`; remote public links and pending-draft identity must use the selected service origin rather than the loopback port.
- Current Web/mobile sessions expire. New desktop credentials use separate hashed records and host authorization, with explicit revocation and no old-token conversion.
- Two empty desktop tables are declared in current DDL and `schemaEvolution`; the compatibility generation remains unchanged. Follow [database evolution](../../docs/database-schema-evolution.md).
- The prior trial package's `local-v1` directory is retained on disk but ignored. Keep private endpoint settings version 1: `active: "local"` means no remote selected, and endpoint/vault IDs stay stable. No format conversion, data copy or cleanup is introduced.
- The workspace WebView has no Tauri IPC capability. The manager alone may call native commands. Separate WebView data stores by endpoint and account. The proxy requires a random HttpOnly cookie and matching Host/Origin, strips upstream `Set-Cookie`, and never follows an upstream redirect while holding a token.
- The manager uses the existing Doca Web theme tokens and book mark, with narrow-window and keyboard checks.

## Decisions

1. **Build**: `beforeBuildCommand` builds the Web frontend and manager. Tauri bundles `apps/web/dist` directly. Remove the runtime deployment script, Node executable, native SQLite binding, server dependency tree and canvas-render bundle from the desktop package. The remote server remains a separately deployed Doca host.
2. **Settings**: Preserve v1 `profiles.json`. Retain `active: "local"` as the existing no-selection sentinel without rewriting stored files. Adding, renaming, selecting or removing a remote entry uses the same validated v1 format. Reject unknown versions and malformed origins before changing the file. Preserve existing OS-vault tokens and account-scoped WebView stores.
3. **Handoff**: Keep the approved start/approve/exchange/revoke protocol and `doca://auth/complete` deep link. The browser approves only from an active website session. The host consumes the bound code atomically and issues a distinct desktop credential. Browser/mobile sessions retain their old rules.
4. **Transport**: Serve `/`, `/favicon.svg`, `/assets/*` and the permitted CAD files from the packaged Web build, rejecting path traversal. Forward only `/api/v1/` HTTP and WebSocket paths to the selected origin. Preserve streaming and plugin assets. Set the remote origin in bootstrap headers so share links and draft identity use the actual backend.
5. **Switching**: Close the previous workspace/proxy before opening the selected endpoint. A failed endpoint does not delete its credential or any other profile's data. Explicit sign-out revokes the host credential before removing its local vault entry. An unreachable host keeps the credential for a later retry.
6. **Preservation**: Remove local-host admission and local-only Web affordances from the new source, but never delete `local-v1` files. They remain recoverable with the matching older trial build. No migration to a remote host or reintroduction fallback is provided.
7. **Platform reporting**: Build on macOS in the available environment; report Windows/Linux as unverified until built and exercised there. Validate server schema on isolated SQLite/PostgreSQL and never edit user documents in collaboration tests.
8. **Desktop UI follow-up**: Pass the clicked creation trigger to the popover instead of inferring it from focus. Show a translated switch-backend button in the workspace's native tab strip (final placement chosen by the user on 2026-11-21; the interim sidebar-footer entry was removed). Keep the settings-page header entry, where the workspace tab strip is absent. Its same-origin POST reaches only a capability-gated loopback control route; the route signals Tauri to focus the existing manager window and never exposes the credential or native IPC to Web content. A credential fix makes macOS Keychain checks attribute-only so endpoint listing and startup probing never read the stored secret.

## Acceptance mapping

| Acceptance | Source | Verification |
| --- | --- | --- |
| AC-001, AC-009 | Tauri bundle config and native proxy | Package contents, size, bundled Web loading |
| AC-002, AC-004 | Host routes, Web approval, native deep link | Isolated auth, replay/revocation and native return checks |
| AC-003, AC-006 | Native settings, vault, WebView stores | Invalid settings, retained v1/local data, host selection |
| AC-005 | Core DDL and types | Released-version SQLite/PostgreSQL upgrade and rejection |
| AC-007, AC-008 | Native app/proxy | Platform matrix, HTTP/WS gate and mode switching |
| AC-010 | Manager React/CSS | Native narrow-window and keyboard visual inspection |
| AC-011 | Web creation trigger and popover | Native sidebar/list/library/import placement and keyboard inspection |
| AC-012 | Web tab strip/settings header, native proxy and manager focus | Origin/capability rejection tests and native switch control inspection |

## Validation and recovery

Run `pnpm sdd:check` and applicable type, build, focused auth/schema/proxy, docs and native checks. Record exact commands, versions, outcomes and unavailable platform tests in `validation.md`. Generated screenshots and logs belong under `artifacts/verification/desktop-client/`. Package signing, notarization and distribution are separate release actions. Preserve host databases and desktop credentials if an older host cannot read the new tables; preserve `local-v1` for the matching earlier trial app.

## References

[Doca workflow](../../docs/sdd.md) · [Module index](../../docs/sdd-module-index.md)
