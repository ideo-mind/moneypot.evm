import { VERIFIER_API_URL } from "@/config"
import { CHAIN_DEFAULT } from "@/config/viem"
import { hashMessage, recoverMessageAddress } from "viem"

export interface EVMVerifierResponse {
  success: boolean
  message?: string
  data?: any
  error?: string
}

export interface EVMRegisterOptions {
  colors: Record<string, string>
  directions: Record<string, string>
}

export interface EVMRegisterPayload {
  pot_id: string
  "1p": string
  legend: Record<string, string>
  iat: number
  iss: string
  exp: number
  chain_id: number
}

export interface EVMAuthenticateOptions {
  challenges: Array<{
    id: string
    type: string
    question: string
    options?: string[]
    colorGroups?: Record<string, string>
  }>
  challenge_id: string
  colors?: Record<string, string>
  directions?: Record<string, string>
}

export interface EVMAuthenticatePayload {
  solutions: string[]
  challenge_id: string
  chain_id: number
}

class EVMVerifierServiceClient {
  private baseUrl: string
  private chainId: number

  constructor(
    baseUrl: string = VERIFIER_API_URL,
    chainId: number = CHAIN_DEFAULT.id
  ) {
    this.baseUrl = baseUrl
    this.chainId = chainId
  }

  private async makeRequest<T>(
    endpoint: string,
    method: "GET" | "POST" = "GET",
    body?: any,
    additionalHeaders?: Record<string, string>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...additionalHeaders,
    }

    const config: RequestInit = {
      method,
      headers,
    }

    if (body && method !== "GET") {
      config.body = JSON.stringify(body)
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error(`EVM Verifier API Error (${endpoint}):`, error)
      throw error
    }
  }

  async healthCheck(): Promise<EVMVerifierResponse> {
    return this.makeRequest<EVMVerifierResponse>("/health")
  }

  async registerOptions(): Promise<EVMRegisterOptions> {
    return this.makeRequest<EVMRegisterOptions>("/evm/register/options", "GET")
  }

  async registerVerify(
    payload: EVMRegisterPayload,
    signature: string
  ): Promise<EVMVerifierResponse> {
    // Format the request to match demo.py pattern
    const payloadJson = JSON.stringify(payload)

    const requestPayload = {
      encrypted_payload: Buffer.from(payloadJson, "utf-8").toString("hex"),
      signature: signature,
    }

    return this.makeRequest<EVMVerifierResponse>(
      "/evm/register/verify",
      "POST",
      requestPayload
    )
  }

  async authenticateOptions(
    attemptId: string,
    signature: string
  ): Promise<EVMAuthenticateOptions> {
    // Create wallet payload matching demo.py pattern
    const walletPayload = {
      attempt_id: attemptId,
      chain_id: this.chainId,
    }

    const requestPayload = {
      encrypted_payload: Buffer.from(
        JSON.stringify(walletPayload),
        "utf-8"
      ).toString("hex"),
      signature: signature,
    }

    return this.makeRequest<EVMAuthenticateOptions>(
      "/evm/authenticate/options",
      "POST",
      requestPayload
    )
  }

  async authenticateVerify(
    solutions: string[],
    challengeId: string,
    signature: string
  ): Promise<EVMVerifierResponse> {
    // Create wallet payload matching demo.py pattern
    const walletPayload = {
      challenge_id: challengeId,
      solutions: solutions,
      chain_id: this.chainId,
    }

    const requestPayload = {
      encrypted_payload: Buffer.from(
        JSON.stringify(walletPayload),
        "utf-8"
      ).toString("hex"),
      signature: signature,
    }

    return this.makeRequest<EVMVerifierResponse>(
      "/evm/authenticate/verify",
      "POST",
      requestPayload
    )
  }

  async airdrop(
    encryptedPayload: string,
    signature: string
  ): Promise<EVMVerifierResponse> {
    return this.makeRequest<EVMVerifierResponse>("/evm/airdrop", "POST", {
      encrypted_payload: encryptedPayload,
      signature,
    })
  }

  // Helper method to create signature for EVM messages using Web3OnboardKit wallet
  static async createEVMSignature(
    wallet: any,
    message: string
  ): Promise<string> {
    try {
      if (!wallet || !wallet.provider) {
        throw new Error("No wallet provider available")
      }

      // Use Web3OnboardKit's wallet to sign the message
      const signature = await wallet.provider.request({
        method: "personal_sign",
        params: [message, wallet.accounts[0].address],
      })

      return signature
    } catch (error) {
      console.error("Failed to create EVM signature:", error)
      throw error
    }
  }

  // Helper method to encrypt payload (simple hex encoding as per demo.py)
  static encryptPayload(payload: any): string {
    try {
      const jsonString = JSON.stringify(payload)
      return Buffer.from(jsonString, "utf-8").toString("hex")
    } catch (error) {
      console.error("Failed to encrypt payload:", error)
      throw error
    }
  }
}

export const evmVerifierService = new EVMVerifierServiceClient()
export { EVMVerifierServiceClient }
export default EVMVerifierServiceClient

// Helper function to get authentication options with colors and directions
export const getAuthOptions = async (
  attemptId: string,
  walletAddress: string
): Promise<EVMAuthenticateOptions> => {
  try {
    // Get the connected wallet to create a signature
    const { getConnectedWallet } = await import("@/lib/web3onboard")
    const wallet = getConnectedWallet()

    if (!wallet) {
      // Return mock data immediately if no wallet connected (common on page load)
      console.log("No wallet connected, returning mock auth options")
      return {
        challenges: [],
        challenge_id: "",
        colors: {
          red: "#ef4444",
          green: "#22c55e",
          blue: "#3b82f6",
          yellow: "#eab308",
        },
        directions: {
          up: "U",
          down: "D",
          left: "L",
          right: "R",
        },
      }
    }

    // Create a signature for authentication (sign attempt_id directly as per demo.py)
    const signature = await EVMVerifierServiceClient.createEVMSignature(
      wallet,
      attemptId
    )

    // Call the actual API
    const authOptions = await evmVerifierService.authenticateOptions(
      attemptId,
      signature
    )

    return authOptions
  } catch (error) {
    console.error("Failed to get auth options:", error)
    // Fallback to mock data if API fails
    return {
      challenges: [],
      challenge_id: "",
      colors: {
        red: "#ef4444",
        green: "#22c55e",
        blue: "#3b82f6",
        yellow: "#eab308",
      },
      directions: {
        up: "U",
        down: "D",
        left: "L",
        right: "R",
      },
    }
  }
}
