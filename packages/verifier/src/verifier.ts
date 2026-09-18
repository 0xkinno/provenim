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
  parsePaymentMemo,
  deriveFinalityStatus,
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
    P12: {
      code: 'P12',
      name: 'Receipt canonical integrity',
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

  // 3. Select Appropriate RPC URL (Testnet vs Mainnet)
  const defaultRpc =
    receipt.network === 'testnet'
      ? 'https://rpc.testnet.nimiqwatch.com'
      : 'https://rpc.nimiqwatch.com';
  const rpcUrl = opts.rpcUrl || defaultRpc;

  // 4. Fetch Transaction from RPC if not directly provided
  let tx = opts.rawTransaction;
  if (!tx) {
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
    invariants['P7'] = {
      code: 'P7',
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

  // 5. Invariant Checks Against Chain Truth
  // P2: Payment Binding / Memo
  const memoText = tx.recipientData || tx.senderData || '';
  const parsedMemo = parsePaymentMemo(memoText);
  const p2Pass =
    (parsedMemo.valid && parsedMemo.intentId === receipt.intentId) ||
    (receipt.paymentMemo ? memoText === receipt.paymentMemo : true);

  invariants['P2'] = {
    code: 'P2',
    name: 'Payment intent binding',
    status: p2Pass ? 'PASS' : 'FAIL',
    message: p2Pass
      ? `Transaction memo bound to intent ID ${receipt.intentId}`
      : `Transaction memo does not bind to receipt intent: on-chain data='${memoText}'`
  };

  // P3: Recipient Exactness
  const txToNorm = normalizeNimiqAddress(tx.to || '');
  const receiptMerchantNorm = normalizeNimiqAddress(receipt.merchant || '');
  const p3Pass = txToNorm === receiptMerchantNorm && txToNorm.length > 0;
  invariants['P3'] = {
    code: 'P3',
    name: 'Recipient exactness',
    status: p3Pass ? 'PASS' : 'FAIL',
    message: p3Pass
      ? `Recipient on-chain matches receipt: ${txToNorm}`
      : `Recipient mismatch: on-chain is ${txToNorm}, receipt claims ${receiptMerchantNorm}`
  };

  // P4: Amount Exactness (Luna Integer)
  let p4Pass = false;
  try {
    p4Pass = BigInt(tx.value) === BigInt(receipt.amountLuna);
  } catch {
    p4Pass = false;
  }
  invariants['P4'] = {
    code: 'P4',
    name: 'Amount exactness',
    status: p4Pass ? 'PASS' : 'FAIL',
    message: p4Pass
      ? `Amount matches: ${receipt.amountLuna} Luna`
      : `Amount mismatch: on-chain value ${tx.value} Luna != receipt amount ${receipt.amountLuna} Luna`
  };

  // P5: Network Exactness
  const expectedNetworkIds = NETWORK_IDS[receipt.network] || [24];
  const txNetworkMatchesId = expectedNetworkIds.includes(tx.networkId);
  const txNetworkMatchesName =
    receipt.network === 'testnet'
      ? (tx as any).network === 'TestAlbatross' || expectedNetworkIds.includes(tx.networkId)
      : (tx as any).network === 'MainAlbatross' || expectedNetworkIds.includes(tx.networkId);

  const p5Pass = txNetworkMatchesId || txNetworkMatchesName;
  invariants['P5'] = {
    code: 'P5',
    name: 'Network exactness',
    status: p5Pass ? 'PASS' : 'FAIL',
    message: p5Pass
      ? `Network matches ${receipt.network} (ID: ${tx.networkId})`
      : `Network mismatch: expected ID ${expectedNetworkIds.join('/')}, got ${tx.networkId}`
  };

  // P6: Execution Success
  const p6Pass = tx.executionResult === true;
  invariants['P6'] = {
    code: 'P6',
    name: 'Execution success',
    status: p6Pass ? 'PASS' : 'FAIL',
    message: p6Pass ? 'On-chain execution was successful' : 'Transaction failed during blockchain execution'
  };

  // P7: Block Inclusion
  const p7Pass = tx.blockNumber === receipt.blockHeight && tx.blockNumber > 0;
  invariants['P7'] = {
    code: 'P7',
    name: 'Block inclusion',
    status: p7Pass ? 'PASS' : 'FAIL',
    message: p7Pass
      ? `Included in claimed block #${tx.blockNumber}`
      : `Block mismatch: on-chain block #${tx.blockNumber} != receipt block #${receipt.blockHeight}`
  };

  // P8: Finality Policy
  const currentConfirmations =
    tx.confirmations !== undefined
      ? tx.confirmations
      : (receipt.finality?.confirmations ?? (receipt as any).confirmations ?? 0);
  const p8Pass = currentConfirmations >= 1;
  invariants['P8'] = {
    code: 'P8',
    name: 'Finality policy',
    status: p8Pass ? 'PASS' : 'FAIL',
    message: p8Pass
      ? `Confirmed with ${currentConfirmations} confirmations (status: ${deriveFinalityStatus(currentConfirmations)})`
      : `Pending confirmation: currently ${currentConfirmations} confirmations`
  };

  // P9: Provenance Evidence
  const provenance = classifyPaymentProvenance(tx, receipt.intentId, receipt.intentDigest);
  const p9Pass =
    provenance.confidence === 'VERIFIED' &&
    provenance.mode === receipt.provenance.mode &&
    (!receipt.provenance.payer || !provenance.payer || normalizeNimiqAddress(provenance.payer) === normalizeNimiqAddress(receipt.provenance.payer));

  invariants['P9'] = {
    code: 'P9',
    name: 'Provenance evidence',
    status: p9Pass ? 'PASS' : 'FAIL',
    message: p9Pass
      ? `Resolved mode ${provenance.mode} with payer ${provenance.payer || 'Unknown'}`
      : `Provenance verification mismatch: on-chain mode=${provenance.mode}, payer=${provenance.payer}`
  };

  // P14: Fail Closed Assertion
  const allPassed = p2Pass && p3Pass && p4Pass && p5Pass && p6Pass && p7Pass && p8Pass && p9Pass;
  invariants['P14'] = {
    code: 'P14',
    name: 'Fail closed verification',
    status: allPassed ? 'PASS' : 'FAIL',
    message: allPassed
      ? 'All chain invariants verified independently'
      : 'One or more required invariants failed verification'
  };

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
