# Phase 4C — MVP usability polish and stabilization

21 November 2026. Local implementation complete for review. No commit, push, deployment, alias, environment, provider or live-data change. No release-candidate acceptance or Phase 5 work is implied.

## A. Findings recorded and disposition

Inspected Phase 4A/4B reports, dashboard/list/detail pages, settings/team and recipient invitation flows, Activity, subscription presentation, account/recovery/staging/legal screens, shared controls, theme CSS, browser and isolated domain tests. Existing Pearl White/Forest Green/Sage/semantic tokens remain the design system.

| Severity | Concrete issue | Disposition |
| --- | --- | --- |
| P1 usability | Project assignee label/select could expand beyond 1,100px with a long native option at a 320px viewport, widening the page to about 1,206px. | Constrain the flex item and select with min-width zero/grid sizing; retain every option and policy. Actual project-page projection now fits all seven widths. |
| P1 usability | Owner invite submission returning a recoverable error could reset the native select to Staff while controlled role/help still described Manager. | Preserve local draft against React's commit-time form reset using a direct, cleaned-up native reset listener. Test checks actual selected value after failure. Server action/role rules unchanged. |
| P2 accessibility | Clickable client rows had pointer navigation without a native keyboard record link. | Add WorkspaceLink on the name; row handler respects interactive children to prevent duplicate navigation. Keyboard and background-click destinations tested. |
| P2 | Wide resource tables were clipped; filters lacked distinct accessible labels. | Opted resource tables get a contained, labelled keyboard-scroll region and hint; filters get labels. No data/action hidden or document overflow masking. |
| P2 | Small shared controls, weak pale status text, inconsistent page action wrapping and zero-state guidance. | Scoped 44px controls, 16px fields, semantic status contrast, bounded/wrapping headers/cards, permission-aware creation/filter guidance. |
| P2 | Owner invitation result/copy/error context and network recovery were unclear. | Pending feedback, focused outcome, recipient/role snapshot, private explicit copy and manual-copy fallback; uncertain network result remains an error, not success. |
| P2 | Account/recovery/acknowledgment pages retained older presentation and no submit-pending cue. | Opt-in light cards, responsive spacing, checkboxes/focus and reusable pending submit button. Consent text/conditions/versions/return destinations/actions unchanged. |
| P2 | Activity explanation/sidebar consumed excess space and summary scope was easy to mistake for all history. | Compact one explanation card, tighter groups and explicit shown-event scope. Five initial/20 more and all data/auth/cursor behavior retained. |
| High functional / separate | Non-UTC raw timestamp transport can create future-starting paid periods and deny legitimate current access. | Read-only investigation only; [separate assessment](phase4c-staging-acceptance-assessment.md), RC-TIME-1. No payment/entitlement fix in Phase 4C. |

No new customer feature, notification, UI library or dependency was introduced. Public marketing, Clerk sign-in and platform styling retain their existing scope. Only the expressly reviewed private account screens opt into workspace-theme. Existing dark fallback remains available outside that scope.

## B. Exact implementation files

Shared components/CSS hooks add scoped control sizing, colors, min-width constraints, form semantics, contained tables, headers and empty states. ClickableRow's only interaction change respects child controls. PendingSubmitButton reads React form status and never supplies acceptance authority.

Resource page changes are presentation/labels/links/zero-state guidance; ProjectAssignments changes only class hooks. CommercialForm/Fields changes only class hooks. No server action, service, authorization policy, accounting, schema, migration or provider implementation changed.

Owner InvitationForm adds local pending/draft/focus/copy recovery. It never sends email or changes token rules. Keying it by selected workspace clears private local invitation state when switching businesses. Account page changes wrap existing guarded content and reuse existing form actions. Activity changes only surrounding markup/spacing and existing displayed-record summaries.

Exact modified/new files:

- `src/app/account/[[...account]]/page.tsx`
- `src/app/account/legal/page.tsx`
- `src/app/account/legal/rehearsal/page.tsx`
- `src/app/account/recovery/page.tsx`
- `src/app/account/staging-terms/page.tsx`
- `src/app/globals.css`
- `src/app/w/[workspaceSlug]/clients/[clientId]/page.tsx`
- `src/app/w/[workspaceSlug]/clients/page.tsx`
- `src/app/w/[workspaceSlug]/invoices/page.tsx`
- `src/app/w/[workspaceSlug]/projects/[projectId]/page.tsx`
- `src/app/w/[workspaceSlug]/projects/page.tsx`
- `src/app/w/[workspaceSlug]/settings/page.tsx`
- `src/app/w/[workspaceSlug]/tasks/page.tsx`
- `src/components/commercial/CommercialForm.tsx`
- `src/components/commercial/Fields.tsx`
- `src/components/ui/Badge.tsx`
- `src/components/ui/Button.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/ClickableRow.tsx`
- `src/components/ui/Input.tsx`
- `src/components/ui/Table.tsx`
- `src/components/ui/shared/EmptyState.tsx`
- `src/components/ui/shared/PageHeader.tsx`
- `src/features/activity/ActivityHistory.tsx`
- `src/features/assignments/ProjectAssignments.tsx`
- `src/features/clients/components/ClientFilters.tsx`
- `src/features/creation/CreationForm.tsx`
- `src/features/invoices/components/InvoiceFilters.tsx`
- `src/features/memberships/InvitationForm.tsx`
- `src/features/projects/components/ProjectFilters.tsx`
- `src/features/tasks/components/TaskFilters.tsx`
- `src/components/ui/PendingSubmitButton.tsx`
- `tests/phase4c-page-fixtures.cjs`
- `tests/phase4c-presentation.test.cjs`
- `tests/phase4c.browser.cjs`
- `docs/ui-phase4c-usability.md`
- `docs/phase4c-staging-acceptance-assessment.md`

## C. Responsive and accessibility validation

Actual server-page projections, rendered with synthetic read/identity boundaries, cover dashboard, clients/details, projects/details including ProjectAssignments, tasks, invoices, settings (eligible/restricted), subscription, account (available/restricted), recovery, staging acknowledgment, approved/draft legal acknowledgment, Activity and recipient invitation. Empty list cases are included. **161 page/viewport projections** across **320, 375, 390, 430, 768, 1024 and 1440px** pass with no page-level horizontal overflow. Wide tables retain contained horizontal access to their rightmost actions. A minimum table width prevents headings/dates being squeezed into vertical text; this is asserted in the new browser suite.

Hydrated tests exercise actual Owner InvitationForm/shared controls: recoverable error and role/email retention, focused feedback, disabled pending controls, successful recipient snapshot, explicit clipboard copy and failure selection fallback, safe network error without synthetic private marker, acknowledgment pending, associated field errors, keyboard table scrolling and client record navigation. Draft legal documents still have no acceptance button. Outside-workspace body/input styling remains unchanged.

Synthetic screenshot pairs (full-page, actual page markup; not live customers):

| Surface | Mobile | Desktop |
| --- | --- | --- |
| Clients / wide records | [390px](/tmp/workflowconnect-phase4c-clients-390.png) | [1440px](/tmp/workflowconnect-phase4c-clients-1440.png) |
| Project / long assignee | [390px](/tmp/workflowconnect-phase4c-project-390.png) | [1440px](/tmp/workflowconnect-phase4c-project-1440.png) |
| Workspace Settings | [390px](/tmp/workflowconnect-phase4c-settings-390.png) | [1440px](/tmp/workflowconnect-phase4c-settings-1440.png) |
| Activity | [390px](/tmp/workflowconnect-phase4c-activity-390.png) | [1440px](/tmp/workflowconnect-phase4c-activity-1440.png) |
| Subscription | [390px](/tmp/workflowconnect-phase4c-subscription-390.png) | [1440px](/tmp/workflowconnect-phase4c-subscription-1440.png) |
| Account (limited management) | [390px](/tmp/workflowconnect-phase4c-account-limited-390.png) | [1440px](/tmp/workflowconnect-phase4c-account-limited-1440.png) |
| Recovery | [390px](/tmp/workflowconnect-phase4c-recovery-390.png) | [1440px](/tmp/workflowconnect-phase4c-recovery-1440.png) |
| Staging acknowledgment | [390px](/tmp/workflowconnect-phase4c-staging-390.png) | [1440px](/tmp/workflowconnect-phase4c-staging-1440.png) |
| Legal acknowledgment | [390px](/tmp/workflowconnect-phase4c-legal-390.png) | [1440px](/tmp/workflowconnect-phase4c-legal-1440.png) |

Owner invitation [recoverable error at 320px](/tmp/workflowconnect-phase4c-owner-invitation-error-320.png) and [ready/private-copy at 320px](/tmp/workflowconnect-phase4c-owner-invitation-ready-320.png) also captured. Screenshots are temporary local evidence, not committed assets. Fixture HTTP uses explicit UTF-8. Reviewed representative settings, Activity, owner result and account/acknowledgment renders visually.

Contrast tests use actual existing tokens: normal semantic/body/secondary/control text combinations reach at least 4.5:1; essential field border and focus against the light surfaces reach at least 3:1. Focus, labels, pending/error semantics and keyboard interactions were checked, not a comprehensive WCAG certification.

No actual mobile device, virtual keyboard, native date picker interaction, real Clerk UserProfile, signed-in staging browser or assistive-technology session is claimed. Creation tests shorten the visual viewport to exercise keyboard-like space pressure; real iOS/Android acceptance remains necessary. Browser fixtures block external requests and substitute read/auth/action boundaries; they do not establish deployed security or successful real mutations.

## D. Regression evidence

Node 22.21.1, installed Chrome, local production build and PostgreSQL 16 disposable loopback fixtures. Existing migrations applied only to newly created disposable targets; no migration file edited. Private synthetic clusters stop after each run. Test-process-only identity/provider substitutions are explicitly distinct from real acceptance.

| Check | Final result |
| --- | --- |
| New Phase 4C browser | 161 projections / seven widths plus hydrated interactions passed; zero page errors. |
| Existing creation browser | 28 viewport/kind combinations plus focus restoration/trap, shortened viewport, retry/double submission, contextual bindings, assignment UI and invoice reset/refresh passed. |
| Existing invitation/Activity browser | 54 invitation state/viewport cases, six Activity widths and 5→25→28 loading/retry/focus/end passed. |
| Existing theme browser | Passed: rendered light canvas/cards/fields/status/focus; legacy fallback and scoped isolation. |
| Existing dashboard browser | 72 role/state/viewport cases plus actual Quick Add/navigation passed. |
| Existing shell browser | Passed alone: all roles, nested navigation, workspace switch, mobile drawer focus/inertness/scroll restoration, resizing and Quick Add shortcuts. |
| Isolated PostgreSQL creation, Phase 4B, authorization, identity, Proxy | 71 passed including containers; zero failed, skipped or cancelled. |
| Navigation, workspace navigation, dashboard, branding, auth pages/account entry, invitation continuation, P-C1 safe errors, new contrast tests | 46 passed including containers; zero failed, skipped or cancelled. |
| Typecheck | Passed. |
| Affected-file ESLint | Zero errors; nine existing unused-import/function warnings in client detail and invoices pages. |
| Local production build | Passed; no deployment. |
| Full unchanged staging suite, UTC comparison | 20 passed, zero failed. |
| Full unchanged staging suite, Africa/Nairobi | 12 passed / eight failed TAP nodes (seven scenarios plus parent). Confirmed RC-TIME-1 remains open. |

Initial browser attempts encountered the absent bundled Playwright binary and local contention/navigation timeouts; reruns use installed `/bin/google-chrome`. Creation rerun passed alone without relaxing assertions. Earlier failed logs remain; green isolated UTC staging results do not erase non-UTC failures. No security guard or commercial test was disabled.

Reproduction (browser/unit runs do not need a database):

```bash
export PATH=/home/rmuya/.nvm/versions/node/v22.21.1/bin:$PATH
export WORKFLOWCONNECT_TEST_CHROME=/bin/google-chrome
node tests/phase4c.browser.cjs
node --test tests/phase4c-presentation.test.cjs
node tests/creation.browser.cjs
node tests/phase4b.browser.cjs
node tests/workspace-shell.browser.cjs
node tests/workspace-theme.browser.cjs
node tests/dashboard.browser.cjs
npm run typecheck
npm run build
```

Database regressions require separately migrated disposable loopback fixtures and existing rehearsal guards; do not run them against staging/preview/customer databases. Temporary `/tmp/workflowconnect-phase4c-*.log` files retain individual results; evidence is protected but not durable release custody. No ordinary `.env` target or credentials were printed.

## E. Outstanding MVP blockers

- **Confirmed functional defect:** RC-TIME-1 timestamp transport/normalization; protect current-start authorization and financial history in its separately approved fix.
- **Unresolved staging acceptance:** actual target timezone, signed-in Clerk/MFA, end-to-end Test Mode checkout/webhook/reconciliation/activation/access and real mobile browser behavior. Phase 4C does not certify them.
- **Test-contract discrepancies:** the older Phase 4B causal explanation of STANDARD activation failures is inaccurate. Current STANDARD automatic-activation tests are valid; timezone-sensitive failures must not be dismissed as stale. Native Playwright binary availability is a local runner prerequisite, not a product defect.
- **Production prerequisites:** target/schema/revision, environment/admission, legal approval/custody, supplier/IAM/logging/backup/restore/retention and independent lifecycle/export/notification release conditions remain separately reviewed. No production configuration assessed or changed.
- **Optional post-MVP:** broader table/card alternatives, Activity search/filtering, richer device/assistive-technology matrix and further platform/marketing refinement. No new feature starts here.

## F. Release-candidate checklist

- [x] Review implemented local presentation, actual page projections and synthetic screenshots.
- [x] Run targeted UI, creation, invitation, Activity, identity/tenant and build checks; retain failed and passing evidence.
- [ ] Approve and complete RC-TIME-1 with UTC/Nairobi regression matrix and reviewed handling of any existing synthetic periods.
- [ ] Re-run full staging suite with production-like session settings; no timeout/test-contract workaround.
- [ ] Separately approve the release candidate and exact target/revision/admission before deployment.
- [ ] Complete actual signed-in Owner/Manager/Staff, shared-user, invitation/error/recovery, mobile keyboard/date-control and subscription Test Mode journeys.
- [ ] Confirm legal/operational/provider/restore prerequisites and maintain independent feature release gates.

**Stop for Phase 4C review. No commit/push/deployment, live provider request, real payment, customer communication, production/staging environment change or customer-data mutation occurred.**
