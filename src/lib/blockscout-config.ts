import { defineChain } from "viem"

// Creditcoin Testnet configuration for Blockscout SDK
export const creditcoinTestnetBlockscout = defineChain({
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

// Blockscout SDK configuration
export const blockscoutConfig = {
  // Primary chain configuration
  primaryChain: {
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
  },

  // Multi-chain support structure for future expansion
  supportedChains: [
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
    },
    // Future chains can be added here
    // {
    //   id: 102030, // Creditcoin Mainnet (when available)
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
    //   isActive: false,
    // },
  ],

  // Token configurations
  tokens: {
    USDC: {
      address: "0xEC020aA4De9567Ae9dF9f43Da71414aE4932F6f3",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      chainId: 102031,
    },
    CTC: {
      address: "0x0000000000000000000000000000000000000000", // Native token
      symbol: "CTC",
      name: "Creditcoin",
      decimals: 18,
      chainId: 102031,
    },
  },

  // Contract addresses
  contracts: {
    MoneyPot: {
      address: "0xEC020aA4De9567Ae9dF9f43Da71414aE4932F6f3",
      chainId: 102031,
    },
  },

  // Notification settings
  notifications: {
    enabled: true,
    position: "top-right" as const,
    duration: 5000,
    showExplorerLinks: true,
    showTransactionDetails: true,
  },

  // Custom toast types for MoneyPot
  customToastTypes: {
    CREATE_POT: "create_pot",
    ATTEMPT_POT: "attempt_pot",
    EXPIRE_POT: "expire_pot",
    TOKEN_APPROVAL: "token_approval",
    AIRDROP: "airdrop",
  },
}

// Helper functions
export const getChainConfig = (chainId: number) => {
  return blockscoutConfig.supportedChains.find((chain) => chain.id === chainId)
}

export const getCurrentChainConfig = () => {
  return blockscoutConfig.primaryChain
}

export const getTokenConfig = (symbol: string) => {
  return blockscoutConfig.tokens[symbol as keyof typeof blockscoutConfig.tokens]
}

export const getContractConfig = (contractName: string) => {
  return blockscoutConfig.contracts[
    contractName as keyof typeof blockscoutConfig.contracts
  ]
}

export const isChainSupported = (chainId: number) => {
  return blockscoutConfig.supportedChains.some((chain) => chain.id === chainId)
}

export const getExplorerUrl = (chainId?: number) => {
  const chain = chainId ? getChainConfig(chainId) : getCurrentChainConfig()
  return chain?.explorerUrl || blockscoutConfig.primaryChain.explorerUrl
}

export const getApiUrl = (chainId?: number) => {
  const chain = chainId ? getChainConfig(chainId) : getCurrentChainConfig()
  return chain?.apiUrl || blockscoutConfig.primaryChain.apiUrl
}
