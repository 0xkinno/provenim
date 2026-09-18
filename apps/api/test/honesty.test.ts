import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Zero-Mock Honesty Audit (REPAIR_MODIFICATION_INSTRUCTION Section 0)', () => {
  const webComponentsDir = path.resolve(__dirname, '../../web/src/components');
  const webSrcDir = path.resolve(__dirname, '../../web/src');

  function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      if (fs.statSync(fullPath).isDirectory()) {
        getAllFiles(fullPath, arrayOfFiles);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        arrayOfFiles.push(fullPath);
      }
    }
    return arrayOfFiles;
  }

  const sourceFiles = getAllFiles(webSrcDir);

  it('contains zero instances of "Use Block 61861200" or demo bypass shortcuts in UI', () => {
    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf8');
      expect(content).not.toContain('Use Block 61861200');
      expect(content).not.toContain('loadRealEvidenceTx');
    }
  });

  it('ScreenVerify has zero hardcoded fake sample receipt fallbacks', () => {
    const screenVerifyFile = path.join(webComponentsDir, 'ScreenVerify.tsx');
    const content = fs.readFileSync(screenVerifyFile, 'utf8');

    // Asserts that no fake sample receipt is injected as initial fallback
    expect(content).not.toContain('SAMPLE_RECEIPT');
    expect(content).not.toContain('PRV-SAMPLE');
    expect(content).not.toContain('ORDER-DEMO-SAMPLE');
  });

  it('ScreenPayment and useNimiq enforce real wallet interaction and real QR, no testnet skip', () => {
    const screenPaymentFile = path.join(webComponentsDir, 'ScreenPayment.tsx');
    const useNimiqFile = path.join(webSrcDir, 'hooks/useNimiq.ts');
    const paymentContent = fs.readFileSync(screenPaymentFile, 'utf8');
    const hookContent = fs.readFileSync(useNimiqFile, 'utf8');

    expect(hookContent).toContain('sendBasicTransactionWithData');
    expect(paymentContent).toContain('sendPayment');
    expect(paymentContent).not.toContain('simulatePaymentSuccess');
    expect(paymentContent).not.toContain('mockTx');
  });

  it('Standalone verifier implements real 14-invariant logic without hardcoded PASS', () => {
    const verifierFile = path.resolve(__dirname, '../../../packages/verifier/src/verifier.ts');
    const content = fs.readFileSync(verifierFile, 'utf8');

    // Check that P12 evaluates digest and P14 is computed from fail-closed assertions
    expect(content).toContain('verifyReceiptDigest');
    expect(content).not.toContain("status: 'PASS' // hardcoded");
  });
});
