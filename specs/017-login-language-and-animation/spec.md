# Feature Specification: Login language and illustration

**Level**: standard
**Status**: verified
**Created**: 2026-11-26
**Decision**: The user requested language selection on the login page and an HTML animation in the left panel. After viewing the local builds, the user asked for a styled dropdown and a more varied editing demonstration. The document, spreadsheet and canvas now share one composition on the page background with motion linking successive editing actions. The latest preview feedback calls for a spreadsheet grid and continuous playback without the footer controls. These are Web presentation changes within the existing login flow.

## Scope

Update the shared Web login screen used at the main entry and when a route requires sign-in. Offer Chinese and English in a page-rendered menu in the card header. Rotate document, spreadsheet and canvas editing demonstrations over the page background. Doca 0.2.45 is the source baseline.

## Acceptance

- **AC-001**: A fresh login screen uses the site's configured default language. The top-right trigger shows the language by its own name and opens a styled option list under the trigger. The selected option is visibly marked. The menu supports keyboard navigation and closes on choice, Escape or an outside click. Changing the choice preserves the current login method, form entries and active QR code.
- **AC-002**: The pre-login choice applies during the current Web page visit. It makes no account page-state request. After sign-in, the workspace continues to resolve its own locale from the account choice and site default.
- **AC-003**: The wide login layout shows the document, spreadsheet and canvas in a single composition without an enclosing frame. A shared pointer moves between the document checklist, the recalculating spreadsheet and the review node being placed and connected. The spreadsheet shows column letters, row numbers, the selected cell and a formula bar. It previews the B4 edit, then commits it and shows the recalculated B5 formula result. All three editors remain in view as the focus changes. The decorative demonstration loops automatically. The composition ends at the artwork, with no controls or divider below it. Reduced-motion users see the completed composition. The narrow layout keeps the form and language selector available.

## Architecture and contracts

Use the site's existing bootstrap locale, the host locale provider and catalogs, and the shared `AccountLogin` component. Update the [interface language contract](../../docs/i18n.md), its Chinese edition and the skill reference.

## Compatibility decision

The new control uses an in-memory visitor selection for the current page visit and the existing supported locale values. The site setting and account preference continue to resolve through their current sources and formats.

## Design

The locale provider exposes a separate pre-login action. A fresh page gets its language from the administrator's site default. The shared login view uses the host's page-rendered Select at the right edge of the card header. Its popup aligns to the trigger's right edge. The QR toggle shares the header so both controls remain available while the body displays the form or QR code. Page-generated feedback resolves its message key with the current locale. The password rejection message uses the existing HTTP 401 status, and provider names and other server messages render according to the current authentication and language contract.

Use localized sample content for one release project across an editorial-style document, a worksheet with a formula bar, and a diagram on the page background. Keep all three mounted in fixed positions and shift the pointer and focus as each editor types, updates a value or places and connects a node. The worksheet shows 2 in B4 and a total of 10 in B5. Editing displays a draft 4 in B4 and the formula bar. On commit, B5 is selected, shows 12 and displays `=SUM(B2:B4)` in the formula bar. The form occupies a single column on narrow screens. Narrow layouts and reduced motion disable playback.

## Tasks

- [x] T001 Add the language selector and connect the locale provider's visitor action to both shared login entry points. (AC-001, AC-002)
- [x] T002 Add the responsive illustration and reduced-motion styling. (AC-003)
- [x] T003 Update the current language contract and verify both defaults, in-place selection, login handoff and responsive motion behavior. (AC-001, AC-002, AC-003)
- [x] T004 Place the dropdown inside the card, fit the QR control beside it, and verify the looping illustration over the page background in the live local preview. (AC-001, AC-003)
- [x] T005 Use a styled in-page menu and verify keyboard, pointer and QR interactions. (AC-001)
- [x] T006 Implement and verify automatic editing demonstrations for the document, spreadsheet and canvas. (AC-003)
- [x] T007 Restyle and verify a shared composition with a continuous pointer, distinct editing motions and responsive playback controls. (AC-003)
- [x] T008 Show the spreadsheet as a cell grid and verify the draft and committed states of the B4 edit and B5 formula. (AC-003)
- [x] T009 Remove the demonstration footer and verify automatic playback, wrapping and the static reduced-motion view. (AC-003)

## Validation

**Result**: passed

### Initial layout run

- **AC-001** passed in Chromium against the production Web bundle and isolated fixture responses. Both administrator defaults took effect on page load. The native selector was reachable with Tab and switching preserved the password fields, current login method and email draft. Registration, recovery, the QR panel, and an existing password rejection showed the selected language. Changing the QR panel language kept the current code.
- **AC-002** passed. Reloading after a manual choice restored the configured site default. Guest language changes made no page-state request. The `#/desktop-connect` sign-in entry also switched language, and completing the fixture sign-in loaded the account locale without writing `ui.locale`.
- **AC-003** passed. At 1440 px the illustration played once and settled within 1.4 seconds. With reduced motion it showed its final state immediately. The 768 px layout kept the two columns, and the 320 px and 375 px layouts kept the selector and login form in one column. The browser run checked horizontal overflow and the illustration's accessibility attributes.
- `pnpm typecheck`, the targeted Vitest suite (34 passed), the Web production build, `pnpm sdd:check`, and `pnpm docs:check` passed. Browser logs and screenshots are under `artifacts/verification/login-language-and-animation/`. These results cover the local Doca 0.2.45 source build.

### Revised layout run

- **AC-001** passed on the running local preview and the rebuilt bundle. Chromium found the native dropdown inside the card's top-right corner with an accessible language name and only the selected language visible. The 320 px and 375 px layouts fit the QR toggle and dropdown side by side. Switching languages during scanning kept the issued code, and the QR toggle returned to the password form.
- **AC-002** was rerun against the rebuilt Web bundle. A reload picked the configured site default, and completing the fixture sign-in loaded the account locale without a page-state write.
- **AC-003** passed. Chromium verified a transparent illustration area with no perimeter border, a page-wide background, and CSS motion still running beyond the original entrance duration. Reduced motion showed static artwork. The 320 px, 375 px and 768 px layouts had no horizontal overflow.
- The production rebuild, typecheck, targeted Vitest suite (34 passed), SDD check and documentation check passed. The revised browser logs and screenshots are under `artifacts/verification/login-language-and-animation/layout-revision/`.

### Editor demonstration run

- **AC-001** passed in Chromium against the built Web bundle with isolated fixture responses. The styled menu opened below the trigger with its right edge aligned, highlighted the current language, and supported keyboard selection and Escape and outside dismissal. Switching languages preserved form entries and the issued QR code.
- **AC-003** passed. The document typed and checked an item, editing the spreadsheet value from 2 to 4 recalculated the total to 12, and the canvas added and connected a review node. The cycle returned to the first scene and supported manual selection and pause. Reduced motion showed completed scenes. The 320 px, 375 px and 768 px layouts had no horizontal overflow.
- The Web production build, typecheck and targeted Vitest suite (36 passed) passed. Browser logs and screenshots are under `artifacts/verification/login-language-and-animation/editor-demos/`.

### Shared workflow run

- **AC-003** passed against the Doca 0.2.45 Web build in Chromium. The document, spreadsheet and canvas stayed mounted as the pointer moved between them. The run observed typing and completing a checklist item, the hours value changing from 2 to 4 with the total changing from 10 to 12, and a dragged review node joining the diagram. The cycle restarted automatically. Manual selection, pause, resume and reduced motion worked.
- Chromium verified the grouped layout at 768 px, 910 px, 1024 px and 1440 px. The review node stayed clear of the sheet. The 320 px and 375 px layouts displayed the form with the language control. The same build rechecked the menu placement, keyboard selection, preservation of form values and the current QR code from **AC-001**.
- The local preview served the current build. The Web production build, typecheck and targeted Vitest suite (36 passed) passed. Browser logs and screenshots are under `artifacts/verification/login-language-and-animation/shared-workflow/`.

### Spreadsheet and automatic loop run

- **AC-003** passed in Chromium against the Doca 0.2.45 Web build. The worksheet showed column letters A and B, row numbers 1 through 5 and an address and formula bar. B4 showed 2 before editing and a draft 4 while B5 remained 10. After commit, the selected B5 showed 12 and the formula bar showed `=SUM(B2:B4)`.
- The document, spreadsheet and canvas advanced automatically and wrapped to the document. The composition ended at the artwork. Under reduced motion, the art showed the completed sheet and diagram without playback. The 320 px, 375 px, 768 px, 910 px, 1024 px and 1440 px widths had no horizontal overflow. The dropdown and QR interaction in **AC-001** passed again.
- The changed sheet and trimmed layout were verified in the running Chinese local preview. The Web build, typecheck and targeted Vitest suite (36 passed) passed. Browser logs and screenshots are under `artifacts/verification/login-language-and-animation/spreadsheet-loop/`.
