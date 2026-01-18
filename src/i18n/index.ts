import en from './locales/en.json'
import fr from './locales/fr.json'
import he from './locales/he.json'

// 3 langues supportées : Français, Anglais, Hébreu
export const locales = ['fr', 'en', 'he'] as const
export type Locale = (typeof locales)[number]

// Hébreu par défaut pour le site public (franchisé en Israël)
export const defaultLocale: Locale = 'he'

// Français par défaut pour le CRM admin
export const defaultAdminLocale: Locale = 'fr'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const translations: Record<Locale, any> = { en, fr, he }

export function getTranslations(locale: Locale) {
  return translations[locale] || translations.he
}

export function getDirection(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'he' ? 'rtl' : 'ltr'
}

export const languageNames: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
  he: 'עברית',
}

export const languageFlags: Record<Locale, string> = {
  fr: '🇫🇷',
  en: '🇺🇸',
  he: '🇮🇱',
}

// Clé localStorage pour le site public
export const PUBLIC_LOCALE_KEY = 'locale'

// Clé localStorage pour le CRM admin
export const ADMIN_LOCALE_KEY = 'admin_locale'
