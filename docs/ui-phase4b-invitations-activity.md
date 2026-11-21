# Phase 4B — Invitation onboarding and Activity history

21 November 2026. Local implementation for review, based on clean working tree revision `1521584`. No commit, push, deployment, alias change, environment edit or Phase 5 work. No live customer records, payments or provider configuration were accessed or changed.

## A. Initial findings

WorkflowConnect owns `WorkspaceInvitation` records, random bearer links and hash-only token storage. Clerk supplies verified identity; it does not own workspace invitations or membership. The existing acceptance service already locks the invited workspace, checks verified email, existing/suspended membership, commercial write access and capacity, and atomically creates membership/acceptance audit evidence. Replays retain existing roles and avoid duplicate evidence. That service remains unchanged.

Previously the invitation page immediately called `getCurrentUser()`, showed no workspace-specific context and submitted directly to a void action. Its generic error page did not distinguish recoverable states. Routing required authentication before this page could show an introduction. Sign-in/sign-up already preserve strictly allowlisted `returnTo` invitation paths and set Clerk's forced post-authentication destinations correctly. The proxy strips/replaces forged internal continuation headers.

Staging was the confirmed continuation gap: `requireCurrentLegalReceipt()` redirected to staging terms without intent, and acknowledgment always returned to `/dashboard`. Ordinary approved legal acknowledgment already preserves intent. The separate synthetic exact-document rehearsal also previously discarded intent. Standard identity provisioning may create/synchronize a local User and require acknowledgment; this must not create a workspace, subscribe the recipient or accept an invitation automatically.

Activity previously queried the newest 100 audit rows, ordered only by timestamp, with no paging contract. Its summary cards counted that displayed window, not all historical records. Dashboard Recent work is a different operational-record feed and retains its existing five-record limit.

Inspected the invitation page/error/layout, owner InvitationForm/actions, membership service, Clerk identity and current-user provisioning, sign-in/sign-up and existing-session components, request-plan/proxy/navigation/host helpers, staging/legal acknowledgment paths, Activity page/read service, audit schema/indexes, authorization/commercial helpers, dashboard Recent work and relevant tests. No general authorization definition or audit producer was edited.

## B. Changes and exact files

| File | Phase 4B change |
| --- | --- |
| `src/features/memberships/invitation-view.ts` | Closed recipient-view/status and feedback contracts. |
| `src/server/services/invitation-view.service.ts` | Minimal token lookup and identity-gated metadata projection; no invitation/member mutation. |
| `src/features/memberships/InvitationCard.tsx` | Responsive recipient introduction, details, explicit acceptance, safe account switching, state/error/pending announcements. |
| `src/app/invitations/[token]/page.tsx` | Dynamic private page with safe central authentication links and bound acceptance action. |
| `src/app/invitations/[token]/error.tsx` | Scoped light-theme fallback and retry. |
| `src/features/memberships/actions.ts` | Add recoverable acceptance feedback around the unchanged authoritative service and existing continuation redirect. |
| `src/lib/routing/request-plan.ts` | Allow central invitation GET/HEAD introductions; POST/action authentication and host restrictions remain. |
| `src/server/auth/legal-acceptance.ts` | Preserve proxy-derived, allowlisted intent through missing staging/synthetic-rehearsal acknowledgment redirects. |
| `src/app/account/staging-terms/page.tsx` | Read/allowlist intent and bind it to acknowledgment. |
| `src/app/account/staging-terms/actions.ts` | Validate acknowledgment as before, then redirect to the allowlisted intent. |
| `src/app/account/legal/rehearsal/page.tsx` | Carry an allowlisted continuation in the existing synthetic presentation. |
| `src/app/account/legal/rehearsal/actions.ts` | Retain that intent on retry/success without changing document/acceptance semantics. |
| `next.config.ts` | Private no-store/no-referrer/noindex responses on invitation and auth/acknowledgment routes that can carry the secret continuation; retain payment-return protections. |
| `src/app/globals.css` | Invitation-only Pearl White/Forest Green responsive styles and accessible controls/focus. |
| `src/server/services/activity.service.ts` | Authorized, bounded tuple-cursor audit retrieval and minimal serializable projection. |
| `src/features/activity/actions.ts` | Per-request authorized loading with generic safe errors. |
| `src/features/activity/ActivityHistory.tsx` | Preserve timeline/grouping/labels; compact loaded-window summary, incremental loading, retry, focus and live announcements. |
| `src/app/w/[workspaceSlug]/activity/page.tsx` | Authorized initial page and workspace-specific client-history remount key. |
| `tests/phase4b.integration.cjs` | Real isolated PostgreSQL invitation, concurrency, commercial and pagination tests; substituted identity/request boundary and outbound-fetch tripwire. |
| `tests/invitation-continuation.test.cjs` | Actual staging/legal guards/actions with synthetic boundary substitutes; strict intent and acknowledgment tests. |
| `tests/phase4b.browser.cjs` | Hydrated real presentation components with offline synthetic action responses. |
| `tests/proxy.test.cjs` | Public introduction versus protected acceptance, host and forged-header regression. |
| `tests/privacy-errors.test.cjs` | Updated exact private-route header expectations and noindex assertions. |
| `docs/ui-phase4b-invitations-activity.md` | This review/acceptance report. |

No package/dependency, schema, migration, membership service, permission definition, Clerk configuration/MFA, subscription/Paystack/tax, platform administration, workspace shell or dashboard source changes.

### Invitation behavior

Unauthenticated valid-link visitors see a masked email and actual expiry, with Sign in/Create account links preserving the exact allowlisted invitation route. **Workspace name, invited role and full email are deliberately withheld before live verified recipient matching**, including for a signed-in wrong account. A copied bearer link does not establish recipient identity. This is a stricter disclosure choice than the illustrative public heading in the brief. Matching verified recipients see the actual workspace name, invited role, full invited email and expiration.

The page handles pending, wrong-account, expired, unavailable/revoked, suspended, restricted, accepted and account/provider-unavailable states. Revoked/invalid/accepted-without-membership states remain generic where disclosure would be inappropriate. Unverified primary identity remains subject to the existing Clerk verification guard; a failed identity check grants no details or membership. Correct accepted members receive an authorized workspace continuation rather than a second acceptance mutation.

Acceptance is an explicit button action, with pending/disabled feedback and a focusable safe error. Authentication and acknowledgments never accept automatically. Wrong accounts can use Clerk's existing SignOutButton and return through sign-in to the same invitation. No recipient email is rewritten. Commercial/capacity blocks direct the teammate to the owner instead of checkout or independent subscription purchase.

Staging agreement acknowledgment remains separate from customer legal agreement. Its existing identity/admission/content-hash/upsert requirements are unchanged. The new continuation is only a navigation destination, never identity, membership or consent authority. The existing ordinary legal route is unchanged; synthetic legal rehearsal now retains navigation intent without changing its release gate, exact-text evidence or acceptance requirements.

### Activity behavior

The initial query returns five events and at most one lookahead row. Later requests return twenty and at most one lookahead row. The contract has no client-controlled workspace, offset, sort or page-size parameter. It selects only ID, action, resource type/resource ID and timestamp; actor/metadata bodies remain excluded.

Order and continuation use `(createdAt DESC, id DESC)`. A bounded, versioned base64url cursor contains only the anchor ID and ISO timestamp. It is validated, then its exact anchor is verified in the currently authorized workspace. Scope comes exclusively from `requirePermission("audit:read")`; a cursor is not a credential. Foreign, malformed, oversized or altered anchors fail safely. No signing secret/environment variable was introduced because the cursor grants no authority and the row/scope check is authoritative.

Keyset traversal avoids offset shifts when newer events arrive. Already traversed records are not duplicated; newer top-of-feed events are seen on reload. No claim of a permanently frozen snapshot under privileged backdated inserts/deletion is made. Read-only retrieval does not delete, truncate or rewrite audits.

The client retains earlier pages, merges date groups, guards repeated clicks and keeps the cursor/data on failure. Each successful load focuses the first added event and announces the added/loaded counts. End-of-history removes the button. A non-authorizing workspace fingerprint keys client history on workspace changes; every request independently rechecks current membership/permission/commercial read access. Compact summaries explicitly describe **events/changes/records shown**, not all-time totals. Existing event mappings and Nairobi date grouping remain; no audit events or producer semantics were invented.

## C. Security review

- Existing random token generation, SHA-256 hash storage, seven-day expiry, revoke/reissue behavior and server-owned role/workspace/email authorization are unchanged.
- Read-only invitation metadata is minimal. Standard authenticated User synchronization/required acknowledgment can still occur through `getCurrentUser()`; merely viewing the page never creates a Workspace, Subscription, membership or acceptance audit.
- Live Clerk identity/admission and verified email matching precede private metadata. Acceptance independently repeats its existing authoritative checks; a stale page cannot authorize a race past revocation/capacity/suspension.
- Existing transaction locking, role preservation, unique membership and single acceptance audit remain authoritative. Eight concurrent acceptance attempts were exercised against real PostgreSQL.
- Central GET/HEAD introduction access does not allow unauthenticated POST/actions, tenant-host mutation redirects, platform access or resource reads. Existing proxy header replacement is retained and tested.
- Continuations use `safeAuthReturn()` again at submission. Foreign/protocol-relative/backslash/malformed paths are rejected. No external redirect or posted role/workspace/email supplies membership authority.
- No application log statement emits raw tokens, recipient emails, session IDs, provider errors or untrusted query strings. Unexpected presentation/action failures are generic; Next redirect/not-found control flow is rethrown.
- Dynamic serving, existing invitation robots metadata and the private response headers reduce caching/indexing/referrer exposure. The incoming secret URL and auth `returnTo` can still exist in browser history and infrastructure/Clerk request logs. No claim of cloud URL redaction, IAM/retention or CDN override verification is made.
- Activity remains Owner-only with current workspace/commercial read authorization on every page. Manager, Staff, unauthenticated and foreign-workspace cursor attempts were rejected. The dashboard operational feed and its cap are unchanged.

## D. Validation and evidence

| Check | Actual result / scope |
| --- | --- |
| Phase 4B + existing authorization/identity/proxy PostgreSQL/regression suite | **62 passed, zero failed**, including parent containers. Real token hashes/expiry projection, verified matching, replay/concurrency, new account membership, wrong/unverified identity, expired/revoked/tampered links, suspended/accepted-without-membership denial, capacity/subscription blocks, cross-workspace safety and no new workspace/subscription. |
| Activity integration within that suite | Empty/3/5/6 records; 129-record tied-timestamp history; insertion during traversal; exact prior-history order without skips/duplicates; 5/20 bounded pages; end state; role/foreign/invalid/oversized-cursor denial. No retention operation. |
| Continuation/auth/routing/privacy unit suite | **48 passed, zero failed**. Includes five new staging/ordinary/synthetic legal continuation tests, existing Clerk sign-in/sign-up destination tests, proxy restrictions and exact no-store/no-referrer/noindex scopes. Boundary substitutes do not prove actual Clerk browser execution. |
| Dashboard/navigation/auth-configuration regression | **10 passed, zero failed**. Existing operational Recent work source/limit and role visibility retained. |
| Invitation/browser | **54 state/viewport renderings** across 320/375/390/430/768/1440px; long names, protected/full-email projection, authentication links, account-switch UI, explicit acceptance loading/errors/focus and no horizontal overflow. |
| Activity/browser | Six requested viewport widths; compact summary, long labels, 5→25→28 records, retry without losing earlier events, merged dates, live counts, focus on newly loaded events, empty/end states and reduced-motion context. Real components, synthetic server-action responses, foreign network origins blocked. |
| TypeScript | `npm run typecheck` passed. |
| ESLint | All affected application and test files passed with zero errors/warnings. |
| Local production build | Passed; no deployment. |
| Diff whitespace | `git diff --check` passed. |
| Broader existing staging domain suite | **12 passed / 8 failed out of 20**, including the failed parent container. The seven failing payment/activation scenarios were reproduced with the original `1521584` legal guard substituted only inside a fresh disposable test process. The failed scenario lists are identical. Staging registration/acknowledgment cases passed. These are **pre-existing broader-suite failures**, not a green staging acceptance result. |

The broader staging failures concern tests expecting automatic paid activation/operational access after payment, while the current payment path retains separately gated activation. No payment, activation, financial fixture expectation or business source was changed to make those tests pass. Their exact failed scenarios are: concurrent payment credit/activation; returning subscribed operations; renewal entitlement; abandoned payment reconciliation/activation; replacement checkout activation; upgrade entitlement; and customer suspension/restoration operations. Reconcile these tests with the approved activation contract in a separately scoped follow-up before claiming full staging readiness.

Test groups overlap (for example proxy cases); counts are not additive unique totals. An initial sandbox-only unit attempt reported file-level containers; the evidence above uses the permitted Node test-worker rerun with individual cases. The additional broad staging failures are retained, not hidden or relabeled as passes.

Database tests used a fresh password-protected PostgreSQL 16 cluster on numeric loopback, with disposable `coreops_auth_rehearsal_market_phase4b_261121` and `coreops_auth_rehearsal_staging_phase4b_261121` databases. The existing 38-migration chain was applied unchanged to these fixtures only. The cluster was stopped afterward. The baseline comparison used a separate disposable cluster and read-only source substitution, not a working-tree revert. No normal/local application, preview/staging or production database was accessed or migrated.

New evidence: `/tmp/workflowconnect-phase4b-{authorization,units,regressions,continuation,browser,types,lint,test-lint,build,migrations,staging,staging-baseline,staging-migrations}.log`. These local synthetic artifacts are not durable release custody.

Synthetic screenshots, captured and visually reviewed:

- [Invitation introduction, 390px](/tmp/workflowconnect-phase4b-invitation-SIGN_IN-390.png)
- [Verified invitation, 390px](/tmp/workflowconnect-phase4b-invitation-READY-390.png)
- [Expired invitation, 390px](/tmp/workflowconnect-phase4b-invitation-EXPIRED-390.png)
- [Verified invitation, desktop](/tmp/workflowconnect-phase4b-invitation-READY-1440.png)
- [Activity, 320px](/tmp/workflowconnect-phase4b-activity-320.png)
- [Activity, 390px](/tmp/workflowconnect-phase4b-activity-390.png)
- [Activity, desktop](/tmp/workflowconnect-phase4b-activity-1440.png)

Reproduce with Node 22. Database commands require an **already migrated disposable loopback rehearsal target**, supplied securely; never use the ordinary `.env` database unchanged:

```bash
node --test --test-concurrency=1 tests/phase4b.integration.cjs tests/authorization.integration.cjs tests/identity.integration.cjs tests/proxy.test.cjs
node --test tests/invitation-continuation.test.cjs tests/navigation.test.cjs tests/host-policy.test.cjs tests/auth-pages.test.cjs tests/privacy-errors.test.cjs tests/proxy.test.cjs
node --test tests/dashboard.test.cjs tests/workspace-navigation.test.cjs tests/auth-configuration.test.cjs
WORKFLOWCONNECT_TEST_CHROME=/bin/google-chrome node tests/phase4b.browser.cjs
npm run typecheck
npm run build
```

Limits: no real signed-in staging browser, actual Clerk new-account verification/account switching, HTTPS auth redirects/cookie behavior, mobile native keyboard, cloud caching/log retention or provider delivery acceptance was performed. New-account integration fixtures represent the already provisioned synthetic identity; actual Clerk registration and staging acknowledgment are separately covered by boundary tests/domain regressions and still require manual acceptance. Very large tied-timestamp histories should be profiled against the existing workspace/timestamp index before release; no new schema/index migration was justified or introduced here.

## E. Manual staging acceptance plan — after separately approved release

1. Review/authorize the Preview release, preserving current staging identity/admission and any deployment-specific PAY-1 binding. This report does not authorize deployment or changing configuration.
2. Use an existing synthetic workspace Owner with an activated eligible plan, invitation entitlement and available member capacity. Confirm the intended recipient is permitted by the existing staging registration/admission process. Do not disable those guards or create another administrator.
3. Owner creates a **Staff** invitation in Settings using a synthetic test email. Confirm that the UI creates a private link; no automatic email is promised. Share only through the approved test channel.
4. Open the link in a private browser. Confirm masked recipient/expiry, hidden workspace/role before verification, and working Sign in/Create account links. Inspect private no-store/no-referrer/noindex response headers without publishing the secret URL.
5. Use the intended Clerk development-instance account or create/verify that account. Complete the existing synthetic staging acknowledgment when required. Confirm return to the same invitation rather than workspace onboarding/checkout. If approved ordinary legal acknowledgment applies in a separately configured target, confirm the same continuation without treating synthetic terms as legal consent.
6. Confirm actual workspace/Staff role/email/expiration after verified matching. Deliberately test a wrong account separately: no private details or acceptance, and safe sign-out/switch back to the invitation. Never edit the invitation recipient to fit the wrong login.
7. Explicitly click Accept invitation. Observe pending feedback and arrival in the invited workspace. The recipient must not be asked to buy a separate subscription or create a workspace. If their account has another membership, verify switching preserves both independent memberships and permissions.
8. Owner verifies exactly one intended membership and one `INVITATION_ACCEPTED` audit event. Reopen/retry the accepted link: appropriate workspace continuation and no duplicate membership/audit. Test expired/revoked links, suspension and capacity/subscription blocks with separate authorized synthetic cases.
9. With sufficient existing authorized synthetic audit fixtures/ordinary test operations, verify five initial events, then 20 older events per activation through history exceeding 100. Check date grouping, loaded-window summaries, retry and final end message. Do not insert/delete production audit evidence for this test.
10. In another Owner tab, create an ordinary synthetic record while paging older history. Confirm no duplicate/skipped pre-existing older entries; reload to see the newly recorded event. Confirm Manager/Staff cannot open history or load another page directly.
11. Record actual signed-in/HTTPS results and the unresolved broader staging-suite failures before any readiness decision. No production activation follows automatically.

## F. Remaining P2 backlog — not implemented

- Owner invitation-link creation/copy/error styling still has older accent/status color choices; review visual consistency separately without exposing private links or changing sending behavior.
- Account/legal/staging acknowledgment pages retain their existing presentation; a future scoped pass can unify spacing and light-theme feedback without changing legal semantics.
- Activity explanatory sidebar cards and detailed event density could be refined separately for long mobile histories. Compact summary and paging are complete; no general workspace-shell redesign occurred.
- Consider verified producer-specific labels for future/unknown audit types rather than inventing events or descriptions. Search/filter/calendar navigation and live-feed behavior are not part of this checkpoint.

Stop for Phase 4B review. No commit, push, deployment, environment or live-data change occurred.
