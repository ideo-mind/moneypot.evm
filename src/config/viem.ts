// MoneyPot contract ABI - inline definition to avoid import issues
import { abi } from "@abis/MoneyPot.json"
import { ALCHEMY_API_KEY, INFURA_API_KEY } from "./index"

export const moneyPotABI = abi

import {
  createPublicClient,
  createWalletClient,
  http,
  custom,
  defineChain,
  Chain,
  PublicClient,
  erc20Abi,
  parseUnits,
  formatUnits,
} from "viem"

// Export Chain type for use in other config files
export { type Chain } from "viem"

// Fix: Extend Chain type for 'custom' field for moneypot and token typing
interface MoneyPotTokenConfig {
  address: string
  symbol: string
  name: string
  decimals: number
  abis: typeof erc20Abi
  faucet?: string[]
}
interface MoneyPotCustomConfig {
  moneypot: {
    address: string
    abis: typeof moneyPotABI
    token: MoneyPotTokenConfig
  }
  onep?: object
}
// Patch getChain() return type to known custom shape where needed:

// Sepolia Testnet Configuration - Single supported chain

export const sepolia = defineChain({
  id: 11155111,
  name: "Sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
    faucet: [
      "https://cloud.google.com/application/web3/faucet/ethereum/sepolia",
    ],
  },
  rpcUrls: {
    default: {
      http: [
        // "https://ethereum-sepolia-rpc.publicnode.com",
        // "https://rpc.sepolia.org",
        // "https://sepolia.gateway.tenderly.co",
        "https://sepolia.infura.io/v3/" + INFURA_API_KEY,
        // "https://eth-sepolia.g.alchemy.com/v2/" + ALCHEMY_API_KEY,
        // "https://11155111.rpc.hypersync.xyz", //FIXME: hypersync rpc is not workign
        // "https://sepolia.rpc.hypersync.xyz",
        ,
      ],
    },
    public: {
      http: [
        "https://ethereum-sepolia-rpc.publicnode.com",
        "https://eth-sepolia.public.blastapi.io",
        "https://0xrpc.io/sep",

        // "https://eth-sepolia-testnet.rpc.grove.city/v1/01fdb492",
        // "https://rpc.sepolia.org",
        // "https://sepolia.gateway.tenderly.co",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Sepolia Explorer",
      url: "https://eth-sepolia.blockscout.com",
    },
  },
  custom: {
    moneypot: {
      address: "0xAD6A944623f24CBdbAc60A77825Fe77312949E76",
      abis: moneyPotABI,
      token: {
        address: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9",
        symbol: "PYUSD",
        name: "PayPal USD",
        decimals: 6,
        abis: erc20Abi,
        faucet: [
          "https://cloud.google.com/application/web3/faucet/ethereum/sepolia/pyusd",
        ],
      },
    },
    onep: {
      // TODO: one p yet to be deployed
    },
  },
  testnet: true,
})

export const creditcoinTestnet = defineChain({
  id: 102031,
  name: "Creditcoin Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Creditcoin",
    symbol: "CTC",
    faucet: ["https://console.ideomind.org/"],
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
      name: "Creditcoin Explorer",
      url: "https://creditcoin-testnet.blockscout.com",
    },
  },
  custom: {
    moneypot: {
      address: "0x171AB010407D5A2640c91fdCb7C9f5f4507a9ee5",
      abis: moneyPotABI,
      token: {
        address: "0x15EDeBfe6De62Fe4827C00d82e0230566600aF73",
        symbol: "UNREAL",
        name: "Unreal Token",
        decimals: 18,
        abis: erc20Abi,
        faucet: ["https://console.ideomind.org/"],
      },
    },
    onep: {
      // TODO: one p yet to be deployed for cc
    },
  },
  testnet: true,
})

export const somniaTestnet = defineChain({
  id: 50312,
  name: "Somnia Shanon Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Somnia Testnet Token",
    symbol: "STT",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.ankr.com/somnia_testnet"],
    },
    public: {
      http: ["https://dream-rpc.somnia.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Somnia Shanon Explorer",
      url: "https://shannon-explorer.somnia.network/",
    },
  },
  custom: {
    moneypot: {
      address: "0xCFDc84668aAc069f5e885e5E4bded97E22a2fDe1",
      abis: moneyPotABI,
      token: {
        address: "0xd1fB2a15545032a8170370d7eC47C0FC69A00eed",
        symbol: "UNREAL",
        name: "Unreal Token",
        decimals: 18,
        abis: erc20Abi,
      },
    },
  },
  testnet: true,
})

// Contract addresses are now accessed through chain configuration
// Use getMoneyPotContractAddress(chainId) and getOnePContractAddress(chainId) from @config/networks

// Simple hardcoded chains - Sepolia first as default

// Single supported chain
export const CHAINS = [sepolia, creditcoinTestnet, somniaTestnet]

// Default chain - Sepolia
export const CHAIN_DEFAULT = sepolia

/**
 * Get a Chain definition by chainId.
 * @param chainId EVM chain id (11155111 Sepolia)
 * @returns Chain or throws error if not supported
 */
export function getChain(chainId: number): Chain {
  const chain = CHAINS.find((c) => c.id === chainId)
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`)
  }
  return chain
}

/**
 * Get the default Chain used by the router (Sepolia).
 */
export function getDefaultChain(): Chain {
  return sepolia
}

// RPC rotation index tracker per RPC list (to handle default vs public separately)
// Uses the first RPC URL as a key to identify the list
const rpcIndexMap = new Map<string, number>()

/**
 * Select an RPC from the list using round-robin rotation for load balancing
 * This ensures we use all available RPCs evenly
 */
export function pickRpc(rpcs: readonly string[]): string {
  if (rpcs.length === 0) {
    throw new Error("No RPC URLs available")
  }

  // Use first RPC URL as a key to track this specific RPC list
  const listKey = rpcs[0]

  // Get current index for this list, or initialize to 0
  const currentIndex = rpcIndexMap.get(listKey) || 0

  // Select RPC and advance to next index
  const selectedRpc = rpcs[currentIndex]
  const nextIndex = (currentIndex + 1) % rpcs.length
  rpcIndexMap.set(listKey, nextIndex)

  return selectedRpc
}

/**
 * Get or create a public client for the specified chain.
 * No caching - creates fresh client for RPC rotation.
 * @param chainId EVM chain id (optional, defaults to default chain)
 * @param readOnly Whether to use public RPCs for read operations
 * @returns PublicClient instance
 */
export function getPublicClient(
  chainId?: number,
  readOnly?: boolean
): PublicClient {
  const targetChainId = chainId || getDefaultChain().id

  // Get chain configuration
  const chain = getChain(targetChainId)

  // Select RPC endpoints
  let rpcs = chain.rpcUrls.default.http
  if (readOnly && chain.rpcUrls.public?.http) {
    rpcs = chain.rpcUrls.public.http
  }

  // Pick RPC using round-robin rotation for load balancing
  const selectedRpc = pickRpc(rpcs)

  // @ts-expect-error - Chain type compatibility issue with viem
  return createPublicClient({
    chain: chain as any,
    transport: http(selectedRpc),
  })
}

/**
 * Get the default public client (Sepolia)
 */
export function getDefaultPublicClient(): PublicClient {
  return getPublicClient(getDefaultChain().id)
}

// Legacy exports for backward compatibility (deprecated)
// Note: These clients use a random RPC for load balancing
// Lazy initialization to avoid module initialization errors
let _publicClient: PublicClient | null = null

// @ts-ignore - viem type compatibility issue
const createLegacyPublicClient = () => {
  const rpcUrl = sepolia.rpcUrls.default.http[0] // Use first RPC for legacy client
  return createPublicClient({
    chain: sepolia as any,
    transport: http(rpcUrl),
  }) as PublicClient
}

export const publicClient = new Proxy({} as PublicClient, {
  get(target, prop) {
    if (!_publicClient) {
      _publicClient = createLegacyPublicClient()
    }
    return (_publicClient as any)[prop]
  },
})

// WebSocket client removed - not used and requires websocket RPC URL
// export const wsClient = createPublicClient({
//   chain: sepolia,
//   transport: webSocket(),
// })

/**
 * Helper function to create chain-specific wallet client
 * @param wallet Web3Onboard wallet object
 * @param chainId EVM chain id
 * @returns WalletClient instance
 */
export const createEVMWalletClient = (wallet: any, chainId: number) => {
  const chain = getChain(chainId)

  if (
    !wallet ||
    !wallet.provider ||
    !wallet.accounts ||
    wallet.accounts.length === 0
  ) {
    throw new Error("Invalid wallet: provider and accounts required")
  }

  // Create a custom transport using the wallet's provider
  return createWalletClient({
    account: wallet.accounts[0].address,
    chain: chain as any,
    transport: custom(wallet.provider),
  })
}

// Helper function to format addresses
export const formatEVMAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Helper function to convert wei to ETH
export const formatETH = (wei: bigint) => {
  return Number(wei) / 10 ** 18
}

// Helper function to convert ETH to wei
export const parseETH = (eth: number) => {
  return BigInt(Math.floor(eth * 10 ** 18))
}

/**
 * Parse token amount to bigint using token decimals from chain config
 * @param amount Token amount as number
 * @param chainId EVM chain id
 * @returns bigint value with proper decimals
 */
export const parseTokenAmount = (amount: number, chainId: number): bigint => {
  const chain = getChain(chainId) as Chain & { custom: MoneyPotCustomConfig }
  const decimals = chain.custom.moneypot.token.decimals
  return parseUnits(amount.toString(), decimals)
}

/**
 * Format token amount from bigint to number using token decimals from chain config
 * @param amount Token amount as bigint
 * @param chainId EVM chain id
 * @returns number value with proper decimals
 */
export const formatTokenAmount = (amount: bigint, chainId: number): number => {
  const chain = getChain(chainId) as Chain & { custom: MoneyPotCustomConfig }
  const decimals = chain.custom.moneypot.token.decimals
  return Number(formatUnits(amount, decimals))
}
