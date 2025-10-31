import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatETH, publicClient } from '@/config/viem';
import { evmContractService } from '@/lib/evm-api';
import { getConnectedWallet } from '@/lib/web3onboard';
import { ensureWalletOnChain } from '@/lib/web3onboard';
import { AlertTriangle, ChevronDown, Coins, Copy, LogOut, Moon, Sun, Wallet, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useWallet } from './WalletProvider';
import { useChainSwitch } from '@/hooks/use-chain-switch';
import { useTheme } from '@/hooks/use-theme';

interface WalletBalances {
  usdc: number | null;
  eth: number | null;
  loading: boolean;
}

export function WalletConnectButton() {
  const { walletState, connectEVM, disconnect } = useWallet();
  const { currentChain } = useChainSwitch();
  const { isDark, toggleTheme } = useTheme();
  const [balances, setBalances] = useState<WalletBalances>({
    usdc: null,
    eth: null,
    loading: false
  });
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);

  const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  // Check if wallet is on the correct network
  useEffect(() => {
    const checkNetwork = () => {
      if (walletState.type === 'evm') {
        const evmWallet = getConnectedWallet();
        if (evmWallet?.provider) {
          // Get current chain ID from the provider
          evmWallet.provider.request({ method: 'eth_chainId' })
            .then((chainId: string) => {
              const isCorrectNetwork = chainId === `0x${currentChain.id.toString(16)}`; // Current chain ID in hex
              setIsWrongNetwork(!isCorrectNetwork);
            })
            .catch(() => {
              // If we can't get the chain ID, assume wrong network
              setIsWrongNetwork(true);
            });
        } else {
          setIsWrongNetwork(true);
        }
      }
    };

    checkNetwork();

    // Listen for chain changes in EVM wallets
    if (walletState.type === 'evm') {
      const evmWallet = getConnectedWallet();
      if (evmWallet?.provider) {
        const handleChainChanged = () => {
          checkNetwork();
        };

        evmWallet.provider.on('chainChanged', handleChainChanged);

        return () => {
          evmWallet.provider.removeListener('chainChanged', handleChainChanged);
        };
      }
    }
  }, [walletState.type, currentChain.id]);

  // Fetch balances when connected
  useEffect(() => {
    const fetchBalances = async () => {
      if (walletState.isConnected && walletState.address) {
        setBalances(prev => ({ ...prev, loading: true }));
        try {
          // Get ETH balance
          let ethBalance = 0;
          try {
            const balance = await publicClient.getBalance({
              address: walletState.address as `0x${string}`,
            });
            ethBalance = formatETH(balance);
          } catch (error) {
            console.error('Failed to fetch ETH balance:', error);
          }

          // Get token balance from contract
          let usdcBalance = 0;
          try {
            usdcBalance = await evmContractService.getBalance(walletState.address as `0x${string}`);
          } catch (error) {
            console.error('Failed to fetch token balance:', error);
          }

          setBalances({
            usdc: usdcBalance,
            eth: ethBalance,
            loading: false
          });
        } catch (error) {
          console.error('Failed to fetch balances:', error);
          setBalances({
            usdc: null,
            eth: null,
            loading: false
          });
        }
      } else {
        setBalances({
          usdc: null,
          eth: null,
          loading: false
        });
      }
    };

    if (walletState.isConnected) {
      fetchBalances();
    } else {
      setBalances({ usdc: null, eth: null, loading: false });
    }
  }, [walletState.address, walletState.isConnected, walletState.type]);

  const copyAddress = () => {
    if (walletState.address) {
      navigator.clipboard.writeText(walletState.address);
    }
  };

  const switchToSelected = async () => {
    try {
      await ensureWalletOnChain(currentChain.id);
    } catch (error) {
      console.error('Failed to switch EVM network:', error);
    }
  };

  if (walletState.isConnected && walletState.address) {
    return (
      <div className="flex flex-col gap-2">
        {/* Network Warning */}
        {isWrongNetwork && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-700 dark:text-red-300">
              Wrong network! Please switch to {currentChain.name}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={switchToSelected}
              className="ml-auto h-6 px-2 text-xs"
            >
              Switch
            </Button>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              <span>{formatAddress(walletState.address)}</span>
              <span className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                {walletState.type?.toUpperCase()}
              </span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
          {/* Address Section */}
          <DropdownMenuLabel className="px-3 py-2">
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Wallet Address</div>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded flex-1 break-all">
                  {walletState.address}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyAddress}
                  className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {/* Network Section */}
          <DropdownMenuLabel className="px-3 py-2">
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Network</div>
              <div className="flex items-center gap-2">
                <Wifi className={`w-3 h-3 ${isWrongNetwork ? 'text-red-500' : 'text-green-500'}`} />
                <span className={`text-xs ${isWrongNetwork ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {currentChain.name}
                </span>
                {isWrongNetwork && (
                  <span className="text-xs text-red-500">(Wrong Network)</span>
                )}
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {/* Balance Section */}
          <DropdownMenuLabel className="px-3 py-2">
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Balances</div>
              {balances.loading ? (
                <div className="text-xs text-muted-foreground">Loading balances...</div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <Coins className="w-3 h-3 text-purple-500" />
                    <span>ETH: {typeof balances.eth === 'number' ? balances.eth.toFixed(4) : '0.0000'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Coins className="w-3 h-3 text-blue-500" />
                    <span>Token: {typeof balances.usdc === 'number' ? balances.usdc.toFixed(2) : '0.00'}</span>
                  </div>
                </div>
              )}
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {/* Theme Toggle */}
          <DropdownMenuItem onClick={toggleTheme} className="flex items-center gap-2 cursor-pointer">
            {isDark ? (
              <>
                <Sun className="w-4 h-4" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4" />
                <span>Dark Mode</span>
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Disconnect Button */}
          <DropdownMenuItem onClick={disconnect} className="flex items-center gap-2 cursor-pointer">
            <LogOut className="w-4 h-4" />
            <span>Disconnect</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    );
  }

  return (
    <Button
      disabled={walletState.isLoading}
      className="bg-brand-green hover:bg-brand-green/90 text-white"
      onClick={async () => {
        // If already connected (e.g., extension says connected), try autoSelect first
        const already = getConnectedWallet()
        if (already) return; // no-op
        await connectEVM()
      }}
    >
      {walletState.isLoading ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  );
}
