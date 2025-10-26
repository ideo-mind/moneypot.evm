import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { useEVMPotStore } from "@/store/evm-pot-store";
import { useWallet } from "@/components/WalletProvider";
import { useNetworkAdapter } from "@/lib/network-adapter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Loader2, PartyPopper, ShieldClose, SkipForward, CheckCircle2, XCircle, KeyRound, Zap, Target } from "lucide-react";
import { Toaster } from "sonner";
import { useBlockscoutTx } from "@/hooks/use-blockscout-tx";
import { BlockscoutBalance } from "@/components/BlockscoutBalance";
import { useChainSwitch } from "@/hooks/use-chain-switch";



import { evmVerifierService, EVMVerifierServiceClient, getAuthOptions } from "@/lib/evm-verifier-api";
import { getConnectedWallet } from "@/lib/web3onboard";
import { _0xea89ef9798a210009339ea6105c2008d8e154f8b5ae1807911c86320ea03ff3f } from "@/abis";
import type { money_pot_manager } from "@/abis/0xea89ef9798a210009339ea6105c2008d8e154f8b5ae1807911c86320ea03ff3f";
import { PotCardSkeleton } from "@/components/PotCardSkeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { getOneFaKey, storeOneFaKey } from "@/lib/oneFaStorage";
import { useTransactionStore } from "@/store/transaction-store";
import { AuthenticationDisplay } from "@/components/AuthenticationDisplay";
// Removed networkValidation import
type GameState = "idle" | "paying" | "fetching_challenge" | "playing" | "verifying" | "won" | "lost";
type KeyState = "unchecked" | "validating" | "valid" | "invalid";
export function PotChallengePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { walletState } = useWallet();
  const { currentChain } = useChainSwitch();
  const { showCustomToast, showSuccessToast, showErrorToast, showPendingToast } = useBlockscoutTx();
  const { adapter } = useNetworkAdapter();
  
  // EVM store
  const evmPot = useEVMPotStore((state) => state.currentPot);
  const evmLoading = useEVMPotStore((state) => state.loading);
  const evmError = useEVMPotStore((state) => state.error);
  const evmFetchPotById = useEVMPotStore((state) => state.fetchPotById);
  const evmAddAttempt = useEVMPotStore((state) => state.addAttempt);
  const evmExpirePot = useEVMPotStore((state) => state.expirePot);
  
  // Use EVM data directly since we only support EVM now
  const currentData = {
    pot: evmPot,
    loading: evmLoading,
    error: evmError,
    fetchPotById: evmFetchPotById,
    addAttempt: evmAddAttempt,
    expirePot: evmExpirePot,
    networkName: currentChain.name,
    networkType: 'evm'
  };
  const pot = currentData.pot;
  const { addTransaction, updateTransaction } = useTransactionStore();
  const [gameState, setGameState] = useState<GameState>("idle");
  const [oneFaPrivateKey, setOneFaPrivateKey] = useState("");
  const [keyState, setKeyState] = useState<KeyState>("unchecked");
  const [isAutoCompleted, setIsAutoCompleted] = useState(false);
  const [isExpiring, setIsExpiring] = useState(false);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [solutions, setSolutions] = useState<string[]>([]);
  const [attemptId, setAttemptId] = useState<string>("");
  const [selectedDirection, setSelectedDirection] = useState<string>("");
  const [showAnimation, setShowAnimation] = useState(false);
  const [dynamicColors, setDynamicColors] = useState<Record<string, string>>({});
  const [dynamicDirections, setDynamicDirections] = useState<Record<string, string>>({});
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    if (id) {
      currentData.fetchPotById(id);
    }
  }, [id, currentData.fetchPotById]);

  // Log solutions whenever they change
  useEffect(() => {
    console.log("Solutions state updated:", solutions);
  }, [solutions]);

  const handleDirectionSelect = useCallback((direction: string) => {
    if (gameState !== "playing" || isSubmitting) return;
    
    // Prevent multiple submissions for the same challenge
    if (solutions.length > currentRound) {
      console.log("Already submitted solution for this challenge, ignoring duplicate");
      return;
    }
    
    console.log("Direction selected:", direction);
    console.log("Current round:", currentRound, "Total challenges:", challenges.length);
    console.log("Current solutions count:", solutions.length);
    
    setIsSubmitting(true);
    setSelectedDirection(direction);
    setShowAnimation(true);
    
    // Add visual feedback
    const directionNames = { U: 'Up', D: 'Down', L: 'Left', R: 'Right', S: 'Skip' };
    showSuccessToast("Direction Selected", `Selected: ${directionNames[direction as keyof typeof directionNames]}`, {});
    
    // Auto-submit after brief animation
    setTimeout(() => {
      submitMove(direction);
      setSelectedDirection("");
      setShowAnimation(false);
      setIsSubmitting(false);
    }, 500);
  }, [gameState, isSubmitting, solutions.length, currentRound, challenges.length]);

  // Hotkey support for better UX
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (gameState !== "playing" || !challenges || challenges.length === 0) return;
      
      // Prevent default behavior for our hotkeys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(event.key)) {
        event.preventDefault();
      }
      
      switch (event.key) {
        case 'ArrowUp':
          handleDirectionSelect('U');
          break;
        case 'ArrowDown':
          handleDirectionSelect('D');
          break;
        case 'ArrowLeft':
          handleDirectionSelect('L');
          break;
        case 'ArrowRight':
          handleDirectionSelect('R');
          break;
        case 'Enter':
          handleDirectionSelect('S');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState, challenges, handleDirectionSelect]);
  const validateKey = useCallback(async (key: string) => {
    if (!key || !pot) return;
    setKeyState("validating");
    await new Promise(res => setTimeout(res, 300));
    try {
      // TODO: Fix private key validation - for now just accept any valid hex key
      const hexKey = key.startsWith("0x") ? key.substring(2) : key;
      if (hexKey.length === 64 && /^[0-9a-fA-F]+$/.test(hexKey)) {
        setKeyState("valid");
        // Store the valid key for future use
        storeOneFaKey(pot.one_fa_address, key);
        console.log(`Stored 1FA key for address: ${pot.one_fa_address}`);
      } else {
        setKeyState("invalid");
      }
    } catch (e) {
      setKeyState("invalid");
    }
  }, [pot]);
  // Effect to pre-fill and validate key if available
  useEffect(() => {
    if (pot?.one_fa_private_key) {
      // Use the key from pot data (for mock pots)
      setOneFaPrivateKey(pot.one_fa_private_key);
      validateKey(pot.one_fa_private_key);
      setIsAutoCompleted(false);
    } else if (pot?.one_fa_address) {
      // Check localStorage for stored key
      const storedKey = getOneFaKey(pot.one_fa_address);
      if (storedKey) {
        console.log(`Auto-completing 1FA key for address: ${pot.one_fa_address}`);
        setOneFaPrivateKey(storedKey);
        validateKey(storedKey);
        setIsAutoCompleted(true);
      } else {
        setIsAutoCompleted(false);
      }
    }
  }, [pot, validateKey]);
  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.value;
    setOneFaPrivateKey(key);
    if (keyState !== "unchecked") setKeyState("unchecked");
    setIsAutoCompleted(false); // Reset auto-completed flag when user manually changes key
  };
  const handleAttempt = async () => {
    if (!walletState?.type || !walletState?.address) {
      showErrorToast("Wallet Required", "Please connect your wallet first.");
      return;
    }
    
    // Validate EVM wallet
    if (walletState.type !== 'evm') {
      showErrorToast("Unsupported Wallet", "Please connect an EVM wallet.");
      return;
    }
    
    if (!pot) {
      showErrorToast("Pot Not Found", "The requested pot could not be found.");
      return;
    }
    
    // Prevent attempts on expired pots
    if (pot.isExpired) {
      showErrorToast("Pot Expired", "This pot has expired and cannot be attempted");
      return;
    }
    
    // 1FA private key is now optional - allow attempts without it
    // if (keyState !== 'valid') return;
    setGameState("paying");
    showPendingToast("Submitting Entry Fee", `Submitting entry fee transaction on ${currentData.networkName}...`, "");
    
    // Add transaction to log
    const txId = addTransaction({
      hash: '', // Will be updated when we get the response
      type: 'attempt_pot',
      status: 'pending',
      description: `Attempting Pot #${pot.id}`,
      potId: pot.id,
      amount: `${pot.entryFee} USD`,
    });
    
    try {
      await handleEVMAttemptPot(txId);
    } catch (error) {
      // Update transaction as failed
      updateTransaction(txId, { 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      showErrorToast("Entry Fee Failed", error instanceof Error ? error.message : 'Unknown error', { txHash: "" });
      setGameState("idle");
    }
  };

  const handleEVMAttemptPot = async (txId: string) => {
    // Attempt pot using network adapter
    const attemptId = await adapter.client.attemptPot({
      potId: pot!.id,
    });
    
    // Update transaction with hash (we'll need to get this from the contract service)
    updateTransaction(txId, { hash: attemptId }); // Using attemptId as hash for now
    
    // Store attempt_id for later use in verification
    setAttemptId(attemptId);
    
    showSuccessToast("Entry Fee Paid!", "Starting 1P authentication...", {});
    setGameState("fetching_challenge");
    
    // Step 2: Get 1P authentication challenges from EVM verifier service
    const hunterAddress = walletState!.address!;
    console.log("Getting 1P challenges for EVM hunter:", hunterAddress);
    
    try {
      // Create signature for authentication using connected EVM wallet
      const message = attemptId.toString();
      const evmWallet = getConnectedWallet();
      if (!evmWallet) {
        throw new Error('No EVM wallet connected');
      }
      
      const signature = await EVMVerifierServiceClient.createEVMSignature(evmWallet, message);

      const authResponse = await evmVerifierService.authenticateOptions(attemptId, signature);
      console.log("Full EVM auth response:", authResponse);
      
      // Store dynamic colors and directions
      setDynamicColors(authResponse.colors || {});
      setDynamicDirections(authResponse.directions || {});
      console.log("Dynamic colors:", authResponse.colors);
      console.log("Dynamic directions:", authResponse.directions);
      
      const fetchedChallenges = authResponse.challenges || [];
      console.log("Received 1P challenges:", fetchedChallenges);
      console.log("Number of challenges:", fetchedChallenges.length);
      console.log("Pot difficulty:", pot?.difficulty);
      console.log("Expected challenges based on difficulty:", pot?.difficulty);
      
      if (fetchedChallenges.length > 0) {
        console.log("First challenge structure:", fetchedChallenges[0]);
        console.log("First challenge grid length:", fetchedChallenges[0].grid?.length || 'No grid');
        console.log("First challenge color groups:", fetchedChallenges[0].colorGroups);
      }
      
      // Check if we got valid challenges
      if (fetchedChallenges.length === 0) {
        throw new Error("No challenges received from EVM verifier service");
      }
      
      // Set challenges for human interaction
      setChallenges(fetchedChallenges);
      setCurrentRound(0);
      setSolutions([]);
      setGameState("playing");
    } catch (authError) {
      console.error("Failed to get 1P challenges:", authError);
      showErrorToast("1P Challenges Failed", authError instanceof Error ? authError.message : 'Unknown error', { txHash: "" });
      setGameState("idle");
      return;
    }
    
    // Update transaction as successful
    updateTransaction(txId, { 
      status: 'success',
      description: `Successfully paid entry fee for Pot #${pot!.id}`
    });
  };

  const submitMove = async (move: string) => {
    console.log("Submitting move:", move);
    console.log("Current solutions:", solutions);
    
    const updatedSolutions = [...solutions, move];
    console.log("New solutions array:", updatedSolutions);
    
    setSolutions(updatedSolutions);
    
    // Reset submitting state after a delay to prevent rapid clicks
    setTimeout(() => {
      setIsSubmitting(false);
    }, 1000);
    
    if (currentRound < challenges.length - 1) {
      // Start transition animation
      setIsTransitioning(true);
      
      // Show success message
      toast.success(`Challenge ${currentRound + 1} completed!`, {
        duration: 1500,
      });
      
      // Wait for animation, then move to next challenge
      setTimeout(() => {
        setCurrentRound(prev => {
          const nextRound = prev + 1;
          // Show next challenge message
          toast.success(`Starting Challenge ${nextRound + 1}...`, {
            duration: 1000,
          });
          return nextRound;
        });
        setIsTransitioning(false);
      }, 1000);
    } else {
      // All challenges completed - verify with 1P verifier service
      setGameState("verifying");
      const toastId = toast.loading("Verifying your 1P authentication...");
      
      try {
        // Verify solutions with verifier service using attempt_id as challenge_id
        console.log("Sending solutions to /authenticate/verify:", {
          attemptId: attemptId.toString(),
          solutions: updatedSolutions,
          solutionsCount: updatedSolutions.length
        });
        
        let verifyResponse;
        try {
          // Use EVM verifier service
          const solutions = updatedSolutions.map((solution, index) => ({
            challenge_id: index.toString(),
            answer: solution
          }));
          
          verifyResponse = await evmVerifierService.authenticateVerify(
            solutions,
            attemptId.toString(),
            walletState.address!
          );
          console.log("Response from EVM /authenticate/verify:", verifyResponse);
        } catch (error) {
          console.error("1P verification failed:", error);
          showErrorToast("1P Verification Failed", (error as Error).message, {});
          setGameState("lost");
          return;
        }
        
        const { success } = verifyResponse;
        
        // Add attempt to local history (verifier service handles blockchain)
        currentData.addAttempt({ potId: pot!.id, potTitle: pot!.title, status: success ? 'won' : 'lost', date: new Date().toISOString() });
        
        if (success) {
          showSuccessToast("🎉 Congratulations!", "You've solved the 1P challenge!", {});
          setGameState("won");
        } else {
          showErrorToast("❌ Authentication Failed", "1P authentication failed. Better luck next time!", {});
          setGameState("lost");
        }
      } catch (error) {
        console.error("1P verification process failed:", error);
        showErrorToast("1P Verification Failed", (error as Error).message, {});
        setGameState("lost");
      } finally {
        toast.dismiss(toastId);
      }
    }
  };

  const handleExpirePot = async () => {
    if (!pot || !walletState?.type || !walletState?.address) {
      toast.error("Please connect your wallet first");
      return;
    }
    
    setIsExpiring(true);
    
    // Add transaction to log
    const txId = addTransaction({
      hash: '', // Will be updated when we get the response
      type: 'expire_pot',
      status: 'pending',
      description: `Expiring Pot #${pot.id}`,
      potId: pot.id,
    });
    
    try {
      // Use EVM expire pot
      const success = await currentData.expirePot(pot.id);
      if (!success) {
        throw new Error('Failed to expire EVM pot');
      }
      updateTransaction(txId, { hash: pot.id }); // Using pot ID as hash for now
      
      // Update transaction as successful
      updateTransaction(txId, { 
        status: 'success',
        description: `Successfully expired Pot #${pot.id}`
      });
      
      toast.success("Pot expired successfully!");
      // Refresh the pot data
      await currentData.fetchPotById(pot.id);
    } catch (error) {
      console.error('Failed to expire pot:', error);
      
      // Update transaction as failed
      updateTransaction(txId, { 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      toast.error("Failed to expire pot");
    } finally {
      setIsExpiring(false);
    }
  };

  const KeyIcon = useMemo(() => {
    switch (keyState) {
      case "validating": return <Loader2 className="h-4 w-4 animate-spin" />;
      case "valid": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "invalid": return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <KeyRound className="h-4 w-4 text-muted-foreground" />;
    }
  }, [keyState]);
  if (currentData.loading || (!pot && !currentData.error)) {
    return <div className="max-w-5xl mx-auto py-16 px-4 sm:px-6 lg:px-8"><PotCardSkeleton /></div>;
  }
  if (currentData.error) {
    return (
      <div className="max-w-5xl mx-auto py-16 px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl font-bold text-destructive">Error</h2>
        <p className="text-muted-foreground mt-2">{currentData.error}</p>
        <Button onClick={() => navigate('/pots')} className="mt-4">Back to Pots</Button>
      </div>
    );
  }
  if (!pot) return null;
  const currentChallenge = challenges[currentRound];
  
  // Safety check for challenge data
  if (gameState === "playing" && (!challenges || challenges.length === 0)) {
    console.error("No challenges available but game state is playing");
    setGameState("idle");
    return null;
  }
  
  // Debug: Log the current challenge structure
  if (currentChallenge) {
    console.log("Current challenge structure:", currentChallenge);
  }

  return (
    <div className="max-w-5xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
      <Toaster richColors position="top-right" />
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-display font-bold">{pot.title}</h1>
        <div className="mt-4 flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span>{parseInt(pot.attempts_count).toLocaleString()} attempts</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldClose className="w-4 h-4" />
            <span>Difficulty: {pot.difficulty}/5</span>
          </div>
        </div>
      </div>
      {gameState === "idle" && (
        <Card className="text-center p-8 max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl font-display">Ready to Hunt?</CardTitle>
            <CardDescription>Optionally enter the 1FA private key for this pot, or proceed without it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Display 1FA Address */}
            {pot.one_fa_address && (
              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                <Label className="text-sm font-semibold mb-2 block">1FA Address (for reference)</Label>
                <p className="font-mono text-xs break-all text-slate-700 dark:text-slate-300">
                  {pot.one_fa_address}
                </p>
              </div>
            )}
            
            {/* TODO: Make 1FA private key required in future versions */}
            
            <div className="space-y-2 text-left">
              <Label htmlFor="1fa-key">1FA Private Key (Optional)</Label>
              <div className="relative">
                <Input 
                  id="1fa-key" 
                  placeholder="0x..." 
                  value={oneFaPrivateKey} 
                  onChange={handleKeyChange} 
                  className={`pr-10 ${isAutoCompleted ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : ''}`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">{KeyIcon}</div>
              </div>
              {isAutoCompleted && (
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Auto-completed from stored keys
                </p>
              )}
              <div className="flex justify-end">
                <Button variant="link" size="sm" onClick={() => validateKey(oneFaPrivateKey)} disabled={!oneFaPrivateKey || keyState === 'validating'}>Validate Key</Button>
              </div>
            </div>
            <p className="text-lg">Pay the entry fee of <span className="font-bold text-brand-gold">{pot.entryFee} USD</span> to begin.</p>
            <div className="space-y-3">
              {pot.isExpired ? (
                <div className="w-full max-w-xs mx-auto bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-bold text-lg h-16 rounded-lg flex items-center justify-center cursor-not-allowed">
                  Pot Expired
                </div>
              ) : (
                <Button 
                  onClick={handleAttempt} 
                  disabled={!walletState.isConnected} 
                  size="lg" 
                  className="w-full max-w-xs mx-auto bg-brand-green hover:bg-brand-green/90 text-white font-bold text-lg h-16"
                >
                  {walletState.isConnected ? `Pay ${pot.entryFee} USD & Start` : "Connect Wallet to Start"}
                </Button>
              )}
              
              {/* Show expire button if pot is expired but still active */}
              {pot.isExpired && pot.is_active && (
                <div className="text-center">
                  <Button 
                    onClick={handleExpirePot}
                    disabled={isExpiring}
                    variant="destructive"
                    size="sm"
                    className="bg-red-500 hover:bg-red-600"
                  >
                    {isExpiring ? (
                      <>
                        <XCircle className="mr-2 h-4 w-4 animate-spin" />
                        Expiring...
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-2 h-4 w-4" />
                        Expire Pot
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    This pot has timed out but is still active
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      {(gameState === "paying" || gameState === "fetching_challenge") && (
        <div className="text-center p-8 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-16 h-16 animate-spin text-brand-green" />
          <p className="text-xl font-semibold">{gameState === "paying" ? "Processing transaction..." : "Getting 1P challenges..."}</p>
        </div>
      )}
      {gameState === "playing" && currentChallenge && (
        <div className="space-y-8">
          {/* Transition Loading Overlay */}
          {isTransitioning && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl text-center">
                <div className="animate-spin w-8 h-8 border-4 border-brand-green border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-lg font-semibold">Moving to next challenge...</p>
              </div>
            </div>
          )}
          {/* Challenge Header */}
          <div className="text-center">
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-brand-green to-brand-gold text-white px-6 py-3 rounded-full text-xl font-bold shadow-lg">
              <Zap className="w-6 h-6" />
              Challenge {currentRound + 1} of {challenges.length}
            </div>
          </div>

          {/* Enhanced Authentication Display with Multiple Layouts */}
          <AuthenticationDisplay
            challenge={currentChallenge}
            isTransitioning={isTransitioning}
            colors={dynamicColors}
            directions={dynamicDirections}
          />

          {/* Direction Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Direction Pad */}
            <div className="lg:col-span-2">
              <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-center flex items-center justify-center gap-2">
                    <ArrowUp className="w-5 h-5" />
                    Choose Direction
                    <ArrowUp className="w-5 h-5" />
                  </CardTitle>
                  <CardDescription className="text-center">
                    Find the character's color section and choose the matching direction • Enter to skip
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
                    <div></div>
                    <Button 
                      onClick={() => handleDirectionSelect('U')} 
                      size="lg" 
                      variant="outline" 
                      className={`h-20 text-2xl font-bold transition-all duration-200 hover:scale-105 ${selectedDirection === 'U' ? 'bg-red-100 border-red-500 text-red-700 shadow-lg' : 'hover:bg-red-50'}`}
                    >
                      <ArrowUp className="w-8 h-8" />
                    </Button>
                    <div></div>
                    <Button 
                      onClick={() => handleDirectionSelect('L')} 
                      size="lg" 
                      variant="outline" 
                      className={`h-20 text-2xl font-bold transition-all duration-200 hover:scale-105 ${selectedDirection === 'L' ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-lg' : 'hover:bg-blue-50'}`}
                    >
                      <ArrowLeft className="w-8 h-8" />
                    </Button>
                    <Button 
                      onClick={() => handleDirectionSelect('D')} 
                      size="lg" 
                      variant="outline" 
                      className={`h-20 text-2xl font-bold transition-all duration-200 hover:scale-105 ${selectedDirection === 'D' ? 'bg-green-100 border-green-500 text-green-700 shadow-lg' : 'hover:bg-green-50'}`}
                    >
                      <ArrowDown className="w-8 h-8" />
                    </Button>
                    <Button 
                      onClick={() => handleDirectionSelect('R')} 
                      size="lg" 
                      variant="outline" 
                      className={`h-20 text-2xl font-bold transition-all duration-200 hover:scale-105 ${selectedDirection === 'R' ? 'bg-yellow-100 border-yellow-500 text-yellow-700 shadow-lg' : 'hover:bg-yellow-50'}`}
                    >
                      <ArrowRight className="w-8 h-8" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Skip Button & Progress */}
            <div className="space-y-4">
              <Button 
                onClick={() => handleDirectionSelect('S')} 
                size="lg" 
                variant="secondary" 
                className={`w-full h-20 text-xl font-bold transition-all duration-200 hover:scale-105 ${selectedDirection === 'S' ? 'bg-gray-200 border-gray-500 text-gray-700 shadow-lg' : ''}`}
              >
                <SkipForward className="mr-3 w-6 h-6" /> 
                Skip (Enter)
              </Button>
              
              <Card className="bg-gradient-to-br from-brand-gold/10 to-brand-green/10 border-brand-gold/20">
                <CardContent className="p-4 text-center">
                  <div className="text-sm font-semibold text-brand-gold mb-2">Progress</div>
                  <div className="text-2xl font-bold">{currentRound + 1} / {challenges.length}</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-gradient-to-r from-brand-green to-brand-gold h-2 rounded-full transition-all duration-500"
                      style={{ width: `${((currentRound + 1) / challenges.length) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Challenge {currentRound + 1} of {challenges.length}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200">
                <CardContent className="p-4">
                  <div className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">Controls</div>
                  <div className="space-y-1 text-xs text-blue-600 dark:text-blue-400">
                    <div className="flex justify-between">
                      <span>↑</span><span>Red Section</span>
                    </div>
                    <div className="flex justify-between">
                      <span>↓</span><span>Green Section</span>
                    </div>
                    <div className="flex justify-between">
                      <span>←</span><span>Blue Section</span>
                    </div>
                    <div className="flex justify-between">
                      <span>→</span><span>Yellow Section</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Enter</span><span>Skip</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
      {(gameState === "won" || gameState === "lost" || gameState === "verifying") && (
        <Card className="text-center p-12 flex flex-col items-center space-y-6">
          {gameState === "verifying" && <Loader2 className="w-24 h-24 animate-spin text-brand-green" />}
          {gameState === "won" && <PartyPopper className="w-24 h-24 text-brand-gold" />}
          {gameState === "lost" && <ShieldClose className="w-24 h-24 text-destructive" />}
          <h2 className="text-4xl font-display font-bold">
            {gameState === "verifying" && "Verifying 1P Authentication..."}
            {gameState === "won" && "1P Challenge Solved!"}
            {gameState === "lost" && "1P Authentication Failed"}
          </h2>
          <p className="text-xl text-muted-foreground">
            {gameState === "verifying" && "Checking your 1P solutions with the verifier service..."}
            {gameState === "won" && `🎉 Congratulations! You've successfully solved the 1P challenge! ${pot.potentialReward.toLocaleString()} USD is on its way to your wallet.`}
            {gameState === "lost" && "❌ 1P authentication failed. The pot remains locked. Better luck next time!"}
          </p>
          <Button onClick={() => navigate('/pots')} size="lg">Back to Pots</Button>
        </Card>
      )}
      
      {/* Completion Screens */}
      {gameState === "won" && (
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 dark:bg-green-900/20 rounded-full">
              <PartyPopper className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-4xl font-bold text-green-600 dark:text-green-400">Congratulations!</h2>
            <p className="text-xl text-muted-foreground">You've successfully completed the 1P challenge!</p>
          </div>
          
          <Card className="max-w-2xl mx-auto bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-8 text-center space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-green-700 dark:text-green-300">Challenge Completed</h3>
                <p className="text-green-600 dark:text-green-400">All {challenges.length} challenges solved successfully</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg">
                  <div className="font-semibold text-green-700 dark:text-green-300">Pot Value</div>
                  <div className="text-lg font-bold">{pot?.totalValue ? pot.totalValue.toFixed(2) : '0'} USD</div>
                </div>
                <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg">
                  <div className="font-semibold text-green-700 dark:text-green-300">Entry Fee</div>
                  <div className="text-lg font-bold">{pot?.entryFee ? pot.entryFee.toFixed(2) : '0'} USD</div>
                </div>
              </div>
              
              <div className="space-y-4">
                <Button 
                  onClick={() => navigate('/')} 
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  Return to Home
                </Button>
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="outline" 
                  className="w-full"
                >
                  Try Another Pot
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {gameState === "lost" && (
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-full">
              <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-4xl font-bold text-red-600 dark:text-red-400">Challenge Failed</h2>
            <p className="text-xl text-muted-foreground">Better luck next time!</p>
          </div>
          
          <Card className="max-w-2xl mx-auto bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800">
            <CardContent className="p-8 text-center space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-red-700 dark:text-red-300">Authentication Failed</h3>
                <p className="text-red-600 dark:text-red-400">The 1P challenge was not completed successfully</p>
              </div>
              
              <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-lg">
                <div className="text-sm text-muted-foreground mb-2">Your Solutions:</div>
                <div className="flex justify-center gap-2">
                  {solutions.map((solution, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono">
                      {solution}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="space-y-4">
                <Button 
                  onClick={() => navigate('/')} 
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                  size="lg"
                >
                  Return to Home
                </Button>
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="outline" 
                  className="w-full"
                >
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}