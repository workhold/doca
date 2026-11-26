import { en, type MessageKey } from "./en";
import { zh } from "./zh";
import { desktopCatalogs } from "./desktop";
import es from "./es.json";
import fr from "./fr.json";
import ja from "./ja.json";
import ko from "./ko.json";
import ru from "./ru.json";
import zhHant from "./zh-Hant.json";
import { localeMessages, type Locale } from "../locales";

export const catalogs = {
  en,
  zh,
  "zh-Hant": { ...zhHant, ...desktopCatalogs["zh-Hant"], ...localeMessages },
  ja: { ...ja, ...desktopCatalogs.ja, ...localeMessages },
  fr: { ...fr, ...desktopCatalogs.fr, ...localeMessages },
  ko: { ...ko, ...desktopCatalogs.ko, ...localeMessages },
  es: { ...es, ...desktopCatalogs.es, ...localeMessages },
  ru: { ...ru, ...desktopCatalogs.ru, ...localeMessages },
} satisfies Record<Locale, Readonly<Record<MessageKey, string>>>;
