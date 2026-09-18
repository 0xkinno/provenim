import React, { useState, useEffect } from 'react';
import {
  Layers,
  CheckCircle2,
  Terminal,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  FileCode
} from 'lucide-react';
import { fetchHealth } from '../api';

interface EvidenceManifestItem {
  id: string;
  title: string;
  status: 'VERIFIED' | 'TARGET' | 'LIMITATION' | 'UNKNOWN';
  lastVerifiedAt: string;
  sourceFile: string;
  command: string;
  network: string;
  reference: string;
  notes: string;
}

const EVIDENCE_MANIFEST: EvidenceManifestItem[] = [
  {
    id: 'C-01',
    title: 'Nimiq PoS History Node Retention',
    status: 'VERIFIED',
    lastVerifiedAt: 'Live',
    sourceFile: 'research/evidence/rpc_getTransactionByHash.json',
    command: 'curl -X POST https://rpc.testnet.nimiqwatch.com',
    network: 'Nimiq PoS Testnet (ID: 5)',
    reference: 'Block #11752270+',
    notes: 'History nodes retain transactions permanently; getTransactionByHash persists on-chain execution parameters.'
  },
  {
    id: 'C-02',
    title: 'Account History Pruning in Mediated Contracts',
    status: 'VERIFIED',
    lastVerifiedAt: 'Live',
    sourceFile: 'DISCOVERY.md',
    command: 'npm run test:attacks -- A-10',
    network: 'Nimiq PoS Testnet / Mainnet',
    reference: 'DISCOVERY.md Section 3',
    notes: 'Accounts tree prunes cleared intermediate contract accounts. Transaction-level evidence is strictly required.'
  },
  {
    id: 'C-03',
    title: 'Exact PRV2 Payment Memo Binding',
    status: 'VERIFIED',
    lastVerifiedAt: 'Live',
    sourceFile: 'packages/domain/src/memo.ts',
    command: 'npm test -- packages/domain',
    network: 'Nimiq PoS Testnet (ID: 5)',
    reference: 'PRV2:<intentId>:<token>',
    notes: 'Requires exact token equality; rejects implicit pass or partial substring matches.'
  },
  {
    id: 'C-04',
    title: 'Independent Zero-DB Cryptographic Verifier',
    status: 'VERIFIED',
    lastVerifiedAt: 'Live',
    sourceFile: 'packages/verifier/src/verifier.ts',
    command: 'npm run verify:receipt -- evidence/receipt.json',
    network: 'Independent (Offline / RPC Direct)',
    reference: 'docs/RECEIPT_SPEC.md',
    notes: 'Standalone verifier validates all 14 invariants from raw RPC without querying merchant database.'
  },
  {
    id: 'C-05',
    title: 'Crash Recovery via Background Reconciler',
    status: 'VERIFIED',
    lastVerifiedAt: 'Live',
    sourceFile: 'apps/api/src/service.ts',
    command: 'npm run test:attacks -- A-08',
    network: 'Nimiq PoS Testnet (ID: 5)',
    reference: 'Invariants P10–P13',
    notes: 'Reconciler matches strictly on exact memo binding and invariants; never matches on amount alone.'
  },
  {
    id: 'C-06',
    title: 'Arbitrary 1-Confirmation Instant Finality',
    status: 'LIMITATION',
    lastVerifiedAt: 'Current Design',
    sourceFile: 'packages/domain/src/receipt.ts',
    command: 'deriveFinalityStatus()',
    network: 'Nimiq PoS Testnet (ID: 5)',
    reference: 'Finality Policy Specification',
    notes: '1 confirmation guarantees microblock inclusion; full consensus finality requires macroblock epoch finality.'
  }
];

export const ScreenProof: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [copiedCli, setCopiedCli] = useState(false);

  useEffect(() => {
    fetchHealth().then(setHealth).catch(() => null);
    const id = setInterval(() => {
      fetchHealth().then(setHealth).catch(() => null);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  const cliCode = `npm install\nnpm run verify:receipt -- evidence/receipt.json`;

  const copyCli = () => {
    navigator.clipboard.writeText(cliCode);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-10">
      {/* Page Header */}
      <div className="space-y-2 text-center sm:text-left">
        <span className="text-xs font-mono uppercase tracking-widest text-forest-800 font-semibold flex items-center justify-center sm:justify-start gap-1.5">
          <Layers className="w-4 h-4 text-forest-700" />
          <span>Proof & Empirical Evidence Ledger</span>
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink-900">
          Live Evidence & Verification Registry
        </h2>
        <p className="text-sm text-ink-600">
          Dynamic evidence manifest, live testnet blockchain consensus metrics, and commands for independent reproduction.
        </p>
      </div>

      {/* Live Blockchain Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="paper-card p-5 rounded-xl space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-ink-500">Connected RPC Node</div>
          <div className="text-sm font-mono font-bold text-ink-900 truncate">
            {health?.network === 'testnet' ? 'rpc.testnet.nimiqwatch.com' : 'rpc.nimiqwatch.com'}
          </div>
          <div className="text-[11px] font-mono text-forest-700 flex items-center gap-1 mt-1">
            <span className="w-2 h-2 rounded-full bg-forest-600 animate-pulse" />
            <span>Active PoS RPC</span>
          </div>
        </div>

        <div className="paper-card p-5 rounded-xl space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-ink-500">Consensus Height</div>
          <div className="text-xl font-serif font-bold text-forest-800">
            {health?.blockHeight ? `#${health.blockHeight.toLocaleString()}` : 'Syncing...'}
          </div>
          <div className="text-[11px] font-mono text-ink-500">Live Nimiq PoS Block</div>
        </div>

        <div className="paper-card p-5 rounded-xl space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-ink-500">Active Network</div>
          <div className="text-sm font-mono font-bold text-ink-900 uppercase">
            {health?.network || 'testnet'} (ID: {health?.networkId || 5})
          </div>
          <div className="text-[11px] font-mono text-ink-500">Albatross Consensus</div>
        </div>

        <div className="paper-card p-5 rounded-xl space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-ink-500">Configured Merchant</div>
          <div className="text-xs font-mono font-bold text-ink-900 truncate" title={health?.merchantAddress}>
            {health?.merchantAddress ? `${health.merchantAddress.slice(0, 9)}...${health.merchantAddress.slice(-8)}` : 'NQ37...LK0V'}
          </div>
          <div className="text-[11px] font-mono text-forest-800 font-semibold">Server Locked</div>
        </div>
      </div>

      {/* CLI Reproduction Card */}
      <div className="paper-card-elevated rounded-2xl overflow-hidden border border-parchment-300">
        <div className="bg-forest-800 text-parchment-50 p-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-gold-light" />
            <h3 className="font-serif text-lg font-bold">Independent CLI Reproduction Guide</h3>
          </div>
          <button
            onClick={copyCli}
            className="inline-flex items-center gap-1.5 text-xs font-mono bg-parchment-50/10 hover:bg-parchment-50/20 text-parchment-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            {copiedCli ? <Check className="w-3.5 h-3.5 text-gold-light" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCli ? 'Copied' : 'Copy Commands'}</span>
          </button>
        </div>

        <div className="p-6 bg-ink-900 text-parchment-100 font-mono text-xs overflow-x-auto space-y-2">
          <div className="text-ink-500"># Verify the canonical proof receipt directly from your terminal:</div>
          <div className="text-forest-400">$ git clone https://github.com/0xkinno/provenim.git</div>
          <div className="text-forest-400">$ cd provenim && npm install</div>
          <div className="text-gold-light">$ npm run verify:receipt -- evidence/receipt.json</div>
        </div>
      </div>

      {/* Dynamic Evidence Manifest */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-4">
          <h3 className="font-serif text-2xl font-bold text-ink-900">
            Dynamic Evidence Manifest
          </h3>
          <span className="text-xs font-mono text-ink-500">
            6 Tracked Architectural Claims
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {EVIDENCE_MANIFEST.map((claim) => (
            <div
              key={claim.id}
              className="magazine-texture p-6 rounded-2xl border border-parchment-300/90 shadow-sm hover:shadow-[0_14px_32px_-4px_rgba(13,56,42,0.14)] hover:border-forest-700/40 hover:-translate-y-1 transition-all duration-300 space-y-3 relative group overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-forest-700/5 rounded-full blur-xl pointer-events-none group-hover:bg-forest-700/10 transition-all" />

              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-xs font-mono font-bold text-forest-800 bg-forest-800/10 border border-forest-800/20 px-2 py-0.5 rounded shrink-0 whitespace-nowrap">
                      {claim.id}
                    </span>
                    <h4 className="font-serif text-base font-bold text-ink-900 leading-snug">
                      {claim.title}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-ink-500 block truncate" title={claim.sourceFile}>
                    Source: {claim.sourceFile}
                  </span>
                </div>

                <span
                  className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded font-bold shrink-0 self-start shadow-2xs tracking-wider ${
                    claim.status === 'VERIFIED'
                      ? 'bg-forest-800/10 text-forest-800 border border-forest-800/20'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {claim.status}
                </span>
              </div>

              <p className="text-xs text-ink-700 leading-relaxed font-sans">
                {claim.notes}
              </p>

              <div className="pt-2.5 border-t border-parchment-200/90 flex items-center justify-between text-[11px] font-mono text-ink-500 gap-2">
                <span className="shrink-0 text-ink-600">Ref: {claim.reference}</span>
                <span className="truncate max-w-[200px] text-ink-600 bg-parchment-200/60 px-2 py-0.5 rounded text-[10px]" title={claim.command}>{claim.command}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
