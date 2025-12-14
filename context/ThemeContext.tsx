"use client"

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState
} from "react"

type Theme = "light" | "dark"

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = "helios_theme"

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Load theme from localStorage or default to dark
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null
    const initialTheme = storedTheme || "dark"
    setThemeState(initialTheme)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    // Apply theme to document
    document.documentElement.setAttribute("data-theme", theme)
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme, mounted])

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"))
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

