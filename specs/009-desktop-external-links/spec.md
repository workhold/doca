# Feature Specification: Open external links from the desktop shell

**Level**: standard
**Status**: implemented
**Created**: 2026-11-23
**Decision**: Deep web-vs-desktop parity testing (spec 010 shares the same verification run) found that every `target="_blank"` external anchor and `window.open` call silently did nothing in the desktop client: the tab shell delegates outside URLs to the WKWebView, and wry hosts no new-window handler, so `createWebViewWith` returns nil. The web client opens the same links in a new browser tab. Opening them in the system browser matches the desktop login flow (`open::that`) and requires no WebView popup support.

## Scope

Route outside URLs from workspace tab frames to a new authenticated proxy action `openExternal`, which validates the scheme and hands the URL to the OS opener. Covered surfaces: anchor clicks with `_blank`/Cmd/Ctrl, the per-frame `window.open` override, and all pages rendered inside desktop workspace frames (MCP client docs, plugin descriptions, knowledge-book web sources, canvas rich-text links, user profile links, sheet cell URLs). Unchanged: same-origin `#/` links keep opening new desktop tabs, `?download=1`/`/content` same-origin anchors keep the authenticated save-panel download path, plain same-origin navigation, and the browser client (web behavior is untouched).

Out of scope: non-http(s) custom scheme handlers beyond `mailto:`/`tel:`, changing the manager window (it has no workspace links), WebView2 popup handling on Windows beyond the shared shell change, and per-link referrer/opens-in-app policies.

## Acceptance

- **AC-001**: Clicking an external `target="_blank"` anchor in a desktop workspace frame opens the URL in the default system browser; before the change the click produced no effect.
- **AC-002**: `window.open` with an outside URL opens it in the system browser instead of delegating to an inert WebView popup.
- **AC-003**: Same-origin `#/` links still open new desktop tabs, and same-origin download anchors still run the existing save-panel flow without regressing.
- **AC-004**: The action accepts only `http`/`https`/`mailto`/`tel` URLs; other schemes are rejected at the proxy trust boundary.

## Design

`tab-shell.html` gains an `openExternalable(url)` helper (scheme whitelist plus a same-origin exclusion so in-page anchors are never hijacked). The frame click handler and the `window.open` override call the new `openExternal` action after the existing same-origin tab/download branches, with `preventDefault` so the WebView never attempts a popup. `proxy.rs` adds an `Action::OpenExternal { url }` variant handled directly inside `execute_action` (like `DownloadFile`, before the workspace dispatcher) behind the existing gate-cookie and Origin checks: parse the URL, reject non-whitelisted schemes, then `open::that(url)`. `lib.rs` keeps an unreachable dispatcher arm for the new variant. No web-client, API or persisted-format change.

## Tasks

- [x] T001 Add the `OpenExternal` action variant, scheme validation and OS open inside the proxy. (AC-002, AC-004)
- [x] T002 Route external anchors and `window.open` calls from the tab shell to the new action. (AC-001, AC-002, AC-003)
- [x] T003 Keep the workspace action dispatcher exhaustive for the new variant. (AC-002)

## Validation

**Result**: passed

- AC-001/AC-002: throwaway debug bundle (`artifacts/verification/desktop-parity/parity-config.json`) against the isolated host on port 39484; AXPress on the MCP page anchor `Codex 官方 MCP 接入文档` brought Chrome to the foreground with window title "Model Context Protocol | ChatGPT Learn"; before the fix the same press left the frontmost app unchanged.
- AC-003: same session re-verified the markdown export save panel and the Files-row `?download=1` save panel end-to-end (file saved, Finder reveal).
- AC-004: enforced by the scheme match in `execute_action`; the dispatcher arm is unreachable (same as `DownloadFile`).
- Commands: desktop unit tests (27 passed, including the stable-port suite), release of the throwaway bundle with the fix; run record in `artifacts/verification/desktop-parity/`.

## References

[Doca workflow](../../docs/sdd.md) · [Desktop tabs spec](../007-desktop-workspace-tabs/spec.md) · [Desktop client](../../docs/desktop-client.md)
