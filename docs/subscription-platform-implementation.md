# Subscription onboarding and platform administration

Implemented for review on 6 November 2026. **Not deployed; production launch is blocked.** The new migrations were applied only to a restored local rehearsal database. The original development database and production were not migrated. Run this branch against the migrated rehearsal until the legacy activation policy is settled.

## Commercial model

The existing `Subscription` remains the one-per-workspace commercial account. Existing identity binding, OWNER/MANAGER/STAFF permissions, project memberships, and tenant foreign keys remain intact. Platform administrators have a separate authorization domain; they acquire no tenant membership or access to clients, projects, tasks, invoices, or tenant financial reports.

| Record | Purpose |
| --- | --- |
| Workspace.activationStatus | PENDING_ACTIVATION, ACTIVE, SUSPENDED, CLOSED |
| SubscriptionPlanOffer | Versioned monthly/annual pricing, KES, tax treatment, member/project limits, feature entitlements, approval and publication |
| SubscriptionRequest | Initial/renewal/upgrade request, immutable catalog snapshot, reviewed quote, accepted quote, payment-instruction snapshot, idempotency key and payload hash |
| PaymentReceivingAccount | Independently verified M-Pesa/bank receiving account and approved instructions |
| SubscriptionPayment | Customer claim: proposed amount/reference; never proof of receipt |
| SubscriptionPaymentReceipt | Independently verified actual receipt, receiving ledger ID, transaction reference, amount, verifier and evidence |
| SubscriptionPaymentReversal | Append-only reversal record; no silent receipt edits or reuse of reversed references |
| SubscriptionPeriod | Non-overlapping paid period, grace end, effective entitlement snapshot, unique source request |
| PlatformAdmin | Existing verified CoreOps identity, active status, SUPER_ADMIN/BILLING_ADMIN/SUPPORT |
| PlatformAuditEvent | Transactional commercial/admin audit, separate from tenant audit |

Money uses `Decimal(18,2)` and server parsing rejects nonpositive, exponential, nonfinite, excessive-precision and out-of-range values. No floating-point money arithmetic is used. Included tax and additional tax are distinct: the additional tax field must be zero for inclusive/exempt quotations; exclusive quotations add the reviewed tax amount. No tax rate is assumed.

The seed catalog contains **unpublished, tax-unconfirmed drafts only**: Solo KES 1,500/15,000, Starter 2,900/29,000, Business 7,900/79,000, Enterprise quotation. These are not offers to customers. An authorized SUPER_ADMIN must create a version with approved tax treatment and record explicit business approval before publication. No receiving account, administrator, trial, payment, or paid period is seeded. USD billing is not enabled.

Approved offer versions cannot change except publication/withdrawal. Requests preserve plan, interval, version, catalog amount, currency, features, invitation entitlement, and project limit. Enterprise member allowance and final quote are settled during commercial review; approved quote money, member allowance, instructions and account are then immutable. Create a new request/version to correct commercial terms.

## Customer flow

`/onboarding` creates the pending workspace, its first OWNER, pending subscription and tenant audit atomically under the existing User-row lock. Repeated first submissions do not create another workspace. Signing in alone does not create a workspace. Invitation acceptance does not create a subscription.

`/w/[workspaceSlug]/subscription` allows the owner to rename the business, view published offers, submit/track requests, accept a reviewed quotation, view approved payment instructions, submit M-Pesa/bank references, and inspect paid history. Nonowners see a contact-owner/support message, without commercial details. Suspended workspace owners can review commercial information; CLOSED workspaces require operator recovery review.

Normal operational reads and writes require both the existing workspace role/resource policy and commercial access. Pending, suspended and closed workspaces have no business operations. A forged route header cannot select a tenant or bypass the pending-workspace navigation. Membership, assignment, client, project, task and invoice writes retain workspace locks and recheck access in the transaction. Project limits and feature entitlements are enforced in services. UI visibility is supplementary.

Pricing now reads only published, approved offers. The former hard-coded pricing, free beta promise and localStorage-only pricing lead promise are removed. The public page offers support contact when nothing is published.

## Request and payment transitions

| Transition | Authorized actor / requirements |
| --- | --- |
| New → SUBMITTED | Active workspace OWNER, published approved offer, matching initial/renewal/upgrade policy |
| SUBMITTED → QUOTED | BILLING_ADMIN or SUPER_ADMIN; confirmed tax, approved amount, member allowance, active verified receiving account, commercial notes |
| QUOTED → AWAITING_PAYMENT | Workspace OWNER explicitly accepts quote |
| AWAITING_PAYMENT → READY_FOR_ACTIVATION | Independent verifier records actual receipts covering payable amount; partial receipts remain awaiting payment |
| READY_FOR_ACTIVATION → ACTIVATED | SUPER_ADMIN only; accepted approved quote, eligible request, nonreversed verified funds, overpayment disposition if needed, active bound owner, capacity and period checks |
| Open → REJECTED/CANCELLED | Billing authority; cannot close a request while verified funds remain unreconciled |
| Claim SUBMITTED → REJECTED | Billing authority with reason; erroneous unverified reference claim is released |
| Receipt → reversed | SUPER_ADMIN with reason; historical unique reference/ledger remains consumed |

Customer-submitted references are not trusted confirmations. The verifier must independently inspect actual receiving-account records, confirm payer/business attribution, currency, amount, transaction identifier and ledger identifier, and record evidence. A person cannot verify their own submitted payment. This is a manual control, not an integration with M-Pesa or a bank.

Partial payments accumulate exact verified receipt values. Every submitted claim must be independently reconciled or rejected before activation, including additional receipts after the first coverage threshold. Overpayment requires an explicit disposition before activation and does not buy extra time or create a wallet credit. Refund execution remains an independently reconciled business process. A reversal before activation returns the request to payment review; reversal of an activated receipt revokes its period and suspends the workspace/subscription for SUPER_ADMIN review. No data is deleted. Reversed receipts can never be credited again using the same actual transaction/ledger identifier.

Activation commits period creation, subscription paid-through/grace, workspace activation, request completion and platform audit together. Repeated activation returns the original unique source period. It is the sole paid activation service. No webhook endpoint or unverified payment-confirmation bypass exists; a future provider integration must establish independently authenticated confirmation and retain the explicit authorized activation policy.

## Renewals, grace and upgrades

- Monthly and annual periods use UTC, exclusive ends, month-end clamping and a retained anchor day for continuous renewals. A 31 January renewal can end 28 February and the following period end 31 March. Annual leap-day anchoring is preserved across continuous renewals.
- Early renewals start at the latest nonrevoked paid-through date. Late renewals start at the later of that date and activation time. Pending renewal leaves the existing paid period intact.
- Seven days of grace follow the paid period. At the exact grace end, business writes and invitations stop; historical business reads remain available for ACTIVE workspaces with paid history. No data expires or is deleted.
- Persisted subscription status reflects commercial administration; effective access is calculated from paid/grace dates on each protected operation, rather than requiring a timer/cron to run successfully. PENDING_ACTIVATION/TRIALING/SUSPENDED subscription states do not establish paid access. Workspace suspension/closure blocks reads as well as writes.
- Expiry reminders at 14 and 7 days are **not implemented** because outbound notifications are not available. The platform dashboard shows expiring subscriptions; delivery must be added and verified separately.
- Upgrade requests follow commercial approval, quote acceptance, verified payment and SUPER_ADMIN activation. **Upgrade activation is disabled by default** until the proposed next-paid-period policy is approved. After approval, set `COREOPS_PLAN_UPGRADE_POLICY=NEXT_PAID_PERIOD` in the target environment. This schedules a higher eligible plan after the current paid-through date; old period entitlements remain effective until then. The setting is a proposed policy gate, not evidence of business approval.
- No immediate mid-period plan changes, self-service downgrades, proration, automatic renewals, or automatic charges are implemented.

## Seats and invitations

The OWNER counts. Solo permits exactly one OWNER, no invitations and no additional memberships. Starter allows three total seats, Business ten, Enterprise the agreed positive allowance. Every existing membership, including SUSPENDED, occupies a seat; removal releases it after assignment safeguards. Valid pending invitations reserve seats, including re-invitations of existing members. This conservative reservation rule prevents hidden capacity gains; revoke unnecessary links. Expired/revoked invitations release reservations. Membership itself has no expiration state in the existing architecture.

Invitation creation, reissue and acceptance serialize on the Workspace row. Acceptance rechecks activation, paid/grace access, invitation entitlement and current capacity. Suspended members cannot reactivate via an invitation. Revocation, expiration, retries and role changes do not create additional seats. Future upgrade entitlements do not increase current capacity before their period starts.

## Platform access and administration

| Capability | SUPER_ADMIN | BILLING_ADMIN | SUPPORT |
| --- | --- | --- | --- |
| Subscriber counts/directory | Yes | Yes | Yes, tenant metadata only |
| Requests, quote review, receipts, overpayment review | Yes | Yes | No |
| Final activation, suspension/reactivation/closure, receipt reversal | Yes | No | No |
| Offer publication/version creation, verified receiving accounts | Yes | No | No |
| Platform audit | Full authorized view | Commercial view | Classification/time/resource IDs only; no notes/metadata |
| Customer operational data through platform role | No | No | No |

Routes: `/platform`, `/platform/workspaces`, `/platform/requests`, `/platform/payments`, `/platform/history`, `/platform/offers`, `/platform/audit`, `/platform/security`. Lists are bounded to the latest 100 records; overview counts cover all workspaces. Full pagination and filtered large-volume administration remain launch work if the pilot exceeds that scope.

Each administrative service independently checks the live Clerk-linked identity, current active PlatformAdmin, required role, MFA enrollment and recent MFA verification using the installed Clerk SDK's `strict_mfa` check. Both factor ages must also be present and nonnegative in the Clerk-verified session claims, preventing the SDK's first-factor fallback from satisfying platform MFA. Mutations lock and re-read the administrator inside the transaction so concurrent revocation cannot authorize a stale write. The installed reverification API is marked beta; production validation of the exact session claims, MFA policy, and fresh sign-in/reverification experience is required. Expired verification denies access; sign in again with MFA. No development bypass exists.

Initial bootstrap: `npm run bootstrap:platform-admin -- --clerk-user user_... --reason 'Approved operator change reference'` is a dry run. It requires an existing local binding matching a fresh verified Clerk primary email, MFA, no banned/locked identity, and an empty administrator table. After independently reviewing the target, adding `--execute` creates one SUPER_ADMIN and its audit atomically under an exclusive table lock. Activation/reactivation separately recheck an active owner against a fresh verified, available Clerk identity and matching current local binding. It never links/provisions users or grants workspace membership. The CLI is restricted to the known local development/rehearsal database names and refuses NODE_ENV=production; production bootstrap requires a separately reviewed privileged operator procedure. Bootstrap was **not executed**: no approved target identity was provided. Later administrator grants/revocations require privileged audited maintenance; no public signup or arbitrary role-grant endpoint exists.

## Migration and rollout

Migrations `20261106000100_commercial_schema` and `20261106000200_commercial_constraints` extend the existing schema and preserve applied history. The second requires PostgreSQL `btree_gist`, adds exclusion/partial unique/check constraints, immutable-update triggers, and unpublished catalog drafts. Prisma's schema diff does not represent every raw SQL constraint; maintain the migrations as the source for those constraints.

Evidence: fresh custom archive `/tmp/coreops-before-commercial.dump` was created in `core_ops_db`, copied to the host and restricted to mode 600. A restored isolated `coreops_auth_rehearsal_commercial_20261106` received both migrations successfully. Source ownership audit returned zero issues in all ten checks. After automated fixture cleanup, record counts and fingerprints matched the source for User (2), Workspace (2), WorkspaceMember (2), Client/Project/Task/Invoice/Subscription (0 each). This proves preservation for this local dataset; it does not cover populated production commercial history. The tests additionally cover populated synthetic relationships.

**Legacy activation conflict remains unresolved:** the proposed migration gives existing workspaces the new PENDING_ACTIVATION default, while leaving all legacy identity, membership and subscription values unchanged. It does not invent verified payments, historical paid periods, trials or activation dates. This would restrict current workspace operations. Agree how each legacy tenant transitions before applying to the original database or another environment. Do not deploy application code against an unmigrated database.

For each target environment:

1. Resolve legacy activation and commercial policy approvals; identify the verified initial administrator. Approve prices, tax and receiving instructions independently.
2. Take and inspect a durable protected backup; `/tmp` archives are temporary. Run `prisma/audit-workspace-scope.sql` and `prisma/audit-commercial-readiness.sql` read-only.
3. Restore into an isolated target-like database, rehearse with pinned Prisma 7.8 and approved extension permissions, compare data, and run tests. No `db push`, reset, or destructive rollback.
4. Apply reviewed migrations in a coordinated rollout, generate Prisma, and restart the application so the generated client and database agree. Production application/migrations/bootstrap/publication require explicit approval.
5. Bootstrap via the approved operator procedure, configure/test Clerk MFA, create approved immutable offer versions, publish only approved prices, and register independently verified business accounts.
6. Complete real signed-in acceptance and a verified test payment lifecycle before admitting customers. Preserve rollback/recovery procedures that account for writes made after backup.

Local reproduction, after the isolated restore exists:

```sh
node --env-file=.env scripts/with-commercial-rehearsal.cjs npx prisma migrate deploy
node --env-file=.env scripts/with-commercial-rehearsal.cjs npm run test:commercial
node --env-file=.env scripts/with-commercial-rehearsal.cjs npm run test:authorization
npm run typecheck
npm run lint
npm run build
```

The guarded runner sets the subprocess URL to the named local rehearsal only; it never edits `.env`. Integration test guards reject the normal application database. See [acceptance report and remaining blockers](subscription-acceptance.md).

Provider reference: [Clerk reverification documentation](https://clerk.com/docs/guides/secure/reverification) documents the server check and first-factor fallback. The platform adds an explicit both-factor requirement; actual Clerk session/MFA browser acceptance remains outstanding.
