import en from "./messages/en.json";
import hi from "./messages/hi.json";
import bn from "./messages/bn.json";

export type Locale = "en" | "hi" | "bn";

const catalogs: Record<Locale, Record<string, string>> = { en, hi, bn };

export function parseLocale(value: string | null | undefined): Locale {
  if (value === "hi" || value === "bn") return value;
  return "en";
}

export function t(locale: Locale, key: string): string {
  return catalogs[locale][key] ?? catalogs.en[key] ?? key;
}

export const SUPPORTED_LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "bn", label: "বাংলা" },
];
