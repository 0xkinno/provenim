import React, { useState, useEffect } from 'react';
import { History, CheckCircle2, Clock, XCircle, ArrowRight, ExternalLink } from 'lucide-react';
import { fetchHistoryApi, fetchIntentApi } from '../api';
import { lunaToNimString } from '@provenim/domain';

interface ScreenHistoryProps {
  onSelectReceipt: (receipt: any) => void;
}

export const ScreenHistory: React.FC<ScreenHistoryProps> = ({ onSelectReceipt }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistoryApi()
      .then((data) => {
        setHistory(data.history || []);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const handleRowClick = async (intentId: string) => {
    try {
      const data = await fetchIntentApi(intentId);
      if (data && data.receipt) {
        onSelectReceipt(data.receipt);
      }
    } catch {
      // quiet
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      <div className="space-y-2 text-center sm:text-left">
        <span className="text-xs font-mono uppercase tracking-widest text-forest-800 font-semibold flex items-center justify-center sm:justify-start gap-1.5">
          <History className="w-4 h-4 text-forest-700" />
          <span>Merchant Settlement Ledger</span>
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink-900">
          Payment History & Receipts
        </h2>
        <p className="text-sm text-ink-600">
          Every payment intent issued and its deterministic on-chain settlement state.
        </p>
      </div>

      <div className="paper-card rounded-2xl overflow-hidden border border-parchment-300">
        {loading ? (
          <div className="p-12 text-center text-xs font-mono text-ink-500">
            Loading settlement ledger...
          </div>
        ) : history.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-sm text-ink-600 font-serif">No payment intents issued yet.</p>
            <p className="text-xs text-ink-500">Create a payment request to record your first verified payment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-parchment-300 text-ink-500 bg-parchment-100/70">
                  <th className="py-3 px-4 font-semibold">Order / Intent</th>
                  <th className="py-3 px-4 font-semibold">Amount (NIM)</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Transaction / Receipt</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-parchment-200">
                {history.map((item) => (
                  <tr key={item.intent_id} className="hover:bg-parchment-200/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-ink-900">{item.order_reference}</div>
                      <div className="text-[10px] text-ink-500 mt-0.5">{item.intent_id}</div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-ink-900">
                      {lunaToNimString(item.amount_luna)} NIM
                      <span className="text-[10px] text-ink-500 block font-normal">
                        {Number(item.amount_luna).toLocaleString()} Luna
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          item.status === 'SEALED'
                            ? 'bg-forest-800/10 text-forest-800'
                            : item.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.status === 'SEALED' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : item.status === 'REJECTED' ? (
                          <XCircle className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        <span>{item.status}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {item.receipt_id ? (
                        <div>
                          <span className="text-forest-800 font-bold text-[11px] block">{item.receipt_id}</span>
                          <span className="text-[10px] text-ink-500 truncate max-w-[140px] block" title={item.transaction_hash}>
                            {item.transaction_hash?.slice(0, 16)}...
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-ink-400">Awaiting payment</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {item.receipt_id ? (
                        <button
                          onClick={() => handleRowClick(item.intent_id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-forest-800 hover:text-forest-900 hover:underline"
                        >
                          <span>View Proof</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
