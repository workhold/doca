import xEnUS from "@ant-design/x/locale/en_US";
import xZhCN from "@ant-design/x/locale/zh_CN";
import enUS from "antd/locale/en_US";
import esES from "antd/locale/es_ES";
import frFR from "antd/locale/fr_FR";
import jaJP from "antd/locale/ja_JP";
import koKR from "antd/locale/ko_KR";
import ruRU from "antd/locale/ru_RU";
import zhCN from "antd/locale/zh_CN";
import zhTW from "antd/locale/zh_TW";
import type { Locale } from "@doca/i18n";
import xTranslations from "./antd-x-locales.json";

const antLocales = { en: enUS, es: esES, fr: frFR, ja: jaJP, ko: koKR, ru: ruRU, zh: zhCN, "zh-Hant": zhTW };

export function antdLocale(locale: Locale) {
  return antLocales[locale];
}

export function antDesignXLocale(locale: Locale) {
  if (locale === "en") return xEnUS;
  if (locale === "zh") return xZhCN;
  return { ...antdLocale(locale), ...xTranslations[locale] };
}
