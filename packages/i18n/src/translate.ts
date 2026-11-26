import { catalogs } from "./catalogs";
import type { MessageKey } from "./catalogs/en";
import { bilingualLocale, type Locale } from "./locales";
import { interpolate, lookupTemplate, type MessageValues } from "./message-template";

export function translate(locale: Locale, key: MessageKey, values?: MessageValues) {
  return interpolate(lookupTemplate(catalogs[locale], catalogs.en, key, values), values);
}

export function createTranslator(locale: Locale) {
  return (key: MessageKey, values?: MessageValues) => translate(locale, key, values);
}

const navigationMessages: Readonly<Record<string, MessageKey>> = {
  "doca.home": "workspace.home",
  "doca.ai": "nav.assistant",
  "doca.documents": "nav.documents",
  "doca.libraries": "nav.libraries",
  "doca.knowledge-books": "books.title",
  "doca.files": "workspace.kind.folder",
  "doca.shared-files": "nav.sharedFiles",
  "doca.discover": "workspace.publicResources",
  "doca.groups": "groups.title",
  "doca.trash": "nav.trash",
  "doca.account": "account.profile",
  "doca.preferences": "account.settings",
  "doca.mcp": "mcp.title",
  "doca.tickets": "nav.tickets",
  "doca.admin": "navigation.slot.web.admin",
  "doca.search": "common.search",
  "doca.notifications": "shell.notifications",
};

type BilingualTitle = { readonly zh: string; readonly en: string };

export function navigationTitle(
  locale: Locale,
  entry: { id: string; title: BilingualTitle },
  customTitle?: BilingualTitle,
) {
  const key = Object.hasOwn(navigationMessages, entry.id) ? navigationMessages[entry.id] : undefined;
  return !customTitle && locale !== "zh" && locale !== "en" && key
    ? translate(locale, key)
    : (customTitle ?? entry.title)[bilingualLocale(locale)];
}
