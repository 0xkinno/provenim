import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  Loader2,
  ShieldCheck,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { type Receipt } from '@provenim/shared';

interface ScreenJourneyProps {
  txHash: string;
  verificationResult: {
    verdict: 'VERIFIED' | 'REJECTED' | 'PENDING';
    receipt?: Receipt;
    invariants: any;
    failureReason?: string;
  };
  onComplete: (receipt: Receipt) => void;
  onRetry: () => void;
}

interface Step {
  id: string;
  title: string;
  description: string;
  code?: string;
}

const JOURNEY_STEPS: Step[] = [
  { id: 'broadcast', title: 'Payment Broadcast Observed', description: 'Transaction detected on history node' },
  { id: 'rpc_read', title: 'Reading Transaction Evidence', description: 'Querying raw execution parameters via getTransactionByHash' },
  { id: 'intent_bind', title: 'Checking Order Binding (P1)', description: 'Verifying memo token and execution context match server intent', code: 'P1' },
  { id: 'amount_check', title: 'Verifying Exact Luna Amount (P3)', description: 'Comparing integer Luna values with zero floating-point error', code: 'P3' },
  { id: 'recipient_check', title: 'Verifying Recipient Exactness (P2)', description: 'Confirming destination matches merchant address', code: 'P2' },
  { id: 'provenance_check', title: 'Resolving Payment Provenance (P6)', description: 'Evaluating direct vs HTLC-mediated contract route', code: 'P6' },
  { id: 'finality_check', title: 'Checking Consensus Finality (P7)', description: 'Verifying micro-block inclusion and confirmation threshold', code: 'P7' },
  { id: 'sealed', title: 'Cryptographic Proof Sealed (P11)', description: 'Sealing canonical SHA-256 receipt digest', code: 'P11' }
];

export const ScreenJourney: React.FC<ScreenJourneyProps> = ({
  txHash,
  verificationResult,
  onComplete,
  onRetry
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const isRejected = verificationResult.verdict === 'REJECTED';

  useEffect(() => {
    if (currentStepIndex < JOURNEY_STEPS.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStepIndex((prev) => prev + 1);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [currentStepIndex]);

  useEffect(() => {
    if (
      currentStepIndex === JOURNEY_STEPS.length - 1 &&
      verificationResult?.verdict === 'VERIFIED' &&
      verificationResult.receipt
    ) {
      const timer = setTimeout(() => {
        onComplete(verificationResult.receipt!);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentStepIndex, verificationResult, onComplete]);

  return (
    <div className="max-w-xl mx-auto py-8 px-4 sm:px-6">
      <div className="text-center space-y-2 mb-8">
        <span className="text-xs font-mono uppercase tracking-widest text-forest-800 font-semibold flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-forest-700" />
          <span>Independent Invariant Verification</span>
        </span>
        <h2 className="font-serif text-3xl font-bold text-ink-900">
          Verifying Blockchain Evidence
        </h2>
        <p className="text-xs font-mono text-ink-500 truncate">
          Tx: {txHash}
        </p>
      </div>

      <div className="paper-card-elevated p-6 sm:p-8 rounded-2xl border border-parchment-300 relative">
        <div className="space-y-6">
          {JOURNEY_STEPS.map((step, index) => {
            const isDone = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isLast = index === JOURNEY_STEPS.length - 1;

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="flex items-start gap-4 relative"
              >
                {/* Connecting Line */}
                {!isLast && (
                  <div
                    className={`absolute left-3.5 top-7 bottom-0 w-0.5 -mb-2 transition-colors duration-300 ${
                      isDone ? 'bg-forest-700' : 'bg-parchment-300'
                    }`}
                  />
                )}

                {/* Status Icon */}
                <div className="shrink-0 pt-0.5 z-10">
                  {isDone ? (
                    <CheckCircle2 className="w-7 h-7 text-forest-700 bg-parchment-50 rounded-full" />
                  ) : isCurrent ? (
                    isRejected ? (
                      <AlertCircle className="w-7 h-7 text-red-600 bg-parchment-50 rounded-full" />
                    ) : (
                      <Loader2 className="w-7 h-7 text-forest-800 animate-spin bg-parchment-50 rounded-full" />
                    )
                  ) : (
                    <Circle className="w-7 h-7 text-parchment-300 bg-parchment-50 rounded-full" />
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1 pb-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-medium ${
                        isDone || isCurrent ? 'text-ink-900 font-semibold' : 'text-ink-400'
                      }`}
                    >
                      {step.title}
                    </span>
                    {step.code && (
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                          isDone
                            ? 'bg-forest-800/10 text-forest-800 font-bold'
                            : 'bg-parchment-200 text-ink-500'
                        }`}
                      >
                        {step.code}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-500 mt-0.5 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Rejection Notification */}
        {isRejected && (
          <div className="mt-8 p-4 rounded-xl bg-red-50 border border-red-200 space-y-2 text-left">
            <div className="flex items-center gap-2 text-red-800 font-bold text-xs font-mono uppercase">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>Settlement Invariant Violated</span>
            </div>
            <p className="text-xs text-red-700">
              {verificationResult.failureReason || 'One or more required payment invariants failed against on-chain evidence.'}
            </p>
            <div className="pt-2">
              <button
                onClick={onRetry}
                className="px-4 py-2 rounded-lg bg-red-800 text-white text-xs font-medium hover:bg-red-900 transition-colors"
              >
                Return to Payment Request
              </button>
            </div>
          </div>
        )}

        {/* Success Completion Trigger */}
        {verificationResult.verdict === 'VERIFIED' && currentStepIndex === JOURNEY_STEPS.length - 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 pt-4 border-t border-parchment-200 text-center"
          >
            <button
              onClick={() => onComplete(verificationResult.receipt!)}
              className="inline-flex items-center gap-2 bg-forest-800 hover:bg-forest-900 text-parchment-50 px-6 py-3 rounded-full text-xs font-medium shadow-md"
            >
              <span>View Sealed Proof Receipt</span>
              <ArrowRight className="w-4 h-4 text-gold-light" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};
