import { z } from 'zod';
export declare const LUNA_PER_NIM = 100000n;
export declare const NETWORK_IDS: {
    readonly mainnet: 24;
    readonly testnet: 42;
};
export type NetworkName = 'mainnet' | 'testnet';
export declare const NIMIQ_ADDRESS_REGEX: RegExp;
export declare function normalizeNimiqAddress(address: string): string;
export declare const PaymentIntentSchema: z.ZodObject<{
    intentId: z.ZodString;
    version: z.ZodLiteral<"1">;
    merchantId: z.ZodDefault<z.ZodString>;
    merchantAddress: z.ZodString;
    amountLuna: z.ZodString;
    network: z.ZodEnum<["mainnet", "testnet"]>;
    orderReference: z.ZodString;
    createdAt: z.ZodNumber;
    expiresAt: z.ZodNumber;
    randomNonce: z.ZodString;
    intentDigest: z.ZodString;
    status: z.ZodEnum<["OPEN", "AWAITING_PAYMENT", "OBSERVED", "VERIFYING", "VERIFIED", "SEALED", "REJECTED", "EXPIRED"]>;
}, "strip", z.ZodTypeAny, {
    intentId: string;
    version: "1";
    status: "OPEN" | "AWAITING_PAYMENT" | "OBSERVED" | "VERIFYING" | "VERIFIED" | "SEALED" | "REJECTED" | "EXPIRED";
    merchantId: string;
    merchantAddress: string;
    amountLuna: string;
    network: "mainnet" | "testnet";
    orderReference: string;
    createdAt: number;
    expiresAt: number;
    randomNonce: string;
    intentDigest: string;
}, {
    intentId: string;
    version: "1";
    status: "OPEN" | "AWAITING_PAYMENT" | "OBSERVED" | "VERIFYING" | "VERIFIED" | "SEALED" | "REJECTED" | "EXPIRED";
    merchantAddress: string;
    amountLuna: string;
    network: "mainnet" | "testnet";
    orderReference: string;
    createdAt: number;
    expiresAt: number;
    randomNonce: string;
    intentDigest: string;
    merchantId?: string | undefined;
}>;
export type PaymentIntent = z.infer<typeof PaymentIntentSchema>;
export declare const ProvenanceModeSchema: z.ZodEnum<["DIRECT", "MEDIATED_HTLC", "UNKNOWN"]>;
export type ProvenanceMode = z.infer<typeof ProvenanceModeSchema>;
export declare const ProvenanceEvidenceSchema: z.ZodObject<{
    source: z.ZodEnum<["DIRECT_FROM", "RELATED_ADDRESS", "HTLC_CREATION", "MEMO_TOKEN", "OTHER_VERIFIED_SOURCE"]>;
    value: z.ZodString;
    blockHeight: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    value: string;
    source: "DIRECT_FROM" | "RELATED_ADDRESS" | "HTLC_CREATION" | "MEMO_TOKEN" | "OTHER_VERIFIED_SOURCE";
    blockHeight?: number | undefined;
}, {
    value: string;
    source: "DIRECT_FROM" | "RELATED_ADDRESS" | "HTLC_CREATION" | "MEMO_TOKEN" | "OTHER_VERIFIED_SOURCE";
    blockHeight?: number | undefined;
}>;
export type ProvenanceEvidenceItem = z.infer<typeof ProvenanceEvidenceSchema>;
export declare const ProvenanceResultSchema: z.ZodObject<{
    mode: z.ZodEnum<["DIRECT", "MEDIATED_HTLC", "UNKNOWN"]>;
    txHash: z.ZodString;
    payer: z.ZodOptional<z.ZodString>;
    payerEvidence: z.ZodArray<z.ZodObject<{
        source: z.ZodEnum<["DIRECT_FROM", "RELATED_ADDRESS", "HTLC_CREATION", "MEMO_TOKEN", "OTHER_VERIFIED_SOURCE"]>;
        value: z.ZodString;
        blockHeight: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        value: string;
        source: "DIRECT_FROM" | "RELATED_ADDRESS" | "HTLC_CREATION" | "MEMO_TOKEN" | "OTHER_VERIFIED_SOURCE";
        blockHeight?: number | undefined;
    }, {
        value: string;
        source: "DIRECT_FROM" | "RELATED_ADDRESS" | "HTLC_CREATION" | "MEMO_TOKEN" | "OTHER_VERIFIED_SOURCE";
        blockHeight?: number | undefined;
    }>, "many">;
    confidence: z.ZodEnum<["VERIFIED", "INSUFFICIENT"]>;
    notes: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    mode: "DIRECT" | "MEDIATED_HTLC" | "UNKNOWN";
    txHash: string;
    payerEvidence: {
        value: string;
        source: "DIRECT_FROM" | "RELATED_ADDRESS" | "HTLC_CREATION" | "MEMO_TOKEN" | "OTHER_VERIFIED_SOURCE";
        blockHeight?: number | undefined;
    }[];
    confidence: "VERIFIED" | "INSUFFICIENT";
    notes: string[];
    payer?: string | undefined;
}, {
    mode: "DIRECT" | "MEDIATED_HTLC" | "UNKNOWN";
    txHash: string;
    payerEvidence: {
        value: string;
        source: "DIRECT_FROM" | "RELATED_ADDRESS" | "HTLC_CREATION" | "MEMO_TOKEN" | "OTHER_VERIFIED_SOURCE";
        blockHeight?: number | undefined;
    }[];
    confidence: "VERIFIED" | "INSUFFICIENT";
    notes: string[];
    payer?: string | undefined;
}>;
export type ProvenanceResult = z.infer<typeof ProvenanceResultSchema>;
export declare const ReceiptSchema: z.ZodObject<{
    schema: z.ZodLiteral<"provenim.receipt.v1">;
    receiptId: z.ZodString;
    intentId: z.ZodString;
    network: z.ZodEnum<["mainnet", "testnet"]>;
    merchant: z.ZodString;
    amountLuna: z.ZodString;
    transactionHash: z.ZodString;
    blockHeight: z.ZodNumber;
    timestamp: z.ZodNumber;
    finality: z.ZodObject<{
        status: z.ZodEnum<["CONFIRMED", "FINAL"]>;
        confirmations: z.ZodNumber;
        verifiedAtBlock: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        status: "CONFIRMED" | "FINAL";
        confirmations: number;
        verifiedAtBlock: number;
    }, {
        status: "CONFIRMED" | "FINAL";
        confirmations: number;
        verifiedAtBlock: number;
    }>;
    provenance: z.ZodObject<{
        mode: z.ZodEnum<["DIRECT", "MEDIATED_HTLC", "UNKNOWN"]>;
        payer: z.ZodString;
        evidence: z.ZodArray<z.ZodObject<{
            source: z.ZodEnum<["DIRECT_FROM", "RELATED_ADDRESS", "HTLC_CREATION", "MEMO_TOKEN", "OTHER_VERIFIED_SOURCE"]>;
            value: z.ZodString;
            blockHeight: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            value: string;
            source: "DIRECT_FROM" | "RELATED_ADDRESS" | "HTLC_CREATION" | "MEMO_TOKEN" | "OTHER_VERIFIED_SOURCE";
            blockHeight?: number | undefined;
        }, {
            value: string;
            source: "DIRECT_FROM" | "RELATED_ADDRESS" | "HTLC_CREATION" | "MEMO_TOKEN" | "OTHER_VERIFIED_SOURCE";
            blockHeight?: number | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        mode: "DIRECT" | "MEDIATED_HTLC" | "UNKNOWN";
        payer: string;
        evidence: {
            value: string;
            source: "DIRECT_FROM" | "RELATED_ADDRESS" | "HTLC_CREATION" | "MEMO_TOKEN" | "OTHER_VERIFIED_SOURCE";
            blockHeight?: number | undefined;
        }[];
    }, {
        mode: "DIRECT" | "MEDIATED_HTLC" | "UNKNOWN";
        payer: string;
        evidence: {
            value: string;
            source: "DIRECT_FROM" | "RELATED_ADDRESS" | "HTLC_CREATION" | "MEMO_TOKEN" | "OTHER_VERIFIED_SOURCE";
            blockHeight?: number | undefined;
        }[];
    }>;
    orderReference: z.ZodString;
    intentDigest: z.ZodString;
    receiptDigest: z.ZodString;
    verifierVersion: z.ZodString;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    intentId: string;
    amountLuna: string;
    network: "mainnet" | "testnet";
    orderReference: string;
    createdAt: string;
    intentDigest: string;
    blockHeight: number;
    schema: "provenim.receipt.v1";
    receiptId: string;
    merchant: string;
    transactionHash: string;
    timestamp: number;
    finality: {
        status: "CONFIRMED" | "FINAL";
        confirmations: number;
        verifiedAtBlock: number;
    };
    provenance: {
        mode: "DIRECT" | "MEDIATED_HTLC" | "UNKNOWN";
        payer: string;
        evidence: {
            value: string;
            source: "DIRECT_FROM" | "RELATED_ADDRESS" | "HTLC_CREATION" | "MEMO_TOKEN" | "OTHER_VERIFIED_SOURCE";
            blockHeight?: number | undefined;
        }[];
    };
    receiptDigest: string;
    verifierVersion: string;
}, {
    intentId: string;
    amountLuna: string;
    network: "mainnet" | "testnet";
    orderReference: string;
    createdAt: string;
    intentDigest: string;
    blockHeight: number;
    schema: "provenim.receipt.v1";
    receiptId: string;
    merchant: string;
    transactionHash: string;
    timestamp: number;
    finality: {
        status: "CONFIRMED" | "FINAL";
        confirmations: number;
        verifiedAtBlock: number;
    };
    provenance: {
        mode: "DIRECT" | "MEDIATED_HTLC" | "UNKNOWN";
        payer: string;
        evidence: {
            value: string;
            source: "DIRECT_FROM" | "RELATED_ADDRESS" | "HTLC_CREATION" | "MEMO_TOKEN" | "OTHER_VERIFIED_SOURCE";
            blockHeight?: number | undefined;
        }[];
    };
    receiptDigest: string;
    verifierVersion: string;
}>;
export type Receipt = z.infer<typeof ReceiptSchema>;
export declare const InvariantResultSchema: z.ZodObject<{
    code: z.ZodString;
    name: z.ZodString;
    status: z.ZodEnum<["PASS", "FAIL", "PENDING"]>;
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "PASS" | "FAIL" | "PENDING";
    code: string;
    message: string;
    name: string;
}, {
    status: "PASS" | "FAIL" | "PENDING";
    code: string;
    message: string;
    name: string;
}>;
export type InvariantResult = z.infer<typeof InvariantResultSchema>;
export declare const VerificationVerdictSchema: z.ZodObject<{
    verdict: z.ZodEnum<["VERIFIED", "REJECTED", "PENDING"]>;
    receiptId: z.ZodString;
    receiptDigestMatch: z.ZodBoolean;
    transactionFound: z.ZodBoolean;
    invariants: z.ZodRecord<z.ZodString, z.ZodObject<{
        code: z.ZodString;
        name: z.ZodString;
        status: z.ZodEnum<["PASS", "FAIL", "PENDING"]>;
        message: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status: "PASS" | "FAIL" | "PENDING";
        code: string;
        message: string;
        name: string;
    }, {
        status: "PASS" | "FAIL" | "PENDING";
        code: string;
        message: string;
        name: string;
    }>>;
    failureReason: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    receiptId: string;
    timestamp: string;
    verdict: "VERIFIED" | "REJECTED" | "PENDING";
    receiptDigestMatch: boolean;
    transactionFound: boolean;
    invariants: Record<string, {
        status: "PASS" | "FAIL" | "PENDING";
        code: string;
        message: string;
        name: string;
    }>;
    failureReason?: string | undefined;
}, {
    receiptId: string;
    timestamp: string;
    verdict: "VERIFIED" | "REJECTED" | "PENDING";
    receiptDigestMatch: boolean;
    transactionFound: boolean;
    invariants: Record<string, {
        status: "PASS" | "FAIL" | "PENDING";
        code: string;
        message: string;
        name: string;
    }>;
    failureReason?: string | undefined;
}>;
export type VerificationVerdict = z.infer<typeof VerificationVerdictSchema>;
//# sourceMappingURL=index.d.ts.map