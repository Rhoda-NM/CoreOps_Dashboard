# Fresh deployment, private administration, VAT and Paystack preparation

7 November 2026. **Code preparation and local verification completed; cloud rollout and real-session/payment acceptance remain blocked.** No production migration, administrator bootstrap, live collection, or local destructive cleanup was executed.

## Confirmed decisions

- Existing localhost workspaces are disposable development data. Start preview and production from empty databases; do not restore local identities, workspaces, assignments, payment attempts or test receipts into either environment.
- Use Neon in Europe. Frankfurt (`aws-eu-central-1`) was selected for the attempted provisioning.
- Stravect has no VAT registration yet, as confirmed by the operator. No VAT rate, registration reference or effective date is assumed. VAT charging remains disabled.
- Platform roles require explicit provisioning of a verified Clerk identity, active database-backed authorization, enrolled MFA and recent verification of both factors. No administrator is created at sign-in.
- Paystack confirms payment; it does not approve the commercial agreement, activate workspaces, renew subscriptions automatically or authorize recurring charges.

## Database evidence

The local PostgreSQL container was stopped at the start of this work and was started to perform the authorized backup/rehearsal. The source database was not migrated or cleaned up.

Final custom archive: `.backups/coreops-final-local-20261107.dump` (directory mode 700, archive mode 600, git-ignored). A second protected copy is `/tmp/coreops-final-local-20261107.dump`; the archive contents were inspected with `pg_restore -l`. Local filesystem storage is not a substitute for a protected off-host backup before deployment.

Source counts before and after verification: two workspaces; zero clients, projects, tasks, invoices and subscriptions. The operator confirmed these workspaces are disposable. No required business records were found in those tables; the backup retains identities, memberships, audit and legal records rather than deleting them.

All **13 migrations** were applied from zero to a second empty local database, `coreops_auth_rehearsal_release_20261107`. The historical chain was not rewritten or squashed. Historical required-column migrations succeed for this empty-deployment policy; this is not a claim that arbitrary populated pre-workspace databases can migrate without their documented audits/backfills.

The only explicit extension required by the migration chain is `btree_gist`, used for paid-period overlap exclusion. It was present at version 1.7 in the final rehearsal. Confirm the extension and permissions on the actual preview/production service before applying migrations. Final Prisma schema comparison: **No difference detected**.

After fixture cleanup the final rehearsal has zero Users, Workspaces, PlatformAdmins, TaxConfigurations, PaystackAttempts and SubscriptionPaymentReceipts, and zero published offers. The eight provisional catalog drafts come from migrations and remain unpublished; no customer or payment fixtures are deployment seeds.

### Cloud provisioning status

The connected organization is `Vercel: Kinari` (`org-flat-mode-29926787`), managed by Vercel. Neon project creation returned **HTTP 404: action restricted; organization is managed by Vercel**. A subsequent CoreOps project search returned no projects. No preview/production cloud database was created by this session, and no unrelated existing project was modified.

The operator chose to create two empty European Neon stores through Vercel. Pending that step:

1. Create separate CoreOps preview and production stores/projects in Europe, with independent credentials. Do not clone an existing application branch or restore local data.
2. Connect the preview URL only to Preview, production only to Production. Use environment-specific Clerk keys/instance, Paystack keys, application origin and webhooks. Never put a production migration credential in preview.
3. Set pooled `DATABASE_URL` for application traffic and direct `DIRECT_URL` for migration traffic. Prisma migration configuration now prefers `DIRECT_URL`; the local rehearsal runner overrides both URLs to prevent an ambient direct URL targeting another database.
4. With both URLs securely supplied as `COREOPS_PREVIEW_DATABASE_URL` and `COREOPS_PRODUCTION_DATABASE_URL`, run `npm run check:environment-isolation`. It checks distinct endpoint/database identities and credentials and opens read-only transactions. It never prints connection strings or modifies schemas. This preflight has not run against cloud stores because they do not exist in the current connection yet.
5. Rehearse/validate preview with the pinned Prisma version. Production migrations remain a separately approved action. No production schema or data copy is authorized by this report.

The development Prisma cache signature also includes the connection target so hot reload cannot keep a client connected to a previously selected environment. No environment file was overwritten.

## Private administration

`/platform/sign-in/[[...sign-in]]` uses the installed Clerk `<SignIn>` with path routing, sign-up disabled in the component and fixed return to `/platform`. It is outside the protected route-group layout, so it can render before sign-in. `/platform/access-denied` is a safe explanatory page.

The proxy redirects unauthenticated platform requests to the private sign-in URL. Protected pages redirect authenticated nonadmins or sessions without sufficient MFA evidence to access denied. Every administrative service still checks the active PlatformAdmin, role and recent MFA independently; route/UI visibility is not authority.

Platform lookup uses the verified Clerk external ID and an existing active administrator relationship directly. It does **not** call automatic local User provisioning. A Clerk-only identity, customer workspace OWNER, or public signup cannot create a platform administrator. No Clerk Organizations migration was introduced.

The supported Clerk flow supplies sign-in, recovery and MFA screens. Actual provider configuration, enrollment, fresh/expired second-factor sessions, recovery and revoked sessions still need a real browser pass; no browser was connected. The native component's OAuth availability does not prove private admin eligibility.

The existing audited development bootstrap CLI remains guarded and was not executed. A fresh production database cannot manufacture its first administrator through sign-in. See the separately prepared [production bootstrap review procedure](production-admin-bootstrap-review.md): it requires exact target identity/database, independent review, a concrete operator job, explicit approval and atomic identity/role/audit handling. Production bootstrap execution is not approved here.

## VAT implementation and limits

`TaxConfiguration` is an immutable, platform-controlled, versioned record with registration status/reference, prospective effective timestamp, exact percentage, allowed quotation treatments and approval evidence. Only an active authorized SUPER_ADMIN can record a version; version/effective dates must advance under a serialized configuration lock. No tax configuration is seeded or activated automatically.

`/platform/tax` exposes the controlled configuration/history. Nonregistered, deregistered or unverified status cannot have a positive rate. REGISTERED requires a nonempty verified registration reference; database checks and service validation enforce that condition. A forward migration explicitly addresses SQL CHECK's NULL semantics. Future configurations do not charge VAT before their effective date.

Quotation calculation uses Prisma Decimal with two-decimal half-up money rounding:

- Exclusive: base net plus calculated VAT equals payable.
- Inclusive: the displayed total is split into net and included VAT; VAT is not added again.
- Exempt: zero VAT only under the approved configuration/treatment. An unconfigured zero-VAT snapshot records UNVERIFIED; it is not evidence of legal exemption or registration.
- Without effective verified registration, VAT is zero. A manually entered VAT value must match the server calculation exactly; it cannot enable charging.

Approved requests retain exact net/tax/payable/rate fields plus the configuration version, status/reference, effective date, treatment and approval snapshot. Approved tax snapshots cannot change. New manual and provider receipts copy that snapshot; later registration/rate changes do not rewrite historical accepted quotes or receipts. Partial-payment snapshots describe the agreed quotation, not a fiscal allocation of VAT to each partial receipt.

Published pricing distinguishes base amounts, inclusive display amounts and final payable; unregistered configuration states that no VAT is charged. Offers with treatments no longer allowed by the current configuration are excluded from new public selection, while accepted historical quotes remain intact.

**Fiscal-document validation is not complete.** The current operational Invoice model remains an internal invoice tracker with invoice number, amount/status and relationships; it lacks a complete issuer/customer tax identity, item/tax-category breakdown, statutory tax-invoice numbering and eTIMS fiscal issuance/acknowledgement model. Subscription receipt snapshots are payment confirmations, not approved statutory VAT invoices. No document should be advertised as a compliant tax invoice until Stravect's tax adviser verifies registration/tax-point rules, invoice/receipt fields, retention, and applicable eTIMS obligations. KRA describes electronic tax invoice/eTIMS requirements for VAT taxpayers; nonregistration must not be assumed to remove other electronic-invoicing obligations. Reference: [KRA VAT information](https://www.kra.go.ke/individual/filing-paying/types-of-taxes/value-added-tax).

## Paystack preparation

The implementation uses Paystack's server API through fixed HTTPS endpoints, bounded timeouts and secret keys confined to the server. There are no reusable authorizations, plan codes, automatic renewal charges or Paystack subscription creation calls.

- `initializePaystack` requires a freshly rechecked active OWNER, accepted commercially approved quote, tax snapshot, and active verified receiving account matching `paystack:<mode>:<merchantId>`. It works while the business is pending activation but grants no operational access.
- Exact quote money is converted to integer minor units within safe gateway limits. Currency is KES; no USD billing or assumed currency conversion is enabled. Supported channels must be configured and commercially verified for the actual merchant.
- A durable attempt and payer claim are committed before network initialization. Workspace/idempotency uniqueness, a single unresolved attempt per request and locked owner/request checks prevent concurrent duplicate checkout creation. The reference is generated by the server. A reused key cannot select another request/mode/merchant.
- The initialization POST is claimed once before network I/O. Ambiguous timeouts preserve the same reference for reconciliation; they never silently retry a POST or invent a replacement charge. This conservative path may need operator recovery when the provider has no initialized transaction.
- An approved Paystack merchant account is recorded through platform controls only after server configuration supplies capability/settlement approval references. The actual account association and settlements still require independent merchant-dashboard verification. No account is seeded.
- Checkout is disabled by default. Live credentials require `COREOPS_ENVIRONMENT=production` and cannot run in a Vercel nonproduction environment. Conversely, test payments are rejected in production, even when test keys were accidentally copied there. The current UI chooses the environment on the server; hidden/direct requests cannot bypass the mode checks.

### Webhook and confirmation path

Public endpoint: `/api/payments/paystack/test/webhook` or `/api/payments/paystack/live/webhook`. It bypasses Clerk session redirect only; it does not bypass webhook authentication.

The handler reads at most 256 KiB of raw bytes and verifies the signature before parsing or persisting payment events. Timestamped `Paystack-Signature` uses the configured `whsec_` secret, SHA512 HMAC, key-labelled signatures, constant-time comparison and a five-minute window. The legacy `x-paystack-signature` scheme is available only through explicit per-mode opt-in. An invalid or unexpected modern signature never falls back to legacy. Official reference: [Paystack webhooks](https://paystack.com/docs/payments/webhooks/).

A signed `charge.success` is a notification, not sufficient credit evidence. The server independently calls the [transaction verification API](https://paystack.com/docs/api/transaction/) using the same credential fingerprint that initialized the attempt. It requires successful status, exact reference, mode/domain, amount, currency, configured channel, request/workspace/attempt metadata and merchant binding; an integration ID, when returned, must also match. Split/subaccount/recurring-plan transactions are rejected. Metadata alone is not merchant authentication; the authenticated API/key binding and independently verified receiving account are essential.

Received event hashes, attempt references, provider transaction IDs and receipt links are durable and uniquely constrained. Crediting locks the workspace, rechecks quote consistency and creates the receipt, request readiness, attempt completion and tenant audit together. Provider confirmations use an explicit PAYSTACK source with no invented human verifier. Composite foreign keys bind attempts and receipts to their exact payer claim, workspace, request and account.

Concurrent/replayed events create one receipt. A crash after receipt commit but before event acknowledgement is safe to retry. Unknown references are retained for review; verification mismatches/failures enter review and return a retryable error without credit. The platform payment page provides authenticated server-side reconciliation; administrator authority is rechecked transactionally for the reconciliation write/audit. Receipts remain immutable and existing reversal/overpayment review policies apply.

`/payments/paystack/return` is informational. It reads no trusted payment-success flag, creates no receipt and activates nothing. A confirmed transaction can make a request READY_FOR_ACTIVATION; only the existing independently authorized SUPER_ADMIN activation service creates a paid period and activates the workspace. Bank payout settlement is not inferred from a gateway success response.

Current checkout initializes the entire payable amount and does not combine outstanding manual partial payments with a new gateway checkout. Reconcile existing claims first. Refund execution, settlement synchronization, disputes/chargebacks and operational alerting need separately verified provider procedures before live use.

See [configuration template](payment-configuration.env.example). No real Paystack keys, merchant ID, channels or payout-settlement evidence were supplied, so no provider initialization/verification was performed against a real merchant and no live button was enabled.

## Verification results

| Verification | Result / boundary |
| --- | --- |
| Empty-database full migration chain | All 13 migrations passed on the local release rehearsal; no legacy records copied |
| Extension and drift | `btree_gist` 1.7; Prisma reports No difference detected |
| Combined integration tests | **60 passing Node tests including containers; zero failures**, using real isolated PostgreSQL and substituted Clerk/Paystack boundaries |
| New payment/security tests | Exact inclusive/exclusive arithmetic, no pre-registration VAT, immutable quote/receipt snapshots, private sign-in with no provisioning, nonadmin redirects, test/live isolation, duplicate initialization/webhooks, provider mismatches, body/signature limits, redirect nonactivation and SUPER_ADMIN-only activation |
| Existing regressions | Workspace roles/assignments/seat limits, identity collision protection, onboarding concurrency, renewal/grace, audit rollback and last-owner protection remain passing |
| Additional regression programs | Auth configuration/disclosure, Prisma cache and status-control programs pass |
| TypeScript/build | Typecheck and production bundle passed; no deployment |
| Lint | No errors; 12 existing unused-import warnings in business pages |
| HTTP smoke | On temporary port 3100 with the fresh rehearsal: private sign-in 200 with heading; access-denied page 200; `/platform/payments` 307 to private sign-in; `/pricing` 200 with unpublished-catalog notice; unconfigured webhook 503 without Clerk redirect |
| Real signed-in browser | Not performed: no connected apps/browsers. Clerk MFA, admin identity bootstrap, recovery, account linking, expiry/reverification and authenticated RSC/API inspection remain unverified |
| Real Paystack/settlement | Not performed: no merchant/test credentials or verified channels/settlements supplied. Mock HTTP tests do not establish merchant capability |
| Cloud environment isolation | Not yet verified: organization provisioning restriction; operator will create stores through Vercel |

Local evidence: `/tmp/coreops-release-{empty-migrations,alltests,unit,build,lint,drift}.log`. Reproduction:

```sh
# Run only after creating a genuinely empty local rehearsal database.
COREOPS_COMMERCIAL_REHEARSAL_DB=coreops_auth_rehearsal_release_20261107 \
  node --env-file=.env scripts/with-commercial-rehearsal.cjs npx prisma migrate deploy
COREOPS_COMMERCIAL_REHEARSAL_DB=coreops_auth_rehearsal_release_20261107 \
  node --env-file=.env scripts/with-commercial-rehearsal.cjs node --test --test-concurrency=1 \
    tests/commercial.integration.cjs tests/authorization.integration.cjs \
    tests/identity.integration.cjs tests/proxy.test.cjs tests/paystack-vat.integration.cjs
npm run typecheck
npm run lint
npm run build
```

Tax-configuration fixtures are global commercial configuration, so run these database suites serially against an isolated database. Test cleanup is confined to fixture-owned records.

## Remaining launch blockers

1. Create the two European Neon stores via Vercel (operator action), verify isolation/extension permissions and safely configure environment scopes. Preview validation is pending; production migrations/deployment still need explicit approval.
2. Select exact approved Clerk administrator identity, complete real MFA/recovery acceptance, review the concrete production bootstrap job and obtain explicit approval before execution. No administrator was bootstrapped.
3. Keep VAT disabled while unregistered. Before any future VAT charge, establish legal registration basis/effective date/rate and approve the prospective configuration. Complete fiscal invoice/receipt and eTIMS review; current snapshots do not constitute that approval.
4. Configure Paystack test merchant, verify actual account/currency/channels, webhook scheme/retries and payout settlements. Complete test checkout, lost callback, duplicate notification, mismatch and reconciliation acceptance against the real test account. Live collection/buttons require separate explicit approval and readiness evidence.
5. Complete real signed-in browser tests, including private/nonadmin routing, MFA enrollment/expiry/recovery, revoked administrators, OWNER/MANAGER/STAFF tenant isolation and inspection of authenticated responses. No connected browser is available.
6. Approve pricing/legal document versions, upgrade/lifecycle policies, notifications, rate limits/monitoring, backups/recovery and other original launch P0/P1 gaps. Automatic recurring charges remain disabled. See [launch readiness](launch-readiness.md).
