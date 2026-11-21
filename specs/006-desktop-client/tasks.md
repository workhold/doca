# Tasks: remote-only Tauri desktop client

**Spec**: [spec.md](spec.md)

- [x] T001 Record the original compatibility approval and the later remote-only revision, including preservation of trial `local-v1` data, v1 endpoint settings and desktop credentials. AC-005, AC-006.
- [x] T002 Add the approved empty desktop handoff/session tables to current DDL, types and `schemaEvolution`; retain old host data and compatibility generation. AC-005.
- [x] T003 Implement host-owned desktop handoff, distinct non-expiring bearer authentication and explicit revocation across HTTP/WebSocket. AC-002, AC-004.
- [x] T004 Add the website browser approval/return page and locale messages, retaining Web/mobile login behavior. AC-002.
- [x] T005 Build `apps/desktop` with Tauri 2, packaged Web files, remote-only loopback HTTP/WebSocket transport, browser deep link and OS-vault credentials. Exclude Node/server/SQLite runtime. AC-001, AC-002, AC-008, AC-009.
- [x] T006 Retain v1 endpoint settings and vault IDs, support validated multi-host selection and account-scoped WebView stores, with `active: "local"` as no selection. AC-003, AC-006.
- [x] T007 Audit bundled Web, plugin assets, streams, realtime, document links and pending-draft scope for selected remote origins. AC-001, AC-003, AC-008.
- [x] T008 Remove the local host, local admission and local-only interface from the new release without touching any existing `local-v1` data. AC-006, AC-009.
- [x] T009 Update authoritative authentication, database, deployment and desktop contracts plus release guidance with the remote-only behavior and recovery limits. AC-004, AC-005, AC-006, AC-009.
- [x] T010 Run isolated server/schema, Web, native package and available platform checks; record exact results, versions and limits. AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-009, AC-010.
- [x] T011 Align the manager with the Web theme and inspect the macOS narrow-window layout and keyboard focus. AC-010.
- [x] T012 Anchor document-creation popovers to their actual trigger across Web entry points and inspect desktop window placement. AC-011.
- [x] T013 Add a visible desktop switch-backend control and capability/Origin-gated loopback focus action; verify browser isolation and native manager access. AC-012.
- [x] T014 Show the ordinary workspace switch-backend control in the native tab strip; the sidebar footer entry was removed at the user's request on 2026-11-21, and settings pages keep their header entry. AC-012.
- [x] T015 Make macOS desktop credential existence checks attribute-only so manager listing and startup probing never read the Keychain secret; keep the OS vault storage and entry format unchanged. AC-003, AC-004.
- [x] T016 Store desktop credentials in an app-local encrypted file (one AES-256-GCM entry per endpoint, owner-only key/credential files, atomic writes, reject-and-preserve on unknown/corrupt versions), keep retained Keychain entries as a read-only fallback that is converted on first use, and delete both copies on explicit sign-out/expiry/removal. User-approved 2026-11-21. AC-002, AC-003, AC-004.

## References

[Doca workflow](../../docs/sdd.md)
