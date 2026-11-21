# Validation: Desktop tabs and windows

**Spec**: [spec.md](spec.md)
**Result**: partial
**Run**: 2026-11-21, macOS 26.6.2, Node 24.15.0, pnpm 11.25.0, Cargo 1.100.0, Tauri 2.12.5

## Scope and executed checks

The user separately approved the compatibility decision in `spec.md` before implementation. This run used isolated session files under ignored `artifacts/verification/desktop-tabs/`, a mock loopback backend, and a separately identified macOS test bundle. It did not open user documents or change the real Doca app data directory.

| Check | Result |
| --- | --- |
| `cargo fmt --all -- --check` in `apps/desktop/src-tauri` | Passed after final Rust changes |
| `cargo test --lib` in `apps/desktop/src-tauri` | Passed: 13 tests, including session round trip, account scoping, unknown/corrupt file preservation on read and write, proxy action authorization, logout, bootstrap 401 and selected-host plugin asset forwarding |
| `node_modules/.bin/tauri build --bundles app` in `apps/desktop` | Passed: bundled Web build, connection manager build and macOS `Doca.app`; 77.96 MiB |
| `node_modules/.bin/tsc --noEmit` at repository root | Passed |
| `node scripts/docs-site.mjs check` | Passed: 471 repository documents and 2560 links checked |
| `node scripts/sdd-check.mjs` | Passed: seven change specifications checked |
| `pnpm run sdd:check` | Could not start the script: pnpm 11 requested a destructive `pnpm install --prod` modules purge and aborted without a TTY. The direct checker command above executed the same repository script without changing installed dependencies. |

An isolated browser mock of the tab shell exercised adding, selecting and closing tabs and reflected route/title changes from independent iframe pages. The tab strip's keyboard handlers and horizontal overflow styling were inspected in source, but those interactions were not exercised in a native window. The local Tauri runtime source confirms `close()` queues a `CloseRequested` event and `destroy()` skips it; programmatic backend switching uses `destroy()` so it cannot erase saved windows through the user-close handler.

## Acceptance results

| Acceptance ID | Evidence | Result and limit |
| --- | --- | --- |
| AC-001 | Tab-shell browser mock, source inspection, and the 2026-11-21 native follow-up run below | Add/select/close, route/title synchronization, strip layout, tab favicon, context-menu actions and new-window behavior were exercised in the native app. Keyboard and narrow-window overflow remain native-runtime checks. |
| AC-002 | Session round-trip test with two windows; Tauri window controller source | Separate window records are serialized. Native create/close interaction remains unverified. |
| AC-003 | Session round-trip, account lookup and invalid-file tests | Saved routes, order and active IDs round-trip. Native quit/relaunch restoration remains unverified. |
| AC-004 | Proxy logout and bootstrap-401 tests; account-scoped clearing test | Server events reach the native controller and clearing leaves another account intact. Native all-window sign-out remains unverified. |
| AC-005 | Selected-host forwarding test; source inspection of serialized switch and `destroy()` path | Proxy forwards only to its selected host with that bearer. Native multiwindow switch and failed-switch recovery remain unverified. |
| AC-006 | Web loader source audit; proxy plugin asset forwarding test | The desktop proxy forwards a versioned plugin bundle request with the selected host bearer; the Web loader validates plugin ID/version. No installed-plugin host was available for a live smoke test. |
| AC-007 | Session parser/writer tests and source inspection | Endpoint/account metadata, limits, restricted Unix file mode and preservation of unknown/corrupt versions were checked. Existing settings, vault IDs, WebView stores and `local-v1` are not written by the new session module. |

## 2026-11-21 tab-strip follow-up run

User feedback refined the strip: the new-tab button now sits directly after the tab list (native AX geometry: last tab ends at x=532, new-tab at x=573, new-window at x=1393, switch-backend at x=1429 in a 1280pt window), the new-window tool uses an overlapping-windows SVG with a `title`/`aria-label` tooltip, tab icons mirror the Web page favicon read from each page document, and right-clicking a tab title opens a menu with duplicate (same URL), open in a new window, close, close left, close right and close all. An initial build hid the menu because the document-level right-click closer ran after the tab handler; the tab handler now stops propagation.

Native verification on macOS with the rebuilt app: right-click showed all six menu items; pressing duplicate inserted a same-URL tab after the source tab; close-right reduced three tabs to two; close-left reduced two to one; open-in-new-window created a second workspace window showing the same document; close-all on that window closed the window and returned to the first. `cargo test --locked` passed 13 tests, and `tauri build --bundles app --no-sign --ci` completed at 77.95 MiB. Tab titles/order/active state continued to round-trip through the existing session file without format changes. The tooltip hover appearance and the per-page favicon rendering were source-audited and shown as correct accessible names, but the hover popup itself was not screenshot-verified. Each local rebuild required one fresh Keychain allowance for the credential read (unsigned-build identity), unrelated to the tab strip.

## 2026-11-21 multi-backend and drag follow-up run

The user extended the design on 2026-11-21: each workspace window binds to one backend account and several backends run at once, and tab dragging stays inside a single window. The runtime now keeps one proxy per connected endpoint (`AppState.proxy` list); opening a backend starts its proxy and windows without touching other backends, re-opening the same endpoint/account reuses its running proxy, and sign-out, expiry, and endpoint removal close only the affected scope's windows. `profiles.json` v1 is unchanged (`active` records the most recently opened endpoint as the manager default), the session file already scoped windows by endpoint/account, and no migration is involved.

Tab dragging was rebuilt on normal flow layout: the dragged tab follows the cursor through a requestAnimationFrame transform, at most one neighbour slides aside with a CSS transition, release snaps the tab into its slot and commits one `reorderTab` action that bypasses the busy guard (an in-flight title update previously swallowed it). Right-click text selection in the strip is disabled and cleared when the menu opens.

Native macOS verification on the rebuilt app: drag from the second slot to the first reordered `[我是谁, 未命名]` into `[未命名, 我是谁]` and the session file updated immediately; clicking a tab selected it; ⌘T inserted a new home tab after the active tab with all slots laid out without overlap; right-click still shows the six-item menu. An intermediate absolute-slot layout caused mispositioned tabs and was replaced by the flow layout above. `cargo test --locked` passed 13 tests, `cargo fmt --check`, `tsc --noEmit`, `node scripts/sdd-check.mjs` and `git diff --check` passed. Two-backend simultaneous operation is covered by the scoped proxy/unit design but was not exercised end-to-end: it needs a second live endpoint with a browser login, which was not available in this run.

## Follow-up display and title fixes

User feedback after the multi-backend build: stacked fallback icons when a page favicon loaded (the icon update inserted the image without replacing the placeholder), position flip-flopping when the pointer rested near a slot midpoint during drags, and workspace window titles that did not identify the backend. Fixes: the favicon update now replaces the placeholder badge, slot changes use a 12 px dead zone with the release-nudge animating back, and each workspace window title is `"<endpoint name> · <origin>"` (resolved at window creation for restores, re-opens, and new windows). Native verification: relaunch after conversion showed no Keychain prompt, both restored windows titled `本机 Doca · http://127.0.0.1:39270`, credential files present with owner-only permissions, and dragging the third tab to the front shifted the following tab accordingly. The drag-follow feel (horizontal-only tracking) needs a final visual pass by the user.

## Drag-model alignment follow-up

The first smooth-drag attempt still felt wrong: the neighbour slide picked the wrong tab for rightward drags, the reset snapped instead of animating, and the dragged tab lagged one pointer event behind. The model now matches Chrome exactly: the dragged tab tracks the cursor through a requestAnimationFrame transform with no dead zone, crossing a tab midpoint immediately slides that neighbour aside with a 150 ms transition in the correct direction, and release snaps the tab into the projected slot before committing a single `reorderTab`. Native verification: dragging the first tab right moved it to the third slot, dragging it back left restored the original order, and both directions updated the session file. Relaunch after the credential conversion again showed zero Keychain prompts with both windows restored under their backend titles.

## Native smoke-test limit

A separately identified macOS app and disposable keychain account were prepared for window/restart/logout testing. The native manager opened, but `get_profiles` waited at a macOS Keychain access prompt. Computer automation could not operate the system SecurityAgent dialog, so no native workspace was opened and no end-to-end restoration, switch or sign-out result is claimed. The disposable keychain item, test app data and test processes were removed. The preexisting real Doca app and its data were not touched. Windows/Linux builds and behavior were not tested.

## Review observation

The full record exposed a persistence risk during review: Tauri's queued `close()` event could remove the saved page list after a backend switch. The implementation was changed to `destroy()` for programmatic window teardown. Investigation and record-maintenance durations were not measured. The remaining verification cost is a native run with an interactive test keychain and representative installed plugin host.

## Contracts and compatibility

The current desktop contract is [docs/desktop-client.md](../../docs/desktop-client.md), with the separately approved compatibility decision in `spec.md`. This is an implemented working-tree result, not a released or deployed claim.

## 2026-11-21 application icon alignment

The desktop application previously used a plain blue placeholder icon. `apps/desktop/src-tauri/icons/icon.svg` is now byte-identical to `apps/web/public/favicon.svg`; the desktop icon set is generated from a 1024-pixel render at `icons/icon-source.png`. The macOS app bundle was rebuilt with `tauri build --bundles app --no-sign --ci`, its bundled `Contents/Resources/icon.icns` was extracted through `iconutil` and included a 1024-pixel representation; the rendered 512-pixel image showed the Web blue book mark. This verifies the packaged source for the application icon; macOS Dock caching and signed distribution were not separately verified.

## 2026-11-21 release installers run

The v0.2.37 desktop-release workflow produced the tabbed-workspace installers for release: universal macOS `Doca_0.2.37_universal.dmg`, Windows NSIS `Doca_0.2.37_x64-setup.exe` and `Doca_0.2.37_x64_en-US.msi`, attached to the GitHub release with checksums (run and hashes in [docs/verification/release-0.2.37.md](../../docs/verification/release-0.2.37.md)). Windows tab behavior now ships but has not been executed on Windows hardware; signing/notarization remain release follow-ups.
