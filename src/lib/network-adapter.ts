import React from "react"
import { useWallet } from "@/components/WalletProvider"
import { useEVMPotStore } from "@/store/evm-pot-store"
import { evmContractService } from "@/lib/evm-api"
import {
  evmVerifierService,
  EVMVerifierServiceClient,
} from "@/lib/evm-verifier-api"
import { getConnectedWallet } from "@/lib/web3onboard"
import { parseTokenAmount } from "@/config/viem"

export interface CreatePotParams {
  amount: number
  duration: number
  fee: number
  password: string
  colorMap: Record<string, string>
}

export interface AttemptPotParams {
  potId: string
}

export interface VerifyAttemptParams {
  attemptId: string
  success: boolean
}

export interface NetworkClient {
  createPot(params: CreatePotParams): Promise<string>
  attemptPot(params: AttemptPotParams): Promise<string>
  verifyAttempt(params: VerifyAttemptParams): Promise<boolean>
  getPot(potId: string): Promise<any>
  getActivePots(): Promise<string[]>
  getAllPots(): Promise<string[]>
  expirePot(potId: string): Promise<boolean>
}

class NetworkAdapter {
  private walletType: string | null = null
  private walletAddress: string | null = null
  private evmClient: EVMClient | null = null
  private currentChainId: number = 11155111 // Default to Sepolia

  constructor() {
    this.evmClient = new EVMClient()
  }

  async initialize(): Promise<void> {
    // No initialization needed for hardcoded chains
  }

  setWallet(type: string, address: string, chainId?: number) {
    this.walletType = type
    this.walletAddress = address

    if (chainId) {
      this.currentChainId = chainId
    }

    // Initialize clients with wallet info
    if (type === "evm") {
      // Set wallet account for EVM client if connected
      const wallet = getConnectedWallet()
      if (wallet) {
        evmContractService.setWalletClient(
          wallet, // Pass the entire wallet object
          this.currentChainId
        )
      }
    }
  }

  setChainId(chainId: number) {
    this.currentChainId = chainId
    evmContractService.setChainId(chainId)
  }

  get currentChain(): number {
    return this.currentChainId
  }

  get client(): NetworkClient {
    if (this.walletType === "evm") {
      return this.evmClient!
    }
    throw new Error("No wallet connected or unsupported wallet type")
  }

  get currentWalletType(): string | null {
    return this.walletType
  }
}

class EVMClient implements NetworkClient {
  async createPot(params: CreatePotParams): Promise<string> {
    const chainId = evmContractService.currentChainId
    const amount = parseTokenAmount(params.amount, chainId)
    const fee = parseTokenAmount(params.fee, chainId)
    const durationSeconds = BigInt(params.duration) // duration is already in seconds

    // Step 1: Create pot on blockchain with creator's address as placeholder 1FA
    const wallet = getConnectedWallet()
    if (!wallet || !wallet.accounts || wallet.accounts.length === 0) {
      throw new Error("No wallet connected")
    }

    const creatorAddress = wallet.accounts[0].address

    // Create pot on blockchain first (1FA address is just a placeholder, doesn't matter)
    const potId = await evmContractService.createPot({
      amount,
      durationSeconds,
      fee,
      oneFaAddress: creatorAddress, // Just a placeholder address parameter
    })

    // Step 2: Register pot with verifier service
    const currentTime = Math.floor(Date.now() / 1000)

    const payload = {
      pot_id: potId,
      "1p": params.password,
      legend: params.colorMap,
      iat: currentTime,
      iss: creatorAddress,
      exp: currentTime + 3600,
      chain_id: evmContractService.currentChainId || 11155111,
    }

    // Create signature - sign the payload JSON string directly (matching demo.py)
    // Use compact JSON formatting (json.dumps with separators=(',', ':'))
    const payloadJson = JSON.stringify(payload, null, 0).replace(/\s/g, "")
    const signature = await EVMVerifierServiceClient.createEVMSignature(
      wallet,
      payloadJson
    )

    // Register with verifier
    const registerResult = await evmVerifierService.registerVerify(
      payload,
      signature
    )

    if (!registerResult.success && registerResult.error) {
      console.error("Failed to register pot:", registerResult.error)
      // Don't throw - pot is created on chain, registration can be retried
    }

    return potId
  }

  async attemptPot(params: AttemptPotParams): Promise<string> {
    const potId = BigInt(params.potId)
    return evmContractService.attemptPot({ potId })
  }

  async verifyAttempt(params: VerifyAttemptParams): Promise<boolean> {
    const attemptId = BigInt(params.attemptId)
    await evmContractService.attemptCompleted(
      attemptId.toString(),
      params.success
    )
    return true
  }

  async getPot(potId: string): Promise<any> {
    return evmContractService.getPot(potId)
  }

  async getActivePots(): Promise<string[]> {
    return evmContractService.getActivePots()
  }

  async getAllPots(): Promise<string[]> {
    return evmContractService.getPots()
  }

  async expirePot(potId: string): Promise<boolean> {
    try {
      await evmContractService.expirePot(potId)
      return true
    } catch (error) {
      console.error("Failed to expire pot:", error)
      return false
    }
  }
}

export const useNetworkAdapter = () => {
  const { walletState } = useWallet()
  const evmStore = useEVMPotStore()

  const adapter = React.useMemo(() => new NetworkAdapter(), [])

  // Initialize chain manager and set wallet info when wallet state changes
  React.useEffect(() => {
    const initializeAdapter = async () => {
      await adapter.initialize()

      if (walletState?.type && walletState?.address) {
        adapter.setWallet(walletState.type, walletState.address)
      }
    }

    initializeAdapter()
  }, [walletState, adapter])

  return { adapter }
}
