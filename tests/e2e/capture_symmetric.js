import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';

const CHROMIUM_PATH = 'C:\\Users\\hp\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const TARGET_DIR = path.resolve('docs/screenshots');

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

// Exactly 1440 x 820 landscape viewport for perfect symmetry and equal height/width
const VIEWPORT = { width: 1440, height: 820 };

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await new Promise((resolve) => {
        const req = http.get(url, (res) => {
          resolve(res.statusCode >= 200 && res.statusCode < 400);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(1500, () => {
          req.destroy();
          resolve(false);
        });
      });
      if (ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function run() {
  console.log('Capturing symmetric landscape screenshots (1440x820)...');

  const e2eDbPath = path.resolve('provenim_screen.db');
  for (const f of [e2eDbPath, `${e2eDbPath}-wal`, `${e2eDbPath}-shm`]) {
    if (fs.existsSync(f)) {
      try { fs.unlinkSync(f); } catch {}
    }
  }

  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };

  const distDir = path.resolve('apps/web/dist');
  const webServer = http.createServer((req, res) => {
    let filePath = path.join(distDir, req.url.split('?')[0]);
    if (filePath.endsWith('/') || !path.extname(filePath)) {
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      } else if (!fs.existsSync(filePath)) {
        filePath = path.join(distDir, 'index.html');
      }
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      fs.createReadStream(path.join(distDir, 'index.html')).pipe(res);
    }
  });

  await new Promise((resolve) => webServer.listen(5174, resolve));
  console.log('Web server listening on port 5174');

  const apiProcess = spawn('node', ['--experimental-sqlite', 'apps/api/dist/index.js'], {
    env: { ...process.env, PORT: '3001', DATABASE_URL: `file:${e2eDbPath}` },
    stdio: 'ignore'
  });

  try {
    await waitForServer('http://localhost:3001/api/health');
    console.log('Servers ready. Launching Chromium...');

    const browser = await chromium.launch({
      executablePath: CHROMIUM_PATH,
      headless: true
    });

    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();

    const receiptJson = fs.readFileSync(path.resolve('evidence/receipt.json'), 'utf8');

    // 1. Landing Overview (Landscape Banner & Table Image 1)
    console.log('1. Capturing Landing Overview (1440x820)...');
    await page.goto('http://localhost:5174/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(TARGET_DIR, '01_landing_overview.png'),
      fullPage: false
    });

    // 1b. New Order Page (Table Image 1)
    console.log('1b. Capturing New Order Screen (1440x820)...');
    await page.click('button:has-text("Create payment request")');
    await page.waitForSelector('text=New Payment Request');
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(TARGET_DIR, '01_create_order.png'),
      fullPage: false
    });

    // 2. Payment Request & Dual QR (Table Image 2)
    console.log('2. Capturing Payment Request (1440x820)...');
    await page.fill('input[placeholder="12.50"]', '18.01422');
    await page.fill('input[placeholder="e.g. ORDER-1042"]', 'ORDER-DESKTOP-E2E');
    await page.click('button[type="submit"]:has-text("Create payment request")');
    await page.waitForSelector('text=Transaction Memo', { timeout: 10000 });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(TARGET_DIR, '02_payment_request.png'),
      fullPage: false
    });

    // 3. Independent Receipt Verifier (Table Image 3)
    console.log('3. Capturing Receipt Verifier (1440x820)...');
    await page.click('nav button:has-text("Verify Receipt")');
    await page.waitForSelector('text=Verify Payment Receipt');
    await page.fill('textarea', receiptJson);
    await page.waitForTimeout(300);
    await page.click('button:has-text("Run Verification")');
    await page.waitForSelector('text=VERIFIED (AUTHENTIC)', { timeout: 15000 });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(TARGET_DIR, '03_receipt_verifier.png'),
      fullPage: false
    });

    // 4. Dynamic Evidence Manifest & Consensus Ledger (Table Image 4)
    console.log('4. Capturing Proof & Evidence Registry (1440x820)...');
    await page.click('nav button:has-text("Proof & Chain")');
    await page.waitForSelector('text=Dynamic Evidence Manifest');
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(TARGET_DIR, '04_proof_registry.png'),
      fullPage: false
    });

    await browser.close();
    console.log('All 4 symmetric landscape screenshots captured successfully!');
  } finally {
    try { apiProcess.kill(); } catch {}
    try { webServer.close(); } catch {}
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
