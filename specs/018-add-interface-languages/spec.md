# Feature Specification: Eight interface languages

**Level**: full
**Status**: accepted
**Created**: 2026-11-26
**Decision**: Add Traditional Chinese, Japanese, French, Korean, Spanish, and Russian to Doca and all five editor packages. The operator expressly approved the language-preference compatibility plan on 2026-11-26 and requested host release 0.3.0. Arabic is deferred at the operator’s request.

## Scope

Extend the Doca 0.2.46 interface catalogs, first-party language selectors, localized formatting, and the installed npm editors for rich text, Markdown, spreadsheets, canvas, and slides. Provide localized project introductions, public documentation and corresponding screenshots. Verify the eight interface languages using isolated content before releasing Doca 0.3.0 on GitHub and Docker Hub.

## Acceptance

- **AC-001**: Each of the eight languages is offered by name and renders translated first-party interface copy in sign-in, the signed-in workspace, and language controls. Site and account choices resolve through the established preferences, and signed-in reload restores the saved choice. Supported dates and lists follow the locale.
- **AC-002**: Each editor renders its native UI in all eight languages from the existing locale prop. Switching the language of an open document preserves its content, editor session, and collaboration sequence.
- **AC-003**: Desktop connection and workspace controls, mobile settings and host copy, and the browser extension use the new catalogs at their existing language entry points.
- **AC-004**: Each language has a localized project README and documentation entry, readable language navigation and links, and real matching screenshots for the workspace and featured editors. Public historical records keep their established source and evidence.
- **AC-005**: All five npm artifacts build and pass package and host checks. Doca pins their exact published versions. Perform per-language UI and screenshot acceptance and verify the GitHub release, documentation deployment, and Docker Hub version and architecture manifests.

## Architecture and contracts

Use the existing [interface language contract](../../docs/i18n.md) and [editor integration contract](../../docs/editor-integration.md). Update their language coverage and installed versions. Public language selectors and stored values change, so the work is full SDD. The runtime and state of editable documents follow the [collaboration contract](../../docs/collaboration-sdk-contract.md).

## Compatibility decision

The operator explicitly approved this plan in the task conversation on 2026-11-26. Keep existing `zh` and `en` preferences verbatim. Accept `zh-Hant`, `ja`, `fr`, `ko`, `es`, and `ru` as new canonical values in the existing account page-state JSON string, the existing site default column, and the existing clients’ local preference fields. Only intentional selection persists a new value. UI matching recognizes traditional Chinese region/script tags and the primary tags for supported languages. Continue rejecting out-of-set values at write endpoints and use the existing read fallbacks. Editor packages keep their existing locale prop, omitted-locale rule, and fallback for unrecognized codes.

Preserve existing rows, document formats, editor session protocols, and browser preference fields during upgrade. There is no database schema change or data migration. To roll back to Doca 0.2.46, retain account and site rows and deploy the previous application and editor packages. The previous UI applies its existing fallbacks to newly stored values. Avoid saving language settings while rolled back, and restore the newer application to recover the saved server preferences. Use isolated tests to verify upgrade reads, new writes, invalid-value rejection and rollback reads.

## Design

See the [implementation plan](plan.md), [tasks](tasks.md) and [validation record](validation.md).
