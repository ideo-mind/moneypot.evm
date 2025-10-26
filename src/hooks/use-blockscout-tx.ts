import { useNotification } from "@blockscout/app-sdk"
import { useCallback } from "react"
import { toast } from "sonner"
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
  const { openTxToast } = useNotification() // Only openTxToast exists in SDK
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
              amount ? ` with ${amount} USD` : ""
            }`
            break
          case "attempt_pot":
            customDescription = `Attempting Pot${potId ? ` #${potId}` : ""}`
            break
          case "expire_pot":
            customDescription = `Expiring Pot${potId ? ` #${potId}` : ""}`
            break
          case "token_approval":
            customDescription = `Approving USD spending`
            break
          case "airdrop":
            customDescription = `Requesting airdrop`
            break
          default:
            customDescription = "Processing transaction"
        }
      }

      // Use Blockscout SDK for transaction toasts
      openTxToast(currentChain.id.toString(), txHash, {
        description: customDescription,
        showExplorerLink,
      })
    },
    [openTxToast, currentChain.id]
  )

  // All other toast methods use sonner
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
      const { duration = 5000 } = options

      toast[status](title, {
        description,
        duration,
      })
    },
    []
  )

  const showSuccessToast = useCallback(
    (
      title: string,
      description: string,
      options: { txHash?: string; potId?: string; amount?: string } = {}
    ) => {
      const { potId, amount } = options
      let enhancedDescription = description

      if (potId) {
        enhancedDescription += ` Pot #${potId}`
      }
      if (amount) {
        enhancedDescription += ` (${amount} USD)`
      }

      toast.success(title, {
        description: enhancedDescription,
      })
    },
    []
  )

  const showErrorToast = useCallback(
    (
      title: string,
      description: string,
      options: { txHash?: string; showTroubleshooting?: boolean } = {}
    ) => {
      const { showTroubleshooting = true } = options
      let enhancedDescription = description

      if (showTroubleshooting) {
        enhancedDescription +=
          " Please try again or check your wallet connection."
      }

      toast.error(title, {
        description: enhancedDescription,
        duration: 8000, // Longer duration for errors
      })
    },
    []
  )

  const showPendingToast = useCallback(
    (title: string, description: string, txHash: string) => {
      toast.loading(title, {
        description,
        duration: 0, // Don't auto-dismiss pending toasts
      })
    },
    []
  )

  return {
    showTransactionToast,
    showCustomToast,
    showSuccessToast,
    showErrorToast,
    showPendingToast,
  }
}
