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
    await new Promise((r) => setTimeout(r, 600));
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

    const receiptJson = fs.readFileSync(path.resolve('evidence/receipt.json'), 'utf8');

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
      await page.click('button:has-text("Create payment request")');
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_create_desktop_hd.png'), fullPage: true });
      const createNoOverflow = await checkOverflow(page, 'Create', 'Desktop HD');
      auditResults.push({ screen: 'Create', viewport: 'Desktop HD', noOverflow: createNoOverflow });

      // Fill in amount
      await page.fill('input[placeholder="12.50"]', '18.01422');
      await page.fill('input[placeholder="e.g. ORDER-1042"]', 'ORDER-DESKTOP-E2E');
      await page.click('button[type="submit"]:has-text("Create payment request")');

      // Screen 3: Payment Request & Dual QR
      await page.waitForSelector('text=Transaction Memo', { timeout: 10000 });
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_payment_desktop_hd.png'), fullPage: true });
      const payNoOverflow = await checkOverflow(page, 'Payment', 'Desktop HD');
      auditResults.push({ screen: 'Payment', viewport: 'Desktop HD', noOverflow: payNoOverflow });

      // Screen 4: Independent Verifier
      await page.click('nav button:has-text("Verify Receipt")');
      await page.waitForSelector('text=Verify Payment Receipt');
      await page.waitForTimeout(500);

      // Paste genuine receipt into verifier textarea
      await page.fill('textarea', receiptJson);
      await page.waitForTimeout(300);
      await page.click('button:has-text("Run Verification")');
      await page.waitForSelector('text=VERIFIED (AUTHENTIC)', { timeout: 15000 });
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_verifier_verified_desktop_hd.png'), fullPage: true });
      const verifierNoOverflow = await checkOverflow(page, 'Verifier', 'Desktop HD');
      auditResults.push({ screen: 'Verifier', viewport: 'Desktop HD', noOverflow: verifierNoOverflow });

      // Screen 5: Tamper Test in Verifier
      await page.click('button:has-text("Tamper +1 Luna")');
      await page.waitForTimeout(300);
      await page.click('button:has-text("Run Verification")');
      await page.waitForSelector('text=REJECTED (INVALID)', { timeout: 15000 });
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_verifier_tampered_desktop_hd.png'), fullPage: true });
      const tamperedNoOverflow = await checkOverflow(page, 'Verifier Tampered', 'Desktop HD');
      auditResults.push({ screen: 'Verifier Tampered', viewport: 'Desktop HD', noOverflow: tamperedNoOverflow });

      // Screen 6: Live Proof & Evidence Registry
      await page.click('nav button:has-text("Proof & Chain")');
      await page.waitForSelector('text=Live Evidence & Verification Registry');
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_proof_desktop_hd.png'), fullPage: true });
      const proofNoOverflow = await checkOverflow(page, 'Proof', 'Desktop HD');
      auditResults.push({ screen: 'Proof', viewport: 'Desktop HD', noOverflow: proofNoOverflow });

      // Screen 7: Merchant History Ledger
      await page.click('nav button:has-text("Ledger")');
      await page.waitForSelector('text=Payment History & Receipts');
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_history_desktop_hd.png'), fullPage: true });
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
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_landing_laptop_1280.png'), fullPage: true });
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
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09_landing_tablet_768.png'), fullPage: true });
      const tabletLandingNoOverflow = await checkOverflow(page, 'Landing', 'Tablet 768x1024');
      auditResults.push({ screen: 'Landing', viewport: 'Tablet 768x1024', noOverflow: tabletLandingNoOverflow });

      await page.click('button:has-text("Create payment request")');
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10_create_tablet_768.png'), fullPage: true });
      const tabletCreateNoOverflow = await checkOverflow(page, 'Create', 'Tablet 768x1024');
      auditResults.push({ screen: 'Create', viewport: 'Tablet 768x1024', noOverflow: tabletCreateNoOverflow });

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
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11_landing_mobile_iphone_390.png'), fullPage: true });
      const mobileLandingNoOverflow = await checkOverflow(page, 'Landing', 'iPhone 14 (390px)');
      auditResults.push({ screen: 'Landing', viewport: 'iPhone 14 (390px)', noOverflow: mobileLandingNoOverflow });

      // Mobile Create Screen
      await page.click('button:has-text("Create payment request")');
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12_create_mobile_iphone_390.png'), fullPage: true });
      const mobileCreateNoOverflow = await checkOverflow(page, 'Create', 'iPhone 14 (390px)');
      auditResults.push({ screen: 'Create', viewport: 'iPhone 14 (390px)', noOverflow: mobileCreateNoOverflow });

      // Create intent on mobile
      await page.fill('input[placeholder="12.50"]', '10.00');
      await page.fill('input[placeholder="e.g. ORDER-1042"]', 'ORDER-IPHONE-E2E');
      await page.click('button[type="submit"]:has-text("Create payment request")');

      // Mobile Payment Screen
      await page.waitForSelector('text=Transaction Memo', { timeout: 10000 });
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '13_payment_mobile_iphone_390.png'), fullPage: true });
      const mobilePayNoOverflow = await checkOverflow(page, 'Payment', 'iPhone 14 (390px)');
      auditResults.push({ screen: 'Payment', viewport: 'iPhone 14 (390px)', noOverflow: mobilePayNoOverflow });

      // Mobile Verifier Screen
      await page.locator('button:visible:has-text("Verify")').first().click();
      await page.waitForSelector('text=Verify Payment Receipt');
      await page.fill('textarea', receiptJson);
      await page.click('button:has-text("Run Verification")');
      await page.waitForSelector('text=VERIFIED (AUTHENTIC)', { timeout: 15000 });
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '14_verifier_mobile_iphone_390.png'), fullPage: true });
      const mobileVerifyNoOverflow = await checkOverflow(page, 'Verifier', 'iPhone 14 (390px)');
      auditResults.push({ screen: 'Verifier', viewport: 'iPhone 14 (390px)', noOverflow: mobileVerifyNoOverflow });

      // Mobile Proof & Evidence Manifest Screen
      await page.locator('button:visible:has-text("Proof")').first().click();
      await page.waitForSelector('text=Dynamic Evidence Manifest');
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '14b_proof_mobile_iphone_390.png'), fullPage: true });
      const mobileProofNoOverflow = await checkOverflow(page, 'Proof', 'iPhone 14 (390px)');
      auditResults.push({ screen: 'Proof', viewport: 'iPhone 14 (390px)', noOverflow: mobileProofNoOverflow });

      // Mobile Ledger Screen (Footer verification)
      await page.locator('button:visible:has-text("Ledger")').first().click();
      await page.waitForSelector('text=Payment History & Receipts');
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '14c_ledger_mobile_iphone_390.png'), fullPage: true });
      const mobileLedgerNoOverflow = await checkOverflow(page, 'Ledger', 'iPhone 14 (390px)');
      auditResults.push({ screen: 'Ledger', viewport: 'iPhone 14 (390px)', noOverflow: mobileLedgerNoOverflow });

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
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '15_landing_mobile_small_360.png'), fullPage: true });
      const smallLandingNoOverflow = await checkOverflow(page, 'Landing', 'Mobile Small (360px)');
      auditResults.push({ screen: 'Landing', viewport: 'Mobile Small (360px)', noOverflow: smallLandingNoOverflow });

      // Mobile Small Proof Screen
      await page.locator('button:visible:has-text("Proof")').first().click();
      await page.waitForSelector('text=Dynamic Evidence Manifest');
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '15b_proof_mobile_small_360.png'), fullPage: true });
      const smallProofNoOverflow = await checkOverflow(page, 'Proof', 'Mobile Small (360px)');
      auditResults.push({ screen: 'Proof', viewport: 'Mobile Small (360px)', noOverflow: smallProofNoOverflow });

      // Mobile Small Ledger Screen
      await page.locator('button:visible:has-text("Ledger")').first().click();
      await page.waitForSelector('text=Payment History & Receipts');
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '15c_ledger_mobile_small_360.png'), fullPage: true });
      const smallLedgerNoOverflow = await checkOverflow(page, 'Ledger', 'Mobile Small (360px)');
      auditResults.push({ screen: 'Ledger', viewport: 'Mobile Small (360px)', noOverflow: smallLedgerNoOverflow });

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
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '16_landing_mobile_large_430.png'), fullPage: true });
      const largeLandingNoOverflow = await checkOverflow(page, 'Landing', 'Mobile Large (430px)');
      auditResults.push({ screen: 'Landing', viewport: 'Mobile Large (430px)', noOverflow: largeLandingNoOverflow });

      await context.close();
    }

    // ==========================================
    // 7. LIVE PRODUCTION VERCEL DEPLOYMENT AUDIT
    // ==========================================
    console.log('\n--- Auditing Live Production Vercel URL (https://provenim.vercel.app) ---');
    {
      const context = await browser.newContext({ viewport: VIEWPORTS.desktop_hd });
      const page = await context.newPage();

      try {
        await page.goto('https://provenim.vercel.app/', { timeout: 20000 });
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '17_live_vercel_production.png'), fullPage: true });
        const liveNoOverflow = await checkOverflow(page, 'Live Vercel Production', 'Desktop HD');
        auditResults.push({ screen: 'Live Vercel', viewport: 'Desktop HD', noOverflow: liveNoOverflow });
        console.log('[OK] Live Vercel deployment verified successfully.');
      } catch (e) {
        console.warn('Live Vercel deployment check note:', e.message);
      }

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
      console.log(`[${status}] ${r.screen.padEnd(16)} | ${r.viewport}`);
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
    try { apiProcess.kill(); } catch {}
    try { webProcess.kill(); } catch {}
  }
}

runE2EAudit().catch((err) => {
  console.error('Fatal E2E Audit error:', err);
  process.exit(1);
});
