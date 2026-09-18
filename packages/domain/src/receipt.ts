import { type Receipt, normalizeNimiqAddress } from '@provenim/shared';
import { sha256Sync } from './sha256.js';

export const VERIFIER_VERSION = '2.0.0';

export interface CanonicalReceiptFields {
  schema: string;
  receiptId: string;
  intentId: string;
  intentDigest: string;
  network: string;
  merchant: string;
  amountLuna: string;
  paymentMemo: string;
  transactionHash: string;
  blockHeight: number;
  timestamp: number;
  settlementStatus: string;
  finalityStatus: string;
  confirmations: number;
  verifiedAtBlock: number;
  provenanceMode: string;
  payer: string;
  payerEvidence: string;
  orderReference: string;
  verifierVersion: string;
  createdAt: string;
}

export interface CanonicalReceiptLegacyFields {
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
 * Deterministic canonical serialization of provenim.receipt fields for SHA-256 sealing.
 * Binds every security-relevant parameter into the canonical digest.
 */
export function canonicalizeReceiptFields(fields: CanonicalReceiptFields): string {
  const normMerchant = normalizeNimiqAddress(fields.merchant);
  const normPayer = normalizeNimiqAddress(fields.payer);

  return [
    'PROVENIM_RECEIPT',
    fields.schema,
    fields.receiptId,
    fields.intentId,
    fields.intentDigest.toLowerCase(),
    fields.network,
    normMerchant,
    fields.amountLuna,
    fields.paymentMemo,
    fields.transactionHash.toLowerCase(),
    fields.blockHeight.toString(),
    fields.timestamp.toString(),
    fields.settlementStatus,
    fields.finalityStatus,
    fields.confirmations.toString(),
    fields.verifiedAtBlock.toString(),
    fields.provenanceMode,
    normPayer,
    fields.payerEvidence,
    fields.orderReference,
    fields.verifierVersion,
    fields.createdAt
  ].join('|');
}

// Backward alias
export const canonicalizeReceiptV2Fields = canonicalizeReceiptFields;

export function canonicalizeReceiptV1Fields(fields: CanonicalReceiptLegacyFields): string {
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

export function deriveFinalityStatus(confirmations: number, threshold = 1): 'OBSERVED' | 'INCLUDED' | 'SETTLEMENT-READY' | 'FINAL' {
  if (confirmations <= 0) return 'OBSERVED';
  if (confirmations >= 10) return 'FINAL';
  if (confirmations >= threshold) return 'SETTLEMENT-READY';
  return 'INCLUDED';
}

export function sealReceipt(params: {
  receiptId: string;
  intentId: string;
  network: 'mainnet' | 'testnet';
  merchant: string;
  amountLuna: string;
  paymentMemo?: string;
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
  schemaVersion?: 'provenim.receipt' | 'provenim.receipt.v1';
}): Receipt {
  const createdAt = params.createdAt || new Date().toISOString();
  const schema: any = params.schemaVersion || 'provenim.receipt';
  const paymentMemo = params.paymentMemo || '';
  const finalityStatus = deriveFinalityStatus(params.confirmations);
  const settlementStatus: 'VERIFIED' | 'FINAL' = params.confirmations >= 10 ? 'FINAL' : 'VERIFIED';

  const serializedEvidence = JSON.stringify(
    (params.payerEvidence || []).map(e => ({
      source: e.source,
      value: e.value,
      blockHeight: e.blockHeight || 0
    }))
  );

  let receiptDigest: string;
  if (schema === 'provenim.receipt.v1') {
    const canonicalV1 = canonicalizeReceiptV1Fields({
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
    receiptDigest = computeReceiptDigest(canonicalV1);
  } else {
    const canonical = canonicalizeReceiptFields({
      schema,
      receiptId: params.receiptId,
      intentId: params.intentId,
      intentDigest: params.intentDigest,
      network: params.network,
      merchant: params.merchant,
      amountLuna: params.amountLuna,
      paymentMemo,
      transactionHash: params.transactionHash,
      blockHeight: params.blockHeight,
      timestamp: params.timestamp,
      settlementStatus,
      finalityStatus,
      confirmations: params.confirmations,
      verifiedAtBlock: params.verifiedAtBlock,
      provenanceMode: params.provenanceMode,
      payer: params.payer,
      payerEvidence: serializedEvidence,
      orderReference: params.orderReference,
      verifierVersion: VERIFIER_VERSION,
      createdAt
    });
    receiptDigest = computeReceiptDigest(canonical);
  }

  return {
    schema,
    receiptId: params.receiptId,
    intentId: params.intentId,
    network: params.network,
    merchant: normalizeNimiqAddress(params.merchant),
    amountLuna: params.amountLuna,
    paymentMemo,
    transactionHash: params.transactionHash.toLowerCase(),
    blockHeight: params.blockHeight,
    timestamp: params.timestamp,
    settlementStatus,
    finality: {
      status: finalityStatus,
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
  let expectedDigest: string;

  if (receipt.schema === 'provenim.receipt.v1') {
    const canonicalV1 = canonicalizeReceiptV1Fields({
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
    expectedDigest = computeReceiptDigest(canonicalV1);
  } else {
    const serializedEvidence = JSON.stringify(
      (receipt.provenance.evidence || []).map(e => ({
        source: e.source,
        value: e.value,
        blockHeight: e.blockHeight || 0
      }))
    );

    const canonical = canonicalizeReceiptFields({
      schema: receipt.schema,
      receiptId: receipt.receiptId,
      intentId: receipt.intentId,
      intentDigest: receipt.intentDigest,
      network: receipt.network,
      merchant: receipt.merchant,
      amountLuna: receipt.amountLuna,
      paymentMemo: receipt.paymentMemo || '',
      transactionHash: receipt.transactionHash,
      blockHeight: receipt.blockHeight,
      timestamp: receipt.timestamp,
      settlementStatus: receipt.settlementStatus || 'VERIFIED',
      finalityStatus: receipt.finality.status,
      confirmations: receipt.finality.confirmations,
      verifiedAtBlock: receipt.finality.verifiedAtBlock,
      provenanceMode: receipt.provenance.mode,
      payer: receipt.provenance.payer,
      payerEvidence: serializedEvidence,
      orderReference: receipt.orderReference,
      verifierVersion: receipt.verifierVersion,
      createdAt: receipt.createdAt
    });
    expectedDigest = computeReceiptDigest(canonical);
  }

  const actualDigest = receipt.receiptDigest.toLowerCase();

  return {
    valid: expectedDigest.toLowerCase() === actualDigest,
    expectedDigest,
    actualDigest
  };
}
