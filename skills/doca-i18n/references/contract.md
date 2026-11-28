# Interface languages

**English** · [简体中文](https://github.com/workhold/doca/blob/main/docs/i18n.zh-CN.md) · [繁體中文](https://github.com/workhold/doca/blob/main/docs/i18n.zh-Hant.md) · [日本語](https://github.com/workhold/doca/blob/main/docs/i18n.ja.md) · [Français](https://github.com/workhold/doca/blob/main/docs/i18n.fr.md) · [한국어](https://github.com/workhold/doca/blob/main/docs/i18n.ko.md) · [Español](https://github.com/workhold/doca/blob/main/docs/i18n.es.md) · [Русский](https://github.com/workhold/doca/blob/main/docs/i18n.ru.md)

This is the source document. Editor subpackages read the same rules through `skills/doca-i18n`, which may also be installed as `$doca-i18n`. When this file changes, update the skill's `references/contract.md` and every installed copy.

Doca 0.3.0 supports eight interface languages. Each language has its own catalog and uses the shared message keys.

Interface copy uses English keys. Chinese, English, and any later language are translations of that key. Do not use a Chinese sentence or a full English sentence as a key.

## Language codes

| Code | Meaning | `html lang` |
| --- | --- | --- |
| `zh` | Chinese | `zh-CN` |
| `en` | English | `en` |
| `zh-Hant` | Traditional Chinese | `zh-Hant` |
| `ja` | Japanese | `ja` |
| `fr` | French | `fr` |
| `ko` | Korean | `ko` |
| `es` | Spanish | `es` |
| `ru` | Russian | `ru` |

Allowed codes live in `locales` in `packages/i18n`. The site can set a default language. The initial site default is Simplified Chinese. Visitors and users who have not set `ui.locale` use the site default. A saved user choice wins.

Write endpoints require a code from the table. When matching regional or system language tags, `zh-TW`, `zh-HK`, `zh-MO`, and `zh-Hant` select Traditional Chinese. Other supported languages match their primary language tag. Workspace reads use the site default for an unrecognized saved value.

A signed-in choice is page state `ui.locale`. The browser also stores `doca.locale` in `localStorage`. Mobile stores it on the device. An assistant can change `ui.locale` through the existing `page_state`.

Each page load starts the Web login screen in the administrator's current site default language. Its language selector applies immediately for the current visit. After sign-in, the workspace resolves its language from `ui.locale` and the site default.

## Host catalog

Catalogs are in `packages/i18n`. The English catalog `en` is the source of keys. Every other language must cover exactly the same keys.

```ts
t("account.expires", { date })
// en: Expires {date}
// zh: 到期时间：{date}
```

- Keys are lowercase English with dots, grouped by area, for example `nav.trash` and `settings.language`.
- Placeholders are `{name}`. Do not split a sentence and concatenate the pieces.
- Plurals use `files.count.one` and `files.count.other`. The call is still `t("files.count", { count })`. English uses `one` when `count === 1` and `other` otherwise. Chinese may use the same sentence for both.
- A missing translation uses English, then the key itself.
- Use each language’s own name in selectors. The native labels come from `localeNames`.
- Dates and sorting use `Intl` for the active language tag.
- Document titles, body text, comments, mail, file names, and user input are not translated.

The web app uses `useI18n()` for `locale`, `t`, and `setLocale`. Ant Design and Ant Design X follow that `locale`. Desktop and mobile use the host catalogs. The browser extension remembers its language for that browser. Contributions using the bilingual plugin contract use its English field in the six new languages.

Uncoded user-visible server errors are still Chinese sentences. New validation errors use a stable code such as `invalid_locale`, and the interface translates it. Existing API errors are not all converted in this version.

New AI image-generation, model-connection, and worker errors use an explicit presentation envelope, serialized into the existing error text fields:

```ts
{ type: "system_error", version: 1, code: "image_edit_failed", data: { status: 422 } }
```

Only newly produced, explicitly coded system errors use this format. Historical error text, messages, tool results, reasoning, and stored prompt context are read verbatim; do not scan, translate, convert, or migrate them. Untagged errors remain unchanged. Web and mobile share the `systemErrorMessage` reader in `@doca/i18n`. Tagged job errors use `useI18n().t`; new HTTP errors use the locale selected by the same provider. Unknown codes show a catalogued generic error, while malformed or unsupported envelopes are left unchanged.

`AppError.message` and model-facing error serialization stay unchanged. Presentation metadata lives outside the error object in a WeakMap. Image failure checkpoints carry a separate structured reason so later task failure can display it without changing the canonical tool feedback. Interface language is never added to the system prompt, tool definitions, or replayed history, preserving the cached model prefix when the user switches languages.

This is the agreed read policy for old plain text and new coded errors; there is no historical-data or database-schema migration. A rollback must stop new envelope writes while retaining the envelope reader and all stored data.

## Persisted system state

Databases, job checkpoints, event streams, and API responses store stable English codes and structured parameters. They do not store a display sentence in any language. The web and mobile apps turn the code into a title, description, and phase name with the current catalog.

```ts
{ code: "folder_available", data: { name: "Research" } }
t("ai.progress.event.folderAvailable", { name: event.data.name })
```

Phases, events, approvals, and error reasons stored as status follow this rule. Compare codes, for example `phase === "completed"`. Do not compare the result of `t(...)` or a Chinese or English label. User input, model answers, document titles, file names, and web sources stay as written. Do not rewrite natural content into codes.

## Editor subpackages

An editor subpackage keeps its own interface copy. It does not import Doca's catalog or read Doca page state.

The host passes:

```tsx
<RichTextEditor locale={locale} />
```

`locale` is a string. The installed editors accept the eight codes in the table. An unrecognized package locale falls back to English.

1. Add an optional `locale?: string`. When it is omitted, show `zh`, matching the current Chinese interface.
2. Keys are stable English identifiers such as `toolbar.bold` and `find.replaceAll`.
3. Provide a complete catalog of the same keys for each supported language.
4. Placeholders are `{name}`. Counts use `key.one` and `key.other`, selected by `count`.
5. Changing `locale` updates buttons, menus, placeholders, and hints. It does not rebuild the document, the Y.Doc, the collaboration adapter, or the plugin list.
6. An optional `messages?: Record<string, string>` may override individual keys. Missing keys still use the built-in translation.
7. Text, formulas, and cell values the user wrote into the document are not translated.

After the installed package's types include `locale`, the host passes the current `locale` at the mount site. Do not put `locale` in a dependency that rebuilds the document, Y.Doc, collaboration adapter, or plugin list.

## Add a language

1. Add the code to `locales`, and the `html lang` value.
2. Add a host catalog with exactly the English keys.
3. Add the language's own name, for example `locale.ja`.
4. Add the matching Ant Design locale on the web app.
5. Add the same language catalog in every editor subpackage.
6. `ui.locale` accepts the new code because validation reads the same `locales` list.
