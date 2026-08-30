import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

const ACCESS_TOKEN_KEY = 'hms.accessToken'
const REFRESH_TOKEN_KEY = 'hms.refreshToken'

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  },
}

// Relative '/api/v1' works locally because vite.config.ts proxies it to the API dev server, and would also
// work in production if frontend+backend were served from the same origin. Deployed separately (e.g. an
// Azure Static Web App calling an Azure App Service API), set VITE_API_BASE_URL to the API's full origin
// at build time (see frontend/.env.production.example) so the SPA knows where to send requests.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL}/api/v1` : '/api/v1'

export const apiClient = axios.create({ baseURL: API_BASE_URL })

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStorage.getRefreshToken()
  if (!refreshToken) throw new Error('No refresh token available')

  // Plain axios, not apiClient, so it skips the Authorization interceptor - but it must still target the
  // same API origin as everything else.
  const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken })
  const { accessToken, refreshToken: newRefreshToken } = response.data
  tokenStorage.setTokens(accessToken, newRefreshToken)
  return accessToken
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && tokenStorage.getRefreshToken()) {
      originalRequest._retry = true
      try {
        refreshPromise ??= refreshAccessToken().finally(() => { refreshPromise = null })
        const newAccessToken = await refreshPromise
        originalRequest.headers = originalRequest.headers ?? {}
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return apiClient(originalRequest)
      } catch {
        tokenStorage.clear()
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

/** Uniform error message extraction from the API's ExceptionHandlingMiddleware JSON shape. */
export function extractErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { errors?: string[]; title?: string } | undefined
    if (data?.errors?.length) return data.errors.join(' ')
    if (data?.title) return data.title
  }
  return fallback
}

/**
 * Downloads a PDF (or any binary) endpoint that requires the auth header - a plain <a href> can't carry
 * Authorization, so this fetches via the authenticated axios client as a blob and triggers the save from
 * an in-memory object URL instead. Used by every "Download PDF" button (patient details, admission
 * document, discharge summary, bill receipt).
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  const response = await apiClient.get(url, { responseType: 'blob' })
  const blobUrl = window.URL.createObjectURL(response.data as Blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(blobUrl)
}
