import { LUNA_PER_NIM } from '@provenim/shared';

/**
 * Pure integer Luna arithmetic module.
 * 1 NIM = 100,000 Luna.
 * Avoids any IEEE-754 floating point imprecision.
 */

export function nimStringToLuna(nimStr: string): bigint {
  const trimmed = nimStr.trim();
  if (!/^\d+(\.\d{1,5})?$/.test(trimmed)) {
    throw new Error(`Invalid NIM amount format: "${nimStr}". Expected up to 5 decimal places.`);
  }

  const parts = trimmed.split('.');
  const whole = BigInt(parts[0]);
  let fractionStr = parts[1] || '';
  
  // Pad fraction to 5 digits (e.g. .5 -> 50000)
  while (fractionStr.length < 5) {
    fractionStr += '0';
  }
  const fraction = BigInt(fractionStr);

  return whole * LUNA_PER_NIM + fraction;
}

export function lunaToNimString(luna: bigint | string | number): string {
  const lunaBig = BigInt(luna);
  const whole = lunaBig / LUNA_PER_NIM;
  const fraction = lunaBig % LUNA_PER_NIM;

  if (fraction === 0n) {
    return whole.toString();
  }

  let fractionStr = fraction.toString();
  while (fractionStr.length < 5) {
    fractionStr = '0' + fractionStr;
  }
  // Remove trailing zeros
  fractionStr = fractionStr.replace(/0+$/, '');

  return `${whole}.${fractionStr}`;
}

export function formatLunaDisplay(luna: bigint | string | number): string {
  const nim = lunaToNimString(luna);
  return `${nim} NIM`;
}
