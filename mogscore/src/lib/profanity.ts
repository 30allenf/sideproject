/**
 * Tiny profanity blocklist for name validation.
 * Not exhaustive — just enough to catch the obvious. False negatives are fine
 * for a comedy app; false positives (real names blocked) are bad, so this stays small.
 */
const BLOCK = [
  "fuck", "shit", "bitch", "cunt", "asshole", "nigger", "nigga", "faggot",
  "retard", "rape", "kike", "spic", "chink", "tranny", "pussy", "dick", "cock",
];

export function profanityCheck(name: string): { ok: boolean; reason?: string } {
  const t = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const w of BLOCK) {
    if (t.includes(w)) return { ok: false, reason: "Pick a different name." };
  }
  if (t.length < 2) return { ok: false, reason: "At least 2 characters." };
  if (name.length > 20) return { ok: false, reason: "Max 20 characters." };
  return { ok: true };
}
