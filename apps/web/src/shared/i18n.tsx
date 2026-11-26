import {
  createTranslator,
  defaultLocale,
  htmlLang,
  isLocale,
  matchLocale,
  type Locale,
  type MessageKey,
  type MessageValues,
} from "@doca/i18n";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  readPageState,
  writePageState,
} from "@web/features/page-state/client.js";
import { setAPIErrorLocale } from "./system-errors.js";

const storageKey = "doca.locale";

function storedLocale(): Locale {
  try {
    return matchLocale(localStorage.getItem(storageKey)) ?? defaultLocale;
  } catch {
    return defaultLocale;
  }
}

type I18nValue = {
  locale: Locale;
  t: (key: MessageKey, values?: MessageValues) => string;
  setLocale: (locale: Locale) => Promise<void>;
  setLoginLocale: (locale: Locale) => void;
  reloadLocale: (siteLocale?: string, signedIn?: boolean) => Promise<void>;
};

const I18nContext = createContext<I18nValue | null>(null);

/** Forward the host context into SDK-owned React roots without locale effects. */
export function LocaleScope({ value, children }: { value: I18nValue; children: ReactNode }) {
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function LocaleProvider({ children, initialLocale }: { children: ReactNode; initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(() => initialLocale ?? storedLocale());
  const loginLocale = useRef<Locale | null>(null);
  const localeRequest = useRef(0);
  useEffect(() => {
    if (initialLocale) setLocaleState(initialLocale);
  }, [initialLocale]);
  useLayoutEffect(() => {
    setAPIErrorLocale(locale);
  }, [locale]);
  useEffect(() => {
    document.documentElement.lang = htmlLang(locale);
    try {
      localStorage.setItem(storageKey, locale);
    } catch {}
  }, [locale]);
  useEffect(() => {
    const onPageState = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string; value?: unknown }>)
        .detail;
      if (detail?.key !== "ui.locale") return;
      const next = matchLocale(detail.value);
      if (next) setLocaleState(next);
    };
    window.addEventListener("doca-page-state", onPageState);
    return () => window.removeEventListener("doca-page-state", onPageState);
  }, []);
  const reloadLocale = useCallback(
    async (siteLocale?: string, signedIn = true) => {
      const request = ++localeRequest.current;
      const fallback = matchLocale(siteLocale) ?? defaultLocale;
      if (!signedIn) {
        setLocaleState(loginLocale.current ?? fallback);
        return;
      }
      let resolved = fallback;
      try {
        const item = await readPageState<unknown>("ui.locale");
        resolved = matchLocale(item?.value) ?? fallback;
      } catch {}
      if (localeRequest.current === request) setLocaleState(resolved);
    },
    [],
  );
  const setLoginLocale = useCallback((next: Locale) => {
    if (!isLocale(next)) return;
    ++localeRequest.current;
    loginLocale.current = next;
    setLocaleState(next);
  }, []);
  const setLocale = useCallback(async (next: Locale) => {
    if (!isLocale(next)) return;
    const request = ++localeRequest.current;
    setLocaleState(next);
    try {
      const item = await writePageState("ui.locale", next);
      if (item && localeRequest.current === request)
        window.dispatchEvent(
          new CustomEvent("doca-page-state", { detail: item }),
        );
    } catch {}
  }, []);
  const value = useMemo<I18nValue>(
    () => ({
      locale,
      t: createTranslator(locale),
      setLocale,
      setLoginLocale,
      reloadLocale,
    }),
    [locale, setLocale, setLoginLocale, reloadLocale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used within LocaleProvider");
  return value;
}
