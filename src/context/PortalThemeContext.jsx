import { createContext, useContext } from 'react'

/** Shared light/dark flag for portal pages and charts. */
export const PortalThemeContext = createContext({
  isDark: false,
  setIsDark: () => {},
})

export function usePortalTheme() {
  return useContext(PortalThemeContext)
}
