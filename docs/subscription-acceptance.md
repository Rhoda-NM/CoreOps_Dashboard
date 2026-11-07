# Commercial lifecycle acceptance report


7 November Phase 4 follow-up: [navigation, account/invitation/payment continuation and metadata results](phase4-navigation-and-phase5-acceptance.md). Phase 5 HTTPS/Clerk staging acceptance is prepared and remains pending the operator’s Vercel connection; prior phase evidence below is historical.

7 November routing follow-up: [Selected Slugs and Phase 3 implementation](selected-slugs-phase-3-routing.md) adds owner-chosen addresses, explicit hostname routing, central-service host guards and subscription-loop regression checks. Default path mode and commercial authorization remain; no deployment or live configuration changed.

7 November subdomain follow-up: [Phase 1–2 review](workspace-subdomain-phase-1-2.md) records the implemented host/URL policy foundation, bounded slug allocation, read-only local audit and isolated onboarding tests. Hostname rewrites, Clerk/domain settings and production rollout are not enabled.

7 November local schema repair: the configured localhost development database has now been backed up, rehearsed on a restored copy, and migrated through all 13 migrations. Existing fields and records were preserved; both workspaces are PENDING_ACTIVATION. No production database or activation changed. See [local repair evidence](local-startup-troubleshooting.md#local-dashboard-schema-synchronized). Earlier unmigrated-local statements below are historical.

6 November 2026. **Implementation is prepared for review; not approved for production launch.** See [architecture, policies and rollout](subscription-platform-implementation.md).

7 November follow-up: [fresh deployment, private admin, VAT and Paystack report](fresh-deployment-paystack-vat.md) supersedes the legacy-tenant decision below. Local workspaces are confirmed disposable; the final protected backup is preserved and the full migration chain has passed on a new empty database. VAT registration is not established, so charging remains disabled. Operator-created European Vercel/Neon stores, real Clerk/MFA acceptance and merchant verification remain pending. The earlier results below are retained as historical evidence.

## Automated verification

| Check | Result and limits |
| --- | --- |
| Restored-database migration rehearsal | Both new migrations applied successfully to `coreops_auth_rehearsal_commercial_20261106`, restored from the fresh local backup. Original database not migrated. |
| Ownership audit | All ten existing scope/ownership problem counts zero; no orphan IDs. |
| Schema comparison | Pinned Prisma 7.8 `migrate diff`: No difference detected. Raw SQL checks, triggers, partial uniqueness and period exclusion constraints are additionally exercised by tests. |
| Legacy preservation | Source/rehearsal counts and complete record fingerprints matched for User, Workspace, WorkspaceMember, Client, Project, Task, Invoice and Subscription after fixture cleanup, ignoring only newly added fields. Source has 2 users, 2 workspaces, 2 memberships, and no business/subscription records; synthetic populated fixtures supply additional coverage. |
| Integrated commercial + existing authorization/identity/proxy tests | **48 passing Node tests, including suite containers; zero failures.** PostgreSQL is real; Clerk identity/MFA/provider responses and Next request boundaries are substituted. No real money or real customer data was used. |
| Additional regression programs | Three test programs passed: auth configuration/disclosures, Prisma client cache regeneration, and asynchronous status controls. |
| Server rendering | Existing role-sensitive dashboards and new pending-subscription page rendered in automated checks; pending page has no operational links or provisional seed prices. This is not interactive browser testing. |
| TypeScript | `npm run typecheck` passed with generated Next route types. |
| Build | `npm run build` passed; production bundle contains the platform and subscription routes. No deployment performed. |
| Lint | Focused new-module lint passed. Full lint: no errors; 12 existing unused-import warnings in business pages. |
| HTTP smoke | Temporary production server on port 3100 used the isolated rehearsal URL. `/pricing` returned 200, displayed catalog-pending text and no provisional draft prices. `/platform` and a protected workspace subscription URL returned 307 at the authentication boundary. The temporary server was stopped. Redirects do not establish successful signed-in access. |

Automated scenarios include:

- Pending owners denied operational reads/writes and invitations; default subscription is pending, never trialing.
- Owner-only commercial views, cross-workspace denial, Support audit redaction, and no platform-role tenant access.
- Platform role enforcement, MFA enrollment/freshness boundary, and missing-second-factor denial despite first-factor fallback.
- Concurrent identical request keys return one request; key/payload mismatch and additional simultaneous open requests fail.
- Concurrent identical payment keys return one submission; duplicate claimed references fail.
- Published approved catalog selection; draft pricing unavailable; approved offer/quote snapshots cannot be rewritten.
- Explicit quote acceptance before payer submission; independent partial receipts; underfunded activation denied; own-payment verification denied.
- Global duplicate actual transaction and ledger receipts fail; cross-workspace payment/request references fail at PostgreSQL.
- Concurrent activation returns one period; early renewal appends without overlap; existing paid access survives a pending renewal.
- UTC month-end and leap-year calculations, grace expiry at the exact boundary, expired read-only services, and late renewal starting at activation time.
- Database period overlap exclusion and same-tenant source-request constraints.
- Starter two invitation reservations plus owner; Business nine plus owner; concurrent requests cannot exceed limits.
- Suspended memberships retain capacity; expired/revoked invitations release reservations; invitation acceptance rechecks workspace status and capacity.
- Final-owner removal/suspension rejected; existing roles, assignments and identity collision protections remain covered by the prior regression suite.
- Approved/funded upgrade activation denied without the policy flag; after explicit next-period configuration, future Starter rights remain unavailable while the current Solo period is effective.
- Overpayment needs disposition; receipt reversal is immutable/audited, revokes its period, reconciles paid-through fields and suspends operations.
- Administrator revocation while activation waits is rechecked transactionally. Failed audit validation rolls back the workspace mutation.
- Unverified owner identity blocks paid activation. Activation/recovery do not transfer identities or memberships.
- Client-provided tenant/path headers cannot bypass URL-derived context.

These scenarios verify implementation behavior under controlled identity boundaries. They do not prove Clerk configuration, external payment receipt, Google authentication, or a usable real-session MFA flow.

## Manual browser validation

**Not performed.** Browser inventory returned no connected apps or browsers. No claim of a signed-in OWNER, MANAGER, STAFF, billing administrator, Support or SUPER_ADMIN session is made. No bootstrap target, receiving-account details or business/tax approval was supplied; no real administrator was created and no offer was published.

Run the following in an isolated staging environment with disposable identities and test payments, recording screenshots, request/RSC response evidence, persisted records, reviewer and date:

| Journey | Status |
| --- | --- |
| Clerk signup/sign-in, Google and existing-account recovery, legal acceptance as approved | Unverified; prior Clerk configuration blockers still apply |
| New pending business → tier request → approved quote → accepted instructions → submitted claim | Unverified in browser |
| Billing review and independent receipt verification, partial/rejected/duplicate/overpaid claims | Unverified in browser and against a real receiving account |
| SUPER_ADMIN activation and retry, owner identity recovery errors | Unverified in browser |
| Single-workspace automatic entry and pending redirect | Unverified in browser |
| Multiple workspaces and simultaneous tabs retaining their URL context | Unverified in browser |
| OWNER/MANAGER/STAFF business access, expired read-only views, sensitive response inspection | Automated role checks pass; real authenticated responses unverified |
| Solo invitation denial, Starter/Business capacity, acceptance while suspended or expired | Automated services pass; browser interaction unverified |
| Early/late renewal, grace messaging, future upgrade entitlement timing | Automated services pass; browser interaction unverified |
| SUPER_ADMIN/BILLING_ADMIN/SUPPORT permissions, recent MFA, revocation, forbidden direct actions | Automated boundaries pass; actual Clerk claims and browser behavior unverified |
| Account security, MFA enrollment/recovery, first/second-factor reverification | Unverified; current development Clerk MFA configuration must be completed |
| Plan approval/publication, verified instructions, audit history and reversal review | Automated service/DB checks pass; operator/browser acceptance unverified |

## Remaining launch blockers and decisions

1. **Resolved on 7 November — fresh deployment policy:** existing local workspaces are disposable. A final backup is preserved; no required business data was found. Preview and production will be clean, with no legacy workspaces or payment fixtures transferred. The source remains intact because destructive cleanup was not approved. Cloud provisioning/preview verification remain pending; see the follow-up report.
2. **Commercial approval:** approve actual prices (including Solo annual), tax treatment, contract terms, receiving accounts, payment instructions and manual receipt/reconciliation procedures. Draft prices remain unpublished. USD billing is absent.
3. **Upgrade and lifecycle approval:** approve next-paid-period upgrades before setting `COREOPS_PLAN_UPGRADE_POLICY=NEXT_PAID_PERIOD`; immediate changes, downgrades and proration remain disabled. Approve the documented grace, suspension, reactivation, reversal and closed-workspace recovery policies.
4. **Administrator bootstrap/security:** identify the existing verified Clerk identity, enroll MFA, validate actual session factor evidence and recovery procedures, then run the approved privileged bootstrap. Establish audited administrator lifecycle maintenance and production bootstrap procedure. No public administrator signup exists.
5. **Signed-in acceptance:** connect a staging browser and complete the table above, including inspecting actual server/RSC responses for sensitive data and session expiry/reverification. HTTP redirects and mocked Clerk tests do not satisfy this.
6. **Clerk/legal launch gates:** the previous [Clerk finalization report](clerk-auth-finalization.md) still applies, including approved legal versions/effective dates, actual Google scope/branding review, production email and account deletion/MFA configuration.
7. **Notifications:** automatic invitation emails and 14/7-day renewal reminders are not delivered. Configure a verified sender, post-commit deduplication/retries, delivery observability and real inbox acceptance before advertising them. Manual links/support remain the current process.
8. **Production operations:** protected durable backups, populated production-data rehearsal, extension permissions, deployment coordination, monitoring/rate limits, and recovery after subsequent writes must be approved and verified. No production migration, data change, account publication or deployment has occurred.
9. **Scale and billing operations:** directory/history pages show the latest 100 records. Complete pagination/filtering and volume tests before exceeding that operational scope. Actual bank/M-Pesa reconciliation/refunds are manual, not provider integrations. Retention, refund/chargeback handling and commercial record recovery require an operator runbook.
10. Unrelated original P0/P1 items (notably operational invoice idempotency/validation and financial metric definitions) remain in [launch readiness](launch-readiness.md); subscription money validation does not resolve business invoice validation.

Evidence logs are local `/tmp/coreops-commercial-{alltests,types,build,lint-all,drift}.log`. The protected backup is `/tmp/coreops-before-commercial.dump`; move required evidence/backups to approved durable storage before relying on them for a rollout.
