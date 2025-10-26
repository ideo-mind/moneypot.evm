// MoneyPot contract ABI - inline definition to avoid import issues
import { abi } from "@abis/MoneyPot.json"

export const moneyPotABI = abi

import {
  createPublicClient,
  createWalletClient,
  http,
  webSocket,
  defineChain,
  Chain,
  PublicClient,
  erc20Abi,
} from "viem"

// Export Chain type for use in other config files
export { type Chain } from "viem"

// Creditcoin EVM Testnet Configuration - Hardcoded values
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
      name: "Creditcoin Explorer",
      url: "https://creditcoin-testnet.blockscout.com",
    },
  },
  custom: {
    moneypot: {
      address: "0xB51Da34a5a405bC9e7e3733fCe9A2AEf9871590d",
      abis: moneyPotABI,
      token: {
        address: "0xB51Da34a5a405bC9e7e3733fCe9A2AEf9871590d",
        symbol: "USDC",
        name: "Money Pot",
        decimals: 6,
        abis: moneyPotABI,
      },
    },
  },
  testnet: true,
})

export const sepolia = defineChain({
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
        // ABOVE is the best that's what we are going with
        // "https://rpc.sepolia.org",
        // "https://ethereum-sepolia-rpc.publicnode.com",
        // "https://sepolia-bor-rpc.publicnode.com",
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

// Simple hardcoded chains array - Sepolia first as default
export const CHAINS = [sepolia, creditcoinTestnet]

// Simple default chain - Sepolia
export const CHAIN_DEFAULT = sepolia

/**
 * Get a Chain definition by chainId.
 * @param chainId EVM chain id (e.g., 102031 Creditcoin, 11155111 Sepolia)
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
 */
export function pickRpc(rpcs: readonly string[]) {
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

  // Create new public client with random RPC
  // @ts-ignore - Chain type compatibility issue with viem
  return createPublicClient({
    chain: chain as any,
    transport: http(pickRpc(rpcs)),
  })
}

/**
 * Get the default public client (Creditcoin Testnet)
 */
export function getDefaultPublicClient(): PublicClient {
  return getPublicClient(getDefaultChain().id)
}

// Legacy exports for backward compatibility (deprecated)
export const publicClient = createPublicClient({
  chain: creditcoinTestnet,
  transport: http(),
})

export const wsClient = createPublicClient({
  chain: creditcoinTestnet,
  transport: webSocket(),
})

/**
 * Helper function to create chain-specific wallet client
 * @param account Wallet account
 * @param chainId EVM chain id
 * @returns WalletClient instance
 */
export const createEVMWalletClient = (account: any, chainId: number) => {
  const chain = getChain(chainId)
  // @ts-ignore - Chain type compatibility issue with viem
  return createWalletClient({
    account: account || undefined,
    chain: chain as any,
    transport: http(),
  })
}

// Helper function to format addresses
export const formatEVMAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Helper function to convert wei to CTC
export const formatCTC = (wei: bigint) => {
  return Number(wei) / 10 ** 18
}

// Helper function to convert CTC to wei
export const parseCTC = (ctc: number) => {
  return BigInt(Math.floor(ctc * 10 ** 18))
}
