import "server-only";
// A bounded per-account/per-process quota for explicit availability checks.
// It survives HMR, but is not a distributed limiter: multi-instance deployment
// requires a shared limiter/edge rule before advertising hard global quotas.
const cache = globalThis as unknown as { workflowconnectSlugChecks?: Map<string, { count: number; until: number }> };
const entries = cache.workflowconnectSlugChecks ??= new Map();
export function consumeSlugCheck(userId: string, now = Date.now()): boolean {
  const existing = entries.get(userId);
  if (existing && existing.until > now) {
    if (existing.count >= 10) return false;
    existing.count++;
    return true;
  }
  if (entries.size >= 10000) {
    for (const [key, bucket] of entries) if (bucket.until <= now) entries.delete(key);
    if (entries.size >= 10000) return false;
  }
  entries.set(userId, { count: 1, until: now + 60000 });
  return true;
}
