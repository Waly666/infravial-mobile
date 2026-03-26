/** UUID local para deduplicación / Idempotency-Key. */
export function newLocalId(): string {
  try {
    const c = globalThis.crypto as Crypto | undefined;
    if (c?.randomUUID) {
      return c.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `local-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}
