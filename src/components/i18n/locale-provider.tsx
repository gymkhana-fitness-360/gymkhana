"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { parseLocale, t, type Locale, SUPPORTED_LOCALES } from "@/lib/i18n";

const STORAGE_KEY = "fitness360-locale";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  translate: (key: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return "en";
    return parseLocale(localStorage.getItem(STORAGE_KEY));
  });

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      translate: (key: string) => t(locale, key),
    }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    return {
      locale: "en" as Locale,
      setLocale: () => {},
      translate: (key: string) => t("en", key),
    };
  }
  return ctx;
}

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  return (
    <select
      className="rounded-md border border-border bg-background px-2 py-1 text-sm"
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      aria-label="Language"
    >
      {SUPPORTED_LOCALES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
