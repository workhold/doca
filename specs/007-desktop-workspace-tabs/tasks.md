# Tasks: Desktop tabs and windows

**Spec**: [spec.md](spec.md)

- [x] T001 Audit current desktop, plugin loading, logout and persistence boundaries; record the proposed compatibility decision. AC-004, AC-005, AC-006, AC-007.
- [x] T002 Obtain the separate concrete compatibility agreement recorded in `spec.md` before implementation. AC-003, AC-007.
- [x] T003 Implement bounded endpoint/account session serialization and isolated tests in `apps/desktop/src-tauri/src`. AC-003, AC-007.
- [x] T004 Implement the tab strip, independent page contexts and multiwindow lifecycle in `apps/desktop`; inspect keyboard and overflow behavior. AC-001, AC-002.
- [x] T005 Connect logout, backend switching and external session rejection to all affected windows and proxy state. AC-004, AC-005.
- [x] T006 Verify plugin asset forwarding through the desktop proxy and document exact current behavior; update the desktop contract and module index. AC-006.
- [x] T007 Run applicable checks, attempt an isolated native smoke test and record results, versions and limits in `validation.md`. AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007.
- [x] T008 Refine the tab strip for the 2026-11-21 user feedback: new-tab button after the tab list, clearer new-window icon with tooltip, and a per-tab context menu (duplicate same URL, new window, close, close left, close right, close all). AC-001.
- [x] T009 Add browser-style tab dragging inside a window (cursor-following tab, animated neighbours), suppress right-click text selection in the strip, and add a proxy event stream so windows sharing one backend refresh tab state. The user chose on 2026-11-21 to drop cross-window and tear-off dragging. AC-001.
- [x] T010 Allow each workspace window to bind to its own backend account: run one proxy per connected endpoint, open/re-sign-in flows keep other backends' windows, and sign-out/expiry/removal close only the affected backend's windows. No stored-format change. AC-005, AC-004.

## References

[Doca workflow](../../docs/sdd.md)
