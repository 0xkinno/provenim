"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationVerdictSchema = exports.InvariantResultSchema = exports.ReceiptSchema = exports.ProvenanceResultSchema = exports.ProvenanceEvidenceSchema = exports.ProvenanceModeSchema = exports.PaymentIntentSchema = exports.NIMIQ_ADDRESS_REGEX = exports.NETWORK_IDS = exports.LUNA_PER_NIM = void 0;
exports.normalizeNimiqAddress = normalizeNimiqAddress;
const zod_1 = require("zod");
exports.LUNA_PER_NIM = 100000n;
exports.NETWORK_IDS = {
    mainnet: 24,
    testnet: 42
};
exports.NIMIQ_ADDRESS_REGEX = /^NQ\d{2}(\s?[A-Z0-9]{4}){8}$/i;
function normalizeNimiqAddress(address) {
    const clean = address.replace(/\s+/g, '').toUpperCase();
    if (clean.length !== 36)
        return address;
    const parts = [];
    for (let i = 0; i < 36; i += 4) {
        parts.push(clean.substring(i, i + 4));
    }
    return parts.join(' ');
}
exports.PaymentIntentSchema = zod_1.z.object({
    intentId: zod_1.z.string(),
    version: zod_1.z.literal('1'),
    merchantId: zod_1.z.string().default('default-merchant'),
    merchantAddress: zod_1.z.string().regex(exports.NIMIQ_ADDRESS_REGEX, 'Invalid Nimiq address format'),
    amountLuna: zod_1.z.string().regex(/^\d+$/, 'amountLuna must be an integer string in Luna'),
    network: zod_1.z.enum(['mainnet', 'testnet']),
    orderReference: zod_1.z.string().min(1).max(128),
    createdAt: zod_1.z.number().int().positive(),
    expiresAt: zod_1.z.number().int().positive(),
    randomNonce: zod_1.z.string().min(8),
    intentDigest: zod_1.z.string().regex(/^[0-9a-f]{64}$/i),
    status: zod_1.z.enum(['OPEN', 'AWAITING_PAYMENT', 'OBSERVED', 'VERIFYING', 'VERIFIED', 'SEALED', 'REJECTED', 'EXPIRED'])
});
exports.ProvenanceModeSchema = zod_1.z.enum(['DIRECT', 'MEDIATED_HTLC', 'UNKNOWN']);
exports.ProvenanceEvidenceSchema = zod_1.z.object({
    source: zod_1.z.enum(['DIRECT_FROM', 'RELATED_ADDRESS', 'HTLC_CREATION', 'MEMO_TOKEN', 'OTHER_VERIFIED_SOURCE']),
    value: zod_1.z.string(),
    blockHeight: zod_1.z.number().optional()
});
exports.ProvenanceResultSchema = zod_1.z.object({
    mode: exports.ProvenanceModeSchema,
    txHash: zod_1.z.string(),
    payer: zod_1.z.string().optional(),
    payerEvidence: zod_1.z.array(exports.ProvenanceEvidenceSchema),
    confidence: zod_1.z.enum(['VERIFIED', 'INSUFFICIENT']),
    notes: zod_1.z.array(zod_1.z.string())
});
exports.ReceiptSchema = zod_1.z.object({
    schema: zod_1.z.literal('provenim.receipt.v1'),
    receiptId: zod_1.z.string(),
    intentId: zod_1.z.string(),
    network: zod_1.z.enum(['mainnet', 'testnet']),
    merchant: zod_1.z.string(),
    amountLuna: zod_1.z.string(),
    transactionHash: zod_1.z.string(),
    blockHeight: zod_1.z.number(),
    timestamp: zod_1.z.number(),
    finality: zod_1.z.object({
        status: zod_1.z.enum(['CONFIRMED', 'FINAL']),
        confirmations: zod_1.z.number(),
        verifiedAtBlock: zod_1.z.number()
    }),
    provenance: zod_1.z.object({
        mode: exports.ProvenanceModeSchema,
        payer: zod_1.z.string(),
        evidence: zod_1.z.array(exports.ProvenanceEvidenceSchema)
    }),
    orderReference: zod_1.z.string(),
    intentDigest: zod_1.z.string(),
    receiptDigest: zod_1.z.string(),
    verifierVersion: zod_1.z.string(),
    createdAt: zod_1.z.string()
});
exports.InvariantResultSchema = zod_1.z.object({
    code: zod_1.z.string(),
    name: zod_1.z.string(),
    status: zod_1.z.enum(['PASS', 'FAIL', 'PENDING']),
    message: zod_1.z.string()
});
exports.VerificationVerdictSchema = zod_1.z.object({
    verdict: zod_1.z.enum(['VERIFIED', 'REJECTED', 'PENDING']),
    receiptId: zod_1.z.string(),
    receiptDigestMatch: zod_1.z.boolean(),
    transactionFound: zod_1.z.boolean(),
    invariants: zod_1.z.record(exports.InvariantResultSchema),
    failureReason: zod_1.z.string().optional(),
    timestamp: zod_1.z.string()
});
//# sourceMappingURL=index.js.map