/** Supported interface languages. Add a code here before shipping another catalog. */
export const locales = ["zh", "en", "zh-Hant", "ja", "fr", "ko", "es", "ru"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "zh";

export const localeNames: Record<Locale, string> = {
  zh: "中文",
  en: "English",
  "zh-Hant": "繁體中文",
  ja: "日本語",
  fr: "Français",
  ko: "한국어",
  es: "Español",
  ru: "Русский",
};

export const localeMessages = {
  "locale.zh": localeNames.zh,
  "locale.en": localeNames.en,
  "locale.zh-Hant": localeNames["zh-Hant"],
  "locale.ja": localeNames.ja,
  "locale.fr": localeNames.fr,
  "locale.ko": localeNames.ko,
  "locale.es": localeNames.es,
  "locale.ru": localeNames.ru,
};

const htmlLangTags: Record<Locale, string> = {
  zh: "zh-CN",
  en: "en",
  "zh-Hant": "zh-Hant",
  ja: "ja",
  fr: "fr",
  ko: "ko",
  es: "es",
  ru: "ru",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && Object.hasOwn(localeNames, value);
}

/** Map a stored tag or BCP 47 language onto a supported locale. */
export function matchLocale(value: unknown): Locale | null {
  if (isLocale(value)) return value;
  if (typeof value !== "string") return null;
  const tag = value.trim().toLowerCase().replace(/_/g, "-");
  if (/^zh-(hant|tw|hk|mo)(-|$)/.test(tag)) return "zh-Hant";
  const primary = tag.split("-")[0];
  return isLocale(primary) ? primary : null;
}

export function htmlLang(locale: Locale) {
  return htmlLangTags[locale];
}

/** Select the existing language field of a contribution with a bilingual contract. */
export function bilingualLocale(locale: Locale): "zh" | "en" {
  return locale === "zh" ? "zh" : "en";
}
