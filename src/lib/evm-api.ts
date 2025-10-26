import {
  publicClient,
  createEVMWalletClient,
  parseETH,
  formatETH,
  getChain,
} from "@/config/viem"
import {
  contractFunctions,
  formatPotData,
  formatAttemptData,
  MoneyPotData,
  AttemptData,
  CreatePotParams,
  AttemptPotParams,
} from "@/abis/evm/money-pot"
import { Address, createPublicClient, createWalletClient, http } from "viem"

export interface EVMPot {
  id: string
  creator: string
  total_usdc: string
  entry_fee: string
  created_at: string
  expires_at: Date
  is_active: boolean
  attempts_count: string
  one_fa_address: string
  // UI-specific, transformed fields
  title: string
  totalValue: number
  entryFee: number
  potentialReward: number
  timeLeft: string
  isExpired: boolean
  creatorAvatar: string
  creatorUsername: string
  difficulty: number
}

export interface EVMTransaction {
  hash: string
  type: "create_pot" | "attempt_pot" | "expire_pot"
  status: "pending" | "success" | "failed"
  timestamp: number
  description: string
  potId?: string
  amount?: string
  error?: string
}

class EVMContractService {
  private walletClient: any = null
  private currentChainId: number = 11155111 // Default to Sepolia

  setWalletClient(account: any, chainId?: number) {
    this.walletClient = createEVMWalletClient(
      account,
      chainId || this.currentChainId
    )
    if (chainId) {
      this.currentChainId = chainId
    }
  }

  setChainId(chainId: number) {
    this.currentChainId = chainId
    // Recreate wallet client with new chain if wallet is connected
    if (this.walletClient) {
      this.walletClient = createEVMWalletClient(
        this.walletClient.account,
        chainId
      )
    }
  }

  private getChainConfig() {
    const chain = getChain(this.currentChainId)
    return {
      chainId: chain.id,
      name: chain.name,
      type: chain.testnet ? "testnet" : "mainnet",
      rpcUrl: chain.rpcUrls.default.http[0],
      contractAddress: chain.custom.moneypot.address,
      tokenAddress: chain.custom.moneypot.token.address,
      explorerUrl: chain.blockExplorers.default.url,
    }
  }

  private getPublicClient() {
    const chain = getChain(this.currentChainId)
    // Use default HTTP RPC (Infura/publicnode) - hypersync doesn't support eth_call
    // Use the first default HTTP RPC which supports standard JSON-RPC methods
    return createPublicClient({
      chain,
      transport: http(),
    })
  }

  private getWalletClient() {
    if (!this.walletClient) {
      throw new Error("Wallet not connected")
    }
    return this.walletClient
  }

  // Create a new pot
  async createPot(params: CreatePotParams): Promise<string> {
    const walletClient = this.getWalletClient()
    const publicClient = this.getPublicClient()
    const chainConfig = this.getChainConfig()

    if (!chainConfig) {
      throw new Error(
        `Chain configuration not found for chain ID: ${this.currentChainId}`
      )
    }

    try {
      const hash = await walletClient.writeContract({
        address: chainConfig.contractAddress as Address,
        abi: contractFunctions.createPot.abi,
        functionName: contractFunctions.createPot.functionName,
        args: [
          params.amount,
          params.durationSeconds,
          params.fee,
          params.oneFaAddress,
        ],
      })

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status === "success") {
        // Extract pot ID from PotCreated event
        const potCreatedLog = receipt.logs.find(
          (log) =>
            log.topics[0] ===
            "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925" // PotCreated event signature
        )

        if (potCreatedLog) {
          const potId = BigInt(potCreatedLog.topics[1])
          return potId.toString()
        }
      }

      throw new Error("Transaction failed")
    } catch (error) {
      console.error("Failed to create pot:", error)
      throw error
    }
  }

  // Attempt to solve a pot (returns attempt ID)
  async attemptPot(params: AttemptPotParams): Promise<string> {
    const walletClient = this.getWalletClient()
    const publicClient = this.getPublicClient()
    const chainConfig = this.getChainConfig()

    if (!chainConfig) {
      throw new Error(
        `Chain configuration not found for chain ID: ${this.currentChainId}`
      )
    }

    try {
      const hash = await walletClient.writeContract({
        address: chainConfig.contractAddress as Address,
        abi: contractFunctions.attemptPot.abi,
        functionName: contractFunctions.attemptPot.functionName,
        args: [params.potId],
      })

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status === "success") {
        // Extract attempt ID from PotAttempted event
        const attemptLog = receipt.logs.find(
          (log) =>
            log.topics[0] ===
            "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925" // PotAttempted event signature
        )

        if (attemptLog) {
          const attemptId = BigInt(attemptLog.topics[1])
          return attemptId.toString()
        }
      }

      throw new Error("Transaction failed")
    } catch (error) {
      console.error("Failed to attempt pot:", error)
      throw error
    }
  }

  // Get pot data by ID
  async getPot(potId: string): Promise<MoneyPotData | null> {
    try {
      const publicClient = this.getPublicClient()
      const chainConfig = this.getChainConfig()

      if (!chainConfig) {
        throw new Error(
          `Chain configuration not found for chain ID: ${this.currentChainId}`
        )
      }

      const result = await publicClient.readContract({
        address: chainConfig.contractAddress as Address,
        abi: contractFunctions.getPot.abi,
        functionName: contractFunctions.getPot.functionName,
        args: [BigInt(potId)],
      })

      return formatPotData(result as MoneyPotData)
    } catch (error) {
      console.error("Failed to get pot:", error)
      return null
    }
  }

  // Get user's USDC balance
  async getBalance(address: Address): Promise<number> {
    try {
      const publicClient = this.getPublicClient()
      const chainConfig = this.getChainConfig()

      if (!chainConfig) {
        throw new Error(
          `Chain configuration not found for chain ID: ${this.currentChainId}`
        )
      }

      const result = await publicClient.readContract({
        address: chainConfig.tokenAddress as Address,
        abi: contractFunctions.getBalance.abi,
        functionName: contractFunctions.getBalance.functionName,
        args: [address],
      })

      return Number(result) / 10 ** 6 // PYUSD has 6 decimals
    } catch (error) {
      console.error("Failed to get balance:", error)
      return 0
    }
  }

  // Get all active pot IDs
  async getActivePots(): Promise<string[]> {
    try {
      console.log("EVM Contract Service: Getting active pots...")
      const publicClient = this.getPublicClient()
      const chainConfig = this.getChainConfig()

      if (!chainConfig) {
        throw new Error(
          `Chain configuration not found for chain ID: ${this.currentChainId}`
        )
      }

      const result = await publicClient.readContract({
        address: chainConfig.contractAddress as Address,
        abi: contractFunctions.getActivePots.abi,
        functionName: contractFunctions.getActivePots.functionName,
      })

      console.log("EVM Contract Service: Active pots result:", result)
      return (result as bigint[]).map((id) => id.toString())
    } catch (error) {
      console.error("Failed to get active pots:", error)
      return []
    }
  }

  // Get all pot IDs
  async getPots(): Promise<string[]> {
    try {
      const publicClient = this.getPublicClient()
      const chainConfig = this.getChainConfig()

      if (!chainConfig) {
        throw new Error(
          `Chain configuration not found for chain ID: ${this.currentChainId}`
        )
      }

      const result = await publicClient.readContract({
        address: chainConfig.contractAddress as Address,
        abi: contractFunctions.getPots.abi,
        functionName: contractFunctions.getPots.functionName,
      })

      return (result as bigint[]).map((id) => id.toString())
    } catch (error) {
      console.error("Failed to get pots:", error)
      return []
    }
  }

  // Get attempt data by ID
  async getAttempt(attemptId: string): Promise<AttemptData | null> {
    try {
      const publicClient = this.getPublicClient()
      const chainConfig = this.getChainConfig()

      if (!chainConfig) {
        throw new Error(
          `Chain configuration not found for chain ID: ${this.currentChainId}`
        )
      }

      const result = await publicClient.readContract({
        address: chainConfig.contractAddress as Address,
        abi: contractFunctions.getAttempt.abi,
        functionName: contractFunctions.getAttempt.functionName,
        args: [BigInt(attemptId)],
      })

      return formatAttemptData(result as AttemptData)
    } catch (error) {
      console.error("Failed to get attempt:", error)
      return null
    }
  }

  // Mark attempt as completed (oracle function)
  async attemptCompleted(attemptId: string, status: boolean): Promise<void> {
    const walletClient = this.getWalletClient()
    const publicClient = this.getPublicClient()
    const chainConfig = this.getChainConfig()

    if (!chainConfig) {
      throw new Error(
        `Chain configuration not found for chain ID: ${this.currentChainId}`
      )
    }

    try {
      const hash = await walletClient.writeContract({
        address: chainConfig.contractAddress as Address,
        abi: contractFunctions.attemptCompleted.abi,
        functionName: contractFunctions.attemptCompleted.functionName,
        args: [BigInt(attemptId), status],
      })

      // Wait for transaction confirmation
      await publicClient.waitForTransactionReceipt({ hash })
    } catch (error) {
      console.error("Failed to mark attempt completed:", error)
      throw error
    }
  }

  // Expire a pot
  async expirePot(potId: string): Promise<void> {
    const walletClient = this.getWalletClient()
    const publicClient = this.getPublicClient()
    const chainConfig = this.getChainConfig()

    if (!chainConfig) {
      throw new Error(
        `Chain configuration not found for chain ID: ${this.currentChainId}`
      )
    }

    try {
      const hash = await walletClient.writeContract({
        address: chainConfig.contractAddress as Address,
        abi: contractFunctions.expirePot.abi,
        functionName: contractFunctions.expirePot.functionName,
        args: [BigInt(potId)],
      })

      // Wait for transaction confirmation
      await publicClient.waitForTransactionReceipt({ hash })
    } catch (error) {
      console.error("Failed to expire pot:", error)
      throw error
    }
  }

  // Get next pot ID
  async getNextPotId(): Promise<number> {
    try {
      const publicClient = this.getPublicClient()
      const chainConfig = this.getChainConfig()

      if (!chainConfig) {
        throw new Error(
          `Chain configuration not found for chain ID: ${this.currentChainId}`
        )
      }

      const result = await publicClient.readContract({
        address: chainConfig.contractAddress as Address,
        abi: contractFunctions.nextPotId.abi,
        functionName: contractFunctions.nextPotId.functionName,
      })

      return Number(result)
    } catch (error) {
      console.error("Failed to get next pot ID:", error)
      return 0
    }
  }

  // Get next attempt ID
  async getNextAttemptId(): Promise<number> {
    try {
      const publicClient = this.getPublicClient()
      const chainConfig = this.getChainConfig()

      if (!chainConfig) {
        throw new Error(
          `Chain configuration not found for chain ID: ${this.currentChainId}`
        )
      }

      const result = await publicClient.readContract({
        address: chainConfig.contractAddress as Address,
        abi: contractFunctions.nextAttemptId.abi,
        functionName: contractFunctions.nextAttemptId.functionName,
      })

      return Number(result)
    } catch (error) {
      console.error("Failed to get next attempt ID:", error)
      return 0
    }
  }

  // Transform pot data for UI
  transformPotData(potData: MoneyPotData): EVMPot {
    const now = new Date()
    const expiresAt = new Date(Number(potData.expiresAt) * 1000)
    const isExpired = now > expiresAt

    const timeLeft = isExpired ? "Expired" : this.calculateTimeLeft(expiresAt)

    return {
      id: potData.id.toString(),
      creator: potData.creator,
      total_usdc: potData.totalAmount.toString(),
      entry_fee: potData.fee.toString(),
      created_at: potData.createdAt.toString(),
      expires_at: expiresAt,
      is_active: potData.isActive,
      attempts_count: potData.attemptsCount.toString(),
      one_fa_address: potData.oneFaAddress,
      title: `Pot #${potData.id}`,
      totalValue: Number(potData.totalAmount) / 10 ** 6,
      entryFee: Number(potData.fee) / 10 ** 6,
      potentialReward: Number(potData.totalAmount) / 10 ** 6,
      timeLeft,
      isExpired,
      creatorAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${potData.creator}`,
      creatorUsername: this.formatAddress(potData.creator), // Formatted address for display
      creatorAddress: potData.creator, // Full address from contract
      difficulty: Math.min(Number(potData.attemptsCount) + 1, 10),
    }
  }

  private formatAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  private calculateTimeLeft(expiresAt: Date): string {
    const now = new Date()
    const diff = expiresAt.getTime() - now.getTime()

    if (diff <= 0) return "Expired"

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }
}

// Export singleton instance
export const evmContractService = new EVMContractService()
