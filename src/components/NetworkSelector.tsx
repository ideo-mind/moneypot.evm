import React, { useState } from 'react';
import { useWallet } from '@/components/WalletProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, Network, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CHAINS, CHAIN_DEFAULT } from '@/config/viem';
import { useNetworkAdapter } from '@/lib/network-adapter';

export function NetworkSelector() {
  const { walletState, connectEVM, disconnect } = useWallet();
  const { adapter } = useNetworkAdapter();
  const [currentChainId, setCurrentChainId] = useState<number>(CHAIN_DEFAULT.id); // Default to Sepolia

  const getCurrentChain = () => {
    return CHAINS.find(chain => chain.id === currentChainId) || CHAINS[0];
  };

  const handleChainSwitch = async (chainId: number) => {
    try {
      adapter.setChainId(chainId);
      setCurrentChainId(chainId);
      
      // If wallet is connected, we might need to switch the wallet's chain
      if (walletState?.type === 'evm') {
        // Note: In a real implementation, you'd want to prompt the user to switch chains in their wallet
        console.log(`Switching to chain ${chainId}`);
      }
    } catch (error) {
      console.error('Failed to switch chain:', error);
    }
  };

  const getChainBadgeColor = (chainId: number) => {
    switch (chainId) {
      case 102031: // Creditcoin
        return 'bg-brand-green';
      case 11155111: // Sepolia
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const currentChain = getCurrentChain();

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Network</CardTitle>
      </CardHeader>
      <CardContent>
        {walletState?.type ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center gap-3">
                  <Network className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-medium">{currentChain?.name || 'Unknown Network'}</div>
                    <div className="text-xs text-muted-foreground">
                      Chain ID: {currentChain?.id || 'Unknown'}
                    </div>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80">
              {CHAINS.map((chain) => (
                <DropdownMenuItem
                  key={chain.id}
                  onClick={() => handleChainSwitch(chain.id)}
                  className="flex items-center gap-3"
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
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex flex-col gap-3">
            {CHAINS.map((chain) => (
              <Button
                key={chain.id}
                onClick={connectEVM}
                variant="outline"
                className="w-full justify-start"
              >
                <div className="flex items-center gap-3">
                  <Badge className={`${getChainBadgeColor(chain.id)} h-8 w-8 flex items-center justify-center p-0 rounded-full`}>
                    <Network className="h-4 w-4 text-white" />
                  </Badge>
                  <div className="text-left">
                    <div className="font-medium">{chain.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Chain ID: {chain.id} • {chain.testnet ? 'testnet' : 'mainnet'}
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
