import { randomBytes, randomInt } from "crypto";

/** Cryptographically-backed random integer in [min, max] inclusive. */
export function randInt(min: number, max: number): number {
  return randomInt(min, max + 1);
}

export function randChoice<T>(arr: readonly T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

export function randFloat(): number {
  // 32 bits of randomness from a crypto source, mapped into [0, 1).
  const buf = randomBytes(4);
  return buf.readUInt32BE(0) / 0x100000000;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
