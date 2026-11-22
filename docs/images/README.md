# Documentation screenshots

## Editor screenshots

The five editor images were captured on 2026-11-22 from Doca 0.2.37 in Chrome at 1600 × 1000. Both repository READMEs use these same images.

| Image | Actual editor content |
| --- | --- |
| `rich-text.jpg` | Team collaboration guide and document outline |
| `markdown.jpg` | Development note in source/preview split view |
| `spreadsheet.jpg` | Formatted project budget with totals and formulas |
| `slides.jpg` | Product introduction with four native slides |
| `canvas.jpg` | Native flowchart, mind map, and action table |

The installed packages are Slate 0.4.26, Markdown 0.4.4, Sheet 0.2.19, Slides 0.3.0-alpha.5, and Canvas 0.5.16. The separate `workspace.jpg` overview predates this editor refresh.

To refresh the screenshots for the current checkout, install its locked dependencies and Google Chrome, then run from the repository root:

```sh
pnpm exec tsx scripts/capture-readme-screenshots.mts
```

The script creates a temporary account, in-memory SQLite database, local file store, and five synthetic documents. It captures the actual browser UI without injected styles or image compositing, checks for browser errors, and closes the app and removes temporary data when finished. It does not access production documents or call an AI provider.

Review the PNGs in `artifacts/readme-screenshots/`, then copy the five matching JPEGs into this directory. The ignored `artifacts/readme-screenshots/report.json` records the app/package versions and capture details; the 2026-10-17 capture records host 0.1.31, and the 2026-11-22 capture records host 0.2.37. Refreshing on a newer checkout produces a new version-specific record. Optional environment variables: `DOCA_SCREENSHOT_OUTPUT` and `DOCA_SCREENSHOT_PORT` (default 39481).

## Desktop client screenshots

The three desktop images were captured on 2026-11-22 from the real desktop client and UI. They show an isolated loopback deployment with synthetic content and a debug client build (`com.smartdoca.desktop.docshots`) running with `DOCA_DESKTOP_TEST_DATA_DIR` pointing at a disposable profile, so no production data, documents, or credentials appear. Capture scripts and logs live in `artifacts/verification/desktop-doc-shots/`. The [desktop client guide](../desktop-client.md) embeds all three: the manager pages in its install-and-connect section and the workspace page in its workspace section.

| Image | Content |
| --- | --- |
| `desktop-manager-add.jpg` | Connection manager with an added, not-yet-signed-in backend and the add form |
| `desktop-manager.jpg` | Connection manager after browser sign-in: backend connected |
| `desktop-workspace.jpg` | Workspace window with multiple tabs and the switch-backend control |
