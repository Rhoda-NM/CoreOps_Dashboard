# Phase 4 navigation and Phase 5 acceptance preparation

7 November 2026. **Phase 4 implemented locally. Phase 5 remote setup and signed-in HTTPS acceptance remain pending.** No production deployment, DNS or Clerk Dashboard change, administrator bootstrap, migration, payment collection or normal local database mutation was performed. `.env` was not edited.

The operator identified `workflowconnect.io` and will connect the project to Vercel when ready for preview. See the [staging acceptance procedure](phase5-staging-acceptance.md) and [nonsecret environment template](phase5-staging.env.example). Neither file configures a remote environment.

## Navigation and workspace selection

`src/lib/routing/navigation.ts` centralizes bounded, relative continuation intent and configured central/marketing links. The existing host policy remains authoritative. `NavigationProvider`, `SiteLink` and `WorkspaceLink` separate account/public links from same-workspace links; filters, clickable rows, back-button fallbacks and Quick Add use the same visible workspace path builder.

In subdomain mode, tenant links and mutation redirects use clean paths such as `/projects` and `/clients/<id>`. Path mode retains `/w/<slug>/…`. Internal `workspacePath` and cache invalidation still use `/w/<slug>/…`; changing a visible URL does not change the cache identity. Account/help/legal links and Clerk profile/sign-out destinations use configured central/marketing authorities. Pricing CTAs also use the central authority.

The multi-workspace switcher performs full browser GET navigation to the central `/dashboard/continue` page. That page validates slug/path, reads fresh ACTIVE memberships and only then generates the canonical workspace URL. The destination layout independently rechecks membership and commercial restrictions. Foreign, suspended and malformed targets are denied. Nothing is written by the continuation page or its prefetch.

Central workspace-selection and invitation-acceptance Server Actions redirect first to this same-origin GET page. Cross-host navigation follows from the page, rather than redirecting a tenant mutation across authorities. The existing central-only selection action still writes the advisory host-only recent-selection cookie. Direct switcher GETs do not write that cookie; legacy bookmarks use the most recent explicit picker selection, while every open tenant tab uses its own URL. One active membership enters automatically; multiple memberships show the picker. Pending/suspended tenants retain the subscription gate and loop protection.

## Authentication, invitations and account flows

Proxy strips and recomputes `x-coreops-return-to` alongside the existing request-context headers. Anonymous protected GETs go to the configured central sign-in page with bounded intent. Anonymous protected mutations return 401; they do not become cross-host GETs. Resource-level live identity, role, assignment and subscription checks remain in place.

Sign-in and sign-up use supported Clerk components with explicit, validated central completion destinations. Accepted intent is limited to workspace continuation, a structurally valid invitation token, selected central account/onboarding entry points and a bounded opaque payment reference. External URLs, reserved/invalid workspace labels, traversal, duplicate continuation fields and non-workspace resource paths are rejected. Intent is not membership: the authenticated destination checks it again. Client redirect origins are restricted to the configured central origin; no wildcard redirect/origin exception, satellite configuration or custom session mechanism was added.

Invitation links now come from the configured central origin on the server. The browser does not append the current tenant origin. Sign-in/sign-up and explicit legal acceptance retain invitation/workspace intent. Acceptance still requires verified email ownership and the existing transactional status, role and capacity checks. No email delivery was added. Account pages and private platform sign-in have independent central-host guards. Draft legal documents remain unapproved and cannot become mandatory consent through this change.

The local browser pass found that the registration-unavailable fallback dropped invitation intent when returning to sign-in. That fallback was corrected and the blocked-registration branch is covered by the navigation test. It also showed Clerk's own heading is still **“My Application”**: application/Google branding remains a real configuration blocker, not a completed code verification.

## Payment return handling

Initialization uses the configured central app origin and includes the prepared opaque transaction reference as an `attempt` hint in its callback. Paystack can append its own `reference`/`trxref` without creating a duplicate query field. Present hints must agree; arrays, duplicate fields and conflicting references are rejected. Authentication continuation retains only the normalized reference. A retained `COREOPS_PUBLIC_URL` must agree with that central origin or initialization fails closed. No merchant/channel/payment enablement changed.

The return page is read-only. It resolves the reference only for the original payment submitter who remains an ACTIVE owner of the payment's workspace. A verified match links through central continuation to that workspace's subscription; unknown, foreign or invalid references show the same generic workspace fallback. A query parameter cannot select another tenant, create a receipt, verify a payment, activate a subscription or bypass manual SUPER_ADMIN approval. Actual provider/browser callbacks remain unverified.

## Metadata

Root metadata, robots, sitemap and manifest now evaluate the validated request host. Only the configured public marketing origin can advertise indexing, with the explicit indexing flag and matching canonical origin. App, tenant and preview hosts deny indexing and return no sitemap entries. Existing private route metadata remains noindex.

Manifest scope and installation ID remain same-origin, with central/tenant start at `/dashboard` and marketing start at `/`; no user IDs or last-selected workspace cookies appear. Metadata routes use request-bound headers rather than a cross-host static result. This makes the brochure request-rendered; production caching/latency should be measured before any future cache optimization.

## Automated verification

| Check | Result and boundary |
| --- | --- |
| Combined authorization/commercial/identity/Paystack-VAT/Proxy tests | **75 passed**, including Node containers; zero failures. Real isolated PostgreSQL; Clerk/session/provider and Next request boundaries substituted. |
| Navigation program | **4 passed**: malicious return intent, central/marketing link authorities, path/subdomain workspace links, Clerk completion props and blocked-registration fallback, host-aware metadata and preview isolation. Component props/SSR are not real OAuth. |
| Host/slug policy program | **9 passed**; previous routing/slug guarantees retained. |
| Brand program | **6 passed**; approved price display and unchanged commercial truthfulness retained. |
| Authentication configuration program | Passed; configuration/disclosure assertions, not Clerk Dashboard acceptance. |
| TypeScript | Passed with generated Next route types. |
| Production build | Passed locally; no deployment. |
| Full ESLint | Zero errors; 12 pre-existing unused-import warnings in business pages. |
| Local HTTP smoke | 12 subdomain Host-header checks passed for robots/sitemaps/manifests, denied routes and central auth navigation; 3 path-mode brochure/metadata checks passed. Temporary local HTTP only, not DNS/TLS or signed-in acceptance. |
| Whitespace | `git diff --check` passed. |

Integration additions verify fresh membership checks on central continuation, invalid/foreign/suspended selection rejection, tenant-host denial of central continuation, concurrent tab contexts, clean visible redirects with unchanged internal cache paths, exact central payment callbacks, and neutral foreign/unknown payment return behavior without credit or activation. Earlier identity collision, owner protection, role visibility, tenant FK, concurrent request/payment, entitlement and audit regressions remain in the suite.

Initial regressions exposed old assertions expecting direct `/w/` redirects and a missing headers mock at the legal-receipt boundary. One failed fixture assertion left a test member suspended and caused a later dependent test to fail; after updating assertions/request mocks, the full suite passed. No authorization check was weakened to accommodate those tests.

Reproduction:

```bash
npm run test:navigation
npm run test:host-policy
npm run test:brand
npm run test:auth-configuration
COREOPS_COMMERCIAL_REHEARSAL_DB=coreops_auth_rehearsal_release_20261107 \
  node --env-file=.env scripts/with-commercial-rehearsal.cjs \
  node --test --test-concurrency=1 tests/authorization.integration.cjs \
  tests/commercial.integration.cjs tests/identity.integration.cjs \
  tests/paystack-vat.integration.cjs tests/proxy.test.cjs
npm run typecheck
npm run lint
npm run build
```

Tests used `coreops_auth_rehearsal_release_20261107`, never the normal application database. Fixture cleanup is restricted to test-created records. A final READ ONLY check confirmed zero users, workspaces and platform administrators remain in the rehearsal database. No schema or migrations changed.

## Manual browser validation

A fresh in-app browser with no pre-existing authenticated session used the temporary production bundle at `http://localhost:3100`, with the isolated rehearsal database and process-only local origin overrides:

- Landing page rendered and **Get access** navigated to `/sign-in`.
- Clerk's actual Google/email sign-in form loaded, alongside the data-sharing disclosure and central legal/help links. No credentials were entered.
- An unauthenticated synthetic invitation URL redirected to sign-in with its token retained; Clerk's sign-up link retained it through navigation to the registration page. No real invitation was accepted.
- The production-mode registration readiness gate displayed “Registration is temporarily unavailable” because its existing configuration requirements are unresolved. This is a gate verification, not successful registration or legal acceptance.

No OWNER, MANAGER, STAFF or platform-admin session was authenticated. Google consent/sign-in completion, MFA, recovery, shared cookies, sign-out propagation, real Server Actions after HTTPS rewrites and authenticated sensitive-response inspection remain unverified. The local HTTP browser is not production-style HTTPS staging acceptance.

## Phase 5 and remaining gates

The available Vercel team listing did not expose a WorkflowConnect/CoreOps project, and the operator explicitly plans to connect it later. No actual preview URL, isolated cloud database mapping, staging DNS/TLS or dedicated Clerk configuration is available to validate. The in-app browser has no signed-in test identity. Phase 5 is therefore **prepared, not completed**. Its full evidence matrix is in [the staging procedure](phase5-staging-acceptance.md).

A Vercel preview remains exact-host path mode. A separate, isolated custom-domain setup is necessary for shared-subdomain acceptance; `staging.workflowconnect.io` is only a proposed namespace pending operator configuration/review. Do not point preview at the future production database or assume the existing development Clerk instance proves cross-subdomain behavior. Production legal approval, Google scope/branding, real MFA/bootstrap review, shared rate limiting, DNS/TLS, real payment capabilities and the wider [launch checklist](launch-readiness.md) remain applicable.

Both temporary port-3100 servers were stopped; localhost:3000 was not replaced. The first path-mode HTTP client used the wrong loopback Host and correctly received 404; the corrected client used the explicitly configured localhost Host.

Payment callback parameter handling follows [Paystack’s documented appended reference](https://paystack.com/docs/payments/accept-payments/); actual provider delivery remains unverified.

Evidence is temporary local `/tmp/workflowconnect-phase4-{integration,navigation,host,proxy,brand,auth,types,lint,build}.log` and `/tmp/workflowconnect-phase4-{path-http,subdomain-http-results}.json`. Preserve required records durably before rollout. No production launch readiness is claimed.
