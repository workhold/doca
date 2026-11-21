# Feature Specification: Tauri desktop client for remote Doca services

**Level**: full
**Status**: accepted
**Created**: 2026-11-20
**Decision**: The user confirmed Tauri 2 and authorized the original local-plus-remote compatibility proposal. After the macOS bundle measured 612 MiB, the user explicitly approved a remote-only revision on 2026-11-20, including preservation of existing trial local data and v1 settings. The remote-only revision below supersedes the local runtime requirements. A macOS arm64 package and an isolated loopback-host workflow were locally verified on 2026-11-21; the feature has not been released.

## Scope

Doca 0.2.36 has a same-origin Web application and a Node/Fastify host. Build a Tauri 2 desktop client that **bundles the Web frontend only** and connects to a selected remote Doca backend through a loopback transport. It does not bundle or start Node, SQLite or a Doca business host. The connection manager follows the Web application's blue brand, typography, surfaces and controls.

Users can save multiple named HTTPS service origins; HTTP is accepted only for loopback development hosts. Desktop login opens the selected host in the system browser. After normal website authentication, a one-time, state/PKCE-bound code returns through `doca://`. The desktop client keeps each remote credential in an app-local encrypted credential file (one entry per endpoint, user-approved on 2026-11-21) and isolates WebView storage by host and account. Switching services does not synchronize or transfer documents, drafts, cookies or credentials.

The first desktop release requires a backend that implements the new desktop authorization protocol. Existing Web, mobile and browser-assistant sessions retain their contracts. A desktop credential has no time-based expiry; explicit sign-out, password reset/change, administrator revocation or disabling the user ends its access. Target macOS, Windows and Linux and report actual build/runtime coverage separately.

An unreleased trial desktop build created `local-v1` profiles and v1 endpoint settings. The remote-only build does not read, modify, delete or migrate `local-v1` data. It retains the v1 endpoint format and OS-vault credential IDs. Its `active: "local"` value means no remote service is selected; an older trial build can still interpret the same file and access its local profile. Unknown or corrupt setting versions continue to be preserved and rejected. No local document conversion or automatic transfer to a remote service is offered.

## User scenarios

### Connect to a service (P1)

On first launch, the app presents the connection manager with no local workspace action. A user adds a valid service origin, completes login in the system browser, returns with a one-time code and opens the bundled workspace. Cancelled, expired, mismatched and replayed handoffs do not store credentials and allow a fresh attempt.

### Switch between services (P1)

The user can add, rename, select, sign out of and remove multiple services. Each selected host/account opens its own WebView data store. A temporarily unreachable service does not erase its credential or the other services. Switching does not copy or send pending content to another host.

### Retain desktop access (P1)

An active, unrevoked desktop credential still works after browser and mobile session lifetimes pass. Account disablement, logout, password reset/change and administrator revocation make it unusable; re-enabling an account requires another desktop login.

### Preserve trial local data (P1)

If `local-v1` data or v1 settings from a trial build exist, installing the remote-only build leaves their bytes and permissions untouched. The local profile is unavailable in the new UI, and the user can return to the matching older trial build for local access. A configuration version the new client does not recognize blocks startup without overwriting it.

## Acceptance

- **AC-001**: The Tauri package includes the matching Web build and native connection manager, but no Node executable, Doca server runtime, SQLite binding or local-host startup path. The workspace loads Web files from the package and uses a selected remote backend for API and WebSocket requests.
- **AC-002**: System-browser login uses a short-lived, single-use code with bound origin, state and PKCE verification. No long-lived desktop token appears in a URL, browser storage or Web frontend. Replay, cancellation, origin mismatch and disabled accounts fail closed.
- **AC-003**: Users can add, rename, select, sign out of and remove multiple service entries. Origins accept HTTPS or loopback HTTP only, with no path, credentials, query or fragment. Host/account WebView stores and OS-vault credentials are separate. Switching never forwards a credential or pending content to another service.
- **AC-004**: Desktop credentials have no time expiry. The host checks active status and revocation for every HTTP and WebSocket authentication. Logout, password change/reset, admin revocation and account disable revoke them. Browser/mobile expiry remains unchanged.
- **AC-005**: Existing 0.2.36 host data and browser/mobile/extension credentials retain their values and behavior after the additive schema upgrade. Two new desktop tables start empty; old credentials are not converted. An old host reports unsupported desktop login; the client has no old-protocol fallback.
- **AC-006**: Existing `local-v1` profiles are neither opened nor changed by the remote-only build. V1 endpoint metadata and vault credentials are retained without rewriting or conversion; `active: "local"` is an unselected remote state. Unknown or invalid setting formats are preserved and rejected. No local-to-remote data migration occurs.
- **AC-007**: macOS, Windows and Linux native build and runtime results are reported separately, including browser login return, switching, disabled-user rejection, realtime editing and network loss. Unverified platforms are not represented as verified.
- **AC-008**: The loopback transport serves only packaged Web assets and forwards only API/WebSocket traffic to the selected backend. It validates a random HttpOnly capability, Host and Origin. The workspace WebView has no Tauri IPC permission and cannot read the stored desktop token; the proxy never sends it to another host.
- **AC-009**: The desktop package excludes the previously measured 114 MiB Node executable and 402 MiB server dependency tree. Record the new package size and included assets; no local business backend is installed or launched.
- **AC-010**: The connection manager visually matches the current Doca Web theme, including brand mark, palette, typography, surfaces and controls. Its narrow window remains readable and usable with keyboard focus, long endpoint names and multiple entries.
- **AC-011**: Every Web document-creation entry positions the type popover against the button that opened it in the desktop workspace, including sidebar, list, library and import entries. The popover stays inside the window and remains keyboard usable.
- **AC-012**: An authenticated desktop workspace shows the switch-backend control in its native tab strip; the workspace sidebar has no switch-backend entry. Settings pages retain a discoverable header control because they use a separate navigation layout. The control brings the native connection manager to the front without closing the current workspace, forwarding a credential, or granting the workspace Tauri IPC. The corresponding private loopback action requires the existing capability and the exact local Origin. Browser Web pages do not show the control.

## Architecture and contracts

Authoritative current interfaces: [authentication](../../docs/authentication.md), [database evolution](../../docs/database-schema-evolution.md), [plugin SDK](../../docs/plugin-sdk-contract.md), [collaboration](../../docs/collaboration-sdk-contract.md), [desktop client](../../docs/desktop-client.md), and the [module index](../../docs/sdd-module-index.md). The working tree implements browser-approved remote desktop routes, distinct hashed desktop credentials, two additive tables, a versioned endpoint index, encrypted per-endpoint desktop credential files (with retained Keychain fallback entries) and per-account WebView stores. Execution scope is in [validation.md](validation.md); these are not deployed claims.

## Compatibility decision

**Approved on 2026-11-20** by the user's explicit reply to the concrete remote-only proposal. The original local-plus-remote approval is superseded for this release.

- Retain all existing host users, documents, plugin data, browser/mobile/extension sessions and their expiry/revocation behavior. Add empty `desktop_auth_flows` and `desktop_sessions` tables through current DDL and `schemaEvolution`, leaving `schema_baseline.id` unchanged. No old credential becomes a desktop credential.
- Continue to use distinct hashed, non-expiring desktop credentials. Old hosts reject the new handoff protocol and the client asks for a host upgrade without a cookie or mobile-token fallback. Existing issued desktop credentials and the two new tables are retained.
- Preserve every trial `local-v1` directory, SQLite/WAL file, object, plugin and master key without reading, deleting, resetting or automatically converting them. The new app never starts a local host. Returning to the matching older trial build is the local-data recovery route; a later reintroduction of local mode needs a separate plan.
- Retain v1 `profiles.json` and its remote endpoint IDs, names, origins, account IDs and OS-vault references byte-for-byte unless the user explicitly edits an endpoint. Interpret `active: "local"` only as no remote selection in the new UI. The older trial build can still read the same format. Unknown/corrupt versions remain untouched and rejected.
- Validate the host schema upgrade with retained released data on isolated SQLite and PostgreSQL 17/18, repeated/concurrent startup and rejection without partial writes. A previous host may refuse the new tables: preserve the database and new records, then resume a matching new host. Any downgrade or data conversion requires a separately agreed preservation plan.

## Design and work

See [plan.md](plan.md), [tasks.md](tasks.md) and [validation.md](validation.md).

The 2026-11-21 desktop UI follow-up adds AC-011 and AC-012 within the approved remote-only design. It changes neither the v1 settings/local-data preservation rule nor host authentication and storage formats.

The later AC-012 layout adjustment first moved the ordinary workspace control to the left-navigation footer; on 2026-11-21 the user then chose the final placement in the native tab strip and the sidebar footer entry was removed. It changes no transport or stored format.

A same-day credential fix keeps macOS Keychain existence checks attribute-only: listing endpoints and probing startup restore never read the stored secret, so they cannot trigger Keychain authorization prompts. The secret is read only when opening that backend's workspace or deleting the credential. Credential storage was then moved by explicit user request (2026-11-21) to an app-local encrypted file: `credentials.json` v1 holds one AES-256-GCM encrypted entry per endpoint under a random key in `credential.key` (owner-only permissions, atomic writes). New logins write only the file. Entries created by earlier builds stay in the OS Keychain as a read-only fallback: the first use of such an endpoint reads the Keychain secret once, converts it into the file, and keeps the Keychain entry untouched. Explicit sign-out, expiry, or endpoint removal deletes the file entry and also deletes any retained Keychain entry. Unknown or corrupt credential files are rejected without overwriting the original bytes. Reverting to an earlier build still finds retained Keychain entries for endpoints that were not explicitly signed out.

## References

[Doca workflow](../../docs/sdd.md) · [Module index](../../docs/sdd-module-index.md) · [Repository rules](../../AGENTS.md)
