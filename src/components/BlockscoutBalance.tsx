import React, { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Coins, Wallet } from 'lucide-react';
import { getCurrentChainConfig } from '@/lib/blockscout-config';
import { formatUnits } from 'viem';

interface TokenBalance {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  isNative: boolean;
}

interface BlockscoutBalanceProps {
  address: string;
  chainId?: number;
  showTokenInfo?: boolean;
  className?: string;
}

export const BlockscoutBalance: React.FC<BlockscoutBalanceProps> = ({
  address,
  chainId,
  showTokenInfo = true,
  className = '',
}) => {
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentChain = getCurrentChainConfig();

  useEffect(() => {
    const fetchBalances = async () => {
      if (!address) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const apiUrl = currentChain.apiUrl;
        const balances: TokenBalance[] = [];
        
        // Fetch native token balance
        const nativeBalanceResponse = await fetch(`${apiUrl}/addresses/${address}`);
        if (nativeBalanceResponse.ok) {
          const nativeData = await nativeBalanceResponse.json();
          balances.push({
            address: '0x0000000000000000000000000000000000000000',
            symbol: currentChain.nativeCurrency.symbol,
            name: currentChain.nativeCurrency.name,
            decimals: currentChain.nativeCurrency.decimals,
            balance: nativeData.coin_balance || '0',
            isNative: true,
          });
        }
        
        // Fetch token balances
        const tokenBalancesResponse = await fetch(`${apiUrl}/addresses/${address}/token-balances`);
        if (tokenBalancesResponse.ok) {
          const tokenData = await tokenBalancesResponse.json();
          if (tokenData.items) {
            tokenData.items.forEach((token: any) => {
              // console.log('token data', token);
              balances.push({
                address: token.token.address,
                symbol: token.token.symbol,
                name: token.token.name,
                decimals: token.token.decimals,
                balance: token.value,
                isNative: false,
              });
            });
          }
        }
        
        setTokenBalances(balances);
      } catch (err) {
        console.error('Failed to fetch balances:', err);
        setError('Failed to load balance');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalances();
  }, [address, currentChain]);

  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-red-500 text-sm ${className}`}>
        Failed to load balance
      </div>
    );
  }

  if (!tokenBalances || tokenBalances.length === 0) {
    return (
      <div className={`text-gray-500 text-sm ${className}`}>
        No tokens found
      </div>
    );
  }

  const usdcToken = tokenBalances.find(token => 
    token.symbol === 'PYUSD' || token.symbol === 'USD' || token.address.toLowerCase() === '0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9'.toLowerCase()
  );

  const nativeToken = tokenBalances.find(token => 
    token.symbol === 'ETH' || token.isNative
  );

  // Format balance using formatUnits
  const formatBalance = (balance: string, decimals: number): string => {
    try {
      const balanceBigInt = BigInt(balance);
      return parseFloat(formatUnits(balanceBigInt, decimals)).toFixed(2);
    } catch {
      return parseFloat(balance).toFixed(2);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {showTokenInfo && (
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Wallet Balance
          </span>
        </div>
      )}
      
      <div className="space-y-1">
        {usdcToken && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {usdcToken.symbol}
              </span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {formatBalance(usdcToken.balance, usdcToken.decimals)}
            </Badge>
          </div>
        )}
        
        {nativeToken && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {nativeToken.symbol}
              </span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {formatBalance(nativeToken.balance, nativeToken.decimals)}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
};

interface BlockscoutTokenInfoProps {
  tokenAddress: string;
  chainId?: number;
  showBalance?: boolean;
  address?: string;
  className?: string;
}

export const BlockscoutTokenInfo: React.FC<BlockscoutTokenInfoProps> = ({
  tokenAddress,
  chainId,
  showBalance = false,
  address,
  className = '',
}) => {
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentChain = getCurrentChainConfig();

  useEffect(() => {
    const fetchTokenInfo = async () => {
      if (!tokenAddress) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const apiUrl = currentChain.apiUrl;
        
        // Fetch token information
        const tokenResponse = await fetch(`${apiUrl}/tokens/${tokenAddress}`);
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          setTokenInfo(tokenData);
        } else {
          setError('Token not found');
        }
      } catch (err) {
        console.error('Failed to fetch token info:', err);
        setError('Failed to load token info');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokenInfo();
  }, [tokenAddress, currentChain]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
            {showBalance && <Skeleton className="h-3 w-16" />}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="text-red-500 text-sm">
            Failed to load token info
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tokenInfo) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="text-gray-500 text-sm">
            Token not found
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-blue-500" />
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {tokenInfo.name}
            </span>
            <Badge variant="outline" className="text-xs">
              {tokenInfo.symbol}
            </Badge>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Decimals: {tokenInfo.decimals}
          </div>
          
          {showBalance && address && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Balance: {parseFloat(tokenInfo.balance || '0').toFixed(6)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
