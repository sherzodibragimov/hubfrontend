/** Server bergan PoW challenge ni yechadi: sha256(salt + N) === challenge, N ∈ [0, maxnumber]. */
export interface Challenge { algorithm: string; challenge: string; maxnumber: number; salt: string; signature: string }

const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('');

export async function solve(c: Challenge, onProgress?: (p: number) => void, signal?: AbortSignal): Promise<string> {
  const CHUNK = 2000;
  for (let start = 0; start <= c.maxnumber; start += CHUNK) {
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
    const end = Math.min(start + CHUNK, c.maxnumber + 1);
    const nums = Array.from({ length: end - start }, (_, i) => start + i);
    const hashes = await Promise.all(nums.map((n) => crypto.subtle.digest('SHA-256', enc.encode(c.salt + n))));
    const i = hashes.findIndex((h) => hex(h) === c.challenge);
    if (i >= 0) return btoa(JSON.stringify({ ...c, number: nums[i] }));
    onProgress?.(end / (c.maxnumber + 1));
  }
  throw new Error('Xavfsizlik tekshiruvini yechib bo‘lmadi');
}
