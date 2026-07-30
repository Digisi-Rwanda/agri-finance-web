import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_AUTH_LOCALE,
  SUPPORTED_AUTH_LOCALES,
  getAuthCopy,
} from '../constants/authLocales'

const STORAGE_KEY = 'agri.auth.locale'

const AuthLocaleContext = createContext({
  locale: DEFAULT_AUTH_LOCALE,
  setLocale: () => {},
  copy: getAuthCopy(DEFAULT_AUTH_LOCALE),
})

function readInitialLocale() {
  if (typeof window === 'undefined') return DEFAULT_AUTH_LOCALE

  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (SUPPORTED_AUTH_LOCALES.includes(stored)) return stored

  const preferred = window.navigator.languages ?? [window.navigator.language]
  for (const tag of preferred) {
    const base = String(tag || '').toLowerCase().split('-')[0]
    if (SUPPORTED_AUTH_LOCALES.includes(base)) return base
  }
  return DEFAULT_AUTH_LOCALE
}

export function AuthLocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(readInitialLocale)

  const setLocale = useCallback((next) => {
    if (!SUPPORTED_AUTH_LOCALES.includes(next)) return
    setLocaleState(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo(
    () => ({ locale, setLocale, copy: getAuthCopy(locale) }),
    [locale, setLocale],
  )

  return <AuthLocaleContext.Provider value={value}>{children}</AuthLocaleContext.Provider>
}

// Hooks live next to the provider so consumers import one module.
/* eslint-disable react-refresh/only-export-components */
export function useAuthLocale() {
  return useContext(AuthLocaleContext)
}

/** Copy tree for the active locale, with English filling any untranslated key. */
export function useAuthCopy() {
  return useContext(AuthLocaleContext).copy
}
/* eslint-enable react-refresh/only-export-components */
