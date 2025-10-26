/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MONEY_AUTH_URL: string
  readonly VITE_VERIFIER_API_URL: string
  readonly VITE_WALLETCONNECT_PROJECT_ID: string
  readonly VITE_INFURA_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
