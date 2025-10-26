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
    const handleEVMWalletChange = () => {
      const evmWallet = getConnectedWallet()
      if (evmWallet && evmWallet.accounts.length > 0) {
        const account = evmWallet.accounts[0]
        
        // Set wallet client in contract service
        evmContractService.setWalletClient(evmWallet)
        
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

    // Initial check
    handleEVMWalletChange()

    // Subscribe to wallet changes
    const unsubscribe = onboard.state.select('wallets').subscribe((wallets) => {
      handleEVMWalletChange()
    })

    return () => {
      unsubscribe.unsubscribe()
    }
  }, [])

  const connectEVM = async () => {
    setWalletState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const wallet = await onboard.connectWallet();
      if (wallet && wallet.length > 0 && wallet[0].accounts.length > 0) {
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
      await onboard.disconnectWallet()
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
