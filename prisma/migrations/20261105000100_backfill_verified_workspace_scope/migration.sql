-- Abort on conflicting ownership before backfilling. Never choose a default tenant.
BEGIN;
LOCK TABLE "Client", "Project", "Task", "Invoice", "Workspace" IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "Project" p JOIN "Client" c ON c.id = p."clientId" WHERE p."workspaceId" IS NOT NULL AND p."workspaceId" <> c."workspaceId")
  OR EXISTS (SELECT 1 FROM "Task" t JOIN "Project" p ON p.id = t."projectId" JOIN "Client" c ON c.id = p."clientId" WHERE t."workspaceId" IS NOT NULL AND t."workspaceId" <> COALESCE(p."workspaceId", c."workspaceId"))
  OR EXISTS (SELECT 1 FROM "Invoice" i JOIN "Client" c ON c.id = i."clientId" WHERE i."workspaceId" IS NOT NULL AND i."workspaceId" <> c."workspaceId")
  OR EXISTS (SELECT 1 FROM "Invoice" i JOIN "Project" p ON p.id = i."projectId" WHERE i."clientId" <> p."clientId")
  THEN RAISE EXCEPTION 'Conflicting tenant ownership: review records before migration'; END IF;
  IF EXISTS (SELECT 1 FROM "Project" p LEFT JOIN "Client" c ON c.id = p."clientId" WHERE c.id IS NULL)
  OR EXISTS (SELECT 1 FROM "Task" t LEFT JOIN "Project" p ON p.id = t."projectId" WHERE p.id IS NULL)
  OR EXISTS (SELECT 1 FROM "Invoice" i LEFT JOIN "Client" c ON c.id = i."clientId" WHERE c.id IS NULL)
  THEN RAISE EXCEPTION 'Orphaned business records: confirm ownership before migration'; END IF;
END $$;
UPDATE "Project" p SET "workspaceId" = c."workspaceId" FROM "Client" c WHERE p."clientId" = c.id AND p."workspaceId" IS NULL;
UPDATE "Task" t SET "workspaceId" = p."workspaceId" FROM "Project" p WHERE t."projectId" = p.id AND t."workspaceId" IS NULL;
UPDATE "Invoice" i SET "workspaceId" = c."workspaceId" FROM "Client" c WHERE i."clientId" = c.id AND i."workspaceId" IS NULL;
-- Stable ID suffix handles duplicate names without choosing another workspace.
UPDATE "Workspace" SET slug = 'workspace-' || id WHERE slug IS NULL OR btrim(slug) = '';
COMMIT;
