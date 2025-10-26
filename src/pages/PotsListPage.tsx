import { PotCard } from "@/components/PotCard";
import { PotCardSkeleton } from "@/components/PotCardSkeleton";
import { useEVMPotStore } from "@/store/evm-pot-store";
import { useWallet } from "@/components/WalletProvider";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Network } from "lucide-react";
import { useChainSwitch } from "@/hooks/use-chain-switch";
export function PotsListPage() {
  const { walletState } = useWallet();
  const { currentChain } = useChainSwitch();
  
  // EVM store
  const evmPots = useEVMPotStore((state) => state.sortedPots);
  const evmLoading = useEVMPotStore((state) => state.loading);
  const evmError = useEVMPotStore((state) => state.error);
  const evmHasMorePots = useEVMPotStore((state) => state.hasMorePots);
  const evmCurrentBatch = useEVMPotStore((state) => state.currentBatch);
  const evmTotalPots = useEVMPotStore((state) => state.totalPots);
  const evmFetchPots = useEVMPotStore((state) => state.fetchPots);
  const evmFetchNextBatch = useEVMPotStore((state) => state.fetchNextBatch);
  const evmClearCache = useEVMPotStore((state) => state.clearCache);
  
  // Use EVM data directly since we only support EVM now
  const currentData = {
    pots: evmPots,
    loading: evmLoading,
    error: evmError,
    hasMorePots: evmHasMorePots,
    currentBatch: evmCurrentBatch,
    totalPots: evmTotalPots,
    fetchPots: evmFetchPots,
    fetchNextBatch: evmFetchNextBatch,
    clearCache: evmClearCache,
    networkName: currentChain.name,
    networkType: 'evm'
  };
  
  useEffect(() => {
    currentData.fetchPots();
  }, [currentData.fetchPots]);
  return (
    <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <div className="flex items-center justify-center gap-3 mb-4">
          <h1 className="text-4xl md:text-5xl font-display font-bold">Treasure Pots</h1>
          {walletState?.type && (
            <Badge variant="default" className="flex items-center gap-1">
              <Network className="w-3 h-3" />
              {currentData.networkName}
            </Badge>
          )}
        </div>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
          Browse all available treasure hunts, active pots first, then newest first. May the sharpest mind win.
        </p>
        {!walletState?.type && (
          <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
            Connect a wallet to view pots from {currentChain.name}
          </p>
        )}
      </div>
      {currentData.error && (
        <div className="text-center mb-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-600 dark:text-red-400 font-medium">{currentData.error}</p>
            <p className="text-sm text-red-500 dark:text-red-500 mt-2">
              Showing up to 20 most recent pots to avoid rate limits.
            </p>
            <Button 
              onClick={() => currentData.fetchPots()} 
              variant="outline" 
              size="sm" 
              className="mt-3"
            >
              Try Again
            </Button>
          </div>
        </div>
      )}
      {!currentData.loading && !currentData.error && currentData.pots.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🏺</div>
          <h3 className="text-2xl font-display font-bold mb-2">No Pots Available</h3>
          <p className="text-slate-600 dark:text-slate-300 mb-8">
            There are no active treasure hunts on {currentData.networkName} at the moment. Be the first to create one!
          </p>
          <Button asChild size="lg">
            <Link to="/create">Create Your First Pot</Link>
          </Button>
        </div>
      )}
      {currentData.loading && (
        <div className="text-center mb-8">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-blue-600 dark:text-blue-400 font-medium">
              Fetching pot IDs from {currentData.networkName}...
            </p>
            <p className="text-sm text-blue-500 dark:text-blue-500 mt-2">
              This will start slow batch loading to avoid rate limits.
            </p>
          </div>
        </div>
      )}
      
      {!currentData.loading && currentData.totalPots > 0 && (
        <div className="text-center mb-8">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-green-600 dark:text-green-400 font-medium">
              Loading pots in batches of 10 every 100 seconds
            </p>
            <p className="text-sm text-green-500 dark:text-green-500 mt-2">
              Showing {currentData.pots.length} of {currentData.totalPots} pots
              {currentData.hasMorePots && ` • Next batch in ${Math.max(0, 100 - ((Date.now() - (currentData.currentBatch * 100000)) / 1000))}s`}
            </p>
            <div className="mt-3 space-x-2">
              {currentData.hasMorePots && (
                <Button 
                  onClick={() => currentData.fetchNextBatch()} 
                  variant="outline" 
                  size="sm"
                >
                  Load Next Batch Now
                </Button>
              )}
              <Button 
                onClick={() => currentData.clearCache()} 
                variant="outline" 
                size="sm"
              >
                Clear Cache
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {currentData.loading
          ? Array.from({ length: 6 }).map((_, i) => <PotCardSkeleton key={`skeleton-${i}`} />)
          : currentData.pots.map((pot) => (
              <PotCard key={pot.id} pot={pot} />
            ))}
      </div>
    </div>
  );
}