import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { initDatabase, db } from '../src/db.js';
import { PaymentService } from '../src/service.js';

describe('Payment API Service & Settlement Engine', () => {
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

  it('creates payment intent with memo and Nimiq Pay URI', () => {
    const res = service.createIntent({
      amountLuna: '1801422',
      merchantAddress: merchantAddr,
      orderReference: 'ORDER-API-1',
      network: 'testnet'
    });

    expect(res.intent.intentId).toMatch(/^int_/);
    expect(res.intent.status).toBe('OPEN');
    expect(res.memo).toContain('PRV2:');
    expect(res.nimiqPayUri).toContain('nimiq:');
    expect(res.amountNim).toBe('18.01422');

    const fetched = service.getIntent(res.intent.intentId);
    expect(fetched).not.toBeNull();
    expect(fetched?.intent.intentId).toBe(res.intent.intentId);
  });

  it('observes and verifies transaction, sealing receipt', async () => {
    const { intent, memo } = service.createIntent({
      amountLuna: '1801422',
      merchantAddress: merchantAddr,
      orderReference: 'ORDER-LIVE-SEAL',
      network: 'testnet'
    });

    const mockTx = makeTx(intent.intentId, memo);
    const result = await service.observeAndVerify(intent.intentId, sampleTxHash, false, mockTx);

    expect(result.verdict).toBe('VERIFIED');
    expect(result.receipt).toBeDefined();
    expect(result.receipt?.schema).toBe('provenim.receipt');
    expect(result.receipt?.amountLuna).toBe('1801422');
    expect(result.receipt?.transactionHash).toBe(sampleTxHash);
    expect(result.receipt?.provenance.mode).toBe('DIRECT');

    const updated = service.getIntent(intent.intentId);
    expect(updated?.intent.status).toBe('SEALED');
    expect(updated?.receipt).not.toBeNull();
    expect(updated?.settlement).not.toBeNull();
  });

  it('rejects replay of the same transaction hash on another intent (Attack 5)', async () => {
    const { intent: firstIntent, memo: firstMemo } = service.createIntent({
      amountLuna: '1801422',
      merchantAddress: merchantAddr,
      orderReference: 'ORDER-FIRST',
      network: 'testnet'
    });
    const tx1 = makeTx(firstIntent.intentId, firstMemo);
    await service.observeAndVerify(firstIntent.intentId, sampleTxHash, false, tx1);

    // Attempt to settle a second intent with the identical transaction hash
    const { intent: secondIntent, memo: secondMemo } = service.createIntent({
      amountLuna: '1801422',
      merchantAddress: merchantAddr,
      orderReference: 'ORDER-REPLAY-ATTACK',
      network: 'testnet'
    });
    const tx2 = makeTx(secondIntent.intentId, secondMemo);

    const replayResult = await service.observeAndVerify(secondIntent.intentId, sampleTxHash, false, tx2);

    expect(replayResult.verdict).toBe('REJECTED');
    expect(replayResult.failureReason).toContain('uniqueness');
    expect(replayResult.invariants.P10.status).toBe('FAIL');

    const intentStatus = service.getIntent(secondIntent.intentId);
    expect(intentStatus?.intent.status).toBe('REJECTED');
  });

  it('rejects wrong amount for intent (Attack 2)', async () => {
    const { intent, memo } = service.createIntent({
      amountLuna: '999999999', // Claiming wrong Luna
      merchantAddress: merchantAddr,
      orderReference: 'ORDER-WRONG-AMOUNT',
      network: 'testnet'
    });

    const wrongAmountTx = makeTx(intent.intentId, memo, { value: 1801422 });
    const result = await service.observeAndVerify(intent.intentId, sampleTxHash, false, wrongAmountTx);

    expect(result.verdict).toBe('REJECTED');
    expect(result.invariants.P4.status).toBe('FAIL');
    expect(result.failureReason).toContain('P4');
  });

  it('returns merchant settlement history', async () => {
    const { intent, memo } = service.createIntent({
      amountLuna: '1801422',
      merchantAddress: merchantAddr,
      orderReference: 'ORDER-HIST-1',
      network: 'testnet'
    });
    const tx = makeTx(intent.intentId, memo);
    await service.observeAndVerify(intent.intentId, sampleTxHash, false, tx);

    const history = service.getHistory(10);
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);
    const settledItem = history.find((h: any) => h.status === 'SEALED');
    expect(settledItem).toBeDefined();
    expect(settledItem.receipt_id).toBeDefined();
  });
});
