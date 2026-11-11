# P-C2F — Market onboarding foundation engineering report

**Internal Working Draft — Founder Business Policy, Pending Legal and Operational Verification**

11 November 2026. **Implemented and tested in isolated local development only. Stop for engineering review. No production readiness or release approval.** This report applies the founder revisions to the [accepted design](/home/rmuya/rhoda-work/coreops_dashboard/docs/governance/pc2f-market-eligibility-design.md). It supersedes that design's proposed manual Kenyan review: Kenya is initially OPEN; country remains self-declared and is not independently verified. P-C2A/B governance, P-C1 containment and existing lifecycle/export/notification release boundaries remain in place.

## 1. Delivered behavior and policy boundary

Worldwide account registration/Clerk provisioning remains independent of country eligibility. A verified account can submit a business-country declaration, closed product interest, bounded use case and authority/accuracy attestation without any Workspace, Subscription, Owner membership or operational records.

The initial immutable policy is `KENYA-FIRST-v1`: `KE=OPEN`, default `REVIEW_REQUIRED`. An OPEN submission records an automatic `OPEN_POLICY` decision with actual applicant, policy/submission references and `SELF_DECLARED_OPEN_MARKET` reason. It does not fabricate a reviewer or independent country verification. REVIEW_REQUIRED creates an account-owned inquiry; UNAVAILABLE creates a policy-rejected case without provisioning. No nationality, IP location, mandatory certificate, new email destination or document upload was introduced.

After eligibility, the verified applicant may provision exactly one restricted PENDING_ACTIVATION Workspace, pending Subscription and Owner membership per case. Provisioning and existing workspace audit commit atomically, including the exact case, decision and operative submission used. Existing one-active-membership creation restriction remains: this checkpoint does not expand multi-workspace ownership. Shared users can still access their independently authorized memberships and own account inquiries.

Pending workspaces deny operational client/project/task/invoice/assignment/member/invitation services through the existing commercial/permission boundary. Account/security/legal/help, inquiry status and authorized subscription/quote/payment-status functionality remain separate. The ordinary subscription workflow is preserved: reviewed quote, acceptance, independently verified funds, capacity/Owner checks and funded SUPER_ADMIN activation. Market eligibility never supplies these conditions or grants export/recovery access.

Linked workspace operations, new commercial commitments, Paystack initialization, paid activation/replay and administrative ACTIVE restoration recheck market authority. Funds reconciliation, signed callbacks, reversal/restriction and historical financial views remain independently authorized even when market authority is lost. An actual payment callback can persist verified funds without activating a market-denied workspace. No refund or early-cancellation policy was added.

## 2. Exact files changed for this checkpoint

Pre-existing uncommitted lifecycle, Clerk, export, notification and P-C1 work remains. The working-tree diff also contains those earlier changes; they are not all P-C2F changes.

| Files | This checkpoint's change |
| --- | --- |
| `prisma/schema.prisma` | Four market models, closed enums, inverse relations and nullable unique Workspace linkage; explicit same-case pointer relations. Prisma formatting also aligns existing schema whitespace. No existing model removed. |
| `prisma/migrations/20261111000100_market_foundation/migration.sql` | Additive tables/indexes/FKs/checks/triggers and initial policy configuration only. No customer backfill. |
| `prisma/migrations/20261111000200_market_integrity/migration.sql` | Forward hardening: explicit SELF_DECLARED marker, nullable historical application-revision evidence, insert/pointer revision fences and bound-business change restriction. First applied migration was not rewritten. |
| `src/server/market/{config,access,service}.ts` | Rehearsal release gate; current eligibility; immutable submissions/decisions; review, prospective policy configuration, withdrawal, own-case projection and derived expiry. |
| `src/server/services/workspace-onboarding.service.ts` | Require own current eligible case, transactionally recheck identity, link provisioning once and audit exact decision. Existing slug collision retries remain. No unlinked application-service creation route remains. |
| `src/features/workspaces/actions/create-workspace.ts` | Submit declaration first or use own approved case; create restricted workspace only when eligible; otherwise redirect to own inquiry status. Generic failure handling and Next control flow retained. |
| `src/features/workspaces/components/WorkSpaceOnboardingForm.tsx`, `src/app/(onboarding)/onboarding/page.tsx` | Country registry/options, product interest/use case/attestation and server-issued retry key; explicit self-declaration/inquiry versus operational wording. |
| `src/app/account/market/page.tsx`, `src/app/account/market/actions.ts` | Account-only submission/status/withdrawal and explicit approved-case provisioning; expired manual decisions display EXPIRED and are unusable. No private review reasons returned in applicant decision projection. |
| `src/app/platform/(protected)/market/page.tsx`, `src/app/platform/(protected)/market/actions.ts` | Isolated SUPER_ADMIN review page/actions with reason, expected revision, operation key and synthetic approval deadline; generic action failures. |
| `src/app/account/[[...account]]/page.tsx`, `src/app/platform/(protected)/layout.tsx` | Inquiry/review navigation visible only when market rehearsal configuration is valid; existing identity/MFA/delete-self and platform checks preserved. |
| `src/server/commercial/access.ts`, `src/server/commercial/service.ts` | Compose market with operational entitlement; gate new commercial commitments and both ACTIVE paths; lock market before administrator; activation audit records exact used market references. Funding/reversal/lifecycle requirements retained. |
| `src/server/payments/paystack.ts` | New-checkout market guard only; verified receipt/callback reconciliation remains independent. No real provider configuration or protocol change. |
| `tests/market.integration.cjs`, `tests/market-fixtures.cjs`, `tests/market-http-smoke.cjs` | Real PostgreSQL/domain/concurrency/tampering tests, fixture-scoped dependency cleanup and actual disabled built-route checks. No production cleanup executor. |
| `tests/authorization.integration.cjs` | Existing onboarding regressions now obtain actual synthetic OPEN applications and send declaration fields; test adapter passes application ID to the real service. Missing identity is rejected before membership insertion. No market guard mocked away. |
| `scripts/market-migration-fingerprint.cjs` | Named-loopback preservation guard; READ ONLY prior-column fingerprints, protected new evidence file, verification after migrations. |
| `package.json` | Adds `test:market` using the existing guarded rehearsal runner; no dependencies or lockfile changed for P-C2F. |
| This report | Evidence, limits, compatibility and stop boundary. Historical design/governance/legal/audit documents were not rewritten. |

Generated Prisma client was refreshed locally in node_modules; no deployment occurred. Source anchors: [market service](/home/rmuya/rhoda-work/coreops_dashboard/src/server/market/service.ts), [eligibility](/home/rmuya/rhoda-work/coreops_dashboard/src/server/market/access.ts), [onboarding](/home/rmuya/rhoda-work/coreops_dashboard/src/server/services/workspace-onboarding.service.ts), [commercial activation](/home/rmuya/rhoda-work/coreops_dashboard/src/server/commercial/service.ts), [schema](/home/rmuya/rhoda-work/coreops_dashboard/prisma/schema.prisma).

## 3. Data model, transitions and configuration

- **MarketPolicy:** immutable version/revision, default availability and validated country overrides. Initial policy is migration configuration, not historical customer evidence. Internal configuration service requires active SUPER_ADMIN/recent strict MFA, role recheck, serialized revision and atomic platform audit. No public generic settings API or policy administration UI was added.
- **MarketApplication:** immutable applicant binding, current/latest/operative pointers and optimistic revision; one nullable reverse Workspace binding. No global User.isEligible.
- **MarketSubmission:** immutable country/interest/use case/attestation and SELF_DECLARED source, policy, applicant, revision, operation key/hash. Server validation uses an explicit country-code registry and closed interests.
- **MarketDecision:** immutable automatic policy, APPROVE/DEFER/REJECT/REVOKE/WITHDRAW history, actor, genuine reviewer where applicable, reason, effective/recorded times, explicit manual expiry, operation key/hash and observed application revision. Nullable revision on pre-hardening history avoids inventing a revision; all new inserts require the actual revision.

SUBMITTED inquiry → APPROVED (OPEN rule or authorized manual review), DEFERRED or REJECTED; approved → explicit REVOKED; unbound applicant → WITHDRAWN. Manual APPROVE is allowed only for REVIEW_REQUIRED under that submission's policy and requires a caller-supplied future synthetic deadline in this release. Expiry is evaluated from database time without a scheduler; the persisted case state need not be rewritten to deny use.

Unbound, nonterminal updates append a submission and replace current authority with a new policy outcome; KE→review-market cannot retain an OPEN approval. Rejected/revoked/withdrawn cases cannot be silently reopened by edits. Provisioned-business changes are blocked: continuity, ownership transfer and country-change rules remain unapproved rather than implemented with guessed revocation behavior. No approval can be moved to another application/workspace. A fresh unbound case is a self-declared proposed business, not verified entity deduplication; deliberate false declarations cannot be disproved by this foundation. Business matching/abuse/authority evidence remains a future reviewed requirement.

Policy configuration is **prospective for new submissions**. It does not silently revoke prior operative decisions or classify legacy customers. Policy rollover and existing-business transitions require separate reviewed rules before release. UNAVAILABLE and DEFER/REJECT never authorize payments or provisioning. No legal retention period, default manual validity, automatic revocation or historical continuity period was invented.

Isolated resource bounds: use case ≤1,000 characters; reasons ≤1,000; five active cases per applicant and ten new submission revisions/hour; own list ≤25, reviewer list ≤50. Idempotent replays do not consume submission quota. These are engineering bounds, not legal retention/market-approval periods. Pagination/production volume and operational abuse acceptance remain future work.

## 4. Security and concurrency evidence

Existing Clerk verified binding is used; User-row locks recheck cached external-ID/email against current records before submission/withdrawal/provisioning. Case ownership never comes from posted userId/email. Central host and existing Server Action protections remain. Market-review pages and actions independently require existing SUPER_ADMIN/recent strict MFA; transaction rechecks active role and excludes applicant/self-review and workspace-member conflicts. BILLING_ADMIN cannot approve a market.

Provisioning serializes User→case and unique workspace linkage. Bound-case review locks Workspace→case→administrator; linkage is checked again after locking so concurrent conversion cannot violate lock order. Commercial administrative transactions take Workspace→case→administrator before activation/restriction operations. Review and provisioning races either commit one permitted outcome or return a safe conflict. Database time after locks enforces manual expiry. Provider calls remain outside application transactions.

Same key/same payload returns existing outcome; changed payload conflicts. Immutable rows, same-case/submission compound FKs, decision/pointer revision fences, immutable Workspace linkage and state/deadline checks reject tested corruption. Admin audit and decision/case changes are atomic; an injected audit failure rolls everything back. Provisioning/activation audit includes exact market references; later revocation does not rewrite historical funding/approval evidence.

Operational writes retain Workspace transaction locks and current role checks. Reads check current eligibility at the existing service authorization boundary; this is not a claim that already returned data can be recalled or that every subsequent query/stream is globally linearizable with a revocation. No positive market result is cached across requests. Layout/cookie navigation does not grant business access. Existing P-C1 generic error/code handling remains; no arbitrary exception/provider body or review text is newly logged to ordinary production logs.

Schema/DB controls are not resistance to a database owner replacing schema, seeding unlinked records or restoring an old database. Seed/import/backup operators and independent restore admission remain release blockers. No unrestricted production environment flag was added to convert a linked case into legacy eligibility: turning the rehearsal flag off denies linked access; the database rejects clearing/rebinding its link.

## 5. Migration rehearsal and legacy compatibility

| Target | Actual evidence |
| --- | --- |
| `coreops_auth_rehearsal_market_261111` | Initial empty-chain and forward-hardening development rehearsal; final domain regression checks. |
| `coreops_auth_rehearsal_market_chain_261111` | Entire final **31-migration chain** from empty; final market acceptance/domain suite and built HTTP checks; Prisma diff **No difference detected**. |
| `coreops_auth_rehearsal_market_preserve_261111` | Dedicated clone of `coreops_auth_rehearsal_notifications_nd_preserve_nx_261110` synthetic preservation fixtures. Both new migrations applied; all **40 prior tables / 67 records** matched full stored-row fingerprints for every pre-existing column. No market application/submission/decision backfill. |
| `coreops_auth_rehearsal_exports_nx_market_261111` | Separate migrated disposable export/recovery regression database. |
| `coreops_auth_rehearsal_notifications_nd_market_261111` | Separate migrated disposable N-B/C/D regression database; suites sequential because of shared test controls. |
| Normal local / preview / production | No migration, fixture, classification, cleanup or customer-data assessment performed. No deployed compatibility claim. |

Existing Workspace links remain null. Existing accounts/memberships/commercial history are preserved; legacy unlinked access retains existing authorization rather than assuming Kenya/approval or imposing new market denial. Null is a **legacy transition gap**, not positive eligibility. All new application-service provisioning requires a case. New application code/client must be paired with the additive schema on an authorized target: this report does not certify running the new Prisma client against an unmigrated application database, and no deployment is authorized.

No existing customer was classified as Kenyan/international, no historical approval or country inferred, and no old access revoked. Shared users keep independent memberships. New linked cases remain isolated-only even with their flags set; no deployed rollout path is provided. A later historical assessment, transition/admission record and current independent revocation/restore evidence require explicit approval. Do not rename a real database or misstate environment markers to bypass rehearsal restrictions.

A fresh copy of synthetic populated data was used; old backups were not overwritten/opened/deleted. Fingerprint evidence is `/tmp/workflowconnect-market-preservation.json` (0600), created with exclusive-write protection. Migration scripts are additive and applied history was not edited. The first drift check exposed SQL pointer constraints absent from the Prisma relation declarations; matching declarations corrected representation, without removing/replacing SQL constraints. Final drift is clean; raw triggers/checks also need their integration assertions, not only Prisma diff.

## 6. Verification results and limits

| Check | Final evidence |
| --- | --- |
| Market PostgreSQL/domain suite | **15 passed including parent container**, zero failures (14 scenarios). Kenya OPEN/self-declaration, zero-tenant inquiries, foreign/direct creation denial, concurrent provisioning, manual role/MFA/conflict/stale review, country revisions, real funded activation/renewal, revocation/replay/status restoration, shared legacy membership, SQL tampering, decision race/audit rollback, withdrawal/provision race, reviewed recovery versus market denial, synthetic signed callback after revocation, RSC authorization, explicit expiry and prospective UNAVAILABLE policy. |
| Existing authorization/commercial/identity/Paystack/lifecycle/Proxy | **88 passed including containers**, zero failures, final market-chain rehearsal. |
| C/N-X export/recovery | **29 passed including parent container**, zero failures, dedicated final-schema rehearsal. Existing grants/TTL/fences/cancellation safeguards unchanged. |
| N-B / N-C / N-D notifications | **26 / 24 / 11 passed including containers**, zero failures, final-schema notification rehearsal; local captures/fake ledger/HTTP mocks only. Includes existing synthetic restore drills; no external email. |
| Navigation / host / lifecycle-policy / P-C1 safe errors | **4 / 9 / 3 / 8 passed**, zero failures. |
| Authentication configuration / independent ZIP format | **3 / 1 passed**, zero failures. |
| Schema validation/generation, full-chain/populated migrations, drift | Passed; raw database integrity assertions additionally exercised. |
| Typecheck / focused lint / full lint | Passed; focused lint clean. Full lint has zero errors and the 12 pre-existing business-page unused-import warnings. |
| Local production build | Passed; includes `/account/market` and `/platform/market`. No deployment. |
| Actual built HTTP | **3 disabled/unauthenticated route checks passed**, including forged context and POST denial; selected market/tenant/identity/evidence counts unchanged; temporary loopback server stopped. |
| Real signed-in Clerk/MFA/browser/provider/cloud runtime | **Not performed.** No live scope, deliverability, real payment, provider configuration or deployed operational claim. |

Identity/Clerk/request/cache boundaries and provider responses are substituted. PostgreSQL transactions, constraints, fingerprints, status/funding records, signature verification and local built routing are real. The callback uses synthetic keys and a replaced fetch implementation; no real Paystack or Resend request occurs. RSC checks inspect server-rendered projections with substituted identity, not an interactive signed-in browser. No general production performance/capacity claim.

Development corrections: a synthetic bank enum was corrected to existing BANK; advisory-lock output was cast to a supported result type; a React debug-tree projection assertion was made cycle-safe. Guards were retained. Turbopack port binding and a Python ZIP-reader child were blocked/stalled by sandbox process constraints; only this checkpoint's identified stalled test was stopped and permitted local reruns passed. No provider/account permission was changed to obtain passing results.

Reproduction (already migrated **disposable isolated** databases only):

```bash
COREOPS_COMMERCIAL_REHEARSAL_DB=coreops_auth_rehearsal_market_chain_261111 npm run test:market
COREOPS_COMMERCIAL_REHEARSAL_DB=coreops_auth_rehearsal_market_chain_261111 \
  node --env-file=.env scripts/with-commercial-rehearsal.cjs \
  node --test --test-concurrency=1 tests/authorization.integration.cjs tests/commercial.integration.cjs \
  tests/identity.integration.cjs tests/paystack-vat.integration.cjs tests/lifecycle.integration.cjs tests/proxy.test.cjs
npm run typecheck
npm run lint
npm run build
COREOPS_COMMERCIAL_REHEARSAL_DB=coreops_auth_rehearsal_market_chain_261111 \
  node --env-file=.env scripts/with-commercial-rehearsal.cjs node tests/market-http-smoke.cjs
```

Source gate: `COREOPS_MARKET_REHEARSAL_ENABLED=true`, numeric/localhost loopback PostgreSQL database named `coreops_auth_rehearsal_market_*`, and no VERCEL/VERCEL_ENV. All are required; the flag defaults off. Tests set synthetic values in-process; `.env` was not edited. Existing lifecycle/export/notification gates retain their independent restrictions. No Cron/schedule, external notification producer, country geolocation or live administrative bootstrap was added.

Evidence: `/tmp/workflowconnect-market-{migrate,forward-migrate,final-chain,tests,final-tests,regressions,exports,nb,nc,nd,preserve,drift,validate,generate,types,focused-lint,lint,build,http,units,format-tests,auth-config}.log`, plus protected fingerprints. New evidence was created under `umask 077`; temporary local files are not durable rollout custody or approved retention.

## 7. Remaining decisions and release blockers

1. **No production enable command.** Review a later code/release contract and target-specific schema/client migration authorization before any rollout. Real account/host/MFA/Server Action/UI acceptance, operator privileges and monitoring remain unverified.
2. Approve manual review validity/renewal, policy rollover, reconsideration, revocation/appeal and bound-business country/ownership-change rules. This release requires synthetic explicit approval expiry and blocks bound-case changes; it does not invent continuity or automatic revocation.
3. Separately authorize minimal existing-workspace assessment and choose reviewed transition/admission. Do not infer country from payment, email, currency or existing Owner membership. No null-link backfill or legacy enforcement is authorized here.
4. Resolve category retention/minimization, restricted review evidence/case custody and lawful exceptions with P-C2B reviewers. No deletion/anonymization/retention cleanup executor exists for these market records.
5. Approve independent restore/deletion/notification/market-decision reconciliation before production. Existing local witnesses do not prove restored old approvals/revocations/suppressions cannot be lost.
6. Review false declaration/business identity/duplicate-case abuse and production volumes/pagination/operational staffing without imposing unapproved nationality/certificate/geolocation collection. OPEN eligibility is explicitly self-declared, not country verification or legal market certification.
7. Lifecycle day-60 enforcement, exports, notification sending, provider changes, public legal documents, financial uniqueness/idempotency findings and destructive Lifecycle D retain separate approval gates. Market eligibility does not close them.

**Fixed in source / verified isolated:** new inquiry/OPEN-market eligibility, restricted provisioning and independent market/commercial authorization with durable decision evidence. **Still awaiting legal/operational/deployed acceptance:** the blockers above and real target rollout. No production/preview migration, live provider change, real payment, customer communication, historical customer backfill, live data access, deployed enforcement or deletion occurred. **Stop for engineering review; no further checkpoint or deployment started.**
