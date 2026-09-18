# PROVENIM — PROOF & REPRODUCTION GUIDE (PROOF.md)

## 1. What Provenim Proves

Provenim proves:
1. Exactly which transaction fulfilled a payment intent.
2. That the payment reached the intended merchant address.
3. That the exact integer Luna value was transferred.
4. That the transaction executed successfully on the Nimiq blockchain.
5. That the transaction reached the required finality threshold.
6. That the payment has not been fulfilled before or replayed.
7. That anyone can independently verify the receipt without trusting Provenim.

---

## 2. Independent Reproduction CLI

Anyone can independently verify a Provenim receipt without running the web UI:

```bash
# 1. Install dependencies
npm install

# 2. Run standalone verifier on a receipt
npm run verify:receipt -- ./evidence/receipt.json
```

### Expected Verifier Output
```text
======================================================================
                     PROVENIM DETERMINISTIC VERIFIER
======================================================================
Receipt ID:         PRV-SAMPLE-001
Receipt Version:    provenim.receipt.v1
Canonical Digest:   PASS (b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9)
Transaction Hash:   55aa49633c4a362699ef06c741e62c41581f34db761886ba0303dd29c6704379
RPC Fetch:          SUCCESS (Found on block 61861200)
Network:            PASS (NetworkId: 24)
Recipient Exact:    PASS (NQ26 0000 0000 02A5 YAK7 4QNF 9MH0 TE2B GVRU)
Amount Exact:       PASS (1801422 Luna / 18.01422 NIM)
Execution Status:   PASS (Success)
Finality:           PASS (Confirmed)
Provenance Mode:    DIRECT
Intent Binding:     PASS
======================================================================
VERDICT:            VERIFIED (PASS)
======================================================================
```
