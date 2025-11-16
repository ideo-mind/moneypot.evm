import { getConnectedWallet, onboard } from '@/lib/web3onboard';
import { PropsWithChildren, createContext, useContext, useEffect, useState } from 'react';
import { evmContractService } from '@/lib/evm-api';

// Wallet types - only EVM now
export type WalletType = 'evm';

export interface WalletState {
  type: WalletType | null;
  address: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

interface WalletContextType {
  walletState: WalletState;
  connectEVM: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

const LAST_WALLET_KEY = 'evm-last-wallet-label';

export const WalletProvider = ({ children }: PropsWithChildren) => {
  const [walletState, setWalletState] = useState<WalletState>({
    type: null,
    address: null,
    isConnected: false,
    isLoading: false,
    error: null,
  });


  // Monitor EVM wallet connection
  useEffect(() => {
    const autoReconnectIfNeeded = async () => {
      try {
        const current = onboard.state.get().wallets;
        if (current && current.length > 0) return; // already connected
        const savedLabel = typeof window !== 'undefined' ? window.localStorage.getItem(LAST_WALLET_KEY) : null;
        if (savedLabel) {
          try {
            await onboard.connectWallet({
              autoSelect: { label: savedLabel, disableModals: true },
            } as any);
          } catch {}
        }
      } catch {}
    };

    const handleEVMWalletChange = () => {
      const evmWallet = getConnectedWallet()
      if (evmWallet && evmWallet.accounts.length > 0) {
        const account = evmWallet.accounts[0]

        // Persist last connected wallet label for auto-reconnect
        try {
          if (typeof window !== 'undefined' && evmWallet.label) {
            window.localStorage.setItem(LAST_WALLET_KEY, evmWallet.label)
          }
        } catch {}
        
        // Set wallet client in contract service
        const chainId = evmContractService.currentChainId || 11155111
        evmContractService.setWalletClient(evmWallet, chainId)
        
        setWalletState({
          type: 'evm',
          address: account.address,
          isConnected: true,
          isLoading: false,
          error: null,
        })
      } else {
        setWalletState({
          type: null,
          address: null,
          isConnected: false,
          isLoading: false,
          error: null,
        })
      }
    }

    // Attempt auto-reconnect first
    autoReconnectIfNeeded().finally(() => {
    // Initial check
    handleEVMWalletChange()

    // Subscribe to wallet changes
      const unsubscribe = onboard.state.select('wallets').subscribe(() => {
      handleEVMWalletChange()
    })

    return () => {
      unsubscribe.unsubscribe()
    }
    })
  }, [])

  const connectEVM = async () => {
    setWalletState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const wallet = await onboard.connectWallet();
      if (wallet && wallet.length > 0 && wallet[0].accounts.length > 0) {
        // Persist label for future auto-reconnect
        try {
          if (wallet[0].label) {
            window.localStorage.setItem(LAST_WALLET_KEY, wallet[0].label)
          }
        } catch {}
        setWalletState(prev => ({
          ...prev,
          type: 'evm',
          address: wallet[0].accounts[0].address,
          isConnected: true,
          isLoading: false
        }));
      } else {
        throw new Error('No wallet connected');
      }
    } catch (error) {
      setWalletState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to connect EVM wallet',
        isLoading: false
      }));
    }
  };

  const disconnect = async () => {
    setWalletState(prev => ({ ...prev, isLoading: true }))
    try {
      const connectedWallets = onboard.state.get().wallets
      if (connectedWallets.length > 0) {
        await onboard.disconnectWallet({ label: connectedWallets[0].label })
      }
      try {
        window.localStorage.removeItem(LAST_WALLET_KEY)
      } catch {}
      // State will be updated by the subscription handler
    } catch (error) {
      console.error('Disconnect error:', error)
      setWalletState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to disconnect wallet',
        isLoading: false
      }))
    }
  }

  const contextValue: WalletContextType = {
    walletState,
    connectEVM,
    disconnect,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
