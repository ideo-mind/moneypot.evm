import {
  publicClient,
  createEVMWalletClient,
  parseETH,
  formatETH,
  getChain,
  getPublicClient,
  parseTokenAmount,
  formatTokenAmount,
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
import { Address, erc20Abi, decodeEventLog } from "viem"
import { moneyPotABI } from "@/config/viem"

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
  public currentChainId: number = 11155111 // Default to Sepolia
  private originalWallet: any = null
  private hunterSharePercentCache: bigint | null = null // Cache for HUNTER_SHARE_PERCENT constant

  setWalletClient(wallet: any, chainId?: number) {
    this.originalWallet = wallet // Store original wallet for chain switching
    this.walletClient = createEVMWalletClient(
      wallet,
      chainId || this.currentChainId
    )
    if (chainId) {
      this.currentChainId = chainId
    }
  }

  setChainId(chainId: number) {
    this.currentChainId = chainId
    // Recreate wallet client with new chain if wallet is connected
    if (this.originalWallet) {
      this.walletClient = createEVMWalletClient(this.originalWallet, chainId)
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

  private getPublicClient(readOnly: boolean = true) {
    // Use load-balanced public client that rotates through all available RPCs
    // readOnly=true (default) → uses public RPCs for read operations
    // readOnly=false → uses private RPCs (Infura/Alchemy) for write transactions
    return getPublicClient(this.currentChainId, readOnly)
  }

  private getWalletClient() {
    if (!this.walletClient) {
      throw new Error("Wallet not connected")
    }
    return this.walletClient
  }

  // Get HUNTER_SHARE_PERCENT from contract (cached)
  async getHunterSharePercent(): Promise<bigint> {
    if (this.hunterSharePercentCache !== null) {
      return this.hunterSharePercentCache
    }

    const publicClient = this.getPublicClient(true) // Use public RPC for read
    const chainConfig = this.getChainConfig()

    try {
      const hunterSharePercent = await publicClient.readContract({
        address: chainConfig.contractAddress as Address,
        abi: moneyPotABI,
        functionName: "HUNTER_SHARE_PERCENT",
      })

      this.hunterSharePercentCache = hunterSharePercent as bigint
      return hunterSharePercent as bigint
    } catch (error) {
      console.error(
        "Failed to read HUNTER_SHARE_PERCENT, using default 90:",
        error
      )
      // Default to 90% if read fails
      this.hunterSharePercentCache = BigInt(90)
      return BigInt(90)
    }
  }

  // Check and approve token spending if needed
  async ensureTokenApproval(amount: bigint): Promise<void> {
    const walletClient = this.getWalletClient()
    const publicClient = this.getPublicClient(false) // Use default RPC for writes
    const chainConfig = this.getChainConfig()

    if (!chainConfig) {
      throw new Error(
        `Chain configuration not found for chain ID: ${this.currentChainId}`
      )
    }

    try {
      // Get wallet address
      const account = walletClient.account.address

      // Check current allowance
      const allowance = await publicClient.readContract({
        address: chainConfig.tokenAddress as Address,
        abi: erc20Abi,
        functionName: "allowance",
        args: [account, chainConfig.contractAddress],
      })

      console.log("Current allowance:", allowance.toString())
      console.log("Required amount:", amount.toString())

      // If allowance is insufficient, approve max uint256
      if (allowance < amount) {
        console.log("⚠️  Insufficient allowance, approving max tokens...")

        // Approve max uint256 (2^256 - 1) for best UX - only needs to approve once
        const maxApproval = BigInt(
          "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
        )

        const approveHash = await walletClient.writeContract({
          address: chainConfig.tokenAddress as Address,
          abi: erc20Abi,
          functionName: "approve",
          args: [chainConfig.contractAddress, maxApproval],
          gas: 5000000n, // Higher gas limit for approval transactions
        })

        // Wait for approval confirmation
        await publicClient.waitForTransactionReceipt({ hash: approveHash })
        console.log("Token approval completed")
      }
    } catch (error) {
      console.error("Failed to approve token spending:", error)
      throw error
    }
  }

  // Create a new pot
  async createPot(
    params: CreatePotParams
  ): Promise<{ txHash: string; potId: string }> {
    const walletClient = this.getWalletClient()
    const publicClient = this.getPublicClient(false) // Use default RPC for writes
    const chainConfig = this.getChainConfig()

    if (!chainConfig) {
      throw new Error(
        `Chain configuration not found for chain ID: ${this.currentChainId}`
      )
    }

    try {
      // First, ensure token approval
      await this.ensureTokenApproval(params.amount)

      // Now create the pot
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
        gas: 5000000n, // Higher gas limit for pot creation
      })

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status === "success") {
        console.log("Transaction successful, logs:", receipt.logs.length)

        // Extract pot ID from PotCreated event
        for (const log of receipt.logs) {
          try {
            const decodedEvent = decodeEventLog({
              abi: moneyPotABI,
              data: log.data,
              topics: log.topics,
            })

            if (decodedEvent.eventName === "PotCreated") {
              const potId = decodedEvent.args.id
              console.log("✅ Pot created with ID:", potId.toString())
              return { txHash: hash, potId: potId.toString() }
            }
          } catch (e) {
            // Not our event (e.g., Transfer events from ERC20), continue silently
            // Don't log errors for unrelated events
          }
        }

        console.error("PotCreated event not found in logs")
      }

      throw new Error("Transaction failed - PotCreated event not found")
    } catch (error) {
      console.error("Failed to create pot:", error)
      throw error
    }
  }

  // Attempt to solve a pot (returns attempt ID)
  async attemptPot(
    params: AttemptPotParams
  ): Promise<{ txHash: string; attemptId: string }> {
    const walletClient = this.getWalletClient()
    const publicClient = this.getPublicClient(false) // Use default RPC for writes
    const chainConfig = this.getChainConfig()

    if (!chainConfig) {
      throw new Error(
        `Chain configuration not found for chain ID: ${this.currentChainId}`
      )
    }

    try {
      // Get the pot to find the entry fee
      const potData = await this.getPot(params.potId.toString())
      if (!potData) {
        throw new Error("Pot not found")
      }

      console.log("Pot entry fee (bigint):", potData.fee.toString())

      // Ensure token approval for the entry fee
      console.log("Checking approval for entry fee...")
      await this.ensureTokenApproval(potData.fee)

      const hash = await walletClient.writeContract({
        address: chainConfig.contractAddress as Address,
        abi: contractFunctions.attemptPot.abi,
        functionName: contractFunctions.attemptPot.functionName,
        args: [params.potId],
        gas: 5000000n, // Higher gas limit for pot attempt
      })

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status === "success") {
        console.log(
          "Attempt transaction successful, logs:",
          receipt.logs.length
        )

        // Extract attempt ID from PotAttempted event
        for (const log of receipt.logs) {
          try {
            const decodedEvent = decodeEventLog({
              abi: moneyPotABI,
              data: log.data,
              topics: log.topics,
            })

            console.log(
              "Decoded event:",
              decodedEvent.eventName,
              decodedEvent.args
            )

            if (decodedEvent.eventName === "PotAttempted") {
              const attemptId = (decodedEvent.args as any).attemptId
              console.log("✅ Attempt created with ID:", attemptId.toString())
              return { txHash: hash, attemptId: attemptId.toString() }
            }
          } catch (e) {
            // Not our event, continue silently
          }
        }

        console.error("PotAttempted event not found in logs")
      }

      throw new Error("Transaction failed - PotAttempted event not found")
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

  // Get user's USD balance
  async getBalance(address: Address): Promise<number> {
    try {
      const publicClient = this.getPublicClient()
      const chainConfig = this.getChainConfig()

      if (!chainConfig) {
        throw new Error(
          `Chain configuration not found for chain ID: ${this.currentChainId}`
        )
      }

      // Use ERC20 balanceOf function instead of custom getBalance
      const result = await publicClient.readContract({
        address: chainConfig.tokenAddress as Address,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      })

      return formatTokenAmount(result as bigint, this.currentChainId)
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
    const publicClient = this.getPublicClient(false) // Use default RPC for writes
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
  async expirePot(potId: string): Promise<string> {
    const walletClient = this.getWalletClient()
    const publicClient = this.getPublicClient(false) // Use default RPC for writes
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
      return hash
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

  // Transform pot data for UI (async to read HUNTER_SHARE_PERCENT from contract)
  async transformPotData(potData: MoneyPotData): Promise<EVMPot> {
    const now = new Date()
    const expiresAt = new Date(Number(potData.expiresAt) * 1000)
    const isExpired = now > expiresAt

    const timeLeft = isExpired ? "Expired" : this.calculateTimeLeft(expiresAt)

    // Calculate potential reward using HUNTER_SHARE_PERCENT from contract
    const hunterSharePercent = await this.getHunterSharePercent()
    const rewardAmount =
      (potData.totalAmount * hunterSharePercent) / BigInt(100)

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
      totalValue: formatTokenAmount(potData.totalAmount, this.currentChainId),
      entryFee: formatTokenAmount(potData.fee, this.currentChainId),
      potentialReward: formatTokenAmount(rewardAmount, this.currentChainId),
      timeLeft,
      isExpired,
      creatorAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${potData.creator}`,
      creatorUsername: this.formatAddress(potData.creator), // Formatted address for display
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
