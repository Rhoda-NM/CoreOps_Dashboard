-- READ ONLY. Use only the already verified existing Preview connection.
BEGIN READ ONLY;
SET LOCAL statement_timeout='5s';
SELECT current_database() AS database_name;
SELECT u.id AS local_user_id,u."externalId",p.id AS platform_admin_id,p.role,p.active,
       (SELECT count(*) FROM public."WorkspaceMember" m WHERE m."userId"=u.id) AS existing_memberships
FROM public."User" u
LEFT JOIN public."PlatformAdmin" p ON p."userId"=u.id
WHERE u."externalId"='user_3LykI0tFI8Me3PRkkxOuLTUo5M2';
SELECT count(*) AS total_admin_records,
       count(*) FILTER (WHERE active AND role='SUPER_ADMIN') AS active_super_admins,
       count(*) FILTER (WHERE NOT active) AS inactive_admin_records,
       count(*) FILTER (WHERE "userId" NOT IN (SELECT id FROM public."User" WHERE "externalId"='user_3LykI0tFI8Me3PRkkxOuLTUo5M2')) AS other_admin_records
FROM public."PlatformAdmin";
SELECT id,"projectId","deploymentId",origin,"databaseHost","databaseName","clerkHost","notBefore","expiresAt","revokedAt"
FROM public."Pay1PreviewAdmission"
WHERE 'user_3LykI0tFI8Me3PRkkxOuLTUo5M2'=ANY("actorExternalIds");
SELECT migration_name,finished_at,rolled_back_at FROM public."_prisma_migrations"
WHERE migration_name='20261111000400_pay1_preview_admission';
SELECT count(*) AS catalog_versions,
       count(*) FILTER (WHERE published AND "businessApprovedAt" IS NOT NULL AND "taxTreatment"<>'UNCONFIRMED') AS published_approved_versions
FROM public."SubscriptionPlanOffer";
COMMIT;
