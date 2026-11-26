# Documentation screenshots

Doca 0.3.0 publishes screenshots in eight language directories: `en`, `zh-cn`, `zh-hant`, `ja`, `fr`, `ko`, `es`, and `ru`. Each README links to its own directory.

| Image | Subject |
| --- | --- |
| `workspace.jpg` | Workspace with recent documents and the AI entry |
| `rich-text.jpg` | Team collaboration guide and document outline |
| `markdown.jpg` | Development notes in source and preview |
| `spreadsheet.jpg` | Project budget with formatting, totals, and formulas |
| `slides.jpg` | Product overview with four slides |
| `canvas.jpg` | Flowchart, mind map, and action table |
| `desktop-manager-add.jpg` | Connection manager with the add form |
| `desktop-manager.jpg` | Connection manager with an active backend |
| `desktop-workspace.jpg` | Desktop workspace with tabs and the backend control |

The capture script uses the actual Web build, an isolated SQLite database, and localized synthetic content. The desktop images use the built connection manager and shipped tab-shell HTML in Chromium with test responses from the native bridge. The workspace inside the tab shell runs against the isolated Doca server. No user documents or external AI services are involved.

To refresh one language, build the Web and desktop assets, then run the capture script from the repository root. Set `DOCA_SCREENSHOT_LOCALE` to the canonical interface locale from the [i18n contract](../i18n.md).

```sh
pnpm build
pnpm --dir apps/desktop build
DOCA_SCREENSHOT_BUILT=1 DOCA_SCREENSHOT_DESKTOP=1 DOCA_SCREENSHOT_LOCALE=fr \
  pnpm exec tsx scripts/capture-readme-screenshots.mts
```

Review the PNGs and the versioned `report.json` under `artifacts/readme-screenshots/`, then copy the selected JPEGs to the matching language directory. `DOCA_SCREENSHOT_OUTPUT` changes the capture directory. `DOCA_SCREENSHOT_PORT` changes the loopback port from 39481.

The screenshots at the root of this directory are retained as published documentation assets from the 0.2 series.
