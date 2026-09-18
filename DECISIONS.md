# PROVENIM — ARCHITECTURAL DECISIONS (DECISIONS.md)

This log records major design decisions, trade-offs, and invariants.

---

## ADR-001: Integer Luna as Canonical Unit of Value
* **Context**: NIM has 5 decimal places (1 NIM = 100,000 Luna). Floating-point representations in JavaScript introduce rounding inaccuracies (e.g. `0.1 + 0.2 !== 0.3`).
* **Decision**: All internal representations, database columns, hashing serializations, and RPC verifications use integer Luna (BigInt / numeric strings).
* **Consequence**: Float rounding errors are mathematically impossible across the entire verification lifecycle.

---

## ADR-002: Dual-Authority Model (RPC Truth vs Pure Policy Interpreter)
* **Context**: Web applications often treat their own database as the source of truth for payment status (`status = 'paid'`). A database corruption, race condition, or faulty webhook can falsely credit orders.
* **Decision**: The blockchain is the sole authority for transaction execution; the pure verifier is the sole authority for whether that transaction satisfies the merchant contract. The database is strictly a durable cache and index.
* **Consequence**: Standalone verifiers can verify payments without connecting to or trusting the Provenim application database.

---

## ADR-003: Deterministic Canonical Serialization for Digests
* **Context**: JSON objects do not guarantee key order. Hashing an unnormalized JSON string produces non-deterministic digests across languages and JSON formatters.
* **Decision**: We define a strict canonical string pipe format for intents (`PROVENIM_INTENT_V1|...`) and sorted-key canonical JSON for receipts, hashed via SHA-256.
* **Consequence**: Anyone with the receipt data can recompute the exact digest in any programming language.

---

## ADR-004: Transaction Data Memo Format (`PRV1:<intentId>:<digestToken>`)
* **Context**: When a payment occurs, we need to bind the on-chain transaction to the specific order without placing private customer details on the public blockchain.
* **Decision**: Use Nimiq's `sendBasicTransactionWithData` to embed a public non-sensitive tag containing the intent ID prefix and short integrity token.
* **Consequence**: The payment is immutably linked to the intent on-chain, preventing transaction hijacking or reuse for other orders.

---

## ADR-005: Fail-Closed Provenance Resolution
* **Context**: In mediated payment routes (e.g. HTLC contracts), the effective sender in address history may differ from the customer's wallet address.
* **Decision**: If required provenance evidence cannot be definitively verified from transaction data or chain state, the verifier must return `REJECTED` or `INSUFFICIENT`, never an optimistic "likely paid".
* **Consequence**: High-integrity settlement guarantee for merchants.
