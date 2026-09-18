import crypto from 'node:crypto';
import {
  type PaymentIntent,
  type Receipt,
  type VerificationVerdict,
  normalizeNimiqAddress
} from '@provenim/shared';
import {
  createPaymentIntent,
  generatePaymentMemo,
  evaluatePaymentInvariants,
  classifyPaymentProvenance,
  sealReceipt,
  lunaToNimString,
  type RawTransactionInput
} from '@provenim/domain';
import { db } from './db.js';
import { rpcClient } from './rpc.js';

export class PaymentService {
  createIntent(params: {
    amountLuna: string;
    merchantAddress: string;
    orderReference: string;
    network?: 'mainnet' | 'testnet';
    merchantId?: string;
    expiresInSeconds?: number;
  }) {
    const intentId = 'int_' + crypto.randomBytes(8).toString('hex');
    const network = params.network || (process.env.NIMIQ_NETWORK as any) || 'mainnet';

    const intent = createPaymentIntent({
      intentId,
      merchantAddress: params.merchantAddress,
      amountLuna: params.amountLuna,
      network,
      orderReference: params.orderReference,
      merchantId: params.merchantId,
      expiresInSeconds: params.expiresInSeconds || 1800
    });

    const stmt = db.prepare(`
      INSERT INTO payment_intents (
        intent_id, version, merchant_id, merchant_address, amount_luna,
        network, order_reference, created_at, expires_at, random_nonce,
        intent_digest, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      intent.intentId,
      intent.version,
      intent.merchantId,
      intent.merchantAddress,
      intent.amountLuna,
      intent.network,
      intent.orderReference,
      intent.createdAt,
      intent.expiresAt,
      intent.randomNonce,
      intent.intentDigest,
      intent.status
    );

    const memo = generatePaymentMemo(intent.intentId, intent.intentDigest);
    const amountNim = lunaToNimString(intent.amountLuna);
    const nimiqPayUri = `nimiq:${intent.merchantAddress.replace(/\s+/g, '')}?amount=${amountNim}&message=${encodeURIComponent(memo)}`;

    return {
      intent,
      memo,
      nimiqPayUri,
      amountNim
    };
  }

  getIntent(intentId: string) {
    const intentRow = db.prepare('SELECT * FROM payment_intents WHERE intent_id = ?').get(intentId) as any;
    if (!intentRow) return null;

    const settlementRow = db.prepare('SELECT * FROM settlements WHERE intent_id = ?').get(intentId) as any;
    const receiptRow = db.prepare('SELECT * FROM receipts WHERE intent_id = ?').get(intentId) as any;
    const observations = db.prepare('SELECT * FROM payment_observations WHERE intent_id = ? ORDER BY id DESC').all(intentId) as any[];

    let receipt: Receipt | null = null;
    if (receiptRow) {
      try {
        receipt = JSON.parse(receiptRow.canonical_json);
      } catch {
        // malformed
      }
    }

    const intent: PaymentIntent = {
      intentId: intentRow.intent_id,
      version: intentRow.version,
      merchantId: intentRow.merchant_id,
      merchantAddress: intentRow.merchant_address,
      amountLuna: intentRow.amount_luna,
      network: intentRow.network,
      orderReference: intentRow.order_reference,
      createdAt: intentRow.created_at,
      expiresAt: intentRow.expires_at,
      randomNonce: intentRow.random_nonce,
      intentDigest: intentRow.intent_digest,
      status: intentRow.status
    };

    return {
      intent,
      settlement: settlementRow || null,
      receipt,
      observations
    };
  }

  async observeAndVerify(intentId: string, txHash: string, traceId = crypto.randomUUID()): Promise<{
    verdict: 'VERIFIED' | 'REJECTED' | 'PENDING';
    receipt?: Receipt;
    invariants: any;
    failureReason?: string;
  }> {
    const cleanHash = txHash.trim().toLowerCase();
    const intentData = this.getIntent(intentId);
    if (!intentData) {
      throw new Error(`Intent ${intentId} not found`);
    }

    const { intent } = intentData;

    // Record observation if not recorded yet
    const existingObs = db.prepare(
      'SELECT id FROM payment_observations WHERE intent_id = ? AND transaction_hash = ?'
    ).get(intentId, cleanHash);

    if (!existingObs) {
      db.prepare(`
        INSERT INTO payment_observations (intent_id, transaction_hash, observed_at)
        VALUES (?, ?, ?)
      `).run(intentId, cleanHash, Math.floor(Date.now() / 1000));
    }

    // Check if already settled
    if (intentData.receipt && intentData.settlement) {
      return {
        verdict: 'VERIFIED',
        receipt: intentData.receipt,
        invariants: {},
        failureReason: undefined
      };
    }

    // Check if tx hash is already used for another intent
    const existingTxSettlement = db.prepare(
      'SELECT intent_id FROM settlements WHERE transaction_hash = ? AND intent_id != ?'
    ).get(cleanHash, intentId) as any;

    if (existingTxSettlement) {
      db.prepare('UPDATE payment_intents SET status = ? WHERE intent_id = ?').run('REJECTED', intentId);
      return {
        verdict: 'REJECTED',
        invariants: {
          P9: {
            code: 'P9',
            name: 'Transaction uniqueness',
            status: 'FAIL',
            message: `Transaction ${cleanHash} was already used to settle intent ${existingTxSettlement.intent_id}`
          }
        },
        failureReason: 'Transaction uniqueness invariant violated: hash already settled.'
      };
    }

    // Fetch transaction directly from Nimiq RPC history node
    let tx: RawTransactionInput | null = null;
    try {
      tx = await rpcClient.getTransactionByHash(cleanHash);
    } catch (err: any) {
      return {
        verdict: 'REJECTED',
        invariants: {
          RPC: { code: 'RPC', name: 'RPC transaction retrieval', status: 'FAIL', message: err.message }
        },
        failureReason: `Could not retrieve transaction from blockchain: ${err.message}`
      };
    }

    if (!tx) {
      return {
        verdict: 'PENDING',
        invariants: {
          P1: { code: 'P1', name: 'Transaction broadcast', status: 'PENDING', message: 'Transaction not found on chain yet' }
        },
        failureReason: 'Transaction not found on history node yet. Awaiting chain inclusion.'
      };
    }

    // Calculate confirmations
    let confirmations = (tx as any).confirmations || 0;
    if (tx.blockNumber) {
      try {
        const head = await rpcClient.getBlockNumber();
        confirmations = Math.max(confirmations, head - tx.blockNumber + 1);
      } catch {
        // use tx.confirmations
      }
    }

    const evalResult = evaluatePaymentInvariants({
      intent,
      transaction: tx,
      confirmations,
      finalityThreshold: parseInt(process.env.FINALITY_CONFIRMATION_THRESHOLD || '1', 10),
      existingSettlementForIntent: false,
      existingSettlementForTx: false
    });

    // Record verification attempt in database for audit trail
    db.prepare(`
      INSERT INTO verification_attempts (
        trace_id, intent_id, tx_hash, verdict, invariants_json, failure_reason, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      traceId,
      intentId,
      cleanHash,
      evalResult.verdict,
      JSON.stringify(evalResult.invariants),
      evalResult.failureReason || null,
      Math.floor(Date.now() / 1000)
    );

    if (evalResult.verdict === 'VERIFIED') {
      const provenance = classifyPaymentProvenance(tx, intent.intentId, intent.intentDigest);
      const receiptId = 'PRV-' + crypto.randomBytes(6).toString('hex').toUpperCase();
      const nowBlock = tx.blockNumber ? tx.blockNumber + confirmations : 0;

      const receipt = sealReceipt({
        receiptId,
        intentId: intent.intentId,
        network: intent.network,
        merchant: intent.merchantAddress,
        amountLuna: intent.amountLuna,
        transactionHash: cleanHash,
        blockHeight: tx.blockNumber || 0,
        timestamp: (tx as any).timestamp || Date.now(),
        confirmations,
        verifiedAtBlock: nowBlock,
        provenanceMode: provenance.mode,
        payer: provenance.payer || tx.from,
        payerEvidence: provenance.payerEvidence,
        orderReference: intent.orderReference,
        intentDigest: intent.intentDigest
      });

      // Atomic settlement write
      db.exec('BEGIN IMMEDIATE;');
      try {
        db.prepare(`
          INSERT INTO settlements (
            intent_id, transaction_hash, receipt_id, payer_address,
            merchant_address, amount_luna, block_number, settled_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          intent.intentId,
          cleanHash,
          receipt.receiptId,
          receipt.provenance.payer,
          receipt.merchant,
          receipt.amountLuna,
          receipt.blockHeight,
          Math.floor(Date.now() / 1000)
        );

        db.prepare(`
          INSERT INTO receipts (
            receipt_id, intent_id, receipt_digest, canonical_json, created_at
          ) VALUES (?, ?, ?, ?, ?)
        `).run(
          receipt.receiptId,
          intent.intentId,
          receipt.receiptDigest,
          JSON.stringify(receipt),
          receipt.createdAt
        );

        db.prepare('UPDATE payment_intents SET status = ? WHERE intent_id = ?').run('SEALED', intent.intentId);
        db.exec('COMMIT;');
      } catch (err) {
        db.exec('ROLLBACK;');
        throw err;
      }

      return {
        verdict: 'VERIFIED',
        receipt,
        invariants: evalResult.invariants
      };
    } else if (evalResult.verdict === 'PENDING') {
      db.prepare('UPDATE payment_intents SET status = ? WHERE intent_id = ?').run('VERIFYING', intent.intentId);
      return {
        verdict: 'PENDING',
        invariants: evalResult.invariants,
        failureReason: evalResult.failureReason
      };
    } else {
      db.prepare('UPDATE payment_intents SET status = ? WHERE intent_id = ?').run('REJECTED', intent.intentId);
      return {
        verdict: 'REJECTED',
        invariants: evalResult.invariants,
        failureReason: evalResult.failureReason
      };
    }
  }

  async reconcilePendingIntents() {
    const now = Math.floor(Date.now() / 1000);
    const pendingIntents = db.prepare(`
      SELECT * FROM payment_intents 
      WHERE status IN ('OPEN', 'AWAITING_PAYMENT', 'OBSERVED', 'VERIFYING')
    `).all() as any[];

    for (const intentRow of pendingIntents) {
      // Check expiration
      if (now > intentRow.expires_at) {
        db.prepare('UPDATE payment_intents SET status = ? WHERE intent_id = ?').run('EXPIRED', intentRow.intent_id);
        continue;
      }

      // Check if there are observations to process
      const obs = db.prepare(
        'SELECT transaction_hash FROM payment_observations WHERE intent_id = ? ORDER BY id DESC LIMIT 1'
      ).get(intentRow.intent_id) as any;

      if (obs) {
        try {
          await this.observeAndVerify(intentRow.intent_id, obs.transaction_hash);
        } catch {
          // ignore transient error in worker
        }
        continue;
      }

      // Crash Recovery: No client callback received! Check merchant address history on chain
      try {
        const txs = await rpcClient.getTransactionsByAddress(intentRow.merchant_address, 10, null);
        for (const tx of txs) {
          // Check if transaction matches intent memo or amount
          const memoText = tx.recipientData || tx.senderData || '';
          if (memoText.includes(intentRow.intent_id) || BigInt(tx.value) === BigInt(intentRow.amount_luna)) {
            // Found unconfirmed transaction!
            await this.observeAndVerify(intentRow.intent_id, tx.hash);
            break;
          }
        }
      } catch {
        // RPC network delay
      }
    }
  }

  getHistory(limit = 50) {
    const rows = db.prepare(`
      SELECT 
        pi.intent_id, pi.merchant_address, pi.amount_luna, pi.order_reference,
        pi.created_at, pi.status, s.receipt_id, s.transaction_hash, s.payer_address,
        r.receipt_digest
      FROM payment_intents pi
      LEFT JOIN settlements s ON pi.intent_id = s.intent_id
      LEFT JOIN receipts r ON pi.intent_id = r.intent_id
      ORDER BY pi.created_at DESC
      LIMIT ?
    `).all(limit);
    return rows;
  }
}

export const paymentService = new PaymentService();
