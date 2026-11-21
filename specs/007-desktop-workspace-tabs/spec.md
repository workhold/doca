# Feature Specification: Desktop tabs and windows

**Level**: full
**Status**: implemented
**Created**: 2026-11-21
**Decision**: The user requested browser-like tabs and windows, restoration of all open pages on relaunch, and desktop-wide sign-out/backend switching. The user explicitly agreed to the separate persisted-session compatibility proposal on 2026-11-21.

## Scope

The unreleased Tauri 2 desktop client (`apps/desktop` 0.1.0) currently opens one `workspace` WebView for one selected backend. It packages the Web frontend; the remote host runs business plugins and serves their Web bundles through `/api/v1/plugin-assets`. Add multiple independent Doca pages per window and multiple workspace windows. On 2026-11-21 the user extended the request: each window binds to one backend account, and windows for **different backends can be open at the same time**. The runtime keeps one proxy per connected endpoint; stored formats do not change. Restore their pages and active tabs after an ordinary application restart. Keep the existing remote-only transport and plugin model.

The current `profiles.json` version 1 stores endpoints and one active endpoint; OS credential vault entries are keyed by endpoint, and WebView stores are keyed by endpoint/account. A prior unreleased `local-v1` profile remains untouched. This change does not alter host database tables, plugin SDK exports, plugin installation, or local profile data.

## User scenarios and testing

1. Given a signed-in desktop workspace, the user creates tabs, navigates each to a different Doca route, switches between them, closes one, and creates another window. Each tab retains its own page state while open.
2. Given multiple windows and tabs, the user quits and relaunches Doca. The selected endpoint/account's open windows, tab routes, order and active tabs return. A closed tab or window does not return.
3. Given multiple pages, the user signs out from any page or the connection manager. All pages for that desktop session close, its saved page list is cleared, and the credential is revoked. Another user's pages do not reappear after login.
4. Given multiple pages, the user selects a different backend in the connection manager. All pages and windows for the previous backend close before the new backend's own saved pages open. No old route, bearer, draft or WebView data crosses to the new backend.
5. Given a server-installed Web plugin, the desktop loads the matching plugin bundle from that backend in any tab, with the existing Web host interface. Desktop-specific native plugin capabilities are not added.

## Acceptance

- **AC-001**: Each workspace window has a usable tab strip. The new-tab button sits directly after the tab list, and the new-window tool has a text tooltip and a clear overlapping-windows icon. Add, select and close tabs without replacing another tab's page. Tab order, current route and title stay current as navigation occurs. Right-clicking a tab title opens a context menu with duplicate (same URL in a new tab), open in a new window, close, close tabs to the left, close tabs to the right and close all tabs, and never selects the tab text. Dragging a tab reorders it within its own strip with a cursor-following animation; the user chose on 2026-11-21 to keep dragging inside a single window (no cross-window or tear-off drag). When several windows share one backend, they refresh tab state through the local proxy event stream. Keyboard focus and narrow-window overflow remain usable.
- **AC-002**: Users can open and close multiple workspace windows. Each window owns its own tab list and active tab; closing a window does not close other windows.
- **AC-003**: Relaunch restores every previously open window and tab for the selected endpoint/account, including route, order and active tab. Closed tabs/windows stay closed; invalid or unavailable routes fail within their tab without losing the session list.
- **AC-004**: Sign-out from either the Web page or the connection manager revokes the desktop credential, closes every affected workspace window, and clears its restorable pages. Other endpoints' saved sessions remain separate. A remote 401 or account change cannot restore another account's pages.
- **AC-005**: Opening another backend starts its own proxy and opens only that backend's saved windows; windows of other backends stay open and no URL or credential crosses between backends. Re-opening the same backend account reuses its running proxy and focuses its windows. A failed open retains saved entries, credentials, and the other backends' windows.
- **AC-006**: Plugin execution remains remote-host-owned. The packaged Web app loads the current backend's declared `/api/v1/plugin-assets/{id}/{version}/` bundle through the authenticated proxy in each tab; matching manifest/version checks and current Web host APIs remain in force. No desktop-local plugin install or native bridge is introduced.
- **AC-007**: New session data is endpoint/account scoped, contains only window/tab metadata and in-app routes, is written atomically with restricted permissions, and does not modify `profiles.json` v1, vault IDs, WebView stores or `local-v1`. Unknown/corrupt session versions are preserved and rejected without overwrite.

## Architecture and contracts

Current source: [desktop shell](../../apps/desktop/src-tauri/src/lib.rs), [loopback proxy](../../apps/desktop/src-tauri/src/proxy.rs), [settings](../../apps/desktop/src-tauri/src/settings.rs), [Web plugin loader](../../apps/web/src/plugins/load.ts), [desktop contract](../../docs/desktop-client.md), [plugin SDK contract](../../docs/plugin-sdk-contract.md). The shell/transport design and actual plugin behavior are described in [plan.md](plan.md). Update the desktop contract and module index in the same change. The plugin SDK contract needs no change because its public interface is unchanged.

## Compatibility decision

**Approved separately by the user's explicit reply on 2026-11-21.** The decision affects the unreleased desktop 0.1.0 `profiles.json` v1, endpoint-keyed vault entries, endpoint/account WebView stores, ignored `local-v1` data, and introduces `workspace-session.json` v1. There is no older workspace-session format.

- **Retain** `profiles.json` v1 and its `active: "local"` sentinel, existing endpoint/account IDs and vault entries, and existing WebView store directories/identifiers. Do not rewrite settings simply by starting the app.
- **Retain untouched** every `local-v1` file, including SQLite/WAL, credentials and plugins; do not open, migrate or delete it.
- **Introduce** a separate versioned session file containing only endpoint ID, account ID, window IDs, ordered tab IDs, in-app hash routes/titles and active tab IDs. Do not store bearer tokens, document bodies, form contents or plugin data. Restrict the accepted routes to same-origin Doca `#/...` paths.
- **Reject** unknown/corrupt session versions while preserving the original bytes. Do not fabricate old tabs or silently reset the file. An absent file starts with one home tab after opening a backend. A matching endpoint/account restores its own saved windows; a mismatched account is never restored.
- **Clear** only the affected endpoint/account's saved page metadata on explicit sign-out or endpoint removal. Switching backends retains each backend's own page metadata, and never converts old routes into the new backend's routes.
- **Runtime multi-backend note (user request, 2026-11-21)**: several endpoint proxies may run at once so windows can bind to different backends. `profiles.json` v1 keeps its format; `active` records the most recently opened endpoint as the manager default. The session file already scopes windows by endpoint/account, so no migration or new format is introduced. Sign-out, expiry, revocation, and endpoint removal close only the affected endpoint's windows and stop only its proxy.
- **Validate** with isolated v1 settings/vault fixtures, an absent/unknown/corrupt session file, multiple windows/tabs, restart, sign-out and backend switching. Recovery for an unreadable new session is to preserve a copy and explicitly remove that session file; endpoint settings, credentials and user data remain intact. Reverting to the prior desktop build leaves the separate session file ignored.

## Design and work

See [plan.md](plan.md), [tasks.md](tasks.md) and [validation.md](validation.md).

## References

[Doca workflow](../../docs/sdd.md) · [Module index](../../docs/sdd-module-index.md) · [Repository rules](../../AGENTS.md)
