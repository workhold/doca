# Feature Specification: Stable desktop proxy origin

**Level**: standard
**Status**: implemented
**Created**: 2026-11-23
**Decision**: The desktop workspace proxy binds an ephemeral loopback port (`127.0.0.1:0`), so the WebView origin changes on every launch. localStorage and IndexedDB are partitioned per origin, which reset client-side locale, AI pending queue, AI local cache, the offline replica and the document startup cache on every desktop launch while the web client keeps them (its origin is stable). Deep parity testing recorded this as the largest remaining web-vs-desktop gap. A stable origin is the root fix: account and endpoint isolation already come from per-endpoint+account WKWebView data stores, so no storage migration is needed or performed.

## Scope

Derive the workspace proxy port deterministically from `endpointId:accountId` inside a fixed loopback window (42152–42251, below the macOS ephemeral range), probing forward when a candidate is taken, and falling back to an ephemeral port when the whole window is occupied (for example a second app instance sharing the profile). Unchanged: proxy request authentication (gate cookie + Origin checks), the WebSocket/SSE relay, download interception, per-endpoint+account WebView data stores, the web client, and server-side behavior.

Out of scope: migrating data stored under historical random origins (equivalent to today's per-launch reset, so nothing regresses), syncing client preferences server-side, and changing the manager-window or login flows.

## Acceptance

- **AC-001**: Relaunching the desktop client with the same endpoint and account reuses the same proxy port; the workspace origin is stable across launches.
- **AC-002**: When the deterministic port is taken, the proxy binds the next free port in the window and the workspace still opens; when the whole window is taken it falls back to an ephemeral port with a logged notice.
- **AC-003**: Existing proxy guarantees keep working on the stable origin: gate cookie/Origin auth, static asset serving, `/api/v1` forwarding, WebSocket relay and download actions.

## Design

`proxy.rs` gains `PROXY_PORT_BASE` (42152) and `PROXY_PORT_SPAN` (100), a `proxy_port_base(key)` hash (first two bytes of SHA-256 modulo the span), and `bind_workspace_listener(key)` which probes `base, base+1, …` wrapping within the window before falling back to `127.0.0.1:0` with a stderr notice. `start()` takes a `port_key` parameter; `lib.rs` passes `"{endpointId}:{accountId}"`, which is stable for a logged-in workspace and unique per endpoint. The origin string, gate URL and all handlers are unchanged — they already derive from the bound listener. Data under historical random origins is not migrated: until this change every launch started from empty storage, so there is no regression and no compatibility decision to record.

## Tasks

- [x] T001 Add the deterministic port window, hash and probe/fallback binding to the proxy. (AC-001, AC-002)
- [x] T002 Pass the endpoint+account port key from the workspace open path. (AC-001)
- [x] T003 Unit tests: stable base within the window, spread across keys, deterministic rebind after release, forward fallback when a port is taken. (AC-001, AC-002)
- [x] T004 Live regression through the stable origin: gate, static assets, `/api/v1` forwarding and workspace render with the unchanged relay and download paths. (AC-003)

## Validation

**Result**: passed

- T003 unit tests pass (desktop suite 27/27): stable base inside the window, hash spread across keys, deterministic rebind after release, forward fallback when a port is taken.
- AC-001 live: throwaway bundle (`parity-config.json`) against the isolated host (port 39484), `endpointId:accountId` key hashing to 42223 — the first launch bound exactly 42223, and two subsequent quit/relaunch cycles bound 42223 again (runs `app-run4/5/7.log`).
- AC-002 live: with 42223 occupied by an external listener, the next launch bound 42224 and the workspace still opened. The whole-window fallback to an ephemeral port logs a stderr notice and was reviewed in source. The test suite covers a single occupied port.
- AC-003 live: on the stable origin the workspace rendered through the full proxy pipeline (gate cookie → tab shell → static assets → `/api/v1` forwarding incl. 401 handling and the login route render). The WebSocket relay code path is unchanged since the spec 009 verification run, which exercised bidirectional Yjs sync live.
- Run record: `artifacts/verification/desktop-parity/` (server2.log, app-run4–7.log, shots/).

## References

[Doca workflow](../../docs/sdd.md) · [Desktop client](../../docs/desktop-client.md) · [External links spec](../009-desktop-external-links/spec.md)
