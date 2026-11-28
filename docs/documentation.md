# Documentation maintenance

**English** · [简体中文](documentation.zh-CN.md) · [繁體中文](documentation.zh-Hant.md) · [日本語](documentation.ja.md) · [Français](documentation.fr.md) · [한국어](documentation.ko.md) · [Español](documentation.es.md) · [Русский](documentation.ru.md)

The documentation uses Docsify 5.0.0. Markdown source stays in `docs/`; `docs/site/navigation.json` defines the public pages and their reading order. Technical contract source paths remain stable for repository and editor-skill references.

## Layout

| Group | Content |
| --- | --- |
| Getting started | Quick start, configuration, user guide, troubleshooting |
| User guides | Documents, sharing, permissions, notes, knowledge |
| Deployment and operations | Docker, storage, scaling, authentication, service credentials, webhooks |
| Development | Source setup, architecture, editors, collaboration, interface languages |
| Plugins | Development, installation, public services, contributions |
| Reference | API, database, SDK and editor contracts |
| Releases | Version-specific changes, requirements, and validation |
| Project | Documentation maintenance and original research/acceptance records |

Current public pages have eight language editions. The default source is `name.md`. Language suffixes, paths and navigation text are defined in `docs/site/languages.json`. Releases before 0.3.0, research, and acceptance records retain their original editions and verification scope. Label retired implementations and superseded proposals at the top of their source files. An implementation inventory distinguishes exported APIs, proposals, and unverified external-service/device behavior.

New changes follow the [tiered SDD workflow](sdd.md). The [module index](sdd-module-index.md) connects source, authoritative contracts and reusable checks. Specs describe individual changes; current technical contracts keep their existing source paths and are updated in the same PR when behavior changes.

## Check and preview

```sh
pnpm install --frozen-lockfile
pnpm docs:check
pnpm docs:dev
```

Open `http://127.0.0.1:39140/#/en/` or `http://127.0.0.1:39140/#/zh-cn/`. The preview reads documentation only and does not start Doca or connect to its databases. Re-run the command after source changes to regenerate the publication directory.

`pnpm docs:build` prepares `.cache/docs-site/` with folders such as `en/getting-started/` and `zh-cn/operations/`. It copies and rewrites Markdown links; Docsify renders content in the browser. It does not compile application code or pre-render the Markdown as HTML. The generated directory is ignored by Git.

Public-page links remain in the current language. The links under the title of a current English or Simplified Chinese article open the same article in the selected language. Source-code, example, and research links open the corresponding GitHub files. Each page also includes a source edit link and language navigation at the bottom.

`docs:check` inventories Markdown through Git, including unignored new files and excluding `tests/fixtures/`. It checks Markdown/HTML links and heading targets throughout repository documentation, including main-branch links to this repository. Ignored artifacts and dated external/tagged URLs are not fetched. Published heading anchors are additionally checked against Docsify rules. The check also compares the current release entrances, the editor package matrices, all database table/field rows (including inherited Schema interfaces), and the five portable skill references against their source documents. It reads TypeScript types without opening an application database. External website availability and semantic correctness of every claim still require review.

Run `pnpm test:docs` for the checker regression cases. After editing a contract, run `node scripts/sync-docs-skills.mjs`; it preserves source prose and rewrites relative links for use outside the checkout. An optional installed-skills directory argument updates installed references too. For example: `node scripts/sync-docs-skills.mjs /absolute/path/to/installed/skills`. Keep any installed copies synchronized under the relevant skill's maintenance rules.

## GitHub Pages

The `.github/workflows/docs.yml` workflow checks documentation on pull requests and publishes changes from `main`. Configure the repository under **Settings → Pages → Build and deployment → Source → GitHub Actions**. The workflow uses the `github-pages` deployment environment and its approval rules. It can also be run manually from Actions.

The documentation site has eight language home pages.

- [English](https://workhold.github.io/doca/#/en/)
- [简体中文](https://workhold.github.io/doca/#/zh-cn/)
- [繁體中文](https://workhold.github.io/doca/#/zh-hant/)
- [日本語](https://workhold.github.io/doca/#/ja/)
- [Français](https://workhold.github.io/doca/#/fr/)
- [한국어](https://workhold.github.io/doca/#/ko/)
- [Español](https://workhold.github.io/doca/#/es/)
- [Русский](https://workhold.github.io/doca/#/ru/)

These addresses become available after the workflow successfully deploys. README links point to their corresponding language entrances. The site uses the default GitHub Pages domain and requires no custom-domain DNS or repository CNAME file.

Serve the contents of `.cache/docs-site/` to publish elsewhere. Hash routing supports a repository subpath and direct refreshes without server route rewrites. The generated `.nojekyll` preserves underscored navigation files when hosted through Pages.

## Assets and updates

Reviewed verification summaries and documentation attachments are kept in [`docs/verification/`](verification/README.md), grouped by acceptance case or release. Reusable script inputs belong in `tests/fixtures/`. Generated logs, screenshots, reports and caches go in `artifacts/`, which is entirely ignored by Git; retaining new evidence requires no ignore-rule changes.

The Docsify runtime, search plugin, light/dark styles, and MIT license are vendored under `docs/site/assets/vendor/docsify/`. `README.txt` records the version and verified upstream npm tarball integrity. These resources load from the documentation site itself. Mermaid diagrams lazily load the pinned Mermaid ESM version in `site.js`; they require access to that CDN.

When adding a public page, create all eight editions, add the page to `navigation.json`, and run `pnpm docs:check` and `pnpm docs:build`. Link a non-public technical/design record from [research](research.md), and a reviewed verification summary from the [verification index](verification/README.md). Keep code examples and version requirements aligned. When updating a contract, follow the relevant repository skill and update its packaged references as required. Runtime assets and additional plugins require explicit version selection and browser verification.

The fourth value in a release’s navigation entry is `true` when it has all eight language editions. Keep that value after a later release ships. Put reviewed screenshots in the language subdirectory of `docs/images/` so the site and README can reference the matching interface.
