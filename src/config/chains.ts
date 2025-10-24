import { defineChain } from "viem"
import { blockscoutConfig } from "@/lib/blockscout-config"

// Creditcoin Testnet Configuration
export const creditcoinTestnet = defineChain({
  id: 102031,
  name: "Creditcoin Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Creditcoin",
    symbol: "CTC",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.cc3-testnet.creditcoin.network"],
      webSocket: ["wss://rpc.cc3-testnet.creditcoin.network"],
    },
    public: {
      http: ["https://rpc.cc3-testnet.creditcoin.network"],
      webSocket: ["wss://rpc.cc3-testnet.creditcoin.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://creditcoin-testnet.blockscout.com",
    },
  },
  testnet: true,
})

// Future: Creditcoin Mainnet Configuration
// export const creditcoinMainnet = defineChain({
//   id: 102030,
//   name: "Creditcoin Mainnet",
//   nativeCurrency: {
//     decimals: 18,
//     name: "Creditcoin",
//     symbol: "CTC",
//   },
//   rpcUrls: {
//     default: {
//       http: ["https://rpc.cc3.creditcoin.network"],
//       webSocket: ["wss://rpc.cc3.creditcoin.network"],
//     },
//     public: {
//       http: ["https://rpc.cc3.creditcoin.network"],
//       webSocket: ["wss://rpc.cc3.creditcoin.network"],
//     },
//   },
//   blockExplorers: {
//     default: {
//       name: "Blockscout",
//       url: "https://creditcoin.blockscout.com",
//     },
//   },
//   testnet: false,
// });

// Chain configuration interface
export interface ChainConfig {
  id: number
  name: string
  rpcUrl: string
  explorerUrl: string
  apiUrl: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  isTestnet: boolean
  isActive: boolean
  blockscoutSupported: boolean
}

// Available chains configuration
export const AVAILABLE_CHAINS: ChainConfig[] = [
  {
    id: 102031,
    name: "Creditcoin Testnet",
    rpcUrl: "https://rpc.cc3-testnet.creditcoin.network",
    explorerUrl: "https://creditcoin-testnet.blockscout.com",
    apiUrl: "https://creditcoin-testnet.blockscout.com/api/v2",
    nativeCurrency: {
      name: "Creditcoin",
      symbol: "CTC",
      decimals: 18,
    },
    isTestnet: true,
    isActive: true,
    blockscoutSupported: true,
  },
  // Future chains can be added here
  // {
  //   id: 102030,
  //   name: "Creditcoin Mainnet",
  //   rpcUrl: "https://rpc.cc3.creditcoin.network",
  //   explorerUrl: "https://creditcoin.blockscout.com",
  //   apiUrl: "https://creditcoin.blockscout.com/api/v2",
  //   nativeCurrency: {
  //     name: "Creditcoin",
  //     symbol: "CTC",
  //     decimals: 18,
  //   },
  //   isTestnet: false,
  //   isActive: false, // Not yet available
  //   blockscoutSupported: true,
  // },
]

// Helper functions
export const getChainById = (chainId: number): ChainConfig | undefined => {
  return AVAILABLE_CHAINS.find((chain) => chain.id === chainId)
}

export const getActiveChains = (): ChainConfig[] => {
  return AVAILABLE_CHAINS.filter((chain) => chain.isActive)
}

export const getTestnetChains = (): ChainConfig[] => {
  return AVAILABLE_CHAINS.filter((chain) => chain.isTestnet && chain.isActive)
}

export const getMainnetChains = (): ChainConfig[] => {
  return AVAILABLE_CHAINS.filter((chain) => !chain.isTestnet && chain.isActive)
}

export const getBlockscoutSupportedChains = (): ChainConfig[] => {
  return AVAILABLE_CHAINS.filter(
    (chain) => chain.blockscoutSupported && chain.isActive
  )
}

export const getDefaultChain = (): ChainConfig => {
  return AVAILABLE_CHAINS.find((chain) => chain.isActive) || AVAILABLE_CHAINS[0]
}

// Chain validation
export const isValidChainId = (chainId: number): boolean => {
  return AVAILABLE_CHAINS.some((chain) => chain.id === chainId)
}

export const isChainSupported = (chainId: number): boolean => {
  const chain = getChainById(chainId)
  return chain ? chain.isActive : false
}

export const isBlockscoutSupported = (chainId: number): boolean => {
  const chain = getChainById(chainId)
  return chain ? chain.blockscoutSupported : false
}

// Export viem chains for compatibility
export const VIEM_CHAINS = [creditcoinTestnet]
export const DEFAULT_CHAIN = creditcoinTestnet
