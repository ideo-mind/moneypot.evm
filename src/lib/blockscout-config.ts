import { CHAINS } from "@/config/viem"
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
  // Primary chain configuration
  primaryChain: {
    id: 11155111,
    name: "Sepolia",
    rpcUrl: "https://sepolia.infura.io/v3/e2f4b52eab9c4e65b2feb158b717ca8f",
    explorerUrl: "https://eth-sepolia.blockscout.com",
    apiUrl: "https://eth-sepolia.blockscout.com/api/v2",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    isTestnet: true,
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
  

  // Token configurations
  tokens: {
    PYUSD: {
      address: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9",
      symbol: "PYUSD",
      name: "PayPal USD",
      decimals: 6,
      chainId: 11155111,
    },
    ETH: {
      address: "0x0000000000000000000000000000000000000000", // Native token
      symbol: "ETH",
      name: "Ether",
      decimals: 18,
      chainId: 11155111,
    },
    UNREAL: {
      address: "0x15EDeBfe6De62Fe4827C00d82e0230566600aF73",
      symbol: "UNREAL",
      name: "Unreal Token",
      decimals: 18,
      chainId: 102031,
    },
    CTC: {
      address: "0x0000000000000000000000000000000000000000",
      symbol: "CTC",
      name: "Creditcoin",
      decimals: 18,
      chainId: 102031,
    },
  },

  // Contract addresses
  contracts: {
    MoneyPot: {
      address: "0x03EE9A0211EA332f70b9D30D14a13FD8e465aa43",
      chainId: 11155111,
    },
    MoneyPot_CC: {
      address: "0x171AB010407D5A2640c91fdCb7C9f5f4507a9ee5",
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
