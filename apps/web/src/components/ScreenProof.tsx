import React, { useState, useEffect } from 'react';
import {
  Layers,
  CheckCircle2,
  Terminal,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import { fetchHealth } from '../api';

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

  const claims = [
    {
      id: 'C-01',
      title: 'Nimiq PoS History Node Retention',
      status: 'VERIFIED',
      desc: 'History nodes retain transactions since genesis. getTransactionByHash resolves permanently.',
      evidence: 'Tested on block 61861200 via rpc.nimiqwatch.com'
    },
    {
      id: 'C-02',
      title: 'Address History Incompleteness in Mediated HTLC',
      status: 'VERIFIED',
      desc: 'Empty HTLC contract accounts are pruned from the accounts tree; address history alone cannot prove intent binding.',
      evidence: 'Observed and recorded in DISCOVERY.md'
    },
    {
      id: 'C-03',
      title: 'PRV1 Memo Binding via recipientData',
      status: 'VERIFIED',
      desc: 'sendBasicTransactionWithData successfully embeds intent ID and token on chain.',
      evidence: 'Verified via Nimiq Mini App SDK & RPC'
    },
    {
      id: 'C-04',
      title: 'Deterministic Verifier Zero-DB Trust',
      status: 'VERIFIED',
      desc: 'Standalone verifier recomputes canonical SHA-256 digest directly from chain RPC without app database.',
      evidence: 'Passed automated test suite and CLI execution'
    },
    {
      id: 'C-05',
      title: 'Crash Recovery via Background Reconciler',
      status: 'VERIFIED',
      desc: 'If customer closes browser after wallet approval, background reconciler settles order from address history.',
      evidence: 'Reconciliation worker tests pass'
    },
    {
      id: 'C-06',
      title: 'Replay Resistance Against Re-Fulfilled Orders',
      status: 'VERIFIED',
      desc: 'Duplicate settlement attempts are atomically rejected by unique database and hash constraints.',
      evidence: 'Attack 5 tests passing'
    }
  ];

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
          Empirical blockchain parameters, official claims status, and instructions for independent reproduction.
        </p>
      </div>

      {/* Live Blockchain Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="paper-card p-5 rounded-xl space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-ink-500">Connected Node</div>
          <div className="text-sm font-mono font-bold text-ink-900 truncate">rpc.nimiqwatch.com</div>
          <div className="text-[11px] font-mono text-forest-700 flex items-center gap-1 mt-1">
            <span className="w-2 h-2 rounded-full bg-forest-600 animate-pulse" />
            <span>Nimiq PoS Mainnet</span>
          </div>
        </div>

        <div className="paper-card p-5 rounded-xl space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-ink-500">Block Height</div>
          <div className="text-xl font-mono font-bold text-ink-900">
            {health?.blockHeight ? `#${health.blockHeight.toLocaleString()}` : 'Connecting...'}
          </div>
          <div className="text-[11px] font-mono text-ink-500">Albatross Epochs Active</div>
        </div>

        <div className="paper-card p-5 rounded-xl space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-ink-500">Network ID</div>
          <div className="text-xl font-mono font-bold text-forest-800">24 (Mainnet)</div>
          <div className="text-[11px] font-mono text-ink-500">Dual-chain EVM supported</div>
        </div>

        <div className="paper-card p-5 rounded-xl space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-ink-500">Verifier Version</div>
          <div className="text-xl font-mono font-bold text-ink-900">v1.0.0</div>
          <div className="text-[11px] font-mono text-forest-700">14 Hard Invariants</div>
        </div>
      </div>

      {/* Reproduction Terminal Command Block */}
      <div className="paper-card-elevated p-6 sm:p-8 rounded-2xl border border-parchment-300 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-parchment-200 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-forest-800" />
            <span className="font-mono text-xs uppercase font-bold text-ink-900">
              Deterministic CLI Reproduction
            </span>
          </div>
          <span className="text-[11px] font-mono text-ink-500">
            Verify offline or against live RPC without frontend
          </span>
        </div>

        <div className="relative group">
          <pre className="p-4 rounded-xl bg-ink-900 text-parchment-100 font-mono text-xs overflow-x-auto selection:bg-forest-700">
            <code>{cliCode}</code>
          </pre>
          <button
            onClick={copyCli}
            className="absolute right-3 top-3 px-2.5 py-1.5 rounded-lg bg-ink-800 hover:bg-ink-700 text-parchment-200 text-xs font-mono flex items-center gap-1 transition-colors"
          >
            {copiedCli ? <Check className="w-3.5 h-3.5 text-gold-light" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCli ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Claim Registry Table */}
      <div className="paper-card rounded-2xl overflow-hidden border border-parchment-300 space-y-4 p-6 sm:p-8">
        <div className="space-y-1">
          <div className="text-xs font-mono uppercase tracking-wider text-forest-800 font-semibold">
            Official Claim Registry (CLAIMS.md)
          </div>
          <h3 className="font-serif text-2xl font-bold text-ink-900">
            Verified Empirical Properties
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-parchment-300 text-ink-500">
                <th className="py-3 px-2 font-semibold">ID</th>
                <th className="py-3 px-2 font-semibold">Claim Property</th>
                <th className="py-3 px-2 font-semibold">Status</th>
                <th className="py-3 px-2 font-semibold">Empirical Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-parchment-200">
              {claims.map((claim) => (
                <tr key={claim.id} className="hover:bg-parchment-200/40 transition-colors">
                  <td className="py-3.5 px-2 font-bold text-ink-900">{claim.id}</td>
                  <td className="py-3.5 px-2">
                    <div className="font-bold text-ink-900">{claim.title}</div>
                    <div className="text-[11px] text-ink-500 mt-0.5 font-sans">{claim.desc}</div>
                  </td>
                  <td className="py-3.5 px-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-forest-800/10 text-forest-800">
                      {claim.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-2 text-[11px] text-ink-600 font-sans">
                    {claim.evidence}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
