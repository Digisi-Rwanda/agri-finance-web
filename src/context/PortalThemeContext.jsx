import { createContext, useContext } from 'react'

/** Shared light/dark flag for portal pages and charts. */
export const PortalThemeContext = createContext({ isDark: true })

export function usePortalTheme() {
  return useContext(PortalThemeContext)
}
