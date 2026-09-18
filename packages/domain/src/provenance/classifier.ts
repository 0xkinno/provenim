import {
  type ProvenanceResult,
  type ProvenanceEvidenceItem,
  type ProvenanceMode
} from '@provenim/shared';
import { parsePaymentMemo } from '../memo.js';

export interface RawTransactionInput {
  hash: string;
  from: string;
  fromType: number; // 0=basic, 1=vesting, 2=htlc
  to: string;
  toType: number;
  value: number | string;
  fee?: number | string;
  senderData?: string;
  recipientData?: string;
  relatedAddresses?: string[];
  executionResult: boolean;
  networkId: number;
  blockNumber?: number;
  timestamp?: number;
}

/**
 * Pure provenance resolution engine.
 * Inspects transaction evidence to classify the payment route and associate payer identity.
 */
export function classifyPaymentProvenance(
  tx: RawTransactionInput,
  expectedIntentId?: string,
  expectedIntentDigest?: string
): ProvenanceResult {
  const notes: string[] = [];
  const evidence: ProvenanceEvidenceItem[] = [];

  // Fail-closed check on execution result
  if (!tx.executionResult) {
    notes.push('Transaction executionResult is false (failed execution on-chain).');
    return {
      mode: 'UNKNOWN',
      txHash: tx.hash,
      payerEvidence: [],
      confidence: 'INSUFFICIENT',
      notes
    };
  }

  // Check memo in recipientData
  const memoData = tx.recipientData || tx.senderData || '';
  const parsedMemo = parsePaymentMemo(memoData);
  
  if (parsedMemo.valid) {
    evidence.push({
      source: 'MEMO_TOKEN',
      value: `Intent:${parsedMemo.intentId};Token:${parsedMemo.token}`,
      blockHeight: tx.blockNumber
    });
    notes.push(`Found PRV1 memo bound to intent ID ${parsedMemo.intentId}.`);

    if (expectedIntentId && parsedMemo.intentId !== expectedIntentId) {
      notes.push(`Memo intent ID ${parsedMemo.intentId} does not match expected ${expectedIntentId}.`);
    }
    if (expectedIntentDigest && parsedMemo.token !== expectedIntentDigest.slice(0, 8)) {
      notes.push(`Memo token does not match expected intent digest prefix.`);
    }
  }

  // Evaluate Route Mode
  let mode: ProvenanceMode = 'UNKNOWN';
  let payer: string | undefined = undefined;

  if (tx.fromType === 0 && tx.toType === 0) {
    // Direct transfer from basic account to basic merchant account
    mode = 'DIRECT';
    payer = tx.from;
    evidence.push({
      source: 'DIRECT_FROM',
      value: tx.from,
      blockHeight: tx.blockNumber
    });
    notes.push(`Direct peer-to-peer payment from basic account ${tx.from}.`);
  } else if (tx.fromType === 2 || tx.toType === 2) {
    // Mediated via HTLC contract
    mode = 'MEDIATED_HTLC';
    notes.push('Transaction involves native HTLC contract (AccountType 2).');

    // In an HTLC redeem, 'from' is the HTLC contract address.
    // The true customer wallet is either in relatedAddresses or memo evidence.
    evidence.push({
      source: 'HTLC_CREATION',
      value: tx.from,
      blockHeight: tx.blockNumber
    });

    if (tx.relatedAddresses && tx.relatedAddresses.length > 0) {
      // Find non-contract, non-merchant address in related addresses
      const candidatePayer = tx.relatedAddresses.find(
        addr => addr !== tx.to && addr !== tx.from && !addr.includes('C01N BASE')
      );
      if (candidatePayer) {
        payer = candidatePayer;
        evidence.push({
          source: 'RELATED_ADDRESS',
          value: candidatePayer,
          blockHeight: tx.blockNumber
        });
        notes.push(`Resolved customer wallet ${candidatePayer} from relatedAddresses evidence.`);
      }
    }
  } else {
    mode = 'UNKNOWN';
    notes.push(`Unknown or unsupported account types: fromType=${tx.fromType}, toType=${tx.toType}.`);
  }

  // Strict confidence check (Fail-Closed)
  const isVerified = (mode === 'DIRECT' || mode === 'MEDIATED_HTLC') && Boolean(payer);

  return {
    mode,
    txHash: tx.hash,
    payer,
    payerEvidence: evidence,
    confidence: isVerified ? 'VERIFIED' : 'INSUFFICIENT',
    notes
  };
}
