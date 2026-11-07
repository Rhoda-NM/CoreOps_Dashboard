# Phase 5 — Isolated HTTPS and Clerk acceptance

7 November 2026. **Prepared; remote setup and signed-in acceptance pending.** The operator identified `workflowconnect.io` and will connect the project to Vercel when ready for preview. This does not establish a preview URL, a dedicated staging namespace, database mapping, TLS, or an isolated Clerk instance. No remote configuration or deployment has been performed.

See [Phase 4 results](phase4-navigation-and-phase5-acceptance.md) and the [nonsecret configuration template](phase5-staging.env.example). The template is not an active `.env` file. Do not copy local data, fixture subscriptions, administrator grants or production secrets into preview.

## 1. Path-based Vercel preview

1. Link the repository to the operator's Vercel project; supply its project/team identifier and actual preview deployment URL for verification. Configure the exact deployment hostname as app/marketing origin and in `COREOPS_PREVIEW_HOSTS`. Keep `COREOPS_ROUTING_MODE=path`. Do not use the public apex as a preview origin.
2. Attach a clean, dedicated European preview database and separate credentials. Compare it with the production mapping using the existing read-only `check:environment-isolation` script; use the fresh-migration rehearsal procedure before applying the existing migration chain to preview. Production migrations remain outside this authorization. Confirm `btree_gist` availability and the schema/constraints using the prior migration runbook.
3. Supply the isolated Clerk application credentials through Preview secrets only. Verify sign-in/sign-up/account URLs against this preview deployment, Google callback configuration, MFA availability and recovery. Test keys and successful HTTP redirects alone do not establish shared subdomain sessions.
4. Keep indexing off, checkout off, offers unpublished unless separately approved in the actual catalog, VAT charging disabled, and account self-deletion disabled. Do not fabricate approved legal versions or enable mandatory acceptance of draft documents to get a test to pass.
5. Run path-mode acceptance with disposable identities and test-owned workspaces. Keep Preview deployment protection enabled; validate the supported protected-deployment access separately. Do not expose database or Clerk secrets in screenshots, logs or browser URLs.

## 2. Production-style HTTPS subdomain environment

A normal Vercel Preview environment deliberately rejects subdomain mode. Use a separate isolated Vercel project/environment for the custom-domain test, without changing the production project or attaching the production database. One possible namespace under the operator's domain is `staging.workflowconnect.io`, with `app.staging.workflowconnect.io` and `<workspace>.staging.workflowconnect.io`; this namespace is a proposal, not a DNS change or an asserted approval.

Confirm the exact staging namespace/project and isolated database/Clerk application before configuration. Provision and verify apex/app/wildcard DNS and valid browser-trusted TLS in that project. Verify actual `Host` and `X-Forwarded-Host` behavior through Vercel. The routing contract requires explicit HTTPS app/apex/root origins; DNS alone cannot enable routing. No hosts-file trick, disabled TLS verification or broad `serverActions.allowedOrigins` exception is a substitute.

Use a dedicated Clerk application with a supported domain configuration for this HTTPS root. Same-root subdomains do not automatically call for Clerk satellite-domain architecture. Review actual domain/session-cookie requirements, explicit subdomain allowlists, authorized parties, exact central authentication/redirect origins, Google OAuth callbacks and branding. The application currently allows only its configured central origin for Clerk client redirect destinations. No wildcard redirect trust was introduced. Keep payment collection disabled; the existing payment test/live environment guards were not relaxed for staging.

Before registering new test identities in a production-mode deployment, resolve the existing legal/Google-scope/Clerk readiness gates with approved documents and genuine configuration evidence. Existing-account checks may proceed where those gates permit them. Do not mark unapproved documents approved for testing. Bootstrap of a real platform administrator still requires the separately reviewed, explicitly authorized process in [the bootstrap procedure](production-admin-bootstrap-review.md).

## 3. Acceptance evidence matrix

Record environment/project/commit, configured host, disposable actor and role, date/reviewer, screenshot, redacted request/RSC evidence and relevant persisted result for every row. Never store tokens, invitation secrets, MFA codes or passwords in the report. A successful redirect does not count as a completed authenticated journey.

| Journey | Required evidence | Current result |
| --- | --- | --- |
| Google registration and returning Google sign-in | Real consent screen shows identity scopes only, accurate branding; one internal identity; intended continuation; no automatic workspace membership | Pending |
| Existing email and linked authentication methods | Clerk verified ownership flow; legacy collision does not transfer access | Pending |
| Invitation before sign-in/sign-up | Central URL; token retained through OAuth, legal acceptance and registration; explicit acceptance; no extra workspace/subscription | Pending; local unauthenticated link continuation checked |
| One workspace and several workspaces | Automatic entry for one; central picker for several; switcher only for several; target rechecked server-side | Pending in authenticated browser |
| Separate tenant tabs | Actions, filters and redirects remain in each URL's workspace after another tab switches; cookies never select mutation context | Pending |
| Account and security | Central profile/email/security/MFA routes, recovery and return behavior; no unsafe account deletion | Pending |
| Platform roles and MFA | Nonadmins denied; active DB-backed role; actual second-factor claims, strict freshness, recovery, revocation; no implicit tenant access | Pending |
| OWNER/MANAGER/STAFF | Actual page/RSC/action responses exclude unauthorized fields; foreign IDs, forged headers and mismatched host/path denied | Pending in real sessions; automated regressions pass |
| Server Actions and RSC | Same-host mutation succeeds after rewrite; central-only mutation rejects tenant host; GET continuation makes a full cross-origin transition; no Origin exceptions | Pending |
| Session propagation and logout | Same-root session behavior, expiry/revocation, sign-out in another tab, fresh login and tenant continuation | Pending |
| Pending/suspended/expired tenants | Pending routes end at subscription without a loop; suspension denies access; paid expiry permits only established read-only policy | Pending in browser |
| Payment return | Verified current payer/owner reaches its subscription; foreign/unknown references show neutral workspace fallback; callback/redirect never credit or activate | Automated only; real provider return pending |
| Metadata | Marketing-only indexing when explicitly enabled; tenant/app/preview deny robots indexing and omit sitemap entries; same-origin manifest | Automated and local HTTP only |
| DNS/TLS/environment isolation | Real certificate chain, exact project assignment, distinct DB and identity configuration, no production changes | Pending |

## 4. Release gate

Keep current localhost and ordinary preview environments in path mode. No production activation or launch acceptance follows from the Phase 4 tests. Once the project is connected, verify its actual preview URL and secret/database mapping first. Perform the custom-domain test only after isolated HTTPS/Clerk setup is available; report each pass/failure individually and fix defects without weakening authorization. Retain the original production deployment/configuration until this gate and the wider launch checklist pass.

Configuration references: [Clerk production deployment](https://clerk.com/docs/guides/development/deployment/production), [Clerk subdomain allowlist](https://clerk.com/docs/guides/dashboard/dns-domains/subdomain-allowlist), [Next.js Server Action origin checks](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions).
