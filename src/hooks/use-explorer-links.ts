import { useCallback } from "react"
import { getExplorerUrl, getCurrentChainConfig } from "@/lib/blockscout-config"

export type ExplorerResourceType =
  | "address"
  | "transaction"
  | "token"
  | "block"
  | "contract"

export interface ExplorerLinkOptions {
  chainId?: number
  newTab?: boolean
  copyToClipboard?: boolean
}

export const useExplorerLinks = () => {
  const currentChain = getCurrentChainConfig()

  const generateExplorerLink = useCallback(
    (
      type: ExplorerResourceType,
      identifier: string,
      options: ExplorerLinkOptions = {}
    ) => {
      const { chainId } = options
      const explorerUrl = chainId ? getExplorerUrl(chainId) : getExplorerUrl()

      switch (type) {
        case "address":
          return `${explorerUrl}/address/${identifier}`
        case "transaction":
          return `${explorerUrl}/tx/${identifier}`
        case "token":
          return `${explorerUrl}/token/${identifier}`
        case "block":
          return `${explorerUrl}/block/${identifier}`
        case "contract":
          return `${explorerUrl}/address/${identifier}`
        default:
          return explorerUrl
      }
    },
    []
  )

  const openExplorerLink = useCallback(
    (
      type: ExplorerResourceType,
      identifier: string,
      options: ExplorerLinkOptions = {}
    ) => {
      const { newTab = true } = options
      const link = generateExplorerLink(type, identifier, options)

      if (newTab) {
        window.open(link, "_blank", "noopener,noreferrer")
      } else {
        window.location.href = link
      }
    },
    [generateExplorerLink]
  )

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (error) {
      console.error("Failed to copy to clipboard:", error)
      return false
    }
  }, [])

  const copyAddress = useCallback(
    async (address: string) => {
      return await copyToClipboard(address)
    },
    [copyToClipboard]
  )

  const copyTxHash = useCallback(
    async (txHash: string) => {
      return await copyToClipboard(txHash)
    },
    [copyToClipboard]
  )

  const formatAddress = useCallback((address: string, length: number = 6) => {
    if (!address) return ""
    if (address.length <= length * 2) return address
    return `${address.slice(0, length)}...${address.slice(-length)}`
  }, [])

  const formatTxHash = useCallback((txHash: string, length: number = 8) => {
    if (!txHash) return ""
    if (txHash.length <= length * 2) return txHash
    return `${txHash.slice(0, length)}...${txHash.slice(-length)}`
  }, [])

  // Convenience methods for common MoneyPot use cases
  const getAddressLink = useCallback(
    (address: string, options?: ExplorerLinkOptions) => {
      return generateExplorerLink("address", address, options)
    },
    [generateExplorerLink]
  )

  const getTransactionLink = useCallback(
    (txHash: string, options?: ExplorerLinkOptions) => {
      return generateExplorerLink("transaction", txHash, options)
    },
    [generateExplorerLink]
  )

  const getTokenLink = useCallback(
    (tokenAddress: string, options?: ExplorerLinkOptions) => {
      return generateExplorerLink("token", tokenAddress, options)
    },
    [generateExplorerLink]
  )

  const getContractLink = useCallback(
    (contractAddress: string, options?: ExplorerLinkOptions) => {
      return generateExplorerLink("contract", contractAddress, options)
    },
    [generateExplorerLink]
  )

  const openAddress = useCallback(
    (address: string, options?: ExplorerLinkOptions) => {
      return openExplorerLink("address", address, options)
    },
    [openExplorerLink]
  )

  const openTransaction = useCallback(
    (txHash: string, options?: ExplorerLinkOptions) => {
      return openExplorerLink("transaction", txHash, options)
    },
    [openExplorerLink]
  )

  const openToken = useCallback(
    (tokenAddress: string, options?: ExplorerLinkOptions) => {
      return openExplorerLink("token", tokenAddress, options)
    },
    [openExplorerLink]
  )

  const openContract = useCallback(
    (contractAddress: string, options?: ExplorerLinkOptions) => {
      return openExplorerLink("contract", contractAddress, options)
    },
    [openExplorerLink]
  )

  return {
    // Core functions
    generateExplorerLink,
    openExplorerLink,
    copyToClipboard,
    copyAddress,
    copyTxHash,
    formatAddress,
    formatTxHash,

    // Convenience methods
    getAddressLink,
    getTransactionLink,
    getTokenLink,
    getContractLink,
    openAddress,
    openTransaction,
    openToken,
    openContract,

    // Current chain info
    currentChain,
    explorerUrl: currentChain.explorerUrl,
  }
}
