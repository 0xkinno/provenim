import React, { useState } from 'react';
import { ArrowRight, Lock, AlertCircle, Coins, Copy, Check, Store } from 'lucide-react';
import { nimStringToLuna } from '@provenim/domain';
import { createPaymentIntentApi } from '../api';

interface ScreenCreateProps {
  onIntentCreated: (intentData: any) => void;
  defaultMerchantAddress: string;
}

export const ScreenCreate: React.FC<ScreenCreateProps> = ({
  onIntentCreated,
  defaultMerchantAddress
}) => {
  const [amountNim, setAmountNim] = useState('12.50');
  const [orderRef, setOrderRef] = useState(`ORDER-${Math.floor(1000 + Math.random() * 9000)}`);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live Luna calculation
  let lunaValue = 0n;
  let lunaError = false;
  try {
    lunaValue = nimStringToLuna(amountNim || '0');
  } catch {
    lunaError = true;
  }

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(defaultMerchantAddress);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (lunaError || lunaValue <= 0n) {
      setError('Please enter a valid NIM amount greater than 0.');
      return;
    }

    setLoading(true);
    try {
      const res = await createPaymentIntentApi({
        amountNim,
        merchantAddress: defaultMerchantAddress,
        orderReference: orderRef,
        network: (import.meta.env.VITE_NIMIQ_NETWORK as any) || 'testnet'
      });
      onIntentCreated(res);
    } catch (err: any) {
      setError(err.message || 'Failed to create payment intent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4 sm:px-6">
      <div className="space-y-2 mb-8 text-center sm:text-left">
        <span className="text-xs font-mono uppercase tracking-widest text-forest-800 font-semibold flex items-center justify-center sm:justify-start gap-1.5">
          <Store className="w-3.5 h-3.5 text-forest-700" />
          <span>Point of Sale • Order Generator</span>
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink-900">
          New Payment Request
        </h2>
        <p className="text-sm text-ink-600">
          Create a verified order for your customer. Settlement destination is cryptographically locked to your merchant address.
        </p>
      </div>

      <div className="paper-card-elevated p-6 sm:p-8 rounded-2xl relative overflow-hidden card-hover-glow transition-all">
        <div className="absolute inset-0 security-pattern pointer-events-none opacity-40"></div>

        <form onSubmit={handleSubmit} className="relative space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Order Reference Field */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-ink-700 font-semibold">
              Order Reference / Invoice #
            </label>
            <input
              type="text"
              value={orderRef}
              onChange={(e) => setOrderRef(e.target.value)}
              placeholder="e.g. ORDER-1042"
              className="w-full bg-parchment-50 border border-parchment-300 focus:border-forest-700 focus:ring-1 focus:ring-forest-700 rounded-xl px-4 py-3 text-sm font-mono text-ink-900 outline-none transition-all"
              required
            />
          </div>

          {/* Amount Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono uppercase tracking-wider text-ink-700 font-semibold flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-forest-700" />
                <span>Amount (NIM)</span>
              </label>
              <div className="text-[11px] font-mono text-ink-500">
                {lunaError ? (
                  <span className="text-red-600">Invalid amount</span>
                ) : (
                  <span>= {lunaValue.toLocaleString()} Luna</span>
                )}
              </div>
            </div>
            <div className="relative">
              <input
                type="text"
                value={amountNim}
                onChange={(e) => setAmountNim(e.target.value)}
                placeholder="12.50"
                className="w-full bg-parchment-50 border border-parchment-300 focus:border-forest-700 focus:ring-1 focus:ring-forest-700 rounded-xl px-4 py-3 text-lg font-serif font-bold text-ink-900 outline-none transition-all"
                required
              />
              <span className="absolute right-4 top-3.5 text-xs font-mono uppercase font-bold text-forest-800">
                NIM
              </span>
            </div>
            <span className="text-[11px] font-mono text-ink-500 block">
              1 NIM = 100,000 Luna (Enforced via integer BigInt arithmetic)
            </span>
          </div>

          {/* Settlement Destination (Server Locked) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono uppercase tracking-wider text-ink-700 font-semibold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-forest-700" />
                <span>Settlement Destination</span>
              </label>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-forest-800/10 text-forest-800 font-bold">
                SERVER LOCKED
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-parchment-200/60 border border-parchment-300 font-mono text-xs text-ink-900">
              <span className="truncate pr-2 font-medium">
                {defaultMerchantAddress || 'NQ37 KE7T S7T2 JQTK QDC6 PAFB RQ7Q 9GEV LK0V'}
              </span>
              <button
                type="button"
                onClick={handleCopyAddress}
                className="p-1 hover:text-forest-800 transition-colors shrink-0"
                title="Copy Address"
              >
                {copiedAddr ? <Check className="w-4 h-4 text-forest-700" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <span className="text-[11px] text-ink-500 font-sans block">
              Configured on backend deployment. Client cannot tamper with settlement destination.
            </span>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || lunaError}
              className="w-full bg-forest-800 hover:bg-forest-900 text-parchment-50 py-3.5 px-6 rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 active:scale-98"
            >
              {loading ? (
                <span>Generating Intent & Memo...</span>
              ) : (
                <>
                  <span>Create payment request</span>
                  <ArrowRight className="w-4 h-4 text-gold-light" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
