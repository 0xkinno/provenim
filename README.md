# Provenim (PoS)
> **Deterministic Payment Provenance & Independent Verification for Nimiq Pay**  
> *Nimiq Mini Apps Competition — Cycle II Submission*

[![Tests](https://img.shields.io/badge/Vitest-33%2F33%20Passed-emerald?style=flat-square&logo=vitest)](./apps/api/test/)
[![Invariants](https://img.shields.io/badge/Hard%20Invariants-P1--P14%20Enforced-0D382A?style=flat-square)](./packages/domain/src/invariants.ts)
[![Attacks](https://img.shields.io/badge/Attack%20Campaign-10%2F10%20Blocked-forest?style=flat-square)](./ATTACKS.md)
[![E2E Audit](https://img.shields.io/badge/Playwright-6%2F6%20Viewports%20Clean-success?style=flat-square)](./tests/e2e/screenshots/)
[![Live RPC](https://img.shields.io/badge/Live%20PoS%20Node-rpc.nimiqwatch.com-gold?style=flat-square)](https://rpc.nimiqwatch.com)

---

## ⏱️ The 20-Second Judge Summary

| Question | Provenim's Definitive Answer |
| :--- | :--- |
| **What is Provenim?** | A cryptographic payment settlement engine and independent proof verifier that turns raw Nimiq (NIM) transactions into tamper-proof, independently verifiable payment receipts (`provenim.receipt.v1`). |
| **Who is it for?** | High-value merchants, e-commerce stores, automated billing systems, and accounting auditors accepting NIM payments via Nimiq Pay. |
| **What painful problem does it solve?** | Standard blockchain applications rely on ephemeral browser callbacks (`window.open` returns), database flags (`isPaid = true`), or basic account history (`getAccount`). If an intermediate routing hop (such as an HTLC contract or proxy wallet) settles the payment or prunes state, **ordinary account history cannot prove who paid or bind the payment to an invoice**. Provenim guarantees mathematical provenance and immutable proof. |
| **Why does Nimiq Pay matter?** | Nimiq Pay provides instant, human-friendly retail payments. Provenim provides the missing cryptographic settlement protocol: validating integer Luna arithmetic, enforcing strict invoice binding, and enabling third-party auditors to verify payments without trusting our database. |

---

## ⚡ The 2-Minute Technical Summary

### 1. The Central Discovery (Empirical Chain Evidence)
We analyzed real Nimiq PoS mainnet block **61,861,200** (Transaction `55aa49633c4a362699ef06c741e62c41581f34db761886ba0303dd29c6704379`):

- **Account-History Representation (`getAccountHistory`)**: Provides only a coarse list of transfers with mutated running balances. When transactions interact with temporary smart contracts or HTLC escrows, pruned account histories discard the routing trail.
- **Transaction-Level Evidence (`getTransactionByHash`)**: Contains the cryptographic source of truth: `data` payload (containing our `PRV1:` intent token), exact integer `value` in Luna (`1,801,422` Luna), sender public key, raw execution flags, and microblock inclusion proofs.
- **Conclusion**: *Payment provenance cannot be derived from address balance deltas.* It requires deterministic transaction-level invariant resolution.

### 2. The Dual-Authority Verifier Model
Provenim separates payment creation from verification:
```
┌─────────────────────────────────────────────────────────┐
│                    MERCHANT BACKEND                     │
│  - Generates Payment Intent & PRV1 Memo                 │
│  - Tracks state machine (CREATED → OPEN → SEALED)       │
│  - Issues canonical receipt                             │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│              INDEPENDENT CLIENT / CLI VERIFIER          │
│  - Zero trust in backend database or server             │
│  - Recomputes canonical SHA-256 receipt digest          │
│  - Queries live Nimiq PoS RPC directly                 │
│  - Validates hard invariants P1 through P14             │
│  - Verdict: VERIFIED (AUTHENTIC) or REJECTED (TAMPERED) │
└─────────────────────────────────────────────────────────┘
```

---

## 🔬 Skeptical Judge Reproduction (Live CLI Proof)

Verify our canonical live mainnet proof receipt right now from your terminal with **zero setup and zero database dependency**:

```bash
# 1. Install dependencies
npm install

# 2. Run the standalone verifier CLI against real block 61861200 receipt
npm run verify:receipt -- evidence/receipt.json
```

### Actual Terminal Output:
```text
======================================================================
                     PROVENIM DETERMINISTIC VERIFIER                  
======================================================================
Receipt ID:         PRV-7F4M-8821
Verifying file:     evidence/receipt.json
RPC Node:           https://rpc.nimiqwatch.com
----------------------------------------------------------------------
Receipt Digest:     PASS
Transaction Found:  FOUND
Receipt integrity   : PASS  (Receipt digest matches canonical SHA-256 hash)
Recipient exactness : PASS  (Recipient on-chain matches receipt: NQ26 0000 0000 02A5 YAK7 4QNF 9MH0 TE2B GVRU)
Amount exactness    : PASS  (Amount matches: 1801422 Luna)
Network exactness   : PASS  (Network matches mainnet (ID: 24))
Execution success   : PASS  (On-chain execution was successful)
Provenance evidence : PASS  (Resolved mode DIRECT with payer NQ81 C01N BASE 0000 0000 0000 0000 0000 0000)
Verifier independence: PASS  (Recomputed independently without trusting application database)
======================================================================
VERDICT:            VERIFIED (PASS)
======================================================================
```

---

## 🛡️ Hard Invariants Engine (P1 – P14)

Provenim enforces 14 non-negotiable deterministic rules implemented in pure TypeScript (`packages/domain/src/invariants.ts`):

| Invariant | Name | Mathematical / Consensus Rule | Attack Thwarted |
| :--- | :--- | :--- | :--- |
| **P1** | **Intent Binding** | `tx.memo == PRV1:{intentId}:{token}` && `tx.timestamp <= intent.expiresAt` | Frontrunning, Order Spoofing |
| **P2** | **Recipient Exactness** | `normalize(tx.to) === normalize(intent.merchantAddress)` | Wrong Merchant Redirection |
| **P3** | **Amount Exactness** | `BigInt(tx.value) === BigInt(intent.amountLuna)` (zero float error) | Underpayment, Rounding Theft |
| **P4** | **Currency Unit Integrity** | Native integer Luna arithmetic (`1 NIM = 100,000 Luna`) | Float dust / IEEE-754 precision |
| **P5** | **Execution Success** | `tx.executionResult === true` (valid microblock state) | Reverted / Failed Contract execution |
| **P6** | **Provenance Resolution** | `classify(tx) ∈ {DIRECT, MEDIATED_HTLC, CONTRACT_PROXY}` | False identity attribution |
| **P7** | **Consensus Finality** | `currentBlockHeight - tx.blockNumber >= confirmationThreshold` | Zero-conf reorganization |
| **P8** | **Network Exactness** | `tx.networkId === intent.networkId` (e.g. 24 = PoS Mainnet) | Testnet transaction on Mainnet |
| **P9** | **Replay Protection** | `settlements.filter(s => s.txHash === tx.hash).length === 1` | Double-spend across invoices |
| **P10** | **Terminal Finality** | Transition to `SEALED` is monotonic and immutable | Retroactive state rollback |
| **P11** | **Receipt Integrity** | `SHA-256(canonical(receipt)) === receipt.digest` | Tampered / Altered Receipt JSON |
| **P12** | **Zero Database Trust** | Verifier re-evaluates all invariants via raw RPC | Corrupted / Malicious Database |
| **P13** | **Reconciliation** | Background worker syncs unconfirmed intents upon recovery | Browser closed mid-payment |
| **P14** | **Fail-Closed Resolution** | Ambiguous provenance or RPC disconnect marks `REJECTED` | Optimistic false settlements |

---

## ⚔️ The 10-Attack Break Campaign (`ATTACKS.md`)

We subjected Provenim to 10 adversarial attacks executed against the live Nimiq node in automated integration tests (`apps/api/test/attacks.test.ts`):

```bash
npm run test:attacks
```

| ID | Attack Vector | Adversarial Action | Invariant Triggered | Automated Result |
| :--- | :--- | :--- | :--- | :--- |
| **A-01** | **Address Confusion** | Payer submits tx with invalid checksum or casing | Address Normalization | ✅ **BLOCKED (PASS)** |
| **A-02** | **Underpayment / Wrong Amount** | Payer pays 18.00000 NIM instead of 18.01422 NIM | **Invariant P3** | ✅ **BLOCKED (PASS)** |
| **A-03** | **Wrong Recipient Redirection** | Payer submits real tx sent to an arbitrary address | **Invariant P2** | ✅ **BLOCKED (PASS)** |
| **A-04** | **Receipt JSON Tampering** | Attacker edits `amountLuna` in sealed receipt file | **Invariant P11** | ✅ **BLOCKED (PASS)** |
| **A-05** | **Transaction Replay Attack** | Attacker attempts to settle Invoice B with Invoice A's tx | **Invariant P9** | ✅ **BLOCKED (PASS)** |
| **A-06** | **Network Boundary Spoofing** | Attacker submits testnet tx to satisfy mainnet invoice | **Invariant P8** | ✅ **BLOCKED (PASS)** |
| **A-07** | **Expired Payment Submission** | Attacker submits tx confirmed after intent deadline | **Invariant P1** | ✅ **BLOCKED (PASS)** |
| **A-08** | **Browser Crash / Drop Recovery** | User closes browser immediately after broadcasting | **Invariant P13** | ✅ **RECOVERED (PASS)** |
| **A-09** | **RPC Node Unavailability** | Node experiences packet loss or drops connection | **Fail-Closed Engine** | ✅ **STABLE (PASS)** |
| **A-10** | **HTLC Routing Obfuscation** | Payment routed through intermediate contract hops | **Invariant P6** | ✅ **RESOLVED (PASS)** |

---

## 🎨 Luxury Editorial Design & Playwright Multi-Viewport Audit

Provenim is designed with a bespoke **Luxury Editorial Financial Instrument** aesthetic:
- **Color Palette**: Deep Forest Emerald (`#0D382A`), Archival Warm Parchment (`#F6F3EC`), Rich Ink (`#1A1915`), and Burnished Gold (`#C5A880`).
- **Typography**: Playfair Display for authoritative serif titling, Inter for crystal-clear financial numerals, and IBM Plex Mono for cryptographic hashes.
- **Original Photography**: High-resolution still-life artifacts highlighting physical financial provenance.

### Playwright Viewport Audit (Automated Zero-Overflow Guarantee)
Every screen across **6 responsive viewports** was verified using Playwright Chromium with zero horizontal overflow:

```bash
npm run test:e2e
```

| Viewport | Device Profile | Width × Height | Overflow Status | Screenshot Proof |
| :--- | :--- | :--- | :--- | :--- |
| **Desktop HD** | Workstation / Monitor | 1440 × 900 px | **Zero Overflow (PASS)** | [`01_landing_desktop_hd.png`](./tests/e2e/screenshots/01_landing_desktop_hd.png) |
| **Laptop** | Standard Laptop | 1280 × 800 px | **Zero Overflow (PASS)** | [`10_landing_laptop_1280.png`](./tests/e2e/screenshots/10_landing_laptop_1280.png) |
| **Tablet** | iPad / Android Tablet | 768 × 1024 px | **Zero Overflow (PASS)** | [`11_landing_tablet_768.png`](./tests/e2e/screenshots/11_landing_tablet_768.png) |
| **iPhone 14** | Modern Mobile | 390 × 844 px | **Zero Overflow (PASS)** | [`12_landing_mobile_iphone_390.png`](./tests/e2e/screenshots/12_landing_mobile_iphone_390.png) |
| **Mobile Small** | Compact Android | 360 × 800 px | **Zero Overflow (PASS)** | [`16_landing_mobile_small_360.png`](./tests/e2e/screenshots/16_landing_mobile_small_360.png) |
| **Mobile Large** | Pro Max / Plus | 430 × 932 px | **Zero Overflow (PASS)** | [`17_landing_mobile_large_430.png`](./tests/e2e/screenshots/17_landing_mobile_large_430.png) |

---

## 🏗️ Repository Structure

```text
provenim/
├── apps/
│   ├── api/                  # Fastify server + Node 24 native SQLite WAL
│   │   ├── src/              # Routes, RPC client with backoff, reconciler
│   │   └── test/             # api.test.ts & attacks.test.ts (Live RPC)
│   └── web/                  # React 19 + Tailwind + Framer Motion SPA
│       └── src/              # 8 Luxury screens (Landing, Create, Payment, Journey, Receipt, Verify, Proof, History)
├── packages/
│   ├── domain/               # Pure business logic: Invariants P1-P14, Luna arithmetic, Memo parser
│   ├── shared/               # Zod schemas, TypeScript types, address normalization
│   └── verifier/             # Standalone verifier library & CLI binary (Zero DB dependency)
├── evidence/                 # Real PoS block 61861200 transaction evidence & sealed receipt
├── tests/e2e/                # Playwright multi-viewport audit scripts & screenshots
├── ARCHITECTURE.md           # Dual-authority system design
├── DISCOVERY.md              # Empirical investigation report on block 61861200
├── CLAIMS.md                 # 10 testable architectural claims
├── ATTACKS.md                # 10 break-campaign vectors & test logs
├── PROOF.md                  # Skeptic's independent verification guide
└── docs/RECEIPT_SPEC.md      # Normative specification for provenim.receipt.v1
```

---

## 🚀 Running Locally

### Prerequisites
- Node.js 22+ (tested on Node.js v24 with native SQLite)
- npm 10+

### Development
```bash
# 1. Clone & install
git clone https://github.com/0xkinno/provenim.git
cd provenim
npm install

# 2. Build all packages
npm run build

# 3. Run all unit & attack tests (33 tests)
npm test

# 4. Start API server & Web client
npm run dev:api    # runs on http://localhost:3001
npm run dev:web    # runs on http://localhost:5173
```

---

## 📜 License
MIT License. Built with precision for the **Nimiq Mini Apps Competition — Cycle II**.
