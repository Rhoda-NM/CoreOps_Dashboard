-- Safe on the pre-commercial schema. Read-only rollout impact/ownership audit.
BEGIN TRANSACTION READ ONLY;
SELECT 'workspaces_requiring_explicit_legacy_activation_decision' AS check_name, count(*) AS affected FROM "Workspace"
UNION ALL SELECT 'workspaces_without_subscription', count(*) FROM "Workspace" w WHERE NOT EXISTS (SELECT 1 FROM "Subscription" s WHERE s."workspaceId"=w.id)
UNION ALL SELECT 'legacy_trialing_subscriptions_not_paid_evidence', count(*) FROM "Subscription" WHERE status::text='TRIALING'
UNION ALL SELECT 'workspaces_without_active_owner', count(*) FROM "Workspace" w WHERE NOT EXISTS (SELECT 1 FROM "WorkspaceMember" m WHERE m."workspaceId"=w.id AND m.role='OWNER' AND m.status='ACTIVE');
-- Each existing workspace requires a reviewed rollout decision. Do not fabricate
-- paid periods, receipts, subscriptions, or historical activation dates.
SELECT w.id AS "workspaceId", s.status::text AS "legacySubscriptionStatus", s."currentPeriodEnd", count(m.id) AS "reservedMemberSeats"
FROM "Workspace" w LEFT JOIN "Subscription" s ON s."workspaceId"=w.id LEFT JOIN "WorkspaceMember" m ON m."workspaceId"=w.id
GROUP BY w.id, s.status, s."currentPeriodEnd" ORDER BY w.id;
COMMIT;
