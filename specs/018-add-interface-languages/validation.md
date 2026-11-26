# Validation: Eight interface languages

**Spec**: [spec.md](spec.md)
**Result**: partial

The Doca 0.3.0 release candidate passed local language acceptance. Published release verification is tracked below.

## Language acceptance

| Acceptance ID | Result |
| --- | --- |
| AC-001 | The eight host catalogs have 3,980 matching keys and interpolation parameters. Isolated SQLite and Web checks verified canonical site and account writes, rejected regional and unsupported write values, retained `zh` and `en`, and restored the active choice on reload. Running the locale reader from Git tag `v0.2.46` against the eight stored values showed its existing fallback. The 0.3.0 reader recovered the original six new values from the same inputs. |
| AC-002 | Chromium opened all five editor formats in each of the eight languages from the production Web build. Switching to a second language and back changed the editor root language and native control labels while the original editing element remained connected and the server document epoch and sequence stayed the same. |
| AC-003 | The built desktop connection manager and tab shell passed eight language runs using an isolated native bridge and the actual Web workspace. The Rust suite passed 27 tests. Chromium loaded the built browser extension, selected each language and reopened the extension. The iOS simulator loaded Doca Settings, switched through all eight languages, reported the localized heading and selected radio option, and retained Russian across an app relaunch. |
| AC-004 | The project README and public docs have eight editions. The current 58 public pages are translated and previous releases retain their archived editions. The browser verified each documentation home, release and desktop-guide route under a `/doca/` base, each active language tag, and the matching images. The 72 documentation attachments were captured in a disposable Doca workspace and visually reviewed. |
| AC-005 | The five exact npm archives were downloaded from the public registry and matched the tested local artifacts byte for byte. The lockfile records their registry integrities and passed a frozen install. |

## npm integration

| Editor | Package | Version |
| --- | --- | --- |
| Rich text | `@smartdoca/slate` | `0.4.27` |
| Markdown | `@smartdoca/markdown` | `0.4.6` |
| Spreadsheet | `@smartdoca/sheet` | `0.2.21` |
| Canvas | `@smartdoca/canvas` | `0.5.17` |
| Slides | `@smartdoca/slides` | `0.3.0-alpha.6` |

The Markdown package was republished as 0.4.6 after a delay serving the previous archive. The candidates passed locale, build and package checks. Slate passed 262 tests with the caption IME case excluded after reproducing its existing failure on 0.4.26. Sheet passed 187 tests with one skipped, and Slides passed 207 with three skipped.

## Local checks

- The focused host run passed 190 tests across locale catalogs, SQLite preference behavior and the extension. The browser screenshot script exercised the editors through the Web app’s installed npm packages.
- Web and desktop production builds, Web and mobile type checks, the iOS bundle export, desktop Rust tests, the plugin SDK and deployment packages, `pnpm sdd:check`, `pnpm test:docs`, `pnpm docs:check`, and `pnpm docs:build` completed locally.
- The first full host test run encountered extension fixture, local PDF runtime, and AI timing failures. The extension fixtures passed the focused rerun. The PDF suite passed 10 tests with the pinned renderer and local libraries. The reduced-concurrency AI rerun passed 292 tests and reported five failures. Four also reproduced in a separate 0.2.46 checkout. The remaining case passed when run in isolation.

## Publication

Verify GitHub Release assets, the documentation deployment and both Docker Hub architectures after the release jobs complete.

Raw verification output belongs under `artifacts/verification/language-expansion/`.
