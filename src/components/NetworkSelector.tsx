import React, { useState } from 'react';
import { useWallet } from '@/components/WalletProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Network, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CHAINS, CHAIN_DEFAULT } from '@/config/viem';
import { useNetworkAdapter } from '@/lib/network-adapter';
import { ensureWalletOnChain } from '@/lib/web3onboard';

const LAST_CHAIN_KEY = 'evm-last-chain-id'

export function NetworkSelector() {
  const { walletState } = useWallet();
  const { adapter } = useNetworkAdapter();
  const [currentChainId, setCurrentChainId] = useState<number>(CHAIN_DEFAULT.id);

  // Restore saved chain on mount
  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LAST_CHAIN_KEY)
      if (saved) {
        const savedId = parseInt(saved, 10)
        if (!Number.isNaN(savedId)) {
          setCurrentChainId(savedId)
          adapter.setChainId(savedId)
        }
      }
    } catch {}
  }, [adapter])

  const getCurrentChain = () => {
    return CHAINS.find(chain => chain.id === currentChainId) || CHAINS[0];
  };

  const handleChainSwitch = async (chainId: number) => {
    try {
      // Attempt to switch the connected wallet network first (if any)
      try {
        await ensureWalletOnChain(chainId)
      } catch (e) {
        // Non-fatal: user may not have a wallet connected yet or rejected
        console.warn('Wallet network switch skipped or failed:', e)
      }

      adapter.setChainId(chainId);
      setCurrentChainId(chainId);
      try {
        window.localStorage.setItem(LAST_CHAIN_KEY, String(chainId))
      } catch {}
      if (walletState?.type === 'evm') {
        console.log(`Switching to chain ${chainId}`);
      }
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch chain:', error);
    }
  };

  const getChainBadgeColor = (chainId: number) => {
    switch (chainId) {
      case 102031: // Testnet
        return 'bg-brand-green';
      case 11155111: // Sepolia
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const currentChain = getCurrentChain();

  // For navbar use, only show if wallet is connected
  if (!walletState?.type) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="gap-2 hover:bg-accent transition-colors"
        >
          <Network className="w-4 h-4" />
          <span className="hidden sm:inline font-medium">{currentChain.name}</span>
          <Badge 
            variant="secondary" 
            className={`h-5 w-5 p-0 rounded-full ${getChainBadgeColor(currentChain.id)}`}
          />
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        {/* Current Network Info */}
        <div className="px-3 py-2 border-b">
          <div className="text-xs text-muted-foreground mb-2">Current Network</div>
          <div className="flex items-center gap-3">
            <Badge className={`${getChainBadgeColor(currentChain.id)} h-8 w-8 flex items-center justify-center p-0 rounded-full`}>
              <Network className="h-4 w-4 text-white" />
            </Badge>
            <div className="flex-1">
              <div className="font-medium">{currentChain.name}</div>
              <div className="text-xs text-muted-foreground">
                Chain ID: {currentChain.id} • {currentChain.testnet ? 'testnet' : 'mainnet'}
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              Active
            </Badge>
          </div>
        </div>

        {/* Available Networks */}
        <div className="max-h-64 overflow-y-auto">
          <div className="px-3 py-2 text-xs text-muted-foreground uppercase font-medium">
            Switch Network
          </div>
          {CHAINS.map((chain) => (
            <DropdownMenuItem
              key={chain.id}
              onClick={() => handleChainSwitch(chain.id)}
              className="flex items-center gap-3 cursor-pointer"
              disabled={chain.id === currentChainId}
            >
              <Badge className={`${getChainBadgeColor(chain.id)} h-8 w-8 flex items-center justify-center p-0 rounded-full`}>
                <Network className="h-4 w-4 text-white" />
              </Badge>
              <div className="flex-1">
                <div className="font-medium">{chain.name}</div>
                <div className="text-xs text-muted-foreground">
                  Chain ID: {chain.id} • {chain.testnet ? 'testnet' : 'mainnet'}
                </div>
              </div>
              {chain.id === currentChainId && (
                <Badge variant="secondary" className="text-xs">
                  Current
                </Badge>
              )}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
