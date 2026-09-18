import { normalizeNimiqAddress, type PaymentIntent } from '@provenim/shared';
import { sha256Sync } from './sha256.js';

export interface CreateIntentParams {
  intentId: string;
  merchantId?: string;
  merchantAddress: string;
  amountLuna: string;
  network: 'mainnet' | 'testnet';
  orderReference: string;
  expiresInSeconds?: number;
  expiresAt?: number;
  nonce?: string;
}

export function canonicalizeIntent(intent: {
  intentId: string;
  merchantAddress: string;
  amountLuna: string;
  network: string;
  orderReference: string;
  expiresAt: number;
  randomNonce: string;
}): string {
  const normAddress = normalizeNimiqAddress(intent.merchantAddress);
  return [
    'PROVENIM_INTENT_V1',
    intent.intentId,
    normAddress,
    intent.amountLuna,
    intent.network,
    intent.orderReference,
    intent.expiresAt.toString(),
    intent.randomNonce
  ].join('|');
}

export function computeIntentDigest(canonicalString: string): string {
  return sha256Sync(canonicalString);
}

export function createPaymentIntent(params: CreateIntentParams): PaymentIntent {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = params.expiresAt !== undefined
    ? params.expiresAt
    : now + (params.expiresInSeconds || 1800);
  const nonce = params.nonce || Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const normAddress = normalizeNimiqAddress(params.merchantAddress);

  const canonical = canonicalizeIntent({
    intentId: params.intentId,
    merchantAddress: normAddress,
    amountLuna: params.amountLuna,
    network: params.network,
    orderReference: params.orderReference,
    expiresAt,
    randomNonce: nonce
  });

  const intentDigest = computeIntentDigest(canonical);

  return {
    intentId: params.intentId,
    version: '1',
    merchantId: params.merchantId || 'default-merchant',
    merchantAddress: normAddress,
    amountLuna: params.amountLuna,
    network: params.network,
    orderReference: params.orderReference,
    createdAt: now,
    expiresAt,
    randomNonce: nonce,
    intentDigest,
    status: 'OPEN'
  };
}

export function verifyIntentDigest(intent: PaymentIntent): boolean {
  const canonical = canonicalizeIntent({
    intentId: intent.intentId,
    merchantAddress: intent.merchantAddress,
    amountLuna: intent.amountLuna,
    network: intent.network,
    orderReference: intent.orderReference,
    expiresAt: intent.expiresAt,
    randomNonce: intent.randomNonce
  });
  const expected = computeIntentDigest(canonical);
  return intent.intentDigest.toLowerCase() === expected.toLowerCase();
}
