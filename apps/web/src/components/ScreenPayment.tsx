import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Wallet,
  Coins,
  QrCode,
  AlertCircle
} from 'lucide-react';
import { type UseNimiqReturn } from '../hooks/useNimiq';
import { observeTransactionApi } from '../api';
import { lunaToNimString } from '@provenim/domain';

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
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [customTxHash, setCustomTxHash] = useState('');
  const [payingWithSdk, setPayingWithSdk] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);

  const handleCopyMemo = () => {
    navigator.clipboard.writeText(memo);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2000);
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(intent.merchantAddress);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  // 1-Tap Payment via Nimiq Pay Provider
  const handlePayWithNimiqPay = async () => {
    setPayingWithSdk(true);
    setPollError(null);
    try {
      const lunaNum = Number(intent.amountLuna);
      const txHash = await nimiq.sendPayment(intent.merchantAddress, lunaNum, memo);
      if (txHash) {
        const result = await observeTransactionApi(intent.intentId, txHash);
        onPaymentObserved(txHash, result);
      }
    } catch (err: any) {
      setPollError(err.message || 'Payment cancelled or rejected in Nimiq Pay wallet');
    } finally {
      setPayingWithSdk(false);
    }
  };

  // Manual Transaction Hash submission
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

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6">
      <div className="paper-card-elevated rounded-2xl overflow-hidden relative border border-parchment-300 card-hover-glow transition-all">
        
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
        <div className="p-6 sm:p-8 space-y-6">
          {pollError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold font-mono">Payment Error:</span> {pollError}
              </div>
            </div>
          )}

          {/* If running inside Nimiq Pay: Show One-Tap Button */}
          {nimiq.isNimiqPay ? (
            <div className="p-6 rounded-2xl bg-forest-800/5 border border-forest-800/20 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-forest-800 text-parchment-50 mx-auto flex items-center justify-center shadow-md">
                <Wallet className="w-6 h-6 text-gold-light" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-ink-900">
                  Nimiq Pay Provider Detected
                </h3>
                <p className="text-xs text-ink-600 max-w-sm mx-auto mt-1">
                  Approve this transaction directly inside your connected wallet with exact memo binding.
                </p>
              </div>
              <button
                onClick={handlePayWithNimiqPay}
                disabled={payingWithSdk}
                className="inline-flex items-center justify-center gap-2 bg-forest-800 hover:bg-forest-900 text-parchment-50 px-8 py-3.5 rounded-full text-sm font-medium shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {payingWithSdk ? (
                  <span>Awaiting Wallet Approval...</span>
                ) : (
                  <>
                    <span>Pay {amountNim} NIM with Nimiq Pay</span>
                    <ArrowRight className="w-4 h-4 text-gold-light" />
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Outside Nimiq Pay: Show Payment QR Code & Instructions */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Payment QR Code */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-parchment-300 shadow-sm">
                <QRCodeSVG
                  value={nimiqPayUri}
                  size={180}
                  level="M"
                  includeMargin={true}
                  className="rounded-lg"
                />
                <span className="text-[10px] font-mono uppercase text-ink-500 mt-2 font-medium">
                  Scan to Pay in Nimiq Pay
                </span>
              </div>

              {/* Order Parameters */}
              <div className="md:col-span-7 space-y-4">
                {/* Merchant Address */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-ink-500 font-semibold block">
                    Merchant Address
                  </span>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-parchment-50 border border-parchment-200 text-xs font-mono text-ink-900">
                    <span className="truncate pr-2">{intent.merchantAddress}</span>
                    <button
                      onClick={handleCopyAddress}
                      className="text-forest-800 hover:text-forest-900 p-1 shrink-0"
                    >
                      {copiedAddr ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Required Memo Token */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-ink-500 font-semibold">
                      Transaction Memo (PRV2 Token)
                    </span>
                    <span className="text-[10px] font-mono text-forest-800 font-bold">MANDATORY</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-forest-800/5 border border-forest-800/20 text-xs font-mono text-forest-900 font-bold">
                    <span className="truncate pr-2">{memo}</span>
                    <button
                      onClick={handleCopyMemo}
                      className="text-forest-800 hover:text-forest-900 p-1 shrink-0"
                    >
                      {copiedMemo ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Nimiq Pay Deep Link URI */}
                <div className="pt-1">
                  <a
                    href={nimiqPayUri}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-forest-800 hover:underline"
                  >
                    <span>Launch Nimiq Pay App via URI</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Manual Observation Input Form */}
          <div className="pt-4 border-t border-parchment-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-ink-600 font-semibold">
                Observe Transaction Hash
              </span>
              <span className="text-[11px] font-mono text-ink-500">
                Paste hash from wallet
              </span>
            </div>

            <form onSubmit={handleManualHashSubmit} className="flex gap-2">
              <input
                type="text"
                value={customTxHash}
                onChange={(e) => setCustomTxHash(e.target.value)}
                placeholder="Paste Nimiq tx hash (e.g. 55aa49633c...)"
                className="flex-1 bg-parchment-50 border border-parchment-300 focus:border-forest-700 focus:ring-1 focus:ring-forest-700 rounded-xl px-3 py-2 text-xs font-mono text-ink-900 outline-none"
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
