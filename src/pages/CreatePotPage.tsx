import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Wand2, Loader2, Terminal, Eye, EyeOff, Shuffle, Calendar as CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from "sonner";
import { useBlockscoutTx } from "@/hooks/use-blockscout-tx";
import { BlockscoutBalance } from "@/components/BlockscoutBalance";





// Removed Aptos ABI import
import { useNavigate } from "react-router";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CopyableInput } from "@/components/CopyableInput";
import { CHARACTER_DOMAINS } from "@/lib/constants";
// Removed Aptos API import
import { ColorDirectionMapper } from "@/components/ColorDirectionMapper";
import { CharacterSelector } from "@/components/CharacterSelector";
import { SuccessAnimation } from "@/components/SuccessAnimation";
// Removed Aptos store imports
import { useEVMPotStore, transformEVMPotToPot } from "@/store/evm-pot-store";
import { useTransactionStore } from "@/store/transaction-store";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { useWallet } from "@/components/WalletProvider";
import { useNetworkAdapter } from "@/lib/network-adapter";
import { evmVerifierService, EVMVerifierServiceClient, getAuthOptions } from "@/lib/evm-verifier-api";
import { getConnectedWallet } from "@/lib/web3onboard";
const steps = [
  { id: 1, name: "Define Pot" },
  { id: 2, name: "Set Rules" },
  { id: 3, name: "Configure Challenge" },
  { id: 4, name: "Review & Deposit" },
];
export function CreatePotPage() {
  
  const { walletState } = useWallet();
  const { adapter } = useNetworkAdapter();
  const { showCustomToast, showSuccessToast, showErrorToast, showPendingToast } = useBlockscoutTx();
  // Removed Aptos store references
  const addEVMPot = useEVMPotStore((state) => state.addPot);
  // Removed Aptos store references
  const fetchEVMPots = useEVMPotStore((state) => state.fetchPots);
  const { addTransaction, updateTransaction } = useTransactionStore();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [amount, setAmount] = useState(1);
  const [duration, setDuration] = useState(1);
  const [durationType, setDurationType] = useState<'days' | 'weeks' | 'months' | 'custom'>('custom');
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(() => {
    // Default to 5 hours from now
    const defaultDate = new Date();
    defaultDate.setHours(defaultDate.getHours() + 5);
    return defaultDate;
  });
  const [entryFee, setEntryFee] = useState(0.01); // Initial value, will be auto-calculated
  const [oneFaAddress, setOneFaAddress] = useState('');
  const [oneFaPrivateKey, setOneFaPrivateKey] = useState('');
  const [password, setPassword] = useState("");
  const [colorMap, setColorMap] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [creationSuccess, setCreationSuccess] = useState(false);
  const [dynamicColors, setDynamicColors] = useState<Record<string, string>>({});
  const [dynamicDirections, setDynamicDirections] = useState<Record<string, string>>({});
  const [mappableDirections, setMappableDirections] = useState<string[]>([]);
  useEffect(() => {
    const allCharacters = Object.values(CHARACTER_DOMAINS).flat();
    const randomChar = allCharacters[Math.floor(Math.random() * allCharacters.length)];
    setPassword(randomChar);
    showCustomToast("Random 1P character chosen by default", "You can change it in Step 3.", "info");
  }, []);

  // Fetch dynamic colors and directions from backend
  useEffect(() => {
    const fetchDynamicData = async () => {
      try {
        // Use a dummy attempt ID to get the dynamic data
        const authOptions = await getAuthOptions("dummy", "dummy");
        setDynamicColors(authOptions.colors || {});
        setDynamicDirections(authOptions.directions || {});
        
        // Extract mappable directions (exclude skip)
        const directions = Object.values(authOptions.directions || {});
        setMappableDirections(directions.filter(dir => dir.toLowerCase() !== 'skip'));
        
        // Initialize color map with dynamic colors
        const initialColorMap: Record<string, string> = {};
        Object.keys(authOptions.colors || {}).forEach((color, index) => {
          if (index < directions.length) {
            initialColorMap[color] = directions[index];
          }
        });
        setColorMap(initialColorMap);
      } catch (error) {
        console.error("Failed to fetch dynamic colors and directions:", error);
        // Fallback to hardcoded values
        setDynamicColors({
          red: "#ef4444",
          green: "#22c55e", 
          blue: "#3b82f6",
          yellow: "#eab308"
        });
        setDynamicDirections({
          up: "U",
          down: "D", 
          left: "L",
          right: "R",
          skip: "S"
        });
        setMappableDirections(["U", "D", "L", "R"]);
      }
    };
    
    fetchDynamicData();
  }, []);

  // Auto-calculate entry fee as 1/100th of pot value when amount changes
  useEffect(() => {
    if (amount > 0) {
      const calculatedEntryFee = amount / 100;
      setEntryFee(calculatedEntryFee);
    }
  }, [amount]);

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));
  const getDurationInSeconds = () => {
    if (durationType === 'custom' && customEndDate) {
      const now = new Date();
      const diffMs = customEndDate.getTime() - now.getTime();
      return Math.max(0, Math.floor(diffMs / 1000));
    }
    
    switch (durationType) {
      case 'days':
        return duration * 24 * 60 * 60;
      case 'weeks':
        return duration * 7 * 24 * 60 * 60;
      case 'months':
        return duration * 30 * 24 * 60 * 60; // Approximate month as 30 days
      default:
        return duration * 24 * 60 * 60;
    }
  };

  const getDurationDisplay = () => {
    if (durationType === 'custom' && customEndDate) {
      const now = new Date();
      const diffMs = customEndDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return `${diffDays} days (until ${customEndDate.toLocaleDateString()})`;
    }
    
    switch (durationType) {
      case 'days':
        return `${duration} day${duration !== 1 ? 's' : ''}`;
      case 'weeks':
        return `${duration} week${duration !== 1 ? 's' : ''}`;
      case 'months':
        return `${duration} month${duration !== 1 ? 's' : ''}`;
      default:
        return `${duration} day${duration !== 1 ? 's' : ''}`;
    }
  };

  const getIsStepComplete = () => {
    switch (currentStep) {
      case 1:
        return amount > 0 && (durationType === 'custom' ? customEndDate && customEndDate > new Date() : duration > 0);
      case 2:
        return true; // 1FA private key is now optional
      case 3:
        return !!password && Object.keys(colorMap).length === mappableDirections.length;
      default:
        return true;
    }
  };
  const generate1FA = () => {
    // Generate a random EVM address for 1FA
    const randomAddress = `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    setOneFaAddress(randomAddress);
    const randomPrivateKey = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    setOneFaPrivateKey(randomPrivateKey);
    showSuccessToast("1FA Key Generated!", "Save the private key securely. It is NOT recoverable.");
  };
  const handleEntryFeeChange = (value: number) => {
    setEntryFee(value);
  };
  const randomizeColorMap = () => {
    const shuffledDirections = [...mappableDirections];
    for (let i = shuffledDirections.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledDirections[i], shuffledDirections[j]] = [shuffledDirections[j], shuffledDirections[i]];
    }
    const newColorMap: Record<string, string> = {};
    Object.keys(dynamicColors).forEach((color, index) => {
      if (index < shuffledDirections.length) {
        newColorMap[color] = shuffledDirections[index];
      }
    });
    setColorMap(newColorMap);
    showCustomToast("Color mapping has been randomized!", "", "info");
  };
  const handleCreatePot = async () => {
    if (!walletState?.type || !walletState?.address) {
      showErrorToast("Wallet Required", "Please connect your wallet first.");
      return;
    }
    
    // Removed Aptos validation
    
    if (!password || Object.keys(colorMap).length < mappableDirections.length) {
      showErrorToast("Incomplete Form", "Please complete all fields in the previous steps.");
      return;
    }
    
    // Generate a default 1FA address if none was provided
    let finalOneFaAddress = oneFaAddress;
    if (!finalOneFaAddress) {
      // For EVM, generate a random address
      finalOneFaAddress = `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    }
    
    setIsSubmitting(true);
    showPendingToast("Creating Money Pot", `Submitting transaction to Creditcoin...`, "");
    
    // Add transaction to log
    const txId = addTransaction({
      hash: '', // Will be updated when we get the response
      type: 'create_pot',
      status: 'pending',
      description: `Creating pot with ${amount} USDC`,
      amount: `${amount} USDC`,
    });
    
    try {
      if (walletState.type === 'evm') {
        await handleEVMCreatePot(finalOneFaAddress, toastId, txId);
      }
      // else {
      //   // Removed Aptos code
      // }
    } catch (error) {
      console.error("Pot creation failed:", error);
      
      // Update transaction as failed
      updateTransaction(txId, { 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      showErrorToast("Pot Creation Failed", error instanceof Error ? error.message : 'Unknown error', { txHash: "" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEVMCreatePot = async (finalOneFaAddress: string, toastId: string, txId: string) => {
    // Create pot using network adapter
    const result = await adapter.createPot({
      amount,
      duration: getDurationInSeconds(),
      fee: entryFee,
      password,
      colorMap,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to create EVM pot');
    }

    const potId = result.data;
    
    // Update transaction with hash (we'll need to get this from the contract service)
    updateTransaction(txId, { hash: potId }); // Using potId as hash for now
    
    showPendingToast("Registering Pot", "Registering pot with verifier...", "");
    
    // Register with EVM verifier service
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = {
      pot_id: potId,
      "1p": password,
      legend: colorMap,
      iat: timestamp,
      iss: walletState!.address!,
      exp: timestamp + 3600, // 1 hour
    };

    // Get encryption key
    const { public_key } = await evmVerifierService.registerOptions();
    
    // Encrypt payload
    const encryptedPayload = EVMVerifierServiceClient.encryptPayload(payload);
    
    // Create signature using the connected EVM wallet
    const message = JSON.stringify(payload);
    const evmWallet = getConnectedWallet();
    if (!evmWallet) {
      throw new Error('No EVM wallet connected');
    }
    
    const signature = await EVMVerifierServiceClient.createEVMSignature(evmWallet, message);

    // Register with verifier
    await evmVerifierService.registerVerify(
      encryptedPayload,
      public_key,
      signature
    );
    
    // Fetch the created pot from blockchain
    const potData = await adapter.getPot(potId);
    if (!potData.success || !potData.data) {
      throw new Error('Failed to fetch created pot');
    }
    
    const newPot = transformEVMPotToPot(potData.data);
    addEVMPot(newPot);
    
    // Refresh the pots list
    await fetchEVMPots(true);
    
    // Update transaction as successful
    updateTransaction(txId, { 
      status: 'success', 
      potId: potId,
      description: `Successfully created Pot #${potId} with ${amount} USDC`
    });
    
    showSuccessToast("Pot Created Successfully!", `Successfully created Pot #${potId} with ${amount} USDC`, { potId, amount: `${amount} USDC` });
    
    setCreationSuccess(true);
    setTimeout(() => navigate("/pots"), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
      <Toaster richColors position="top-right" />
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-display font-bold">Create a New Money Pot</h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">Follow the steps to set up your treasure hunt.</p>
        </div>
        {!creationSuccess && (
          <>
            <div className="flex justify-between items-center">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center w-full">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${currentStep >= step.id ? 'bg-brand-green text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    {step.id}
                  </div>
                  <p className={`ml-4 font-medium ${currentStep >= step.id ? 'text-slate-900 dark:text-slate-50' : 'text-slate-500'}`}>{step.name}</p>
                  {index < steps.length - 1 && <div className={`flex-auto border-t-2 mx-4 ${currentStep > step.id ? 'border-brand-green' : 'border-slate-200 dark:border-slate-700'}`}></div>}
                </div>
              ))}
            </div>
            <Card className="overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                >
                  {currentStep === 1 && (
                    <div>
                      <CardHeader>
                        <CardTitle className="font-display text-2xl">Step 1: Define Your Pot</CardTitle>
                        <CardDescription>Set the total USDC amount and how long the pot will be active.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="amount">Pot Amount (USDC)</Label>
                          <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} placeholder="e.g., 1000" min="0.001" />
                        </div>
                        <div className="space-y-4">
                          <Label>Pot Expiration</Label>
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label>End Date & Time</Label>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {customEndDate ? format(customEndDate, "PPP") : "Select date"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={customEndDate}
                                      onSelect={(date) => {
                                        if (date) {
                                          // Preserve the time when changing date
                                          const newDate = new Date(date);
                                          if (customEndDate) {
                                            newDate.setHours(customEndDate.getHours());
                                            newDate.setMinutes(customEndDate.getMinutes());
                                          }
                                          setCustomEndDate(newDate);
                                        }
                                      }}
                                      disabled={(date) => date < new Date()}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                
                                <div className="flex gap-2">
                                  <Input
                                    type="time"
                                    value={customEndDate ? format(customEndDate, "HH:mm") : ""}
                                    onChange={(e) => {
                                      if (customEndDate && e.target.value) {
                                        const [hours, minutes] = e.target.value.split(':');
                                        const newDate = new Date(customEndDate);
                                        newDate.setHours(parseInt(hours), parseInt(minutes));
                                        setCustomEndDate(newDate);
                                      }
                                    }}
                                    className="flex-1"
                                  />
                                </div>
                              </div>
                              
                              {customEndDate && (
                                <div className="space-y-1">
                                  <p className="text-sm text-muted-foreground">
                                    Pot will expire on {format(customEndDate, "PPP 'at' p")}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Duration: {getDurationDisplay()}
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4" />
                                <span className="font-medium">Expiration:</span>
                                <span>{customEndDate ? format(customEndDate, "PPP 'at' p") : "Not set"}</span>
                              </div>
                            </div>
                            
                            <div className="text-xs text-muted-foreground">
                              <p>💡 Quick presets:</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => {
                                    const date = new Date();
                                    date.setHours(date.getHours() + 1);
                                    setCustomEndDate(date);
                                  }}
                                >
                                  1 hour
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => {
                                    const date = new Date();
                                    date.setHours(date.getHours() + 5);
                                    setCustomEndDate(date);
                                  }}
                                >
                                  5 hours
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => {
                                    const date = new Date();
                                    date.setHours(date.getHours() + 24);
                                    setCustomEndDate(date);
                                  }}
                                >
                                  1 day
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => {
                                    const date = new Date();
                                    date.setDate(date.getDate() + 30);
                                    setCustomEndDate(date);
                                  }}
                                >
                                  30 days
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => {
                                    const date = new Date();
                                    date.setMonth(date.getMonth() + 6);
                                    setCustomEndDate(date);
                                  }}
                                >
                                  6 months
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => {
                                    const date = new Date();
                                    date.setFullYear(date.getFullYear() + 1);
                                    setCustomEndDate(date);
                                  }}
                                >
                                  1 year
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => {
                                    const date = new Date();
                                    date.setFullYear(date.getFullYear() + 10);
                                    setCustomEndDate(date);
                                  }}
                                >
                                  10 years
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  )}
                  {currentStep === 2 && (
                    <div>
                      <CardHeader>
                        <CardTitle className="font-display text-2xl">Step 2: Set the Rules</CardTitle>
                        <CardDescription>Configure the entry fee and optionally generate a unique key for this pot.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-4">
                          <Label>Entry Fee (USDC)</Label>
                          <div className="space-y-3">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                                <Input
                                  type="number"
                                  value={entryFee}
                                  onChange={(e) => handleEntryFeeChange(parseFloat(e.target.value) || 0)}
                                  className="w-40 pl-8"
                                  placeholder="0.00"
                                />
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {amount > 0 && (
                                  <span>
                                    ({(entryFee / amount * 100).toFixed(2)}% of pot)
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <p className="text-sm text-muted-foreground">Quick presets:</p>
                              <div className="flex flex-wrap gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleEntryFeeChange(amount / 1000)}
                                  className="text-xs"
                                >
                                  {(amount / 1000).toFixed(2)}
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleEntryFeeChange(amount / 500)}
                                  className="text-xs"
                                >
                                  {(amount / 500).toFixed(2)}
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleEntryFeeChange(amount / 100)}
                                  className="text-xs"
                                >
                                  {(amount / 100).toFixed(2)}
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleEntryFeeChange(amount / 50)}
                                  className="text-xs"
                                >
                                  {(amount / 50).toFixed(2)}
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleEntryFeeChange(amount / 20)}
                                  className="text-xs"
                                >
                                  {(amount / 20).toFixed(2)}
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleEntryFeeChange(amount / 10)}
                                  className="text-xs"
                                >
                                  {(amount / 10).toFixed(2)}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>1FA Key Pair (Optional)</Label>
                          <Button variant="outline" onClick={generate1FA} className="w-full">
                            <Wand2 className="mr-2 h-4 w-4" /> Generate 1FA Key
                          </Button>
                          <p className="text-sm text-muted-foreground">
                            Optional: Generate a unique key pair for this pot. You can skip this step and continue.
                          </p>
                          {oneFaPrivateKey && (
                            <>
                              <CopyableInput value={oneFaPrivateKey} />
                              <Alert variant="destructive" className="mt-4">
                                <Terminal className="h-4 w-4" />
                                <AlertTitle>CRITICAL: Save Your Private Key!</AlertTitle>
                                <AlertDescription>
                                  This key is NOT recoverable. Store it in a secure password manager immediately. You will need to share it with treasure hunters.
                                </AlertDescription>
                              </Alert>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </div>
                  )}
                  {currentStep === 3 && (
                    <div>
                      <CardHeader>
                        <CardTitle className="font-display text-2xl">Step 3: Configure the Challenge</CardTitle>
                        <CardDescription>Set the secret character and map colors to directions for the verifier.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-2">
                          <Label>Secret Character</Label>
                          <CharacterSelector value={password} onSelect={setPassword} />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div>
                              <Label>Color-to-Direction Mapping</Label>
                              <p className="text-sm text-muted-foreground">Drag directions to map them to a color.</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={randomizeColorMap}>
                              <Shuffle className="mr-2 h-4 w-4" />
                              Randomize
                            </Button>
                          </div>
                          <ColorDirectionMapper 
                            colorMap={colorMap} 
                            setColorMap={setColorMap} 
                            colors={dynamicColors}
                            directions={mappableDirections}
                          />
                        </div>
                      </CardContent>
                    </div>
                  )}
                  {currentStep === 4 && (
                    <div>
                      <CardHeader>
                        <CardTitle className="font-display text-2xl">Step 4: Review & Deposit</CardTitle>
                        <CardDescription>Confirm the details of your Money Pot before creating it.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <ul className="space-y-2 text-sm">
                          <li className="flex justify-between"><span>Pot Amount:</span> <span className="font-medium">${amount} USDC</span></li>
                          <li className="flex justify-between"><span>Expires:</span> <span className="font-medium">{customEndDate ? format(customEndDate, "PPP 'at' p") : "Not set"}</span></li>
                          <li className="flex justify-between"><span>Entry Fee:</span> <span className="font-medium">${entryFee.toFixed(4)} USDC</span></li>
                          <li className="flex justify-between items-center">
                            <span>Password:</span>
                            <div className="flex items-center gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="font-display font-bold text-2xl bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded w-12 text-center cursor-help">
                                      {password ? (isPasswordVisible ? password : "•") : "N/A"}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Unicode: U+{password?.codePointAt(0)?.toString(16).toUpperCase()}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <Button variant="ghost" size="icon" onClick={() => setIsPasswordVisible(!isPasswordVisible)} disabled={!password}>
                                {isPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </li>
                          <li className="flex justify-between"><span>1FA Address:</span> <span className="font-mono text-xs">{oneFaAddress ? `${oneFaAddress.slice(0,10)}...` : "Will be auto-generated"}</span></li>
                          {walletState.isConnected && walletState.address && (
                            <li className="flex justify-between items-start">
                              <span>Wallet Balance:</span>
                              <div className="text-right">
                                <BlockscoutBalance 
                                  address={walletState.address} 
                                  showTokenInfo={false}
                                  className="text-xs"
                                />
                              </div>
                            </li>
                          )}
                        </ul>
                        <Button onClick={handleCreatePot} disabled={isSubmitting || !walletState.isConnected || !password || Object.keys(colorMap).length < mappableDirections.length} className="w-full bg-brand-green hover:bg-brand-green/90 text-white font-bold text-lg py-6">
                          {isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : `Deposit ${amount} USDC & Create Pot`}
                        </Button>
                      </CardContent>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
              <CardFooter className="flex justify-between p-6 bg-slate-50 dark:bg-slate-900/50">
                <Button variant="outline" onClick={prevStep} disabled={currentStep === 1}>Previous</Button>
                <Button onClick={nextStep} disabled={currentStep === steps.length || !getIsStepComplete()}>Next</Button>
              </CardFooter>
            </Card>
          </>
        )}
        {creationSuccess && (
          <Card>
            <CardContent>
              <SuccessAnimation />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}