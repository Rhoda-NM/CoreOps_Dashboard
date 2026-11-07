# CoreOps launch readiness checklist

7 November routing update: [Phase 4 implementation and Phase 5 acceptance status](phase4-navigation-and-phase5-acceptance.md). Navigation regressions pass locally; real signed-in HTTPS/subdomain acceptance is still a launch gate.


7 November local startup follow-up: [database availability, public catalog fallback and Turbopack cache repair](local-startup-troubleshooting.md). Public pages now tolerate recognized catalog outages; the original local database still requires the newer commercial migrations. Use the documented isolated rehearsal runner for authenticated development.

Reviewed: 5 November 2026. Scope: repository review and local lint/type checks; production infrastructure, Clerk settings, real email delivery, backups, and browser journeys have not been verified.

Follow-up: workspace authorization, identity/onboarding concurrency, tenant constraints, assignments, invitations, and audit logging have since been implemented and tested locally. See [implementation and verification evidence](workspace-authorization.md). The findings below preserve the initial audit; authorization-related findings no longer describe the current code. Production and signed-in browser verification remain outstanding, along with unrelated launch work.

Milestone 2 follow-up: [acceptance report](milestone-2-acceptance.md) records passing build/type/lint checks, expanded isolated authorization tests, and pending real-session browser acceptance.

Subscription/platform follow-up (6 November 2026): [implementation and rollout policy](subscription-platform-implementation.md) and [automated/browser acceptance report](subscription-acceptance.md). New onboarding is pending activation with no trials; provisional prices remain unpublished. Commercial migrations were rehearsed only on a restored isolated database. Legacy activation policy, pricing/tax/accounts, administrator bootstrap/MFA and real signed-in acceptance remain blockers before applying to the original environment or deploying.

Fresh deployment follow-up (7 November 2026): [private administration, VAT controls, Paystack preparation and verification](fresh-deployment-paystack-vat.md). The disposable-local-data decision is settled; a protected final backup is preserved. All migrations passed from empty and provisional offers remain unpublished. Stravect is not yet VAT registered, so VAT charging remains disabled. Cloud store creation, real Clerk/MFA and merchant acceptance, statutory invoice validation, production bootstrap/migrations and deployment remain outstanding.

WorkflowConnect rebrand follow-up (7 November 2026): [design audit, implementation and QA report](workflowconnect-rebrand.md). Public/application branding and metadata are updated without database renames or permission changes. Public onboarding remains early-access contact by default; draft pricing is not published. Domain/trademark/legal/provider-brand approval, signed-in acceptance and production mobile-performance validation remain outstanding.

**Current decision: not ready for public launch.** Complete the blocking work below, then prove the complete user journeys in staging and production. An unchecked item is unverified, not necessarily absent from external infrastructure.

For each item, record an owner, target date, test/deployment reference, evidence, and reviewer. P0 blocks any customer-data pilot. P1 blocks public launch unless explicitly removed from the advertised product scope. P2 can follow a controlled launch with an owner and deadline. Do not mark a requirement complete based only on code review.

## Findings from this repository

| Priority | Finding | Required outcome / evidence |
| --- | --- | --- |
| P0 | `src/server/auth/get-current-user.ts` reads then creates users; layout and page can call it concurrently. | Race-safe identity provisioning; concurrent first requests return the same local user without uniqueness errors. |
| P0 | The same helper reassigns an existing email record to the current external ID without checking verified-email ownership or an existing different binding. | Make Clerk external ID authoritative. Reject conflicting bindings; use an explicit, verified migration/linking process for legacy records. Test conflicts without transferring workspace access. |
| P0 | Workspace membership is checked before the creation transaction in `create-workspace.ts`. Two requests can create two workspaces. | Establish single-workspace vs multi-workspace policy; enforce onboarding deduplication transactionally. A retry returns the original workspace. |
| P0 | Invoice creation has no request deduplication or unique invoice-number constraint. The workspace-scope migration removed global invoice-number uniqueness. | Add workspace-scoped invoice-number uniqueness and durable idempotency; reconcile duplicates before applying constraints. |
| P0 | Project/task/invoice `workspaceId` fields are nullable and omitted by their create services. Reads usually scope through client relationships. | Choose a canonical tenant model; populate, backfill, and enforce consistent tenant relationships. Prove no cross-workspace reads or writes. |
| P0 | Financial inputs are weakly validated; normal invoice creation accepts any nonempty amount string. | Shared server validation for exact decimal amounts, finite values, precision, ranges, dates, and status transitions. |
| P1 | Quick invoice says “draft created”; `createInvoiceForClient` defaults to `SENT`. | Persist the intended DRAFT status. SENT must have a defined meaning and cannot imply email delivery that did not occur. |
| P1 | `Role` exists but reviewed service mutations only require membership. | Define and enforce owner/manager/staff permissions server-side, or launch explicitly as owner-only. |
| P1 | Revenue this month uses invoice creation date, with no payment timestamp; outstanding includes all statuses except PAID. | Define financial metrics, record payment dates, exclude inappropriate draft/cancelled amounts, and reconcile totals against fixtures. |
| P1 | Invoice search and overdue filters both assign `OR`; search can overwrite the overdue condition. | Combine independent conditions with AND; test combined filters and counts. |
| P1 | Lists use unbounded `findMany`, sometimes including all related tasks/invoices. | Add bounded pagination, selective fields, and realistic-volume performance tests. |
| P1 | Pricing stores leads only in browser localStorage; demo uses a timer before navigating to the real dashboard. | Persist leads server-side or remove the promise; make demo isolation and signup handoff explicit. |
| P1 | Settings is a placeholder; activity service and `src/api/**/route.ts` files are empty. Those API files are outside `src/app`. | Remove unsupported promises or finish the flows. Implement required endpoints under the Next.js route convention and test them. |
| P1 | No test files or CI workflow found; package scripts have no test/typecheck commands. | Require automated critical-flow, authorization, concurrency, lint, type, and production-build checks. |
| P1 | Lint: 10 errors and 20 warnings; `npx tsc --noEmit`: passed. Production build not run in this review. | Clear errors, review warnings, and run a reproducible production build with generated Prisma client. |
| P1 | Migration history adds required columns without backfills; a separate workspace backfill script exists. | Rehearse migrations against empty and populated databases; verify ordering, drift, and safe backfills. |

## 1. Signup, identity, sessions, and onboarding — P0

Authentication follow-up: see [Clerk finalization evidence and configuration checklist](clerk-auth-finalization.md). Draft Terms/Privacy pages and inactive versioned receipt support are implemented; legal approval, provider settings, and real-session acceptance remain blockers.

- [ ] Configure a dedicated production Clerk instance, production keys, owned domain, allowed redirects, and verified email delivery; keep development and production identities separate.
- [ ] **Deployment implementation: automatically email workspace invitation links** to the invited address after an owner creates an invitation. Configure a verified sender and production-domain acceptance URL; include the workspace, invited role, and expiration. Queue delivery after the invitation commits, deduplicate sends, retry transient failures, and expose delivery failures with a resend option. Preserve verified-email acceptance, expiration, and revocation checks. Verify delivery to real test inboxes before enabling this in production. Current behavior requires the owner to copy and share the link manually.
- [ ] Test signup, verification, resend, expired/invalid codes, duplicate email, signin, signout, password reset, and every enabled OAuth provider using real inboxes.
- [ ] Define verified-email requirements; test unverified and missing-primary-email accounts and safe email changes.
- [ ] Make local user provisioning atomic with unique external identity, bounded conflict retry, and safe handling of email collisions. Avoid a database write and Clerk profile fetch on every read where unnecessary.
- [ ] Test 20 concurrent first authenticated requests: one user, no 500s, stable identity, and no access to another user's data.
- [ ] Make onboarding transactionally idempotent, including a committed response lost before the browser receives it. Test double-clicks, two tabs, refresh, back, and network retries.
- [ ] A partially completed signup resumes onboarding; an existing member reaches the dashboard without loops or duplicate workspaces.
- [ ] Test expired/revoked sessions during reads and mutations; signout removes access, including browser back navigation and cached content.
- [ ] Define account deletion, suspension, profile updates, and identity-provider outage behavior. If using webhooks, verify signatures and safely deduplicate/reconcile events.

## 2. Tenant isolation and permissions — P0

- [ ] Document supported workspace selection and membership lifecycle; do not silently rely on “oldest membership” if users can belong to several workspaces.
- [ ] Derive workspace and actor from the authenticated session on every server action, service, and required API endpoint.
- [ ] Test a two-workspace matrix for every list, detail, create, update, archive, metric, and export; substituting another workspace's IDs must reveal and change nothing.
- [ ] Check client/project/invoice relationships together. Database constraints or equivalent transactional safeguards must reject inconsistent tenant relationships even outside the normal UI.
- [ ] Enforce a documented role matrix on the server; hiding UI controls is insufficient. Test revoked membership and role changes against active sessions.
- [ ] Keep authorization predicates in the mutation itself or protect the read/check/write sequence against membership and relationship changes.
- [ ] Confirm tenant-sensitive data cannot enter public caches, shared demo data, logs, analytics payloads, or error responses.

## 3. Data integrity, concurrency, and idempotency — P0

- [ ] Define invariants: one local user per external identity; onboarding creates the intended number of workspaces; invoice number unique per workspace; all related records belong to the same workspace.
- [ ] Backfill and validate workspace fields before adding NOT NULL/relationship constraints. Report nulls, mismatches, orphan records, and duplicate invoice numbers without silently deleting data.
- [ ] Give create requests a stable operation key generated once per intended operation and retained across retries. Use this for invoices, onboarding, and other create forms where duplicate records harm users.
- [ ] Persist deduplication records scoped by actor/workspace and operation, with payload hash, resulting record, outcome, and a documented retention window. Enforce a database unique key.
- [ ] Commit the business mutation and successful idempotency result atomically. Same key plus same payload returns the original result; same key plus different payload produces a conflict.
- [ ] Handle simultaneous requests, in-progress operations, rollback, and response loss. Do not deduplicate legitimate repeated work using names or amounts alone.
- [ ] Status setters should be safe to repeat; use expected version/status where stale writes must be rejected. A retry of PAID must not produce duplicate payment events.
- [ ] Retry only transient failures with bounded backoff; never blindly retry a non-idempotent financial operation. Show an honest “outcome unknown” state and reconcile when necessary.
- [ ] Keep related multi-row changes in transactions. If adding email, payment, or other external side effects, use a transactional outbox and provider deduplication rather than holding a database transaction open over network calls.
- [ ] Test a response dropped after commit, 20 parallel requests with one key, reuse with different payload, process termination, database disconnect, and retry after recovery. Expect exactly one committed intended operation.
- [ ] Review cascading deletes: deleting a client currently cascades into projects and invoices. Define archive/retention rules, confirmation, recoverability, and restricted hard deletion.
- [ ] Record an audit trail for sensitive changes: actor, workspace, operation, record, time, and relevant before/after values; redact secrets and limit access.

## 4. Invoice and business correctness — P1

- [ ] Share validation between normal and quick-create flows; validate on the server regardless of TypeScript types or browser restrictions.
- [ ] Specify currency policy, decimal precision, rounding, maximum values, tax behavior if supported, and negative/zero amount rules. Avoid converting decimal money through floating-point for storage or arithmetic.
- [ ] Display supported currency precision consistently; current KES formatting hides fractional amounts.
- [ ] Define allowed invoice transitions, paidAt/payment records, correction/reversal rules, and what SENT means. Manual PAID status must not imply processor-verified payment.
- [ ] Define outstanding, overdue, collected revenue, drafts, and cancelled invoices once; dashboard, lists, filters, and totals must agree.
- [ ] Define workspace time zone, calendar-month boundaries, date-only deadlines, and when an item becomes overdue; test month ends and time-zone boundaries.
- [ ] Test archived clients, completed/cancelled projects, invalid dates, excessive input lengths, combined filters, empty states, and deleted/stale references.
- [ ] If charging for CoreOps: implement and test checkout, plan entitlements on the server, payment failure, cancellation, and signed idempotent billing webhooks before enabling paid plans. Otherwise clearly launch as free/beta without a simulated checkout.

## 5. Database durability and recovery — P0

- [ ] Provision a production PostgreSQL service with durable storage, private/restricted access, TLS, least-privilege credentials, pooling, and connection limits appropriate to the deployment model.
- [ ] Separate production, staging, and local databases. Production must not depend on a developer laptop or localhost Docker port.
- [ ] Enable automated backups and point-in-time recovery where available; document retention, encryption, access, and backup failure alerts.
- [ ] Set agreed recovery objectives. Proposed starting targets: RPO <= 15 minutes and RTO <= 2 hours; confirm cost and provider support before committing.
- [ ] Restore a backup into an isolated environment and verify users, memberships, relationships, and financial totals. Record actual recovery time and usable recovery point.
- [ ] Rehearse database restart/failover, pool exhaustion, unavailable database, disk/storage growth, and credential rotation; failures must not cause duplicates or false success messages.
- [ ] Document a production migration procedure using the installed Prisma version's deployment command; never use reset or development migration commands on customer data.
- [ ] Prove fresh migration replay and upgrade from representative populated data, including identity and workspace backfills. Verify applied history matches the schema.
- [ ] Use compatible schema changes and a tested forward-fix/restore plan; application rollback alone does not undo database changes.

## 6. Deployment and security — P1

- [ ] Choose production/staging hosting, owned domain, HTTPS, region near the database, and accountable operators; document each dependency and its failure mode.
- [ ] Build from the lockfile with the selected Node version; explicitly generate Prisma client because generated output is ignored by Git.
- [ ] CI blocks release on lint, type errors, critical tests, migration checks, and production-build failure. Scan dependencies and review relevant security advisories.
- [ ] Validate required environment variables at startup; store secrets in the deployment secret manager and provide a sanitized configuration template.
- [ ] Verify secrets and real customer data are absent from source history, client bundles, logs, fixtures, and preview deployments. Rotate any exposed credentials.
- [ ] Review security headers, cookie/session configuration, allowed origins, server-action exposure, input limits, and rate limits for auth, onboarding, writes, and public lead capture.
- [ ] Restrict database/admin access; use individual operator accounts and strong authentication. Document credential rotation and emergency access.
- [ ] Test deployment rollback, dependency outage, and interrupted release. Define who can pause writes or stop a rollout.

## 7. User experience and performance — P1

- [ ] Complete a fresh-user journey on a production-like build: signup -> verify -> workspace -> client -> project -> task -> invoice -> updates -> signout -> signin -> persisted data.
- [ ] Provide useful loading, empty, validation, unauthorized, not-found, and recoverable-error states. Do not expose raw database errors to users.
- [ ] Disable duplicate submissions while pending while retaining server deduplication. Preserve user input on failure; show success only after a confirmed commit.
- [ ] Ensure mutations refresh every affected list, detail, total, and dashboard view; test navigation and refresh after updates.
- [ ] Test slow networks, offline/reconnect, expired sessions, mobile layouts, keyboard navigation, focus, labels, contrast, and screen-reader error feedback.
- [ ] Bound all lists and search inputs; inspect queries against representative large workspaces and set database statement/request timeouts.
- [ ] Define an initial load envelope: expected active users, peak concurrent sessions, records per workspace, and writes per minute. Test expected peak and 2x peak with realistic data.
- [ ] Proposed initial targets: 99.9% monthly availability, <1% unexpected server errors, p95 core reads <2 seconds and writes <3 seconds at expected peak. Agree measurement boundaries and tune after observing real usage.
- [ ] Give the demo an isolated dataset and clear handoff to signup. Replace browser-only waitlist storage with reliable consented capture if lead collection is in scope.
- [ ] Resolve unexplained browser errors and stale service-worker requests; verify cache invalidation after deployment.

## 8. Monitoring, support, and customer trust — P1

- [ ] Capture server/client errors, request IDs, release versions, latency, query/pool saturation, and dependency failures with appropriate redaction.
- [ ] Track signup -> verified account -> workspace -> first successful record; alert on onboarding failures, duplicate conflicts, unusual authorization failures, and sustained write errors.
- [ ] Add a minimal liveness check, protected readiness/dependency check, and external synthetic journey using a dedicated test tenant; do not expose sensitive diagnostics publicly.
- [ ] Alert a named primary and backup operator. Test an alert from failure detection through acknowledgement and recovery.
- [ ] Publish a working support channel and define incident severity, response expectations, escalation, customer updates, and incident review.
- [ ] Establish privacy notice, terms, data retention, export/deletion process, subprocessors, and consent practices appropriate to the actual users and jurisdictions; obtain qualified review where needed.
- [ ] Verify export and account/workspace deletion workflows, including identity provider and backup retention handling. Keep advertised functionality aligned with shipped behavior.

## 9. Release evidence and go/no-go

- [ ] Assign every P0/P1 an owner and attach evidence. No unresolved identity takeover, cross-tenant access, lost-write, duplicate financial operation, or restore failure is acceptable.
- [ ] Run automated unit/integration tests for validators, permissions, constraints, status rules, metrics, and filters; real-Postgres tests for transactions/races/idempotency; browser tests for critical journeys.
- [ ] Pass staging smoke, concurrency, failure/recovery, and migration rehearsals against the exact release candidate. Production build and real browser verification remain required.
- [ ] Run a small invited pilot, observe for an agreed period, review support and error reports, then expand traffic gradually. Use explicit stop criteria for auth failures, tenant leaks, duplicate invoices, or failed writes.
- [ ] Before opening access: verify production auth/email/DNS, a recent restorable backup, alerts, support coverage, rollback artifact, and no seed/demo customer data in production.
- [ ] After deployment: create a dedicated test account, exercise the core journey, verify persisted records, test isolation with a second tenant, and inspect dashboards. Clean up only identified test records.
- [ ] Record final signoff from engineering, product, and the person responsible for operations; keep a release log and follow up on P2 items.

## Suggested execution order

1. Identity linking and concurrency; tenant invariants and permissions.
2. Workspace/invoice idempotency; financial validation, statuses, and metrics.
3. Migration rehearsal, database durability, and a measured restore drill.
4. CI and critical-flow tests; error handling, observability, and performance.
5. Production auth/domain setup, truthful demo/pricing, pilot, and final signoff.

## References

- [Clerk production deployment](https://clerk.com/docs/guides/development/deployment/production) — production instance and domain setup.
- [Clerk account linking](https://clerk.com/docs/guides/configure/auth-strategies/enterprise-connections/account-linking) — identity linking and verified email considerations; the application's custom email linking needs its own safeguards.
- [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers) — handlers belong under the app directory.
- [Prisma deployment migrations](https://docs.prisma.io/docs/orm/prisma-client/deployment/deploy-migrations-from-a-local-environment) — deployment pipeline guidance. Use commands supported by the repository's pinned version, not a newer major version's examples.
