import { expect, it } from "vitest";
import { catalogs, en, htmlLang, interpolate, locales, lookupTemplate, matchLocale, translate } from "@doca/i18n";
import { normalizePageStateValue } from "@core/modules/page-state.js";

it.each(locales)("keeps the %s catalog aligned with the English keys and placeholders", (locale) => {
  const catalog = catalogs[locale];
  const keys = Object.keys(en).sort() as Array<keyof typeof en>;
  expect(Object.keys(catalog).sort()).toEqual(keys);
  const tokens = (value: string) => (value.match(/\{\w+\}/g) ?? []).sort();
  for (const key of keys) {
    expect(catalog[key].trim(), key).not.toBe("");
    expect(tokens(catalog[key]), key).toEqual(tokens(en[key]));
  }
});

it("translates with English keys, placeholders, and an English fallback", () => {
  expect(translate("zh", "nav.documents")).toBe("在线文档");
  expect(translate("en", "account.expires", { date: "Jan 1" })).toBe("Expires Jan 1");
  expect(interpolate("Hello {name}", {})).toBe("Hello {name}");
  expect(lookupTemplate({ "files.count.one": "{count} file" }, {}, "files.count", { count: 1 })).toBe(
    "{count} file",
  );
  expect(lookupTemplate({}, { "files.count.other": "{count} files" }, "files.count", { count: 2 })).toBe(
    "{count} files",
  );
  expect(translate("zh", "common.failed")).toBe("操作失败");
});

it("accepts only supported interface locales", () => {
  for (const locale of locales) {
    expect(normalizePageStateValue("ui.locale", locale)).toBe(locale);
    expect(matchLocale(htmlLang(locale))).toBe(locale);
  }
  for (const value of ["ar", "zh-TW", "fr-FR", "constructor", null, {}]) {
    expect(() => normalizePageStateValue("ui.locale", value)).toThrow(/invalid_locale/);
  }
});

it("recognizes regional interface tags without changing canonical write values", () => {
  expect(["zh-TW", "zh-HK", "zh_mo", "zh-Hant-HK"].map(matchLocale))
    .toEqual(["zh-Hant", "zh-Hant", "zh-Hant", "zh-Hant"]);
  expect(["zh-CN", "zh-Hans-TW", "en-GB", "ja-JP", "fr-CA", "ko-KR", "es-MX", "ru-RU"].map(matchLocale))
    .toEqual(["zh", "zh", "en", "ja", "fr", "ko", "es", "ru"]);
  expect(matchLocale("ar-SA")).toBeNull();
});

it.each([
  ["zh-Hant", "搜尋"],
  ["ja", "検索"],
  ["fr", "Rechercher"],
  ["ko", "검색"],
  ["es", "Buscar"],
  ["ru", "Поиск"],
] as const)("translates a common control in %s", (locale, label) => {
  expect(translate(locale, "common.search")).toBe(label);
});
