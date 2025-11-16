import { createWalletClient, http, parseEther } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import {
  evmVerifierService,
  EVMVerifierServiceClient,
} from "@/lib/evm-verifier-api"
import { sepolia, getChain } from "@/config/viem"

export interface AirdropResult {
  success: boolean
  message?: string
  transactionHash?: string
  error?: string
}

export interface AirdropParams {
  amount?: number
  message?: string
  chainId?: number
}

class EVMFaucetService {
  private baseUrl: string
  private chainId: number

  constructor(
    baseUrl: string = "https://auth.money-pot.ideomind.org",
    chainId: number = 11155111
  ) {
    this.baseUrl = baseUrl
    this.chainId = chainId
  }

  /**
   * Request airdrop for ETH and PYUSD tokens
   * @param params - Airdrop parameters
   * @returns Promise<AirdropResult>
   */
  async requestAirdrop(params: AirdropParams = {}): Promise<AirdropResult> {
    try {
      const {
        amount = 200, // Default amount as per documentation
        message = "Claim airdrop",
        chainId,
      } = params

      // Use provided chainId or fall back to instance chainId
      const targetChainId = chainId ?? this.chainId
      const targetChain = getChain(targetChainId)

      // Generate random wallet for airdrop request
      const randomAccount = privateKeyToAccount(
        `0x${Array.from({ length: 64 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join("")}`
      )

      // Create wallet client
      const walletClient = createWalletClient({
        account: randomAccount,
        chain: targetChain,
        transport: http(),
      })

      const address = randomAccount.address
      const currentTime = Math.floor(Date.now() / 1000)

      // Create airdrop payload
      const payload = {
        amount,
        message,
        chain_id: targetChainId,
        iat: currentTime,
        iss: address,
        exp: currentTime + 3600, // 1 hour
      }

      // Sign the payload using the generated wallet
      const messageString = JSON.stringify(payload)
      const signature = await walletClient.signMessage({
        message: messageString,
      })

      // Convert payload to hex-encoded string (as expected by middleware)
      const encryptedPayload = Buffer.from(messageString, "utf-8").toString(
        "hex"
      )

      // Request airdrop from verifier service
      const result = await evmVerifierService.airdrop(
        encryptedPayload,
        signature
      )

      if (result.success) {
        return {
          success: true,
          message: result.message || "Airdrop successful",
          transactionHash: result.data?.transactionHash,
        }
      } else {
        return {
          success: false,
          error: result.message || "Airdrop failed",
        }
      }
    } catch (error) {
      console.error("Airdrop request failed:", error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      }
    }
  }

  /**
   * Check if airdrop is available for the current network
   * @returns boolean
   */
  isAirdropAvailable(): boolean {
    // Only available for Sepolia
    return this.chainId === 11155111
  }

  /**
   * Get airdrop information
   * @returns object with airdrop details
   */
  getAirdropInfo() {
    const chain = getChain(this.chainId)
    return {
      available: this.isAirdropAvailable(),
      amount: 200,
      tokens: ["ETH", "PYUSD"],
      network: chain.name,
      chainId: this.chainId,
      faucets: {
        eth: chain.nativeCurrency.faucet || [],
        pyusd: chain.custom?.moneypot?.token?.faucet || [],
      },
    }
  }
}

export const evmFaucetService = new EVMFaucetService()
export default EVMFaucetService
