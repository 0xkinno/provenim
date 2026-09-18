import { describe, it, expect } from 'vitest';
import { sealReceipt } from '@provenim/domain';
import { verifyReceiptIndependently } from '../src/verifier.js';

describe('Standalone Deterministic Verifier', () => {
  const sampleTx = {
    hash: '55aa49633c4a362699ef06c741e62c41581f34db761886ba0303dd29c6704379',
    from: 'NQ81 C01N BASE 0000 0000 0000 0000 0000 0000',
    fromType: 0,
    to: 'NQ26 0000 0000 02A5 YAK7 4QNF 9MH0 TE2B GVRU',
    toType: 0,
    value: 1801422,
    executionResult: true,
    networkId: 24,
    blockNumber: 61861200,
    confirmations: 100,
    recipientData: 'PRV2:int_test_v:12345678'
  };

  const receipt = sealReceipt({
    receiptId: 'PRV-TEST-VERIFY',
    intentId: 'int_test_v',
    network: 'mainnet',
    merchant: 'NQ26 0000 0000 02A5 YAK7 4QNF 9MH0 TE2B GVRU',
    amountLuna: '1801422',
    transactionHash: sampleTx.hash,
    blockHeight: 61861200,
    timestamp: 1789665908417,
    confirmations: 100,
    verifiedAtBlock: 61861300,
    provenanceMode: 'DIRECT',
    payer: sampleTx.from,
    payerEvidence: [],
    orderReference: 'ORDER-VERIFY-1',
    intentDigest: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    createdAt: '2026-09-17T20:00:00.000Z',
    paymentMemo: 'PRV2:int_test_v:12345678'
  });

  it('independently verifies a genuine receipt against raw tx evidence', async () => {
    const verdict = await verifyReceiptIndependently({
      receipt,
      rawTransaction: sampleTx
    });

    expect(verdict.verdict).toBe('VERIFIED');
    expect(verdict.receiptDigestMatch).toBe(true);
    expect(verdict.transactionFound).toBe(true);
    expect(verdict.invariants.P2.status).toBe('PASS');
    expect(verdict.invariants.P3.status).toBe('PASS');
    expect(verdict.invariants.P4.status).toBe('PASS');
    expect(verdict.invariants.P12.status).toBe('PASS');
  });

  it('rejects a receipt with a tampered digest (Attack 4)', async () => {
    const tamperedReceipt = {
      ...receipt,
      receiptDigest: '0000000000000000000000000000000000000000000000000000000000000000'
    };

    const verdict = await verifyReceiptIndependently({
      receipt: tamperedReceipt,
      rawTransaction: sampleTx
    });

    expect(verdict.verdict).toBe('REJECTED');
    expect(verdict.receiptDigestMatch).toBe(false);
    expect(verdict.invariants.P12.status).toBe('FAIL');
    expect(verdict.failureReason).toContain('tampered');
  });

  it('rejects a receipt if amount differs from on-chain transaction value (Attack 2)', async () => {
    const alteredAmountReceipt = sealReceipt({
      receiptId: 'PRV-ALTERED-AMOUNT',
      intentId: 'int_altered',
      network: 'mainnet',
      merchant: receipt.merchant,
      amountLuna: '2000000', // Claiming 20 NIM instead of 18.01422
      transactionHash: sampleTx.hash,
      blockHeight: 61861200,
      timestamp: 1789665908417,
      confirmations: 100,
      verifiedAtBlock: 61861300,
      provenanceMode: 'DIRECT',
      payer: sampleTx.from,
      payerEvidence: [],
      orderReference: 'ORDER-VERIFY-1',
      intentDigest: receipt.intentDigest,
      createdAt: '2026-09-17T20:00:00.000Z'
    });

    const verdict = await verifyReceiptIndependently({
      receipt: alteredAmountReceipt,
      rawTransaction: sampleTx
    });

    expect(verdict.verdict).toBe('REJECTED');
    expect(verdict.receiptDigestMatch).toBe(true);
    expect(verdict.invariants.P4.status).toBe('FAIL');
    expect(verdict.failureReason).toContain('Amount mismatch');
  });
});
