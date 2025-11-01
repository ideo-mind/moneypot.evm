import Onboard from "@web3-onboard/core"
import injectedModule from "@web3-onboard/injected-wallets"
import walletConnectModule from "@web3-onboard/walletconnect"
import coinbaseModule from "@web3-onboard/coinbase"
import metamaskModule from "@web3-onboard/metamask"
import { CHAINS, CHAIN_DEFAULT, getChain } from "@/config/viem"
import { toHex } from "viem"
import { WALLETCONNECT_PROJECT_ID } from "@/config"

// Initialize the injected wallets module
const injected = injectedModule()

// Initialize WalletConnect module
const walletConnect = walletConnectModule({
  projectId: WALLETCONNECT_PROJECT_ID,
  requiredChains: [CHAINS[0].id],
  optionalChains: CHAINS.map((chain) => chain.id),
  dappUrl: typeof window !== "undefined" ? window.location.origin : "",
})

// Initialize Coinbase module
const coinbase = coinbaseModule()

// Initialize MetaMask module
const metamask = metamaskModule({ options: {} })

// Create the onboard instance
export const onboard = Onboard({
  wallets: [injected, walletConnect, coinbase, metamask],
  chains: CHAINS.map((chain) => ({
    id: toHex(chain.id),
    token: chain.nativeCurrency.symbol,
    label: chain.name,
    rpcUrl: chain.rpcUrls.default.http[0],
    blockExplorerUrl: chain.blockExplorers.default.url,
    secondaryTokens: [{ address: chain.custom.moneypot.token.address }],
  })),
  accountCenter: {
    desktop: {
      enabled: true,
      position: "topRight",
    },
    mobile: {
      enabled: true,
      position: "topRight",
    },
  },
  notify: {
    enabled: true,
  },
  appMetadata: {
    name: "Money Pot",
    description: "Decentralized money pot game",
    icon: "/logo.png",
    logo: "/logo.png",
    recommendedInjectedWallets: [
      {
        name: "MetaMask",
        url: "https://metamask.io",
      },
    ],
  },
})

// Helper function to connect wallet
export const connectWallet = async () => {
  try {
    const wallets = await onboard.connectWallet()
    return wallets[0]
  } catch (error) {
    console.error("Failed to connect wallet:", error)
    throw error
  }
}

// Helper function to disconnect wallet
export const disconnectWallet = async () => {
  try {
    const connectedWallets = onboard.state.get().wallets
    if (connectedWallets.length > 0) {
      await onboard.disconnectWallet({ label: connectedWallets[0].label })
    }
  } catch (error) {
    console.error("Failed to disconnect wallet:", error)
    throw error
  }
}

// Helper function to get connected wallet
export const getConnectedWallet = () => {
  const connectedWallets = onboard.state.get().wallets
  return connectedWallets.length > 0 ? connectedWallets[0] : null
}

// Helper function to switch network
export const switchNetwork = async (chainId: number) => {
  try {
    const wallet = getConnectedWallet()
    if (wallet) {
      await wallet.provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      })
    }
  } catch (error) {
    console.error("Failed to switch network:", error)
    throw error
  }
}

// Helper function to add network if not exists (generic)
export const addNetwork = async (chainId: number) => {
  try {
    const wallet = getConnectedWallet()
    if (wallet) {
      const chain = getChain(chainId)
      await wallet.provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: `0x${chain.id.toString(16)}`,
            chainName: chain.name,
            nativeCurrency: chain.nativeCurrency,
            rpcUrls: chain.rpcUrls.default.http,
            blockExplorerUrls: [chain.blockExplorers.default.url],
          },
        ],
      })
    }
  } catch (error) {
    console.error("Failed to add network:", error)
    throw error
  }
}

// Ensure wallet is on a given chain: switch, or add then switch
export const ensureWalletOnChain = async (chainId: number) => {
  try {
    await switchNetwork(chainId)
  } catch (err: any) {
    // If error is chain not added (e.g., 4902), try adding then switching
    try {
      await addNetwork(chainId)
      await switchNetwork(chainId)
    } catch (e) {
      throw e
    }
  }
}
