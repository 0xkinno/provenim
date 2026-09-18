import { useState, useEffect, useCallback } from 'react';
import { init, type NimiqProvider } from '@nimiq/mini-app-sdk';

export interface UseNimiqReturn {
  provider: NimiqProvider | null;
  isNimiqPay: boolean;
  isReady: boolean;
  isConnecting: boolean;
  accounts: string[];
  selectedAccount: string | null;
  blockNumber: number | null;
  isConsensusEstablished: boolean;
  connectWallet: () => Promise<string[]>;
  sendPayment: (recipient: string, valueLuna: number, memoData?: string) => Promise<string>;
}

export function useNimiq(): UseNimiqReturn {
  const [provider, setProvider] = useState<NimiqProvider | null>(null);
  const [isNimiqPay, setIsNimiqPay] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [isConsensusEstablished, setIsConsensusEstablished] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function initSdk() {
      try {
        // init() returns typed NimiqProvider once injected by Nimiq Pay
        const p = await Promise.race([
          init(),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]);

        if (p && mounted) {
          setProvider(p);
          setIsNimiqPay(true);
          setIsReady(true);

          try {
            const consensus = await p.isConsensusEstablished();
            setIsConsensusEstablished(consensus);
            const block = await p.getBlockNumber();
            setBlockNumber(block);
          } catch {
            // provider methods may require permissions
          }
        }
      } catch {
        // Outside Nimiq Pay webview (standard desktop browser)
        if (mounted) {
          setIsNimiqPay(false);
          setIsReady(true);
        }
      } finally {
        if (mounted) {
          setIsConnecting(false);
        }
      }
    }

    initSdk();

    return () => {
      mounted = false;
    };
  }, []);

  const connectWallet = useCallback(async (): Promise<string[]> => {
    if (!provider) {
      // In browser mode, prompt or return fallback address
      return [];
    }
    try {
      const res = await provider.listAccounts();
      if (Array.isArray(res)) {
        setAccounts(res);
        if (res.length > 0) {
          setSelectedAccount(res[0]);
        }
        return res;
      }
      return [];
    } catch (err) {
      console.warn('User denied account access or error:', err);
      return [];
    }
  }, [provider]);

  const sendPayment = useCallback(
    async (recipient: string, valueLuna: number, memoData?: string): Promise<string> => {
      if (!provider) {
        throw new Error('Nimiq Pay provider not available in this environment');
      }

      const p = provider as any;
      if (memoData && p.sendBasicTransactionWithData) {
        const res = await p.sendBasicTransactionWithData(recipient, valueLuna, memoData);
        return typeof res === 'string' ? res : res.hash || res;
      } else if (p.sendBasicTransaction) {
        // SDK may accept (recipient, value) or ({ recipient, value })
        let res;
        try {
          res = await p.sendBasicTransaction({ recipient, value: valueLuna });
        } catch {
          res = await p.sendBasicTransaction(recipient, valueLuna);
        }
        return typeof res === 'string' ? res : (res as any).hash || res;
      } else {
        throw new Error('No transaction sending method found on provider');
      }
    },
    [provider]
  );

  return {
    provider,
    isNimiqPay,
    isReady,
    isConnecting,
    accounts,
    selectedAccount,
    blockNumber,
    isConsensusEstablished,
    connectWallet,
    sendPayment
  };
}
