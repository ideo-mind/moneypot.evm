/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MONEY_AUTH_URL: string
  readonly VITE_VERIFIER_API_URL: string
  readonly VITE_WALLETCONNECT_PROJECT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
