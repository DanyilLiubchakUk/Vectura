/**
 * Masks an API key ID for safe display. Shows only the last 4 characters;
 * the rest are replaced with asterisks. Alpaca key suffixes tend to be more
 * unique than prefixes, so last-4 helps users distinguish multiple accounts.
 * Never send the full key ID to the client.
 */
const VISIBLE_SUFFIX_LEN = 4;
const MASK_CHAR = "*";

export function maskKeyId(keyId: string | null | undefined): string {
  if (keyId == null || keyId === "") {
    return "—";
  }
  const trimmed = keyId.trim();
  if (trimmed.length === 0) {
    return "—";
  }
  if (trimmed.length <= VISIBLE_SUFFIX_LEN) {
    return MASK_CHAR.repeat(trimmed.length);
  }
  const suffix = trimmed.slice(-VISIBLE_SUFFIX_LEN);
  const masked = MASK_CHAR.repeat(trimmed.length - VISIBLE_SUFFIX_LEN);
  return masked + suffix;
}
