import { useState, useCallback, useEffect } from "react"
import { useChain } from "@blockscout/app-sdk"
import { sepolia, getChain } from "@/config/viem"

export interface ChainSwitchState {
  currentChain: typeof sepolia
  isSwitching: boolean
  error: string | null
}

export const useChainSwitch = () => {
  const { switchChain } = useChain()
  const [state, setState] = useState<ChainSwitchState>({
    currentChain: sepolia,
    isSwitching: false,
    error: null,
  })

  // Initialize with Sepolia
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      currentChain: sepolia,
    }))
  }, [])

  const switchToSepolia = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isSwitching: true,
      error: null,
    }))

    try {
      await switchChain(sepolia.id.toString())

      setState((prev) => ({
        ...prev,
        currentChain: sepolia,
        isSwitching: false,
        error: null,
      }))

      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to switch to Sepolia"
      setState((prev) => ({
        ...prev,
        isSwitching: false,
        error: errorMessage,
      }))
      return false
    }
  }, [switchChain])

  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }))
  }, [])

  // Helper functions
  const isCurrentChainTestnet = useCallback(() => {
    return state.currentChain.testnet
  }, [state.currentChain])

  const getCurrentChainExplorerUrl = useCallback(() => {
    return state.currentChain.blockExplorers.default.url
  }, [state.currentChain])

  const getCurrentChainRpcUrl = useCallback(() => {
    return state.currentChain.rpcUrls.default.http[0]
  }, [state.currentChain])

  return {
    // State
    currentChain: state.currentChain,
    isSwitching: state.isSwitching,
    error: state.error,

    // Actions
    switchToSepolia,
    clearError,

    // Helpers
    isCurrentChainTestnet,
    getCurrentChainExplorerUrl,
    getCurrentChainRpcUrl,
  }
}
