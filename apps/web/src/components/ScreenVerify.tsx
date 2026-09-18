import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Upload,
  Lock,
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { type Receipt, type VerificationVerdict } from '@provenim/shared';
import { verifyReceiptApi } from '../api';

interface ScreenVerifyProps {
  initialReceipt?: Receipt | null;
}

export const ScreenVerify: React.FC<ScreenVerifyProps> = ({ initialReceipt }) => {
  const [receiptJsonText, setReceiptJsonText] = useState('');
  const [verdict, setVerdict] = useState<VerificationVerdict | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialReceipt) {
      const formatted = JSON.stringify(initialReceipt, null, 2);
      setReceiptJsonText(formatted);
      runVerification(initialReceipt);
    }
  }, [initialReceipt]);

  const runVerification = async (receiptObj: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await verifyReceiptApi(receiptObj);
      setVerdict(res);
    } catch (err: any) {
      setError(err.message || 'Failed to communicate with verification engine');
    } finally {
      setLoading(false);
    }
  };

  const handleManualVerify = () => {
    try {
      const parsed = JSON.parse(receiptJsonText);
      runVerification(parsed);
    } catch (err: any) {
      setError(`Invalid JSON: ${err.message}`);
    }
  };

  const loadSampleReceipt = async () => {
    try {
      const res = await fetch('/assets/sample_receipt.json').catch(() => null);
      // If static file not found, load hardcoded canonical evidence
      const sample = {
        schema: 'provenim.receipt.v1',
        receiptId: 'PRV-7F4M-8821',
        intentId: 'int_sample_genesis',
        network: 'mainnet',
        merchant: 'NQ26 0000 0000 02A5 YAK7 4QNF 9MH0 TE2B GVRU',
        amountLuna: '1801422',
        transactionHash: '55aa49633c4a362699ef06c741e62c41581f34db761886ba0303dd29c6704379',
        blockHeight: 61861200,
        timestamp: 1789665908417,
        finality: {
          status: 'CONFIRMED',
          confirmations: 8802,
          verifiedAtBlock: 61870002
        },
        provenance: {
          mode: 'DIRECT',
          payer: 'NQ81 C01N BASE 0000 0000 0000 0000 0000 0000',
          evidence: [
            {
              source: 'DIRECT_FROM',
              value: 'NQ81 C01N BASE 0000 0000 0000 0000 0000 0000',
              blockHeight: 61861200
            }
          ]
        },
        orderReference: 'ORDER-1042',
        intentDigest: 'a3f5b08e2d41a72d3e528d9c1e2a4b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a',
        receiptDigest: 'ee2ff9f7803956f3c07d9666d2ee8e52daaceb96fd36055062ab804ec9084528',
        verifierVersion: '1.0.0',
        createdAt: '2026-09-17T12:00:00.000Z'
      };
      setReceiptJsonText(JSON.stringify(sample, null, 2));
      runVerification(sample);
    } catch {
      // quiet
    }
  };

  // Attack 4 Sandbox: Mutate 1 Luna
  const tamperAmount = () => {
    try {
      const obj = JSON.parse(receiptJsonText);
      obj.amountLuna = (BigInt(obj.amountLuna || '0') + 1n).toString();
      setReceiptJsonText(JSON.stringify(obj, null, 2));
      runVerification(obj);
    } catch (err: any) {
      setError('Cannot tamper: invalid JSON');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="text-center sm:text-left space-y-2">
        <span className="text-xs font-mono uppercase tracking-widest text-forest-800 font-semibold flex items-center justify-center sm:justify-start gap-1.5">
          <FileCheck className="w-4 h-4 text-forest-700" />
          <span>Independent Deterministic Verifier</span>
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink-900">
          Verify Payment Receipt
        </h2>
        <p className="text-sm text-ink-600">
          Recompute the cryptographic receipt digest and re-fetch immutable transaction evidence directly from the Nimiq blockchain.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Input & Editor Area */}
        <div className="lg:col-span-6 space-y-4">
          <div className="paper-card p-4 rounded-xl border border-parchment-300 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-ink-700 font-semibold uppercase">Receipt JSON Payload</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadSampleReceipt}
                  className="text-[11px] font-mono text-forest-800 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-gold" />
                  <span>Load Sample</span>
                </button>
                <button
                  type="button"
                  onClick={tamperAmount}
                  className="text-[11px] font-mono text-amber-800 hover:underline flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200"
                  title="Alter amount by 1 Luna to test digest rejection"
                >
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  <span>Tamper Test</span>
                </button>
              </div>
            </div>

            <textarea
              value={receiptJsonText}
              onChange={(e) => setReceiptJsonText(e.target.value)}
              placeholder='Paste receipt JSON here, e.g. { "schema": "provenim.receipt.v1", ... }'
              rows={16}
              className="w-full bg-parchment-50 border border-parchment-300 focus:border-forest-700 rounded-xl p-3 text-xs font-mono text-ink-900 outline-none resize-none leading-relaxed"
            />

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleManualVerify}
                disabled={loading || !receiptJsonText.trim()}
                className="inline-flex items-center gap-2 bg-forest-800 hover:bg-forest-900 text-parchment-50 px-5 py-2.5 rounded-xl text-xs font-medium transition-all shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying against RPC...</span>
                  </>
                ) : (
                  <>
                    <span>Run Verification</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gold-light" />
                  </>
                )}
              </button>

              <span className="text-[11px] font-mono text-ink-500">
                Zero DB Trust • Pure Math
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right: Verification Verdict & Invariant Breakdown */}
        <div className="lg:col-span-6 space-y-4">
          {verdict ? (
            <div className="paper-card-elevated p-6 rounded-2xl border border-parchment-300 space-y-6">
              
              {/* Grand Verdict Banner */}
              <div
                className={`p-4 rounded-xl flex items-center justify-between border ${
                  verdict.verdict === 'VERIFIED'
                    ? 'bg-forest-800/10 border-forest-800/30 text-forest-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  {verdict.verdict === 'VERIFIED' ? (
                    <CheckCircle2 className="w-8 h-8 text-forest-700" />
                  ) : (
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  )}
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider font-semibold">
                      Independent Verdict
                    </div>
                    <div className="font-serif text-2xl font-bold">
                      {verdict.verdict === 'VERIFIED' ? 'VERIFIED (AUTHENTIC)' : 'VERIFICATION FAILED'}
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-white/80 font-bold border border-current">
                  {verdict.verdict}
                </span>
              </div>

              {/* Explanatory Failure Callout if Tampered */}
              {verdict.verdict !== 'VERIFIED' && (
                <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5 font-mono">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    <span>Tamper / Mismatch Reason:</span>
                  </div>
                  <p className="text-amber-800 leading-relaxed font-mono text-[11px]">
                    {verdict.failureReason || 'The supplied receipt does not match its signed/canonical evidence.'}
                  </p>
                </div>
              )}

              {/* Invariant Evaluation Ledger */}
              <div className="space-y-3">
                <span className="text-xs font-mono uppercase tracking-wider text-ink-600 font-semibold block border-b border-parchment-200 pb-2">
                  Invariant Check Breakdown
                </span>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {Object.entries(verdict.invariants).map(([code, inv]: [string, any]) => (
                    <div
                      key={code}
                      className="p-3 rounded-lg bg-parchment-50 border border-parchment-200 text-xs font-mono flex items-start justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink-900">{inv.code}: {inv.name}</span>
                        </div>
                        <p className="text-[11px] text-ink-500 leading-normal">
                          {inv.message}
                        </p>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase shrink-0 ${
                          inv.status === 'PASS'
                            ? 'bg-forest-800/10 text-forest-800'
                            : inv.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verification Timestamp */}
              <div className="pt-2 border-t border-parchment-200 flex items-center justify-between text-[11px] font-mono text-ink-500">
                <span>Receipt ID: {verdict.receiptId}</span>
                <span>{new Date(verdict.timestamp).toLocaleTimeString()}</span>
              </div>

            </div>
          ) : (
            /* Empty State */
            <div className="paper-card p-12 rounded-2xl border border-dashed border-parchment-300 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-parchment-200 flex items-center justify-center text-ink-400 mx-auto">
                <FileCheck className="w-6 h-6" />
              </div>
              <h4 className="font-serif text-lg font-bold text-ink-700">No Receipt Evaluated Yet</h4>
              <p className="text-xs text-ink-500 max-w-sm mx-auto leading-relaxed">
                Paste receipt JSON on the left or click <strong className="text-forest-800">Load Sample</strong> to recompute proof against the Nimiq blockchain.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
