import { useState, useEffect, useCallback } from 'react';
import { init, type NimiqProvider } from '@nimiq/mini-app-sdk';
import { normalizeNimiqAddress } from '@provenim/shared';

export type WalletState =
  | 'uninitialized'
  | 'provider_detected'
  | 'requesting_permission'
  | 'connected'
  | 'action_pending'
  | 'rejected'
  | 'unavailable';

export interface UseNimiqReturn {
  provider: NimiqProvider | null;
  walletState: WalletState;
  isNimiqPay: boolean;
  isReady: boolean;
  accounts: string[];
  selectedAccount: string | null;
  blockNumber: number | null;
  isConsensusEstablished: boolean;
  networkName: string;
  connectWallet: () => Promise<string[]>;
  disconnectWallet: () => void;
  sendPayment: (recipient: string, valueLuna: number | bigint, memoData?: string) => Promise<string>;
}

export function useNimiq(): UseNimiqReturn {
  const [provider, setProvider] = useState<NimiqProvider | null>(null);
  const [walletState, setWalletState] = useState<WalletState>('uninitialized');
  const [isNimiqPay, setIsNimiqPay] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [isConsensusEstablished, setIsConsensusEstablished] = useState(false);
  const [networkName, setNetworkName] = useState<string>(
    import.meta.env.VITE_NIMIQ_NETWORK || 'testnet'
  );

  useEffect(() => {
    let mounted = true;

    async function initSdk() {
      try {
        // Wait up to 2.5s for Nimiq Pay injected provider
        const p = await Promise.race([
          init(),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500))
        ]);

        if (p && mounted) {
          setProvider(p);
          setIsNimiqPay(true);
          setIsReady(true);
          setWalletState('provider_detected');

          try {
            const consensus = await p.isConsensusEstablished();
            if (mounted) setIsConsensusEstablished(consensus);
            const block = await p.getBlockNumber();
            if (mounted) setBlockNumber(block);
            if (typeof p.getNetwork === 'function') {
              const net = p.getNetwork();
              if (net && mounted) setNetworkName(net);
            }
          } catch {
            // methods may require permissions in certain host webviews
          }
        } else if (mounted) {
          setIsNimiqPay(false);
          setIsReady(true);
          setWalletState('unavailable');
        }
      } catch {
        // Outside Nimiq Pay webview (standard desktop/mobile browser)
        if (mounted) {
          setIsNimiqPay(false);
          setIsReady(true);
          setWalletState('unavailable');
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
      setWalletState('unavailable');
      return [];
    }

    setWalletState('requesting_permission');
    try {
      // Official listAccounts() call initiates user consent modal in Nimiq Pay
      const res = await provider.listAccounts();
      if (Array.isArray(res) && res.length > 0) {
        setAccounts(res);
        setSelectedAccount(res[0]);
        setWalletState('connected');
        return res;
      } else if (Array.isArray(res)) {
        setAccounts([]);
        setSelectedAccount(null);
        setWalletState('provider_detected');
        return [];
      } else {
        setWalletState('rejected');
        return [];
      }
    } catch (err) {
      console.warn('User denied Nimiq Pay account access or error:', err);
      setWalletState('rejected');
      return [];
    }
  }, [provider]);

  const disconnectWallet = useCallback(() => {
    setAccounts([]);
    setSelectedAccount(null);
    setWalletState(provider ? 'provider_detected' : 'unavailable');
  }, [provider]);

  const sendPayment = useCallback(
    async (recipient: string, valueLuna: number | bigint, memoData?: string): Promise<string> => {
      if (!provider) {
        throw new Error('Nimiq Pay provider not available in this browser environment. Use QR code or manual submission.');
      }

      setWalletState('action_pending');
      const cleanRecipient = normalizeNimiqAddress(recipient);
      const lunaNum = typeof valueLuna === 'bigint' ? Number(valueLuna) : valueLuna;

      try {
        const p = provider as any;
        let res: any;

        // Official Nimiq Provider API specification: pass object with recipient, value, data
        if (memoData && typeof p.sendBasicTransactionWithData === 'function') {
          res = await p.sendBasicTransactionWithData({
            recipient: cleanRecipient,
            value: lunaNum,
            data: memoData
          });
        } else if (typeof p.sendBasicTransaction === 'function') {
          res = await p.sendBasicTransaction({
            recipient: cleanRecipient,
            value: lunaNum
          });
        } else {
          throw new Error('No transaction execution method found on injected Nimiq provider');
        }

        // Handle error responses from provider
        if (res && typeof res === 'object' && res.error) {
          throw new Error(res.error.message || 'Payment rejected by user in Nimiq Pay wallet');
        }

        const txHash = typeof res === 'string' ? res : res?.hash || res?.transactionHash || '';
        if (!txHash) {
          throw new Error('Provider did not return a valid transaction hash');
        }

        setWalletState('connected');
        return txHash;
      } catch (err: any) {
        setWalletState('rejected');
        throw err;
      }
    },
    [provider]
  );

  return {
    provider,
    walletState,
    isNimiqPay,
    isReady,
    accounts,
    selectedAccount,
    blockNumber,
    isConsensusEstablished,
    networkName,
    connectWallet,
    disconnectWallet,
    sendPayment
  };
}
