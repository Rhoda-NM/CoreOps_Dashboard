# WorkflowConnect — Selected Slugs and Phase 3 Host Routing Implementation Report


7 November Phase 4 follow-up: [navigation, account/invitation/payment continuation and metadata results](phase4-navigation-and-phase5-acceptance.md). Phase 5 HTTPS/Clerk staging acceptance is prepared and remains pending the operator’s Vercel connection; prior phase evidence below is historical.

7 November 2026. **Development implementation verified; no deployment or live configuration changes. Phase 4 is not started.**

## 1. Implementation summary

New owners can choose an immutable workspace slug during onboarding. The business name generates a readable suggestion, the form displays the proposed address, and an explicit authenticated availability check returns only a generic availability result. Final uniqueness remains enforced by the existing database index inside transactional onboarding.

Proxy now integrates the existing environment/host policy. Explicit subdomain mode maps clean tenant URLs to the existing `/w/[slug]` route tree, with fresh canonical request context. Marketing, central-app and tenant routes have distinct boundaries. Unknown tenant pages receive a neutral 404 before Clerk can initiate a handshake. Administrative and central onboarding/invitation/selection/legal actions have independent server-side host restrictions.

Path mode remains the default. Existing localhost development uses it; no `.env` was edited. No existing workspace slug, schema, migration, role matrix, commercial policy, tax configuration, payment configuration or infrastructure setting was changed. Tests wrote only disposable records in the guarded rehearsal database and cleaned up their own fixtures. The normal local database was queried only by the existing read-only slug audit.

## 2. Changed files

| File | Reason |
| --- | --- |
| `src/lib/routing/workspace-slug.ts` | Shared selected-slug validation and readable suggestions; add login/security/auth-route reservations |
| `src/lib/routing/request-plan.ts` | Pure host-to-route decisions, route/method restrictions and canonical internal paths |
| `src/server/routing/config.ts` | Runtime policy adapter and loopback-only compatibility for local production-bundle smoke runs |
| `src/server/routing/request-context.ts` | Independently validate host/context at server boundaries; central-only guard; visible subscription destination |
| `src/server/routing/tenant-existence.ts` | ID-only, uncached existence check for tenant routing |
| `src/server/routing/slug-check-limit.ts` | Bounded per-account/per-process availability quota |
| `src/proxy.ts` | Validate before Clerk, resolve routing existence, replace forged context, perform native rewrites and safe GET navigation |
| `src/server/services/workspace-onboarding.service.ts` | Selected-slug uniqueness conflict path without silent substitution; preserve automatic fallback and atomic onboarding |
| `src/server/services/workspace-availability.service.ts` | Authenticated, syntax-first, advisory availability lookup |
| `src/features/workspaces/actions/check-workspace-slug.ts` | Availability Server Action |
| `src/features/workspaces/actions/create-workspace.ts` | Require canonical selected input and central host; return useful conflict errors |
| `src/features/workspaces/components/WorkSpaceOnboardingForm.tsx` | Editable suggestion, live address preview, validation, availability button and retained controlled input |
| `src/app/(onboarding)/onboarding/page.tsx` | Central-host protection and configured address-preview domain |
| `src/server/auth/get-current-workspace.ts` | Verified routing context and neutral unknown-tenant handling before identity resolution |
| `src/app/w/[workspaceSlug]/layout.tsx` | Compare canonical internal routes; redirect pending/suspended tenants to visible `/subscription`; central links in the restricted shell |
| `src/server/commercial/platform-auth.ts` | Require central host independently of Proxy, before existing role/MFA checks |
| `src/features/workspaces/actions/select-workspace.ts` | Central-only workspace-selection mutation |
| `src/server/services/memberships.service.ts` | Central-only invitation acceptance; creation/seat checks unchanged |
| `src/app/account/legal/actions.ts` | Central-only legal acceptance action |
| `tests/host-policy.test.cjs` | Selected-slug/suggestion cases while preserving legacy-label tests |
| `tests/proxy.test.cjs` | Real NextResponse rewrite/redirect assertions with substituted Clerk and existence boundaries |
| `tests/authorization.integration.cjs` | Real PostgreSQL selected claims, rollback, availability, host-context/role and subscription-layout scenarios |
| `tests/commercial.integration.cjs` | Independent administrator host restriction, preserving role/MFA failures |
| `tests/paystack-vat.integration.cjs` | Explicit trusted request headers in the existing test boundary |
| `docs/workspace-subdomain-phase-1-2.md`, `docs/subscription-acceptance.md` | Link this follow-up; retain historical evidence |
| `docs/selected-slugs-phase-3-routing.md` | This implementation and acceptance report |

## 3. Slug policy and onboarding

**Owner-selected addresses:** 3–63 lowercase ASCII letters, numbers and hyphens. No leading/trailing hyphen, whitespace, dots/nested labels, underscore, URL syntax, uppercase or unsupported `xn--` identifier. Noncanonical owner input is rejected, not silently normalized.

**Suggestions:** normalize the business name, omit random suffixes, truncate within DNS limits, and use `workspace` for non-ASCII-only/too-short bases. Reserved names get a readable `-workspace` suggestion. Examples: `Stravect Systems` → `stravect-systems`; `Savannah Space` → `savannah-space`. Editing the slug marks it manually chosen, so later name changes do not overwrite it. The owner can explicitly restore the suggestion. Business names remain independently validated at 2–120 characters.

The shared reserved-name list covers infrastructure/authentication/environment labels including app, www, api, admin, platform, auth, accounts, clerk, mail, support, status, login, security, billing, payments, webhooks, static, assets, staging, preview and dev. The business display name itself is not reserved. Existing valid short labels continue to resolve; the new minimum applies only to newly selected addresses.

The form explains immutability and accepted characters, associates validation/help with the input, uses status/alert feedback, and retains controlled name/slug values after errors. The address preview uses the configured tenant root when provided; local path-mode UI previews the intended `workflowconnect.io` address without configuring DNS or making it an authorization source.

**Availability:** explicit button, no per-keystroke polling. The server validates syntax before querying, requires the central host and verified current identity for valid lookups, selects only workspace ID through the slug unique predicate, and returns status/message only. It never returns business name, owner, membership, activation or subscription state. Results do not reserve an address.

The limiter permits 10 valid checks per account per minute **per server process**, survives development HMR and caps its map at 10,000 entries, failing closed when full. It is not distributed; a shared limiter or appropriately scoped platform rate control remains a deployment requirement before claiming a global quota across replicas.

**Final allocation:** owner-selected collisions return an address-unavailable error. They do not receive a random replacement. The existing automatic allocator remains available to internal callers and retries slug-only unique violations, with full transaction rollback between attempts. Unrelated database failures are rethrown by the service. User-row locking, ACTIVE-membership rechecking, pending Workspace/Subscription, first OWNER and audit commit remain atomic. Repeated requests cannot create a second tenant. Rename services still change only the display name.

No migration was necessary: the existing nullable slug field and unique index support the change. Canonical-format/nullability database constraints and legacy repair are not introduced. Audit each target environment before rollout. The local read-only audit checked two existing workspaces with zero problems; neither slug was changed.

## 4. Routing architecture

Host classification is performed before Clerk middleware can return an authentication handshake. Malformed/ambiguous hosts, conflicting forwarded-host values, reserved tenant labels, nested labels, suffix lookalikes and unapproved preview hosts fail closed. Production subdomain mode requires the explicit HTTPS apex/app/root contract from Phase 1. Invalid configuration returns a generic no-store 503.

`Host` is required; a missing host is never replaced with a client workspace header. `X-Forwarded-Host`, when present, must normalize to the same authority. Internal context is freshly replaced in Proxy. Resource guards independently classify the actual host; they do not trust `x-coreops-host-kind` or a posted routing-mode marker as authority.

| Host/path | Behavior in explicit subdomain mode |
| --- | --- |
| Apex public pages | Serve product/features/pricing/demo/legal/help GET/HEAD pages |
| Apex sign-in/up GET | Safe redirect to the configured central app, keeping existing public access buttons usable |
| Apex private operations or mutation POST | Neutral 404 |
| App sign-in/up, onboarding, picker, account, invitations, platform, payment return/webhook | Keep central route; existing identity/role/MFA/signature checks still apply |
| App `/` GET | Redirect to central `/dashboard` |
| App `/w/[slug]/…` GET | Check existence and navigate to the configured canonical tenant URL |
| App `/w/[slug]/…` POST | Deny; no cross-host mutation redirect |
| Tenant business page | Native rewrite to its matching internal `/w/[slug]/…` route |
| Tenant `/` GET | Rewrite to its internal dashboard |
| Tenant `/w/[same-slug]/…` GET | Same-host canonical navigation to the clean path |
| Tenant same-slug legacy POST | Internal rewrite without a cross-host redirect |
| Tenant mismatched `/w/[other-slug]/…` | Deny before lookup/business access |
| Tenant platform | Deny GET and POST |
| Tenant account/onboarding/invitation/auth paths | GET navigation to central app; POST denied |
| Tenant webhook/API path | Deny; payment webhooks remain central |
| Unknown tenant page | Neutral no-store 404 before Clerk; no workspace created |
| Explicit preview | Path mode, exact deployment-host allowlist; production tenant hosts rejected |
| Assets/framework/metadata | Explicit GET/HEAD exceptions, no tenant rewrite; asset-looking POST actions denied |

The reserved `/__clerk` namespace is passed to Clerk/framework handling without a tenant rewrite. No FAPI proxy or new Clerk endpoint was enabled. The implemented API allowlist in subdomain mode is the existing test/live Paystack webhook. The source placeholders under `src/api` remain non-routes.

Non-marketing subdomain responses carry noindex/nofollow. Comprehensive host-aware metadata/robots/manifest and canonical navigation remain Phase 4 work.

**Existence lookup decision:** installed Clerk 7.5.18 may return its handshake before invoking the middleware callback. Deferring all existence checks to a page would therefore fail to guarantee a neutral unknown-host 404. For valid tenant page/canonical-legacy requests only, Proxy performs one ID-only lookup against the unique slug predicate before Clerk. Path mode and asset requests do not perform it. The resource resolver also rechecks existence before identity; this intentionally favors defense and freshness over cross-request caching. Neither lookup evaluates commercial/account status. Database unavailability returns a generic 503 rather than granting access.

A 25-query read-only Prisma sample on the isolated local database measured 146.72 ms for initial connection/first lookup, warm median 0.73 ms and warm p95 1.85 ms. This is a small local sample against an empty fixture-cleaned table, not production latency or load evidence. Regional connection pooling, unknown-host traffic controls and staging load measurement remain required.

## 5. Security review

- Hostname identifies a request target, not a membership. `getCurrentWorkspaceMembership` still verifies the Clerk-linked user and ACTIVE membership for the selected workspace. Role, resource-assignment and commercial checks remain authoritative.
- A known host cannot override another tenant through `/w/` or forged context headers, including a user who belongs to both workspaces.
- The matcher now includes all paths so compiled action POSTs cannot bypass routing by using asset-looking URLs. Proxy blocks inappropriate host/method combinations; services enforce their own boundaries.
- Platform entry/operations require the central app host in subdomain mode in addition to active database-backed PlatformAdmin role, actual MFA factor evidence, strict reverification, transactional role rechecks and existing audits.
- Onboarding, availability, workspace selection, invitation acceptance and legal-acceptance actions require central-host context. This also protects direct invocation through compiled action IDs on a tenant business URL.
- Redirect hosts come from configured URL builders, not arbitrary incoming authorities. Cross-host canonical navigation is GET/HEAD only. POSTs do not become GETs through cross-host redirects.
- Clerk middleware remains; no custom authentication, session cookies, satellites, wildcard trusted origins or `serverActions.allowedOrigins` exceptions were added. Deprecated createRouteMatcher was replaced by the explicit native routing plan; path-mode auth.protect and existing resource authorization remain.
- Tenant resource checks perform authentication after existence resolution. This permits neutral unknown-tenant 404s without moving role or entitlement authorization into Proxy. Real Clerk session behavior is not established by substituted tests.

## 6. Subscription compatibility

The canonical internal path header remains `/w/[slug]/subscription` even when the browser requests clean `/subscription`. The layout compares internal identities, then uses the visible destination helper for a pending/suspended redirect. Consequently `/projects` redirects to `/subscription`, while `/subscription` renders instead of redirecting to itself. Path mode retains `/w/[slug]/subscription`.

The restricted shell's Workspaces and Account links use the configured central app in subdomain mode; these were the minimal navigation adjustments needed to prevent those links from re-entering the same restricted tenant dashboard. Other navigation has not been comprehensively changed.

Active, grace, expired read-only, suspended and closed rules remain in the existing commercial access functions. No unpaid workspace is activated and no trial is granted. Existing payment/renewal/entitlement regressions remain in the combined suite.

## 7. Automated verification

| Verification | Result and boundary |
| --- | --- |
| Host/URL/slug unit program | **9 passed**; shared validation, readable suggestions, selected length/reservations and legacy-label compatibility |
| Combined authorization/commercial/identity/payment/Proxy suite | **74 passed**, including Node test containers; zero failures |
| Proxy portion | 9 tests with real NextRequest/NextResponse; Clerk and tenant-existence boundaries substituted |
| PostgreSQL tests | Real constraints, concurrent selected claims, automatic collision retry, repeat onboarding, FK rollback, availability quota, role-specific host context, unknown tenant 404, pending/suspended layout and central-admin restriction |
| Existing commercial/security regressions | Cross-tenant denial, OWNER/MANAGER/STAFF visibility, assignments, suspension, last owner, seats, expiry/renewal, identity collisions, MFA and payment activation boundaries retained |
| Brand regression program | **6 passed**; pricing/tax/commercial presentation unchanged |
| TypeScript | Passed |
| Production build | Passed; no deployment |
| Full ESLint | Zero errors; 12 pre-existing unused-import warnings in business pages |
| Whitespace | `git diff --check` passed |
| Local read-only slug audit | 2 workspaces, zero problems |
| Actual local HTTP smoke | **10 passed** against temporary production-bundle server on port 3100 with isolated rehearsal URL and test-only process environment |

HTTP smoke covered unknown/reserved/lookalike/mismatched hosts, tenant platform denial, central-only POST denial, tenant webhook denial, apex-to-app sign-in navigation, asset GET and asset POST denial. The first HTTP client did not preserve the supplied Host override; curl and Node's explicit `http.request` verified the corrected checks. Final results are in the JSON evidence below.

The temporary server used `.test` Host headers over local HTTP, without DNS or certificates. It was stopped afterward; localhost:3000 was not replaced. The cleaned rehearsal database had zero workspaces after the suite. No real payment was submitted or verified and no real administrator was bootstrapped.

Reproduction:

```bash
npm run test:host-policy
COREOPS_COMMERCIAL_REHEARSAL_DB=coreops_auth_rehearsal_release_20261107 \
  node --env-file=.env scripts/with-commercial-rehearsal.cjs \
  node --test --test-concurrency=1 \
  tests/authorization.integration.cjs tests/commercial.integration.cjs \
  tests/identity.integration.cjs tests/paystack-vat.integration.cjs tests/proxy.test.cjs
npm run test:brand
npm run audit:workspace-hostnames
npm run typecheck
npm run lint
npm run build
```

Temporary evidence: `/tmp/workflowconnect-phase3-{host-tests,proxy-tests,integration,brand-tests,types,lint-all,build}.log`, `/tmp/workflowconnect-phase3-http-results.json`, `/tmp/workflowconnect-phase3-http-server.log`. Store required evidence durably before rollout.

Official documentation reviewed: [Next.js Proxy/native rewrites](https://nextjs.org/docs/app/api-reference/file-conventions/proxy), [Server Action origins](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions), [Clerk middleware/resource protection](https://clerk.com/docs/reference/nextjs/clerk-middleware). Latest docs were checked against the installed SDK behavior; tests do not substitute for deployed acceptance.

## 8. Unverified scenarios

**No real signed-in browser/subdomain acceptance was completed in this phase.** In particular:

- Editing the onboarding form and checking/submitting availability through an actual verified Clerk browser session.
- Shared sessions/cookies, allowed subdomains, authorized parties, Google signup/sign-in and redirect continuation across hosts.
- Real MFA enrollment, strict reverification, recovery, sign-out propagation and session revocation across domains.
- Real TLS, wildcard DNS, Vercel project association and deployed forwarded-header behavior.
- Actual browser RSC/prefetch and Server Actions after HTTPS hostname rewrites, including framework CSRF behavior. Unit tests preserve synthetic Flight/action headers and check routing decisions; they do not prove the full framework/browser exchange.
- Real payment callbacks, merchant verification, live webhook delivery or activation.

## 9. Remaining Phase 4 work

- Canonical central/tenant navigation throughout the application and post-login return intent.
- Workspace switcher and recent-selection flows: selection mutations are now central-only in subdomain mode, so the tenant switcher must navigate through the central picker in Phase 4. It must not be advertised as complete yet.
- Remaining `/w/` links and mutation redirect destinations; same-host legacy compatibility exists, but some transitions need an extra GET redirect and real RSC testing.
- Canonical invitation URLs currently use the browser origin; tenant invitation GET links can redirect centrally, but URL generation and signup continuation should become centralized.
- Payment-return destination selection: the existing `/dashboard` fallback needs verified workspace-specific return handling.
- Host-aware marketing/account links, account-management URLs, metadata, robots and manifest behavior.
- Do not advance to these changes or enable real cross-subdomain authentication automatically.

## 10. Deployment prerequisites

Before any authorized remote deployment, supply explicit `COREOPS_APP_ORIGIN`, `COREOPS_MARKETING_ORIGIN`, routing mode and, for subdomain mode, tenant root. Outside non-Vercel loopback-only local testing, missing/invalid configuration fails closed. `COREOPS_ROUTING_MODE` defaults to `path`; domain ownership/wildcard traffic alone never activates rewrites.

Production-style subdomain testing requires HTTPS app/apex origins matching the configured root and a non-preview isolated environment. Existing preview mode intentionally remains path-based with exact `COREOPS_PREVIEW_HOSTS`; arbitrary vercel.app names are rejected. No preview was deployed.

Confirm Vercel ownership/project assignment, wildcard DNS/TLS, environment/database isolation and protection/webhook behavior separately. Configure and verify Clerk production domains, allowed subdomains, authorized parties, central auth URLs, OAuth callbacks, legal acceptance and MFA before rollout. No Dashboard changes or broad trusted-origin exceptions were made.

## 11. Risks and blockers

| Priority | Finding | Required next evidence |
| --- | --- | --- |
| P0 rollout gate | Real Clerk/cookie/origin/MFA and signed-in HTTPS action behavior unverified | Complete security acceptance before enabling a real public tenant environment; tested guards are not proof of production session isolation |
| P1 | Phase 4 navigation and central selection/signup/invitation/payment continuation incomplete | Review and implement separately, then browser-test multiple workspaces/tabs |
| P1 | Availability quota is process-local; unknown-host existence probes hit PostgreSQL | Shared/edge rate controls, regional pooling and realistic load tests before public multi-instance rollout |
| P1 | DNS/TLS/project assignment and remote environment settings unverified | Operator-approved setup and staging evidence |
| P1 | Backend slug remains nullable/case-sensitive with no DNS-format CHECK | Audit every target; separately review forward constraints if needed; no automatic legacy mutation |
| P2 | Automatic-suggestion alternatives are not offered after a selected conflict | Owner can edit and check another address; never silently substitute |

## 12. Final recommendation

The development implementation is ready for code review and the next explicitly approved staging/authentication preparation step. It is **not approved for production activation**. Keep path mode in current environments until Phase 4 navigation and real Clerk/HTTPS acceptance are complete. No deployment, migration, live configuration or automatic progression to Phase 4 has occurred.
