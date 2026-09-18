import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';

const CHROMIUM_PATH = 'C:\\Users\\hp\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const SCREENSHOTS_DIR = path.resolve('tests/e2e/screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const VIEWPORTS = {
  mobile_small: { width: 360, height: 800, name: 'Mobile 360x800' },
  mobile_iphone: { width: 390, height: 844, name: 'iPhone 14 390x844' },
  mobile_large: { width: 430, height: 932, name: 'iPhone 14 Pro Max 430x932' },
  tablet: { width: 768, height: 1024, name: 'Tablet 768x1024' },
  desktop_laptop: { width: 1280, height: 800, name: 'Laptop 1280x800' },
  desktop_hd: { width: 1440, height: 900, name: 'Desktop HD 1440x900' }
};

// Wait for a URL to respond with HTTP 200
async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await new Promise((resolve) => {
        const req = http.get(url, (res) => {
          resolve(res.statusCode >= 200 && res.statusCode < 400);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(1000, () => {
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

async function runE2EAudit() {
  console.log('====================================================');
  console.log('       PROVENIM PLAYWRIGHT MULTI-VIEWPORT E2E AUDIT ');
  console.log('====================================================');
  console.log(`Chromium Binary: ${CHROMIUM_PATH}`);

  // Clean test database for fresh run
  const e2eDbPath = path.resolve('provenim_e2e.db');
  for (const f of [e2eDbPath, `${e2eDbPath}-wal`, `${e2eDbPath}-shm`]) {
    if (fs.existsSync(f)) {
      try { fs.unlinkSync(f); } catch {}
    }
  }

  // 1. Start API Server with clean DB
  console.log('Launching API server (port 3001)...');
  const apiProcess = spawn('node', ['--experimental-sqlite', 'apps/api/dist/index.js'], {
    env: { ...process.env, PORT: '3001', DATABASE_URL: `file:${e2eDbPath}` },
    stdio: 'inherit'
  });

  // 2. Start Web Server
  console.log('Launching Web preview server (port 5173)...');
  const webProcess = spawn('npx.cmd', ['vite', 'preview', '--port', '5173', '--strictPort'], {
    cwd: path.resolve('apps/web'),
    shell: true,
    stdio: 'inherit'
  });

  try {
    await waitForServer('http://localhost:3001/api/health');
    console.log('[OK] API Server is healthy and listening on port 3001.');
    await waitForServer('http://localhost:5173');
    console.log('[OK] Web Preview Server is ready on port 5173.');

    const browser = await chromium.launch({
      executablePath: CHROMIUM_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    console.log('[OK] Chromium launched successfully.');

    const auditResults = [];

    // Helper to check horizontal overflow
    async function checkOverflow(page, screenName, viewportName) {
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      if (overflow) {
        console.warn(`  [!] HORIZONTAL OVERFLOW DETECTED: ${screenName} at ${viewportName}`);
      }
      return !overflow;
    }

    // ==========================================
    // 1. DESKTOP HD VIEWPORT (1440x900)
    // ==========================================
    console.log('\n--- Auditing Desktop HD Viewport (1440x900) ---');
    {
      const context = await browser.newContext({ viewport: VIEWPORTS.desktop_hd });
      const page = await context.newPage();

      // Screen 1: Landing
      await page.goto('http://localhost:5173/');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_landing_desktop_hd.png'), fullPage: true });
      const landingNoOverflow = await checkOverflow(page, 'Landing', 'Desktop HD');
      auditResults.push({ screen: 'Landing', viewport: 'Desktop HD', noOverflow: landingNoOverflow });

      // Screen 2: Create Intent
      await page.click('button:has-text("Create a payment request")');
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_create_desktop_hd.png'), fullPage: true });
      const createNoOverflow = await checkOverflow(page, 'Create', 'Desktop HD');
      auditResults.push({ screen: 'Create', viewport: 'Desktop HD', noOverflow: createNoOverflow });

      // Fill in amount matching real block 61861200 transaction (18.01422 NIM)
      await page.fill('input[placeholder="12.50"]', '18.01422');
      await page.fill('input[placeholder="e.g. ORDER-1042"]', 'ORDER-DESKTOP-E2E');
      await page.click('button[type="submit"]:has-text("Create payment request")');

      // Screen 3: Payment Request & QR
      await page.waitForSelector('text=Transaction Memo');
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_payment_desktop_hd.png'), fullPage: true });
      const payNoOverflow = await checkOverflow(page, 'Payment', 'Desktop HD');
      auditResults.push({ screen: 'Payment', viewport: 'Desktop HD', noOverflow: payNoOverflow });

      // Submit real block 61861200 tx hash
      await page.click('button:has-text("Use Block 61861200 Real Tx")');
      await page.click('button:has-text("Verify Tx")');

      // Screen 4: Verification Journey Timeline
      await page.waitForSelector('text=Verifying Blockchain Evidence', { timeout: 15000 });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_journey_desktop_hd.png'), fullPage: true });
      const journeyNoOverflow = await checkOverflow(page, 'Journey', 'Desktop HD');
      auditResults.push({ screen: 'Journey', viewport: 'Desktop HD', noOverflow: journeyNoOverflow });

      // Transition to Receipt (wait for auto or click)
      const viewReceiptBtn = page.locator('button:has-text("View Sealed Proof Receipt")');
      try {
        await viewReceiptBtn.waitFor({ state: 'visible', timeout: 5000 });
        await viewReceiptBtn.click();
      } catch {}

      // Screen 5: Sealed Proof Receipt
      await page.waitForSelector('text=Cryptographic Proof Receipt', { timeout: 15000 });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_receipt_desktop_hd.png'), fullPage: true });
      const receiptNoOverflow = await checkOverflow(page, 'Receipt', 'Desktop HD');
      auditResults.push({ screen: 'Receipt', viewport: 'Desktop HD', noOverflow: receiptNoOverflow });

      // Screen 6: Independent Verifier
      await page.click('nav button:has-text("Verify Receipt")');
      await page.waitForSelector('text=Verify Payment Receipt');
      await page.waitForTimeout(600);
      // Load sample
      await page.click('button:has-text("Load Sample")');
      await page.click('button:has-text("Run Verification")');
      await page.waitForSelector('text=VERIFIED (AUTHENTIC)', { timeout: 15000 });
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_verifier_verified_desktop_hd.png'), fullPage: true });
      const verifierNoOverflow = await checkOverflow(page, 'Verifier', 'Desktop HD');
      auditResults.push({ screen: 'Verifier', viewport: 'Desktop HD', noOverflow: verifierNoOverflow });

      // Screen 7: Tamper Test in Verifier
      await page.click('button:has-text("Tamper Test")');
      await page.click('button:has-text("Run Verification")');
      await page.waitForSelector('text=VERIFICATION FAILED', { timeout: 15000 });
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_verifier_tampered_desktop_hd.png'), fullPage: true });

      // Screen 8: Live Proof & Evidence Registry
      await page.click('nav button:has-text("Proof & Chain")');
      await page.waitForSelector('text=Live Evidence & Verification Registry');
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_proof_desktop_hd.png'), fullPage: true });
      const proofNoOverflow = await checkOverflow(page, 'Proof', 'Desktop HD');
      auditResults.push({ screen: 'Proof', viewport: 'Desktop HD', noOverflow: proofNoOverflow });

      // Screen 9: Merchant History Ledger
      await page.click('nav button:has-text("Ledger")');
      await page.waitForSelector('text=Payment History & Receipts');
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09_history_desktop_hd.png'), fullPage: true });
      const historyNoOverflow = await checkOverflow(page, 'History', 'Desktop HD');
      auditResults.push({ screen: 'History', viewport: 'Desktop HD', noOverflow: historyNoOverflow });

      await context.close();
    }

    // ==========================================
    // 2. LAPTOP VIEWPORT (1280x800)
    // ==========================================
    console.log('\n--- Auditing Laptop Viewport (1280x800) ---');
    {
      const context = await browser.newContext({ viewport: VIEWPORTS.desktop_laptop });
      const page = await context.newPage();

      await page.goto('http://localhost:5173/');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10_landing_laptop_1280.png'), fullPage: true });
      const laptopLandingNoOverflow = await checkOverflow(page, 'Landing', 'Laptop 1280x800');
      auditResults.push({ screen: 'Landing', viewport: 'Laptop 1280x800', noOverflow: laptopLandingNoOverflow });

      await context.close();
    }

    // ==========================================
    // 3. TABLET VIEWPORT (768x1024)
    // ==========================================
    console.log('\n--- Auditing Tablet Viewport (768x1024) ---');
    {
      const context = await browser.newContext({ viewport: VIEWPORTS.tablet });
      const page = await context.newPage();

      await page.goto('http://localhost:5173/');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11_landing_tablet_768.png'), fullPage: true });
      const tabletLandingNoOverflow = await checkOverflow(page, 'Landing', 'Tablet 768x1024');
      auditResults.push({ screen: 'Landing', viewport: 'Tablet 768x1024', noOverflow: tabletLandingNoOverflow });

      await context.close();
    }

    // ==========================================
    // 4. MOBILE IPHONE 14 VIEWPORT (390x844)
    // ==========================================
    console.log('\n--- Auditing Mobile iPhone 14 Viewport (390x844) ---');
    {
      const context = await browser.newContext({
        viewport: VIEWPORTS.mobile_iphone,
        isMobile: true,
        hasTouch: true
      });
      const page = await context.newPage();

      // Mobile Landing
      await page.goto('http://localhost:5173/');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12_landing_mobile_iphone_390.png'), fullPage: true });
      const mobileLandingNoOverflow = await checkOverflow(page, 'Landing', 'iPhone 14 (390px)');
      auditResults.push({ screen: 'Landing', viewport: 'iPhone 14 (390px)', noOverflow: mobileLandingNoOverflow });

      // Mobile Create Screen
      await page.click('button:has-text("Create a payment request")');
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '13_create_mobile_iphone_390.png'), fullPage: true });
      const mobileCreateNoOverflow = await checkOverflow(page, 'Create', 'iPhone 14 (390px)');
      auditResults.push({ screen: 'Create', viewport: 'iPhone 14 (390px)', noOverflow: mobileCreateNoOverflow });

      // Create intent on mobile (use 1 NIM for preset)
      await page.fill('input[placeholder="12.50"]', '1');
      await page.fill('input[placeholder="e.g. ORDER-1042"]', 'ORDER-IPHONE-E2E');
      await page.click('button[type="submit"]:has-text("Create payment request")');

      // Mobile Payment Screen
      await page.waitForSelector('text=Transaction Memo');
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '14_payment_mobile_iphone_390.png'), fullPage: true });
      const mobilePayNoOverflow = await checkOverflow(page, 'Payment', 'iPhone 14 (390px)');
      auditResults.push({ screen: 'Payment', viewport: 'iPhone 14 (390px)', noOverflow: mobilePayNoOverflow });

      // Open History/Ledger and click settled receipt to view mobile receipt card
      await page.locator('button:has-text("Ledger"):visible').click();
      await page.waitForSelector('button:has-text("View Proof")', { timeout: 10000 });
      const viewProofBtn = page.locator('button:has-text("View Proof"):visible').first();
      await viewProofBtn.click();
      await page.waitForSelector('text=Cryptographic Proof Receipt', { timeout: 10000 });
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '15_receipt_mobile_iphone_390.png'), fullPage: true });
      const mobileReceiptNoOverflow = await checkOverflow(page, 'Receipt', 'iPhone 14 (390px)');
      auditResults.push({ screen: 'Receipt', viewport: 'iPhone 14 (390px)', noOverflow: mobileReceiptNoOverflow });

      await context.close();
    }

    // ==========================================
    // 5. MOBILE SMALL VIEWPORT (360x800)
    // ==========================================
    console.log('\n--- Auditing Mobile Small Viewport (360x800) ---');
    {
      const context = await browser.newContext({
        viewport: VIEWPORTS.mobile_small,
        isMobile: true,
        hasTouch: true
      });
      const page = await context.newPage();

      await page.goto('http://localhost:5173/');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '16_landing_mobile_small_360.png'), fullPage: true });
      const smallLandingNoOverflow = await checkOverflow(page, 'Landing', 'Mobile Small (360px)');
      auditResults.push({ screen: 'Landing', viewport: 'Mobile Small (360px)', noOverflow: smallLandingNoOverflow });

      await context.close();
    }

    // ==========================================
    // 6. MOBILE LARGE VIEWPORT (430x932)
    // ==========================================
    console.log('\n--- Auditing Mobile Large Viewport (430x932) ---');
    {
      const context = await browser.newContext({
        viewport: VIEWPORTS.mobile_large,
        isMobile: true,
        hasTouch: true
      });
      const page = await context.newPage();

      await page.goto('http://localhost:5173/');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '17_landing_mobile_large_430.png'), fullPage: true });
      const largeLandingNoOverflow = await checkOverflow(page, 'Landing', 'Mobile Large (430px)');
      auditResults.push({ screen: 'Landing', viewport: 'Mobile Large (430px)', noOverflow: largeLandingNoOverflow });

      await context.close();
    }

    await browser.close();

    console.log('\n====================================================');
    console.log('                 AUDIT SUMMARY TABLE                ');
    console.log('====================================================');
    let allPassed = true;
    for (const r of auditResults) {
      const status = r.noOverflow ? 'PASS' : 'FAIL';
      if (!r.noOverflow) allPassed = false;
      console.log(`[${status}] ${r.screen.padEnd(12)} | ${r.viewport}`);
    }
    console.log('====================================================\n');

    if (!allPassed) {
      console.error('Audit failed: Horizontal overflow detected on one or more viewports.');
      process.exit(1);
    } else {
      console.log('ALL E2E VIEWPORT AUDITS PASSED WITH ZERO HORIZONTAL OVERFLOW!');
      console.log(`Proof screenshots saved to: ${SCREENSHOTS_DIR}`);
    }
  } finally {
    apiProcess.kill();
    webProcess.kill();
  }
}

runE2EAudit().catch((err) => {
  console.error('Fatal E2E Audit error:', err);
  process.exit(1);
});
