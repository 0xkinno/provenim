# PROVENIM — EVIDENCE LEDGER (EVIDENCE.md)

This document records the empirical blockchain evidence captured during development and testing.

---

## 1. Network & RPC Environment
* **Node URL**: `https://rpc.nimiqwatch.com`
* **Network Protocol**: Nimiq Proof-of-Stake (Albatross)
* **Network ID**: `24` (Mainnet), `42` (Testnet)
* **Observed Block Height**: 61,861,200+
* **Method Tested**: `getBlockNumber`, `getBlockByNumber`, `getTransactionByHash`, `getTransactionsByAddress`, `getAccountByAddress`.

---

## 2. Sample Transactions Captured

### Sample Transaction 1: Direct Basic Transfer
* **Hash**: `55aa49633c4a362699ef06c741e62c41581f34db761886ba0303dd29c6704379`
* **Block Number**: 61861200
* **Timestamp**: 1789665908417
* **From**: `NQ81 C01N BASE 0000 0000 0000 0000 0000 0000` (`fromType`: 0)
* **To**: `NQ26 0000 0000 02A5 YAK7 4QNF 9MH0 TE2B GVRU` (`toType`: 0)
* **Value**: 1,801,422 Luna (18.01422 NIM)
* **Execution Result**: `true`
* **Confirmations**: 208+
* **Related Addresses**:
  - `NQ26 0000 0000 02A5 YAK7 4QNF 9MH0 TE2B GVRU`
  - `NQ81 C01N BASE 0000 0000 0000 0000 0000 0000`

---

## 3. Ordinary Address History vs Transaction By Hash Comparison

| Property | Address History (`getTransactionsByAddress`) | Transaction By Hash (`getTransactionByHash`) |
|---|---|---|
| Retrievable for active address | Yes | Yes |
| Retrievable if intermediate contract pruned | NO (empty contract pruned from accounts tree) | YES (history node retains all txs since genesis) |
| Transaction data / memo inspection | Shallow list depending on RPC index | Full `recipientData` & `senderData` payload |
| Execution verification | Result boolean | Result boolean, proof, validity start height |
| Payer provenance in mediated contract | Shows contract address as sender | Reveals full transaction linkage & memo token |

Raw responses saved to: `research/evidence/`
