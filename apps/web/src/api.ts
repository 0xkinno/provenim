import { type Receipt, type VerificationVerdict } from '@provenim/shared';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://provenim-api.onrender.com' : 'http://localhost:3001');

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/api/health`);
  return await res.json();
}

export async function createPaymentIntentApi(params: {
  amountNim?: string;
  amountLuna?: string;
  merchantAddress: string;
  orderReference: string;
  network?: 'mainnet' | 'testnet';
  merchantId?: string;
}) {
  const res = await fetch(`${API_BASE}/api/intents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create payment intent');
  }
  return await res.json();
}

export async function fetchIntentApi(intentId: string) {
  const res = await fetch(`${API_BASE}/api/intents/${intentId}`);
  if (!res.ok) {
    throw new Error('Intent not found');
  }
  return await res.json();
}

export async function observeTransactionApi(intentId: string, txHash: string) {
  const res = await fetch(`${API_BASE}/api/intents/${intentId}/observe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txHash })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to observe transaction');
  }
  return (await res.json()) as {
    verdict: 'VERIFIED' | 'REJECTED' | 'PENDING';
    receipt?: Receipt;
    invariants: any;
    failureReason?: string;
  };
}

export async function verifyReceiptApi(receipt: any): Promise<VerificationVerdict> {
  const res = await fetch(`${API_BASE}/api/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ receipt })
  });
  return await res.json();
}

export async function fetchHistoryApi() {
  const res = await fetch(`${API_BASE}/api/history`);
  return await res.json();
}
