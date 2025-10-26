import { Link, Outlet } from "react-router";
import { WalletConnectButton } from "./WalletConnectButton";
import { NetworkSelector } from "./NetworkSelector";
import { ThemeToggle } from "./ThemeToggle";
import { TransactionLog } from "./TransactionLog";
import logoImage from "/logo.png";
export function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-gradient-to-b from-white/95 via-white/90 to-white/85 dark:from-slate-950/95 dark:via-slate-950/90 dark:to-slate-950/85 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 group">
              <img src={logoImage} alt="Money Pot Logo" className="w-8 h-8 group-hover:animate-pulse transition-transform group-hover:scale-110" loading="lazy" />
              <span className="text-2xl font-display font-bold text-slate-900 dark:text-slate-50">
                Money Pot
              </span>
            </Link>
            <nav className="hidden md:flex items-center space-x-1 text-sm font-medium">
              <Link to="/pots" className="px-3 py-2 rounded-md text-slate-600 dark:text-slate-300 hover:text-brand-green dark:hover:text-brand-green hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200">
                Browse Pots
              </Link>
              <Link to="/create" className="px-3 py-2 rounded-md text-slate-600 dark:text-slate-300 hover:text-brand-green dark:hover:text-brand-green hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200">
                Create a Pot
              </Link>
              <Link to="/faucet" className="px-3 py-2 rounded-md text-slate-600 dark:text-slate-300 hover:text-brand-green dark:hover:text-brand-green hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200">
                Faucet
              </Link>
              <Link to="/leaderboard" className="px-3 py-2 rounded-md text-slate-600 dark:text-slate-300 hover:text-brand-green dark:hover:text-brand-green hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200">
                Leaderboard
              </Link>
              <Link to="/dashboard" className="px-3 py-2 rounded-md text-slate-600 dark:text-slate-300 hover:text-brand-green dark:hover:text-brand-green hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200">
                Dashboard
              </Link>
            </nav>
            <div className="flex items-center gap-2">
              <NetworkSelector />
              <ThemeToggle className="relative" />
              <WalletConnectButton />
            </div>
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="bg-background border-t">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-500 dark:text-slate-400">
          <p>© 2025 Money Pot. All rights reserved.</p>
        </div>
      </footer>
      <TransactionLog />
    </div>
  );
}