import {
  type Receipt,
  type VerificationVerdict,
  ReceiptSchema,
  NETWORK_IDS,
  normalizeNimiqAddress
} from '@provenim/shared';
import {
  verifyReceiptDigest,
  classifyPaymentProvenance,
  type RawTransactionInput
} from '@provenim/domain';

export interface StandaloneVerificationOptions {
  receipt: Receipt | unknown;
  rawTransaction?: RawTransactionInput;
  rpcUrl?: string;
}

export async function verifyReceiptIndependently(
  opts: StandaloneVerificationOptions
): Promise<VerificationVerdict> {
  const timestamp = new Date().toISOString();

  // 1. Schema Validation
  const parseResult = ReceiptSchema.safeParse(opts.receipt);
  if (!parseResult.success) {
    return {
      verdict: 'REJECTED',
      receiptId: (opts.receipt as any)?.receiptId || 'UNKNOWN',
      receiptDigestMatch: false,
      transactionFound: false,
      invariants: {},
      failureReason: `Invalid receipt schema: ${parseResult.error.message}`,
      timestamp
    };
  }

  const receipt = parseResult.data;

  // 2. Receipt Integrity Check (SHA-256 Digest)
  const digestCheck = verifyReceiptDigest(receipt);
  const invariants: VerificationVerdict['invariants'] = {
    P11: {
      code: 'P11',
      name: 'Receipt integrity',
      status: digestCheck.valid ? 'PASS' : 'FAIL',
      message: digestCheck.valid
        ? `Receipt digest matches canonical SHA-256 hash (${receipt.receiptDigest.slice(0, 16)}...)`
        : `Digest mismatch! Expected ${digestCheck.expectedDigest}, got ${receipt.receiptDigest}`
    }
  };

  if (!digestCheck.valid) {
    return {
      verdict: 'REJECTED',
      receiptId: receipt.receiptId,
      receiptDigestMatch: false,
      transactionFound: false,
      invariants,
      failureReason: 'Receipt integrity check failed: digest mismatch. Document has been tampered with.',
      timestamp
    };
  }

  // 3. Fetch Transaction from RPC if not directly provided
  let tx = opts.rawTransaction;
  if (!tx) {
    const rpcUrl = opts.rpcUrl || 'https://rpc.nimiqwatch.com';
    try {
      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'getTransactionByHash',
          params: [receipt.transactionHash],
          id: Date.now()
        })
      });
      const data = (await res.json()) as any;
      if (data && data.result && data.result.data) {
        tx = data.result.data;
      }
    } catch (err: any) {
      return {
        verdict: 'REJECTED',
        receiptId: receipt.receiptId,
        receiptDigestMatch: true,
        transactionFound: false,
        invariants,
        failureReason: `Failed to query blockchain RPC: ${err.message}`,
        timestamp
      };
    }
  }

  if (!tx) {
    invariants['P4'] = {
      code: 'P4',
      name: 'Transaction existence',
      status: 'FAIL',
      message: `Transaction ${receipt.transactionHash} not found on blockchain history node`
    };
    return {
      verdict: 'REJECTED',
      receiptId: receipt.receiptId,
      receiptDigestMatch: true,
      transactionFound: false,
      invariants,
      failureReason: `Transaction ${receipt.transactionHash} could not be retrieved from blockchain.`,
      timestamp
    };
  }

  // 4. Verify Invariants Against Chain Truth
  // P2: Recipient
  const txToNorm = normalizeNimiqAddress(tx.to);
  const receiptMerchantNorm = normalizeNimiqAddress(receipt.merchant);
  const p2Pass = txToNorm === receiptMerchantNorm;
  invariants['P2'] = {
    code: 'P2',
    name: 'Recipient exactness',
    status: p2Pass ? 'PASS' : 'FAIL',
    message: p2Pass
      ? `Recipient on-chain matches receipt: ${txToNorm}`
      : `Recipient mismatch: on-chain is ${txToNorm}, receipt claims ${receiptMerchantNorm}`
  };

  // P3: Amount (Luna Integer)
  const p3Pass = BigInt(tx.value) === BigInt(receipt.amountLuna);
  invariants['P3'] = {
    code: 'P3',
    name: 'Amount exactness',
    status: p3Pass ? 'PASS' : 'FAIL',
    message: p3Pass
      ? `Amount matches: ${receipt.amountLuna} Luna`
      : `Amount mismatch: on-chain value ${tx.value} Luna != receipt amount ${receipt.amountLuna} Luna`
  };

  // P4: Network
  const expectedNetworkId = NETWORK_IDS[receipt.network];
  const p4Pass = tx.networkId === expectedNetworkId;
  invariants['P4'] = {
    code: 'P4',
    name: 'Network exactness',
    status: p4Pass ? 'PASS' : 'FAIL',
    message: p4Pass
      ? `Network matches ${receipt.network} (ID: ${tx.networkId})`
      : `Network mismatch: expected ID ${expectedNetworkId}, got ${tx.networkId}`
  };

  // P5: Execution Result
  const p5Pass = tx.executionResult === true;
  invariants['P5'] = {
    code: 'P5',
    name: 'Execution success',
    status: p5Pass ? 'PASS' : 'FAIL',
    message: p5Pass ? 'On-chain execution was successful' : 'Transaction failed during blockchain execution'
  };

  // P6: Provenance Evidence
  const provenance = classifyPaymentProvenance(tx);
  const p6Pass = provenance.confidence === 'VERIFIED';
  invariants['P6'] = {
    code: 'P6',
    name: 'Provenance evidence',
    status: p6Pass ? 'PASS' : 'FAIL',
    message: p6Pass
      ? `Resolved mode ${provenance.mode} with payer ${provenance.payer}`
      : `Insufficient provenance: ${provenance.notes.join('; ')}`
  };

  // P12: Verifier Independence
  invariants['P12'] = {
    code: 'P12',
    name: 'Verifier independence',
    status: 'PASS',
    message: 'Recomputed independently without trusting application database'
  };

  const allPassed = p2Pass && p3Pass && p4Pass && p5Pass && p6Pass;

  return {
    verdict: allPassed ? 'VERIFIED' : 'REJECTED',
    receiptId: receipt.receiptId,
    receiptDigestMatch: true,
    transactionFound: true,
    invariants,
    failureReason: allPassed
      ? undefined
      : Object.values(invariants)
          .filter(inv => inv.status === 'FAIL')
          .map(inv => `${inv.code}: ${inv.message}`)
          .join(' | '),
    timestamp
  };
}
