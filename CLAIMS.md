# PROVENIM — CLAIM REGISTRY (CLAIMS.md)

This registry tracks the status of every technical claim made by Provenim.
Allowed status values: `VERIFIED`, `TARGET`, `UNKNOWN`, `NOT_CLAIMED`.

---

| ID | Claim | Status | Evidence / Source | Limitation |
|---|---|---|---|---|
| **C-01** | Nimiq PoS history nodes retain transactions and allow retrieval by transaction hash | `VERIFIED` | RPC query `getTransactionByHash` on `rpc.nimiqwatch.com` block 61861200 | Requires history-capable node |
| **C-02** | Nimiq RPC supports `getTransactionsByAddress` with pagination | `VERIFIED` | RPC query `getTransactionsByAddress` with `[address, limit, startHash]` | Positional arguments required |
| **C-03** | `sendBasicTransactionWithData` attaches arbitrary data to `recipientData` | `VERIFIED` | Nimiq Mini App SDK & RPC transaction schema (`recipientData` field) | Visible publicly on chain |
| **C-04** | Empty HTLC contracts are pruned from the accounts tree | `VERIFIED` | Nimiq protocol specification (`/protocol/accounts`) | Account disappears from `getAccountByAddress`, but historical txs persist |
| **C-05** | Ordinary address-history alone cannot prove payment intent binding without transaction-level data | `VERIFIED` | Address history lists value and from/to, but intent binding requires `recipientData` or tx memo | Without tx data inspection, payer attribution in mediated routes is lost |
| **C-06** | Provenim verifier recomputes receipt validity without trusting app database | `TARGET` | Phase 1 & 2 implementation (`packages/verifier`) | Dependent on RPC access |
| **C-07** | Background reconciler recovers unconfirmed payments if browser is killed | `TARGET` | Phase 2 implementation | Requires transaction to be broadcast to chain |
| **C-08** | Tampered receipts are mathematically rejected by SHA-256 digest check | `TARGET` | Phase 1 domain test suite | Dependent on non-collision of SHA-256 |
| **C-09** | Replay of transaction hash cannot cause duplicate fulfillment | `TARGET` | Database unique constraint on `transaction_hash` | Must be atomic at DB level |
| **C-10** | Provenim eliminates payer forever in mediated contracts | `NOT_CLAIMED` | Explicitly rejected in instruction.md Section 1.3 | Payer relationship remains recoverable from transaction-level evidence |
