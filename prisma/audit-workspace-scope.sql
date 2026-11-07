-- Stage 1: read-only ownership audit before changing workspace constraints.
-- Run against the intended database with psql and ON_ERROR_STOP enabled.
-- This script never repairs or assigns ownership. Null ownership is reported
-- separately from conflicting ownership; review both before any backfill.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;

SELECT 'projects_missing_workspace' AS check_name, count(*) AS affected
FROM "Project" WHERE "workspaceId" IS NULL
UNION ALL
SELECT 'tasks_missing_workspace', count(*) FROM "Task" WHERE "workspaceId" IS NULL
UNION ALL
SELECT 'invoices_missing_workspace', count(*) FROM "Invoice" WHERE "workspaceId" IS NULL
UNION ALL
SELECT 'workspaces_missing_slug', count(*) FROM "Workspace" WHERE "slug" IS NULL OR btrim("slug") = ''
UNION ALL
SELECT 'projects_conflicting_with_client', count(*)
FROM "Project" p JOIN "Client" c ON c.id = p."clientId"
WHERE p."workspaceId" IS NOT NULL AND p."workspaceId" <> c."workspaceId"
UNION ALL
SELECT 'tasks_conflicting_with_project', count(*)
FROM "Task" t JOIN "Project" p ON p.id = t."projectId"
JOIN "Client" c ON c.id = p."clientId"
WHERE t."workspaceId" IS NOT NULL
AND t."workspaceId" <> COALESCE(p."workspaceId", c."workspaceId")
UNION ALL
SELECT 'invoices_conflicting_with_client', count(*)
FROM "Invoice" i JOIN "Client" c ON c.id = i."clientId"
WHERE i."workspaceId" IS NOT NULL AND i."workspaceId" <> c."workspaceId"
UNION ALL
SELECT 'invoices_project_in_different_workspace', count(*)
FROM "Invoice" i JOIN "Client" c ON c.id = i."clientId"
JOIN "Project" p ON p.id = i."projectId"
JOIN "Client" pc ON pc.id = p."clientId"
WHERE c."workspaceId" <> COALESCE(p."workspaceId", pc."workspaceId")
UNION ALL
SELECT 'invoices_project_for_different_client', count(*)
FROM "Invoice" i JOIN "Project" p ON p.id = i."projectId"
WHERE i."clientId" <> p."clientId"
UNION ALL
SELECT 'workspaces_without_owner', count(*) FROM "Workspace" w
WHERE NOT EXISTS (
  SELECT 1 FROM "WorkspaceMember" m
  WHERE m."workspaceId" = w.id AND m.role = 'OWNER'
);

-- Missing parents cannot be backfilled safely. Existing FKs should prevent
-- these, but inspect explicitly in case the live schema has drifted.
SELECT 'client' AS resource_type, c.id AS resource_id
FROM "Client" c LEFT JOIN "Workspace" w ON w.id = c."workspaceId" WHERE w.id IS NULL
UNION ALL
SELECT 'project', p.id FROM "Project" p LEFT JOIN "Client" c ON c.id = p."clientId" WHERE c.id IS NULL
UNION ALL
SELECT 'task', t.id FROM "Task" t LEFT JOIN "Project" p ON p.id = t."projectId" WHERE p.id IS NULL
UNION ALL
SELECT 'invoice_client', i.id FROM "Invoice" i LEFT JOIN "Client" c ON c.id = i."clientId" WHERE c.id IS NULL
UNION ALL
SELECT 'invoice_project', i.id FROM "Invoice" i LEFT JOIN "Project" p ON p.id = i."projectId"
WHERE i."projectId" IS NOT NULL AND p.id IS NULL;

COMMIT;
