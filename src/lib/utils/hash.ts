import { createHash } from 'crypto';

export function calculateHash(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}
