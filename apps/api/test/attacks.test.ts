import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { initDatabase, db } from '../src/db.js';
import { PaymentService } from '../src/service.js';
import { verifyReceiptIndependently } from '@provenim/verifier';
import { evaluatePaymentInvariants, createPaymentIntent } from '@provenim/domain';

describe('Attack Campaign (ATTACKS.md - A-01 to A-10)', () => {
  const service = new PaymentService();
  const sampleTxHash = '55aa49633c4a362699ef06c741e62c41581f34db761886ba0303dd29c6704379';
  const merchantAddr = 'NQ26 0000 0000 02A5 YAK7 4QNF 9MH0 TE2B GVRU';

  beforeAll(() => {
    initDatabase();
  });

  beforeEach(() => {
    db.exec('DELETE FROM settlements; DELETE FROM receipts; DELETE FROM payment_observations; DELETE FROM payment_intents; DELETE FROM verification_attempts;');
  });

  it('A-01: Fake Client Success - client claim without chain evidence is ignored', () => {
    const { intent } = service.createIntent({
      amountLuna: '1801422',
      merchantAddress: merchantAddr,
      orderReference: 'ORDER-ATTACK-01',
      network: 'mainnet'
    });

    // An adversarial frontend attempts to claim paid without blockchain transaction
    const fetched = service.getIntent(intent.intentId);
    expect(fetched?.intent.status).toBe('OPEN');
    expect(fetched?.receipt).toBeNull();
    expect(fetched?.settlement).toBeNull();
  });

  it('A-02: Wrong Amount - real tx with mismatched Luna fails Invariant P3', async () => {
    const { intent } = service.createIntent({
      amountLuna: '1000000', // 10 NIM requested, but tx only transfers 18.01422 NIM
      merchantAddress: merchantAddr,
      orderReference: 'ORDER-ATTACK-02',
      network: 'mainnet'
    });

    const result = await service.observeAndVerify(intent.intentId, sampleTxHash);
    expect(result.verdict).toBe('REJECTED');
    expect(result.invariants.P3.status).toBe('FAIL');
    expect(result.receipt).toBeUndefined();
  });

  it('A-03: Wrong Recipient - tx paying another merchant fails Invariant P2', async () => {
    const wrongMerchant = 'NQ99 9999 9999 9999 9999 9999 9999 9999 9999';
    const { intent } = service.createIntent({
      amountLuna: '1801422',
      merchantAddress: wrongMerchant,
      orderReference: 'ORDER-ATTACK-03',
      network: 'mainnet'
    });

    const result = await service.observeAndVerify(intent.intentId, sampleTxHash);
    expect(result.verdict).toBe('REJECTED');
    expect(result.invariants.P2.status).toBe('FAIL');
    expect(result.receipt).toBeUndefined();
  });

  it('A-04: Receipt Tampering - altered JSON fails canonical SHA-256 digest', async () => {
    const { intent } = service.createIntent({
      amountLuna: '1801422',
      merchantAddress: merchantAddr,
      orderReference: 'ORDER-ATTACK-04',
      network: 'mainnet'
    });

    const result = await service.observeAndVerify(intent.intentId, sampleTxHash);
    expect(result.receipt).toBeDefined();

    // Verify pristine receipt passes standalone verifier
    const pristineCheck = await verifyReceiptIndependently({ receipt: result.receipt! });
    expect(pristineCheck.verdict).toBe('VERIFIED');
    expect(pristineCheck.receiptDigestMatch).toBe(true);

    // Tamper with receipt (e.g. modify amountLuna)
    const tamperedReceipt = {
      ...result.receipt!,
      amountLuna: '999999999'
    };

    const tamperedCheck = await verifyReceiptIndependently({ receipt: tamperedReceipt });
    expect(tamperedCheck.verdict).toBe('REJECTED');
    expect(tamperedCheck.receiptDigestMatch).toBe(false);
    expect(tamperedCheck.failureReason).toContain('digest mismatch');
  });

  it('A-05: Replay Attack - reusing tx hash for second intent is rejected', async () => {
    const { intent: intent1 } = service.createIntent({
      amountLuna: '1801422',
      merchantAddress: merchantAddr,
      orderReference: 'ORDER-ORIGINAL',
      network: 'mainnet'
    });
    const res1 = await service.observeAndVerify(intent1.intentId, sampleTxHash);
    expect(res1.verdict).toBe('VERIFIED');

    const { intent: intent2 } = service.createIntent({
      amountLuna: '1801422',
      merchantAddress: merchantAddr,
      orderReference: 'ORDER-REPLAY',
      network: 'mainnet'
    });
    const res2 = await service.observeAndVerify(intent2.intentId, sampleTxHash);
    expect(res2.verdict).toBe('REJECTED');
    expect(res2.invariants.P9.status).toBe('FAIL');
  });

  it('A-06: Expired Intent - settlement after expiration window is rejected', () => {
    const expiredIntent = createPaymentIntent({
      intentId: 'int_expired_test',
      merchantAddress: merchantAddr,
      amountLuna: '1801422',
      network: 'mainnet',
      orderReference: 'ORDER-EXPIRED',
      expiresAt: 1000 // In the far past
    });

    const mockTx = {
      hash: sampleTxHash,
      from: 'NQ81 C01N BASE 0000 0000 0000 0000 0000 0000',
      fromType: 0,
      to: merchantAddr,
      toType: 0,
      value: 1801422,
      executionResult: true,
      networkId: 24,
      blockNumber: 61861200,
      timestamp: 2000 // block timestamp > expiresAt
    };

    const res = evaluatePaymentInvariants({
      intent: expiredIntent,
      transaction: mockTx,
      confirmations: 10
    });

    expect(res.allPassed).toBe(false);
    expect(res.verdict).toBe('REJECTED');
    expect(res.failedInvariants).toContain('P1');
  });

  it('A-07: Non-Final Transaction - unconfirmed tx held in PENDING state', () => {
    const intent = createPaymentIntent({
      intentId: 'int_pending_test',
      merchantAddress: merchantAddr,
      amountLuna: '1801422',
      network: 'mainnet',
      orderReference: 'ORDER-PENDING'
    });

    const mockTx = {
      hash: sampleTxHash,
      from: 'NQ81 C01N BASE 0000 0000 0000 0000 0000 0000',
      fromType: 0,
      to: merchantAddr,
      toType: 0,
      value: 1801422,
      executionResult: true,
      networkId: 24,
      blockNumber: 61861200
    };

    const res = evaluatePaymentInvariants({
      intent,
      transaction: mockTx,
      confirmations: 0,
      finalityThreshold: 1
    });

    expect(res.allPassed).toBe(false);
    expect(res.verdict).toBe('PENDING');
    expect(res.invariants.P7.status).toBe('PENDING');
  });

  it('A-08: Browser Death Recovery - reconciler recovers confirmed tx', async () => {
    const { intent } = service.createIntent({
      amountLuna: '1801422',
      merchantAddress: merchantAddr,
      orderReference: 'ORDER-CRASH-RECOVERY',
      network: 'mainnet'
    });

    // Reconciler background processing recovers the payment
    const recoveredResult = await service.observeAndVerify(intent.intentId, sampleTxHash);
    expect(recoveredResult.verdict).toBe('VERIFIED');
    expect(recoveredResult.receipt).toBeDefined();

    const current = service.getIntent(intent.intentId);
    expect(current?.intent.status).toBe('SEALED');
  });

  it('A-09: RPC Failure Resiliency - graceful error handling without state corruption', async () => {
    const { intent } = service.createIntent({
      amountLuna: '1801422',
      merchantAddress: merchantAddr,
      orderReference: 'ORDER-RPC-ERROR',
      network: 'mainnet'
    });

    // Query non-existent hash (triggers not found / error handling)
    const result = await service.observeAndVerify(intent.intentId, '0000000000000000000000000000000000000000000000000000000000000000');
    expect(result.verdict).toBe('REJECTED');
    expect(result.failureReason).toContain('Could not retrieve');
    
    // DB state remains intact and still OPEN for future retry
    const current = service.getIntent(intent.intentId);
    expect(current?.intent.status).toBe('OPEN');
  });

  it('A-10: Incomplete Provenance - failed execution fails closed (P5 & P13)', () => {
    const intent = createPaymentIntent({
      intentId: 'int_provenance_fail',
      merchantAddress: merchantAddr,
      amountLuna: '1801422',
      network: 'mainnet',
      orderReference: 'ORDER-FAIL-PROV'
    });

    const failedExecutionTx = {
      hash: sampleTxHash,
      from: 'NQ81 C01N BASE 0000 0000 0000 0000 0000 0000',
      fromType: 0,
      to: merchantAddr,
      toType: 0,
      value: 1801422,
      executionResult: false, // Failed execution
      networkId: 24,
      blockNumber: 61861200
    };

    const res = evaluatePaymentInvariants({
      intent,
      transaction: failedExecutionTx,
      confirmations: 10
    });

    expect(res.allPassed).toBe(false);
    expect(res.verdict).toBe('REJECTED');
    expect(res.failedInvariants).toContain('P5');
    expect(res.failedInvariants).toContain('P6');
  });
});
