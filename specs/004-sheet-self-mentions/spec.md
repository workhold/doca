# Feature Specification: Spreadsheet self mentions

**Level**: full
**Status**: verified
**Created**: 2026-11-03
**Decision**: User requested online spreadsheets to show mentions of the current user with a blue background and white text, and remove mention underlines. Follow-up explicitly requires the same capsule rounding as online documents. Implementation includes the required editor rendering API.

## Scope

Doca currently pins official `@smartdoca/sheet` 0.2.15. Native inline user nodes are Canvas text, so host CSS cannot style them. Add a transient current-user identity input to the editor, paint user mentions without underlines, and wire Doca's authenticated user into that input in active, readonly/history/trash and template surfaces. Preserve the preceding rich-text and online-document style changes.

## User Scenarios & Testing

### User Story 1 (Priority: P1)

When a spreadsheet mentions the signed-in user, that user can identify the mention in both the grid and cell text editing. Other users remain recognizable as blue text.

## Acceptance

- **AC-001**: Native inline user mentions matching the supplied current user ID have a capsule-shaped rounded blue background and white text in grid and cell draft; all native user mentions have no underline. Other inline links retain their native styling.
- **AC-002**: Changing or clearing current user ID refreshes the same editor instance, including readonly, without changing snapshots, undo history or collaborative content.
- **AC-003**: Doca supplies its current user ID through the actual package API at active, readonly/history/trash and template spreadsheet mounts; package and host type checks pass, with artifact/version status recorded honestly.

## Architecture and contracts

Full level because the change adds a public editor prop/runtime view capability. Package owns native rendering; host owns identity and user cards. Update `docs/editor-integration.md`, its Chinese document and packaged skill references, plus package integration documentation. Model, codec and transport contracts are unaffected.

## Compatibility decision

No compatibility behavior is introduced or redesigned: native `exlsxInlineV1` user nodes, schema 6 and all stored data remain unchanged. This view input is never serialized. Anonymous/cleared identity means no self highlight. Existing historical readers/defaults are outside this change and remain untouched. No conversion, migration, dual reader or old API adapter is needed.

## Design

See [plan](plan.md).

## Tasks

See [tasks](tasks.md).

## Validation

**Result**: passed

See [validation](validation.md).

## References

[Doca workflow](../../docs/sdd.md) · [Editor contract](../../docs/editor-integration.md)
