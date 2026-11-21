# Validation: remote-only Tauri desktop client

**Spec**: [spec.md](spec.md)  
**Result**: partial

Locally verified on macOS arm64; platform release checks remain.

## Run and environment

The final checks ran on 2026-11-21 with macOS 26.6.2 arm64, Node 24.15.0, Rust 1.100.0, Tauri 2.12.5 and Vite 8.2.2. The isolated host reported Doca 0.2.36. No installer was signed, notarized or distributed. The first live test used only the ignored `artifacts/verification/desktop-client/live-remote-20261120/` database and documents. The later desktop UI follow-up used a new, separate local backend data directory at ignored `data/desktop-local-backend/`; the previous `data/v1` directory was untouched. No production database was used.

`node_modules/.bin/tauri build --bundles app --no-sign --ci` completed. The initial remote-only macOS `.app` measured **77.46 MiB** (about 79 MiB by `du`), versus approximately 612 MiB for the earlier local-host trial package. Its resources include about 63 MiB of packaged Web files and a roughly 16 MiB native executable. Inspection found no Node executable, server dependency tree, SQLite binding or local-host resource. The initial rebuild log is at `artifacts/verification/desktop-client/live-remote-20261120/rebuild.log`. The UI follow-up rebuild measured **77.53 MiB** and its log is at `artifacts/verification/desktop-client/ui-followup-build.log`.

An isolated SQLite host was bootstrapped and started at `http://127.0.0.1:39270`; `/ready` returned 200 and the Web home returned HTML. The packaged desktop app added this address, opened the system browser, completed website login and one-time `doca://` return, then loaded the packaged Web workspace through its loopback proxy. The app created a rich-text document, changed its title and body, showed one realtime participant, returned to the document list and reopened the saved body. Closing the workspace and pressing **Open** reused its OS-vault credential without a new browser login. Explicit sign-out changed the manager to **Not signed in**; the isolated host had one desktop session and one revoked session. A discovered native `prompt`/`confirm` failure in the manager was replaced by inline rename and remove controls, rebuilt, and both controls passed in the packaged app. The test endpoint was removed; the desktop v1 settings ended with `active: "local"` and no endpoints. The one-time browser tab was closed and the isolated host stopped. The test database remains only in ignored artifacts for review.

For the requested ongoing local service, a separate Doca host was started on `127.0.0.1:39270` from `data/desktop-local-backend/` through the per-user LaunchAgent `com.smartdoca.desktop-local-backend`. Its SQLite, storage, plugin data and credentials are independent of `data/v1`; sensitive files have owner-only permissions. The app saved **本机 Doca**, completed the browser handoff and loaded its workspace. After restarting the service, the workspace reopened with the saved OS-vault credential. This service runs outside the desktop package and remained running after verification.

Before the UI change, clicking the desktop sidebar **创作** button displayed its type menu at the bottom-left of the window because the anchor was inferred from keyboard focus. After rebuilding, the menu appeared directly below that button. The other document, library, list and import entry points were source-checked to pass their clicked element as the anchor. The rebuilt workspace displayed **切换后端** in the top header; clicking it focused the native connection manager showing the saved **本机 Doca** endpoint. The workspace remained available. The private POST route returned 204 with the local capability and Origin; a Rust test rejected absent capability and wrong Origin. The Web control is gated by the desktop bootstrap origin and the workspace still has no Tauri IPC permission.

## Acceptance results

| ID | Evidence | Limit |
| --- | --- | --- |
| AC-001, AC-009 | Final macOS `.app` build and resource/size inspection; live workspace used packaged Web UI | Windows/Linux packages not built |
| AC-002 | Isolated system-browser login and `doca://` return succeeded; `tests/desktop-auth.test.ts` covers mismatch, replay, expiry and account status | No external HTTPS host tested |
| AC-003 | Live add, rename, select, credential reuse, sign-out and remove passed; Rust settings tests cover strict origins and v1 round-trip | More than one live remote host/account was not exercised |
| AC-004 | Focused server tests cover credential lifetime, HTTP/WebSocket authentication and revocation; live sign-out left the isolated session revoked | No long-duration wall-clock test |
| AC-005 | `desktop-release-upgrade.mjs` passed released-v0.2.36 SQLite retained-row, repeat-startup and no-partial-write rejection checks | PostgreSQL 17/18 rerun stopped because the local Docker daemon was unavailable; the referenced earlier task reported passing PG17/18 on its prior source state |
| AC-006 | Native code no longer references `local-v1` or starts a local host; Rust test reads `active: "local"` without rewriting v1 bytes and rejects unknown versions | No existing real trial local profile was present for a byte-level before/after check |
| AC-007 | macOS 26.6.2 arm64 build, browser return, realtime edit and credential reuse observed | Windows/Linux native runs, network loss and disabled-user UI flow remain unverified |
| AC-008 | Five Rust tests passed, including bundled static assets, path allowlist and selected-host bearer forwarding without WebView cookies or upstream `Set-Cookie`; live workspace and WebSocket editing worked | Installed plugin assets and streaming AI were source-audited but not exercised against a live plugin/provider |
| AC-010 | The manager and workspace were visually inspected in the native narrow and full-size windows; inline controls, labels and fields were accessible and usable | Other OS rendering remains unverified |
| AC-011 | Native sidebar before/after placement inspection; source audit of list, library and import trigger propagation | Other entry points and keyboard navigation were not separately exercised in the native app |
| AC-012 | Native tab-strip control focused the existing manager; Rust test covered capability and exact-Origin rejection; browser gating source-audited | Settings-page header entry was source-audited but not separately exercised in the rebuilt app |

## 2026-11-21 control placement and credential prompt follow-up

The user first asked for the workspace switch-backend control in the left-navigation footer, then chose the native tab strip as the final placement and asked to remove the sidebar footer entry. The same follow-up fixed a repeated macOS Keychain authorization prompt: `has_token` now performs an attribute-only Keychain query on macOS, so manager listing and startup restore probing never read the stored secret; the secret is still read when opening a workspace, revoking, or signing out. Credential storage remains the OS vault with unchanged entries and no settings-format change.

The rebuilt macOS app (unsigned local build, 77.95 MiB) was inspected natively: the workspace shows **切换后端** only in the tab strip (one occurrence per window), the sidebar footer and workspace topbar have no switch entry, and clicking it focuses the connection manager. `cargo test --locked` passed 13 tests, `tsc --noEmit` and the Web build passed, `node scripts/sdd-check.mjs` and `node scripts/docs-site.mjs check` passed. The remaining one-prompt-per-rebuild behavior is inherent to unsigned local builds; signed release builds keep the grant across launches.

## 2026-11-21 encrypted local credential file run

Per the user-approved decision above, desktop tokens moved from the macOS Keychain to `credentials.json` v1: one AES-256-GCM encrypted entry per endpoint, random per-install key in `credential.key`, owner-only permissions, atomic writes, and reject-and-preserve on unknown, corrupt, or tampered files. Retained Keychain entries act as a read-only fallback and convert into the file on first use without being deleted; explicit sign-out, expiry, and endpoint removal delete both copies.

`cargo test` passed 17 tests (13 prior plus four new credential-store tests: round trip/remove, unknown-version rejection without rewrite, tampered-ciphertext rejection, owner-only key and credential file permissions). The encrypted envelope uses AES-256-GCM with per-write random nonces and version-bound associated data. Startup probing and manager listing read only the file, so they cannot trigger Keychain prompts; the sole remaining prompt is the one-time Keychain read when converting an entry created by an earlier build. Limit: the Keychain fallback path (conversion and deletion against a real Keychain entry) is covered by the implementation and the earlier live handoff runs rather than an automated test, because Keychain automation requires interactive authorization.

## Checks

- `CARGO_HOME=... CARGO_NET_OFFLINE=true cargo test --locked` in `apps/desktop/src-tauri`: **6 passed** after the UI follow-up, including the manager-route security test.
- `node_modules/.bin/vitest run tests/desktop-auth.test.ts tests/desktop-schema.test.ts tests/desktop-web-context.test.ts`: **3 files, 6 tests passed**.
- `node_modules/.bin/tsc --noEmit`: **passed** after the final manager adjustment.
- `node_modules/.bin/vitest run tests/i18n.test.ts tests/desktop-web-context.test.ts`: **2 files, 4 tests passed** after the UI follow-up.
- `node_modules/.bin/vite build --config apps/web/vite.config.ts`: **passed** after the UI follow-up.
- Focused Vitest regression run for desktop auth/schema/context, folder sharing, pending drafts and sheet links: **6 files, 39 tests passed**.
- `node scripts/sdd-check.mjs`: **passed**, seven change specifications and pinned hashes after the follow-up.
- `node scripts/docs-site.mjs check`: **passed**, repository links, release/editor versions, schema tables and skill references.
- `cargo fmt --check --manifest-path apps/desktop/src-tauri/Cargo.toml` and `git diff --check`: **passed** after the follow-up.

The direct `pnpm sdd:check` invocation was attempted again after the follow-up. This machine's pnpm 11.25.0 first tried `pnpm install --prod` and stopped with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`; the underlying `node scripts/sdd-check.mjs` ran successfully. This is a local dependency-state/tool invocation limit, not an SDD validation failure.

## Source audit and release limits

The packaged Web entry, hashed assets, fonts and CAD files use the proxy's static allowlist. Plugin Web bundles and API requests use `/api/v1/plugin-assets` and other `/api/v1` paths; SSE uses `/api/v1/ai/.../stream`, and rich-text collaboration uses `/api/v1/ws`. Public share links and pending-draft identity use the selected remote origin, while a document can still resolve its active local-proxy URL. These routes were inspected in source; live verification covered core API and rich-text WebSocket traffic.

The previous trial's `local-v1` files, v1 endpoint format and OS-vault IDs are preserved by design. The remote-only client does not read or migrate old local data. PostgreSQL upgrades on the final source, Windows/Linux packaging, external TLS, installed plugins, AI streams, multiple remote services, network-loss recovery and signing/notarization need platform or service-specific release verification. The exact compatibility decision and recovery route are in [spec.md](spec.md) and [the desktop contract](../../docs/desktop-client.md).

## 2026-11-21 release installers run

The v0.2.37 desktop-release workflow built the release installers on GitHub runners: macOS `Doca_0.2.37_universal.dmg` (universal-apple-darwin, 30.58 MB) and Windows `Doca_0.2.37_x64-setup.exe` (NSIS) plus `Doca_0.2.37_x64_en-US.msi` (17.82 MB / 25.62 MB) with SHA-256 checksum files, all attached to the GitHub release; run record is in [docs/verification/release-0.2.37.md](../../docs/verification/release-0.2.37.md). The Windows compilation required moving `base64`, `keyring`, `open` and `hex` into the common dependency section; macOS rebuilt green with the same tree.

Completed relative to the earlier limits: Windows packaging now builds in CI; the release installers exist with recorded checksums. Remaining limits: the Windows installers were not executed on a Windows machine and no external TLS host was exercised; installers are unsigned and not notarized.
