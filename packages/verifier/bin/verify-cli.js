#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In dev/monorepo, we import from dist or compile
async function run() {
  const args = process.argv.slice(2);
  const targetFile = args[0];

  if (!targetFile) {
    console.error('Usage: npm run verify:receipt -- <path/to/receipt.json> [rpcUrl]');
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), targetFile);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at "${filePath}"`);
    process.exit(1);
  }

  let receiptData;
  try {
    receiptData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`Error parsing JSON: ${err.message}`);
    process.exit(1);
  }

  console.log('\n======================================================================');
  console.log('                     PROVENIM DETERMINISTIC VERIFIER                  ');
  console.log('======================================================================');
  console.log(`Receipt ID:         ${receiptData.receiptId || 'UNKNOWN'}`);
  console.log(`Verifying file:     ${targetFile}`);

  // Dynamic import of verifier logic
  let verifyFn;
  try {
    const mod = await import('../dist/verifier.js');
    verifyFn = mod.verifyReceiptIndependently;
  } catch {
    // If not built yet, load with tsx or inline minimal verification
    const { verifyReceiptIndependently } = await import('../dist/verifier.js');
    verifyFn = verifyReceiptIndependently;
  }

  const customRpc = args[1] || process.env.NIMIQ_RPC_URL || 'https://rpc.nimiqwatch.com';
  console.log(`RPC Node:           ${customRpc}`);
  console.log('----------------------------------------------------------------------');

  const verdict = await verifyFn({
    receipt: receiptData,
    rpcUrl: customRpc
  });

  console.log(`Receipt Digest:     ${verdict.receiptDigestMatch ? 'PASS' : 'FAIL'}`);
  console.log(`Transaction Found:  ${verdict.transactionFound ? 'FOUND' : 'NOT FOUND'}`);

  for (const [code, inv] of Object.entries(verdict.invariants)) {
    console.log(`${inv.name.padEnd(20)}: ${inv.status.padEnd(5)} (${inv.message})`);
  }

  console.log('======================================================================');
  console.log(`VERDICT:            ${verdict.verdict === 'VERIFIED' ? 'VERIFIED (PASS)' : 'REJECTED (FAIL)'}`);
  if (verdict.failureReason) {
    console.log(`REASON:             ${verdict.failureReason}`);
  }
  console.log('======================================================================\n');

  if (verdict.verdict !== 'VERIFIED') {
    process.exit(2);
  }
}

run().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
