import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { initDatabase, db } from '../src/db.js';
import { PaymentService } from '../src/service.js';

describe('Payment API Service & Settlement Engine', () => {
  const service = new PaymentService();
  const sampleTxHash = '55aa49633c4a362699ef06c741e62c41581f34db761886ba0303dd29c6704379';
  const merchantAddr = 'NQ26 0000 0000 02A5 YAK7 4QNF 9MH0 TE2B GVRU';

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
      network: 'mainnet'
    });

    expect(res.intent.intentId).toMatch(/^int_/);
    expect(res.intent.status).toBe('OPEN');
    expect(res.memo).toContain('PRV1:');
    expect(res.nimiqPayUri).toContain('nimiq:');
    expect(res.amountNim).toBe('18.01422');

    const fetched = service.getIntent(res.intent.intentId);
    expect(fetched).not.toBeNull();
    expect(fetched?.intent.intentId).toBe(res.intent.intentId);
  });

  it('observes and verifies live transaction, sealing receipt', async () => {
    const { intent } = service.createIntent({
      amountLuna: '1801422', // exact Luna of sample tx
      merchantAddress: merchantAddr,
      orderReference: 'ORDER-LIVE-SEAL',
      network: 'mainnet'
    });

    const result = await service.observeAndVerify(intent.intentId, sampleTxHash);

    expect(result.verdict).toBe('VERIFIED');
    expect(result.receipt).toBeDefined();
    expect(result.receipt?.schema).toBe('provenim.receipt.v1');
    expect(result.receipt?.amountLuna).toBe('1801422');
    expect(result.receipt?.transactionHash).toBe(sampleTxHash);
    expect(result.receipt?.provenance.mode).toBe('DIRECT');

    const updated = service.getIntent(intent.intentId);
    expect(updated?.intent.status).toBe('SEALED');
    expect(updated?.receipt).not.toBeNull();
    expect(updated?.settlement).not.toBeNull();
  });

  it('rejects replay of the same transaction hash on another intent (Attack 5)', async () => {
    const { intent: firstIntent } = service.createIntent({
      amountLuna: '1801422',
      merchantAddress: merchantAddr,
      orderReference: 'ORDER-FIRST',
      network: 'mainnet'
    });
    await service.observeAndVerify(firstIntent.intentId, sampleTxHash);

    // Attempt to settle a second intent with the identical transaction hash
    const { intent: secondIntent } = service.createIntent({
      amountLuna: '1801422',
      merchantAddress: merchantAddr,
      orderReference: 'ORDER-REPLAY-ATTACK',
      network: 'mainnet'
    });

    const replayResult = await service.observeAndVerify(secondIntent.intentId, sampleTxHash);

    expect(replayResult.verdict).toBe('REJECTED');
    expect(replayResult.failureReason).toContain('uniqueness');
    expect(replayResult.invariants.P9.status).toBe('FAIL');

    const intentStatus = service.getIntent(secondIntent.intentId);
    expect(intentStatus?.intent.status).toBe('REJECTED');
  });

  it('rejects wrong amount for intent (Attack 2)', async () => {
    const secondRealTxHash = '6ed8a252afb15dc7987ebd0ea699ce09ce813f1acced7116e0ac25d8ecd43de7';
    const { intent: wrongAmountIntent } = service.createIntent({
      amountLuna: '999999999', // Claiming wrong Luna
      merchantAddress: merchantAddr,
      orderReference: 'ORDER-WRONG-AMOUNT',
      network: 'mainnet'
    });

    const result = await service.observeAndVerify(wrongAmountIntent.intentId, secondRealTxHash);

    expect(result.verdict).toBe('REJECTED');
    expect(result.invariants.P3.status).toBe('FAIL');
    expect(result.failureReason).toContain('P3');
  });

  it('returns merchant settlement history', async () => {
    const { intent } = service.createIntent({
      amountLuna: '1801422',
      merchantAddress: merchantAddr,
      orderReference: 'ORDER-HIST-1',
      network: 'mainnet'
    });
    await service.observeAndVerify(intent.intentId, sampleTxHash);

    const history = service.getHistory(10);
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);
    const settledItem = history.find((h: any) => h.status === 'SEALED');
    expect(settledItem).toBeDefined();
    expect(settledItem.receipt_id).toBeDefined();
  });
});
