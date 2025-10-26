
import { PotCard } from "@/components/PotCard";
import { PotCardSkeleton } from "@/components/PotCardSkeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEVMPotStore } from "@/store/evm-pot-store";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router";
import { PartyPopper, ShieldClose, Trophy, Package, Target, XCircle } from "lucide-react";
import { useBlockscoutTx } from "@/hooks/use-blockscout-tx";
import { BlockscoutBalance } from "@/components/BlockscoutBalance";
import { useWallet } from "@/components/WalletProvider";
import { evmContractService } from "@/lib/evm-api";

const StatCard = ({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);
export function DashboardPage() {
  const { walletState } = useWallet();
  const { showCustomToast, showSuccessToast, showErrorToast } = useBlockscoutTx();
  
  // EVM store
  const allPots = useEVMPotStore((state) => state.sortedPots);
  const attempts = useEVMPotStore((state) => state.attempts);
  const loading = useEVMPotStore((state) => state.loading);
  const fetchPots = useEVMPotStore((state) => state.fetchPots);
  const evmExpirePot = useEVMPotStore((state) => state.expirePot);
  const loadAttempts = useEVMPotStore((state) => state.loadAttempts);
  
  const [isExpiringAll, setIsExpiringAll] = useState(false);
  
  useEffect(() => {
    if (walletState?.type === 'evm') {
      fetchPots();
      loadAttempts();
    }
  }, [walletState?.type, fetchPots, loadAttempts]);
  
  const myCreatedPots = useMemo(() => {
    if (!walletState?.address) return [];
    return allPots.filter(pot => pot.creator === walletState.address);
  }, [allPots, walletState?.address]);

  const handleExpireAllPots = async () => {
    if (!walletState?.type || !walletState?.address) {
      showErrorToast("Wallet Required", "Please connect your wallet first");
      return;
    }

    const activePots = myCreatedPots.filter(pot => pot.is_active && !pot.isExpired);
    if (activePots.length === 0) {
      showCustomToast("No Active Pots", "No active pots to expire", "info");
      return;
    }

    setIsExpiringAll(true);
    try {
      let successCount = 0;
      let failedCount = 0;

      // Process each pot individually using EVM
      for (const pot of activePots) {
        try {
          // Submit blockchain transaction
          const txHash = await evmContractService.expirePot(pot.id);
          
          // Show transaction toast
          showSuccessToast(`Expiring pot ${pot.id}...`, "", {});
          
          // Update local state
          const success = await evmExpirePot(pot.id);
          if (success) {
            successCount++;
          } else {
            failedCount++;
          }
        } catch (error) {
          console.error(`Failed to expire pot ${pot.id}:`, error);
          showErrorToast(`Failed to expire pot ${pot.id}`, error instanceof Error ? error.message : "Unknown error", {});
          failedCount++;
        }
      }

      if (successCount > 0) {
        showSuccessToast(`Successfully expired ${successCount} pot${successCount > 1 ? 's' : ''}!`, "", {});
      }
      if (failedCount > 0) {
        showErrorToast(`Failed to expire ${failedCount} pot${failedCount > 1 ? 's' : ''}`, "", {});
      }
    } catch (error) {
      console.error('Failed to expire all pots:', error);
      showErrorToast("Failed to expire pots", "", {});
    } finally {
      setIsExpiringAll(false);
    }
  };
  const stats = useMemo(() => {
    const wins = attempts.filter(a => a.status === 'won').length;
    const totalAttempts = attempts.length;
    const winRate = totalAttempts > 0 ? ((wins / totalAttempts) * 100).toFixed(0) + '%' : 'N/A';
    return {
      potsCreated: myCreatedPots.length,
      totalAttempts,
      winRate,
    };
  }, [myCreatedPots, attempts]);
  if (!walletState?.isConnected) {
    return (
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl md:text-5xl font-display font-bold">My Dashboard</h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
          Please connect your wallet to view your dashboard.
        </p>
      </div>
    );
  }
  return (
    <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-display font-bold">My Dashboard</h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
          Track your created pots and attempt history.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <StatCard title="Pots Created" value={stats.potsCreated} icon={Package} />
        <StatCard title="Total Attempts" value={stats.totalAttempts} icon={Target} />
        <StatCard title="Win Rate" value={stats.winRate} icon={Trophy} />
      </div>
      
      {/* Wallet Balance Display */}
      {walletState?.address && (
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Wallet Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BlockscoutBalance 
                address={walletState.address} 
                showTokenInfo={true}
                className="text-sm"
              />
            </CardContent>
          </Card>
        </div>
      )}
      <Tabs defaultValue="created" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
          <TabsTrigger value="created">My Created Pots</TabsTrigger>
          <TabsTrigger value="attempts">My Attempts</TabsTrigger>
        </TabsList>
        <TabsContent value="created" className="mt-8">
          {myCreatedPots.length > 0 && (
            <div className="mb-6 flex justify-between items-center">
              <h3 className="text-lg font-semibold">My Created Pots ({myCreatedPots.length})</h3>
              {myCreatedPots.some(pot => pot.is_active && !pot.isExpired) && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      disabled={isExpiringAll}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      {isExpiringAll ? (
                        <>
                          <XCircle className="mr-2 h-4 w-4 animate-spin" />
                          Expiring All...
                        </>
                      ) : (
                        <>
                          <XCircle className="mr-2 h-4 w-4" />
                          Expire All Pots
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Expire All Active Pots</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will expire all your active pots. This action cannot be undone.
                        You will need to confirm each transaction in your wallet.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleExpireAllPots}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Expire All Pots
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading && Array.from({ length: 3 }).map((_, i) => <PotCardSkeleton key={i} />)}
            {!loading && myCreatedPots.length === 0 && (
              <div className="col-span-full text-center py-12 border-2 border-dashed rounded-lg">
                <p className="text-slate-500">You haven't created any pots yet.</p>
              </div>
            )}
            {!loading && myCreatedPots.map((pot) => (
              <PotCard key={pot.id} pot={pot} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="attempts" className="mt-8">
          {attempts.length === 0 ? (
            <div className="col-span-full text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-slate-500">You haven't attempted any pots yet.</p>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Attempt History</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {attempts.map((attempt, index) => (
                    <li key={index} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                      <div className="flex items-center gap-4">
                        {attempt.status === 'won' ? <PartyPopper className="w-6 h-6 text-brand-gold" /> : <ShieldClose className="w-6 h-6 text-destructive" />}
                        <div>
                          <Link to={`/pots/${attempt.potId}`} className="font-semibold hover:underline">{attempt.potTitle}</Link>
                          <p className="text-sm text-muted-foreground">{formatDistanceToNow(new Date(attempt.date), { addSuffix: true })}</p>
                        </div>
                      </div>
                      <Badge variant={attempt.status === 'won' ? 'default' : 'destructive'} className={attempt.status === 'won' ? 'bg-brand-green' : ''}>
                        {attempt.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}