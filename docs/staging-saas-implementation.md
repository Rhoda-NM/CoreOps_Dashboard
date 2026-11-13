# WorkflowConnect — persistent staging and self-service subscriptions

12 November 2026. **Implemented locally for architectural review. Not deployed; real Clerk/Paystack customer acceptance remains outstanding.** This replaces deployment-bound PAY-1 admission only when the independently configured staging environment is explicitly enabled. Production configuration/data, existing Preview data, provider settings and public legal text were not changed.

## Architecture and gap analysis

| Confirmed prior restriction | Classification | Implemented outcome |
| --- | --- | --- |
| Admission tied to deployment ID, expiry and Clerk actor allowlist | Temporary PAY-1 restriction | Persistent server-owned project/branch/origin/database/Clerk identity and synthetic environment registry. No deployment ID or ordinary customer allowlist in staging authorization. Old admission records and bindings remain intact. |
| Verified Clerk identity, active membership, tenant/assignment permissions, database compound FKs | Essential protection | Retained. Worldwide account creation does not confer workspace or platform privileges. |
| Every offer request needed individual commercial review | Commercial policy | Fixed-price STANDARD staging offers receive a server-priced, immutable quotation; customer accepts it. Enterprise, upgrades and manual payments retain review. |
| Verified Paystack receipt stopped at READY_FOR_ACTIVATION | Commercial policy/incomplete self-service | A matching standard Test Mode receipt atomically creates the paid period and activates the workspace, without a fictitious administrator actor. |
| All global catalog changes forbidden during PAY-1 | Temporary restriction | Existing strict-MFA SUPER_ADMIN controls operate normally in staging; offers are staging-environment-scoped. PAY-1 restrictions remain for PAY-1 mode. |
| Non-registration represented without its own supply treatment | Incomplete model | Added NON_VAT_REGISTERED, distinct from EXEMPT. It requires NOT_REGISTERED status and zero VAT. Synthetic tax scenarios are explicitly marked; no legal status is certified. |
| Concurrent empty-update webhook upserts could raise P2002 | Confirmed defect | Atomic duplicate-tolerant insertion followed by authoritative lookup; financial fulfillment remains serialized and idempotent. |
| Public brochure and Paystack machine POSTs entered Clerk's interactive middleware | Confirmed routing defect | Exact public GET/HEAD brochure routes are provider-independent. Exact central Paystack POST routes use their signature/verifier handler, without Clerk handshake. Private routes and action POSTs retain server authorization. |
| MFA enrollment without fresh verification denied administrator entry | Previously repaired security/UX | Existing database-backed roles, strict MFA, live session verification and supported Clerk step-up preserved across deployments. |
| Lifecycle B/C, C/N-X exports and notification sending lack deployed acceptance | Essential release boundary | Remain restricted; staging does not activate their live release gates or implement deletion. |

Before: account → admitted actor/deployment → market/workspace → request → administrator quote → customer acceptance → funds verification → administrator activation.

After, standard staging: account → verified identity → explicit synthetic testing acknowledgment → business country/market eligibility → restricted workspace → current approved offer → server quote/customer acceptance → Paystack Test Mode → authenticated provider verification → atomic receipt/paid period/activation → normal tenant/feature authorization.

The existing Kenya OPEN policy remains self-declared, with no certificate, nationality or IP requirement. Other countries remain account-only inquiries unless independently approved under the existing market rules. No global User eligibility flag, country-based identity inference or historical customer classification was added.

## Persistent environment boundary

`COREOPS_STAGING_ENABLED=true` and `COREOPS_ENVIRONMENT=staging` select the new path. They must agree; mixing PAY-1 and staging fails. On Vercel the runtime must be Preview, the project and trusted Git branch must match configured values, and the application must use the reviewed stable HTTPS origin, exact database endpoint/name and Clerk development instance. Clerk Live keys, Paystack Live credentials and specified unreleased feature flags are rejected.

The persisted StagingEnvironment records that reviewed identity, synthetic-data attestation and approval reference. It is immutable except controlled deactivation, with no expiry or deployment-ID binding. Transactions take a shared environment lock so retirement cannot race a newly authorized mutation. A normal subsequent deployment uses the same row, accounts, memberships, administrators, catalog and financial history. No reseeding or new admissions is needed.

These are server-owned controls. Browser headers/query parameters cannot choose an environment or role. Existing host validation and internal-header replacement remain. Application tenant isolation includes service scoping, membership/role/assignment checks, workspace locks and relational constraints; this is not a claim of universal SQL RLS or resistance to a database owner.

Local test mode additionally requires an explicitly named disposable loopback database and rejects deployed Vercel markers. Do not rename cloud databases, proxy live targets as fixtures, spoof localhost or clear deployment markers.

Genuine external operator commands use a separate adapter: it resolves the stable alias through Vercel's authenticated API and verifies READY Preview/project/branch before admitting the configured database. It never spoofs Vercel environment markers. The deployment returned by that read may change; its ID is neither persisted nor an admission authority. No browser route calls this operator adapter.

## Official pricing and commercial paths

The founder's final pricing instruction is recorded as `FOUNDER-2026-11-12-FINAL-PRICING-DECISION`, release `WORKFLOWCONNECT-INITIAL-2026-11-12` in `src/config/public-pricing.ts`.

| Plan | Monthly | Annual upfront / 12 months | Members |
| --- | --- | --- | --- |
| Solo | KES 100 | KES 1,000 | 1 Owner; no invitations |
| Starter | KES 300 | KES 3,000 | 3 including Owner |
| Business | KES 1,000 | KES 10,000 | 10 including Owner |
| Enterprise | By quotation | By quotation | Agreed contract |

The prices are official commercial prices, **not experimental amounts**. Staging records/payments remain synthetic. Annual presentation states twelve months upfront and derives the equivalent two-month saving from the current monthly/annual pair, so a future differently priced release does not inherit inaccurate savings copy. Enterprise shows Contact Sales and cannot use fixed-price standard checkout.

The versioned release supplies public fallback display and repeatable setup. Published database versions drive selections, server quotes, checkout, receipt/period snapshots and administration; only the latest published scoped version is offered for each plan/interval. Older approved values are preserved. An old/unversioned provisional offer does not override the founder-approved public fallback. Future administrator versions receive a distinct release label; published snapshots remain immutable. Customer-entered amounts never set checkout pricing.

Setup creates new approved versions where existing versions already occupy a plan/interval/version. It does not edit historical offers, quotations, payments or paid periods. A STANDARD offer is staging-bound and cannot be Enterprise. New quotations snapshot tax, limits, features, offer version and approval provenance. Existing manual/enterprise requests are not silently converted; funded or disputed legacy requests retain their reviewed process.

## Payment, activation and recovery integrity

Checkout requires active Owner membership, current market eligibility, accepted server quotation and the verified matching Test Mode merchant. The existing immutable reference, amount-to-minor-unit Decimal calculation, merchant/key fingerprint, channels and metadata binding remain. No provider I/O is performed while holding the financial transaction's locks.

Webhooks authenticate the exact raw body using the configured supported signature mechanism. The backend independently calls Paystack verification and compares success/domain/reference/currency/exact amount/transaction ID/channel/merchant/metadata. Browser redirects and unsigned POSTs cannot credit or activate anything. The staging Live webhook route is unavailable.

Under Workspace → market locks (then administrator when reconciliation is privileged), the application records one receipt, reconciles the submission, creates one nonoverlapping paid period and updates subscription/workspace/request plus audit atomically. The automatic period records `activationSource=PAYSTACK_TEST` and its exact receipt FK; `activatedById` is null. SQL constraints require the matching standard Test Mode receipt. A source-request unique key, receipt/provider uniqueness and exclusion constraint prevent duplicate grants. No synthetic administrator impersonation is used.

Automatic activation also requires a currently verified live Owner, matching local binding, current market decision, exact funds, capacity and valid subscription history. Suspension, closure, cancellation, overpayment, unresolved claims, changed history or ineligible market prevent automatic access. Expected review conditions preserve legitimate receipt evidence; unexpected transaction/audit failure rolls back the receipt and activation together for a safe retry.

Renewals preserve plan/interval and append a contiguous future period when coverage remains; no recurring charge is introduced. Upgrades continue through reviewed NEXT_PAID_PERIOD policy. Existing grace/write-expiry behavior remains; this is not approval of production day-60 enforcement or deletion.

Authenticated payer reconciliation is bound to the original payer and a current active Owner in the attempt's actual workspace, independent of a selected-workspace cookie. The callback page invokes a server POST check, shows truthful pending/review status and offers workspace access only when the resulting operational checks pass.

Independently confirmed failed/abandoned attempts are retained with terminal status and rejected payment claim, permitting a fresh checkout/reference. Ambiguous/pending attempts remain fenced for reconciliation. Late legitimate success is still recordable; exact-funding and unique-period checks prevent double fulfillment. Independently verified reversal revokes the linked period and suspends the workspace/subscription for review while retaining original receipts. Formal reversal/refund accounting remains a separate authorized exception workflow. The implemented webhook fulfillment event is charge.success; other event types are acknowledged without inferring financial success. Operators must reconcile disputes/refunds using provider verification and the existing exception workflow; a full automatic dispute/refund ledger is not claimed.

Provider specifications were checked against [Paystack webhooks](https://paystack.com/docs/payments/webhooks/) and [transaction verification](https://paystack.com/docs/payments/verify-payments/). Configure the signature mode actually used by the merchant; do not disable verification to obtain a successful response.

## Identity, terms and administration

Registration no longer needs an operator-created Clerk allowlist in staging. Live verified email/session binding and conflict-safe local identity provisioning remain. Registration readiness still verifies Clerk configuration availability and disabled self-service deletion.

Because production legal approval is not granted, staging uses a separate explicit **SYNTHETIC STAGING TEST AGREEMENT** acknowledgment. Exact text/hash, subject/environment and first acceptance time are preserved in a restrictive, immutable record. It does not fabricate a real Terms/Privacy acceptance, DPA execution or legal approval. The legacy real-document acceptance endpoint is explicitly denied in staging; it cannot substitute for this testing acknowledgment. Public legal wording/approval flags and P-C2C's isolated catalog gates are unchanged. Production legal readiness remains separate.

The administrator reuses the existing User/active PlatformAdmin and strict-MFA session. No workspace or repeated bootstrap is required. The staging-only `/platform/users` directory exposes the latest 50 accounts to strict-MFA SUPER_ADMIN only, with reasoned suspend/restore actions and atomic platform audit. All accounts with a platform role (including inactive roles), and the acting administrator, are excluded from customer suspension. Suspension preserves Clerk identity, memberships, ownership and records; server identity/tenant mutation/activation checks deny a suspended customer. Restore does not grant a role or membership. Suspension locks User then its sorted Workspaces, rechecks current administrator authority and serializes with business/financial writers. A verified payment received while suspended remains recorded without activation; after reviewed restoration, authenticated reconciliation may complete it. These controls are tested with synthetic accounts and do not implement provider deletion or production account management. Normal global administrative functions are available according to existing role permissions within staging, including scoped catalog publication and commercial exceptions. Privileged actions remain authenticated on the server; the new environment does not grant platform roles to customers. Staging recovery errors use staging-specific guidance rather than asking for a new PAY-1 admission.

## Migrations and compatibility

Five forward migrations were prepared and applied only to disposable local databases:

1. `20261112000100_non_vat_treatment`: additive tax enum vocabulary.
2. `20261112000200_persistent_staging`: environment/acknowledgment tables, scoped catalog/request fields, nullable administrative activation actor plus explicit receipt-backed source, restrictive FKs and integrity triggers.
3. `20261112000300_staging_integrity`: forward extension of the closed tax constraint to distinguish non-registration while retaining existing valid configurations.
4. `20261112000400_staging_terminal_payments`: additive FAILED/ABANDONED attempt statuses; existing unresolved-attempt fencing remains.

5. `20261112000500_staging_user_controls`: additive account-suspension flag, default false; no account is suspended by migration.

The final chain has 38 migrations. No applied migration was edited. New defaults preserve historical requests as MANUAL and periods as ADMIN; no countries, market decisions, legal approvals or financial history were backfilled. Existing PAY-1 evidence remains untouched.

There is an explicit compatibility change: automatic periods may have a null administrator actor. **Do not roll an older incompatible Prisma client over newly system-activated rows.** Pause new checkout/provisioning during the one-time migration/catalog/client cutover; verify in maintenance before reopening intake. A rollback must use a reviewed compatible build/maintenance restriction and preserve the additive schema/evidence; no drop/reset/delete rollback is supplied. Enum additions are not reversed by destructive type replacement.

A synthetic populated pre-staging clone preserved all prior columns: **52 tables / 77 rows** matched fingerprints after forward migration. Final Prisma schema drift is clean, with raw constraints also exercised. A generated index name was mapped to PostgreSQL's existing truncated name in Prisma; no integrity check was removed.

## Setup and deployment — approval gates

The code is ready for review, not permission to deploy an unreviewed architectural change. The connected Vercel account has not supplied this team's current target metadata; the last inspection returned 403. No current Preview migration history, customer-data inventory, backup, provider settings or contract is certified here.

1. Review this diff and approve the specific Preview architecture/target. Reuse the existing isolated Neon Preview database and Clerk development instance. Confirm actual data is synthetic, target/credentials are separate from Production, and record backup/checkpoint retention plus a tested restore procedure. If real records exist, stop for approved handling; do not reset them.
2. Select a stable trusted-branch Preview alias. The existing `workflow-connect-git-main-stravect-systems-90ef5233.vercel.app` is a candidate from supplied context, **not a newly verified assignment**. Confirm actual project/team/branch/origin and branch-scoped environment through authorized Vercel access. No new database is required.
3. Fill `config/staging.env.example` in protected operator custody. Runtime Vercel system project/branch/environment values must be genuine. Use the exact database host/name and decoded Clerk test hostname. Keep build-time NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY consistent with runtime and the persisted expected instance. Test and Production credentials must be distinct; do not place Live keys or the operator's Vercel API token in staging runtime.
4. The external operator file additionally supplies a scoped `VERCEL_TOKEN` and `COREOPS_STAGING_TEAM_ID` for read-only current-alias verification. Do not spoof or clear markers on a deployment to run the operator adapter. Use a genuine external operator process. Record actual backup and migration approval references before --apply.
5. Run the migration status command, review all pending SQL and compatible application/client revision, then separately authorize application. Use the matching direct TLS database URL for migrations; keep the pooled connection for normal server traffic. These commands never reset or seed:

```bash
node --env-file=/secure/staging-operator.env scripts/staging-migrate.cjs
# Only after target/backup/SQL approval; references live in protected operator env:
node --env-file=/secure/staging-operator.env scripts/staging-migrate.cjs --apply
```

6. Fill the unapproved `docs/staging-setup-approval.example.json` with the stable staging ID, existing intended test administrator and real references for target separation, synthetic-data review, backup and synthetic tax scenario approval. The pricing reference is already supplied by the founder's decision. This is not approval of actual tax registration. Input files must be private; output parent directory must be 0700. Run the read-only setup first:

```bash
node --env-file=/secure/staging-operator.env scripts/staging-setup.cjs \
  --manifest /secure/staging-setup-draft.json --report /secure/staging-dryrun.json
```

7. After explicit approval of that concrete result, prepare a final approved manifest/window. Obtain a fresh ordinary session token for the existing administrator through the supported Clerk client and complete real strict MFA. Save it privately, never in chat, command arguments, Git or logs. Only then authorize:

```bash
node --env-file=/secure/staging-operator.env scripts/staging-setup.cjs \
  --manifest /secure/staging-setup-approved.json \
  --session-token-file /secure/admin-session.jwt \
  --report /secure/staging-setup-result.json --apply
```

The tool cannot bootstrap a User/role/workspace. It checks the existing active SUPER_ADMIN, actual Clerk session/strict MFA and fresh proof, rechecks authority transactionally, serializes setup and records an atomic operator audit. It refuses conflicting existing configuration or offer snapshots. Repeating the same reviewed setup is designed to preserve existing rows/first audit, not create another catalog release. **The --apply/idempotency execution stage was not run in this task.**

8. Deploy only the reviewed compatible revision to the approved Preview branch using its existing trusted deployment workflow. Do not push/promote a branch that auto-deploys Production. Configure COREOPS_STAGING_ENABLED and the stable identity once, COREOPS_PAY1_PREVIEW_ENABLED=false, matching test keys and disabled unreleased features. No admission ID or per-deployment SQL is needed. Existing accounts/admins remain.
9. Through existing strict-MFA administration, verify/reuse the matching Paystack Test merchant configuration and channel/capability/settlement references; registration is repeatable and refuses unapproved inactive accounts. Configure only the **Test Mode** callback and webhook at the stable origin: `/payments/paystack/return` and `/api/payments/paystack/test/webhook`. Do not change Live endpoints. Confirm Vercel protection permits machine webhook delivery without a login/redirect; never put a protection-bypass secret in its URL.
10. Run read-only readiness. It reports local configuration/data checks, not proof of actual provider acceptance:

```bash
node --env-file=/secure/staging-operator.env scripts/staging-readiness.cjs
```

11. Complete the real acceptance checklist below, then deploy a second reviewed Preview revision with the same environment and prove returning customer/admin access without any admission/seed/bootstrap operation. Preserve results in protected durable custody.

## Automated verification and evidence

- Staging PostgreSQL/domain journey: **20 passed including parent**, zero failures. Synthetic Clerk/Paystack boundaries; real identity rows, acknowledgment hashes, market/provisioning, quotes, paid periods, permissions, constraints, webhook races, audit rollback, annual price/period and financial evidence.
- Environment/operator identity/MFA-proof unit checks: **3 passed**; deployment IDs may change, wrong branch/project/Production/test credentials and prohibited flags fail. Operator metadata fetch is substituted.
- Setup CLI **dry-run-only test: 1 passed**; counts unchanged, missing existing role fails rather than creating one. No setup --apply or bootstrap was executed.
- Existing authorization/commercial/identity/payment/lifecycle/Proxy: **90 passed**, zero failures.
- C/N-X export/recovery: **29 passed**. N-B/C/D notifications: **61 passed combined**, sequential local captures/HTTP/fake-ledger mocks only.
- Existing legal evidence / market: **15 / 15 passed**. P-C1 invoice tests: **9 passed**. Combined auth/routing/pricing/privacy/environment units: **92 passed**, zero failures (includes the environment and authentication configuration checks).
- Full-chain/populated migrations, schema validation/generation and final drift: passed. Typecheck and local production builds passed; focused/full lint has no new errors (existing business-page warnings remain).
- Actual local Chromium: monthly/annual toggle and official amounts, Enterprise Contact Sales and no database-count changes passed. Final browser run also exercises unsigned Test webhook rejection and unavailable Live route. External browser requests are blocked; this is **not** real Clerk login or Paystack payment acceptance.

The account-recovery fixture initially replayed a completed webhook and correctly received no new activation. The corrected scenario uses an explicit authenticated reconciliation after restoration; duplicate webhook semantics were retained. Sandbox-only process restrictions initially blocked the authentication-inspector child and Turbopack port binding; permitted local reruns passed without changing safeguards.

Initial regression runs used an incompatible rehearsal name and shared synthetic tax setup; separate dedicated test databases corrected fixture isolation without loosening guards. Initial browser probes were rejected by Clerk's placeholder key handshake and then the expected build/runtime public-key mismatch; correcting public-route ownership and building with the matching isolated configuration resolved them. These failed attempts are not presented as provider passes.

Automatic approval review rejected a proposed --apply setup fixture command because it included creating a synthetic SUPER_ADMIN/audit fixture, treating it as conflicting with the earlier no-bootstrap instruction. That command did not run. The safer read-only CLI test passed instead. A separately authorized setup-application/idempotency fixture test remains outstanding; the operational tool itself creates no platform roles.

Reproduction uses only already migrated disposable local databases:

```bash
npm run test:staging
npm run test:staging-config
node --env-file=.env scripts/with-staging-rehearsal.cjs \
  node tests/staging-operator-dryrun.test.cjs
npm run typecheck
npm run lint
npm run build
# For the local browser fixture, build and run using identical synthetic config:
node --env-file=.env scripts/with-staging-rehearsal.cjs npm run build
PLAYWRIGHT_BROWSERS_PATH=/tmp/workflowconnect-playwright npm run test:staging-browser
```

Playwright is pinned as a development dependency. Chromium was installed only in temporary local storage. Browser tests require a free port 3000, stop only their own server, and do not reuse another developer server. Install Chromium in the operator's chosen test cache before reproducing. Test screenshots are `/tmp/workflowconnect-staging-pricing-{monthly,annual}.png`.

Disposable databases: `coreops_auth_rehearsal_staging_261112`, `coreops_auth_rehearsal_staging_preserve_261112`, `coreops_auth_rehearsal_market_legal_staging_reg_261112`, `coreops_auth_rehearsal_exports_staging_261112`, `coreops_auth_rehearsal_notifications_nd_staging_261112`. These are local test databases, not additional Neon resources. Existing shared/live databases were not renamed, reset or migrated.

Protected evidence is `/tmp/workflowconnect-staging-*.log` and `/tmp/workflowconnect-staging-preservation.json`; temporary storage is not durable acceptance custody. The [exact changed-file inventory](/home/rmuya/rhoda-work/coreops_dashboard/docs/staging-changed-files.txt) excludes earlier bootstrap-preparation artifacts.

## Real acceptance still required

Use synthetic accounts and actual Test Mode only; do not substitute fabricated provider proof:

- [ ] Record reviewed project/stable alias/trusted branch, existing Preview database isolation, synthetic-data assessment, migration history and backup/restore evidence.
- [ ] Execute approved one-time setup with the existing live-verified test SUPER_ADMIN and strict MFA; prove replay does not duplicate catalog/audit and creates no User/role/workspace.
- [ ] Fresh registration, real email verification, synthetic acknowledgment, KE declaration, one restricted workspace and selected plan/interval; unauthorized operations denied before activation.
- [ ] Actual checkout using an approved Test merchant/channel; inspect signed delivery and independent verification, exact amount/currency/reference, one receipt/period and immediate authorized workspace access.
- [ ] Failed/abandoned/pending checkout recovery, duplicate signed events, repeated callback, renewal, annual coverage, reviewed upgrade and independently verified reversal/reconciliation.
- [ ] Logout/return with retained identity/data; shared-user and cross-tenant denials; nonadmin/role-change/MFA checks and restricted-country inquiry.
- [ ] Second Preview deployment, same staging configuration, no admission changes/reseed/bootstrap, retained customer and administrator access.
- [ ] Matching runtime/build keys, public URLs, webhook reachability, log IAM/retention, provider rate limits/capacity and operational support/reconciliation ownership.

**Verdict:** source implementation and substantial isolated verification are delivered for review. The requested deployed end-to-end staging outcome is **not yet accepted**. Architectural deployment approval, actual target/provider configuration, approved setup execution and real customer/browser/merchant acceptance remain. Production launch, live payments, actual tax/legal claims, destructive lifecycle work and unrelated unreleased features remain independently prohibited. Existing financial launch findings such as business-invoice number uniqueness are not silently closed.
