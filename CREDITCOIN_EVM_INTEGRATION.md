# Creditcoin EVM Integration

This document outlines the integration of Creditcoin EVM testnet support into the Money Pot application.

## Overview

The application now exclusively supports EVM (Creditcoin) networks, allowing users to connect with EVM wallets and interact with the smart contracts.

## Network Configuration

### Creditcoin EVM Testnet

- **Chain ID**: 102031
- **RPC URL**: https://rpc.cc3-testnet.creditcoin.network
- **WebSocket URL**: wss://rpc.cc3-testnet.creditcoin.network
- **Explorer**: https://creditcoin-testnet.blockscout.com
- **Native Currency**: CTC (Creditcoin)
- **Decimals**: 18

## Architecture

### Key Components

1. **WalletProvider** (`src/components/WalletProvider.tsx`)
   - Manages EVM wallet connections
   - Provides wallet state management
   - Handles connection and disconnection

2. **WalletConnectButton** (`src/components/WalletConnectButton.tsx`)
   - UI component for wallet connection
   - Shows appropriate balances (CTC/USDC)
   - Network switching capabilities

3. **EVM Configuration** (`src/config/viem.ts`)
   - Centralized Creditcoin testnet configuration
   - All values hardcoded (no environment variables)
   - Public and WebSocket clients
   - Utility functions for address formatting and currency conversion

4. **Web3Onboard Integration** (`src/lib/web3onboard.ts`)
   - Wallet connection management for EVM
   - Support for MetaMask, WalletConnect, Coinbase, and injected wallets
   - Network switching and addition

5. **EVM Contract Service** (`src/lib/evm-api.ts`)
   - Contract interaction layer for EVM
   - Transaction management and state updates

6. **EVM ABI Structure** (`src/abis/evm/money-pot.ts`)
   - Contract ABI definitions
   - Type-safe contract interactions
   - Event handling and data transformation

## Configuration

All EVM configuration is centralized in `src/config/viem.ts`. Contract addresses are defined in the chain configuration.

**To update configuration:**

1. Edit `src/config/viem.ts`
2. Update contract addresses in `creditcoinTestnet.custom.moneypot.address` and `creditcoinTestnet.custom.token.address`
3. Set `VITE_WALLETCONNECT_PROJECT_ID` in your environment

## Usage

### Connecting Wallets

Users can connect EVM Wallets: MetaMask, WalletConnect, Coinbase, etc.

The wallet button shows:
- Wallet address
- Network status
- Appropriate balances (CTC, USDC)

### Contract Interactions

The EVM contract service provides an interface to interact with the smart contract:

```typescript
import { evmContractService } from "@/lib/evm-api"

// Create a pot
const potId = await evmContractService.createPot({
  amount: BigInt(100 * 10 ** 6), // 100 USDC (6 decimals)
  durationSeconds: BigInt(86400), // 24 hours
  fee: BigInt(10 * 10 ** 6), // 10 USDC entry fee
  oneFaAddress: "0x...", // 1Password address
})

// Attempt a pot (returns attempt ID)
const attemptId = await evmContractService.attemptPot({
  potId: BigInt(potId),
})

// Get pot data
const potData = await evmContractService.getPot(potId)

// Get user's USDC balance
const balance = await evmContractService.getBalance(userAddress)

// Get all active pots
const activePots = await evmContractService.getActivePots()
```

## Contract Integration Status

✅ **Fully Integrated Functions:**

- `getBalance(address)` - Get user's USDC balance
- `createPot(amount, durationSeconds, fee, oneFaAddress)` - Create new pot
- `attemptPot(potId)` - Attempt to solve pot (returns attempt ID)
- `getPot(potId)` - Get pot data by ID
- `getActivePots()` - Get all active pot IDs
- `getPots()` - Get all pot IDs
- `getAttempt(attemptId)` - Get attempt data
- `attemptCompleted(attemptId, status)` - Mark attempt as completed (oracle)
- `expirePot(potId)` - Expire a pot
- `nextPotId()` - Get next pot ID
- `nextAttemptId()` - Get next attempt ID

✅ **Contract ABI:** Using actual MoneyPot.json ABI
✅ **Event Handling:** PotCreated, PotAttempted, PotSolved, PotFailed events
✅ **Type Safety:** Full TypeScript support with proper interfaces

## Network Switching

The application automatically handles network switching:
- Adds Creditcoin Testnet if not present
- Switches to Creditcoin Testnet when needed

## Error Handling

The integration includes comprehensive error handling for:
- Network mismatches
- Transaction failures
- Wallet connection issues
- Contract interaction errors

## Testing

To test the EVM integration:

1. Set `VITE_WALLETCONNECT_PROJECT_ID` in your environment
2. Update contract addresses in `src/config/viem.ts`
3. Deploy the contract to Creditcoin testnet
4. Connect an EVM wallet (MetaMask recommended)
5. Test contract interactions

## Future Enhancements

- Multi-network support (multiple EVM chains)
- Support for additional wallet providers
- Enhanced transaction monitoring
- Advanced error handling and recovery
- Network-specific UI adaptations

## Dependencies

- `viem`: Ethereum library for contract interactions
- `@web3-onboard/react`: React hooks for Web3Onboard
- `@web3-onboard/core`: Core Web3Onboard functionality
- `@web3-onboard/injected-wallets`: Injected wallet support
- `@web3-onboard/walletconnect`: WalletConnect integration
- `@web3-onboard/coinbase`: Coinbase wallet support
- `@web3-onboard/metamask`: MetaMask integration

## Notes

- The EVM integration maintains a clean user experience
- The wallet system provides a seamless experience
- Contract ABI placeholders are ready for your actual contract deployment
