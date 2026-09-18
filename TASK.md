# PROVENIM — MASTER TASK LIST (TASK.md)

This task list is derived directly from `instruction.md` without shortcuts or simplifications.
Governing strategy: **DISCOVER → VERIFY → FRAME → DIFFERENTIATE → BUILD → ATTACK → PROVE → SHIP**

---

## Phase 0 — Discovery & Protocol Investigation (GATE 0) [COMPLETE]
- [x] **0.1** Set up research directory structure (`research/official/`, `research/evidence/`, `research/protocol/`, `research/notes/`).
- [x] **0.2** Harvest raw RPC responses from live Nimiq PoS history node (`https://rpc.nimiqwatch.com`) for real transactions.
- [x] **0.3** Execute **Experiment A**: Inspect real Nimiq payment-path on-chain shape:
  - Capture `txHash`, `blockNumber`, `from`, `fromType`, `to`, `toType`, `value`, `fee`, `recipientData`, `senderData`, `relatedAddresses`, `executionResult`, `confirmations`, `networkId`.
  - Check whether intermediate HTLC accounts exist and verify pruning behavior from accounts tree.
  - Verify `getTransactionByHash` persistence on history nodes.
- [x] **0.4** Execute **Experiment B**: Compare ordinary address history (`getTransactionsByAddress`) vs transaction-by-hash (`getTransactionByHash`).
  - Document what address history misses when payments are mediated vs what tx-level evidence captures.
- [x] **0.5** Execute **Experiment C**: Measure PoS finality timings (micro blocks, macro blocks/election blocks, confirmations).
- [x] **0.6** Save raw JSON responses into `research/evidence/` and document findings in `DISCOVERY.md`.
- [x] **0.7** Create initial `CLAIMS.md` status registry.
- [x] **Gate 0 Verification**:
  - [x] Contradiction reproduced and recorded.
  - [x] Evidence saved in `research/evidence/`.
  - [x] Exact payment transaction shape documented.
  - [x] Provenance resolution algorithm verified.

---

## Phase 1 — Core Domain & Invariants Engine (GATE 1) [COMPLETE]
- [x] **1.1** Initialize project monorepo structure:
  - `packages/domain`
  - `packages/verifier`
  - `packages/shared`
  - `apps/api`
  - `apps/web`
- [x] **1.2** Implement integer Luna arithmetic (`1 NIM = 100,000 Luna`) in `packages/domain`.
- [x] **1.3** Implement canonical payment intent model & deterministic SHA-256 digest:
  - Fields: `intentId`, `version`, `merchantAddress`, `amountLuna`, `network`, `orderReference`, `expiresAt`, `nonce`.
  - Canonical format: `PROVENIM_INTENT_V1|intentId|merchantAddress|amountLuna|network|orderReference|expiresAt|nonce`
- [x] **1.4** Implement transaction memo schema: `PRV1:<intentId>:<integrityToken>`.
- [x] **1.5** Implement pure Provenance Classifier (`packages/domain/src/provenance`):
  - Modes: `DIRECT`, `MEDIATED_HTLC`, `UNKNOWN`.
  - Confidence: strict `VERIFIED` vs `INSUFFICIENT` (no vague "likely").
- [x] **1.6** Implement Hard Invariants Engine (P1 to P14):
  - `P1`: Intent binding
  - `P2`: Recipient exactness
  - `P3`: Amount exactness in integer Luna
  - `P4`: Network exactness
  - `P5`: Execution success
  - `P6`: Provenance evidence completeness
  - `P7`: Finality threshold
  - `P8`: Intent uniqueness
  - `P9`: Transaction uniqueness
  - `P10`: Replay resistance
  - `P11`: Receipt integrity
  - `P12`: Verifier independence
  - `P13`: Fail closed
  - `P14`: Recovery equivalence
- [x] **1.7** Implement Receipt Canonicalization & SHA-256 Receipt Digest (`docs/RECEIPT_SPEC.md`).
- [x] **1.8** Implement Standalone Pure Verifier (`packages/verifier`).
- [x] **1.9** Implement CLI verification script: `npm run verify:receipt -- <file.json>`.
- [x] **1.10** Write comprehensive pure unit tests in `packages/domain` and `packages/verifier`.
- [x] **Gate 1 Verification**:
  - [x] All domain & invariant tests pass.
  - [x] `docs/RECEIPT_SPEC.md` written.
  - [x] Standalone verifier reproduces verdicts from raw fixtures.

---

## Phase 2 — Real Chain Integration & Reconciliation (GATE 2) [COMPLETE]
- [x] **2.1** Build Nimiq PoS JSON-RPC Client Adapter (supporting history node calls, failover, exponential backoff).
- [x] **2.2** Build Payment Watcher & Polling Engine.
- [x] **2.3** Build Finality Resolver.
- [x] **2.4** Build Background Reconciler Worker (handles crash recovery & browser death).
- [x] **2.5** Connect Fastify API backend with SQLite atomic database layer (`payment_intents`, `settlements`, `receipts`, `verification_attempts`).
- [x] **Gate 2 Verification**:
  - [x] Real payment settles against live Nimiq node.
  - [x] Interrupted transaction recovers via reconciler.
  - [x] Invalid/tampered payment rejects.

---

## Phase 3 — Core Product Workflow (GATE 3) [COMPLETE]
- [x] **3.1** Merchant intent creation screen & API (`/api/intents`).
- [x] **3.2** Payment request screen with live QR, Nimiq Pay URI, and copyable address/memo.
- [x] **3.3** Native Nimiq Pay integration via `@nimiq/mini-app-sdk`:
  - SDK initialization via `init()`.
  - Account discovery via `listAccounts()`.
  - Transaction submission via `sendBasicTransactionWithData`.
- [x] **3.4** Live Verification Journey UI:
  - Step-by-step animated timeline showing invariant checks resolving one by one.
- [x] **3.5** Sealed Luxury Proof Receipt screen with download, copy, and verify links.
- [x] **3.6** Independent verification screen (`/verify` and `/verify/:receiptId`).
- [x] **3.7** Merchant History & Ledger screen (`/history`).
- [x] **Gate 3 Verification**:
  - [x] Complete human payment flow completes end-to-end with zero mocks.

---

## Phase 4 — The Break Campaign / Attack Suite (GATE 4) [COMPLETE]
- [x] **4.1** Write `ATTACKS.md` detailing 10 attack vectors.
- [x] **4.2** Implement automated test suite executing all 10 attacks (`apps/api/test/attacks.test.ts`):
  - Attack 1: Address Confusion -> Normalized & rejected if invalid.
  - Attack 2: Wrong amount -> Invariant P3 violation (Blocked).
  - Attack 3: Wrong recipient -> Invariant P2 violation (Blocked).
  - Attack 4: Receipt tampering -> Invariant P11 digest mismatch (Blocked).
  - Attack 5: Replay of same tx hash -> Invariant P9 violation (Blocked).
  - Attack 6: Expired intent -> Invariant P1 violation (Blocked).
  - Attack 7: Non-final transaction -> Invariant P7 finality check (Awaiting).
  - Attack 8: App death after wallet approval -> Invariant P13 reconciler recovery.
  - Attack 9: RPC failure -> Backoff & retry without state corruption.
  - Attack 10: Incomplete provenance evidence -> Invariant P6 fail-closed rejection.
- [x] **Gate 4 Verification**:
  - [x] 0 false settlements accepted.
  - [x] 100% of attack tests pass (10/10 automated tests).

---

## Phase 5 — Premium Editorial UI & Design Polish (GATE 5) [COMPLETE]
- [x] **5.1** Implement warm parchment luxury palette (`#F6F3EC`, `#FBF9F4`, `#EEEAE0`, `#0D382A`).
- [x] **5.2** Typography hierarchy: Playfair Display serif headlines + Inter UI + IBM Plex Mono.
- [x] **5.3** Generate hero editorial still-life artwork using `generate_image` and embedded in landing page.
- [x] **5.4** Framer Motion micro-interactions and receipt sealing transitions.
- [x] **5.5** Responsive layouts strictly optimized for mobile thumb-zone (`360px`, `390px`, `430px`), tablet (`768px`), and desktop (`1280px`, `1440px`).
- [x] **Gate 5 Verification**:
  - [x] Responsive design verified on all breakpoints.
  - [x] Flawless typography, contrast, and alignment.

---

## Phase 6 — Proof Portal & Verifier Reproduction (GATE 6) [COMPLETE]
- [x] **6.1** Build public `/proof` page with live chain stats, latest receipt, and reproducible instructions.
- [x] **6.2** Provide curl / npm commands for independent verification.
- [x] **6.3** Finalize `CLAIMS.md`, `EVIDENCE.md`, and benchmark table.
- [x] **Gate 6 Verification**:
  - [x] External evaluator can verify a receipt from CLI without web app running.

---

## Phase 7 — Playwright QA, README & Ship (GATE 7) [COMPLETE]
- [x] **7.1** Set up Playwright Chromium E2E suite (`tests/e2e/ui_audit.js`).
- [x] **7.2** Run multi-viewport tests (`360x800`, `390x844`, `430x932`, `768x1024`, `1280x800`, `1440x900`).
- [x] **7.3** Assert no overflow, no clipping, proper contrast, and zero console errors across all viewports.
- [x] **7.4** Capture 18 high-resolution proof screenshots in `tests/e2e/screenshots/`.
- [x] **7.5** Write definitive `README.md` containing the 20-second judge story, 2-minute technical breakdown, live reproduction guide, architecture diagram, and verification tables.
- [x] **7.6** Final audit and submission preparation.
