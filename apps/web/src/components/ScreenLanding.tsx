import React from 'react';
import { Shield, ArrowRight, CheckCircle2, Lock, FileCode, CheckCheck, FileText } from 'lucide-react';

interface ScreenLandingProps {
  onStartCreate: () => void;
  onOpenVerify: () => void;
}

export const ScreenLanding: React.FC<ScreenLandingProps> = ({
  onStartCreate,
  onOpenVerify
}) => {
  return (
    <div className="space-y-16 pb-20">
      {/* Editorial Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-12 sm:pt-12 sm:pb-16 border-b border-parchment-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left: Copy & Value Proposition */}
          <div className="lg:col-span-6 space-y-6 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-800/10 text-forest-800 text-xs font-mono font-medium">
              <Shield className="w-3.5 h-3.5" />
              <span>NIMIQ NATIVE PAYMENT PROVENANCE</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-ink-900 leading-[1.12]">
              Know exactly what got paid.
            </h1>

            <p className="text-lg sm:text-xl text-ink-600 font-sans leading-relaxed max-w-xl">
              Verifiable NIM payment receipts for merchants — even when the wallet path routes through an intermediate contract rather than the user's ordinary account history.
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={onStartCreate}
                className="inline-flex items-center justify-center gap-2 bg-forest-800 hover:bg-forest-900 text-parchment-50 px-7 py-3.5 rounded-full text-sm font-medium shadow-md transition-all hover:shadow-lg active:scale-95"
              >
                <span>Create a payment request</span>
                <ArrowRight className="w-4 h-4 text-gold-light" />
              </button>

              <button
                onClick={onOpenVerify}
                className="inline-flex items-center justify-center gap-2 bg-parchment-50 hover:bg-parchment-200/70 text-ink-800 px-6 py-3.5 rounded-full text-sm font-medium border border-parchment-300 transition-all active:scale-95"
              >
                <span>Verify a receipt</span>
                <FileText className="w-4 h-4 text-ink-500" />
              </button>
            </div>

            {/* 20-Second Judge Story Banner */}
            <div className="mt-8 p-4 rounded-xl bg-parchment-50 border border-parchment-300/80 shadow-sm space-y-2">
              <div className="text-[11px] font-mono uppercase tracking-wider text-forest-800 font-semibold flex items-center gap-1.5">
                <CheckCheck className="w-3.5 h-3.5" />
                <span>The Core Technical Guarantee</span>
              </div>
              <p className="text-xs text-ink-700 leading-relaxed">
                A payment is never considered real because a browser client says “paid”. It becomes settled only after Provenim independently verifies immutable blockchain evidence against server-issued intents and seals a deterministic SHA-256 proof receipt.
              </p>
            </div>
          </div>

          {/* Right: Premium Editorial Hero Visual */}
          <div className="lg:col-span-6 relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-parchment-300/80 bg-parchment-50 aspect-[16/10]">
              <img
                src="/assets/hero_still_life.jpg"
                alt="Provenim Editorial Payment Verification Artifact"
                className="w-full h-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-900/30 via-transparent to-transparent pointer-events-none" />
              
              {/* Subtle Live Badge Overlay */}
              <div className="absolute bottom-4 left-4 right-4 bg-parchment-50/95 backdrop-blur-md p-3.5 rounded-xl border border-parchment-300/80 shadow-lg flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-ink-500 uppercase tracking-wider">Independent Verifier</div>
                  <div className="text-xs font-serif font-bold text-ink-900">Deterministic SHA-256 Canonical Receipts</div>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-mono text-forest-700 bg-forest-800/10 px-2 py-0.5 rounded-full font-semibold">
                  <Lock className="w-3 h-3" />
                  <span>FAIL-CLOSED</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* The Discovery & Thesis Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <span className="text-xs font-mono uppercase tracking-widest text-forest-800 font-semibold">
            Protocol Investigation & Verified Findings
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink-900">
            Why Ordinary Address History Is Not Enough
          </h2>
          <p className="text-base text-ink-600">
            In Nimiq Proof-of-Stake, contract accounts and HTLCs handle conditional payment routing. Once drained, empty contract accounts are pruned from the accounts tree, leaving address history incomplete.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="paper-card p-6 rounded-xl space-y-3">
            <div className="w-10 h-10 rounded-lg bg-forest-800/10 flex items-center justify-center text-forest-800">
              <span className="font-mono font-bold text-sm">01</span>
            </div>
            <h3 className="font-serif text-xl font-bold text-ink-900">Contract Pruning</h3>
            <p className="text-sm text-ink-600 leading-relaxed">
              When payments route through an intermediate HTLC contract, querying <code className="text-xs font-mono bg-parchment-200 px-1 py-0.5 rounded">getAccountByAddress</code> on that contract later returns nothing. The address history of the customer does not show the merchant recipient.
            </p>
          </div>

          {/* Card 2 */}
          <div className="paper-card p-6 rounded-xl space-y-3">
            <div className="w-10 h-10 rounded-lg bg-forest-800/10 flex items-center justify-center text-forest-800">
              <span className="font-mono font-bold text-sm">02</span>
            </div>
            <h3 className="font-serif text-xl font-bold text-ink-900">Transaction-Level Truth</h3>
            <p className="text-sm text-ink-600 leading-relaxed">
              Nimiq History Nodes permanently retain all transactions since genesis. By querying <code className="text-xs font-mono bg-parchment-200 px-1 py-0.5 rounded">getTransactionByHash</code>, Provenim inspects the exact execution result, Luna amount, and memo tokens.
            </p>
          </div>

          {/* Card 3 */}
          <div className="paper-card p-6 rounded-xl space-y-3">
            <div className="w-10 h-10 rounded-lg bg-forest-800/10 flex items-center justify-center text-forest-800">
              <span className="font-mono font-bold text-sm">03</span>
            </div>
            <h3 className="font-serif text-xl font-bold text-ink-900">Zero-Trust Receipts</h3>
            <p className="text-sm text-ink-600 leading-relaxed">
              Every settled payment produces a canonical receipt digest. Anyone can re-verify the proof using our standalone CLI without trusting Provenim's application database or frontend.
            </p>
          </div>
        </div>
      </section>

      {/* The 14 Invariants Overview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="paper-card p-8 rounded-2xl border border-parchment-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-parchment-200">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-forest-800 font-semibold">Invariant Enforcement Engine</span>
              <h3 className="font-serif text-2xl font-bold text-ink-900">Deterministic Invariants (P1 – P14)</h3>
            </div>
            <div className="text-xs font-mono text-ink-500">
              Evaluated strictly in integer Luna with zero floating-point math
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pt-6">
            {[
              { code: 'P1', name: 'Intent Binding' },
              { code: 'P2', name: 'Recipient Exactness' },
              { code: 'P3', name: 'Amount Exactness' },
              { code: 'P4', name: 'Network Exactness' },
              { code: 'P5', name: 'Execution Success' },
              { code: 'P6', name: 'Provenance Evidence' },
              { code: 'P7', name: 'Finality Threshold' },
              { code: 'P8', name: 'Intent Uniqueness' },
              { code: 'P9', name: 'Tx Uniqueness' },
              { code: 'P10', name: 'Replay Resistance' },
              { code: 'P11', name: 'Receipt Integrity' },
              { code: 'P12', name: 'Verifier Independence' },
              { code: 'P13', name: 'Fail Closed' },
              { code: 'P14', name: 'Recovery Equivalence' },
            ].map((inv) => (
              <div key={inv.code} className="flex items-center gap-2 p-2.5 rounded-lg bg-parchment-50 border border-parchment-200">
                <CheckCircle2 className="w-4 h-4 text-forest-700 shrink-0" />
                <div>
                  <span className="font-mono text-xs font-bold text-ink-900">{inv.code}</span>
                  <span className="text-[11px] text-ink-600 block">{inv.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
