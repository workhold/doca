# Desktop file operations

**Level**: standard
**Status**: implemented
**Created**: 2026-11-23
**Decision**: Restore PDF preview, keep the list visible after upload, make folder drop targets usable, and add ZIP download for selected files.

## Scope

Doca 0.2.39 Web and desktop file interactions. Download applies to selected files. Folder trees are supported as upload inputs using the existing upload flow.

## Acceptance

- **AC-001**: PDF preview uses the worker that matches the PDF.js build selected by the viewer.
- **AC-002**: Upload and parsing status refreshes keep existing file rows visible.
- **AC-003**: A writable folder remains visible and highlighted during an external file drag. Confirming the drop uploads into that folder.
- **AC-004**: Users can download selected files in one ZIP from the toolbar or row menu. Archive entries preserve distinct names and bytes, and a failed fetch prevents a partial archive from being offered.

## Architecture and contracts

Uses the existing PDF viewer, file upload and authorized file-content endpoints, and the desktop native save flow described in [Desktop client](../../docs/desktop-client.md).

## Compatibility decision

The viewer keeps its existing engine selection and uses the worker from the same installed PDF.js version for each build. This work requires no API, stored data, or format changes.

## Design

Keep populated file lists visible when reloading the current folder. Preserve visible drop targets while distinguishing the active folder. Assemble a stored ZIP from authorized content reads in the client and save it through the existing browser Blob download path. Standard ZIP size and entry limits apply.

## Tasks

- [x] T001 Match the PDF worker bundles and keep the file list visible during refresh (AC-001, AC-002).
- [x] T002 Keep writable folder drop targets visible and send the upload to the chosen folder (AC-003).
- [x] T003 Add selected-file ZIP download and verify desktop download routing (AC-004).

## Validation

**Result**: partial

- AC-001 passed for the built viewer with WebKit 26.5 and Chromium. Both rendered a PDF canvas and text layer with their respective bundled workers. Playwright WebKit build 2104 still fails in PDF.js text extraction on its missing ReadableStream async iterator.
- AC-002 passed in the desktop tab shell under WebKit 26.5. The fixture posted file bytes and kept the uploaded row visible during two delayed parsing status requests.
- AC-003 passed in the same shell with a synthetic browser file drop onto a folder row. The target was highlighted, the review dialog identified the folder, and the post contained the expected parent ID and file bytes.
- AC-004 passed in the same shell with a browser download. The ZIP contained the expected bytes and distinct filenames. A forbidden file showed an error without creating a partial download.
- The native operating-system drag gesture and system save dialog were outside the browser fixture. The fixture used isolated data and the production bundle.
- Type checking, Web production build, 23 existing file tests and the SDD check passed.
- SDD effort was not measured. The expanded request added a specification record, and the browser fixture exposed an unresolved older-WebKit limitation.
