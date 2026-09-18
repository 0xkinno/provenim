import React, { useState } from 'react';
import {
  Shield,
  ArrowRight,
  CheckCircle2,
  Lock,
  FileCode,
  CheckCheck,
  FileText,
  QrCode,
  ExternalLink,
  Store,
  Sparkles
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface ScreenLandingProps {
  onStartCreate: () => void;
  onOpenVerify: () => void;
}

export const ScreenLanding: React.FC<ScreenLandingProps> = ({
  onStartCreate,
  onOpenVerify
}) => {
  const [showMiniAppQr, setShowMiniAppQr] = useState(false);
  const miniAppDeepLink = 'https://nimpay.app/miniapps/open/provenim.vercel.app';

  return (
    <div className="space-y-16 pb-20">
      {/* Editorial Hero Section — Layered Composition */}
      <section className="relative overflow-hidden pt-10 pb-14 sm:pt-14 sm:pb-20 border-b border-parchment-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left: Copy & Value Proposition (Human-First Framing) */}
          <div className="lg:col-span-7 space-y-6 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-800/10 text-forest-800 text-xs font-mono font-medium">
              <Store className="w-3.5 h-3.5 text-forest-700" />
              <span>INDEPENDENT MERCHANT SETTLEMENT VERIFIER</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-ink-900 leading-[1.12]">
              Prove the payment before you fulfil the order.
            </h1>

            <p className="text-base sm:text-lg text-ink-700 font-sans leading-relaxed max-w-2xl">
              When accepting NIM via Nimiq Pay, never rely on ephemeral browser returns or mutable account balances.
              Provenim cryptographically resolves exact transaction-level evidence on the Nimiq blockchain to guarantee
              settlement before you hand over the product.
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={onStartCreate}
                className="inline-flex items-center justify-center gap-2 bg-forest-800 hover:bg-forest-900 text-parchment-50 px-7 py-3.5 rounded-full text-sm font-medium shadow-md transition-all hover:shadow-lg active:scale-95"
              >
                <span>Create payment request</span>
                <ArrowRight className="w-4 h-4 text-gold-light" />
              </button>

              <button
                onClick={onOpenVerify}
                className="inline-flex items-center justify-center gap-2 bg-parchment-50 hover:bg-parchment-200/70 text-ink-800 px-6 py-3.5 rounded-full text-sm font-medium border border-parchment-300 transition-all active:scale-95"
              >
                <span>Verify a receipt</span>
                <FileText className="w-4 h-4 text-ink-500" />
              </button>

              <button
                onClick={() => setShowMiniAppQr(!showMiniAppQr)}
                className="inline-flex items-center justify-center gap-2 bg-parchment-200/60 hover:bg-parchment-200 text-forest-900 px-5 py-3.5 rounded-full text-sm font-medium transition-all"
              >
                <QrCode className="w-4 h-4 text-forest-800" />
                <span>Open in Nimiq Pay</span>
              </button>
            </div>

            {/* Optional Mini App Deep Link QR Dropdown */}
            {showMiniAppQr && (
              <div className="p-4 rounded-xl bg-white border border-forest-800/20 shadow-xl max-w-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-forest-900 uppercase">
                    Scan with Nimiq Pay App
                  </span>
                  <span className="text-[10px] font-mono text-ink-500">Mini App URI</span>
                </div>
                <div className="flex justify-center p-2 bg-white rounded-lg border border-parchment-200">
                  <QRCodeSVG value={miniAppDeepLink} size={150} level="M" includeMargin={true} />
                </div>
                <p className="text-[11px] text-ink-600 font-sans text-center">
                  Scannable directly with camera or Nimiq Pay to load Provenim as an official Mini App.
                </p>
              </div>
            )}

            {/* The Merchant Reality Callout */}
            <div className="mt-8 p-4 rounded-xl bg-parchment-50 border border-parchment-300/80 shadow-sm space-y-2 card-hover-glow transition-all">
              <div className="text-[11px] font-mono uppercase tracking-wider text-forest-800 font-semibold flex items-center gap-1.5">
                <CheckCheck className="w-3.5 h-3.5" />
                <span>The 20-Second Merchant Story</span>
              </div>
              <p className="text-xs text-ink-700 leading-relaxed">
                A customer claims they paid. Instead of trusting an unconfirmed browser callback, Provenim evaluates 14 mathematical invariants directly against the Nimiq PoS history node. It verifies exact integer Luna amount, merchant destination, and order memo, then seals an immutable cryptographic proof receipt that can be verified independently without trusting our backend.
              </p>
            </div>
          </div>

          {/* Right: Layered Editorial Visual Artifact */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-parchment-300/80 bg-parchment-50 aspect-[4/3] card-hover-glow transition-all">
              <img
                src="/assets/hero_still_life.jpg"
                alt="Provenim Editorial Payment Verification Artifact"
                className="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-900/20 via-transparent to-transparent pointer-events-none" />
              
              {/* Overlay Pill */}
              <div className="absolute bottom-4 left-4 right-4 bg-parchment-50/95 backdrop-blur-md p-3.5 rounded-xl border border-parchment-300/80 shadow-lg flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-ink-500 uppercase tracking-wider">Independent Settlement</div>
                  <div className="text-xs font-serif font-bold text-ink-900">Deterministic Invariant Proofs (P1–P14)</div>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-mono text-forest-700 bg-forest-800/10 px-2 py-0.5 rounded-full font-semibold">
                  <Lock className="w-3 h-3" />
                  <span>ZERO-DB-TRUST</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Protocol Investigation & Core Problem Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <span className="text-xs font-mono uppercase tracking-widest text-forest-800 font-semibold">
            Protocol Investigation & Verified Findings
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink-900">
            Why Ordinary Address History Is Not Enough
          </h2>
          <p className="text-sm text-ink-600 leading-relaxed">
            Standard wallets rely on coarse address transaction lists (<code className="font-mono text-xs">getTransactionsByAddress</code>).
            When payments flow through intermediate contract hops or proxy wallets, account-history state alone cannot prove order fulfillment.
          </p>
        </div>

        {/* 3 Pillars Grid — Distinguished Colors with Magazine Reflective Hover Glow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pillar 1: Contract Pruning Ambiguity — Warm Amber / Sand Tone */}
          <div className="p-6 rounded-2xl space-y-3 bg-[#FAF6EE] border border-[#E8DEC8] hover:border-[#CBB794] shadow-sm hover:shadow-[0_14px_34px_-4px_rgba(197,155,39,0.22)] hover:-translate-y-1 transition-all duration-300 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-200/20 to-transparent rounded-bl-full pointer-events-none transition-opacity group-hover:opacity-100" />
            <div className="w-10 h-10 rounded-xl bg-amber-100/90 text-amber-900 border border-amber-200/80 flex items-center justify-center font-bold font-mono text-sm shadow-xs">
              01
            </div>
            <h3 className="font-serif text-xl font-bold text-ink-900">
              Contract Pruning Ambiguity
            </h3>
            <p className="text-xs text-ink-700 leading-relaxed font-sans">
              When transactions route through temporary HTLC escrows or routing contracts, the intermediate account state is pruned once cleared. Only transaction-level evidence retains the full cryptographic execution parameters.
            </p>
          </div>

          {/* Pillar 2: Integer Luna Precision — Fresh Jade / Sage Tone */}
          <div className="p-6 rounded-2xl space-y-3 bg-[#F2F7F4] border border-[#D2E4D8] hover:border-[#98C4A5] shadow-sm hover:shadow-[0_14px_34px_-4px_rgba(32,127,94,0.22)] hover:-translate-y-1 transition-all duration-300 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-200/20 to-transparent rounded-bl-full pointer-events-none transition-opacity group-hover:opacity-100" />
            <div className="w-10 h-10 rounded-xl bg-emerald-100/90 text-emerald-900 border border-emerald-200/80 flex items-center justify-center font-bold font-mono text-sm shadow-xs">
              02
            </div>
            <h3 className="font-serif text-xl font-bold text-ink-900">
              Integer Luna Precision
            </h3>
            <p className="text-xs text-ink-700 leading-relaxed font-sans">
              1 NIM equals 100,000 Luna. Provenim calculates all balances and invoices strictly using BigInt integer arithmetic, blocking floating-point rounding exploits and underpayment attacks.
            </p>
          </div>

          {/* Pillar 3: Deterministic Portability — Refined Parchment / Indigo Tone */}
          <div className="p-6 rounded-2xl space-y-3 bg-[#F5F5FA] border border-[#DCDCE8] hover:border-[#ADADC9] shadow-sm hover:shadow-[0_14px_34px_-4px_rgba(99,102,241,0.20)] hover:-translate-y-1 transition-all duration-300 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-200/20 to-transparent rounded-bl-full pointer-events-none transition-opacity group-hover:opacity-100" />
            <div className="w-10 h-10 rounded-xl bg-indigo-100/90 text-indigo-900 border border-indigo-200/80 flex items-center justify-center font-bold font-mono text-sm shadow-xs">
              03
            </div>
            <h3 className="font-serif text-xl font-bold text-ink-900">
              Deterministic Portability
            </h3>
            <p className="text-xs text-ink-700 leading-relaxed font-sans">
              Every settled payment generates a self-contained canonical receipt (<code className="font-mono text-xs bg-indigo-100/70 text-indigo-900 px-1 py-0.5 rounded">provenim.receipt</code>). Third-party auditors can verify the receipt against raw RPC without querying our application database.
            </p>
          </div>
        </div>
      </section>

      {/* The 4-Step Operational Flow — Editorial Magazine Treatment */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-parchment-200">
        <div className="max-w-3xl mx-auto text-center space-y-3 mb-10">
          <span className="text-xs font-mono uppercase tracking-widest text-forest-800 font-semibold">
            Operational Flow
          </span>
          <h2 className="font-serif text-3xl font-bold text-ink-900">
            From Order Creation to Independent Proof
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="magazine-texture p-5 rounded-xl space-y-2 border border-parchment-300 hover:border-forest-700/50 shadow-sm hover:shadow-[0_12px_28px_-4px_rgba(13,56,42,0.14)] hover:-translate-y-1 transition-all duration-300 relative group">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-forest-800/10 text-forest-800 text-[10px] font-mono font-bold tracking-wider uppercase">
              <span>Step 01</span>
            </div>
            <h4 className="font-serif font-bold text-ink-900 text-sm">Merchant Issues Order</h4>
            <p className="text-xs text-ink-600">Merchant creates intent with locked settlement address and exact Luna amount.</p>
          </div>

          <div className="magazine-texture p-5 rounded-xl space-y-2 border border-parchment-300 hover:border-forest-700/50 shadow-sm hover:shadow-[0_12px_28px_-4px_rgba(13,56,42,0.14)] hover:-translate-y-1 transition-all duration-300 relative group">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-forest-800/10 text-forest-800 text-[10px] font-mono font-bold tracking-wider uppercase">
              <span>Step 02</span>
            </div>
            <h4 className="font-serif font-bold text-ink-900 text-sm">Nimiq Pay Payment</h4>
            <p className="text-xs text-ink-600">Customer approves payment in Nimiq Pay or scans dynamic payment QR code.</p>
          </div>

          <div className="magazine-texture p-5 rounded-xl space-y-2 border border-parchment-300 hover:border-forest-700/50 shadow-sm hover:shadow-[0_12px_28px_-4px_rgba(13,56,42,0.14)] hover:-translate-y-1 transition-all duration-300 relative group">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-forest-800/10 text-forest-800 text-[10px] font-mono font-bold tracking-wider uppercase">
              <span>Step 03</span>
            </div>
            <h4 className="font-serif font-bold text-ink-900 text-sm">Invariant Verification</h4>
            <p className="text-xs text-ink-600">Provenim validates P1–P14 against raw history node evidence before marking paid.</p>
          </div>

          <div className="magazine-texture p-5 rounded-xl space-y-2 border border-parchment-300 hover:border-forest-700/50 shadow-sm hover:shadow-[0_12px_28px_-4px_rgba(13,56,42,0.14)] hover:-translate-y-1 transition-all duration-300 relative group">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-forest-800/10 text-forest-800 text-[10px] font-mono font-bold tracking-wider uppercase">
              <span>Step 04</span>
            </div>
            <h4 className="font-serif font-bold text-ink-900 text-sm">Sealed Receipt</h4>
            <p className="text-xs text-ink-600">An immutable canonical receipt is sealed. Verifiable anywhere via CLI.</p>
          </div>
        </div>
      </section>
    </div>
  );
};
