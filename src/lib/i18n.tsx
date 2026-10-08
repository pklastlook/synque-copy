"use client";

import * as React from "react";

/**
 * SYNQUE i18n — lightweight client-side translation system.
 *
 * Architecture:
 *   - Translation dictionaries live in `src/locales/{en,ar,es}.json`.
 *   - The active language is resolved from (in priority order):
 *       1. localStorage key `synque-language` (set by the Settings → Profile
 *          language selector)
 *       2. `user.language` from the auth store (loaded from the JWT/User row)
 *       3. The browser's `navigator.language` (if it maps to one of our locales)
 *       4. `"en"` (English — always available, full coverage)
 *
 * We don't pull in `next-intl`'s heavy SSR machinery because every visible
 * string in the app renders inside a client-side view switcher (the AppShell
 * uses Zustand for view selection). A simple `t(key)` hook is sufficient
 * AND keeps the bundle small.
 *
 * Adding a new string:
 *   1. Add the key to `en.json` (the canonical/source dictionary).
 *   2. Add the translated value to `ar.json` and `es.json`.
 *   3. Call `const { t } = useTranslation(); t("my.key")` in any component.
 *
 * Missing translations fall back to English; missing English falls back to
 * the raw key (so devs can spot un-translated strings during dev).
 *
 * RTL: when the active language is Arabic (`ar`), the caller should set
 * `document.documentElement.dir = "rtl"`. The `<LanguageHtmlDirEffect />`
 * component below does this automatically — drop it into the app shell.
 */

export type Locale = "en" | "ar" | "es";

const LOCALE_FILES = {
  en: () => import("@/locales/en.json"),
  ar: () => import("@/locales/ar.json"),
  es: () => import("@/locales/es.json"),
};

/** Languages we ship in the UI picker. */
export const AVAILABLE_LOCALES: { code: Locale; label: string; nativeLabel: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", label: "English", nativeLabel: "English", dir: "ltr" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", dir: "rtl" },
  { code: "es", label: "Spanish", nativeLabel: "Español", dir: "ltr" },
];

const STORAGE_KEY = "synque-language";

/** Map a raw user.language string (e.g. "en-US", "ar-EG", "es-419") to one of our locales. */
export function resolveLocale(raw: string | null | undefined): Locale {
  if (!raw) return "en";
  const lower = raw.toLowerCase();
  if (lower.startsWith("ar")) return "ar";
  if (lower.startsWith("es")) return "es";
  if (lower.startsWith("en")) return "en";
  return "en";
}

/** Read the locally-cached language (set by the Settings picker). */
export function getStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    if (raw === "en" || raw === "ar" || raw === "es") return raw;
    return null;
  } catch {
    return null;
  }
}

/** Persist the user's language choice so the next page load picks it up instantly. */
export function setStoredLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // localStorage may be unavailable in private-mode iframes — no-op.
  }
}

/** Detect the browser's preferred locale (used as a fallback before the user logs in). */
function browserLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  return resolveLocale(navigator.language);
}

type Dict = Record<string, string>;

// Cache loaded dictionaries so we don't re-fetch on every render.
const dictCache: Partial<Record<Locale, Dict>> = {};

async function loadDict(locale: Locale): Promise<Dict> {
  if (dictCache[locale]) return dictCache[locale]!;
  const mod = await LOCALE_FILES[locale]();
  const dict = mod.default as Dict;
  dictCache[locale] = dict;
  return dict;
}

// English is always loaded synchronously (the source dictionary).
let enDict: Dict | null = null;

interface TranslationContextValue {
  locale: Locale;
  /** Returns the translated string for `key`. Falls back to English, then to the key itself. */
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Set the active locale. Persists to localStorage + triggers a re-render of consumers. */
  setLocale: (locale: Locale) => void;
  /** Whether the active locale's text direction is RTL. */
  isRtl: boolean;
}

const TranslationContext = React.createContext<TranslationContextValue | null>(null);

export function TranslationProvider({ children, initialLocale }: { children: React.ReactNode; initialLocale?: Locale }) {
  // Resolve the initial locale: explicit prop → localStorage → "en".
  const [locale, setLocaleState] = React.useState<Locale>(() => {
    return initialLocale ?? getStoredLocale() ?? "en";
  });
  const [dict, setDict] = React.useState<Dict | null>(null);

  // Load the dictionary whenever the locale changes.
  React.useEffect(() => {
    let cancelled = false;
    loadDict(locale).then((d) => {
      if (!cancelled) setDict(d);
    });
    return () => { cancelled = true; };
  }, [locale]);

  // Keep the cache primed with the English dictionary for fallback.
  React.useEffect(() => {
    if (!enDict) {
      loadDict("en").then((d) => { enDict = d; }).catch(() => {});
    }
  }, []);

  const setLocale = React.useCallback((next: Locale) => {
    setStoredLocale(next);
    setLocaleState(next);
  }, []);

  const t = React.useCallback((key: string, vars?: Record<string, string | number>) => {
    const lookup = dict ?? enDict ?? {};
    // Try the active locale first, then fall back to English, then to the key.
    let raw = lookup[key] ?? enDict?.[key] ?? key;
    if (vars) {
      // Simple {var} placeholder interpolation.
      for (const [k, v] of Object.entries(vars)) {
        raw = raw.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return raw;
  }, [dict]);

  const value: TranslationContextValue = React.useMemo(() => ({
    locale,
    t,
    setLocale,
    isRtl: locale === "ar",
  }), [locale, t, setLocale]);

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

/**
 * `useTranslation()` — the main hook components call.
 *
 * Returns `{ t, locale, setLocale, isRtl }`. If used outside a
 * `<TranslationProvider>`, falls back to a no-op translator that returns
 * the raw key (so the app keeps rendering — useful for tests/SSR).
 */
export function useTranslation(): TranslationContextValue {
  const ctx = React.useContext(TranslationContext);
  // Default to English with a pass-through translator outside the provider.
  return ctx ?? {
    locale: "en",
    t: (key: string) => key,
    setLocale: () => {},
    isRtl: false,
  };
}

/**
 * Side-effect component: syncs `document.documentElement.lang` + `dir` with
 * the active locale. Drop one of these into the app shell; it renders nothing.
 *
 * Arabic (ar) → dir="rtl"; all other locales → dir="ltr".
 */
export function LanguageHtmlDirEffect() {
  const { locale, isRtl } = useTranslation();
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
  }, [locale, isRtl]);
  return null;
}

/**
 * Resolve the locale for a logged-in user.
 *
 * Priority: localStorage override → user.language → browser locale → "en".
 * Used by the AppShell to seed the TranslationProvider's initialLocale.
 */
export function resolveUserLocale(userLanguage: string | null | undefined): Locale {
  return getStoredLocale() ?? resolveLocale(userLanguage) ?? browserLocale();
}
