import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { initDatabase, db } from '../src/db.js';
import { PaymentService } from '../src/service.js';
import { verifyReceiptIndependently } from '@provenim/verifier';
import { evaluatePaymentInvariants, createPaymentIntent, generatePaymentMemo } from '@provenim/domain';

describe('Attack Campaign (A-01 to A-12: Deterministic Invariant Enforcement)', () => {
  const service = new PaymentService();
  const sampleTxHash = '55aa49633c4a362699ef06c741e62c41581f34db761886ba0303dd29c6704379';
  const merchantAddr = 'NQ37 KE7T S7T2 JQTK QDC6 PAFB RQ7Q 9GEV LK0V';

  const makeTx = (intentId: string, memo: string, overrides = {}) => ({
    hash: sampleTxHash,
    from: 'NQ81 C01N BASE 0000 0000 0000 0000 0000 0000',
    fromType: 0,
    to: merchantAddr,
    toType: 0,
    value: 1801422,
    executionResult: true,
    networkId: 5,
    network: 'TestAlbatross',
    blockNumber: 11752000,
    confirmations: 10,
    recipientData: memo,
    ...overrides
  });

  beforeAll(() => {
    initDatabase();
  });

  beforeEach(() => {
    db.exec('DELETE FROM settlements; DELETE FROM receipts; DELETE FROM payment_observations; DELETE FROM payment_intents; DELETE FROM verification_attempts;');
  });

  // A-01: Exact Memo Mismatch / Missing Memo (P2)
  it('A-01: Exact Memo Mismatch - transaction without or with mismatched PRV2 memo fails P2', async () => {
    const { intent } = service.createIntent({
      amountLuna: '1801422',
      merchantAddress: merchantAddr,
      orderReference: 'ORDER-ATTACK-01',
      network: 'testnet'
    });

    // Transaction with wrong intent memo
    const wrongMemoTx = makeTx(intent.intentId, 'PRV2:int_attacker_fake:99999999');
    const result = await service.observeAndVerify(intent.intentId, sampleTxHash, false, wrongMemoTx);

    expect(result.verdict).toBe('REJECTED');
    expect(result.invariants.P2.status).toBe('FAIL');
    expect(result.receipt).toBeUndefined();
  });

  // A-02: Underpayment in Luna (P4)
  it('A-02: Underpayment - transaction paying less Luna fails Invariant P4', async () => {
    const { intent, memo } = service.createIntent({
      amountLuna: '1801422',
      merchantAddress: merchantAddr,
      orderReference: 'ORDER-ATTACK-02',
      network: 'testnet'
    });

    const underpaidTx = makeTx(intent.intentId, memo, { value: 1801421 }); // 1 Luna less
    const result = await service.observeAndVerify(intent.intentId, sampleTxHash, false, underpaidTx);

    expect(result.verdict).toBe('REJECTED');
    expect(result.invariants.P4.status).toBe('FAIL');
    expect(result.receipt).toBeUndefined();
  });

  // A-03: Wrong Recipient Redirection (P3)
  it('A-03: Wrong Recipient - transaction redirecting funds to attacker fails Invariant P3', async () => {
    const { intent, memo } = service.createIntent({
      amountLuna: '1801422',
      merchantAddress: merchantAddr,
      orderReference: 'ORDER-ATTACK-03',
      network: 'testnet'
    });

    const wrongRecipientTx = makeTx(intent.intentId, memo, {
      to: 'NQ99 9999 9999 9999 9999 9999 9999 9999 9999'
    });
    const result = await service.observeAndVerify(intent.intentId, sampleTxHash, false, wrongRecipientTx);

    expect(result.verdict).toBe('REJECTED');
    expect(result.invariants.P3.status).toBe('FAIL');
    expect(result.receipt).toBeUndefined();
  });

  // A-04: Wrong Network (P5)
  it('A-04: Wrong Network - mainnet transaction presented to testnet intent fails Invariant P5', async () => {
    const { intent, memo } = service.createIntent({
      amountLuna: '1801422',
      merchantAddress: merchantAddr,
      orderReference: 'ORDER-ATTACK-04',
      network: 'testnet'
    });

    const mainnetTx = makeTx(intent.intentId, memo, {
      networkId: 24, // Mainnet ID
      network: 'MainAlbatross'
    });
    const result = await service.observeAndVerify(intent.intentId, sampleTxHash, false, mainnetTx);

    expect(result.verdict).toBe('REJECTED');
    expect(result.invariants.P5.status).toBe('FAIL');
  });

  // A-05: Receipt Tampering (P12)
  it('A-05: Receipt Tampering - altered JSON fails canonical SHA-256 digest', async () => {
    const { intent, memo } = service.createIntent({
      amountLuna: '1801422',
      merchantAddress: merchantAddr,
      orderReference: 'ORDER-ATTACK-05',
      network: 'testnet'
    });

    const pristineTx = makeTx(intent.intentId, memo);
    const result = await service.observeAndVerify(intent.intentId, sampleTxHash, false, pristineTx);
    expect(result.receipt).toBeDefined();

    // Verify pristine receipt passes standalone verifier
    const pristineCheck = await verifyReceiptIndependently({
      receipt: result.receipt!,
      rawTransaction: pristineTx
    });
    expect(pristineCheck.verdict).toBe('VERIFIED');
    expect(pristineCheck.receiptDigestMatch).toBe(true);

    // Tamper with receipt (e.g. modify amountLuna)
    const tamperedReceipt = {
      ...result.receipt!,
      amountLuna: '999999999'
    };

    const tamperedCheck = await verifyReceiptIndependently({
      receipt: tamperedReceipt,
      rawTransaction: pristineTx
    });
    expect(tamperedCheck.verdict).toBe('REJECTED');
    expect(tamperedCheck.receiptDigestMatch).toBe(false);
    expect(tamperedCheck.failureReason).toContain('digest mismatch');
  });

  // A-06: Replayed Transaction Hash (P10)
  it('A-06: Replay Attack - reusing tx hash for a second intent is rejected', async () => {
    const { intent: intent1, memo: memo1 } = service.createIntent({
      amountLuna: '1801422',
      merchantAddress: merchantAddr,
      orderReference: 'ORDER-ORIGINAL',
      network: 'testnet'
    });
    const tx1 = makeTx(intent1.intentId, memo1);
    const res1 = await service.observeAndVerify(intent1.intentId, sampleTxHash, false, tx1);
    expect(res1.verdict).toBe('VERIFIED');

    const { intent: intent2, memo: memo2 } = service.createIntent({
      amountLuna: '1801422',
      merchantAddress: merchantAddr,
      orderReference: 'ORDER-REPLAY',
      network: 'testnet'
    });
    const tx2 = makeTx(intent2.intentId, memo2);
    const res2 = await service.observeAndVerify(intent2.intentId, sampleTxHash, false, tx2);
    expect(res2.verdict).toBe('REJECTED');
    expect(res2.invariants.P10.status).toBe('FAIL');
  });

  // A-07: Duplicate Intent Settlement (P11)
  it('A-07: Duplicate Intent Settlement - settling already sealed intent is idempotent or rejected', async () => {
    const { intent, memo } = service.createIntent({
      amountLuna: '1801422',
      merchantAddress: merchantAddr,
      orderReference: 'ORDER-DUP-SETTLE',
      network: 'testnet'
    });
    const tx = makeTx(intent.intentId, memo);
    const res1 = await service.observeAndVerify(intent.intentId, sampleTxHash, false, tx);
    expect(res1.verdict).toBe('VERIFIED');

    // Attempt second observation of already sealed intent
    const res2 = await service.observeAndVerify(intent.intentId, sampleTxHash, false, tx);
    expect(res2.verdict).toBe('VERIFIED');
    expect(res2.receipt?.receiptId).toBe(res1.receipt?.receiptId);
  });

  // A-08: Expired Intent Window (P1)
  it('A-08: Expired Intent - settlement after expiration window fails Invariant P1', () => {
    const expiredIntent = createPaymentIntent({
      intentId: 'int_expired_test',
      merchantAddress: merchantAddr,
      amountLuna: '1801422',
      network: 'testnet',
      orderReference: 'ORDER-EXPIRED',
      expiresAt: 1000 // In the past
    });

    const mockTx = {
      hash: sampleTxHash,
      from: 'NQ81 C01N BASE 0000 0000 0000 0000 0000 0000',
      fromType: 0,
      to: merchantAddr,
      toType: 0,
      value: 1801422,
      executionResult: true,
      networkId: 5,
      blockNumber: 11752000,
      timestamp: 2000, // block timestamp > expiresAt
      recipientData: expiredIntent.paymentMemo
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

  // A-09: Ambiguous Provenance / Failed Execution (P6 & P14)
  it('A-09: Failed Execution - failed blockchain execution fails closed', () => {
    const intent = createPaymentIntent({
      intentId: 'int_provenance_fail',
      merchantAddress: merchantAddr,
      amountLuna: '1801422',
      network: 'testnet',
      orderReference: 'ORDER-FAIL-PROV'
    });

    const failedTx = {
      hash: sampleTxHash,
      from: 'NQ81 C01N BASE 0000 0000 0000 0000 0000 0000',
      fromType: 0,
      to: merchantAddr,
      toType: 0,
      value: 1801422,
      executionResult: false, // Execution reverted/failed
      networkId: 5,
      blockNumber: 11752000,
      recipientData: intent.paymentMemo
    };

    const res = evaluatePaymentInvariants({
      intent,
      transaction: failedTx,
      confirmations: 10
    });

    expect(res.allPassed).toBe(false);
    expect(res.verdict).toBe('REJECTED');
    expect(res.failedInvariants).toContain('P6');
    expect(res.failedInvariants).toContain('P14');
  });

  // A-10: RPC Unavailability Fail-Closed
  it('A-10: RPC Failure Resiliency - missing or errored query fails closed without corrupting DB', async () => {
    const { intent } = service.createIntent({
      amountLuna: '1801422',
      merchantAddress: merchantAddr,
      orderReference: 'ORDER-RPC-ERROR',
      network: 'testnet'
    });

    // Query non-existent hash from RPC (triggers fail closed)
    const result = await service.observeAndVerify(intent.intentId, '0000000000000000000000000000000000000000000000000000000000000000');
    expect(result.verdict).toBe('REJECTED');
    expect(result.failureReason).toContain('Could not retrieve transaction');

    const current = service.getIntent(intent.intentId);
    expect(current?.intent.status).toBe('OPEN');
  });

  // A-11: Browser Death / Interrupted Session Recovery
  it('A-11: Interrupted Session Recovery - payment observed post-reconnect settles seamlessly', async () => {
    const { intent, memo } = service.createIntent({
      amountLuna: '1801422',
      merchantAddress: merchantAddr,
      orderReference: 'ORDER-RECONNECT',
      network: 'testnet'
    });

    // Client drops connection, reconnects and submits txHash
    const tx = makeTx(intent.intentId, memo);
    const recovered = await service.observeAndVerify(intent.intentId, sampleTxHash, false, tx);
    expect(recovered.verdict).toBe('VERIFIED');
    expect(recovered.receipt).toBeDefined();

    const stored = service.getIntent(intent.intentId);
    expect(stored?.intent.status).toBe('SEALED');
  });

  // A-12: Non-Final Transaction (P8)
  it('A-12: Non-Final Transaction - unconfirmed tx held in PENDING state (P8)', () => {
    const intent = createPaymentIntent({
      intentId: 'int_pending_test',
      merchantAddress: merchantAddr,
      amountLuna: '1801422',
      network: 'testnet',
      orderReference: 'ORDER-PENDING'
    });
    const memo = generatePaymentMemo(intent.intentId, intent.intentDigest);

    const mockTx = {
      hash: sampleTxHash,
      from: 'NQ81 C01N BASE 0000 0000 0000 0000 0000 0000',
      fromType: 0,
      to: merchantAddr,
      toType: 0,
      value: 1801422,
      executionResult: true,
      networkId: 5,
      blockNumber: 11752000,
      recipientData: memo
    };

    const res = evaluatePaymentInvariants({
      intent,
      transaction: mockTx,
      confirmations: 0, // 0 confirmations
      finalityThreshold: 1
    });

    expect(res.allPassed).toBe(false);
    expect(res.verdict).toBe('PENDING');
    expect(res.invariants.P8.status).toBe('PENDING');
  });
});
