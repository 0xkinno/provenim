import React, { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Check,
  Download,
  Share2,
  ExternalLink,
  ShieldCheck,
  Lock,
  ArrowRight,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { type Receipt } from '@provenim/shared';
import { lunaToNimString } from '@provenim/domain';

interface ScreenReceiptProps {
  receipt: Receipt;
  onOpenVerifier: (receipt: Receipt) => void;
  onCreateNew: () => void;
}

export const ScreenReceipt: React.FC<ScreenReceiptProps> = ({
  receipt,
  onOpenVerifier,
  onCreateNew
}) => {
  const [copied, setCopied] = useState(false);
  const nimAmount = lunaToNimString(receipt.amountLuna);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(receipt, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(receipt, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${receipt.receiptId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Top Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest-800 text-parchment-50 text-xs font-mono font-medium shadow-sm">
          <CheckCircle2 className="w-3.5 h-3.5 text-gold-light" />
          <span>PAYMENT INDEPENDENTLY VERIFIED & SEALED</span>
        </div>
        <h2 className="font-serif text-3xl font-bold text-ink-900">
          Cryptographic Proof Receipt
        </h2>
        <p className="text-xs text-ink-500 font-mono">
          Receipt ID: {receipt.receiptId}
        </p>
      </div>

      {/* The Luxury Physical Receipt Artifact Card */}
      <div className="paper-card-elevated rounded-2xl overflow-hidden border border-parchment-300 relative shadow-2xl">
        {/* Security Pattern Watermark */}
        <div className="absolute inset-0 security-pattern opacity-60 pointer-events-none" />

        {/* Top Perforated Border Accent */}
        <div className="h-3 bg-forest-800 w-full" />

        {/* Receipt Header */}
        <div className="p-6 sm:p-8 border-b border-parchment-200/80 relative space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-ink-500">Official Merchant Receipt</span>
              <div className="font-serif text-3xl sm:text-4xl font-bold text-forest-800 mt-1">
                {nimAmount} NIM
              </div>
              <div className="text-xs font-mono text-ink-600 mt-0.5">
                {Number(receipt.amountLuna).toLocaleString()} Luna • {receipt.orderReference}
              </div>
            </div>

            {/* Embossed Luxury Seal */}
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-forest-800/30 bg-parchment-50 flex flex-col items-center justify-center p-1 text-center shadow-inner">
              <ShieldCheck className="w-6 h-6 text-forest-800" />
              <span className="text-[8px] font-mono font-bold uppercase tracking-tight text-forest-800">SEALED</span>
            </div>
          </div>
        </div>

        {/* Core Financial & Blockchain Evidence */}
        <div className="p-6 sm:p-8 space-y-5 text-xs font-mono relative bg-parchment-50/70">
          {/* Order & Network */}
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-parchment-200">
            <div>
              <div className="text-[10px] text-ink-500 uppercase">Order Reference</div>
              <div className="font-bold text-ink-900 mt-0.5">{receipt.orderReference}</div>
            </div>
            <div>
              <div className="text-[10px] text-ink-500 uppercase">Network</div>
              <div className="font-bold text-forest-800 mt-0.5 capitalize">{receipt.network} (PoS)</div>
            </div>
          </div>

          {/* Transaction Hash */}
          <div className="space-y-1">
            <div className="text-[10px] text-ink-500 uppercase flex items-center justify-between">
              <span>On-Chain Transaction Hash</span>
              <a
                href={`https://nimiq.watch/#${receipt.transactionHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-forest-800 hover:underline flex items-center gap-0.5"
              >
                <span>Explorer</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <div className="p-2.5 rounded-lg bg-parchment-100 border border-parchment-200 break-all text-[11px] text-ink-900 select-all">
              {receipt.transactionHash}
            </div>
          </div>

          {/* Provenance & Payer Attribution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-parchment-200">
            <div>
              <div className="text-[10px] text-ink-500 uppercase">Provenance Mode</div>
              <div className="font-bold text-forest-800 mt-0.5">{receipt.provenance.mode}</div>
            </div>
            <div>
              <div className="text-[10px] text-ink-500 uppercase">Resolved Payer</div>
              <div className="text-[11px] text-ink-900 mt-0.5 truncate" title={receipt.provenance.payer}>
                {receipt.provenance.payer}
              </div>
            </div>
          </div>

          {/* Recipient Merchant */}
          <div className="space-y-1">
            <div className="text-[10px] text-ink-500 uppercase">Merchant Recipient</div>
            <div className="text-[11px] text-ink-900 font-semibold truncate">
              {receipt.merchant}
            </div>
          </div>

          {/* Finality Block & Confirmations */}
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-parchment-200">
            <div>
              <div className="text-[10px] text-ink-500 uppercase">Included Block</div>
              <div className="font-bold text-ink-900 mt-0.5">#{receipt.blockHeight.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] text-ink-500 uppercase">Finality Confirmations</div>
              <div className="font-bold text-forest-800 mt-0.5">{receipt.finality.confirmations} confirmed</div>
            </div>
          </div>

          {/* Canonical Receipt Digest */}
          <div className="space-y-1 pt-1">
            <div className="text-[10px] text-ink-500 uppercase flex items-center gap-1">
              <Lock className="w-3 h-3 text-gold" />
              <span>SHA-256 Canonical Receipt Digest</span>
            </div>
            <div className="p-2.5 rounded-lg bg-forest-800/5 border border-forest-800/15 break-all text-[10px] text-forest-900 font-bold select-all">
              {receipt.receiptDigest}
            </div>
          </div>
        </div>

        {/* Receipt Actions Bar */}
        <div className="p-4 sm:p-6 bg-parchment-100 border-t border-parchment-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyJson}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-parchment-50 hover:bg-parchment-200 text-ink-800 text-xs font-medium border border-parchment-300 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-forest-700" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
            </button>

            <button
              onClick={handleDownloadJson}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-parchment-50 hover:bg-parchment-200 text-ink-800 text-xs font-medium border border-parchment-300 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>

          <button
            onClick={() => onOpenVerifier(receipt)}
            className="inline-flex items-center gap-2 bg-forest-800 hover:bg-forest-900 text-parchment-50 px-4 py-2 rounded-lg text-xs font-medium shadow-sm transition-all"
          >
            <span>Open Independent Verifier</span>
            <ArrowRight className="w-3.5 h-3.5 text-gold-light" />
          </button>
        </div>

        {/* Bottom Perforated Accent */}
        <div className="h-2 bg-parchment-200 border-t border-dashed border-parchment-300" />
      </div>

      {/* New Request Button */}
      <div className="text-center pt-2">
        <button
          onClick={onCreateNew}
          className="text-xs font-medium text-forest-800 hover:underline"
        >
          ← Issue another payment request
        </button>
      </div>
    </div>
  );
};
