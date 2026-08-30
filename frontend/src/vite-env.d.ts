/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Full origin of the deployed API (e.g. https://hms-api.azurewebsites.net) - see src/api/client.ts.
   * Leave unset for local dev (vite.config.ts proxies /api to the local API) or same-origin deployments. */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
