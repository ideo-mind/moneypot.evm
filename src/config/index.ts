export const DEMO_VIDEO_URL = "https://youtu.be/idCJSmm6QUs"

export const VERIFIER_API_URL =
  import.meta.env.VITE_VERIFIER_API_URL || "https://auth.money-pot.unreal.art"

export const WALLETCONNECT_PROJECT_ID =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "WalletConnect Project ID"

export const INFURA_API_KEY: string =
  (import.meta.env.VITE_INFURA_API_KEY as string) || "INFURA_API_KEY"

export const ALCHEMY_API_KEY: string =
  (import.meta.env.VITE_ALCHEMY_API_KEY as string) || "ALCHEMY_API_KEY"
