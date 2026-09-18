import React, { useState } from 'react';
import { ArrowRight, Sparkles, AlertCircle, Clock, Hash, Coins } from 'lucide-react';
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
  const [amountNim, setAmountNim] = useState('18.01422');
  const [orderRef, setOrderRef] = useState(`ORDER-${Math.floor(1000 + Math.random() * 9000)}`);
  const [merchantAddress, setMerchantAddress] = useState(defaultMerchantAddress);
  const [expiresIn, setExpiresIn] = useState(1800); // 30 mins
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
        merchantAddress,
        orderReference: orderRef,
        network: 'mainnet'
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
        <span className="text-xs font-mono uppercase tracking-widest text-forest-800 font-semibold">
          Merchant Intent Issuer
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink-900">
          Create Payment Request
        </h2>
        <p className="text-sm text-ink-600">
          Define order parameters. Provenim will issue an immutable canonical intent bound to your merchant address.
        </p>
      </div>

      <div className="paper-card-elevated p-6 sm:p-8 rounded-2xl relative overflow-hidden">
        {/* Subtle Watermark Texture */}
        <div className="absolute inset-0 security-pattern pointer-events-none opacity-40"></div>

        <form onSubmit={handleSubmit} className="relative space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

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
                required
                className="w-full bg-parchment-50 border border-parchment-300 focus:border-forest-700 focus:ring-1 focus:ring-forest-700 rounded-xl px-4 py-3 text-lg font-mono text-ink-900 transition-all outline-none"
              />
              <span className="absolute right-4 top-3.5 font-mono text-xs text-ink-500 font-semibold">
                NIM
              </span>
            </div>
            <div className="flex gap-2 pt-1">
              {['1', '10', '18.01422', '50'].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setAmountNim(preset)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-parchment-200/70 hover:bg-parchment-300 text-ink-700 transition-colors"
                >
                  {preset} NIM
                </button>
              ))}
            </div>
          </div>

          {/* Order Reference */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-ink-700 font-semibold flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-forest-700" />
              <span>Order / Reference</span>
            </label>
            <input
              type="text"
              value={orderRef}
              onChange={(e) => setOrderRef(e.target.value)}
              placeholder="e.g. ORDER-1042"
              required
              className="w-full bg-parchment-50 border border-parchment-300 focus:border-forest-700 focus:ring-1 focus:ring-forest-700 rounded-xl px-4 py-2.5 text-sm font-mono text-ink-900 transition-all outline-none"
            />
          </div>

          {/* Merchant Address */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-ink-700 font-semibold flex items-center gap-1.5">
              <span>Recipient Merchant Address</span>
            </label>
            <input
              type="text"
              value={merchantAddress}
              onChange={(e) => setMerchantAddress(e.target.value)}
              placeholder="NQ..."
              required
              className="w-full bg-parchment-50 border border-parchment-300 focus:border-forest-700 focus:ring-1 focus:ring-forest-700 rounded-xl px-4 py-2.5 text-xs font-mono text-ink-900 transition-all outline-none"
            />
          </div>

          {/* Expiry Selector */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-ink-700 font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-forest-700" />
              <span>Intent Expiration</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '15 min', val: 900 },
                { label: '30 min', val: 1800 },
                { label: '1 hour', val: 3600 },
                { label: '24 hours', val: 86400 }
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.val}
                  onClick={() => setExpiresIn(opt.val)}
                  className={`py-2 px-3 rounded-xl text-xs font-mono text-center border transition-all ${
                    expiresIn === opt.val
                      ? 'bg-forest-800 text-parchment-50 border-forest-800 font-bold shadow-sm'
                      : 'bg-parchment-50 text-ink-700 border-parchment-300 hover:bg-parchment-200/50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 bg-forest-800 hover:bg-forest-900 text-parchment-50 py-3.5 px-6 rounded-xl font-medium text-sm shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <span>Generating Intent & Digest...</span>
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
