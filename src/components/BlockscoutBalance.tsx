import React from 'react';
import { useTokenBalances } from '@blockscout/app-sdk';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Coins, Wallet } from 'lucide-react';
import { getTokenConfig } from '@/lib/blockscout-config';

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
  const { data: tokenBalances, isLoading, error } = useTokenBalances(address, chainId);

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
    token.symbol === 'USDC' || token.address.toLowerCase() === getTokenConfig('USDC')?.address.toLowerCase()
  );

  const nativeToken = tokenBalances.find(token => 
    token.symbol === 'CTC' || token.isNative
  );

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
              {parseFloat(usdcToken.balance).toFixed(2)}
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
              {parseFloat(nativeToken.balance).toFixed(4)}
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
  const { data: tokenInfo, isLoading, error } = useTokenBalances(
    address || '0x0000000000000000000000000000000000000000',
    chainId
  );

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

  const token = tokenInfo?.find(t => 
    t.address.toLowerCase() === tokenAddress.toLowerCase()
  );

  if (!token) {
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
              {token.name}
            </span>
            <Badge variant="outline" className="text-xs">
              {token.symbol}
            </Badge>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Decimals: {token.decimals}
          </div>
          
          {showBalance && address && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Balance: {parseFloat(token.balance).toFixed(6)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
