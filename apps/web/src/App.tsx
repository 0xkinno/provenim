import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ScreenLanding } from './components/ScreenLanding';
import { ScreenCreate } from './components/ScreenCreate';
import { ScreenPayment } from './components/ScreenPayment';
import { ScreenJourney } from './components/ScreenJourney';
import { ScreenReceipt } from './components/ScreenReceipt';
import { ScreenVerify } from './components/ScreenVerify';
import { ScreenProof } from './components/ScreenProof';
import { ScreenHistory } from './components/ScreenHistory';
import { useNimiq } from './hooks/useNimiq';
import { fetchHealth } from './api';
import { type Receipt } from '@provenim/shared';

export function App() {
  const nimiq = useNimiq();
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [blockHeight, setBlockHeight] = useState<number | undefined>(undefined);

  // Active Flow State
  const [activeIntent, setActiveIntent] = useState<any>(null);
  const [observedTxHash, setObservedTxHash] = useState<string>('');
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [sealedReceipt, setSealedReceipt] = useState<Receipt | null>(null);

  const defaultMerchantAddress =
    import.meta.env.VITE_MERCHANT_DEFAULT_ADDRESS || 'NQ26 0000 0000 02A5 YAK7 4QNF 9MH0 TE2B GVRU';

  useEffect(() => {
    fetchHealth()
      .then((h) => {
        if (h?.blockHeight) setBlockHeight(h.blockHeight);
      })
      .catch(() => null);

    const interval = setInterval(() => {
      fetchHealth()
        .then((h) => {
          if (h?.blockHeight) setBlockHeight(h.blockHeight);
        })
        .catch(() => null);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const handleIntentCreated = (intentData: any) => {
    setActiveIntent(intentData);
    setCurrentTab('payment');
  };

  const handlePaymentObserved = (txHash: string, result: any) => {
    setObservedTxHash(txHash);
    setVerificationResult(result);
    setCurrentTab('journey');
  };

  const handleJourneyComplete = (receipt: Receipt) => {
    setSealedReceipt(receipt);
    setCurrentTab('receipt');
  };

  const handleOpenVerifierFromReceipt = (receipt: Receipt) => {
    setSealedReceipt(receipt);
    setCurrentTab('verify');
  };

  return (
    <div className="min-h-screen flex flex-col bg-parchment-100 text-ink-900 font-sans selection:bg-forest-800 selection:text-parchment-50">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        nimiq={nimiq}
        blockHeight={blockHeight}
      />

      <main className="flex-1">
        {currentTab === 'landing' && (
          <ScreenLanding
            onStartCreate={() => setCurrentTab('create')}
            onOpenVerify={() => setCurrentTab('verify')}
          />
        )}

        {currentTab === 'create' && (
          <ScreenCreate
            onIntentCreated={handleIntentCreated}
            defaultMerchantAddress={defaultMerchantAddress}
          />
        )}

        {currentTab === 'payment' && activeIntent && (
          <ScreenPayment
            intentData={activeIntent}
            nimiq={nimiq}
            onPaymentObserved={handlePaymentObserved}
            onCancel={() => setCurrentTab('create')}
          />
        )}

        {currentTab === 'journey' && (
          <ScreenJourney
            txHash={observedTxHash}
            verificationResult={verificationResult}
            onComplete={handleJourneyComplete}
            onRetry={() => setCurrentTab('payment')}
          />
        )}

        {currentTab === 'receipt' && sealedReceipt && (
          <ScreenReceipt
            receipt={sealedReceipt}
            onOpenVerifier={handleOpenVerifierFromReceipt}
            onCreateNew={() => setCurrentTab('create')}
          />
        )}

        {currentTab === 'verify' && (
          <ScreenVerify initialReceipt={sealedReceipt} />
        )}

        {currentTab === 'proof' && <ScreenProof />}

        {currentTab === 'history' && (
          <ScreenHistory
            onSelectReceipt={(r) => {
              setSealedReceipt(r);
              setCurrentTab('receipt');
            }}
          />
        )}
      </main>

      {/* Luxury Editorial Footer */}
      <footer className="border-t border-parchment-200 bg-parchment-50/70 py-8 text-xs font-mono text-ink-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-ink-900 text-sm">Provenim</span>
            <span>•</span>
            <span>Nimiq Mini Apps Competition — Cycle II</span>
          </div>

          <div className="flex items-center gap-6">
            <span className="text-forest-800 font-semibold">Live PoS History Node: rpc.nimiqwatch.com</span>
            <span>•</span>
            <span className="text-ink-600">Deterministic Invariants P1–P14</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
