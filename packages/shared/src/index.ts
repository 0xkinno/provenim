import { z } from 'zod';

export const LUNA_PER_NIM = 100_000n;

export type NetworkName = 'mainnet' | 'testnet';

export const NETWORK_IDS: Record<NetworkName, number[]> = {
  mainnet: [24],
  testnet: [5, 42]
};

export const NIMIQ_ADDRESS_REGEX = /^NQ\d{2}(\s?[A-Z0-9]{4}){8}$/i;

export function normalizeNimiqAddress(address: string): string {
  const clean = address.replace(/\s+/g, '').toUpperCase();
  if (clean.length !== 36) return address;
  const parts: string[] = [];
  for (let i = 0; i < 36; i += 4) {
    parts.push(clean.substring(i, i + 4));
  }
  return parts.join(' ');
}

export const PaymentIntentSchema = z.object({
  intentId: z.string(),
  version: z.literal('1'),
  merchantId: z.string().default('default-merchant'),
  merchantAddress: z.string().regex(NIMIQ_ADDRESS_REGEX, 'Invalid Nimiq address format'),
  amountLuna: z.string().regex(/^\d+$/, 'amountLuna must be an integer string in Luna'),
  network: z.enum(['mainnet', 'testnet']),
  orderReference: z.string().min(1).max(128),
  createdAt: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
  randomNonce: z.string().min(8),
  intentDigest: z.string().regex(/^[0-9a-f]{64}$/i),
  status: z.enum(['OPEN', 'AWAITING_PAYMENT', 'OBSERVED', 'VERIFYING', 'VERIFIED', 'SEALED', 'REJECTED', 'EXPIRED'])
});

export type PaymentIntent = z.infer<typeof PaymentIntentSchema>;

export const ProvenanceModeSchema = z.enum(['DIRECT', 'MEDIATED_HTLC', 'UNKNOWN']);
export type ProvenanceMode = z.infer<typeof ProvenanceModeSchema>;

export const ProvenanceEvidenceSchema = z.object({
  source: z.enum(['DIRECT_FROM', 'RELATED_ADDRESS', 'HTLC_CREATION', 'MEMO_TOKEN', 'OTHER_VERIFIED_SOURCE']),
  value: z.string(),
  blockHeight: z.number().optional()
});

export type ProvenanceEvidenceItem = z.infer<typeof ProvenanceEvidenceSchema>;

export const ProvenanceResultSchema = z.object({
  mode: ProvenanceModeSchema,
  txHash: z.string(),
  payer: z.string().optional(),
  payerEvidence: z.array(ProvenanceEvidenceSchema),
  confidence: z.enum(['VERIFIED', 'INSUFFICIENT']),
  notes: z.array(z.string())
});

export type ProvenanceResult = z.infer<typeof ProvenanceResultSchema>;

export const ReceiptSchema = z.object({
  schema: z.enum(['provenim.receipt', 'provenim.receipt.v1']).default('provenim.receipt'),
  receiptId: z.string(),
  intentId: z.string(),
  network: z.enum(['mainnet', 'testnet']),
  merchant: z.string(),
  amountLuna: z.string(),
  paymentMemo: z.string().optional(),
  transactionHash: z.string(),
  blockHeight: z.number(),
  timestamp: z.number(),
  settlementStatus: z.enum(['VERIFIED', 'FINAL', 'SETTLEMENT-READY']).optional(),
  finality: z.object({
    status: z.enum(['OBSERVED', 'INCLUDED', 'SETTLEMENT-READY', 'CONFIRMED', 'FINAL']),
    confirmations: z.number(),
    verifiedAtBlock: z.number()
  }),
  provenance: z.object({
    mode: ProvenanceModeSchema,
    payer: z.string(),
    evidence: z.array(ProvenanceEvidenceSchema)
  }),
  orderReference: z.string(),
  intentDigest: z.string(),
  receiptDigest: z.string(),
  verifierVersion: z.string(),
  createdAt: z.string()
});

export type Receipt = z.infer<typeof ReceiptSchema>;

export const InvariantResultSchema = z.object({
  code: z.string(),
  name: z.string(),
  status: z.enum(['PASS', 'FAIL', 'PENDING']),
  message: z.string()
});

export type InvariantResult = z.infer<typeof InvariantResultSchema>;

export const VerificationVerdictSchema = z.object({
  verdict: z.enum(['VERIFIED', 'REJECTED', 'PENDING']),
  receiptId: z.string(),
  receiptDigestMatch: z.boolean(),
  transactionFound: z.boolean(),
  invariants: z.record(InvariantResultSchema),
  failureReason: z.string().optional(),
  timestamp: z.string()
});

export type VerificationVerdict = z.infer<typeof VerificationVerdictSchema>;
