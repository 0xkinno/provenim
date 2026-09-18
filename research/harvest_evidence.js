const fs = require('fs');
const path = require('path');

const RPC_URL = 'https://rpc.nimiqwatch.com';

async function rpcCall(method, params = [], retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method, params, id: Date.now() })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      return await res.json();
    } catch (err) {
      console.warn(`Attempt ${i + 1} for ${method} failed: ${err.message}. Retrying...`);
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1500 * (i + 1)));
    }
  }
}

async function main() {
  console.log('--- Phase 0: Harvesting Empirical Blockchain Evidence ---');
  
  // 1. Latest block number
  const blockNumResp = await rpcCall('getBlockNumber');
  const latestBlock = blockNumResp.result.data;
  console.log('Latest block number:', latestBlock);
  fs.writeFileSync(
    path.join(__dirname, 'evidence', 'rpc_getBlockNumber.json'),
    JSON.stringify(blockNumResp, null, 2)
  );

  // 2. Fetch known confirmed block with transactions
  const targetBlock = 61861200;
  console.log('Fetching block with transactions at height:', targetBlock);
  const blockResp = await rpcCall('getBlockByNumber', [targetBlock, true]);
  fs.writeFileSync(
    path.join(__dirname, 'evidence', 'rpc_getBlockByNumber.json'),
    JSON.stringify(blockResp, null, 2)
  );

  const txs = blockResp.result?.data?.transactions || [];
  console.log(`Found ${txs.length} transactions in block ${targetBlock}`);

  const chosenTx = txs[0];
  console.log('Chosen transaction hash for deep inspection:', chosenTx.hash);
  fs.writeFileSync(
    path.join(__dirname, 'evidence', 'sample_tx_summary.json'),
    JSON.stringify(chosenTx, null, 2)
  );

  // 3. getTransactionByHash
  console.log('Fetching getTransactionByHash for:', chosenTx.hash);
  const txByHashResp = await rpcCall('getTransactionByHash', [chosenTx.hash]);
  fs.writeFileSync(
    path.join(__dirname, 'evidence', 'rpc_getTransactionByHash.json'),
    JSON.stringify(txByHashResp, null, 2)
  );

  // 4. getTransactionsByAddress for recipient
  console.log('Fetching getTransactionsByAddress for recipient:', chosenTx.to);
  const txsByAddrResp = await rpcCall('getTransactionsByAddress', [chosenTx.to, 10, null]);
  fs.writeFileSync(
    path.join(__dirname, 'evidence', 'rpc_getTransactionsByAddress.json'),
    JSON.stringify(txsByAddrResp, null, 2)
  );

  // 5. getAccountByAddress
  console.log('Fetching getAccountByAddress for recipient:', chosenTx.to);
  const accResp = await rpcCall('getAccountByAddress', [chosenTx.to]);
  fs.writeFileSync(
    path.join(__dirname, 'evidence', 'rpc_getAccountByAddress.json'),
    JSON.stringify(accResp, null, 2)
  );

  console.log('--- Evidence harvesting completed successfully ---');
}

main().catch(err => {
  console.error('Harvesting failed:', err);
  process.exit(1);
});
