import type { MessageKey } from "./catalogs/en";
import { type Locale } from "./locales";

export { en, type MessageKey } from "./catalogs/en";
export { zh } from "./catalogs/zh";
export { catalogs } from "./catalogs";
export { createDesktopTranslator, desktopEn, type DesktopMessageKey } from "./desktop";
export {
  encodeSystemError,
  decodeSystemError,
  systemErrorMessage,
  type SystemErrorReason,
} from "./system-errors";
export {
  createTranslator,
  navigationTitle,
  translate,
} from "./translate";
export { interpolate, lookupTemplate, type MessageValues } from "./message-template";
export {
  bilingualLocale,
  defaultLocale,
  htmlLang,
  isLocale,
  localeNames,
  locales,
  matchLocale,
  type Locale,
} from "./locales";

/** Native name of each supported language. The label itself is not translated. */
export const localeLabel = {
  zh: "locale.zh",
  en: "locale.en",
  "zh-Hant": "locale.zh-Hant",
  ja: "locale.ja",
  fr: "locale.fr",
  ko: "locale.ko",
  es: "locale.es",
  ru: "locale.ru",
} as const satisfies Record<Locale, MessageKey>;
