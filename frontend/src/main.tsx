import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { store } from './app/store'
import App from './App'
import { applyGoogleTranslateDomPatch } from './utils/googleTranslateDomPatch'
import './index.css'

// Must run before the app renders - see LanguageSwitcher for the widget this protects against.
applyGoogleTranslateDomPatch()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            // react-hot-toast ships its own fixed white/black styling - reading these from the same
            // --color-* custom properties every other component uses keeps toasts in sync with Light/Dark
            // instead of always popping up as a bright white card over a dark app.
            style: { background: 'var(--color-surface)', color: 'var(--color-ink-900)', border: '1px solid var(--color-ink-100)' },
          }}
        />
      </BrowserRouter>
    </Provider>
  </StrictMode>
)
