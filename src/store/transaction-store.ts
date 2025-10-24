import { create } from "zustand"
import { Transaction } from "@/types"
import { getCurrentChainConfig } from "@/lib/blockscout-config"

const TRANSACTIONS_STORAGE_KEY = "money-pot-transactions"

interface TransactionState {
  transactions: Transaction[]
  addTransaction: (transaction: Omit<Transaction, "id" | "timestamp">) => string
  updateTransaction: (id: string, updates: Partial<Transaction>) => void
  clearTransactions: () => void
  getTransactionsByType: (type: Transaction["type"]) => Transaction[]
  getTransactionsByStatus: (status: Transaction["status"]) => Transaction[]
  // Blockscout integration methods
  addBlockscoutMetadata: (
    id: string,
    metadata: Transaction["blockscoutMetadata"]
  ) => void
  getTransactionsWithBlockscoutData: () => Transaction[]
  syncWithBlockscoutToasts: (txId: string, toastData: any) => void
}

const loadTransactionsFromStorage = (): Transaction[] => {
  try {
    const storedTransactions = localStorage.getItem(TRANSACTIONS_STORAGE_KEY)
    return storedTransactions ? JSON.parse(storedTransactions) : []
  } catch (error) {
    console.error("Failed to load transactions from local storage:", error)
    return []
  }
}

const saveTransactionsToStorage = (transactions: Transaction[]) => {
  try {
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions))
  } catch (error) {
    console.error("Failed to save transactions to local storage:", error)
  }
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: loadTransactionsFromStorage(),

  addTransaction: (transactionData) => {
    const id = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const transaction: Transaction = {
      ...transactionData,
      id,
      timestamp: Date.now(),
    }

    set((state) => {
      const newTransactions = [transaction, ...state.transactions]
      saveTransactionsToStorage(newTransactions)
      return { transactions: newTransactions }
    })

    return id
  },

  updateTransaction: (id, updates) => {
    set((state) => {
      const newTransactions = state.transactions.map((tx) =>
        tx.id === id ? { ...tx, ...updates } : tx
      )
      saveTransactionsToStorage(newTransactions)
      return { transactions: newTransactions }
    })
  },

  clearTransactions: () => {
    localStorage.removeItem(TRANSACTIONS_STORAGE_KEY)
    set({ transactions: [] })
  },

  getTransactionsByType: (type) => {
    return get().transactions.filter((tx) => tx.type === type)
  },

  getTransactionsByStatus: (status) => {
    return get().transactions.filter((tx) => tx.status === status)
  },

  // Blockscout integration methods
  addBlockscoutMetadata: (id, metadata) => {
    set((state) => {
      const newTransactions = state.transactions.map((tx) =>
        tx.id === id
          ? {
              ...tx,
              blockscoutMetadata: {
                ...tx.blockscoutMetadata,
                ...metadata,
                explorerUrl:
                  metadata.explorerUrl || getCurrentChainConfig().explorerUrl,
                apiUrl: metadata.apiUrl || getCurrentChainConfig().apiUrl,
                chainId: metadata.chainId || getCurrentChainConfig().id,
              },
            }
          : tx
      )
      saveTransactionsToStorage(newTransactions)
      return { transactions: newTransactions }
    })
  },

  getTransactionsWithBlockscoutData: () => {
    return get().transactions.filter((tx) => tx.blockscoutMetadata)
  },

  syncWithBlockscoutToasts: (txId, toastData) => {
    // This method can be used to sync transaction store with Blockscout toast notifications
    // For example, updating transaction status based on toast events
    const transaction = get().transactions.find((tx) => tx.id === txId)
    if (transaction && toastData) {
      const updates: Partial<Transaction> = {}

      if (toastData.status) {
        updates.status = toastData.status
      }

      if (toastData.hash) {
        updates.hash = toastData.hash
      }

      if (toastData.error) {
        updates.error = toastData.error
      }

      if (Object.keys(updates).length > 0) {
        get().updateTransaction(txId, updates)
      }
    }
  },
}))
