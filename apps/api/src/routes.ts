import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { paymentService } from './service.js';
import { rpcClient } from './rpc.js';
import { verifyReceiptIndependently } from '@provenim/verifier';
import { nimStringToLuna } from '@provenim/domain';

export async function registerRoutes(app: FastifyInstance) {
  // Health & Chain Status
  app.get('/api/health', async () => {
    let blockHeight = 0;
    let rpcOk = false;
    try {
      blockHeight = await rpcClient.getBlockNumber();
      rpcOk = true;
    } catch {
      rpcOk = false;
    }

    return {
      status: 'ok',
      service: 'Provenim API',
      network: process.env.NIMIQ_NETWORK || 'mainnet',
      blockHeight,
      rpcOk,
      timestamp: new Date().toISOString()
    };
  });

  // Create Intent
  app.post('/api/intents', async (req, reply) => {
    const BodySchema = z.object({
      amountNim: z.string().optional(),
      amountLuna: z.string().optional(),
      merchantAddress: z.string().min(10),
      orderReference: z.string().min(1),
      merchantId: z.string().optional(),
      network: z.enum(['mainnet', 'testnet']).optional(),
      expiresInSeconds: z.number().optional()
    });

    const parsed = BodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }

    let amountLuna = parsed.data.amountLuna;
    if (!amountLuna && parsed.data.amountNim) {
      amountLuna = nimStringToLuna(parsed.data.amountNim).toString();
    }
    if (!amountLuna) {
      return reply.status(400).send({ error: 'Either amountNim or amountLuna is required' });
    }

    const res = paymentService.createIntent({
      amountLuna,
      merchantAddress: parsed.data.merchantAddress,
      orderReference: parsed.data.orderReference,
      merchantId: parsed.data.merchantId,
      network: parsed.data.network,
      expiresInSeconds: parsed.data.expiresInSeconds
    });

    return reply.status(201).send(res);
  });

  // Get Intent
  app.get('/api/intents/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const res = paymentService.getIntent(id);
    if (!res) {
      return reply.status(404).send({ error: 'Payment intent not found' });
    }
    return res;
  });

  // Client Transaction Submission / Observation
  app.post('/api/intents/:id/observe', async (req, reply) => {
    const { id } = req.params as { id: string };
    const BodySchema = z.object({
      txHash: z.string().min(10)
    });

    const parsed = BodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }

    try {
      const result = await paymentService.observeAndVerify(id, parsed.data.txHash);
      return result;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Get Receipt
  app.get('/api/receipts/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const intentData = paymentService.getIntent(id);
    if (intentData && intentData.receipt) {
      return intentData.receipt;
    }

    // Search by receipt_id
    const row = paymentService.getIntent(id); // fallback
    return reply.status(404).send({ error: 'Receipt not found' });
  });

  // Standalone Receipt Verifier Endpoint
  app.post('/api/verify', async (req, reply) => {
    const BodySchema = z.object({
      receipt: z.any()
    });

    const parsed = BodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Missing receipt payload' });
    }

    const verdict = await verifyReceiptIndependently({
      receipt: parsed.data.receipt
    });

    return verdict;
  });

  // Merchant History Ledger
  app.get('/api/history', async () => {
    const history = paymentService.getHistory();
    return {
      history
    };
  });
}
