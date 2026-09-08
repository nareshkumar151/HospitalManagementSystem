import { useEffect } from 'react'
import { Languages } from 'lucide-react'

const CONTAINER_ID = 'google_translate_element'
const SCRIPT_ID = 'google-translate-script'
// Restricted to the four languages this hospital's staff and patients actually use. This is Google's own
// official Website Translator widget - a plain <script> tag plus a callback - not a jQuery plugin; the app
// has no other use for jQuery, so pulling it in just for this would be dead weight for no benefit.
const INCLUDED_LANGUAGES = 'en,hi,kn,te'

declare global {
  interface Window {
    // Google's own untyped global for this widget - there's no official/reliable @types package for it.
    google?: any // eslint-disable-line @typescript-eslint/no-explicit-any
    googleTranslateElementInit?: () => void
  }
}

function initWidget() {
  if (!document.getElementById(CONTAINER_ID) || !window.google?.translate?.TranslateElement) return
  // Safe to call again against an already-initialized container - it just re-renders the dropdown.
  new window.google.translate.TranslateElement(
    {
      pageLanguage: 'en',
      includedLanguages: INCLUDED_LANGUAGES,
      layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
      autoDisplay: false,
    },
    CONTAINER_ID
  )
}

/**
 * Google Website Translator widget, limited to English / Hindi / Kannada / Telugu. Mounted once in the
 * signed-in app shell (Topbar) and once on the public LoginPage - the two are never on screen at the same
 * time, so both can safely use the same container id. The underlying <script> is loaded at most once per
 * page load (guarded by its own element id); every later mount just re-runs the widget's own init against
 * whichever container is live right now, since Google only invokes its `cb` callback the first time the
 * script itself finishes loading.
 *
 * See utils/googleTranslateDomPatch.ts for the DOM-patching workaround this widget needs to coexist with
 * React's own re-renders without crashing the app.
 */
export function LanguageSwitcher() {
  useEffect(() => {
    if (window.google?.translate?.TranslateElement) {
      initWidget()
      return
    }
    window.googleTranslateElementInit = initWidget
    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement('script')
      script.id = SCRIPT_ID
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
      script.async = true
      document.body.appendChild(script)
    }
  }, [])

  return (
    <div className="hms-google-translate flex items-center gap-1.5 text-ink-500">
      <Languages size={16} className="shrink-0" />
      <div id={CONTAINER_ID} />
    </div>
  )
}
