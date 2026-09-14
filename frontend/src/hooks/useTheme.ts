import { useCallback, useEffect, useState } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'hms-theme'

/** Reads document.documentElement's current data-theme attribute, or 'system' when unset (see index.css -
 * "system" is the absence of the attribute, letting prefers-color-scheme alone decide). */
function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // localStorage can throw in a private window with site data blocked - fall through to 'system'.
  }
  return 'system'
}

function applyPreference(preference: ThemePreference) {
  if (preference === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', preference)
}

/**
 * Light/Dark/System toggle - see index.css for the actual repainting (every component is themed purely
 * through --color-* custom properties, so flipping data-theme on <html> re-themes the whole app for free).
 * The very first paint is handled by a blocking inline script in index.html, before React or this hook ever
 * runs, so there's no flash of the wrong theme on load; this hook only needs to handle later changes.
 */
export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(readStoredPreference)

  const setTheme = useCallback((next: ThemePreference) => {
    setPreference(next)
    applyPreference(next)
    try {
      if (next === 'system') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Private window / site data blocked - the in-memory preference above still applies for this tab.
    }
  }, [])

  // Kept in sync across tabs (another tab's toggle) and, while on 'system', with a live OS-level change.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      setPreference(readStoredPreference())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return { preference, setTheme }
}
