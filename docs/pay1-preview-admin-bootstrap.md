# PAY-1 Preview initial administrator — preparation for authorization

12 November 2026. **Prepared only. No bootstrap executed; no target-specific SQL grant generated. UI work remains deferred.** Intended synthetic Clerk administrator: `user_3LykI0tFI8Me3PRkkxOuLTUo5M2`.

## Findings and unresolved checks

The founder confirms the existing Preview database is separate from Production and PAY-1 admission works. This is supplied context, not an independently completed target assessment. Read-only access through the connected Neon account failed: the initial request timed out in automatic review, and the permitted retry returned project-not-found (HTTP 404). The connected Vercel account also cannot access this team's project (403). Consequently the actual local User, role/active flag, conflicting administrators, deployment revision, admission contents, live MFA and backup status remain **unverified**. No absence of SUPER_ADMIN is asserted.

`/platform` requires both an active PlatformAdmin and fresh strict MFA. Successful ordinary sign-in is insufficient. A missing role, inactive role, stale MFA or identity-binding failure can deny entry. Do not diagnose the screenshot alone as a missing role.

Run the [read-only preflight SQL](/home/rmuya/rhoda-work/coreops_dashboard/docs/pay1-preview-admin-preflight.sql) on the verified existing Preview connection first. It reads only this external-ID binding, its role/membership count, administrator aggregate counts, applicable admission metadata, PAY-1 migration completion and catalog counts. It returns no email, credentials or unrelated administrator identities.

| Result | Required handling |
| --- | --- |
| No matching User | Stop. Review normal Clerk/local account provisioning separately; no User creation/rebinding or customer workspace in this procedure. |
| Target already active SUPER_ADMIN | No bootstrap. Check strict MFA and deployed identity/host configuration. |
| Target has an inactive or lower role | Stop; this is a separately authorized role recovery/elevation, not initial bootstrap. |
| Any PlatformAdmin exists elsewhere, including inactive records | Stop; use an existing authorized administrator or separately review recovery. Do not delete records to make the table empty. |
| Target exists, no PlatformAdmin rows anywhere | Initial-bootstrap candidate only; the remaining identity/target/approval gates still apply. |

## Prepared artifacts and safeguards

- [Review and SQL-preparation tool](/home/rmuya/rhoda-work/coreops_dashboard/scripts/pay1-preview-admin-review.cjs): read-only provider/database inspection, protected report, optional SQL file generation. **No execution mode or application endpoint.** `--execute` is rejected before any provider/database work.
- [Pure validation/SQL contract](/home/rmuya/rhoda-work/coreops_dashboard/scripts/lib/pay1-bootstrap-contract.cjs): pins this one intended Clerk user; target checks, strict-MFA verification, conflict classification and atomic role/audit template.
- [Unapproved manifest template](/home/rmuya/rhoda-work/coreops_dashboard/docs/pay1-preview-admin-approval.example.json): deliberately incomplete. Blank values are missing requirements, not usable configuration.
- [Synthetic contract tests](/home/rmuya/rhoda-work/coreops_dashboard/tests/pay1-bootstrap-contract.test.cjs).

The existing local-only `scripts/bootstrap-platform-admin.cjs` is unchanged, SHA-256 `75c422da80900dd1a4e4e2666e06ad97996c7c10da1b082defb86fe3bb52d9f3`. Do not use its local environment exceptions for Preview, rename databases, impersonate localhost or clear deployment markers.

The new tool requires a dedicated `PAY1_PREVIEW_DATABASE_URL`, `COREOPS_ENVIRONMENT=preview`, matching TLS endpoint/database, a real READY Preview deployment/project/revision/origin, the exact active durable admission and its allowlisted intended actor. If VERCEL_ENV is supplied it must be `preview`. It checks the completed PAY-1 migration checksum against the checked-out file. Pooled/direct endpoint aliases are normalized only for connection comparison; the durable admission's recorded host remains exact. Environment labels and a copied admission row alone cannot establish production separation: actual account/branch/endpoint evidence remains mandatory.

Clerk verification uses the installed backend SDK's authenticated session, verified primary email, live unbanned/unlocked profile, MFA enrollment, live active session, expected issuer/authorized party and `has({reverification: 'strict_mfa'})`. Enrollment alone is rejected. The proof lasts at most 60 seconds, bounded further by token expiry, the strict-MFA window, approval window and admission expiry. This is a technical freshness limit, not a retention policy. An out-of-band SQL operator cannot reverify Clerk at COMMIT; a session revoked after proof issuance remains a bounded residual risk. Stop on any known revocation or target change and regenerate proof.

## Review and dry-run procedure — no role writes

1. Confirm the actual Preview project/deployment/Git revision and its current branch alias. Compare Preview and Production database endpoints in protected operator custody; record separation evidence without credentials. Confirm the existing recoverable Preview checkpoint, retention and restore procedure. Do not create or reset a database under this procedure.
2. Run the read-only preflight and interpret the table above. Confirm this Clerk test account is explicitly authorized synthetic data, belongs to the expected test instance, and appears in the active PAY-1 admission. Existing memberships are reported but never created or changed; use a separate synthetic customer account for payment/Owner scenarios.
3. Copy the manifest template to protected local custody and fill every blank from real evidence. `databaseHost` includes the port and matches the admission; `origin` is exact HTTPS without a trailing slash. Use an explicit ISO approval window and protected references for operator, independent reviewer, nonproduction evidence, backup and authorized test identity. Keep `approved:false` for the dry run. Different reference strings do not themselves prove independent human review.
4. Use an operator credential file with mode 0600 and parent directory 0700. It contains only the matching Preview connection, Clerk **test** keys, Vercel read-access token and Preview environment marker. The tool does not load `.env` automatically or fall back to ordinary DATABASE_URL. Never commit this file or print its values.
5. Authenticate the intended user on the approved Preview origin and complete actual strict MFA using the existing Clerk flow. Obtain a fresh ordinary session token through the authorized Clerk client into a protected local file. Do not use a custom JWT template, paste it into chat, log it, pass it as a command argument or place it in shell history. Token acquisition is operator-controlled and not automated here; if secure capture is unavailable, stop.

Example paths below are operator-created protected files, not supplied credentials. From the repository root, after filling them:

```bash
umask 077
mkdir -m 700 /tmp/pay1-admin-review
cp docs/pay1-preview-admin-approval.example.json /tmp/pay1-admin-review/approval-draft.json
```

Fill the copied manifest and create `operator.env` and `session.jwt` securely before running:

```bash
node --env-file=/tmp/pay1-admin-review/operator.env \
  scripts/pay1-preview-admin-review.cjs \
  --approval-file /tmp/pay1-admin-review/approval-draft.json \
  --session-token-file /tmp/pay1-admin-review/session.jwt \
  --report /tmp/pay1-admin-review/dry-run.json
```

Required credential-file variable **names**: `COREOPS_ENVIRONMENT`, `PAY1_PREVIEW_DATABASE_URL`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `VERCEL_TOKEN`. Do not change app/provider configuration to satisfy this operator job. Files must be owned by the operator, regular nonsymlink inputs with no group/other access. Outputs use exclusive creation and mode 0600; choose fresh filenames for reruns.

This command performs only read-only HTTP inspection and a PostgreSQL READ ONLY transaction. It does not insert admissions, roles, audit events, Users or workspaces. Review the protected report, `ELIGIBLE_INITIAL_BOOTSTRAP`, both code/manifest digests and all target evidence. A failed provider check stops the procedure; it is not permission to weaken it.

## Explicit authorization, SQL preparation and later execution

**No authorization is granted by this report.** Before generation, the accountable approver must authorize one initial role grant to the exact user/target, the reviewed code digest, final manifest digest, bounded window, backup/restore plan and resulting two-row transaction. Preserve that authorization outside the mutable working tree in restricted custody. Do not invent prior SUPER_ADMIN approval: the initial audit actor will be the newly created administrator, with honest external operator/reviewer authorization references.

Prepare a separate final manifest with `approved:true`, actual approval reference and approved window. Review its final digest (it changes from the draft). Reacquire fresh strict-MFA session proof. Substitute the two **reviewed 64-character digests** below; the tool compares them and will reject stale/mismatched code or manifest. Hashes are not credentials.

```bash
node --env-file=/tmp/pay1-admin-review/operator.env \
  scripts/pay1-preview-admin-review.cjs \
  --approval-file /tmp/pay1-admin-review/approval-approved.json \
  --session-token-file /tmp/pay1-admin-review/session-fresh.jwt \
  --report /tmp/pay1-admin-review/final-review.json \
  --prepare-sql /tmp/pay1-admin-review/bootstrap-approved.sql \
  --approved-manifest-sha256 REVIEWED_FINAL_MANIFEST_SHA256 \
  --approved-code-sha256 REVIEWED_CODE_SHA256
```

Generation repeats the real identity, deployment, migration and read-only database checks. It refuses SQL for missing users, existing roles or any existing administrator. The output grants exactly one active SUPER_ADMIN and appends `PAY1_INITIAL_SUPER_ADMIN_BOOTSTRAPPED` in one transaction. It locks the fixed User/admission, then exclusively serializes the administrator table and rechecks that it is empty. Identity/email digest, admission, database name and proof deadline are checked; the deadline is rechecked after lock waits. Any grant/audit error rolls back both. Unique User binding prevents duplicate assignments. No UPDATE, DELETE, User creation, membership or Workspace insertion is generated.

**Execution is a separate authorized operator step and has not been performed.** Inspect the generated SQL and protected final report before execution. It expires within 60 seconds of proof verification; if review takes longer, regenerate with fresh proof after the approved contract is settled. Do not edit/remove freshness checks. Use the same externally verified Preview endpoint/database/role in a protected libpq service and password file, avoiding connection credentials in process arguments:

```bash
PGSERVICEFILE=/tmp/pay1-admin-review/pg_service.conf \
PGPASSFILE=/tmp/pay1-admin-review/pgpass \
psql 'service=pay1-reviewed-preview' -X -v ON_ERROR_STOP=1 \
  --file=/tmp/pay1-admin-review/bootstrap-approved.sql
```

The service must pin the exact reviewed host, database, user and TLS settings. SQL cannot prove the remote hostname or production separation independently of that connection; do not run it on another connection even if the database name matches. Never use `--single-transaction` around this already explicit transaction or add broad role grants. A successful repeat refuses because administrators now exist. On failure, inspect safe error codes and rerun read-only checks; do not delete administrator/audit rows to retry.

After separately authorized execution, rerun the preflight; read the one target role and matching bootstrap audit event in protected custody; compare membership/workspace/financial counts with the pre-execution snapshot. Test fresh strict-MFA `/platform` access and an unprivileged account denial. No customer workspace is needed. If access still fails, investigate existing host/identity/MFA/revision checks rather than granting more privileges. Any later disable/recovery requires a separately reviewed audited action; do not erase bootstrap history. Restoring an older database requires independent admission/role/audit reconciliation and is not solved by this SQL.

## Subscription offers — independent PAY-1 boundary

In [commercial service](/home/rmuya/rhoda-work/coreops_dashboard/src/server/commercial/service.ts:34), `platformTransaction` rejects PAY-1 mutations with no workspace scope. Both `createOffer` and `publishOffer` use that global scope. SUPER_ADMIN bootstrap therefore **does not enable offer creation/publication**. Retain this guard. The tax-configuration service has separate checks; this report does not claim every global configuration path uses the same helper or authorize any tax mutation.

The current catalog model and `publishedOffers()` are global, not admission-bound. Publishing a synthetic offer directly could make it selectable by unrelated Preview tenants. A name containing TEST is not an access boundary. No synthetic catalog is created or published here.

Proposed separate preparation checkpoint:

1. Approve an exact synthetic catalog manifest: admission, target/revision/window, offer identity/version, plan/interval, exact KES test amount, seats/projects/features and justified tax treatment. Founder supplies commercial facts; do not invent a price, VAT registration or tax approval. Preserve all existing offer/quote/receipt versions.
2. Add an explicitly reviewed admission-to-offer association with server-side filtering in **both** catalog reads and subscription-request submission. A scoped operator job must validate active admission, strict-MFA SUPER_ADMIN, expected catalog hash, conflicts and exact row allowlist; it may create only specified new unpublished versions plus atomic audit. No global mutation switch, generic admin import, edits to historical snapshots or activation/funding side effects.
3. Dry-run target/count/conflict/tax/entitlement validation, then obtain separate authorization for unpublished synthetic insertion. Obtain another explicit reviewed publication decision for those versions. Until admission scoping is implemented and accepted, publication remains blocked; a mixed-data Preview database must not receive globally selectable synthetic offers.
4. Isolated tests must cover foreign admission/actor/tenant rejection, forged offer IDs through direct service/API requests, expiry/revocation, concurrent/replayed publication, audit rollback, immutable quotes and exact financial amounts. Only then authorize the specific Preview catalog preparation. Real checkout remains Test Mode; payment verification and SUPER_ADMIN activation remain independent.

This is a proposal, not catalog implementation approval. No broad commercial mutations, public offers, tax configuration, provider settings or UI were changed.

## Verification and change record

Synthetic contract tests: **9 passed including parent (8 scenarios)**. They exercise target/approval/connection/admission/MFA validation, conflicting-role classification, generated transaction shape and rejection of execution mode. Tests make no provider/database calls. Syntax checks and focused lint passed. This is not a real PostgreSQL lock/race test, successful live Clerk/MFA check, deployment verification or bootstrap rehearsal. Those remain required before authorizing a real grant. An initial sandbox child-process restriction required a permitted test rerun; no application safeguard was removed. A test assertion was corrected to distinguish the necessary `FOR UPDATE` lock from prohibited UPDATE mutations.

Created only: this report, the approval template, read-only preflight SQL, review tool, pure contract and contract tests. No existing source, schema, migration, local bootstrap, UI or release gate was edited for this task. No bootstrap, database write, provider configuration, customer communication, workspace creation or production action occurred. **Stop for authorization after actual read-only evidence and missing approval/target/MFA/backup requirements are supplied.**
