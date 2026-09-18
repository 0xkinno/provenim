# PROVENIM — RECEIPT SPECIFICATION (RECEIPT_SPEC.md)

**Version**: `provenim.receipt.v1`  
**Status**: Normative Specification  
**Hash Algorithm**: SHA-256

---

## 1. Overview

A Provenim Receipt is an immutable, cryptographically verifiable financial document that seals proof of payment on the Nimiq blockchain. 

A receipt is considered valid if and only if:
1. It conforms strictly to the `provenim.receipt.v1` schema.
2. Its `receiptDigest` matches the SHA-256 hash of its canonical serialization.
3. The underlying transaction is confirmed on the Nimiq blockchain with matching amount, recipient, network, and execution status.

---

## 2. Canonical Serialization Rule

To prevent formatting ambiguities or JSON key reordering attacks, receipt digests are computed over a pipe-delimited UTF-8 string:

```text
PROVENIM_RECEIPT_V1|
<schema>|
<receiptId>|
<intentId>|
<network>|
<merchantAddressNormalized>|
<amountLuna>|
<transactionHashLower>|
<blockHeight>|
<payerAddressNormalized>|
<provenanceMode>|
<orderReference>|
<intentDigestLower>|
<createdAtISO>
```

### Normalization Rules:
* Addresses are uppercase, space-separated groups of 4 characters (`NQxx xxxx ...`).
* Hashes (`transactionHash`, `intentDigest`, `receiptDigest`) are 64-character lowercase hex strings.
* Amount is expressed as an integer string in **Luna** (`1 NIM = 100,000 Luna`).
* Dates are strict ISO-8601 UTC strings.

---

## 3. Receipt JSON Schema

```json
{
  "schema": "provenim.receipt.v1",
  "receiptId": "PRV-XXXX-XXXX",
  "intentId": "int_xxxxxxxx",
  "network": "mainnet",
  "merchant": "NQ26 0000 0000 02A5 YAK7 4QNF 9MH0 TE2B GVRU",
  "amountLuna": "1801422",
  "transactionHash": "55aa49633c4a362699ef06c741e62c41581f34db761886ba0303dd29c6704379",
  "blockHeight": 61861200,
  "timestamp": 1789665908417,
  "finality": {
    "status": "CONFIRMED",
    "confirmations": 8802,
    "verifiedAtBlock": 61870002
  },
  "provenance": {
    "mode": "DIRECT",
    "payer": "NQ81 C01N BASE 0000 0000 0000 0000 0000 0000",
    "evidence": [
      {
        "source": "DIRECT_FROM",
        "value": "NQ81 C01N BASE 0000 0000 0000 0000 0000 0000",
        "blockHeight": 61861200
      }
    ]
  },
  "orderReference": "ORDER-1042",
  "intentDigest": "a3f5...",
  "receiptDigest": "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
  "verifierVersion": "1.0.0",
  "createdAt": "2026-09-17T20:00:00.000Z"
}
```

---

## 4. Verification Algorithm

```text
Input: Receipt JSON

1. Validate JSON schema against provenim.receipt.v1.
2. Reconstruct canonical serialization string.
3. Compute expected SHA-256 digest:
     computedDigest = sha256(canonicalString)
4. If computedDigest != receipt.receiptDigest:
     ABORT: Receipt Digest Mismatch (TAMPERED)
5. Fetch transaction by receipt.transactionHash from Nimiq History RPC.
6. Verify:
     tx.to == receipt.merchant
     tx.value == receipt.amountLuna
     tx.executionResult == true
     tx.networkId == expectedNetworkId
7. Output: VERIFIED
```
