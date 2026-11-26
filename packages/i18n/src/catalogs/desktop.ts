import catalog from "./desktop.json";

export const desktopEn = catalog.en;
export const desktopZh = catalog.zh satisfies Record<
  keyof typeof desktopEn,
  string
>;
export type DesktopMessageKey = keyof typeof desktopEn;
export const desktopCatalogs = catalog satisfies Record<
  import("../locales").Locale,
  Record<DesktopMessageKey, string>
>;
