# PROVENIM — MASTER BUILD INSTRUCTION

**Project:** Provenim  
**Descriptor:** Proof of NIM payment, even when the wallet path is not the address history you expect.  
**Hackathon:** Nimiq Mini Apps Competition — Cycle II  
**Submission deadline:** 18 September 2026  
**Primary deployment:** Vercel frontend + production backend of choice  
**Primary development agent:** Antigravity / Gemini  
**Human owner:** Kinnoski / 0xkinno

> **THIS FILE IS THE SINGLE SOURCE OF TRUTH FOR THE BUILD.**
>
> Read the whole file before changing architecture or writing application code.
> The governing strategy is:
>
> **DISCOVER → VERIFY → FRAME → DIFFERENTIATE → BUILD → ATTACK → PROVE → SHIP**
>
> Do not add features merely to look advanced. Add depth only where it strengthens the central guarantee.

---

# 0. NON-NEGOTIABLE STRATEGY

We are not building another generic Nimiq payment app.

We are building a real merchant/payment-verification product whose central capability exists because of a non-obvious property of the Nimiq payment path.

## The product sentence

> **Provenim lets merchants prove exactly which payment fulfilled an order — and who paid it — even when Nimiq Pay routes the payment through an intermediate contract rather than the user's ordinary account history.**

Secondary sentence:

> **A payment is not considered real because the client says “paid”; it becomes real only after Provenim independently verifies the chain evidence and seals a reproducible proof receipt.**

Do not lead with “protocol”, “infrastructure”, “engine”, “layer”, “orchestration”, “pipeline”, or “cryptographic system”.

Lead with the merchant problem.

---

# 1. THE DISCOVERY WE ARE TESTING

## 1.1 The suspected contradiction

The normal mental model is:

```text
Customer wallet
      ↓
Merchant
      ↓
Payment appears in customer/merchant address history
      ↓
Merchant proves payment
```

Nimiq supports HTLC accounts as a native account type, and empty contract accounts are pruned from the accounts tree. Nimiq also exposes historical transaction lookup by transaction hash, and its integrator guidance distinguishes history-node retention from account-state pruning.

Our investigation has a sharper question:

> **When Nimiq Pay performs a payment, does the transaction's effective sender become an HTLC/contract address, while the user's wallet relationship remains recoverable only through transaction-level evidence rather than ordinary address-history lookup?**

This must be reproduced on a real device before we call it a verified fact.

## 1.2 Official facts already established

Official Nimiq documentation confirms:

- Nimiq has four account types, including HTLC.
- HTLCs are conditional payment contracts.
- Empty contract accounts are pruned from the accounts tree.
- `getTransactionByHash` exists for historical transaction retrieval.
- History nodes retain transactions since genesis and transactions remain retrievable by hash/block number.
- Mini Apps use an injected Nimiq provider through `@nimiq/mini-app-sdk`.
- `sendBasicTransactionWithData` is supported by the Mini App provider.
- Sensitive wallet operations require explicit user approval.

Official sources:

- Mini Apps overview: https://nimiq.dev/mini-apps
- API reference: https://nimiq.dev/mini-apps/api-reference
- Nimiq provider: https://nimiq.dev/mini-apps/api-reference/nimiq-provider
- Accounts / HTLC: https://nimiq.dev/protocol/accounts
- Transactions: https://nimiq.dev/protocol/transactions
- RPC: https://nimiq.dev/rpc/
- Transaction by hash: https://nimiq.dev/rpc/methods/get-transaction-by-hash
- RPC migration / PoS transaction fields: https://nimiq.dev/migration/migration-json-rpc
- Integrator / history-node guidance: https://www.nimiq.dev/migration/migration-integrators
- Competition rules: https://miniappscompetition.com/rules
- Competition FAQ: https://miniappscompetition.com/faq
- Competition starter kit: https://miniappscompetition.com/starterkit

## 1.3 Critical correction

DO NOT write documentation claiming:

> “The payer becomes unrecoverable forever.”

That is too strong.

The transaction itself can remain retrievable by hash, and Nimiq's documentation explicitly says history nodes retain transactions and allow retrieval by hash. The technical problem we are solving is therefore more precise:

> **Ordinary account-history assumptions are not sufficient to prove payment provenance when the payment is mediated by an HTLC/contract path. Transaction-level evidence must be captured and independently reconciled.**

That is both more defensible and more technically interesting.

---

# 2. THE REAL PRODUCT

## 2.1 Target user

Primary user:

> **A small merchant or online seller receiving NIM payments who needs to know, without trusting the customer's browser, exactly which payment fulfilled which order.**

Secondary user:

> **A customer who wants a receipt that can later be independently verified rather than a screenshot or database status badge.**

## 2.2 Real-world problem

Merchants usually care about:

- exact amount
- exact recipient
- exact order/payment reference
- exact payment transaction
- whether the transaction actually executed
- whether it is sufficiently final
- who the payer was
- preventing a payment from being reused for another order
- recovering correctly if the browser closes after wallet approval

The product must make these properties operational rather than merely describing them.

---

# 3. ONE DOMINANT THESIS + ONE GUARANTEE

## Thesis

> **If the wallet/payment path is mediated, payment provenance must be verified from immutable transaction evidence rather than inferred from UI state or a single address history.**

## Hard guarantee

> **Provenim never marks an order as paid unless every required payment invariant passes independently against blockchain data.**

A “paid” UI state is therefore an OUTPUT of verification, never an INPUT to verification.

---

# 4. THE HARD INVARIANT SET

Name the invariants and version them.

## Core verification invariants

**P1 — Intent binding**  
Every payment attempt is bound to exactly one server-issued intent.

**P2 — Recipient exactness**  
The verified payment resolves to the intended merchant recipient.

**P3 — Amount exactness**  
The verified value equals the intent amount in integer Luna.

**P4 — Network exactness**  
The transaction is on the intended network.

**P5 — Execution success**  
The transaction's execution result is successful.

**P6 — Provenance evidence**  
The verified transaction contains sufficient chain-level evidence to associate it with the intended payer/payment context.

**P7 — Finality threshold**  
The app does not mark the payment settled until the configured finality rule is satisfied.

**P8 — Intent uniqueness**  
An intent can settle at most one time.

**P9 — Transaction uniqueness**  
A transaction hash can satisfy at most one settlement.

**P10 — Replay resistance**  
Replaying the same confirmation request cannot create a second fulfillment.

**P11 — Receipt integrity**  
The final receipt is derived from canonical evidence and a deterministic receipt digest.

**P12 — Verifier independence**  
The standalone verifier does not trust Provenim's settlement flag, database record, or frontend state.

**P13 — Fail closed**  
If any mandatory evidence is missing or contradictory, Provenim returns “Not verified” rather than guessing.

**P14 — Recovery equivalence**  
Background reconciliation and foreground confirmation use the same pure verification/settlement path.

Do not weaken an invariant to make a demo pass.

---

# 5. THE PRODUCT FLOW

## 5.1 Merchant flow

```text
Merchant opens Provenim
        ↓
Create Payment Request
        ↓
Enter amount + short order/reference
        ↓
Provenim creates intent
        ↓
Customer opens payment request inside Nimiq Pay
        ↓
Nimiq Pay confirmation
        ↓
Real NIM payment
        ↓
Provenim reconciler watches chain
        ↓
Verify intent + recipient + amount + execution + provenance + finality
        ↓
SEAL PAYMENT PROOF
        ↓
Merchant sees PAID
        ↓
Customer receives verifiable receipt
        ↓
Anyone can open /verify/<receipt-id>
```

## 5.2 Failure flow

```text
Payment attempt
      ↓
Malformed / wrong / incomplete / duplicate / non-final evidence
      ↓
Verifier rejects settlement
      ↓
Order remains UNPAID
      ↓
Reason is explained
      ↓
No funds are generated
      ↓
No database-only "success" is allowed
```

## 5.3 Crash-recovery flow

```text
Wallet approval
      ↓
Browser/app closes
      ↓
Customer never returns
      ↓
Backend has pending intent
      ↓
Background reconciler finds tx
      ↓
Same verifier runs
      ↓
Receipt settles without relying on the client callback
```

---

# 6. THE MOST IMPORTANT TECHNICAL DISCOVERY EXPERIMENT

Do this before serious UI work.

## Experiment A — Real Nimiq Pay payment-path inspection

Goal:

Determine the exact on-chain shape of a real Nimiq Pay payment.

Collect for multiple real testnet transactions:

- tx hash
- block height
- from
- fromType
- senderData
- to
- toType
- recipientData
- value
- networkId
- executionResult
- proof/finality fields where present
- any transaction-level related-address/provenance information actually exposed by the chosen RPC/index
- whether the paying address appears in ordinary `getTransactionsByAddress`
- whether an intermediate HTLC account exists
- whether that HTLC account later disappears from `getAccountByAddress`
- whether the original transaction remains retrievable by hash

Do NOT infer any of these fields from screenshots.

Save raw RPC responses in:

```text
research/evidence/
```

These are research artifacts, not product code.

## Experiment B — Ordinary address history vs transaction hash

For the same payment:

1. Query merchant recipient address.
2. Query payer wallet address.
3. Query transaction directly by hash.
4. Compare all three views.
5. Record what each source can and cannot prove.

The UI should eventually be able to teach this distinction visually.

## Experiment C — Finality

Measure:

```text
broadcast
→ included in micro block
→ macro finality
```

Record actual observed timings and block heights.

Do not hard-code timing claims into marketing until measured.

## Experiment D — Browser death

Approve payment, then force-close the Mini App before its confirmation request returns.

Verify that background reconciliation can still settle it.

## Experiment E — Tamper

Take a valid receipt and alter one field:

- amount
- recipient
- network
- tx hash
- receipt digest
- intent id

The verifier must reject it.

---

# 7. ARCHITECTURE

Use a deliberately small architecture.

```text
┌──────────────────────────────────────────────────────┐
│                 NIMIQ PAY WEBVIEW                   │
│                                                      │
│  Provenim Mini App                                  │
│  React + TypeScript + Nimiq Mini App SDK            │
│                                                      │
│  Request → Wallet approval → Payment → Status       │
└───────────────────────┬──────────────────────────────┘
                        │ HTTPS
                        ▼
┌──────────────────────────────────────────────────────┐
│                 PROVENIM API                         │
│                                                      │
│  Intent service                                      │
│  Auth / wallet binding                               │
│  Reconciliation                                     │
│  Receipt sealing                                     │
│  Proof API                                           │
└───────────────┬───────────────────────┬──────────────┘
                │                       │
                ▼                       ▼
       ┌────────────────┐      ┌──────────────────────┐
       │ Postgres       │      │ Nimiq RPC            │
       │                │      │                      │
       │ intents        │      │ tx by hash           │
       │ settlements    │      │ tx by address        │
       │ receipts       │      │ account state        │
       │ verification   │      │ latest block/finality│
       └────────────────┘      └──────────────────────┘
                │
                ▼
       ┌──────────────────────────────┐
       │ Standalone Verifier          │
       │                              │
       │ Pure invariant checks        │
       │ Canonical receipt hashing    │
       │ Chain re-fetch               │
       │ No trust in settlement flag  │
       └──────────────────────────────┘
```

## 7.1 Two authorities

Keep the distinction extremely clear:

**Blockchain / RPC**
→ transaction truth

**Provenim verifier**
→ interpretation of whether that transaction satisfies the product contract

Database:
→ durable cache/history

Frontend:
→ presentation only

The database must never become the authority for “paid”.

---

# 8. PAYMENT INTENT DESIGN

Each payment request should include:

```text
intentId
version
merchantId
merchantAddress
amountLuna
network
orderReference
createdAt
expiresAt
randomNonce
intentDigest
status
```

## Canonical intent digest

Define a canonical serialization.

Example:

```text
PROVENIM_INTENT_V1|
intentId|
merchantAddress|
amountLuna|
network|
orderReference|
expiresAt|
nonce
```

Then hash it with a documented cryptographic hash.

The exact encoding and hash algorithm must be implemented once in a shared pure package and reused everywhere.

Do not create multiple “almost equivalent” encodings.

---

# 9. PAYMENT DATA / MEMO STRATEGY

Use the Nimiq provider's supported transaction-with-data flow where possible.

Preferred pattern:

```text
PRV1:<intent-id>:<short integrity token>
```

Rules:

- never place private data in transaction data
- keep identifiers short
- treat transaction data as public
- server-generated values only
- never accept arbitrary client-supplied “paid” flags

The exact Nimiq Pay transaction data placement must be measured in Phase 0 and documented in `DISCOVERY.md`.

Do not claim that a specific field survives through an HTLC route until the real transaction proves it.

---

# 10. PROVENANCE RESOLUTION

Create one pure module:

```text
packages/domain/src/provenance/
```

Its job is to classify a payment:

```text
DIRECT
MEDIATED_HTLC
UNKNOWN
```

It must return structured evidence.

Example:

```ts
type ProvenanceEvidence = {
  mode: 'DIRECT' | 'MEDIATED_HTLC' | 'UNKNOWN'
  txHash: string
  payer?: string
  payerEvidence: Array<{
    source:
      | 'DIRECT_FROM'
      | 'RELATED_ADDRESS'
      | 'HTLC_CREATION'
      | 'OTHER_VERIFIED_SOURCE'
    value: string
    blockHeight?: number
  }>
  confidence: 'VERIFIED' | 'INSUFFICIENT'
  notes: string[]
}
```

## Important

Do not use the word “confidence” to hide uncertainty.

For settlement, only:

```text
VERIFIED
```

or

```text
REJECTED
```

is acceptable.

“Likely payer” is not a payment settlement state.

---

# 11. THE STANDALONE VERIFIER

This is the major competitive technical component.

Create:

```text
packages/verifier/
  src/
    canonicalize.ts
    digest.ts
    invariants.ts
    verifyReceipt.ts
    verifyChain.ts
  test/
```

And a CLI:

```bash
npm run verify:receipt -- ./evidence/receipt.json
```

It must:

1. read the receipt JSON
2. recompute the receipt digest
3. confirm the receipt schema/version
4. fetch the transaction by hash
5. verify transaction identity
6. verify recipient
7. verify amount
8. verify network
9. verify execution result
10. verify provenance evidence
11. verify finality rule
12. verify intent binding
13. emit a structured result

Example:

```text
PROVENIM VERIFIER v1

receipt: PRV-7F4...
digest: PASS
transaction: FOUND
network: PASS
recipient: PASS
amount: PASS
intent binding: PASS
provenance: PASS
finality: PASS

RESULT: VERIFIED
```

## Verification must work without the web frontend

A judge should be able to download one receipt and verify it from the repository/CLI.

This is deliberately modeled after the proof discipline in strong infrastructure hackathon projects, but the implementation must be original.

---

# 12. RECEIPT FORMAT

Use a stable JSON format:

```json
{
  "schema": "provenim.receipt.v1",
  "receiptId": "PRV-...",
  "intentId": "...",
  "network": "testnet",
  "merchant": "...",
  "amountLuna": "100000",
  "transactionHash": "...",
  "blockHeight": 123,
  "finality": {
    "status": "FINAL",
    "verifiedAtBlock": 456
  },
  "provenance": {
    "mode": "MEDIATED_HTLC",
    "payer": "...",
    "evidence": []
  },
  "intentDigest": "...",
  "receiptDigest": "...",
  "verifierVersion": "1.0.0",
  "createdAt": "..."
}
```

Do not include unnecessary personal data.

---

# 13. RECEIPT DIGEST

The receipt must contain a deterministic digest over canonical fields.

Do not hash the entire arbitrary JSON object without canonicalization.

Use a shared canonicalizer so that:

```text
same semantic receipt
→ same canonical bytes
→ same digest
```

The verifier must reject:

```text
same data, different order
```

only if the canonicalization contract says order should not matter.

Document the canonicalization rule in `docs/RECEIPT_SPEC.md`.

---

# 14. BACKEND STATE MACHINE

Payment status:

```text
CREATED
  ↓
OPEN
  ↓
AWAITING_PAYMENT
  ↓
OBSERVED
  ↓
VERIFYING
  ├──→ REJECTED
  └──→ VERIFIED
          ↓
        SEALED
```

Optional recovery path:

```text
AWAITING_PAYMENT
    ↓
APP_LOST
    ↓
RECONCILING
    ↓
OBSERVED
```

Never transition:

```text
CLIENT_SAYS_PAID → SEALED
```

Only the verifier can authorize:

```text
VERIFYING → VERIFIED
```

---

# 15. IDEMPOTENCY

Use database constraints.

Minimum unique constraints:

```text
intentId UNIQUE
transactionHash UNIQUE
receiptId UNIQUE
intentDigest UNIQUE
```

The settlement operation must be atomic.

A duplicate webhook/poll/background scan must not pay twice or create multiple receipts.

---

# 16. REAL-TIME UX

Use polling first unless a clean SSE/WebSocket architecture is actually needed.

Keep it robust:

```text
pending
observed
verifying
confirmed
```

Every status should have:

- human-readable label
- technical detail on demand
- retry action where appropriate
- no generic “Something went wrong”

---

# 17. PRODUCT SURFACES

Keep the visible product simple.

## Screen 1 — Landing / Intro

The first screen is the product story.

Hero:

> **Know exactly what got paid.**

Subhead:

> **Verifiable NIM payment receipts for merchants — even when the wallet path is not a simple wallet-to-merchant transfer.**

Primary CTA:

> Create a payment request

Secondary CTA:

> Verify a receipt

Hero visual:
- physical-looking premium paper receipt / transaction slip / proof artifact
- subtle chain evidence layers behind it
- no generic crypto coin collage
- no cartoon shield
- no cliché neon blockchain graphic

## Screen 2 — Create request

Fields:

- amount
- order/reference
- expiration

Then:

> Create payment request

## Screen 3 — Payment request

Show:

- merchant
- amount
- order
- network
- expiry
- one strong “Pay with Nimiq” action

Wallet integration must feel native.

## Screen 4 — Verification journey

The centerpiece.

Animated timeline:

```text
PAYMENT RECEIVED
      ↓
READING TRANSACTION
      ↓
CHECKING ORDER BINDING
      ↓
CHECKING AMOUNT
      ↓
CHECKING PROVENANCE
      ↓
CHECKING FINALITY
      ↓
PROOF SEALED
```

This is where technical depth becomes understandable to a non-technical judge.

## Screen 5 — Receipt

A luxury “proof card”:

```text
PAID
NIM 12.50

ORDER #1042
Transaction 0x...
Payer NQ...
Merchant NQ...

VERIFIED
Finalized at block ...
Receipt digest ...
```

Actions:

- Copy receipt
- Open verifier
- Download JSON
- Share verification link

## Screen 6 — Verify

Paste or load receipt.

Show:

```text
RECEIPT INTEGRITY   PASS
TRANSACTION         FOUND
PAYMENT BINDING      PASS
PROVENANCE           PASS
FINALITY             PASS

VERDICT
VERIFIED
```

If tampered:

```text
VERIFICATION FAILED

Receipt digest mismatch.
The supplied receipt does not match its signed/canonical evidence.
```

Do not show a scary red error wall. Make the failure visually calm and explanatory.

---

# 18. OPTIONAL BUT STRONGLY RECOMMENDED PRODUCT EXTENSION

Do not add another broad feature set.

Instead add one adjacent capability that deepens the thesis:

## Shareable proof link

Example:

```text
/verify/PRV-7F4M...
```

A recipient can open the link and see:

- receipt identity
- transaction
- verified amount
- merchant
- payer
- finality
- verification version
- “Verify independently” control

This gives the product real business value beyond the demo.

---

# 19. REPEAT VALUE

The app earns repeat use from merchant operations:

```text
request → pay → verify → receipt → order history
```

A merchant can return to:

```text
Today
Paid
Pending
Rejected
```

Do not turn this into a giant accounting dashboard.

The history exists to support the single product promise.

---

# 20. DEMO MODE

A browser outside Nimiq Pay must remain usable.

Create:

```text
DEMO MODE
```

with deterministic demo receipts.

But visually distinguish:

```text
DEMO
```

from:

```text
LIVE NIMIQ PAY
```

Never mix fake and real evidence.

Real judge-facing path:

```text
Nimiq Pay → real testnet transaction → real verification → real receipt
```

---

# 21. TEST STRATEGY

Write tests before expanding UI.

## Pure domain tests

Test:

- Luna integer math
- intent canonicalization
- intent digest
- receipt canonicalization
- receipt digest
- amount comparison
- recipient comparison
- network comparison
- finality decision
- provenance classification
- duplicate settlement
- replay rejection

## API tests

Test:

- create intent
- fetch intent
- payment callback
- background reconciliation
- receipt retrieval
- verifier endpoint
- invalid receipt
- expired intent
- duplicate tx
- wrong amount
- wrong recipient
- insufficient finality

## Integration fixtures

Store real testnet fixtures:

```text
evidence/fixtures/
```

Every fixture gets:

```text
why chosen
what it proves
captured date
network
tx hash
```

---

# 22. THE BREAK CAMPAIGN

This is mandatory.

Create:

```text
docs/ATTACKS.md
```

Test at least:

### Attack 1 — Fake client success

Client sends:

```json
{"status":"paid"}
```

Expected:

```text
ignored
```

### Attack 2 — Wrong amount

Valid transaction, wrong amount for the intent.

Expected:

```text
REJECTED
```

### Attack 3 — Wrong recipient

Expected:

```text
REJECTED
```

### Attack 4 — Receipt tampering

Change:

```text
amountLuna
```

Expected:

```text
digest mismatch
```

### Attack 5 — Replay

Submit the same transaction hash twice.

Expected:

```text
second settlement rejected
```

### Attack 6 — Expired intent

Expected:

```text
REJECTED
```

### Attack 7 — Non-final transaction

Expected:

```text
WAITING
```

not:

```text
VERIFIED
```

### Attack 8 — App death

Kill the frontend after wallet approval.

Expected:

```text
background reconciler recovers the payment
```

### Attack 9 — RPC failure

Temporarily make the primary RPC unavailable.

Expected:

```text
retry / fallback
```

without corrupting payment state.

### Attack 10 — Incomplete provenance

Remove required provenance evidence from a fixture.

Expected:

```text
REJECTED
```

Never downgrade to “probably paid”.

---

# 23. BASELINE / COUNTERFACTUAL

We need a clear baseline for the technical story.

Baseline:

> “Trust the browser payment callback / trust the ordinary wallet address history.”

Provenim:

> “Resolve and verify the actual transaction evidence, bind it to a server-issued intent, then seal an independently verifiable receipt.”

Measure at least:

- false settlement count
- duplicate settlement count
- recoveries after app interruption
- incorrect matches rejected
- verifier pass/fail consistency

The most important metric is not “number of features”.

It is:

```text
Incorrect payment claims accepted by Provenim: 0
```

across the adversarial test corpus.

Only publish measured numbers.

---

# 24. EVIDENCE PAGE

Build:

```text
/proof
```

Show:

## Live evidence

- current network
- last verified transaction
- latest receipt
- verification version
- current chain height

## Proof artifacts

- receipt JSON
- transaction hash
- verification result
- test report

## Reproduction

```bash
npm install
npm run verify:receipt -- evidence/receipt.json
```

## Claim registry

Create:

```text
docs/CLAIMS.md
```

Use:

```text
CLAIM
STATUS
EVIDENCE
LIMITATION
```

Allowed status values:

```text
VERIFIED
TARGET
UNKNOWN
NOT_CLAIMED
```

Never market a TARGET as VERIFIED.

---

# 25. REQUIRED RESEARCH DOCUMENTS

Create these before or during Phase 0:

```text
research/
  official/
  competitors/
  protocol/
  evidence/
  screenshots/
  notes/
```

Never commit competitor repositories or copied competitor material.

Add to `.gitignore`:

```gitignore
research/competitors/
research/raw/
*.secrets.*
.env
.env.*
!.env.example
```

The final product repository must contain original implementation and properly attributed open-source dependencies only.

---

# 26. RESEARCH SOURCES TO STUDY

## Nimiq official

Read:

- Mini Apps overview
- Mini App provider API
- basic payment with data
- account types / HTLC
- transactions
- RPC
- `getTransactionByHash`
- `getTransactionsByAddress`
- PoS transaction fields
- history node guidance
- localization
- device identifier
- Mini Apps tutorial
- load local Mini App
- EVM/dual-chain support

Primary links:

https://nimiq.dev/mini-apps
https://nimiq.dev/mini-apps/api-reference
https://nimiq.dev/mini-apps/api-reference/nimiq-provider
https://nimiq.dev/protocol/accounts
https://nimiq.dev/protocol/transactions
https://nimiq.dev/rpc/
https://nimiq.dev/rpc/methods/get-transaction-by-hash
https://nimiq.dev/migration/migration-json-rpc
https://www.nimiq.dev/migration/migration-integrators

## Competition

https://miniappscompetition.com/
https://miniappscompetition.com/rules
https://miniappscompetition.com/faq
https://miniappscompetition.com/starterkit

## Nimiq source and ecosystem

https://github.com/nimiq/nimiq.github.io
https://github.com/nimiq/awesome
https://github.com/Eligioo/nimiq-mini-app-demo

---

# 27. PAST WINNER / REFERENCE RESEARCH

Study these for engineering mentality, not for copying UI/product:

## Nimiq Space
https://github.com/Harlski/nspace

Study:
- persistent product state
- social loop
- real usage framing
- world/presence design

## NimJump
https://github.com/nimjump

Study:
- client/server authority separation
- deterministic replay verification
- anti-cheat thinking
- known limitations
- real test strategy

## NimQuest
Use the competition submission and supplied sample pack.

Study:
- server-side grading
- wallet-bound challenge
- simple product surface
- proof language

## Cycle II references

Study the supplied sample pack deeply:

- nim.shop
- Cinima
- Nimgavel
- PACT
- Stash
- NimStamp
- nimDay
- NimFuel
- AskNim
- Knock
- NIM Relay
- other entries present in the supplied `nimiq_samples.md`

The purpose is to understand:
- their user clarity
- their Nimiq integration depth
- their state machines
- their evidence quality
- their UX patterns
- their blind spots

Do not copy their implementation.

---

# 28. EXTERNAL ENGINEERING REFERENCES

These are strategy references only.

Study the provided research material for:

- Canon — one contradiction, named invariants, baseline/intervention/control, independent proof
- Night Shift — deterministic authority separation + fault injection
- Jalin — protocol-level composability constraint
- Lens / Pugar / similar supplied references — primary guarantee over feature volume

The transferable pattern is:

```text
discover
→ define invariant
→ build mechanism
→ construct counterfactual
→ attack
→ measure
→ package proof
```

Not:

```text
add 20 features
→ write a large README
```

---

# 29. STACK

Default:

## Frontend

- React
- TypeScript
- Vite
- Framer Motion
- Tailwind CSS only as a low-level styling utility
- @nimiq/mini-app-sdk
- React Router if needed
- Zod for API/input contracts
- Lucide only for small utility icons

## Backend

Preferred:

- TypeScript
- Fastify or Hono
- PostgreSQL
- `@nimiq/core` where needed for server-side transaction/signature parsing/verification
- Nimiq JSON-RPC
- Vitest

Use a clean monorepo:

```text
apps/web
apps/api
packages/domain
packages/verifier
packages/shared
docs
research
evidence
```

Do not add infrastructure unless it has a demonstrated purpose.

---

# 30. DEPLOYMENT

Frontend:

```text
Vercel
```

Backend may be:

```text
Render
Fly.io
Railway
Cloudflare Workers
```

Choose based on what the agent can implement reliably.

The frontend must never contain private backend secrets.

---

# 31. ENVIRONMENT VARIABLES

Create:

```text
.env.example
```

Possible variables:

```env
VITE_API_BASE_URL=
DATABASE_URL=
NIMIQ_RPC_URL=
NIMIQ_NETWORK=
SESSION_SECRET=
```

Add more only when actually required.

## Human provides

### 1. Nimiq Pay

Install on an Android/iPhone device.

Use the official app-store links referenced from:

https://miniappscompetition.com/faq

### 2. Nimiq wallet

Needed for prize payout.

Create/manage at:

https://wallet.nimiq.com/

### 3. Testnet NIM

Use Nimiq's official/current testnet faucet referenced by the developer documentation/community resources.

### 4. Nimiq RPC

For initial development, use a public testnet RPC such as the one listed in Nimiq's official ecosystem resources.

Do not assume production uptime for a public community endpoint.

For a stronger production deployment, configure a reliable history-capable RPC endpoint.

### 5. Database

Create a PostgreSQL database.

Render is acceptable for a single-service deployment.

https://render.com/

### 6. Vercel

Connect the GitHub repository.

https://vercel.com/

No API key is required from the agent if Vercel's Git integration is used by the human.

If CLI deployment is required, the human provides a Vercel token through the local environment, never committed.

---

# 32. WALLET UX REQUIREMENT

Wallet connection/signing/payment UX is first-class.

The app must:

1. detect whether Nimiq Pay provider exists
2. wait for provider readiness using `init()`
3. discover accounts cleanly
4. display a concise wallet state
5. show “Open in Nimiq Pay”/Mini App context where relevant
6. clearly distinguish browser demo mode from live wallet mode
7. make payment confirmation a native wallet action
8. handle user rejection without crashing
9. recover cleanly after the app is interrupted

Never put a giant “connect wallet” wall in front of the product before explaining its value.

---

# 33. UI DIRECTION — PREMIUM EDITORIAL

This must not look like:

- generic SaaS
- admin dashboard
- crypto neon
- default Tailwind
- shadcn template
- empty card grid
- AI-generated landing page

## Design language

**Luxury editorial / financial document / premium payment artifact.**

Think:

- Apple product page
- high-end financial publication
- premium receipt printer
- museum catalogue
- luxury stationery
- sophisticated fintech

## Background

Use paper-white / warm parchment:

```text
#F6F3EC
```

with nuanced variations:

```text
#FBF9F4
#EEEAE0
#E4DFD3
```

No large dark canvas.

## Accent

Use one sophisticated accent family, preferably deep emerald / forest green, with restrained use.

Do not overuse gradients.

## Typography

Use a premium pairing.

Preferred open/licensable options:

- Display: Cormorant Garamond / Instrument Serif / Playfair Display
- UI: Geist / Inter / IBM Plex Sans
- technical: IBM Plex Mono / JetBrains Mono

Do not download unknown commercial fonts into the repository.

## Layout

- strong white space
- very few borders
- oversized editorial type
- small mono labels
- asymmetric but controlled composition
- subtle grid
- careful rhythm
- no excessive rounded cards

---

# 34. HERO ARTWORK PROMPT

Generate original assets, never copy competitor artwork.

## Hero image generation prompt

> Create a sophisticated cinematic editorial still-life for a premium payment-verification product. Show an elegant physical payment receipt / archival document resting on warm paper beside a subtle translucent transactional artifact representing a blockchain record. The composition should feel like Apple product photography mixed with high-end financial magazine art direction. Warm ivory paper, brushed silver, restrained deep green, soft directional light, realistic material texture, shallow depth of field, extremely clean negative space. No crypto coins, no dollar signs, no cliché blockchain nodes, no neon, no generic fintech dashboard, no text embedded in the image. Keep the main visual weight on the right half and preserve generous clean negative space on the left for headline copy. Photorealistic, cinematic, premium, understated, expensive, editorial.

## Secondary visual

> Macro editorial photograph of a premium paper receipt with embossed serial number, microprint, fine security pattern and a subtle translucent chain-record abstraction. Warm neutral palette, tactile paper fibers, controlled deep-green accent, studio lighting, no visible brand logos, no embedded text, no cryptocurrency clichés.

## Placement rules

- artwork must never fight with the H1
- artwork should bleed behind or beside content, not under readable text
- on mobile, move artwork below the hero copy
- no important detail may sit underneath CTA buttons
- never use the artwork as a background that reduces text contrast

---

# 35. MOTION DESIGN

Use Framer Motion.

Motion should explain verification.

Suggested sequence:

```text
intent created
→ subtle receipt print-in
→ transaction observed
→ evidence lines appear
→ invariant checks resolve one-by-one
→ receipt seals
```

Use:

- 150–250ms micro-interactions
- 400–800ms major state transitions
- spring only when natural
- opacity/translate/scale combinations
- no flashy particle systems

Motion is part of the narrative.

---

# 36. MOBILE-FIRST RULE

Target the Mini App shell first.

Design around:

```text
360px
390px
430px
```

Then support:

```text
768px
1024px
1440px+
```

No horizontal scroll.

No fixed desktop dashboard assumptions.

The core payment action must be reachable with one thumb.

---

# 37. PLAYWRIGHT QA

Create:

```text
tests/e2e/
```

Run Chromium against:

## Mobile

- 360 × 800
- 390 × 844
- 430 × 932

## Tablet

- 768 × 1024

## Desktop

- 1280 × 800
- 1440 × 900

Also simulate:

- iPhone-sized viewport
- Android-sized viewport

Test:

- landing
- create request
- payment request
- verification states
- receipt
- tampered receipt
- proof page
- error state
- loading state

Assert:

- no overflow
- no clipped text
- no overlapping artwork
- no invisible CTA
- no layout shift destroying readability
- no console errors
- all core controls accessible

Take screenshots during the QA pass and keep the strongest ones for the README.

---

# 38. ACCESSIBILITY

Minimum:

- semantic headings
- keyboard focus
- readable contrast
- buttons with accessible labels
- no colour-only status indicators
- reduced-motion support
- meaningful error text

---

# 39. ERROR DESIGN

Never:

```text
Something went wrong.
```

Use:

```text
Payment found, but the amount does not match this request.
```

or:

```text
The transaction exists but has not reached the required finality yet.
```

or:

```text
We found a receipt, but its integrity digest does not match.
```

Make every error actionable.

---

# 40. README

Use this exact structure.

```md
# Provenim

[badges]

> Know exactly what got paid.

[one sentence, human-first]

[landing page hero screenshot]

## Product Links

| Product | Link |
|---|---|
| Live App | ... |
| Open in Nimiq Pay | ... |
| Proof | ... |
| Verify a Receipt | ... |
| GitHub | ... |
| Demo Video | ... |

## Screenshots

[2x2 equal-grid of 4 polished product screenshots]

## The Problem

[merchant problem]

## The Solution

[Provenim outcome]

## Explore in 2 Minutes

1. Create request
2. Pay in Nimiq Pay
3. Watch verification
4. Open proof receipt

## Why Nimiq Pay Matters

Explain the wallet/payment integration in human terms.

## The Discovery

Explain the verified infrastructure observation.

## The Guarantee

State the invariants.

## How It Works

[Mermaid]

## Product Flow

[Mermaid]

## Proof

Link to /proof and verifier CLI.

## Attack Campaign

[table of break tests]

## Evidence

Transaction hashes, receipts, test results, measured observations.

## Architecture

[Mermaid]

## ASCII Runtime

[ASCII]

## Nimiq Integration

Exact provider APIs used.

## Target User

Role + pain + new workflow + repeat use.

## What's New

What was built during this competition.

## Security / Privacy

What is stored, what is public, what is not.

## Local Setup

Minimal reproducible setup.

## Verification

How to independently verify a receipt.

## Built With

Stack + licenses.

## Roadmap

Post-hackathon product direction.

## License

MIT
```

---

# 41. 20-SECOND JUDGE STORY

Use this exact structure in the demo.

## 0–5 sec

> “A merchant shouldn't have to trust a screenshot or a browser saying ‘paid’.”

## 5–10 sec

> “Provenim creates a payment request and verifies the actual NIM transaction against the chain.”

## 10–15 sec

> “When the payment path is mediated, we resolve the transaction-level provenance instead of trusting ordinary address history.”

## 15–20 sec

> “Then we seal a receipt anyone can independently verify.”

Do not explain the whole architecture in the opening.

---

# 42. THREE-MINUTE DEMO SCRIPT

## 0:00–0:20

Problem + product

## 0:20–0:50

Create request

## 0:50–1:20

Open in Nimiq Pay and perform real testnet payment

## 1:20–1:45

Show live verification steps

## 1:45–2:05

Show sealed receipt

## 2:05–2:25

Open independent verifier

## 2:25–2:45

Tamper with the receipt

## 2:45–3:00

Show rejection + one-sentence reason

End:

> “The browser never decides that money arrived. Evidence does.”

---

# 43. TASK.MD / EXECUTION PHASES

Create and keep current:

```text
TASK.md
PROGRESS.md
MILESTONES.md
DISCOVERY.md
EVIDENCE.md
PROOF.md
CLAIMS.md
ATTACKS.md
DECISIONS.md
```

## Phase 0 — Discovery / verification

No polished UI.

Deliver:

- discovery experiment
- real Nimiq Pay payment capture
- RPC evidence
- address-history vs tx-hash comparison
- finality observation
- provenance mechanism proof
- unknowns resolved or explicitly marked UNKNOWN

Gate:

```text
[ ] contradiction reproduced
[ ] evidence saved
[ ] exact payment shape understood
[ ] provenance resolution method verified
```

Do not proceed until this gate passes.

## Phase 1 — Core domain

Build:

- intent model
- canonicalization
- digest
- invariants
- state machine
- pure verifier
- tests

Gate:

```text
[ ] all domain tests pass
[ ] receipt spec written
[ ] verifier works from fixtures
```

## Phase 2 — Real chain integration

Build:

- Nimiq RPC adapter
- payment watcher
- finality resolver
- provenance resolver
- reconciliation worker

Gate:

```text
[ ] real payment settles
[ ] app interruption recovers
[ ] wrong payment rejects
```

## Phase 3 — Product

Build:

- create request
- pay
- status
- receipt
- verify
- history

Gate:

```text
[ ] one complete human flow works end-to-end
```

## Phase 4 — Attack campaign

Run every attack.

Gate:

```text
[ ] all expected rejects reject
[ ] recovery path recovers
[ ] no false settlement observed
```

## Phase 5 — Premium UI

Build:

- landing
- editorial motion
- proof visualization
- receipt artifact
- responsive layouts

Gate:

```text
[ ] desktop polished
[ ] phone polished
[ ] no feature omitted
```

## Phase 6 — Evidence / proof

Build:

- proof route
- receipt verifier
- claim registry
- evidence artifacts
- benchmark table

Gate:

```text
[ ] judge can reproduce the core claim
```

## Phase 7 — QA / ship

- Playwright all viewports
- performance
- accessibility
- deployment
- live Mini App test
- README
- demo video
- submission

---

# 44. DECISION RULES

When faced with a new feature, ask:

> Does this strengthen payment provenance, verification, recovery, proof, merchant usefulness, or repeat value?

If no:

**Do not build it.**

If yes:

Implement it only if it can be fully completed and tested.

---

# 45. DO NOT BUILD

Unless a discovery proves a requirement, do not build:

- social feed
- token
- NFT
- loyalty system
- AI chatbot
- giant analytics suite
- generic invoice marketplace
- multi-chain bridge
- custodial wallet
- unnecessary admin panels
- fake “AI verification”
- speculative fraud score
- meaningless badges
- generic leaderboard

The product is about one hard problem.

---

# 46. SECURITY BOUNDARY

Never put:

- private keys
- RPC admin credentials
- database credentials
- session secrets
- deployment tokens

in the public repository.

Frontend is untrusted.

Backend is the policy interpreter.

RPC is the external source of blockchain evidence.

Database is storage, not truth.

---

# 47. DATABASE

Minimum tables:

```text
users
payment_intents
payment_observations
settlements
receipts
verification_attempts
```

Store sufficient evidence to explain a decision.

Do not store more personal information than needed.

---

# 48. OBSERVABILITY

Every verification attempt should have a request/trace identifier.

Structured log fields:

```text
traceId
intentId
txHash
verificationVersion
outcome
reasonCode
timestamp
```

Never log:

- secrets
- private keys
- raw session tokens
- sensitive personal data

---

# 49. PERFORMANCE

Target:

- landing page interactive quickly
- verification status visible immediately
- no blocking spinner for the entire experience
- chain polling with backoff
- no uncontrolled RPC storm
- cache immutable transaction data

---

# 50. SUBMISSION CRITERIA MAPPING

The current competition uses five scored categories:

## Functionality, reliability and usefulness — 45

Provenim must demonstrate:

- core payment request
- real settlement
- independent verification
- clear failure handling
- recovery
- practical merchant usefulness
- repeatable receipts

## Nimiq Pay and Nimiq integration — 25

Use Nimiq Pay as the actual payment environment.

Use NIM.

Use:

- `@nimiq/mini-app-sdk`
- `init()`
- account access
- real payment request through provider
- Nimiq transaction verification
- Nimiq-specific chain evidence

The integration must be load-bearing.

## Real usage — 15

Seed the app with real testnet usage.

Capture:

- number of real payment attempts
- successful verifications
- failed/tampered tests
- returning sessions
- user feedback

Never fabricate usage.

## Design and UX — 10

Premium mobile-first editorial interface.

## Builder promotion checklist — 5

Maintain:

- public build updates
- community participation
- demo content
- launch post
- user feedback

---

# 51. THE FINAL QUALITY TEST

Before submission, a neutral person must be able to answer in under 20 seconds:

```text
What is Provenim?
Who is it for?
What painful problem does it solve?
Why does Nimiq Pay matter?
```

A technical judge must be able to answer in under 2 minutes:

```text
What was discovered?
What is the invariant?
Where is the verifier?
What breaks?
Where is the evidence?
```

A skeptical judge must be able to:

```text
download receipt
→ run verifier
→ inspect tx
→ reproduce result
```

If any answer is “trust our backend”, the project is not done.

---

# 52. FINAL THESIS

The project is not:

> “another payment app.”

The project is:

> **A merchant payment product built around a stronger definition of “paid”: not a browser callback, not a database flag, and not an assumed wallet history — but a reproducible chain-evidence proof.**

The strongest technical moment of the demo should be:

```text
PAYMENT
   ↓
NIMIQ PAY
   ↓
TRANSACTION
   ↓
PROVENANCE RESOLUTION
   ↓
INVARIANT CHECKS
   ↓
PROOF SEALED
   ↓
RECEIPT
   ↓
INDEPENDENT VERIFICATION
```

And the strongest failure moment should be:

```text
TAMPERED RECEIPT
        ↓
DIGEST MISMATCH
        ↓
REJECTED
```

That is the build.

Do not dilute it.

Do not make the architecture bigger than the thesis.

Make the mechanism real.
Make the proof reproducible.
Make the product beautiful.
Make the first 20 seconds obvious.
