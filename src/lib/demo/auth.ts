import { createHash, timingSafeEqual } from "crypto";

export function demoKeyMatches(supplied: string) {
  const expected = process.env.AGAMEMNON_DEMO_KEY ?? "analyst";
  const left = createHash("sha256").update(supplied).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}
