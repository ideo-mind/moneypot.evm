import { create } from "zustand"
import { Pot, Attempt } from "@/types"
import { evmContractService } from "@/lib/evm-api"
import { formatDistanceToNowStrict } from "date-fns"
import { MoneyPotData } from "@/abis/evm/money-pot"
import { formatTokenAmount } from "@/config/viem"

const EVM_ATTEMPTS_STORAGE_KEY = "evm-money-pot-attempts"
const EVM_POTS_STORAGE_KEY = "evm-money-pot-pots"
const EVM_POTS_METADATA_KEY = "evm-money-pot-metadata"

interface EVMPotMetadata {
  lastFetch: number
  totalPots: number
  fetchedPots: number
  allPotIds: string[]
}

interface EVMPotState {
  pots: Record<string, Pot>
  sortedPots: Pot[]
  currentPot: Pot | null
  attempts: Attempt[]
  loading: boolean
  error: string | null
  hasMorePots: boolean
  currentBatch: number
  totalPots: number
  fetchPots: (forceRefresh?: boolean) => Promise<void>
  fetchNextBatch: () => Promise<void>
  fetchPotById: (id: string) => Promise<void>
  getPotById: (id: string) => Pot | undefined
  addAttempt: (attempt: Attempt) => void
  addPot: (pot: Pot) => void
  clearCache: () => void
  expirePot: (potId: string) => Promise<boolean>
  expireAllPots: (
    potIds: string[]
  ) => Promise<{ success: number; failed: number }>
}

// Transform EVM MoneyPotData to UI Pot format
export const transformEVMPotToPot = (
  evmPot: MoneyPotData,
  chainId: number
): Pot => {
  // Handle missing or undefined values with defaults
  const totalAmount = evmPot.totalAmount || BigInt(0)
  const fee = evmPot.fee || BigInt(0)
  const attemptsCount = evmPot.attemptsCount || BigInt(0)
  const createdAt = evmPot.createdAt || BigInt(0)

  const totalValue = formatTokenAmount(totalAmount, chainId)
  const entryFee = formatTokenAmount(fee, chainId)
  const potentialReward = totalValue * 0.4

  let expiresAt: Date

  try {
    const raw = evmPot.expiresAt
    let timestamp: number

    if (raw == null || raw === undefined) {
      // Default to 24 hours from now if expiresAt is missing
      timestamp = Math.floor(Date.now() / 1000) + 86400
    } else {
      // Handle BigInt or number
      if (typeof raw === "bigint") {
        timestamp = Number(raw)
      } else if (typeof raw === "number") {
        timestamp = raw
      } else {
        timestamp = Number(raw.toString())
      }
    }

    // Convert seconds to milliseconds if needed
    if (timestamp < 1e12) timestamp *= 1000

    expiresAt = new Date(timestamp)
  } catch (error) {
    console.error("Error parsing EVM expiration date:", error)
    // fallback: +24h
    expiresAt = new Date(Date.now() + 86_400_000)
  }

  const isExpired = expiresAt < new Date()
  const timeLeft = isExpired
    ? `Expired ${formatDistanceToNowStrict(expiresAt, { addSuffix: true })}`
    : formatDistanceToNowStrict(expiresAt, { addSuffix: true })

  const difficulty = Math.min(
    (Number(attemptsCount) % 11) + 2,
    Number(attemptsCount) + 2
  )

  return {
    id: evmPot.id?.toString() || "0",
    creator: evmPot.creator || "0x0000000000000000000000000000000000000000",
    total_usdc: totalAmount.toString(),
    entry_fee: fee.toString(),
    created_at: createdAt.toString(),
    expires_at: expiresAt,
    is_active: evmPot.isActive ?? true,
    attempts_count: attemptsCount.toString(),
    one_fa_address: evmPot.oneFaAddress || "",
    one_fa_private_key: evmPot.oneFaPrivateKey || "",
    // UI-specific, transformed fields
    title: `Pot #${evmPot.id || "0"}`,
    totalValue,
    entryFee,
    potentialReward,
    timeLeft,
    isExpired,
    difficulty,
    // EVM-specific fields
    network: "evm",
    chainId: "11155111", // Sepolia
  }
}

export const useEVMPotStore = create<EVMPotState>((set, get) => ({
  pots: {},
  sortedPots: [],
  currentPot: null,
  attempts: [],
  loading: false,
  error: null,
  hasMorePots: true,
  currentBatch: 0,
  totalPots: 0,

  fetchPots: async (forceRefresh = false) => {
    const state = get()
    if (state.loading) return

    console.log(
      "EVM Pot Store: Starting fetchPots, forceRefresh:",
      forceRefresh
    )
    set({ loading: true, error: null })

    try {
      // Load metadata
      const metadataStr = localStorage.getItem(EVM_POTS_METADATA_KEY)
      let metadata: EVMPotMetadata = {
        lastFetch: 0,
        totalPots: 0,
        fetchedPots: 0,
        allPotIds: [],
      }

      if (metadataStr && !forceRefresh) {
        metadata = JSON.parse(metadataStr)
      }

      // Check if we need to refresh (every 30 seconds)
      const now = Date.now()
      const shouldRefresh = forceRefresh || now - metadata.lastFetch > 30000

      console.log("EVM Pot Store: Should refresh:", shouldRefresh)

      if (shouldRefresh) {
        console.log("EVM Pot Store: Fetching active pots from EVM contract...")
        // Fetch active pot IDs from EVM contract
        const activePotIds = (
          await evmContractService.getActivePots()
        ).reverse()

        console.log(
          "EVM Pot Store: Got active pot IDs (reversed):",
          activePotIds
        )

        // Update metadata with pot IDs
        metadata = {
          lastFetch: now,
          totalPots: activePotIds.length,
          fetchedPots: 0,
          allPotIds: activePotIds,
        }

        // Fetch pot data in batches of 10
        const batchSize = 10
        const transformedPots: Pot[] = []

        for (let i = 0; i < activePotIds.length; i += batchSize) {
          const batch = activePotIds.slice(i, i + batchSize)
          console.log(
            `EVM Pot Store: Fetching batch ${
              Math.floor(i / batchSize) + 1
            }, pots ${i + 1}-${Math.min(i + batchSize, activePotIds.length)}`
          )

          // Fetch pot data for this batch sequentially to avoid RPC overload
          for (const potId of batch) {
            try {
              const evmPot = await evmContractService.getPot(potId)
              if (evmPot) {
                const pot = transformEVMPotToPot(
                  evmPot,
                  evmContractService.currentChainId
                )
                transformedPots.push(pot)
              }
            } catch (error) {
              console.error(`Failed to fetch pot ${potId}:`, error)
              // Continue with next pot instead of failing entire batch
            }
            // Small delay between individual pot fetches to be gentle on RPC
            await new Promise((resolve) => setTimeout(resolve, 50))
          }

          // Update progress
          metadata.fetchedPots = transformedPots.length

          // Small delay between batches to avoid rate limiting
          if (i + batchSize < activePotIds.length) {
            await new Promise((resolve) => setTimeout(resolve, 200))
          }
        }

        console.log("EVM Pot Store: Transformed pots:", transformedPots)

        // Store pots
        const potsMap: Record<string, Pot> = {}
        transformedPots.forEach((pot) => {
          potsMap[pot.id] = pot
        })

        // Sort pots by creation date (newest first)
        const sortedPots = transformedPots.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

        set({
          pots: potsMap,
          sortedPots,
          totalPots: transformedPots.length,
          hasMorePots: false, // All pots fetched
          currentBatch: 1,
        })

        // Save to localStorage
        localStorage.setItem(EVM_POTS_METADATA_KEY, JSON.stringify(metadata))
        localStorage.setItem(EVM_POTS_STORAGE_KEY, JSON.stringify(potsMap))
      } else {
        // Load from localStorage
        const potsStr = localStorage.getItem(EVM_POTS_STORAGE_KEY)
        if (potsStr) {
          const potsMap = JSON.parse(potsStr)
          const sortedPots = Object.values(potsMap).sort(
            (a: any, b: any) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )

          set({
            pots: potsMap,
            sortedPots,
            totalPots: metadata.totalPots,
            hasMorePots: false,
          })
        }
      }
    } catch (error) {
      console.error("Failed to fetch EVM pots:", error)
      set({
        error: error instanceof Error ? error.message : "Failed to fetch pots",
      })
    } finally {
      set({ loading: false })
    }
  },

  fetchNextBatch: async () => {
    // EVM contract returns all active pots, so no pagination needed
    const state = get()
    if (!state.hasMorePots) return

    await state.fetchPots(true)
  },

  fetchPotById: async (id: string) => {
    const state = get()
    if (state.loading) return

    set({ loading: true, error: null })

    try {
      const evmPot = await evmContractService.getPot(id)
      if (evmPot) {
        const pot = transformEVMPotToPot(
          evmPot,
          evmContractService.currentChainId
        )

        set((state) => ({
          pots: { ...state.pots, [pot.id]: pot },
          currentPot: pot,
        }))
      }
    } catch (error) {
      console.error("Failed to fetch EVM pot:", error)
      set({
        error: error instanceof Error ? error.message : "Failed to fetch pot",
      })
    } finally {
      set({ loading: false })
    }
  },

  getPotById: (id: string) => {
    const state = get()
    return state.pots[id]
  },

  addAttempt: (attempt: Attempt) => {
    set((state) => ({
      attempts: [...state.attempts, attempt],
    }))

    // Save to localStorage
    const attemptsStr = localStorage.getItem(EVM_ATTEMPTS_STORAGE_KEY)
    const attempts = attemptsStr ? JSON.parse(attemptsStr) : []
    attempts.push(attempt)
    localStorage.setItem(EVM_ATTEMPTS_STORAGE_KEY, JSON.stringify(attempts))
  },

  addPot: (pot: Pot) => {
    set((state) => ({
      pots: { ...state.pots, [pot.id]: pot },
      sortedPots: [pot, ...state.sortedPots].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
      totalPots: state.totalPots + 1,
    }))
  },

  clearCache: () => {
    localStorage.removeItem(EVM_POTS_STORAGE_KEY)
    localStorage.removeItem(EVM_POTS_METADATA_KEY)
    localStorage.removeItem(EVM_ATTEMPTS_STORAGE_KEY)

    set({
      pots: {},
      sortedPots: [],
      currentPot: null,
      attempts: [],
      hasMorePots: true,
      currentBatch: 0,
      totalPots: 0,
    })
  },

  expirePot: async (potId: string) => {
    try {
      await evmContractService.expirePot(potId)

      // Update local state
      set((state) => {
        const pot = state.pots[potId]
        if (pot) {
          const updatedPot = { ...pot, is_active: false, isExpired: true }
          return {
            pots: { ...state.pots, [potId]: updatedPot },
            sortedPots: state.sortedPots.map((p) =>
              p.id === potId ? updatedPot : p
            ),
          }
        }
        return state
      })

      return true
    } catch (error) {
      console.error("Failed to expire EVM pot:", error)
      return false
    }
  },

  expireAllPots: async (potIds: string[]) => {
    let success = 0
    let failed = 0

    for (const potId of potIds) {
      const result = await get().expirePot(potId)
      if (result) {
        success++
      } else {
        failed++
      }
    }

    return { success, failed }
  },
}))
