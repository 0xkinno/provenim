import React, { useState } from 'react';
import {
  ShieldCheck,
  PlusCircle,
  FileCheck,
  Layers,
  History,
  CheckCircle2,
  Wallet,
  Copy,
  Check,
  Loader2
} from 'lucide-react';
import { type UseNimiqReturn } from '../hooks/useNimiq';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  nimiq: UseNimiqReturn;
  blockHeight?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  nimiq,
  blockHeight
}) => {
  const [copiedAddr, setCopiedAddr] = useState(false);

  const handleCopyAccount = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  const shortAddr = (addr: string) => {
    const clean = addr.replace(/\s+/g, '');
    return `${clean.slice(0, 4)}...${clean.slice(-4)}`;
  };

  return (
    <header className="sticky top-0 z-50 bg-parchment-100/90 backdrop-blur-md border-b border-parchment-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Editorial Title */}
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setCurrentTab('landing')}
        >
          <div className="w-9 h-9 rounded-xl bg-forest-800 flex items-center justify-center text-parchment-50 shadow-md group-hover:bg-forest-900 transition-colors">
            <ShieldCheck className="w-5 h-5 text-gold-light" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-xl font-bold tracking-tight text-ink-900">Provenim</span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-forest-800/10 text-forest-800 font-semibold">PoS Testnet</span>
            </div>
            <span className="text-[11px] font-mono text-ink-500 block -mt-0.5">Deterministic Proof of NIM</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="hidden md:flex items-center gap-1 bg-parchment-200/60 p-1 rounded-full border border-parchment-300/60">
          <button
            onClick={() => setCurrentTab('landing')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              currentTab === 'landing'
                ? 'bg-parchment-50 text-ink-900 shadow-sm'
                : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setCurrentTab('create')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
              currentTab === 'create'
                ? 'bg-forest-800 text-parchment-50 shadow-sm'
                : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            New Order
          </button>
          <button
            onClick={() => setCurrentTab('verify')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
              currentTab === 'verify'
                ? 'bg-parchment-50 text-ink-900 shadow-sm'
                : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            Verify Receipt
          </button>
          <button
            onClick={() => setCurrentTab('proof')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
              currentTab === 'proof'
                ? 'bg-parchment-50 text-ink-900 shadow-sm'
                : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Proof & Chain
          </button>
          <button
            onClick={() => setCurrentTab('history')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
              currentTab === 'history'
                ? 'bg-parchment-50 text-ink-900 shadow-sm'
                : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Ledger
          </button>
        </nav>

        {/* Live Network & Wallet Pill */}
        <div className="hidden lg:flex items-center gap-3">
          {blockHeight ? (
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-ink-600 bg-parchment-50 px-2.5 py-1 rounded-full border border-parchment-200">
              <span className="w-2 h-2 rounded-full bg-forest-600 animate-pulse"></span>
              <span>Testnet #{blockHeight.toLocaleString()}</span>
            </div>
          ) : null}

          {nimiq.selectedAccount ? (
            <div className="flex items-center gap-2 bg-forest-800 text-parchment-50 px-3 py-1.5 rounded-full text-xs font-mono font-medium shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-gold-light" />
              <span>{shortAddr(nimiq.selectedAccount)}</span>
              <button
                type="button"
                onClick={() => handleCopyAccount(nimiq.selectedAccount!)}
                title="Copy Connected Address"
                className="hover:text-gold-light transition-colors"
              >
                {copiedAddr ? <Check className="w-3 h-3 text-gold-light" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          ) : nimiq.walletState === 'provider_detected' ? (
            <button
              onClick={() => nimiq.connectWallet()}
              className="flex items-center gap-1.5 bg-forest-800 hover:bg-forest-900 text-parchment-50 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium shadow-sm transition-all"
            >
              <Wallet className="w-3.5 h-3.5 text-gold-light" />
              <span>Connect Nimiq Wallet</span>
            </button>
          ) : nimiq.walletState === 'requesting_permission' ? (
            <div className="flex items-center gap-1.5 bg-parchment-200 text-ink-700 px-3 py-1.5 rounded-full text-xs font-mono">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-forest-700" />
              <span>Requesting Wallet...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-parchment-200/80 text-ink-700 px-3 py-1.5 rounded-full text-xs font-mono border border-parchment-300">
              <span className="w-2 h-2 rounded-full bg-forest-600"></span>
              <span>Testnet Node: rpc.testnet.nimiqwatch.com</span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bar */}
      <div className="md:hidden flex items-center justify-around border-t border-parchment-200 bg-parchment-50/90 py-2 px-2">
        <button
          onClick={() => setCurrentTab('landing')}
          className={`text-[11px] font-medium py-1 px-2.5 rounded-full ${
            currentTab === 'landing' ? 'bg-parchment-200 text-ink-900 font-bold' : 'text-ink-600'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setCurrentTab('create')}
          className={`text-[11px] font-medium py-1 px-3 rounded-full ${
            currentTab === 'create' ? 'bg-forest-800 text-parchment-50 font-bold' : 'text-ink-600'
          }`}
        >
          + Order
        </button>
        <button
          onClick={() => setCurrentTab('verify')}
          className={`text-[11px] font-medium py-1 px-2.5 rounded-full ${
            currentTab === 'verify' ? 'bg-parchment-200 text-ink-900 font-bold' : 'text-ink-600'
          }`}
        >
          Verify
        </button>
        <button
          onClick={() => setCurrentTab('proof')}
          className={`text-[11px] font-medium py-1 px-2.5 rounded-full ${
            currentTab === 'proof' ? 'bg-parchment-200 text-ink-900 font-bold' : 'text-ink-600'
          }`}
        >
          Proof
        </button>
        <button
          onClick={() => setCurrentTab('history')}
          className={`text-[11px] font-medium py-1 px-2.5 rounded-full ${
            currentTab === 'history' ? 'bg-parchment-200 text-ink-900 font-bold' : 'text-ink-600'
          }`}
        >
          Ledger
        </button>
      </div>
    </header>
  );
};
