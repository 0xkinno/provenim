# PROVENIM — SYSTEM ARCHITECTURE (ARCHITECTURE.md)

## 1. System Overview

Provenim is designed as a small, high-guarantee system with strict separation of concerns.

```text
┌─────────────────────────────────────────────────────────────┐
│                 NIMIQ PAY / WEB CLIENT                      │
│                                                             │
│  Provenim Mini App & Web Client                             │
│  React 19 + TypeScript + Vite + Tailwind + Framer Motion    │
│  @nimiq/mini-app-sdk (listAccounts, sign, sendWithData)     │
│                                                             │
│  Request → Wallet Approval → Broadcast → Live Journey      │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS REST / Polling
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                        PROVENIM API                         │
│                                                             │
│  Fastify TypeScript Server                                  │
│  - Payment Intent Service (Canonicalization & SHA-256)      │
│  - Payment Watcher & Polling Reconciler                     │
│  - Settlement Invariant Engine (P1–P14)                     │
│  - Receipt Sealer (Deterministic JSON & Digest)             │
└───────────────┬──────────────────────────────┬──────────────┘
                │                              │
                ▼                              ▼
       ┌────────────────┐             ┌──────────────────────┐
       │ SQLite / PG    │             │ Nimiq PoS JSON-RPC   │
       │                │             │                      │
       │ payment_intents│             │ getBlockNumber       │
       │ observations   │             │ getTransactionByHash │
       │ settlements    │             │ getTransactionsByAddr│
       │ receipts       │             │ getAccountByAddress  │
       │ verifications  │             │                      │
       └────────────────┘             └──────────────────────┘
                ▲
                │ Re-execution without trusting application DB
       ┌────────┴─────────────────────────────────────────────┐
       │             STANDALONE DETERMINISTIC VERIFIER        │
       │                                                      │
       │  packages/verifier (Pure Package & CLI)              │
       │  - Pure Invariant Checks (P1 to P14)                 │
       │  - Direct RPC Re-fetch                               │
       │  - Canonical Receipt Digest Recomputation            │
       │  - Strict FAIL-CLOSED Guarantee                      │
       └──────────────────────────────────────────────────────┘
```

## 2. The Two Authorities

1. **Blockchain / RPC History Node**: The single source of transaction truth (block inclusion, execution result, addresses, values, raw data).
2. **Provenim Verifier**: The deterministic interpreter that decides whether a blockchain transaction satisfies the exact server-issued payment intent.
3. **Database**: Durable cache and settlement ledger. Never the authority for whether money arrived.
4. **Frontend**: Presentation and user interaction only. Completely untrusted.

## 3. Core Modules & Repository Organization

```text
ProveNim/
├── apps/
│   ├── api/                 # Fastify TypeScript backend & reconciler
│   └── web/                 # React 19 + Vite + Mini App frontend
├── packages/
│   ├── domain/              # Pure models, canonicalizers, invariants, provenance
│   ├── verifier/            # Pure standalone verifier & CLI runner
│   └── shared/              # Common types, schemas, utilities
├── research/
│   ├── evidence/            # Real raw RPC JSON captures
│   ├── official/            # Nimiq official docs & references
│   └── protocol/            # Protocol specifications
├── docs/
│   ├── ATTACKS.md           # 10 break campaign scenarios & results
│   ├── CLAIMS.md            # Registry of claimed & verified properties
│   ├── RECEIPT_SPEC.md      # Deterministic canonical receipt specification
│   └── DECISIONS.md         # Architectural decisions & trade-offs
├── evidence/
│   └── fixtures/            # Static integration fixtures
├── tests/
│   └── e2e/                 # Playwright Chromium multi-viewport tests
├── TASK.md                  # Master task tracking
├── PROGRESS.md              # Live status tracker
├── MILESTONES.md            # Key milestones
└── ARCHITECTURE.md          # This file
```

## 4. Invariant Pipeline (P1–P14)

```text
PAYMENT CLAIM
     ↓
P1:  Intent Binding (PRV1 memo matches intent ID & token)
P2:  Recipient Exactness (matches merchant NQ address)
P3:  Amount Exactness (integer Luna matches intent)
P4:  Network Exactness (network ID matches intended chain)
P5:  Execution Success (executionResult === true)
P6:  Provenance Completeness (sufficient chain-level links)
P7:  Finality Threshold (confirmations >= required)
P8:  Intent Uniqueness (intent settled <= 1 time)
P9:  Transaction Uniqueness (tx hash used <= 1 time)
P10: Replay Resistance (duplicate call cannot double-settle)
P11: Receipt Integrity (SHA-256 matches canonical bytes)
P12: Verifier Independence (validates directly with RPC)
P13: Fail Closed (any ambiguity -> REJECTED)
P14: Recovery Equivalence (background worker runs identical logic)
     ↓
VERDICT: PASS / FAIL
```
