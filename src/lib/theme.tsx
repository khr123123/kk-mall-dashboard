/**
 * ThemeProvider — wraps next-themes ThemeProvider and adds
 * high-contrast support via a separate class token.
 *
 * Usage:
 *   <ThemeProvider>
 *     <App />
 *   </ThemeProvider>
 *
 * Consumers use the `useTheme` hook from next-themes, plus
 * the `useHighContrast` hook from this file.
 */

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes"

// ── High-contrast context ─────────────────────────────────────
type HighContrastCtx = {
  highContrast: boolean
  toggleHighContrast: () => void
}

const HighContrastContext = React.createContext<HighContrastCtx>({
  highContrast: false,
  toggleHighContrast: () => {},
})

function HighContrastProvider({ children }: { children: React.ReactNode }) {
  const [highContrast, setHighContrast] = React.useState(() => {
    if (typeof window === "undefined") return false
    return (
      localStorage.getItem("high-contrast") === "true" ||
      window.matchMedia("(prefers-contrast: more)").matches
    )
  })

  // Apply / remove the `high-contrast` class on <html>
  React.useEffect(() => {
    const root = document.documentElement
    if (highContrast) {
      root.classList.add("high-contrast")
    } else {
      root.classList.remove("high-contrast")
    }
    localStorage.setItem("high-contrast", String(highContrast))
  }, [highContrast])

  // Sync with OS preference changes
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-contrast: more)")
    const handler = (e: MediaQueryListEvent) => setHighContrast(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  const toggleHighContrast = React.useCallback(
    () => setHighContrast((v) => !v),
    []
  )

  return (
    <HighContrastContext.Provider value={{ highContrast, toggleHighContrast }}>
      {children}
    </HighContrastContext.Provider>
  )
}

// ── Combined provider ─────────────────────────────────────────
interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
      storageKey="kmall-theme"
    >
      <HighContrastProvider>{children}</HighContrastProvider>
    </NextThemesProvider>
  )
}

// ── Public hooks ──────────────────────────────────────────────

/**
 * useTheme — extended theme hook that combines next-themes with
 * high-contrast support.
 */
export function useTheme() {
  const nextTheme = useNextTheme()
  const { highContrast, toggleHighContrast } = React.useContext(HighContrastContext)

  return {
    ...nextTheme,
    highContrast,
    toggleHighContrast,
  }
}

export { useNextTheme }
