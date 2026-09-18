import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Wallet,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { type UseNimiqReturn } from '../hooks/useNimiq';
import { observeTransactionApi, fetchIntentApi } from '../api';

interface ScreenPaymentProps {
  intentData: {
    intent: any;
    memo: string;
    nimiqPayUri: string;
    amountNim: string;
  };
  nimiq: UseNimiqReturn;
  onPaymentObserved: (txHash: string, result: any) => void;
  onCancel: () => void;
}

export const ScreenPayment: React.FC<ScreenPaymentProps> = ({
  intentData,
  nimiq,
  onPaymentObserved,
  onCancel
}) => {
  const { intent, memo, nimiqPayUri, amountNim } = intentData;
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [customTxHash, setCustomTxHash] = useState('');
  const [payingWithSdk, setPayingWithSdk] = useState(false);
  const [isPolling, setIsPolling] = useState(true);
  const [pollError, setPollError] = useState<string | null>(null);

  // Copy helper
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Background polling for intent updates (e.g. if paid via mobile or background reconciler)
  useEffect(() => {
    let active = true;
    const interval = setInterval(async () => {
      if (!isPolling) return;
      try {
        const latest = await fetchIntentApi(intent.intentId);
        if (latest && latest.receipt && active) {
          setIsPolling(false);
          onPaymentObserved(latest.settlement?.transaction_hash || latest.receipt.transactionHash, {
            verdict: 'VERIFIED',
            receipt: latest.receipt
          });
        }
      } catch (err: any) {
        // quiet poll
      }
    }, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [intent.intentId, isPolling, onPaymentObserved]);

  // Handle Nimiq Pay Native Wallet Interaction
  const handleNimiqPayClick = async () => {
    setPayingWithSdk(true);
    setPollError(null);
    try {
      const lunaNum = Number(intent.amountLuna);
      const txHash = await nimiq.sendPayment(intent.merchantAddress, lunaNum, memo);
      if (txHash) {
        // Immediately submit to Provenim API for invariant verification
        const result = await observeTransactionApi(intent.intentId, txHash);
        onPaymentObserved(txHash, result);
      }
    } catch (err: any) {
      setPollError(err.message || 'Payment cancelled or rejected in Nimiq Pay wallet');
    } finally {
      setPayingWithSdk(false);
    }
  };

  // Manual Transaction Hash submit (for desktop / external wallet evaluation)
  const handleManualHashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTxHash.trim()) return;
    setPayingWithSdk(true);
    setPollError(null);
    try {
      const result = await observeTransactionApi(intent.intentId, customTxHash.trim());
      onPaymentObserved(customTxHash.trim(), result);
    } catch (err: any) {
      setPollError(err.message || 'Verification failed for supplied transaction');
    } finally {
      setPayingWithSdk(false);
    }
  };

  // Quick helper to populate sample real mainnet tx for evaluation
  const loadRealEvidenceTx = () => {
    setCustomTxHash('55aa49633c4a362699ef06c741e62c41581f34db761886ba0303dd29c6704379');
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6">
      <div className="paper-card-elevated rounded-2xl overflow-hidden relative border border-parchment-300">
        
        {/* Header Ribbon */}
        <div className="bg-forest-800 text-parchment-50 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-widest text-gold-light font-semibold">
              Payment Request • Intent #{intent.intentId.slice(-8)}
            </div>
            <div className="font-serif text-3xl sm:text-4xl font-bold mt-1">
              {amountNim} NIM
            </div>
            <div className="text-xs font-mono text-parchment-200 mt-0.5">
              {Number(intent.amountLuna).toLocaleString()} Luna • {intent.orderReference}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-gold-light animate-ping" />
            <span className="text-xs font-mono tracking-wider text-parchment-100 uppercase">
              Awaiting On-Chain Payment
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-8 bg-parchment-50 relative">
          {pollError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{pollError}</span>
            </div>
          )}

          {/* Primary Action: Nimiq Pay Native Button (If running inside Nimiq Pay or SDK ready) */}
          {nimiq.isNimiqPay ? (
            <div className="p-5 rounded-2xl bg-forest-800/5 border border-forest-800/20 text-center space-y-3">
              <div className="text-xs font-mono text-forest-800 font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Wallet className="w-4 h-4 text-forest-700" />
                <span>Nimiq Pay Wallet Detected</span>
              </div>
              <button
                onClick={handleNimiqPayClick}
                disabled={payingWithSdk}
                className="w-full inline-flex items-center justify-center gap-2.5 bg-forest-800 hover:bg-forest-900 text-parchment-50 py-3.5 px-6 rounded-xl font-medium text-base shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {payingWithSdk ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-gold-light" />
                    <span>Confirming in Nimiq Pay...</span>
                  </>
                ) : (
                  <>
                    <span>Pay {amountNim} NIM with Nimiq Pay</span>
                    <ArrowRight className="w-4 h-4 text-gold-light" />
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Standard Browser / Mobile QR Flow */
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-8 items-center">
              {/* QR Code Container */}
              <div className="sm:col-span-5 flex flex-col items-center justify-center p-4 rounded-xl bg-parchment-100 border border-parchment-200">
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <QRCodeSVG
                    value={nimiqPayUri}
                    size={160}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <div className="text-[10px] font-mono text-ink-500 mt-2 text-center">
                  Scan with Nimiq Pay or Nimiq Wallet
                </div>
              </div>

              {/* Payment Details & Links */}
              <div className="sm:col-span-7 space-y-4">
                {/* Recipient Address */}
                <div className="space-y-1">
                  <div className="text-[11px] font-mono text-ink-500 uppercase tracking-wider">Merchant Address</div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-parchment-100 border border-parchment-200">
                    <span className="font-mono text-xs text-ink-900 truncate mr-2">
                      {intent.merchantAddress}
                    </span>
                    <button
                      onClick={() => copyToClipboard(intent.merchantAddress, 'addr')}
                      className="p-1 hover:bg-parchment-200 rounded text-ink-600 transition-colors"
                      title="Copy Address"
                    >
                      {copiedField === 'addr' ? <Check className="w-3.5 h-3.5 text-forest-700" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Intent PRV1 Memo */}
                <div className="space-y-1">
                  <div className="text-[11px] font-mono text-ink-500 uppercase tracking-wider">
                    Transaction Memo (Required for Intent Binding)
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-parchment-100 border border-parchment-200">
                    <span className="font-mono text-xs font-bold text-forest-800 truncate mr-2">
                      {memo}
                    </span>
                    <button
                      onClick={() => copyToClipboard(memo, 'memo')}
                      className="p-1 hover:bg-parchment-200 rounded text-ink-600 transition-colors"
                      title="Copy Memo"
                    >
                      {copiedField === 'memo' ? <Check className="w-3.5 h-3.5 text-forest-700" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Open in Nimiq Wallet Link */}
                <div>
                  <a
                    href={nimiqPayUri}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-forest-800 hover:text-forest-900 underline underline-offset-4"
                  >
                    <span>Open in Nimiq Wallet / Pay link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Manual Observation / Real Evidence Input Form */}
          <div className="pt-4 border-t border-parchment-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-ink-600 font-semibold">
                Submit Transaction Hash
              </span>
              <button
                type="button"
                onClick={loadRealEvidenceTx}
                className="text-[11px] font-mono text-forest-800 hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-gold" />
                <span>Use Block 61861200 Real Tx</span>
              </button>
            </div>

            <form onSubmit={handleManualHashSubmit} className="flex gap-2">
              <input
                type="text"
                value={customTxHash}
                onChange={(e) => setCustomTxHash(e.target.value)}
                placeholder="Paste Nimiq tx hash (e.g. 55aa49633c...)"
                className="flex-1 bg-parchment-100 border border-parchment-300 focus:border-forest-700 focus:ring-1 focus:ring-forest-700 rounded-xl px-3 py-2 text-xs font-mono text-ink-900 outline-none"
              />
              <button
                type="submit"
                disabled={payingWithSdk || !customTxHash.trim()}
                className="bg-forest-800 hover:bg-forest-900 text-parchment-50 px-4 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-50"
              >
                Verify Tx
              </button>
            </form>
          </div>

          {/* Footer Controls */}
          <div className="pt-2 flex items-center justify-between text-xs text-ink-500 border-t border-parchment-200">
            <button
              onClick={onCancel}
              className="text-ink-600 hover:text-ink-900 hover:underline"
            >
              Cancel Request
            </button>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <RefreshCw className="w-3 h-3 animate-spin text-forest-700" />
              <span>Watching blockchain history node...</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
