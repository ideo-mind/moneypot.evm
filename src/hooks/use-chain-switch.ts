import { useState, useCallback, useEffect } from "react"
import { CHAINS, CHAIN_DEFAULT, getChain, Chain } from "@/config/viem"

export interface ChainSwitchState {
  currentChain: Chain
  isSwitching: boolean
  error: string | null
}

export const useChainSwitch = () => {
  const [state, setState] = useState<ChainSwitchState>({
    currentChain: CHAIN_DEFAULT,
    isSwitching: false,
    error: null,
  })

  useEffect(() => {
    setState((prev) => ({
      ...prev,
      currentChain: CHAIN_DEFAULT,
    }))
  }, [])

  const switchToChain = useCallback(async (chainId: number) => {
    setState((prev) => ({
      ...prev,
      isSwitching: true,
      error: null,
    }))
    try {
      const nextChain = getChain(chainId)
      setState((prev) => ({
        ...prev,
        currentChain: nextChain,
        isSwitching: false,
        error: null,
      }))
      window.localStorage.clear()
      window.location.reload()
      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : `Failed to switch chain (${chainId})`
      setState((prev) => ({
        ...prev,
        isSwitching: false,
        error: errorMessage,
      }))
      return false
    }
  }, [])

  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }))
  }, [])

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
    currentChain: state.currentChain,
    isSwitching: state.isSwitching,
    error: state.error,
    switchToChain,
    clearError,
    isCurrentChainTestnet,
    getCurrentChainExplorerUrl,
    getCurrentChainRpcUrl,
  }
}
