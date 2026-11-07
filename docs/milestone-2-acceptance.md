# CoreOps Milestone 2 acceptance report

Date: 5 November 2026. Target supplied by the user: `http://localhost:3000/`.

**Decision: automated stabilization passed; signed-in browser acceptance is blocked and the milestone is not fully accepted.** No real authenticated browser sessions were available. Do not interpret the automated checks below as Clerk or browser acceptance.

## Scope and environment

The story under test is Clerk sign-in -> verified workspace membership -> workspace navigation -> role/assignment-scoped reads and writes -> role-appropriate rendered output. No new features or authorization architecture changes were introduced. Production was not accessed or modified. No migration, reset, or production seed command was run during this milestone.

Database tests used only the existing isolated local PostgreSQL database `coreops_auth_rehearsal_20261105`. The application database URL was overridden for the test child process without editing `.env`; a local-host check preceded invocation. Test guards require the rehearsal database name. Only synthetic fixtures were created, changed, and cleaned up.

The supplied development URL was checked with anonymous, read-only HTTP requests. No session cookie, password, secret, or test identity was sent to it. Credentials were not printed or changed.

## Results by evidence type

| Check | Result | Evidence and limit |
| --- | --- | --- |
| Existing PostgreSQL authorization suite before fixes | PASS | 22 Node test results; includes suite containers. Clerk and request context are substituted in the harness. |
| Expanded PostgreSQL/service/SSR/action suite | PASS | 25 Node test results; zero failures. Includes real database queries and transactions, rendered dashboard HTML, and function-level server-action results. Includes suite containers. |
| Status-control regression checks | PASS after fix | All three controls failed the pre-fix assertion that React receives the action promise; all three pass after correction, including promise rejection propagation. React hooks/actions are substituted to inspect transition callbacks. |
| TypeScript and Next route types | PASS | `npm run typecheck`. |
| Full-project ESLint | PASS with warnings | Zero errors; 12 existing unused-code warnings remain in workspace pages. Demo/pricing errors resolved. |
| Production build | PASS | `npm run build` completed successfully with the existing development configuration; does not validate production Clerk setup or signed-in rendering. |
| HTTP smoke at supplied URL | AUTH HANDSHAKE ONLY | `/`, `/demo`, `/pricing`, `/dashboard`, `/w/m2-invalid-workspace/projects`, and `/api/clients` returned 307 to Clerk's `/v1/client/handshake`. No authenticated content was inspected. |
| Real Clerk sign-in/sign-out/session expiry | UNVERIFIED | No connected browser or real authenticated test sessions. |
| Manual OWNER/MANAGER/STAFF journeys | UNVERIFIED | Service tests use synthetic identities, not Clerk sessions. |
| Separate real browser tabs and switching | UNVERIFIED | Parallel request contexts pass automated checks; browser navigation, cookies, prefetching, and client cache behavior are not established by that test. |
| Real invitation handoff and membership changes through UI | UNVERIFIED | Transactional service paths pass; actual user interaction and error presentation require browser validation. |

## Automated authorization coverage

- Unauthenticated identity, missing workspace context, nonmembership, and suspended membership are denied by services.
- One synthetic identity has STAFF access in one workspace and MANAGER access in another; workspace roles do not cross contexts.
- Staff reads include only assigned projects, individually assigned tasks, and explicitly team-visible tasks in authorized projects. Updating a team-visible but unassigned task is rejected.
- Role-filtered JSON service data excludes private client contact values, project budget values, invoice identifiers, hidden project names, and unassigned task titles from STAFF results. MANAGER service results exclude invoice identifiers and financial dashboard values.
- The actual dashboard page component is evaluated against real fixture data and rendered to HTML through React's server renderer. OWNER output includes financial cards and invoice activity; MANAGER/STAFF output excludes them. This is component-level SSR evidence, not captured HTTP/RSC traffic from a real session.
- Function-level task/invoice server-action results are exactly `{ success: true }` for permitted operations; forbidden operations reject. Next cache invalidation is substituted. Actual network envelopes remain unverified.
- Single active workspace triggers the selector page's redirect; multiple memberships produce choices; the switcher renders only for multiple memberships. A suspended workspace is excluded from active selection, and an untrusted selection cookie cannot confer access.
- Parallel request contexts retain independent workspace reads. The proxy test verifies URL-derived workspace context replaces a forged client header.
- Composite foreign keys reject cross-workspace project/client, task/project, invoice/client/project, and assignment relationships.
- Last-owner removal, suspension, and demotion are rejected. Simultaneous owner demotions leave an active owner. Concurrent suspension and assignment revocation cannot bypass checks inside the business-write transaction.
- Invitations check verified identity ownership, expiry, revocation, and safe replay; existing membership roles are not escalated by invitation replay.
- Identity provisioning handles 20 simultaneous first requests, synchronizes verified profile fields, rejects unverified signup, and prevents email-based takeover of existing/legacy bindings.
- Concurrent initial onboarding creates one workspace, first owner, and subscription. Audit/business changes roll back atomically on failure.

## Findings and fixes

### M2-01: status controls did not track their asynchronous action

Task, project, and invoice status controls used a synchronous `startTransition` callback that discarded the server-action promise. A regression test reproduced the issue in all three controls with the assertion “React must receive the server action promise.” A slow action could outlive the pending state; a rejected permission check was outside transition error handling.

**Fixed:** each transition callback is async and awaits its action. Existing server authorization, statuses, and action response shapes are unchanged. Tests confirm completion remains pending until the promise resolves and that rejection propagates through the transition callback. Real browser pending/error presentation still requires acceptance.

### M2-02: demo/pricing lint failures

**Fixed:** demo launch effects use cancellable timer callbacks, state updates copy each step instead of mutating prior state, and navigation side effects occur outside state updater functions. The six 450 ms steps and final 800 ms dashboard handoff are preserved. Launch initialization is scheduled on the next timer turn. Pending timers are cleared on unmount.

Pricing retains normal browser navigation to `/demo?launch=true` using `location.assign`; the icon type is now `LucideIcon`. JSX quote escaping preserves the visible text. Unused demo/pricing imports were removed. No pricing values, waitlist storage, marketing copy, demo destination, or billing behavior was redesigned.

### M2-03: signed-in acceptance cannot currently be performed

Browser inventory returned `apps: []` and `browsers: []`, including after the development URL was supplied. Creating an in-app browser returned `Browser is not available: iab`.

**Still blocked:** the URL is reachable, but providing it does not connect a browser control surface. Anonymous HTTP reached Clerk's development handshake; that is neither a failed-signin diagnosis nor proof of working authentication. A browser connected to this session, with disposable development/staging accounts, is required to finish acceptance. No login bypass or architectural workaround was added.

### M2-04: stale Prisma runtime after the membership schema change

User-supplied signed-in logs showed the SSO callback completing, followed by `PrismaClientValidationError: Unknown argument status` in `getActiveMemberships`. Both the schema and generated client on disk already contained `WorkspaceMember.status`. The running development process was retaining older Prisma runtime metadata; this was a client validation failure, not evidence of a missing database column or failed OAuth callback.

**Fixed:** the development singleton is now keyed by generated schema metadata and Prisma client version. A hot reload replaces and disconnects a cached client when that signature changes, while unchanged schemas reuse the pool. `predev` and `prebuild` regenerate Prisma before startup/build. The confirmed local Next development process was restarted on port 3000 so the Node module cache also reloaded the generated package. No migration or account-data repair was required.

Validation: the cache regression test passed for legacy/mismatched cache replacement and unchanged-cache reuse; TypeScript passed; a read-only ACTIVE membership query against the local database passed without displaying records. The server reported Ready after restart. The user's signed-in browser needs a reload to verify the full dashboard continuation; this is not recorded as a completed browser acceptance pass.

### Response and endpoint inspection limits

There are no implemented Next App Router API handlers for the placeholder files under `src/api`; those files are empty and outside `src/app`. Current business mutations use server actions. The `/api/clients` anonymous handshake response does not prove a working clients API exists.

No unauthorized sentinel data was found in tested service payloads or component-level dashboard HTML. Actual authenticated HTTP bodies, Flight/RSC payloads, server-action network responses, browser console, and client navigation caches remain uninspected. This report makes no claim that those boundaries passed.

## Required signed-in browser pass

Use two disposable tenants A/B and separate OWNER, MANAGER, and STAFF accounts in development/staging. Use no production accounts or customer data. Record the account label, workspace/role, URL, action, expected/actual result, and any redacted console/network evidence for each case.

| Journey | Required evidence | Status |
| --- | --- | --- |
| Fresh signup, verify, onboarding, signout, signin | Real Clerk session; one initial workspace; persisted data after signin | Pending |
| One active membership | `/dashboard` enters the workspace automatically; no switcher | Pending |
| Multiple memberships | Selector and switcher show active memberships; role changes per workspace | Pending |
| Two simultaneous tabs | A/B URLs and reads/writes retain their own tenants after switching, refresh, back, and navigation | Pending |
| OWNER | Operations, contacts, budgets, invoices, totals, members, settings allowed within its tenant | Pending |
| MANAGER | Operations/contacts/budgets allowed; invoices, financial totals, subscription/admin denied even by direct navigation/action | Pending |
| STAFF | Assigned projects and permitted tasks allowed; contacts, budgets, finance and unassigned resources absent/denied | Pending |
| Invitation lifecycle | Intended verified identity succeeds; wrong account, expired/revoked token fail; repeat acceptance is safe | Pending |
| Suspension and role changes | Next request loses revoked access; other workspace access remains independent; stale tabs cannot write | Pending |
| Last owner | Removal/demotion/suspension prevented with understandable UI feedback; valid transfer works | Pending |
| Response inspection | Search raw HTML, RSC, action responses and client props for synthetic restricted-data sentinels; verify direct unauthorized requests | Pending |
| Session interruption and status errors | Expired session/forbidden action does not show false success; pending controls remain disabled until completion | Pending |

## Remaining launch blockers

1. Complete the real-session browser matrix above. Milestone 2 must stay open until evidence exists.
2. Validate production Clerk domain, keys, verification delivery, redirect behavior, and session revocation in the target environment.
3. Retain the existing launch checklist for invoice idempotency, financial correctness, production backups/restoration, observability, support readiness, and load validation. This milestone does not claim to resolve them.
4. Demo launch remains a simulated sequence that navigates to the actual dashboard; pricing waitlist remains browser-local storage. These existing behaviors were preserved as requested and still require a product decision before marketing them as durable sandbox/lead-capture capabilities.
5. Existing workspace-page lint warnings remain; they do not fail the current lint command.

## Reproduction

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:status-controls`
- Set `DATABASE_URL` for the child process to the isolated migrated rehearsal database, then run `npm run test:authorization`. Do not point this suite at the normal application or production database and do not place credentials in this report.

Test evidence is in `tests/authorization.integration.cjs`, `tests/identity.integration.cjs`, `tests/proxy.test.cjs`, and `tests/status-controls.test.cjs`. Browser steps must be completed through a connected browser; the test harnesses must not be represented as real authenticated sessions.
