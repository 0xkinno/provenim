# PROVENIM — RECEIPT SPECIFICATION (`docs/RECEIPT_SPEC.md`)

**Specification Name**: `provenim.receipt`  
**Status**: Normative Specification  
**Hash Algorithm**: SHA-256  
**Target Networks**: Nimiq PoS Testnet (Network ID: 5 / `TestAlbatross`), Nimiq Mainnet (Network ID: 24 / `MainAlbatross`)

---

## 1. Overview

A Provenim Receipt is an immutable, cryptographically verifiable settlement certificate that proves a specific NIM payment satisfies a specific order before goods or services are fulfilled.

A receipt is considered authentic if and only if:
1. It conforms strictly to the `provenim.receipt` schema.
2. Its `receiptDigest` exactly matches the SHA-256 hash of its canonical serialization.
3. All 14 deterministic invariants (`P1`–`P14`) evaluate to `PASS` against the live blockchain history node without trusting any intermediate server database.

---

## 2. Canonical Serialization Rule

To prevent JSON key reordering attacks, missing field injections, or unicode normalization ambiguities, receipt digests are computed over a strict pipe-delimited UTF-8 string that covers every security-relevant field:

```text
PROVENIM_RECEIPT|
<schema>|
<receiptId>|
<intentId>|
<intentDigestLower>|
<network>|
<merchantAddressNormalized>|
<amountLuna>|
<paymentMemoNormalized>|
<transactionHashLower>|
<blockHeight>|
<timestamp>|
<settlementStatus>|
<finalityStatus>|
<confirmations>|
<verifiedAtBlock>|
<provenanceMode>|
<payerAddressNormalized>|
<payerEvidenceSerialized>|
<orderReference>|
<verifierVersion>|
<createdAtISO>
```

### Normalization Rules:
* **Addresses**: Uppercase, space-separated groups of 4 characters (`NQxx xxxx ...`).
* **Hashes**: Lowercase 64-character hex strings (`[0-9a-f]{64}`).
* **Amounts**: Integer strings in **Luna** (`1 NIM = 100,000 Luna`). Floating point arithmetic is strictly forbidden across all calculation paths.
* **Payment Memo**: Exact string starting with `PRV2:<intentId>:<token>`.
* **Timestamps**: Strict ISO-8601 UTC strings (`YYYY-MM-DDTHH:mm:ss.sssZ`).

---

## 3. Receipt JSON Schema

```json
{
  "schema": "provenim.receipt",
  "receiptId": "PRV-7F4M-8821",
  "intentId": "int_sample_genesis",
  "network": "testnet",
  "merchant": "NQ37 KE7T S7T2 JQTK QDC6 PAFB RQ7Q 9GEV LK0V",
  "amountLuna": "1801422",
  "paymentMemo": "PRV2:int_sample_genesis:e5f8a29b",
  "transactionHash": "55aa49633c4a362699ef06c741e62c41581f34db761886ba0303dd29c6704379",
  "blockHeight": 11752000,
  "timestamp": 1789665908417,
  "settlementStatus": "FINAL",
  "finality": {
    "status": "FINAL",
    "confirmations": 250,
    "verifiedAtBlock": 11752250
  },
  "provenance": {
    "mode": "DIRECT",
    "payer": "NQ81 C01N BASE 0000 0000 0000 0000 0000 0000",
    "evidence": [
      {
        "source": "DIRECT_FROM",
        "value": "NQ81 C01N BASE 0000 0000 0000 0000 0000 0000",
        "blockHeight": 11752000
      }
    ]
  },
  "orderReference": "ORDER-1042",
  "intentDigest": "a3f5b08e2d41a72d3e528d9c1e2a4b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a",
  "receiptDigest": "...",
  "verifierVersion": "2.0.0",
  "createdAt": "2026-09-18T07:00:00.000Z"
}
```

---

## 4. Deterministic Verification Invariants (P1–P14)

A standalone verifier independently executes all 14 invariant assertions against live blockchain RPC:

| Code | Invariant Name | Evaluation Logic |
| :--- | :--- | :--- |
| **P1** | Lifecycle & Window | `blockTimestamp <= intent.expiresAt` (Not expired) |
| **P2** | Payment Binding | `parsePaymentMemo(tx.recipientData).intentId === receipt.intentId` |
| **P3** | Recipient Exactness | `normalize(tx.to) === normalize(receipt.merchant)` |
| **P4** | Amount Exactness | `BigInt(tx.value) === BigInt(receipt.amountLuna)` |
| **P5** | Network Exactness | `tx.networkId === 5` (Testnet) or `24` (Mainnet) |
| **P6** | Execution Success | `tx.executionResult === true` |
| **P7** | Block Inclusion | `tx.blockNumber === receipt.blockHeight && tx.blockNumber > 0` |
| **P8** | Finality Policy | `confirmations >= threshold` (maps to FINAL / CONFIRMED / SETTLEMENT-READY) |
| **P9** | Provenance Completeness | `provenance.mode !== 'UNKNOWN' && payer === receipt.provenance.payer` |
| **P10** | Tx Uniqueness | Transaction hash consumed at most once across all settlements |
| **P11** | Intent Uniqueness | Payment intent settled at most once |
| **P12** | Receipt Integrity | `sha256(canonicalizeReceipt(receipt)) === receipt.receiptDigest` |
| **P13** | Recovery Equivalence | Background reconciler evaluates identical invariants as frontend |
| **P14** | Fail Closed | Any invariant violation or unavailable RPC evidence produces REJECTED |

---

## 5. Verification Algorithm

```text
Input: receipt (JSON), optional rawTransaction (Object)

1. Validate JSON schema against ReceiptSchema (supports provenim.receipt).
2. Compute expectedDigest = sha256(canonicalizeReceipt(receipt)).
3. If expectedDigest !== receipt.receiptDigest:
     return { verdict: 'REJECTED', reason: 'Receipt digest mismatch. Document has been tampered with.' }
4. If rawTransaction not provided, fetch from Nimiq History RPC:
     tx = getTransactionByHash(receipt.transactionHash)
5. If !tx:
     return { verdict: 'REJECTED', reason: 'Transaction not found on blockchain history node.' }
6. Evaluate Invariants P2 through P14:
     Assert tx.recipientData memo matches receipt.intentId
     Assert tx.to matches receipt.merchant
     Assert tx.value matches receipt.amountLuna
     Assert tx.networkId matches receipt.network
     Assert tx.executionResult === true
     Assert tx.blockNumber === receipt.blockHeight
     Assert confirmations >= 1
7. If all invariants PASS:
     return { verdict: 'VERIFIED', receiptDigestMatch: true, transactionFound: true }
   Else:
     return { verdict: 'REJECTED', failureReason: list of failed invariants }
```
