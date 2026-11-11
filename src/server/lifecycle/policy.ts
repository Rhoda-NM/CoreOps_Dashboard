export const LIFECYCLE_POLICY_VERSION = "EXPIRY-60-RETENTION-90-v1";
export type LifecycleState = "PENDING" | "ACTIVE" | "GRACE" | "ARCHIVED" | "CANCELED";
export function utcDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

// Pure calculation: no customer timestamps or scheduler execution dates establish expiry.
export function calculateLifecycle(endsAt: Date | null, now: Date) {
  if (!Number.isFinite(now.getTime()) || (endsAt && !Number.isFinite(endsAt.getTime()))) throw new Error("Invalid lifecycle timestamp");
  const archivedAt = endsAt ? utcDays(endsAt, 7) : null;
  const cancellationAt = endsAt ? utcDays(endsAt, 60) : null;
  const retentionEndsAt = cancellationAt ? utcDays(cancellationAt, 90) : null;
  const state: LifecycleState = !endsAt ? "PENDING" : now < endsAt ? "ACTIVE" : now < archivedAt! ? "GRACE" : now < cancellationAt! ? "ARCHIVED" : "CANCELED";
  return { state, archivedAt, cancellationAt, retentionEndsAt, retentionExpired: !!retentionEndsAt && now >= retentionEndsAt };
}
