export const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'nl', label: 'Nederlands' },
] as const

export type LocaleCode = (typeof LOCALES)[number]['code']

const STORAGE_KEY = 'locale'

function isLocaleCode(value: string | null | undefined): value is LocaleCode {
  return LOCALES.some((locale) => locale.code === value)
}

// Stored choice first, then the browser language, then English.
export function getInitialLocale(): LocaleCode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isLocaleCode(stored)) return stored
  } catch {
    // Storage may be unavailable (private mode); fall through.
  }
  const browser = navigator.language.slice(0, 2)
  return isLocaleCode(browser) ? browser : 'en'
}

export function storeLocale(locale: LocaleCode): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Not persisting is fine.
  }
}
