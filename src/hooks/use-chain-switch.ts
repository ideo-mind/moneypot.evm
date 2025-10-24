import { useState, useCallback, useEffect } from "react"
import { useChain } from "@blockscout/app-sdk"
import {
  AVAILABLE_CHAINS,
  getChainById,
  getDefaultChain,
  isValidChainId,
  isChainSupported,
  isBlockscoutSupported,
  ChainConfig,
} from "@/config/chains"

export interface ChainSwitchState {
  currentChain: ChainConfig
  availableChains: ChainConfig[]
  isSwitching: boolean
  error: string | null
}

export const useChainSwitch = () => {
  const { switchChain } = useChain()
  const [state, setState] = useState<ChainSwitchState>({
    currentChain: getDefaultChain(),
    availableChains: AVAILABLE_CHAINS.filter((chain) => chain.isActive),
    isSwitching: false,
    error: null,
  })

  // Initialize with default chain
  useEffect(() => {
    const defaultChain = getDefaultChain()
    setState((prev) => ({
      ...prev,
      currentChain: defaultChain,
    }))
  }, [])

  const switchToChain = useCallback(
    async (chainId: number) => {
      if (!isValidChainId(chainId)) {
        setState((prev) => ({
          ...prev,
          error: `Invalid chain ID: ${chainId}`,
        }))
        return false
      }

      if (!isChainSupported(chainId)) {
        setState((prev) => ({
          ...prev,
          error: `Chain ${chainId} is not currently supported`,
        }))
        return false
      }

      const targetChain = getChainById(chainId)
      if (!targetChain) {
        setState((prev) => ({
          ...prev,
          error: `Chain ${chainId} not found`,
        }))
        return false
      }

      setState((prev) => ({
        ...prev,
        isSwitching: true,
        error: null,
      }))

      try {
        // Use Blockscout SDK's chain switching if supported
        if (isBlockscoutSupported(chainId)) {
          await switchChain(chainId.toString())
        }

        setState((prev) => ({
          ...prev,
          currentChain: targetChain,
          isSwitching: false,
          error: null,
        }))

        return true
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to switch chain"
        setState((prev) => ({
          ...prev,
          isSwitching: false,
          error: errorMessage,
        }))
        return false
      }
    },
    [switchChain]
  )

  const switchToTestnet = useCallback(async () => {
    const testnetChains = AVAILABLE_CHAINS.filter(
      (chain) => chain.isTestnet && chain.isActive
    )
    if (testnetChains.length > 0) {
      return await switchToChain(testnetChains[0].id)
    }
    return false
  }, [switchToChain])

  const switchToMainnet = useCallback(async () => {
    const mainnetChains = AVAILABLE_CHAINS.filter(
      (chain) => !chain.isTestnet && chain.isActive
    )
    if (mainnetChains.length > 0) {
      return await switchToChain(mainnetChains[0].id)
    }
    return false
  }, [switchToChain])

  const refreshChainInfo = useCallback(() => {
    setState((prev) => ({
      ...prev,
      availableChains: AVAILABLE_CHAINS.filter((chain) => chain.isActive),
    }))
  }, [])

  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }))
  }, [])

  // Helper functions
  const isCurrentChainTestnet = useCallback(() => {
    return state.currentChain.isTestnet
  }, [state.currentChain])

  const isCurrentChainMainnet = useCallback(() => {
    return !state.currentChain.isTestnet
  }, [state.currentChain])

  const getCurrentChainExplorerUrl = useCallback(() => {
    return state.currentChain.explorerUrl
  }, [state.currentChain])

  const getCurrentChainApiUrl = useCallback(() => {
    return state.currentChain.apiUrl
  }, [state.currentChain])

  const getCurrentChainRpcUrl = useCallback(() => {
    return state.currentChain.rpcUrl
  }, [state.currentChain])

  return {
    // State
    currentChain: state.currentChain,
    availableChains: state.availableChains,
    isSwitching: state.isSwitching,
    error: state.error,

    // Actions
    switchToChain,
    switchToTestnet,
    switchToMainnet,
    refreshChainInfo,
    clearError,

    // Helpers
    isCurrentChainTestnet,
    isCurrentChainMainnet,
    getCurrentChainExplorerUrl,
    getCurrentChainApiUrl,
    getCurrentChainRpcUrl,

    // Validation helpers
    isValidChainId,
    isChainSupported,
    isBlockscoutSupported,
  }
}
