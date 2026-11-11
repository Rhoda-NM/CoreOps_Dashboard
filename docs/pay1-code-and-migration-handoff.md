# PAY-1 — Preview admission code and operator migration handoff

11 November 2026. **Code prepared; no migration, release, provider configuration or payment executed.** The operator will run migrations. This supersedes the earlier assessment's source-only claim that preview market admission has no code path; the [target-access assessment](/home/rmuya/rhoda-work/coreops_dashboard/docs/pay1-preview-assessment.md) remains unresolved for the actual deployment/database. No existing preview or production target was queried during this implementation.

## Implemented boundary

PAY-1 is a distinct preview admission, not relaxed local rehearsal. It requires genuine Vercel Preview runtime markers and project/deployment IDs, path routing at one exact HTTPS origin, TLS remote PostgreSQL, isolated Clerk test keys/host and a **matching durable admission row**. Unrelated local market/legal, lifecycle, export and notification flags must remain false; Live Paystack secret/checkout is rejected. Test Paystack configuration is required for preview; a preview deployment without admission cannot use the new source's checkout/webhook path. The original local rehearsal and production Paystack mode rules remain in place outside this preview path.

The admission row pins project, deployment, origin, exact application database host **including port**, database name, Clerk test hostname, up to 20 opaque Clerk external IDs, reviewed approval reference and explicit test window. Runtime actor checks retain live Clerk session/account/email validation, then enforce this allowlist. It is an operator's synthetic-only/nonproduction attestation backed by reviewed evidence, not technical proof that a person or database contains no real data. Database/time checks are uncached. FOR SHARE protects active transactional checks against concurrent admission updates; revocation is one-way. Missing table/row or any mismatch fails closed. No client header, paid receipt, email suffix or country declaration supplies admission.

New cases are linked at insertion to that admission. No old User, case or Workspace is classified, relinked or approved. The nullable case link is immutable, including null→non-null updates. PAY-1 case operations reject prior unbound/foreign cases and require admitted applicant binding and creation within the window. Kenya still needs its actual OPEN policy and self-declaration; no manual Kenyan queue was added. International inquiries remain account-only. PAY-1 cannot manually APPROVE a market, widen OPEN scope to another country or mutate global market/commercial policy. Existing local manual-review experiments remain available only under their existing isolated gate.

Provisioning, commercial access and both activation paths compose the scoped case check with existing current eligibility/Owner/funding/MFA/capacity/lifecycle checks. Shared test users still need membership and role authorization. Legacy unlinked Workspaces are denied operational PAY-1 use rather than becoming a test shortcut. Scoped owner/platform commercial transactions cannot mutate unrelated Workspaces, including financial restriction/reversal paths; global commercial configuration mutations through that transaction helper are denied in PAY-1. Existing authorized configuration is a prerequisite, not seeded by this release. Market review and Paystack queue projections are scoped to the admission.

New checkout rechecks admission before preparing and immediately before network initialization. Callback and independent verification remain Test Mode/merchant/credential-fingerprint bound, preserve exact amount/currency/channel/reference/metadata validation and existing unique receipt/audit transactions. A **known scoped attempt** may still reconcile financial facts after market revocation or admission expiry; this exception does not approve a market or grant access/activation. It preserves original target/actor/case binding. Invalid signatures are rejected before admission/event writes. Foreign/unknown references in PAY-1 are rejected before event storage to avoid using another case as test evidence. Normal non-PAY-1 unknown-reference handling is unchanged. A receipt still only makes a request eligible for the existing separate SUPER_ADMIN activation decision.

The target and feature guards remain mandatory for reconciliation. Keep the pinned deployment/origin/credentials reachable for outstanding attempts; turning the mode off, changing targets or enabling forbidden features is not a recovery strategy. Re-deployment is not implicit transfer of an admission or its cases. A fresh deployment requires review; an admitted case is not silently rebound. Preserve the original environment for pending signed callbacks and approved reconciliation or design a separate reviewed handoff.

## Files changed for this task

Prior dirty-tree checkpoints and the user-supplied Terms/Privacy edits are preserved; the full Git diff is not this task's change list.

| Files | Change |
| --- | --- |
| `src/server/preview/pay1-config.ts` | Fail-closed runtime, target, test identity and disabled-feature contract. |
| `src/server/preview/pay1-admission.ts` | Durable admission, actor/case/workspace checks and scoped reconciliation distinction. |
| `src/server/auth/clerk-identity.ts` | Additional admission actor check after existing live identity verification, only in PAY-1 mode.
| `src/server/market/{config,access,service}.ts` | Separate preview entry, scoped new cases, current authority and Kenya-only positive decisions; no manual positive approval/policy widening. |
| `src/server/commercial/service.ts` | Scoped owner/platform transactions; original financial and activation checks retained. |
| `src/server/payments/{paystack-config,paystack}.ts` | Preview Test-only gate, scoped checkout/reconciliation/webhook/queue, current admission for merchant registration. |
| `src/app/platform/(protected)/market/page.tsx` | Scoped queue and no PAY-1 Approve option; server action independently denies it. |
| `prisma/schema.prisma` | New admission model and nullable/indexed case FK; no User eligibility flag. |
| `prisma/migrations/20261111000400_pay1_preview_admission/migration.sql` | Prepared empty table, case FK/index, bounds and one-way/immutable-case/decision guards. **Not applied anywhere.** |
| `scripts/pay1-preview-preflight.cjs` | Operator-run read-only migration/schema/count assessment with timeouts and generic error output. **Not run against any target.** |
| `scripts/pay1-admission-sql.cjs` | Offline validated SQL-file preparation; exclusive 0600 output, no connection/execution, no upsert/history rewrite. |
| `tests/pay1-preview.test.cjs` | Synthetic in-process boundary/signature/offline-SQL tests with substituted DB and network tripwire. |
| `tests/auth-configuration.test.cjs` | Expected header now matches the user-supplied Draft 0.1/pending-approval metadata; all readiness assertions retained. |
| `package.json` | `test:pay1-preview`; no new dependency/lockfile change. |
| `docs/pay1-preview.env.example`, this handoff | Default-off configuration template, operator steps, limitations and review gates. |

## Prepared migration and compatibility

There are now **33 local migration directories**. Actual preview pending history is unknown; do not assume 32 already applied or run only the last SQL file. The new migration depends on market models and the existing full chain. It creates no admission row, actor/admin, market policy, Workspace, payment or legal evidence. Existing case links remain null. SQL rejects changing case admission binding, invalid actor arrays/windows and international/manual positive decisions on PAY-1 cases. Admission identity/configuration is immutable except a single revocation timestamp. No deletion executor, retention period, global production bypass or historical backfill is introduced.

Prisma validation/generation were run locally, with no database connection/migration. PostgreSQL trigger/constraint execution, populated fingerprints and actual database drift have **not** been rehearsed for this new migration. Those remain required before target release. Earlier 32-chain/P-C2C passing results do not verify this migration. Applied earlier migration files were not edited.

Older pending migrations include stricter existing-record constraints/triggers and the legal receipt Cascade→Restrict change. Plan their populated compatibility and paired application/client release as described in the assessment. Running the new Prisma client on an unmigrated target is not certified. The new guard can fail because its table is absent; do not disable admission to turn that failure into permissive onboarding.

## Operator sequence — commands are not executed here

1. Identify the owning Vercel project/current immutable deployment and deployed SHA; establish exact preview versus production Neon branch/endpoint/database/role mapping. Confirm test-data provenance and isolated Clerk instance. Preserve all real/uncertain records. No database creation/reset/rename is needed or authorized.
2. Establish and verify a recoverable checkpoint/backup, retention deadline, protected custody and coordinated restore/app rollback plan. Do not treat a provider recovery-window label as a demonstrated restore. Keep ambiguous payment references and post-checkpoint provider events for reconciliation. Separate migration authorization remains necessary after reviewing the pending set.
3. Prepare a protected operator environment file outside committed source with `PAY1_PREVIEW_DATABASE_URL`, `PAY1_EXPECTED_DATABASE_HOST` (`hostname:port`), `PAY1_EXPECTED_DATABASE_NAME`, `PAY1_PRODUCTION_DATABASE_IDENTITY` (`hostname:port/database`, nonsecret) and `PAY1_PREVIEW_SCOPE_CONFIRMED=true` only after actual account/branch checks. The script makes no production connection. Distinct strings alone do not establish branch or credential isolation.

```bash
umask 077
node --env-file=/protected/path/pay1-assessment.env scripts/pay1-preview-preflight.cjs > /protected/path/pay1-preflight.json
```

The preflight runs BEGIN REPEATABLE READ READ ONLY, bounded schema/history/count queries and COMMIT. It compares local SQL checksums against applied history and reports pending/failed/unknown/checksum-mismatched migrations. Counts do not establish synthetic provenance; no names/emails/customer content are selected. Do not commit its metadata report. Resolve any incompatible history before migration.

4. After target/backup/SQL approval, **you** may run the full pending chain. Use a separate protected migration file defining **both** `DATABASE_URL` and `DIRECT_URL` for the verified existing preview target; Prisma config prefers DIRECT_URL, so leaving a stale value is dangerous. Use the provider's verified direct/unpooled connection for migrations and backup tooling. Include the same PAY1 scope inputs in that migration file and run the preflight with `PAY1_REQUIRE_MIGRATION_URLS=true` immediately before execution; it rejects missing or mismatched DATABASE_URL/DIRECT_URL, including stale inherited values. Do not rely on `.env` defaults.

```bash
PAY1_REQUIRE_MIGRATION_URLS=true node --env-file=/protected/path/pay1-migrate.env scripts/pay1-preview-preflight.cjs > /protected/path/pay1-migration-preflight.json
node --env-file=/protected/path/pay1-migrate.env node_modules/prisma/build/index.js migrate status
node --env-file=/protected/path/pay1-migrate.env node_modules/prisma/build/index.js migrate deploy
```

Do not run those commands until the backup and pending-chain review is complete. No seed command is required. Repeat the read-only assessment and verify preservation/constraints/drift on the actual target before pairing application release.

5. Prepare a reviewed **nonsecret but restricted** admission JSON after migration and exact deployment identity are known. Required keys: `id`, `projectId`, `deploymentId`, `origin` (no trailing slash), `databaseHost` (actual application's host including port), `databaseName`, `clerkHost`, `actorExternalIds` (actual synthetic `user_...` IDs including required testers/admins), `approvalReference`, explicit ISO `notBefore`/`expiresAt`, and explicit `nonProductionVerified:true`/`syntheticActorsVerified:true`. Do not include credentials, names, email, passwords or session/MFA material. A review reference must point to protected target/actor approval evidence. This is not legal approval.

```bash
node scripts/pay1-admission-sql.cjs /protected/path/reviewed-admission.json /protected/path/pay1-admission.sql
```

This writes one INSERT transaction to a new 0600 file and never executes it. Review exact contents and separately authorize the operational admission/configuration before running it yourself on preview. No upsert or expiry extension is provided. The migration alone and the mode flag alone cannot enable PAY-1.

6. Pair the reviewed build/schema/admission and [default-off template](/home/rmuya/rhoda-work/coreops_dashboard/docs/pay1-preview.env.example) on the verified target. Preserve genuine Vercel runtime metadata; never inject fake VERCEL markers or localhost. Secrets remain in server-only provider settings. Keep all unrelated gates disabled. Actual deployment/provider configuration is still not performed or accepted here.

## Legal, provider and end-to-end blockers

**Authentication follow-up requested after migration:** active, matching PAY-1 admission now permits synthetic preview signup without production legal approval, branding, express-consent or Google-scope attestation flags. Clerk public configuration must still be available and self-service deletion explicitly disabled. Existing sign-in UI was already available; admitted synthetic users no longer need a Clerk legal timestamp or application legal receipt to provision/sign in. Admission is rechecked inside provisioning. This exception cannot create a legal receipt, approve public documents, enable P-C2C synthetic publication on preview or supply market/payment/role authority. Production and all non-PAY-1 registration/acceptance rules remain unchanged.

Only the explicit test actor allowlist may obtain an application User or workspace. A newly registered Clerk identity is not automatically admitted. Register/create the intended synthetic Clerk identities first and collect their opaque user IDs, then prepare the reviewed admission containing those IDs before workspace testing. If signup is performed through the app with an existing active admission, the provider account can be created but application continuation is denied until its ID is admitted. Admission rows are immutable: do not edit their actor list or relink existing cases. A replacement admission must be explicitly reviewed before new-case testing and is not an automatic transfer of existing cases. Keep existing admitted test cases on their original admission. No admin was bootstrapped.

Clerk-side invitation-only/disabled-signup rules, CAPTCHA, email verification and other provider restrictions remain provider-controlled; this source change does not change that dashboard or deployment protection. Do not disable them indiscriminately. The public Terms/Privacy remain Draft 0.1, not mandatory approved customer documents. Signup displays a payment-test-only notice. Real provider/browser/deployed acceptance remains unverified.

No Paystack/Clerk/Vercel/Neon provider setting was changed. Actual test merchant ID/channels/capability evidence, protected sk_test key, mode-specific signing secret and exact HTTPS callback/webhook destinations remain to be verified. The server redirect integration does not consume a public key; do not add an unused exposed key to claim configuration acceptance. Live keys are not needed for PAY-1. Configure only independent Test settings and preserve production webhook destinations.

Current [official Paystack signing documentation](https://paystack.com/docs/payments/webhooks/) supports the existing timestamped raw-byte SHA-512 scheme and explicit legacy mode. The source signature contract was retained. Tests exercise synthetic signatures, stale windows, rotation candidates and no downgrade; they do not prove the actual account's signing configuration or delivery/retry behavior. No payment, card entry, signed external callback or verification API call was made.

Actual acceptance still needs synthetic authenticated Kenya provisioning, restricted data denial, quote/acceptance, Test checkout, signed webhook plus independent verification, exactly one receipt, pending activation, authorized SUPER_ADMIN activation and scoped operational access. Include unsuccessful/abandoned payments, duplicate/retry/concurrent callbacks, all metadata/money mismatches, stale/revoked markets and unauthorized activation. Reconciliation after market change must preserve facts without activation. No real-money test is authorized; use the separate live-test proposal in the original assessment if later requested.

## Verification results

| Check | Actual result and boundary |
| --- | --- |
| New PAY-1 suite | **13 passed including parent, 12 scenarios**. Mocked DB, no network; target/actor/case/window/market denial, Test-only keys, direct service blocks, exact signatures, offline SQL escaping. Not SQL-trigger or preview acceptance. |
| Combined auth configuration / host / navigation / lifecycle policy / P-C1 safe errors / PAY-1 | **40 passed**, zero failures. Includes the 13 PAY-1 tests above; not additional independent tests. |
| Existing commercial / identity / Paystack | **41 passed**, zero failures, real synthetic transactions in existing `coreops_auth_rehearsal_market_legal_chain_261111`. Provider/identity boundaries substituted; no new admission tables required in disabled mode. |
| Lifecycle B | **11 passed**, zero failures, same existing disposable schema. |
| P-C2C legal evidence | **15 passed**, zero failures, synthetic archived content and minimal evidence in the existing 32-migration rehearsal. This does not exercise the new admission table. |
| C/N-X export/recovery | **29 passed**, zero failures, existing `coreops_auth_rehearsal_exports_nx_legal_261111`. |
| Notifications N-B/C/D | **61 passed combined**, zero failures, sequential local fake/capture/HTTP mocks in existing `coreops_auth_rehearsal_notifications_nd_legal_261111`. No external delivery. |
| New schema | Validation/generation passed. Offline before/after Prisma schema diff contains only the new table, nullable case link, index and FK. SQL constraints/triggers remain unexecuted. |
| Typecheck / focused lint / build | Passed. Local production build only; no deployment. |
| Full lint | Zero errors, 12 existing business-page warnings. |
| Full market/onboarding authorization and new-migration concurrency/tampering/forward compatibility | **Pending operator migration/rehearsal.** Existing schema lacks the new case column, so those suites cannot certify this change without applying the prepared migration. No migration was run to manufacture a pass. |
| Real preview / Paystack / schema drift / backup restoration | **Not performed or accepted.** |

The preflight and admission SQL CLI were not executed against a target; offline SQL generation was exercised in-process with synthetic values. No environment file was changed; Prisma client generation is local only. Existing disposable fixture suites inserted/cleaned their own synthetic records; no preview, production or real customer records were touched. The first auth configuration run hit sandbox child-process EPERM; the permitted local subprocess rerun passed without weakening checks.

Reproduction for no-database checks: `npm run test:pay1-preview`, `npm run test:auth-configuration`, `npm run typecheck`, `npm run lint`, `npm run build`. Database regressions must use only their existing guarded disposable targets and fixture runners; the new-schema market/authorization/tampering suites await separately executed migrations. New evidence logs `/tmp/workflowconnect-pay1-{build,units,financial-regressions,lifecycle,legal,exports,notifications,lint}.log` have mode 0600. `/tmp/workflowconnect-pay1-schema-diff.sql` is an offline schema comparison, not applied SQL or deployed drift evidence. Temporary evidence is not durable release custody.

**Stop for code/migration review. The operator owns migration execution; no deployment, provider configuration, preview/production database record, historical customer approval, deployed lifecycle/export/notification feature or subsequent checkpoint was activated.**

## Authentication follow-up — source changes and checks

Requested change: remove unnecessary legal-ready barriers for the admitted PAY-1 test journey. Changed `src/server/auth/clerk-configuration.ts`, `src/server/auth/get-current-user.ts`, `src/server/auth/legal-acceptance.ts`, the `/sign-up` page, `tests/pay1-registration.test.cjs`, package script and this handoff/template. No schema or migration change is needed for this follow-up; previously applied migration files were not edited or executed.

The new test suite exercises target/window failures, available/disabled-deletion Clerk configuration, no-legal-timestamp account provisioning and repeat sign-in, unlisted identity rejection, verified email/revoked session/collision safeguards, refusal to manufacture acceptance, strict platform MFA/role checks and unchanged production gates. Tests use synthetic identities and in-process database/provider substitutes. Use `npm run test:pay1-registration` to reproduce. Deployed login and provider registration settings remain separate acceptance.

Follow-up verification: **10 new synthetic registration tests passed**; combined registration/admission/auth-configuration/P-C1 tests **34 passed**; existing identity integration **10 passed** on the guarded disposable local database with PAY-1 disabled. Focused lint passed. No migration or provider configuration was run. The initial automatic permission review for identity fixtures timed out; the unchanged permitted retry passed, with no guard removed. Protected evidence: `/tmp/workflowconnect-pay1-auth-{units,identity,build}.log` (0600). The actual preview login/registration journey is not certified by these substitutions.

The follow-up local production build, including TypeScript verification, passed. This is source/build acceptance only; redeploy the reviewed build yourself to use the exception. No additional migration is required.
