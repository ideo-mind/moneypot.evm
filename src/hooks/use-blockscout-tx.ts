import { useNotification } from "@blockscout/app-sdk"
import { useCallback } from "react"
import {
  blockscoutConfig,
  getCurrentChainConfig,
} from "@/lib/blockscout-config"

export interface TransactionToastOptions {
  type?:
    | "create_pot"
    | "attempt_pot"
    | "expire_pot"
    | "token_approval"
    | "airdrop"
  description?: string
  amount?: string
  potId?: string
  showExplorerLink?: boolean
}

export const useBlockscoutTx = () => {
  const { openTxToast, openCustomToast } = useNotification()
  const currentChain = getCurrentChainConfig()

  const showTransactionToast = useCallback(
    (txHash: string, options: TransactionToastOptions = {}) => {
      const {
        type = "create_pot",
        description,
        amount,
        potId,
        showExplorerLink = true,
      } = options

      // Create custom description based on type and options
      let customDescription = description
      if (!customDescription) {
        switch (type) {
          case "create_pot":
            customDescription = `Creating Money Pot${
              amount ? ` with ${amount} USDC` : ""
            }`
            break
          case "attempt_pot":
            customDescription = `Attempting Pot${potId ? ` #${potId}` : ""}`
            break
          case "expire_pot":
            customDescription = `Expiring Pot${potId ? ` #${potId}` : ""}`
            break
          case "token_approval":
            customDescription = `Approving USDC spending`
            break
          case "airdrop":
            customDescription = `Requesting airdrop`
            break
          default:
            customDescription = "Processing transaction"
        }
      }

      // Show transaction toast with chain ID
      openTxToast(currentChain.id.toString(), txHash, {
        description: customDescription,
        showExplorerLink,
      })
    },
    [openTxToast, currentChain.id]
  )

  const showCustomToast = useCallback(
    (
      title: string,
      description: string,
      status: "success" | "error" | "info" | "warning" = "info",
      options: {
        duration?: number
        showExplorerLink?: boolean
        txHash?: string
      } = {}
    ) => {
      const { duration = 5000, showExplorerLink = false, txHash } = options

      openCustomToast({
        title,
        description,
        status,
        duration,
        showExplorerLink,
        txHash,
      })
    },
    [openCustomToast]
  )

  const showSuccessToast = useCallback(
    (
      title: string,
      description: string,
      options: { txHash?: string; potId?: string; amount?: string } = {}
    ) => {
      const { txHash, potId, amount } = options
      let enhancedDescription = description

      if (potId) {
        enhancedDescription += ` Pot #${potId}`
      }
      if (amount) {
        enhancedDescription += ` (${amount} USDC)`
      }

      showCustomToast(title, enhancedDescription, "success", {
        txHash,
        showExplorerLink: !!txHash,
      })
    },
    [showCustomToast]
  )

  const showErrorToast = useCallback(
    (
      title: string,
      description: string,
      options: { txHash?: string; showTroubleshooting?: boolean } = {}
    ) => {
      const { txHash, showTroubleshooting = true } = options
      let enhancedDescription = description

      if (showTroubleshooting && txHash) {
        enhancedDescription +=
          " Check the transaction details for more information."
      }

      showCustomToast(title, enhancedDescription, "error", {
        txHash,
        showExplorerLink: !!txHash,
        duration: 8000, // Longer duration for errors
      })
    },
    [showCustomToast]
  )

  const showPendingToast = useCallback(
    (title: string, description: string, txHash: string) => {
      showCustomToast(title, description, "info", {
        txHash,
        showExplorerLink: true,
        duration: 0, // Don't auto-dismiss pending toasts
      })
    },
    [showCustomToast]
  )

  return {
    showTransactionToast,
    showCustomToast,
    showSuccessToast,
    showErrorToast,
    showPendingToast,
  }
}
