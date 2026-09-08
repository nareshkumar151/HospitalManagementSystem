import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Languages } from 'lucide-react'

const CONTAINER_ID = 'google_translate_element'
const SCRIPT_ID = 'google-translate-script'
const COOKIE_NAME = 'googtrans'
// Restricted to the four languages this hospital's staff and patients actually use. This is Google's own
// official Website Translator widget - a plain <script> tag plus a callback - not a jQuery plugin; the app
// has no other use for jQuery, so pulling it in just for this would be dead weight for no benefit.
const INCLUDED_LANGUAGES = 'en,hi,kn,te'

const LANGUAGES = [
  { code: 'en', native: 'English' },
  { code: 'hi', native: 'हिन्दी' },
  { code: 'kn', native: 'ಕನ್ನಡ' },
  { code: 'te', native: 'తెలుగు' },
] as const

declare global {
  interface Window {
    // Google's own untyped global for this widget - there's no official/reliable @types package for it.
    google?: any // eslint-disable-line @typescript-eslint/no-explicit-any
    googleTranslateElementInit?: () => void
  }
}

function initWidget() {
  if (!document.getElementById(CONTAINER_ID) || !window.google?.translate?.TranslateElement) return
  // Safe to call again against an already-initialized container - it just re-renders into it. Rendered
  // off-screen either way (see the JSX below), so which of Google's own layouts this uses doesn't matter -
  // only that the widget exists at all to read/apply the googtrans cookie below on load.
  new window.google.translate.TranslateElement(
    { pageLanguage: 'en', includedLanguages: INCLUDED_LANGUAGES, layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE, autoDisplay: false },
    CONTAINER_ID
  )
}

/** Google's widget stores the active translation as a `googtrans=/en/<code>` cookie (absent, or `/en/en`,
 * both mean "showing English") and re-applies it automatically on every load that sees the cookie. */
function readActiveLanguage(): string {
  return document.cookie.match(/googtrans=\/en\/(\w+)/)?.[1] ?? 'en'
}

/**
 * Switches language by setting (or clearing) that same cookie and reloading, rather than driving the
 * widget's own UI live. Two reasons this is the reliable path, not just the restyled one:
 *  - Google's own dropdown is a plain link that opens a cross-origin iframe popup - can't be restyled to
 *    match the app - so a custom dropdown driving its underlying <select> directly was tried first, but
 *    that <select> is only ever injected under Google's "Horizontal" layout, never under the compact
 *    "Simple" one this widget uses (confirmed by inspecting the live DOM) - so it silently did nothing.
 *  - Even with that <select> present, it never lists the source language (English) as one of its own
 *    options, so there is no live "undo" to trigger to get back to English - only a reload with the
 *    cookie cleared reliably restores the original page.
 */
function setLanguageAndReload(code: string) {
  const domain = window.location.hostname
  if (code === 'en') {
    document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
    document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain}`
  } else {
    document.cookie = `${COOKIE_NAME}=/en/${code}; path=/;`
    document.cookie = `${COOKIE_NAME}=/en/${code}; path=/; domain=${domain}`
  }
  window.location.reload()
}

/**
 * A custom-styled language switcher backed by Google's Website Translator widget, limited to English /
 * Hindi / Kannada / Telugu. Mounted in the signed-in app's Topbar and on the public LoginPage - the two
 * never render at once, so both safely share one container id. The underlying <script> loads at most once
 * per page (guarded by its own element id); every later mount just re-runs the widget's own init against
 * whichever container is live right now, since Google only invokes its `cb` callback the first time the
 * script itself finishes loading.
 *
 * See utils/googleTranslateDomPatch.ts for the DOM-patching workaround this widget needs to coexist with
 * React's own re-renders without crashing the app.
 */
export function LanguageSwitcher() {
  const [open, setOpen] = useState(false)
  const [active] = useState(readActiveLanguage)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.google?.translate?.TranslateElement) {
      initWidget()
    } else {
      window.googleTranslateElementInit = initWidget
      if (!document.getElementById(SCRIPT_ID)) {
        const script = document.createElement('script')
        script.id = SCRIPT_ID
        script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
        script.async = true
        document.body.appendChild(script)
      }
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const activeLang = LANGUAGES.find((l) => l.code === active) ?? LANGUAGES[0]

  return (
    // notranslate (Google's own recognized marker, both the class and the HTML `translate` attribute) -
    // without it, Google translates this control's own labels along with the rest of the page, which is
    // how "English" ends up rendered as "ಇಂಗ್ಲೀಷ್" once Kannada is active - inconsistently, since Google
    // translates some of these language names but not others, leaving the menu in a mix of scripts and no
    // reliable way back to a language the user can still read.
    <div className="relative notranslate" translate="no" ref={wrapperRef}>
      {/* Google's widget still needs a real, laid-out DOM container to initialize into - kept off-screen
          rather than display:none, since some builds of the widget skip rendering into a hidden container. */}
      <div id={CONTAINER_ID} style={{ position: 'absolute', top: -9999, left: -9999 }} />

      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-ink-100 px-3 py-1.5 text-xs font-medium text-ink-700 transition-colors hover:bg-surface-muted"
      >
        <Languages size={14} className="text-ink-500" />
        <span>{activeLang.native}</span>
        <ChevronDown size={12} className="text-ink-500" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 z-40 mt-2 w-40 overflow-hidden rounded-xl border border-ink-100 bg-surface py-1 shadow-[var(--shadow-pop)]"
          >
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => (lang.code === active ? setOpen(false) : setLanguageAndReload(lang.code))}
                className="flex w-full items-center justify-between px-3.5 py-2 text-sm text-ink-700 hover:bg-surface-muted"
              >
                <span>{lang.native}</span>
                {active === lang.code && <Check size={14} className="text-brand-600" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
