import { desktopCatalogs, desktopEn, type DesktopMessageKey } from "./catalogs/desktop";
import type { Locale } from "./locales";
import { interpolate, lookupTemplate, type MessageValues } from "./message-template";

export { desktopEn, type DesktopMessageKey } from "./catalogs/desktop";
export { htmlLang, isLocale, localeNames, locales, matchLocale, type Locale } from "./locales";

export function createDesktopTranslator(locale: Locale) {
  const primary = desktopCatalogs[locale];
  return (key: DesktopMessageKey, values?: MessageValues) =>
    interpolate(lookupTemplate(primary, desktopEn, key, values), values);
}
