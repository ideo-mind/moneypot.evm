import { CHAINS, CHAIN_DEFAULT } from "@/config/viem"
import { defineChain } from "viem"

// Sepolia Testnet configuration for Blockscout SDK
export const sepoliaBlockscout = defineChain({
  id: 11155111,
  name: "Sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [
        "https://sepolia.infura.io/v3/e2f4b52eab9c4e65b2feb158b717ca8f",
        "https://ethereum-sepolia-rpc.publicnode.com",
      ],
      webSocket: [
        "wss://sepolia.infura.io/ws/v3/e2f4b52eab9c4e65b2feb158b717ca8f",
      ],
    },
    public: {
      http: [
        "https://sepolia.rpc.hypersync.xyz",
        "https://11155111.rpc.hypersync.xyz",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Sepolia Explorer",
      url: "https://eth-sepolia.blockscout.com",
    },
  },
  testnet: true,
})

// Blockscout SDK configuration
export const blockscoutConfig = {
  primaryChain: {
    id: CHAIN_DEFAULT.id,
    name: CHAIN_DEFAULT.name,
    rpcUrl: CHAIN_DEFAULT.rpcUrls.default.http[0],
    explorerUrl: CHAIN_DEFAULT.blockExplorers.default.url,
    apiUrl: `${CHAIN_DEFAULT.blockExplorers.default.url}/api/v2`,
    nativeCurrency: {
      name: CHAIN_DEFAULT.nativeCurrency.name,
      symbol: CHAIN_DEFAULT.nativeCurrency.symbol,
      decimals: CHAIN_DEFAULT.nativeCurrency.decimals,
    },
    isTesnet: true,
  },

  // Multi chain support
  supportedChains: CHAINS.map((chain) => ({
    id: chain.id,
    name: chain.name,
    rpcUrl: chain.rpcUrls.default.http[0],
    explorerUrl: chain.blockExplorers.default.url,
    apiUrl: `${chain.blockExplorers.default.url}/api/v2`,
    nativeCurrency: {
      name: chain.nativeCurrency.name,
      symbol: chain.nativeCurrency.symbol,
      decimals: chain.nativeCurrency.decimals,
    },
    isTestnet: chain.testnet,
    isActive: true,
  })),
  
  

  tokens: {
    ...Object.fromEntries(
      CHAINS.map((chain) => [
        chain.custom.moneypot.token.symbol,
        {
          address: chain.custom.moneypot.token.address,
          symbol: chain.custom.moneypot.token.symbol,
          name: chain.custom.moneypot.token.name,
          decimals: chain.custom.moneypot.token.decimals,
          chainId: chain.id,
        },
      ])
    ),
    ...Object.fromEntries(
      CHAINS.map((chain) => [
        chain.nativeCurrency.symbol,
        {
          address: "0x0000000000000000000000000000000000000000",
          symbol: chain.nativeCurrency.symbol,
          name: chain.nativeCurrency.name,
          decimals: chain.nativeCurrency.decimals,
          chainId: chain.id,
        },
      ])
    ),
  },

  // Contract addresses
  contracts: {
    ...Object.fromEntries(
      CHAINS.map((chain) => [
        `MoneyPot_${chain.id}`,
        {
          address: chain.custom.moneypot.address,
          chainId: chain.id,
        },
      ])
    ),
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
  try {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('evm-last-chain-id') : null
    if (saved) {
      const id = parseInt(saved, 10)
      const found = getChainConfig(id)
      if (found) return found
    }
  } catch {}
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
  if (chain?.apiUrl) return chain.apiUrl
  if (chain?.explorerUrl) return `${chain.explorerUrl}/api/v2`
  return blockscoutConfig.primaryChain.apiUrl
}
