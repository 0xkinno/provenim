/**
 * Transaction memo schema:
 * PRV2:<intent-id>:<short integrity token>
 * Also supports PRV1 for backward compatibility.
 */

export function generatePaymentMemo(intentId: string, intentDigest: string): string {
  // Use first 8 characters of intent digest as integrity token
  const token = intentDigest.slice(0, 8);
  return `PRV2:${intentId}:${token}`;
}

export function parsePaymentMemo(memo: string): {
  valid: boolean;
  version?: 'PRV1' | 'PRV2';
  intentId?: string;
  token?: string;
  raw?: string;
} {
  if (!memo || typeof memo !== 'string') {
    return { valid: false };
  }

  // Handle hex string if RPC returns hex-encoded data
  let text = memo.trim();
  if (/^[0-9a-fA-F]+$/.test(text) && text.length % 2 === 0) {
    try {
      let decoded = '';
      for (let i = 0; i < text.length; i += 2) {
        decoded += String.fromCharCode(parseInt(text.substring(i, i + 2), 16));
      }
      if (decoded.startsWith('PRV2:') || decoded.startsWith('PRV1:')) {
        text = decoded;
      }
    } catch {
      // not hex text
    }
  }

  const parts = text.split(':');
  if (parts.length === 3 && (parts[0] === 'PRV2' || parts[0] === 'PRV1')) {
    return {
      valid: true,
      version: parts[0] as 'PRV1' | 'PRV2',
      intentId: parts[1],
      token: parts[2],
      raw: text
    };
  }

  return { valid: false, raw: text };
}
