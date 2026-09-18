/**
 * Transaction memo schema:
 * PRV1:<intent-id>:<short integrity token>
 */

export function generatePaymentMemo(intentId: string, intentDigest: string): string {
  // Use first 8 characters of intent digest as integrity token
  const token = intentDigest.slice(0, 8);
  return `PRV1:${intentId}:${token}`;
}

export function parsePaymentMemo(memo: string): {
  valid: boolean;
  intentId?: string;
  token?: string;
} {
  if (!memo || typeof memo !== 'string') {
    return { valid: false };
  }

  // Handle hex string if RPC returns hex-encoded data
  let text = memo;
  if (/^[0-9a-fA-F]+$/.test(memo) && memo.length % 2 === 0) {
    try {
      const decoded = Buffer.from(memo, 'hex').toString('utf8');
      if (decoded.startsWith('PRV1:')) {
        text = decoded;
      }
    } catch {
      // not hex text
    }
  }

  const parts = text.split(':');
  if (parts.length === 3 && parts[0] === 'PRV1') {
    return {
      valid: true,
      intentId: parts[1],
      token: parts[2]
    };
  }

  return { valid: false };
}
