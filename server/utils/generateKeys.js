import crypto from 'node:crypto';
export const generateKey=(days=30)=>{const part=()=>crypto.randomBytes(3).toString('hex').toUpperCase();return `TRIV-${part()}-${part()}-${Number(days)}D`;};
