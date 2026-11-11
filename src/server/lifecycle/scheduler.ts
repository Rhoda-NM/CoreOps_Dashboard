import "server-only";
import { prisma } from "../db/prisma";
import { lifecycleProcessingEnabled } from "./config";
import { processWorkspaceLifecycle } from "./service";

export async function runLifecycleBatch({ dryRun = true, limit = 25, after }: { dryRun?: boolean; limit?: number; after?: string } = {}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 50 || (after?.length ?? 0) > 200) throw new Error("Invalid lifecycle batch bounds");
  if (!dryRun && !lifecycleProcessingEnabled()) throw new Error("Lifecycle processing disabled");
  let cursor = after ?? "";
  if (!dryRun && after === undefined) cursor = (await prisma.lifecycleJobRun.findFirst({ where: { completedAt: { not: null } }, orderBy: { startedAt: "desc" }, select: { cursor: true } }))?.cursor ?? "";
  // No application-profile or business content is selected. The deadline query
  // works before lifecycle rows exist and never backfills as a migration effect.
  const select = (afterId: string) => prisma.$queryRaw<{ id: string; stage: string }[]>`
    SELECT w.id, CASE WHEN p."endsAt" + interval '60 days' <= (clock_timestamp() AT TIME ZONE 'UTC') THEN 'CANCELED' ELSE 'ARCHIVED' END AS stage
    FROM "Workspace" w
    JOIN "Subscription" s ON s."workspaceId" = w.id
    JOIN LATERAL (SELECT id, "endsAt" FROM "SubscriptionPeriod"
      WHERE "workspaceId" = w.id AND "revokedAt" IS NULL AND "startsAt" <= (clock_timestamp() AT TIME ZONE 'UTC')
      ORDER BY "endsAt" DESC LIMIT 1) p ON true
    LEFT JOIN "WorkspaceLifecycle" l ON l."workspaceId" = w.id
    WHERE w."activationStatus" = 'ACTIVE' AND s.status NOT IN ('PENDING_ACTIVATION', 'TRIALING', 'SUSPENDED', 'CANCELED')
      AND p."endsAt" + interval '7 days' <= (clock_timestamp() AT TIME ZONE 'UTC')
      AND (l."workspaceId" IS NULL OR l."sourcePeriodId" <> p.id OR l."nextEvaluationAt" <= (clock_timestamp() AT TIME ZONE 'UTC'))
      AND w.id > ${afterId}
    ORDER BY w.id LIMIT ${limit}`;
  let candidates = await select(cursor);
  // Cycle back to retry failures/locked rows and include newly due lower IDs.
  if (!candidates.length && cursor && after === undefined) { cursor = ""; candidates = await select(cursor); }
  const result = { dryRun, examined: candidates.length, processed: 0, skipped: 0, failed: 0, archiveCandidates: candidates.filter(c => c.stage === "ARCHIVED").length, cancellationCandidates: candidates.filter(c => c.stage === "CANCELED").length, nextCursor: candidates.at(-1)?.id ?? null };
  if (dryRun) return result; // No rows, audits or notices are written in dry-run.
  const run = await prisma.lifecycleJobRun.create({ data: { cursor: cursor || null, startedAt: new Date() } });
  result.nextCursor = cursor || null;
  const outcomes: { workspaceId: string; outcome: string }[] = [];
  const started = Date.now();
  for (const candidate of candidates) {
    if (Date.now() - started > 18000) break; // Leave a margin below the handler budget.
    try {
      const outcome = await processWorkspaceLifecycle(candidate.id, true);
      if (outcome.changed) result.processed++; else result.skipped++;
      outcomes.push({ workspaceId: candidate.id, outcome: outcome.changed ? "TRANSITIONED" : "UNCHANGED_OR_LOCKED" });
    } catch {
      // Do not log Prisma/provider errors or customer contents.
      result.failed++;
      outcomes.push({ workspaceId: candidate.id, outcome: "TRANSITION_FAILED" });
    }
    result.nextCursor = candidate.id;
    await prisma.lifecycleJobRun.update({ where: { id: run.id }, data: { processed: result.processed, skipped: result.skipped, failed: result.failed, cursor: result.nextCursor, outcomes, failureCode: result.failed ? "TRANSITION_FAILED" : null } });
  }
  await prisma.lifecycleJobRun.update({ where: { id: run.id }, data: { completedAt: new Date() } });
  return { ...result, runId: run.id };
}
