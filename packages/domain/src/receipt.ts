import { type Receipt, normalizeNimiqAddress } from '@provenim/shared';
import { sha256Sync } from './sha256.js';

export const VERIFIER_VERSION = '1.0.0';

export interface CanonicalReceiptFields {
  schema: string;
  receiptId: string;
  intentId: string;
  network: string;
  merchant: string;
  amountLuna: string;
  transactionHash: string;
  blockHeight: number;
  payer: string;
  provenanceMode: string;
  orderReference: string;
  intentDigest: string;
  createdAt: string;
}

/**
 * Deterministic canonical serialization of receipt fields for SHA-256 sealing.
 * Pipe-delimited canonical sequence ensures identical bytes across all implementations.
 */
export function canonicalizeReceiptFields(fields: CanonicalReceiptFields): string {
  const normMerchant = normalizeNimiqAddress(fields.merchant);
  const normPayer = normalizeNimiqAddress(fields.payer);

  return [
    'PROVENIM_RECEIPT_V1',
    fields.schema,
    fields.receiptId,
    fields.intentId,
    fields.network,
    normMerchant,
    fields.amountLuna,
    fields.transactionHash.toLowerCase(),
    fields.blockHeight.toString(),
    normPayer,
    fields.provenanceMode,
    fields.orderReference,
    fields.intentDigest.toLowerCase(),
    fields.createdAt
  ].join('|');
}

export function computeReceiptDigest(canonicalString: string): string {
  return sha256Sync(canonicalString);
}

export function sealReceipt(params: {
  receiptId: string;
  intentId: string;
  network: 'mainnet' | 'testnet';
  merchant: string;
  amountLuna: string;
  transactionHash: string;
  blockHeight: number;
  timestamp: number;
  confirmations: number;
  verifiedAtBlock: number;
  provenanceMode: 'DIRECT' | 'MEDIATED_HTLC' | 'UNKNOWN';
  payer: string;
  payerEvidence: Array<{ source: any; value: string; blockHeight?: number }>;
  orderReference: string;
  intentDigest: string;
  createdAt?: string;
}): Receipt {
  const createdAt = params.createdAt || new Date().toISOString();

  const canonical = canonicalizeReceiptFields({
    schema: 'provenim.receipt.v1',
    receiptId: params.receiptId,
    intentId: params.intentId,
    network: params.network,
    merchant: params.merchant,
    amountLuna: params.amountLuna,
    transactionHash: params.transactionHash,
    blockHeight: params.blockHeight,
    payer: params.payer,
    provenanceMode: params.provenanceMode,
    orderReference: params.orderReference,
    intentDigest: params.intentDigest,
    createdAt
  });

  const receiptDigest = computeReceiptDigest(canonical);

  return {
    schema: 'provenim.receipt.v1',
    receiptId: params.receiptId,
    intentId: params.intentId,
    network: params.network,
    merchant: normalizeNimiqAddress(params.merchant),
    amountLuna: params.amountLuna,
    transactionHash: params.transactionHash.toLowerCase(),
    blockHeight: params.blockHeight,
    timestamp: params.timestamp,
    finality: {
      status: params.confirmations >= 1 ? 'CONFIRMED' : 'FINAL',
      confirmations: params.confirmations,
      verifiedAtBlock: params.verifiedAtBlock
    },
    provenance: {
      mode: params.provenanceMode,
      payer: normalizeNimiqAddress(params.payer),
      evidence: params.payerEvidence
    },
    orderReference: params.orderReference,
    intentDigest: params.intentDigest.toLowerCase(),
    receiptDigest,
    verifierVersion: VERIFIER_VERSION,
    createdAt
  };
}

export function verifyReceiptDigest(receipt: Receipt): {
  valid: boolean;
  expectedDigest: string;
  actualDigest: string;
} {
  const canonical = canonicalizeReceiptFields({
    schema: receipt.schema,
    receiptId: receipt.receiptId,
    intentId: receipt.intentId,
    network: receipt.network,
    merchant: receipt.merchant,
    amountLuna: receipt.amountLuna,
    transactionHash: receipt.transactionHash,
    blockHeight: receipt.blockHeight,
    payer: receipt.provenance.payer,
    provenanceMode: receipt.provenance.mode,
    orderReference: receipt.orderReference,
    intentDigest: receipt.intentDigest,
    createdAt: receipt.createdAt
  });

  const expectedDigest = computeReceiptDigest(canonical);
  const actualDigest = receipt.receiptDigest.toLowerCase();

  return {
    valid: expectedDigest.toLowerCase() === actualDigest,
    expectedDigest,
    actualDigest
  };
}
