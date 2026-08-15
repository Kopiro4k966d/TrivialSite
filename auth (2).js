import crypto from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function group(length = 4) {
  const bytes = crypto.randomBytes(length);
  let value = '';
  for (const byte of bytes) value += ALPHABET[byte % ALPHABET.length];
  return value;
}

export function generateKey(days = 30) {
  const duration = Math.max(1, Math.trunc(Number(days) || 30));
  return `DECIDE-${group()}-${group()}-${group()}-${duration}D`;
}
