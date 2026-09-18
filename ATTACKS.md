# PROVENIM — THE BREAK CAMPAIGN (ATTACKS.md)

This document specifies the 10 mandatory attack scenarios and expected system behavior.

---

| Attack # | Attack Name | Adversarial Input / Condition | Expected System Response | Status |
|---|---|---|---|---|
| **A-01** | Fake Client Success | Client sends `{ "status": "paid" }` without valid chain transaction | IGNORED. Status remains `AWAITING_PAYMENT`. Never transitioned to `PAID`. | PASSED (Automated) |
| **A-02** | Wrong Amount | Real broadcast tx with 1 Luna less than intent amount | REJECTED. Invariant P3 fails. Order remains unpaid. | PASSED (Automated) |
| **A-03** | Wrong Recipient | Valid tx paying another address | REJECTED. Invariant P2 fails. | PASSED (Automated) |
| **A-04** | Receipt Tampering | Modify receipt JSON (e.g. `amountLuna` or `merchant`) | REJECTED. Invariant P11 fails (Canonical SHA-256 digest mismatch). | PASSED (Automated) |
| **A-05** | Replay Attack | Submit the same tx hash for a second order | REJECTED. Invariant P9 & P10 fail (Database unique constraint violation). | PASSED (Automated) |
| **A-06** | Expired Intent | Tx submitted after intent `expiresAt` timestamp | REJECTED. Invariant P1 fails (Expired payment window). | PASSED (Automated) |
| **A-07** | Non-Final Transaction | Tx in mempool or 0 confirmations | PENDING. Invariant P7 fails (Waiting for finality threshold). | PASSED (Automated) |
| **A-08** | Browser Death | User approves in wallet, then browser tab is force-closed | RECOVERED. Background reconciler observes tx on chain and seals receipt. | PASSED (Automated) |
| **A-09** | RPC Failure | RPC endpoint temporarily 500s or times out | RESILIENT. Reconciler retries with exponential backoff; state remains uncorrupted. | PASSED (Automated) |
| **A-10** | Incomplete Provenance | Mediated transaction missing required payer provenance proof | REJECTED. Invariant P6 & P13 fail closed. | PASSED (Automated) |
