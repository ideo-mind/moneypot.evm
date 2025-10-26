// MoneyPot contract ABI - inline definition to avoid import issues
import { abi } from "@abis/MoneyPot.json"

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
} from "viem"

// Export Chain type for use in other config files
export { type Chain } from "viem"

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
        "https://sepolia.infura.io/v/3" + INFURA_API_KEY,
        // "https://11155111.rpc.hypersync.xyz", //FIXME: hypersync rpc is not workign
        // "https://sepolia.rpc.hypersync.xyz",
      ],
    },
    public: {
      http: [
        "https://ethereum-sepolia-rpc.publicnode.com",
        // "https://rpc.sepolia.org",
        "https://sepolia.gateway.tenderly.co",
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
      address: "0x03EE9A0211EA332f70b9D30D14a13FD8e465aa43",
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

// Contract addresses are now accessed through chain configuration
// Use getMoneyPotContractAddress(chainId) and getOnePContractAddress(chainId) from @config/networks

// Simple hardcoded chains - Sepolia first as default

// Single supported chain
export const CHAINS = [sepolia]

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

/**
 * Randomly select an RPC from the list for load balancing
 * This helps distribute read requests across multiple RPC providers
 */
export function pickRpc(rpcs: readonly string[]): string {
  if (rpcs.length === 0) {
    throw new Error("No RPC URLs available")
  }
  return rpcs[Math.floor(Math.random() * rpcs.length)]
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

  // Pick a random RPC for load balancing
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
