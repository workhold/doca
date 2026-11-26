# Feature Specification: Desktop interface language

**Level**: standard
**Status**: verified
**Created**: 2026-11-26
**Decision**: The user reported that Switch backend and the connection manager still display Chinese in an English workspace and that a fresh desktop launch offers only Chinese. This changes the initial language and synchronization of desktop UI within the existing client boundaries.

## Scope

Localize the connection manager and desktop tab strip into the host's supported languages, Chinese and English. Apply the active workspace language when opening the manager from a workspace. Offer an immediate local choice in the manager before a server is connected. The baseline is Doca Desktop 0.2.45.

## Acceptance

- **AC-001**: An English or Chinese workspace shows matching tab strip controls, tooltips, accessible names and tab menu actions. Switching the workspace language updates its tab strip without reloading the open pages. Opening the connection manager from the tab strip or workspace settings uses the invoking workspace's language.
- **AC-002**: On first launch, the manager uses the first supported system language and displays English if none match. A visible language selector offers 中文 and English. A manual choice updates the manager, including its title and notices, and is remembered for standalone launches.
- **AC-003**: Manager form labels, actions, connection statuses, confirmations and user-facing errors are available in both languages. Service names, origins and page titles supplied by workspace pages are displayed verbatim.

## Architecture and contracts

Update the [desktop client guide](../../docs/desktop-client.md) and its Chinese edition. Reuse the host language codes and catalog conventions from [Interface languages](../../docs/i18n.md). Linked server preferences continue to use the workspace's existing `ui.locale`. Desktop chrome can read the current same-origin page language, and the manager uses the existing private loopback action to receive a presentation hint.

## Compatibility decision

The presentation changes use the host's existing `doca.locale` Web Storage convention with canonical `zh` and `en` values in the manager's own app origin. The manager request carries a transient preference between components built and shipped together in the same desktop bundle. The selected locale applies to the current UI.

## Design

Keep desktop messages in the host catalog so the bundled manager, Web workspace and tab strip use the same translations. Observe the active page's effective HTML language in the tab strip. Pass it as `Accept-Language` on the existing manager action. A workspace hint selects the manager language for that visit. Only explicit manager choices are saved in the manager origin. Normal backend actions use the selected language for their UI messages and keep underlying diagnostics available for debugging.

## Tasks

- [x] T001 Localize the tab strip and hand off the active workspace language from both Switch backend controls. (AC-001)
- [x] T002 Localize the connection manager, add the language selector and follow system preferences on a clean launch. (AC-002, AC-003)
- [x] T003 Update the desktop guides and verify both languages, the fallback and the workspace handoff in isolated environments. (AC-001, AC-002, AC-003)

## Validation

**Result**: passed

- **AC-001** passed in the local macOS test bundle. From an English workspace, the tab strip control and the settings header control both opened the manager in English over the saved Chinese manager preference. Changing the workspace language to Chinese updated both controls and the settings header opened the manager in Chinese. The isolated browser run also checked tab menus, tooltips, the unsaved-changes prompt, accessible tab labels, and the draft retained inside an open tab after changing its interface language.
- **AC-002** passed. A clean browser profile used English for `en-GB`, Chinese for `zh-TW`, and English for `ja-JP`. The isolated macOS app showed English on a clean launch with `ja-JP`, showed Chinese after an explicit selection, and kept Chinese on relaunch. The localized native window title followed the selection.
- **AC-003** passed. The native manager showed the English connection actions beside the fixture service's unchanged Chinese name. Submitting an empty backend address in the rebuilt native app showed the English validation message. The browser run also checked plural counts, address errors, endpoint naming, removal confirmation, and live translation of an existing notice.
- Executed `pnpm typecheck`, the targeted Vitest suite for i18n and desktop behavior (36 passed), `cargo test --locked` (27 passed), `cargo fmt --all -- --check`, the manager and bundled Web production builds, `pnpm sdd:check`, and `pnpm docs:check`. Native verification used an isolated debug app bundle built from Doca Desktop 0.2.45 source on macOS 26.6.2 arm64 and a loopback fixture. Execution logs, screenshots and accessibility snapshots are under `artifacts/verification/desktop-language/`.
