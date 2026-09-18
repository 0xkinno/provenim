import { describe, it, expect } from 'vitest';
import {
  nimStringToLuna,
  lunaToNimString,
  formatLunaDisplay,
  createPaymentIntent,
  verifyIntentDigest,
  generatePaymentMemo,
  parsePaymentMemo,
  classifyPaymentProvenance,
  sealReceipt,
  verifyReceiptDigest,
  evaluatePaymentInvariants,
  type RawTransactionInput
} from '../src/index.js';

describe('Integer Luna Arithmetic', () => {
  it('converts whole NIM to Luna accurately', () => {
    expect(nimStringToLuna('1')).toBe(100_000n);
    expect(nimStringToLuna('100')).toBe(10_000_000n);
    expect(nimStringToLuna('0')).toBe(0n);
  });

  it('converts fractional NIM up to 5 decimals', () => {
    expect(nimStringToLuna('0.5')).toBe(50_000n);
    expect(nimStringToLuna('18.01422')).toBe(1_801_422n);
    expect(nimStringToLuna('0.00001')).toBe(1n);
  });

  it('formats Luna back to clean NIM strings', () => {
    expect(lunaToNimString(100_000n)).toBe('1');
    expect(lunaToNimString(1_801_422n)).toBe('18.01422');
    expect(lunaToNimString(1n)).toBe('0.00001');
    expect(formatLunaDisplay(1_801_422n)).toBe('18.01422 NIM');
  });

  it('throws on invalid decimal inputs', () => {
    expect(() => nimStringToLuna('1.123456')).toThrow();
    expect(() => nimStringToLuna('abc')).toThrow();
  });
});

describe('Payment Intent Canonicalization & Digests', () => {
  it('creates deterministic intent and verifies digest', () => {
    const intent = createPaymentIntent({
      intentId: 'int_test_123',
      merchantAddress: 'NQ26 0000 0000 02A5 YAK7 4QNF 9MH0 TE2B GVRU',
      amountLuna: '1801422',
      network: 'mainnet',
      orderReference: 'ORDER-99',
      nonce: 'fixednonce123456'
    });

    expect(intent.intentId).toBe('int_test_123');
    expect(intent.intentDigest).toHaveLength(64);
    expect(verifyIntentDigest(intent)).toBe(true);

    // Tamper with amount
    const tampered = { ...intent, amountLuna: '1801423' };
    expect(verifyIntentDigest(tampered)).toBe(false);
  });
});

describe('Transaction Memo', () => {
  it('encodes and decodes PRV1 memo format', () => {
    const memo = generatePaymentMemo('int_abc', '1234567890abcdef');
    expect(memo).toBe('PRV1:int_abc:12345678');

    const parsed = parsePaymentMemo(memo);
    expect(parsed.valid).toBe(true);
    expect(parsed.intentId).toBe('int_abc');
    expect(parsed.token).toBe('12345678');
  });

  it('decodes hex-encoded memo safely', () => {
    const hex = Buffer.from('PRV1:int_hex:abcdef01', 'utf8').toString('hex');
    const parsed = parsePaymentMemo(hex);
    expect(parsed.valid).toBe(true);
    expect(parsed.intentId).toBe('int_hex');
    expect(parsed.token).toBe('abcdef01');
  });
});

describe('Provenance Resolution', () => {
  const sampleTx: RawTransactionInput = {
    hash: '55aa49633c4a362699ef06c741e62c41581f34db761886ba0303dd29c6704379',
    from: 'NQ81 C01N BASE 0000 0000 0000 0000 0000 0000',
    fromType: 0,
    to: 'NQ26 0000 0000 02A5 YAK7 4QNF 9MH0 TE2B GVRU',
    toType: 0,
    value: 1801422,
    executionResult: true,
    networkId: 24,
    blockNumber: 61861200
  };

  it('resolves direct payment from basic account', () => {
    const res = classifyPaymentProvenance(sampleTx);
    expect(res.mode).toBe('DIRECT');
    expect(res.confidence).toBe('VERIFIED');
    expect(res.payer).toBe(sampleTx.from);
  });

  it('fails closed on failed execution', () => {
    const failedTx = { ...sampleTx, executionResult: false };
    const res = classifyPaymentProvenance(failedTx);
    expect(res.mode).toBe('UNKNOWN');
    expect(res.confidence).toBe('INSUFFICIENT');
  });
});

describe('Receipt Sealing & Digest Integrity', () => {
  it('seals a receipt and detects tampering', () => {
    const receipt = sealReceipt({
      receiptId: 'PRV-1001',
      intentId: 'int_1001',
      network: 'mainnet',
      merchant: 'NQ26 0000 0000 02A5 YAK7 4QNF 9MH0 TE2B GVRU',
      amountLuna: '1801422',
      transactionHash: '55aa49633c4a362699ef06c741e62c41581f34db761886ba0303dd29c6704379',
      blockHeight: 61861200,
      timestamp: 1789665908417,
      confirmations: 10,
      verifiedAtBlock: 61861210,
      provenanceMode: 'DIRECT',
      payer: 'NQ81 C01N BASE 0000 0000 0000 0000 0000 0000',
      payerEvidence: [],
      orderReference: 'ORDER-1001',
      intentDigest: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      createdAt: '2026-09-17T20:00:00.000Z'
    });

    const check = verifyReceiptDigest(receipt);
    expect(check.valid).toBe(true);

    // Tamper with 1 Luna
    const tampered = { ...receipt, amountLuna: '1801423' };
    const tamperedCheck = verifyReceiptDigest(tampered);
    expect(tamperedCheck.valid).toBe(false);
  });
});

describe('Invariants Engine (P1-P14)', () => {
  const intent = createPaymentIntent({
    intentId: 'int_inv_1',
    merchantAddress: 'NQ26 0000 0000 02A5 YAK7 4QNF 9MH0 TE2B GVRU',
    amountLuna: '1801422',
    network: 'mainnet',
    orderReference: 'ORDER-INV'
  });

  const validTx: RawTransactionInput = {
    hash: '55aa49633c4a362699ef06c741e62c41581f34db761886ba0303dd29c6704379',
    from: 'NQ81 C01N BASE 0000 0000 0000 0000 0000 0000',
    fromType: 0,
    to: 'NQ26 0000 0000 02A5 YAK7 4QNF 9MH0 TE2B GVRU',
    toType: 0,
    value: 1801422,
    executionResult: true,
    networkId: 24,
    blockNumber: 61861200
  };

  it('passes all invariants for valid transaction and confirmed block', () => {
    const res = evaluatePaymentInvariants({
      intent,
      transaction: validTx,
      confirmations: 10,
      finalityThreshold: 1
    });

    expect(res.allPassed).toBe(true);
    expect(res.verdict).toBe('VERIFIED');
    expect(res.failedInvariants).toHaveLength(0);
  });

  it('rejects wrong amount (Invariant P3)', () => {
    const wrongAmountTx = { ...validTx, value: 1801420 };
    const res = evaluatePaymentInvariants({
      intent,
      transaction: wrongAmountTx,
      confirmations: 10
    });

    expect(res.allPassed).toBe(false);
    expect(res.verdict).toBe('REJECTED');
    expect(res.failedInvariants).toContain('P3');
  });

  it('rejects wrong recipient (Invariant P2)', () => {
    const wrongRecipientTx = { ...validTx, to: 'NQ00 0000 0000 0000 0000 0000 0000 0000 0000' };
    const res = evaluatePaymentInvariants({
      intent,
      transaction: wrongRecipientTx,
      confirmations: 10
    });

    expect(res.allPassed).toBe(false);
    expect(res.verdict).toBe('REJECTED');
    expect(res.failedInvariants).toContain('P2');
  });

  it('marks unconfirmed transaction as PENDING (Invariant P7)', () => {
    const res = evaluatePaymentInvariants({
      intent,
      transaction: validTx,
      confirmations: 0,
      finalityThreshold: 1
    });

    expect(res.allPassed).toBe(false);
    expect(res.verdict).toBe('PENDING');
  });

  it('rejects duplicate settlement / replay (Invariant P8 & P9)', () => {
    const res = evaluatePaymentInvariants({
      intent,
      transaction: validTx,
      confirmations: 10,
      existingSettlementForIntent: true
    });

    expect(res.allPassed).toBe(false);
    expect(res.verdict).toBe('REJECTED');
    expect(res.failedInvariants).toContain('P8');
  });
});
