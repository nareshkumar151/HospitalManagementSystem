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
        <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      </BrowserRouter>
    </Provider>
  </StrictMode>
)
