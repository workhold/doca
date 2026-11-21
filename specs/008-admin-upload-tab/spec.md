# Feature Specification: Independent admin upload-limits tab

**Level**: standard
**Status**: verified
**Created**: 2026-11-21
**Decision**: User requested moving upload-limit management out of the AI administration tabs into its own admin page. The single-file limit policy is shared by AI attachments and Files uploads, so the page is presented as a platform upload policy instead of an AI-only setting.

## Scope

Move the existing upload policy editor from the AI administration "uploads" sub-tab to a new independent Administration sidebar tab (`/admin?tab=uploads`). Keep the existing `ai-upload-policy` storage, revision handling and admin API unchanged. Update navigation entries, admin labels, chat guidance copy and the AI attachment contract so administrators and users are directed to the new location and understand that the individual-file limit also applies to Files uploads.

Out of scope: splitting AI and Files limits into separate policies, changing defaults, changing the API or persisted format, mobile upload limits, reverse-proxy body limits, and plugin body limits.

## Acceptance

- **AC-001**: Administration has an independent "Upload limits" tab (`/admin?tab=uploads`) for admins, and the AI administration page no longer shows an uploads sub-tab.
- **AC-002**: The tab edits the same versioned policy through the existing admin API; global values, per-user overrides, unlimited (0) values and revision conflict handling behave as before.
- **AC-003**: UI copy and `docs/ai-attachments.md` describe the new location and state that the individual-file limit applies to AI attachments/folder uploads and Files uploads; zh/en catalogs keep key parity.

## Design

Register a `doca.admin.uploads` navigation entry (default in `web.admin`), add the tab to the admin console route and sidebar groups, and render the existing policy editor as a standalone admin card. Move the editor component and its styles into the admin feature so it no longer depends on AI-page CSS. Dictionary keys remain stable; only values and one new `admin.uploads` key change. No compatibility behavior is introduced, retained or changed: navigation adds a new default entry, stored policy format and API are untouched.

## Tasks

- [x] T001 Add the `uploads` admin navigation entry, label and icon. (AC-001)
- [x] T002 Move the policy editor into the admin feature and render it at `/admin?tab=uploads`; keep the existing policy API and revision behavior. (AC-001, AC-002)
- [x] T003 Remove the uploads sub-tab from AI administration. (AC-001)
- [x] T004 Update zh/en copy and `docs/ai-attachments.md` for the new location and shared individual-file scope. (AC-003)

## Validation

**Result**: passed

- AC-001: isolated browser run found the independent `#/admin?tab=uploads` admin entry and confirmed AI administration no longer lists an uploads sub-tab (`artifacts/verification/admin-upload-tab/`).
- AC-002: the moved editor loaded defaults 100 / 100 MiB / 500 MiB; editing the individual limit to 200 MiB saved and persisted after reload through the unchanged policy API.
- AC-003: zh/en catalogs pass parity tests and show the new location plus the shared individual-file scope; `docs/ai-attachments.md` is updated.
- Commands: `pnpm typecheck`, `pnpm vitest run tests/i18n.test.ts tests/web-plugin-registry.test.ts` (11 passed), `pnpm build`, `pnpm sdd:check`, `pnpm docs:check`; details in the artifact README.

## References

[Doca workflow](../../docs/sdd.md) · [AI attachments](../../docs/ai-attachments.md) · [Storage](../../docs/storage.md)
