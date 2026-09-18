import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Upload,
  FileText,
  Lock,
  ArrowRight
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
      if (!receiptJsonText.trim()) {
        setError('Please paste receipt JSON or upload a receipt file.');
        return;
      }
      const parsed = JSON.parse(receiptJsonText);
      runVerification(parsed);
    } catch (err: any) {
      setError(`Invalid JSON syntax: ${err.message}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        setReceiptJsonText(text);
        const parsed = JSON.parse(text);
        runVerification(parsed);
      } catch (err: any) {
        setError(`Failed to parse file as JSON: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Tamper Sandbox: Modify amount by 1 Luna to demonstrate cryptographic failure
  const handleTamperAmount = () => {
    try {
      const parsed = JSON.parse(receiptJsonText);
      const originalAmount = BigInt(parsed.amountLuna || '100000');
      parsed.amountLuna = (originalAmount + 1n).toString();
      const updated = JSON.stringify(parsed, null, 2);
      setReceiptJsonText(updated);
      runVerification(parsed);
    } catch {
      setError('Cannot tamper: invalid JSON loaded');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="space-y-2 text-center sm:text-left">
        <span className="text-xs font-mono uppercase tracking-widest text-forest-800 font-semibold flex items-center justify-center sm:justify-start gap-1.5">
          <FileCheck className="w-4 h-4 text-forest-700" />
          <span>Independent Proof Verifier</span>
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink-900">
          Verify Payment Receipt
        </h2>
        <p className="text-sm text-ink-600">
          Upload or paste any <code className="font-mono text-xs">provenim.receipt</code> JSON. The verifier recomputes the canonical SHA-256 digest and validates raw on-chain state without trusting any central database.
        </p>
      </div>

      {/* Immediate Failure / Success Verdict (Mobile-First Top Banner) */}
      {verdict && (
        <div
          className={`p-6 rounded-2xl border ${
            verdict.verdict === 'VERIFIED'
              ? 'bg-forest-800/10 border-forest-800/30'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                verdict.verdict === 'VERIFIED'
                  ? 'bg-forest-800 text-parchment-50 shadow-md'
                  : 'bg-red-800 text-white shadow-md'
              }`}
            >
              {verdict.verdict === 'VERIFIED' ? (
                <CheckCircle2 className="w-6 h-6 text-gold-light" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono text-xs uppercase px-2 py-0.5 rounded font-bold ${
                    verdict.verdict === 'VERIFIED'
                      ? 'bg-forest-800 text-parchment-50'
                      : 'bg-red-800 text-white'
                  }`}
                >
                  {verdict.verdict === 'VERIFIED' ? 'VERIFIED (AUTHENTIC)' : 'REJECTED (INVALID)'}
                </span>
                <span className="text-xs font-mono text-ink-500">
                  Receipt: {verdict.receiptId}
                </span>
              </div>

              {verdict.verdict === 'VERIFIED' ? (
                <p className="text-sm font-medium text-forest-900">
                  All claimed blockchain settlement invariants and canonical SHA-256 receipt digests confirmed against live RPC node.
                </p>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-bold text-red-900">
                    Settlement Verification Failed
                  </p>
                  <p className="text-xs text-red-700 font-mono">
                    {verdict.failureReason || 'One or more required invariants violated against on-chain evidence.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Input Section */}
      <div className="paper-card p-6 sm:p-8 rounded-2xl border border-parchment-300 space-y-4">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <label className="text-xs font-mono uppercase tracking-wider text-ink-700 font-semibold">
            Receipt JSON Payload
          </label>

          <div className="flex items-center gap-2">
            <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium text-forest-800 bg-parchment-50 border border-parchment-300 px-3 py-1.5 rounded-lg hover:bg-parchment-200 transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload JSON File</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {receiptJsonText && (
              <button
                type="button"
                onClick={handleTamperAmount}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-red-700 hover:text-red-900 bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-lg transition-colors"
                title="Simulate Attack 4: Modify Luna value by 1 to test digest mismatch"
              >
                <span>Tamper +1 Luna</span>
              </button>
            )}
          </div>
        </div>

        <textarea
          rows={10}
          value={receiptJsonText}
          onChange={(e) => setReceiptJsonText(e.target.value)}
          placeholder={`{\n  "schema": "provenim.receipt.v2",\n  "receiptId": "PRV-...",\n  "transactionHash": "...",\n  "amountLuna": "..."\n}`}
          className="w-full bg-parchment-50 border border-parchment-300 focus:border-forest-700 focus:ring-1 focus:ring-forest-700 rounded-xl p-4 text-xs font-mono text-ink-900 outline-none leading-relaxed"
        />

        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] font-mono text-ink-500">
            Recomputes canonical SHA-256 digest directly without database dependencies.
          </span>

          <button
            onClick={handleManualVerify}
            disabled={loading || !receiptJsonText.trim()}
            className="bg-forest-800 hover:bg-forest-900 text-parchment-50 px-6 py-2.5 rounded-full text-xs font-medium transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Verifying RPC...</span>
              </>
            ) : (
              <>
                <span>Run Verification</span>
                <ArrowRight className="w-3.5 h-3.5 text-gold-light" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Invariants Evaluation Table */}
      {verdict && verdict.invariants && (
        <div className="paper-card rounded-2xl overflow-hidden border border-parchment-300">
          <div className="p-4 bg-parchment-200/60 border-b border-parchment-300 flex items-center justify-between">
            <span className="font-serif font-bold text-ink-900 text-sm">
              Invariant Audit Trail
            </span>
            <span className="text-[11px] font-mono text-ink-600">
              Evaluated at {new Date(verdict.timestamp).toLocaleTimeString()}
            </span>
          </div>

          <div className="divide-y divide-parchment-200">
            {Object.values(verdict.invariants).map((inv: any) => (
              <div key={inv.code} className="p-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-ink-900">
                      {inv.code} · {inv.name}
                    </span>
                  </div>
                  <p className="text-xs text-ink-600 font-mono">
                    {inv.message}
                  </p>
                </div>

                <span
                  className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold shrink-0 ${
                    inv.status === 'PASS'
                      ? 'bg-forest-800/10 text-forest-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {inv.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
