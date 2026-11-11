# PAY-1 — Preview assessment and blocked test admission

11 November 2026. **Read-only assessment incomplete: target access and release admission are blocked. No preview test or migration acceptance is claimed.** Use the existing preview database; no new database/branch was provisioned. This report records verified source findings and a conditional review plan, not permission to deploy or migrate.

## Target evidence and access blocker

The connected Vercel service lists only the **Kinari** team and 12 projects; none is WorkflowConnect/CoreOps. The repository's historical URL, `workflow-connect-git-main-stravect-systems-90ef5233.vercel.app`, was submitted to the deployment metadata API with Git information requested; it returned **404 deployment not found**. This does not prove the deployment no longer exists: the owning account/team may be outside the connected authorization. No protection was disabled or temporary public share created. Neither Vercel nor Neon CLI is installed in this shell; no replacement tool or credentials were installed.

The connected Neon service lists three projects, but none has an established WorkflowConnect preview mapping. No candidate database was selected or queried just because its region or name seemed plausible. No production database was opened to establish a comparison. Existing repository guidance explicitly says the Vercel preview is in a separate account and records the URL only as historical evidence: [preview guidance](/home/rmuya/rhoda-work/coreops_dashboard/docs/preview-clerk-setup.md), [staging acceptance](/home/rmuya/rhoda-work/coreops_dashboard/docs/phase5-staging-acceptance.md).

| Required fact | Current disposition |
| --- | --- |
| Current immutable preview deployment ID/URL, project/team and deployed Git SHA | **Requires external access/confirmation.** Local HEAD is `a3fa0dea3ee2e81d022785fe4d1392e157abd6c7`; dirty working-tree changes are not proof of deployed content. |
| Preview database branch/endpoint/database/role and production separation | **Unverified.** No active mapping obtained; names/regions alone are insufficient. |
| Applied migration names/checksums/failed states and deployed Prisma version | **Unverified.** The local 32-migration chain is not preview evidence. |
| Synthetic-only versus real customer records | **Unverified.** No records, identifying fields or raw logs inspected. Treat as potentially real until provenance is established. Aggregate counts alone cannot certify synthetic origin. |
| Current environment flags, test/live credentials, webhook URL/scheme | **Unverified.** No WorkflowConnect environment secrets retrieved or printed; no provider dashboard accessed. |
| Recoverable target backup/checkpoint, retention and restore authority | **Not established.** No backup created or restored while target identity remains unknown. |

Required input: connect the owning Vercel team/account and identify the current preview project/deployment and existing Neon preview branch/project. Credentials must remain in protected provider storage, not chat or this report. PAY-1 cannot complete against an unverified target.

## Confirmed source blocker and proposed admission

Current [workspace provisioning](/home/rmuya/rhoda-work/coreops_dashboard/src/server/services/workspace-onboarding.service.ts) unconditionally requires [market rehearsal](/home/rmuya/rhoda-work/coreops_dashboard/src/server/market/config.ts). That guard rejects any VERCEL/VERCEL_ENV marker and admits only named loopback rehearsals. Therefore this current source cannot perform the requested Kenya → pending workspace flow on Vercel Preview. This finding is independent of unknown deployed revision. **Stop before changing that gate.** Turning flags on, clearing Vercel markers, renaming databases or claiming localhost is not admission.

The [legal catalog](/home/rmuya/rhoda-work/coreops_dashboard/src/server/legal/config.ts) likewise rejects Vercel and only accepts synthetic documents. Registration additionally depends on [readiness](/home/rmuya/rhoda-work/coreops_dashboard/src/lib/auth/registration-readiness.ts) and legal configuration. The newly supplied Terms/Privacy are present in local page source with unresolved draft/effective-date fields; adding them did not approve them or create real exact-content publication evidence. Do not flip legal-ready flags to make synthetic registration pass.

Proposed separate engineering/release review:

1. Bind a preview-only admission contract to the verified Vercel project/environment, exact central HTTPS origin, existing nonproduction DB identity/schema and isolated Clerk instance. Fail closed on production, mismatched targets and unknown admission. Retain truthful Vercel markers.
2. Admit only allowlisted synthetic actors/cases under an explicit PAY-1 window, reviewed policy and audit evidence. Enable Kenya OPEN self-declaration for new synthetic cases; keep international manual positive approvals blocked pending unresolved validity policy. Restricted-market negative tests must still deny provisioning/activation.
3. Preserve all market, Owner, MFA, paid-quote, funding, reversal and activation checks. Do not use legacy null-linked workspaces as a new-onboarding workaround or classify old records.
4. Resolve an explicit isolated test-registration/legal presentation contract with the current identity gates. Any synthetic preview legal adapter must remain distinct from real approved legal publication and receipts; it is additional reviewed engineering, not an environment-only toggle of P-C2C. Do not fabricate a real acceptance or silently waive existing registration checks.
5. Keep lifecycle enforcement/processing, secure exports and notification capture/simulation/engineering/send disabled. [Lifecycle guard](/home/rmuya/rhoda-work/coreops_dashboard/src/server/lifecycle/config.ts), [export guard](/home/rmuya/rhoda-work/coreops_dashboard/src/server/data-access/security.ts), [notification guard](/home/rmuya/rhoda-work/coreops_dashboard/src/server/notifications/config.ts) remain unchanged; [external Resend transport](/home/rmuya/rhoda-work/coreops_dashboard/src/server/notifications/resend/release.ts) still throws. No deletion/schedule or new message producer is needed for PAY-1.

No admission implementation or release-gate change was made.

## Conditional migration/backup plan — authorization required later

Local chain contains 32 migrations. Actual pending set must be calculated from read-only preview `_prisma_migrations` names/checksums/completion status and schema catalog, compared to the exact proposed release revision. Inspect columns, enums, indexes, FKs, checks/triggers and required extensions. Compare installed/generated Prisma client/schema and build artifacts too; successful local drift is historical rehearsal evidence only.

Review particularly: Lifecycle B/job outcomes; C export/recovery; notification foundation/integrity/canonical/simulation/Resend constraints; N-X availability/deadlines; market foundation/integrity; legal evidence. These are not uniformly harmless additions: constraint replacement and stricter triggers can reject existing rows/writes; the legal migration replaces the legacy receipt User cascade with **Restrict**. Existing column defaults/constraint definitions and populated compatibility must be assessed. Market migration seed is prospective policy, not customer approval. No past country/approval/legal evidence may be backfilled automatically. Never edit applied migrations or skip dependencies by cherry-picking later files.

Before presenting exact SQL for approval:

- Establish preview/production separation from account-scoped mapping and DB identity, accounting for pooled/direct aliases and role permissions; do not rely solely on hostname inequality.
- Obtain minimized data provenance and read-only aggregates/schema checks. If real or uncertain records exist, restrict all PAY-1 writes to explicit test-owned identities and preserve all other evidence.
- Identify a recoverable checkpoint **on the existing preview target**, its timestamp/LSN, actual retention deadline, access/keys and restore procedure. If provider checkpoint/snapshot operations require new infrastructure, propose them separately; this task does not authorize another database/branch.
- Prepare an encrypted, restricted direct-connection logical backup where appropriate; verify artifact identity, integrity and restoration procedure without dumping records into logs. A listed recovery window or dump exit code alone is not demonstrated recovery. A restore rehearsal needing another target requires separate approval under the no-new-database instruction.
- Review the exact pending migration SQL, populated preconditions, locks, disk/connection headroom, maintenance/quiescence and full prior-column preservation fingerprints. Pair schema and client release deliberately.
- Rollback means stopping new test traffic/checkouts, preserving ambiguous provider references/events and using an approved forward correction or coordinated checkpoint restore plus compatible prior app revision. An old app rollback alone does not undo schema or payment facts. Reconcile provider transactions occurring after a checkpoint before reopening; never discard real financial evidence or replay autoactivation.

A target-specific migration/rollback approval request cannot yet be made: deployed history and backup readiness are unknown. No migration command was run.

## Paystack specification and configuration review

The current official [webhook documentation](https://paystack.com/docs/payments/webhooks/) was inspected. It describes timestamped `Paystack-Signature` with a `whsec_` key, SHA-512 HMAC over timestamp-dot-raw-bytes, multiple keyed signatures, constant-time comparison and a 300-second tolerance. It also documents legacy raw-body `x-paystack-signature` using the API secret. Test delivery retry behavior differs from live. The applicable account/mode signing setup must be confirmed rather than assumed.

[Signature source](/home/rmuya/rhoda-work/coreops_dashboard/src/server/payments/paystack-signature.ts) implements these two schemes, with explicit legacy opt-in and no fallback from an invalid modern header. [Webhook route](/home/rmuya/rhoda-work/coreops_dashboard/src/app/api/payments/paystack/[mode]/webhook/route.ts) bounds raw body to 256 KiB, verifies before processing, and returns generic failures. This is source inspection, not actual signed-provider acceptance. Application verification failures currently return retryable errors; durable reconciliation and response duration need preview observation.

Proposed configuration, after target/admission approval: Preview-only `PAYSTACK_TEST_SECRET_KEY`, merchant/currency/channels and actual capability/settlement evidence; per-test-mode webhook signing secret or explicitly reviewed legacy opt-in; exact origin in routing; HTTPS `/payments/paystack/return` callback and `/api/payments/paystack/test/webhook`. Keep live checkout disabled and Live credentials absent from the test runtime. Store the Test public key only where the selected integration needs it: current [server redirect integration](/home/rmuya/rhoda-work/coreops_dashboard/src/server/payments/paystack.ts) uses server initialization/hosted checkout and does not consume a public key. Do not add an unused NEXT_PUBLIC secret/config value to claim completion.

Confirm the Paystack **Test** settings and webhook destination are independent of Live settings. Do not overwrite a production webhook or shared test integration used elsewhere. Preserve credential fingerprint binding, exact KES minor units, mode/merchant/channel metadata and immutable receipt/reversal evidence. Callback URLs do not credit or activate. Independent verification may mark a request funded, while only authorized SUPER_ADMIN activation grants a paid period. No credential or provider setting changed.

## Acceptance status and next steps

All real preview scenarios are **NOT RUN**: account registration/Clerk/MFA, Kenya pending provisioning, quote review/acceptance, hosted Test checkout, signed webhook, independent verification, exactly-once receipt persistence, pending activation, SUPER_ADMIN activation and operational role access. Invalid signatures, duplicate/retry/abandoned/failed payments, reference/amount/currency mismatch, concurrent reconciliation, restricted markets and recovery after market change are also **NOT RUN on preview**. Prior mocked/local regressions do not substitute for these results. No payment or test-owned preview record was created.

After target access is restored: complete read-only mapping/history/provenance/backup assessment; present exact migration and preview-admission changes for separate approval; then run the requested synthetic Test flow and negative/recovery matrix with protected references, timestamps and scoped DB assertions. Capture provider event/transaction IDs without credentials/payer data and confirm one receipt/no automatic activation. Maintain honest reconciliation of legitimate financial events after market changes.

A later **separately authorized live-money test** needs explicit target/merchant/actor/amount/currency/channel, legal and market eligibility, live-key isolation, financial/settlement/refund ownership, unique reference, signed callback/verification/receipt checks, activation decision and a stop/recovery plan. No live test amount or authorization is inferred from PAY-1.

Only this assessment document was created. No source, migrations, environment, database data, provider configuration, release gate, deployment or customer communication changed. No new database or branch was provisioned. **Stopped at the access and onboarding-admission blockers; PAY-1 end-to-end acceptance remains pending.**
