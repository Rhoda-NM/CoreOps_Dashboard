# P-C1 — Sensitive error disclosure and logging containment

11 November 2026. **Isolated engineering completed for review; deployed verification remains outstanding.** Baseline: the supplied 8 November privacy audit and [11 November readiness report](/home/rmuya/rhoda-work/coreops_dashboard/docs/privacy-compliance-readiness.md). No inference of a live customer-data exposure is made. P-C2 and destructive Lifecycle D are not started.

## Confirmed baseline and exact changed files

Before changes, quick invoice's catch logged the complete exception and returned arbitrary `error.message`. Its success text said “Invoice draft created,” but the shared service defaulted status to SENT. Authorization and workspace scoping existed independently of these defects. The current invoice schema has no invoice-number uniqueness constraint; duplicate-number prevention is a separate financial gap.

| Changed file | P-C1 change |
| --- | --- |
| `src/features/quick-add/actions/quick-create-invoice.ts` | Remove arbitrary messages/whole-error logging; approved validation remains; explicit DRAFT for this entry point; safe failure result codes/reference; separate creation from post-commit cache refresh; preserve framework redirects/not-found. |
| `src/server/privacy/safe-failure.ts` | Server-only closed-message/code mapper and minimal JSON log sink. No untrusted exception fields enter logs/responses. |
| `next.config.ts` | Narrow `Referrer-Policy: no-referrer` and `Cache-Control: private, no-store` for invitation paths and Paystack return only. No token format, URL/return, origin, authentication or callback redesign. |
| `tests/privacy-errors.test.cjs` | Synthetic boundary/marker tests, approved validation, typed conflicts, DRAFT/fallback wording, refresh failure, Next control flow, sink failure and header scope. |
| `tests/privacy-invoice.integration.cjs` | Existing paid-workspace fixture utilities + real isolated PostgreSQL for authorization, exact DRAFT persistence, malformed dates, genuine PK/FK errors, transaction/audit rollback and refresh-after-commit. Explicitly records existing duplicate-number behavior rather than claiming deduplication was fixed. |
| `tests/privacy-http-smoke.cjs` | Local final-bundle GET/HEAD header checks; private temporary server stopped afterward. |
| `package.json` | `test:privacy-errors` and guarded `test:privacy-invoices` commands. No new dependency. |
| [logging standard](/home/rmuya/rhoda-work/coreops_dashboard/docs/privacy-safe-logging.md), this report | Source contract, custody observations, test results and remaining deployment/provider requirements. No existing legal text or baseline audit edited. |

`src/server/services/invoices.service.ts`, authorization/identity services, Prisma schema, all migrations, lifecycle/export/notification release gates and provider settings were inspected but **not changed**. Shared invoice creation still defaults to SENT for other callers; quick invoice now explicitly requests DRAFT. This does not imply any email delivery.

Source anchors: [safe mapper](/home/rmuya/rhoda-work/coreops_dashboard/src/server/privacy/safe-failure.ts:17), [quick creation and refresh](/home/rmuya/rhoda-work/coreops_dashboard/src/features/quick-add/actions/quick-create-invoice.ts:61), [scoped headers](/home/rmuya/rhoda-work/coreops_dashboard/next.config.ts:4), [unchanged transactional service](/home/rmuya/rhoda-work/coreops_dashboard/src/server/services/invoices.service.ts:95).

## Before/after response and logging behavior

| Situation | Before | After — fixed in source |
| --- | --- | --- |
| Expected local form validation | Approved schema/field messages | Preserved; `QUICK_INVOICE_VALIDATION`; no database call or ordinary failure log. |
| Typed access denial/unavailable record | Exception message returned and full exception logged | Fixed unavailable message/code and generated reference; no forbidden/not-found resource distinction. Existing role/tenant denial remains. |
| Genuine uniqueness conflict | Driver error could reach response/console | Generic `QUICK_INVOICE_CONFLICT`; no SQL, constraint, field target, ID or submitted value. A plain object merely claiming `code=P2002` is not trusted as a Prisma error. |
| Unexpected database/provider/transaction failure | Arbitrary message/stack/metadata could be exposed | `QUICK_INVOICE_FAILED`, generic response and minimal safe JSON log; failed creation remains success=false. |
| Audit failure after insertion within transaction | Caught raw exception | Actual invoice insertion rolls back; failure remains false and private. |
| Cache refresh failure after committed creation | Misleading creation failure, encouraging retry | `QUICK_INVOICE_REFRESH_FAILED`; truthful “invoice was created, refresh” response with reference. No second insertion; committed creation is not relabeled unsuccessful. |
| Successful quick invoice | “Draft created” while service defaulted SENT | Explicit persisted DRAFT and accurate draft message. Defensive fallback is “Invoice created” if a future service returns another status; never claims email sent. |
| Framework redirect/not-found | Could be swallowed by generic action catch | Rethrown before error mapping/logging using installed Next control-flow API; no custom serialization. |

The opaque server-generated UUID correlates the public error with one safe log event. It contains no workspace/user/record/token information and cannot retrieve protected logs or grant access. No DB error code/target/message is exposed as the public code. See [logging contract](/home/rmuya/rhoda-work/coreops_dashboard/docs/privacy-safe-logging.md).

## Targeted comparable-path assessment

Search covered server actions/route handlers, direct `error.message` responses, whole-error console calls, error stringification and potentially sensitive debug output.

| Path / pattern inspected | Classification / actual risk | Action |
| --- | --- | --- |
| Quick invoice arbitrary Error + whole exception console | Confirmed high-priority disclosure **path**; actual exposed contents depend on the exception. No live incident reproduced. | Fixed as above and tested with synthetic sensitive markers. |
| `src/server/commercial/action-result.ts` | Returns typed CommercialError/AccessError messages; current throwing sites use app-authored literals. Generic unknown errors/Zod/Prisma handling exists. Not the same arbitrary Error path. | Reviewed, unchanged. Type-based trust is not proof a future caller cannot misuse the class; future dynamic/provider-wrapped messages need separate review. |
| `src/features/workspaces/actions/create-workspace.ts` | Fixed WorkspaceAddressUnavailable message/controlled validation, generic unexpected response and literal-only console output. | Reviewed, unchanged. |
| `src/server/commercial/marketing.ts` | Logs only a closed allowlist of Prisma availability codes; other errors rethrow to framework. | Reviewed, unchanged. No claim that all framework-level unhandled logging is sanitized. |
| Export/recovery/lifecycle/notification handlers | Generic responses/sanitized failure codes; export internal message comparison is against a closed code list, not returned raw arbitrary text. | Existing protections preserved; regression suites run. |
| Paystack webhook signature-message comparison | Compares an internal constant to choose HTTP status; does not echo the message/body. Other failures have empty/generic responses. | Reviewed, unchanged. |
| CLI/test diagnostics and automatic framework/hosting logs | Isolated fixture tools differ from ordinary production endpoints. Hosting may attach URL/request/error data outside application code. | No general CLI/application refactor; no guarantee about every logging path, provider or instrumentation. Requires scoped follow-up/operational verification. |

No additional comparable confirmed high-priority explicit raw-exception web response was identified in this targeted search. This is not a full security penetration test or a claim of universal log sanitization.

## URL/token assessment and narrow protections

| Flow | Credential or identifier / existing defenses | P-C1 mitigation and remaining boundary |
| --- | --- | --- |
| `/invitations/[token]` | Live high-entropy seven-day invitation token; hash stored. Verified invited email, current identity, workspace/commercial/capacity checks, status/expiry/replay rules remain. Token alone is not unrestricted membership access. | Response no-referrer/no-store. Does not erase the incoming URL from history/hosting logs, change token/continuation URLs, or prove auth pages/third-party instrumentation redact them. Automatic invitation email remains absent. |
| Client search query | Search text may contain personal information; it is not an access credential. Tenant authorization still gates records. | No query/routing redesign. Browser history, same-origin referrers, server access logs and telemetry capture remain review items. |
| Paystack return/callback | Linkable transaction reference and provider authorization URL; reference alone cannot verify payment or activate subscription. Merchant/mode/amount/currency checks, signed webhook verification and manual activation remain. | Return response no-referrer/no-store; request URLs/host logs/history still need redaction/retention review. No callback or signature redesign. |
| Export download | Opaque export ID in URL; actual short-lived single-use token is in same-origin POST body, hash-only persistence, live MFA/identity/role/grant/lifecycle checks and fenced leases. | Existing N-X protections retained. POST bodies, request headers and download data must remain excluded from external debugging/log drains. No export token is moved into a URL/email. |

New headers reduce outgoing referrer/cache exposure; they do not redact URL access logs or revoke/cancel already released information. They are deliberately not broad CSP/origin/cookie/authentication changes. Search privacy, authentication continuation URLs, deploy/CDN overrides and actual HTTPS browser behavior remain separate review items. The [official Next headers contract](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers) was checked against installed Next 16.2.4; native loopback bundle behavior is tested below.

## Logging and local evidence custody

The emitted line is exactly the approved event/code/reference object serialized to JSON. No message/stack/cause/Prisma metadata/body/URL/customer field is logged. Expected validation is not logged. Logging sink failure has no raw fallback; it cannot convert a failed creation into success. Transactional business audit remains unchanged.

New `/tmp/workflowconnect-pc1-*` evidence is created under `umask 077`; observed logs have mode **0600**. Previously sampled `/tmp/workflowconnect-nx-final-tests.log` and `/tmp/workflowconnect-nd-tests.log` remain **0664**, and the sampled lifecycle dump remains **0600**. Only metadata was inspected; no customer log or backup contents were read. Older evidence was not bulk re-permissioned, moved or deleted. Effective access also depends on directory/ACL/container/host controls.

The [minimum logging standard](/home/rmuya/rhoda-work/coreops_dashboard/docs/privacy-safe-logging.md) defines restricted debugging, no ordinary raw-error fallback, purpose-limited access/retention, protected evidence and provider-boundary checks. Actual Vercel serialization, automatic logs, IAM/read/export access, drains, regions, retention and backup/deletion behavior are **Requires External Confirmation**. No cloud logging control or retention period is invented or declared verified.

## Verification and limits

All database writes used existing fixtures in named isolated migrated databases. No migration or schema change was needed. Clerk/Next request boundaries, cache failure and injected exceptions are test substitutions; PostgreSQL constraints/commit/rollback and persisted invoice status/amount are real.

| Check | Actual result / boundary |
| --- | --- |
| Synthetic safe boundary tests | **8 passed**, zero failures. No DB/provider calls. Covers sensitive Prisma/provider messages/metadata, unknown thrown objects, approved validation, conflicts, status wording, refresh failure, Next redirects/not-found, header scope and logging-sink failure. |
| P-C1 PostgreSQL invoice suite | **9 passing Node tests including container**, zero failures. Includes real duplicate invoice **primary ID** and FK violations, actual malformed-date Prisma validation, rollback, roles/tenant denial and exact DRAFT amount/status. |
| Authorization/commercial/identity/payment/lifecycle/Proxy | **88 passed including containers**, zero failures, isolated regression DB. |
| C/N-X export/recovery | **29 passed including container**, zero failures on isolated export DB; all release/authority/TTL safeguards retained. |
| N-B/N-C/N-D notification regressions | **26 / 24 / 11 passed including containers**, zero failures; sequential isolated local mocks only. No real email. |
| Navigation / host / lifecycle-policy / auth configuration / export format | **4 / 9 / 3 / 3 / 1 passed**, zero failures. |
| Typecheck / lint / production build / actual built HTTP | Typecheck and local production build passed. Focused lint passed; full lint has zero errors and 12 existing business-page warnings. **3 built GET/HEAD header checks passed**; selected invoice/user/legal/lifecycle/notification counts unchanged and temporary server stopped. No deployment. |
| Deployed verification / actual signed-in browser | **Not performed**. No real Clerk, cloud logs/IAM, HTTPS referrer capture or customer incident acceptance is inferred. |

**Financial scope limitation:** invoice numbers still have no workspace uniqueness constraint or durable request idempotency. The real fixture test explicitly observes that a repeated invoice number remains possible, including the shared service's unchanged SENT default and the new quick DRAFT status. P-C1 sanitizes actual constraint failures; it does **not** claim to solve duplicate invoice numbers, exact-decimal input validation, date validation UX or financial-metric definitions. These remain separate launch findings; no schema/financial architecture refactor was added. Existing authorization, same-tenant links, transactional audit and exact Decimal persistence were not weakened.

An initial combined file-creation/test command timed out in automatic permission review before starting. Workspace file creation and the single guarded isolated test command were separated; the permitted retry completed. No safety assertion or permission boundary was removed to obtain passing results.

Reproduction:

```bash
npm run test:privacy-errors
COREOPS_COMMERCIAL_REHEARSAL_DB=coreops_auth_rehearsal_exports_nx_chain_261110 \
  npm run test:privacy-invoices
npm run typecheck
npm run lint
npm run build
COREOPS_COMMERCIAL_REHEARSAL_DB=coreops_auth_rehearsal_exports_nx_chain_261110 \
  node --env-file=.env scripts/with-commercial-rehearsal.cjs node tests/privacy-http-smoke.cjs
```

For other regressions, use the existing guarded runner and `coreops_auth_rehearsal_notifications_nd_reg_261110`; C/N-X uses its dedicated isolated export DB. Do not run suites concurrently against shared notification GLOBAL controls. Logs: `/tmp/workflowconnect-pc1-{unit,invoice,regressions,exports,nb,nc,nd,units,auth-config,format,types,focused-lint,lint,build,http}.log`. Temporary local evidence is not durable release custody.

## Fixed in source versus outstanding acceptance

- **Fixed in source / verified isolated:** quick-invoice raw exception response and ordinary log disclosure; truthful quick DRAFT creation; post-commit refresh classification; minimal correlation contract; narrow invitation/payment-return response headers.
- **Requires deployed verification:** matching build, actual header behavior across app/auth/subdomain redirects, real Clerk control-flow/reverification, ordinary/framework/provider logs and body capture, log IAM/drains/retention, browser history/referrers, operational support/correlation custody.
- **Still outside P-C1:** global rights/deletion/holds, exact legal-document reconstruction/P-C2, production lifecycle rollout, provider sending/configuration, invoice-number/idempotency/validation/metric work and broad application logging refactors.

**Stop for P-C1 review. No production/preview database, deployment, provider configuration, legal document or live customer data was changed; no deployed lifecycle enforcement, real email or customer-data deletion was enabled. Isolated regression fixtures exercise their existing test-only release gates in child processes.**
