# Phase 4A — Primary creation flows and mobile forms

21 November 2026. Implemented locally for review. Pass 1 only; no commit, push, deployment, environment change or Pass 2 implementation.

## A. Findings and inspection

Inspected the Clients/Projects/Tasks/Invoices lists, client and project profiles, all four creation forms/actions/schemas/services, ClientActionPanel, both task-form variants, Quick Add, workspace authorization/commercial guards, project/task assignment services, shared Input/Card/Table/PageHeader, workspace shell/theme and existing authorization/navigation/browser tests.

Projects and invoices were created from client profiles; tasks used a separate project-profile panel. Their global lists lacked creation actions. Quick Add exposed placeholder client/search/task views and supplied an empty client list to its invoice micro-form. Several files also retained old commented implementations. Existing forms submitted void server actions without recoverable inline errors or pending feedback. Some force-open forms omitted Cancel.

**Mobile root-cause boundary:** the original Client form embedded nested grids and shared input wrappers without explicit `min-width: 0`; its inline footer had no wrapping/full-height scrolling arrangement. These are source-level containment/reachability weaknesses. An isolated 320px Chromium baseline with a 240px parent measured form/input width and scroll width at 198px and did **not** reproduce horizontal overflow. Consequently the exact cause of the previously reported device failure is not established. This report does not invent a reproduced defect. The replacement removes reliance on those intrinsic grid widths and on the surrounding table/page for form sizing; all requested viewport bounds are verified below. A real-device keyboard/browser acceptance check remains useful.

## B. Implementation and exact Phase 4A files

| File | Change |
| --- | --- |
| `src/features/creation/types.ts` | Shared kind/options/safe result contract. |
| `src/features/creation/actions.ts` | Reuse existing schemas and services; authenticated write-gated minimal options; safe validation/failure results; scoped list/dashboard/context refresh. |
| `src/features/creation/CreationForm.tsx` | Shared accessible native dialog, full-height mobile form, scrollable body and separate reachable footer, contextual selectors, inline client stage, retry/loading/focus handling. |
| `src/app/globals.css` | Workspace-scoped creation styles using existing tokens; bounded inputs/fields, dynamic viewport sizing and focus indicators. No global overflow masking. |
| `src/app/w/[workspaceSlug]/clients/page.tsx` | Permission/write-gated New Client header action and Quick Add open intent. |
| `src/app/w/[workspaceSlug]/projects/page.tsx` | New Project action and updated empty-state guidance. |
| `src/app/w/[workspaceSlug]/tasks/page.tsx` | New Task action and updated empty-state guidance. |
| `src/app/w/[workspaceSlug]/invoices/page.tsx` | Owner-only New Invoice action. Existing totals, accounting and status calculations unchanged. |
| `src/features/clients/components/ClientForm.tsx` | Reuse shared client form. |
| `src/features/projects/components/CreateProjectForm.tsx` | Reuse shared form; preserve contextual client and existing props. |
| `src/features/tasks/components/CreateTaskForm.tsx` | Reuse shared form; preserve contextual project. |
| `src/features/tasks/components/Create TaskPanel.tsx` | Existing project-profile panel delegates to the same task form. |
| `src/features/invoices/components/CreateInvoiceForm.tsx` | Reuse shared form; preserve contextual client/default project and existing props. |
| `src/features/clients/components/ClientActionPanel.tsx` | Existing role-limited contextual buttons use the shared closable forms. |
| `src/features/quick-add/components/QuickAddDialog.tsx` | Route creation to verified list forms; browse existing Clients instead of fake search. Remove mounted placeholder/empty-client micro-forms. |
| `src/server/services/assignments.service.ts` | Extract existing assignment validation/update/audit into transaction helper; retain original assignment wrapper. |
| `src/server/services/tasks.service.ts` | Optional assignment during creation in the same transaction, using that helper. |
| `tests/creation.integration.cjs` | Real isolated PostgreSQL action/service/permission/transaction tests. |
| `tests/creation.browser.cjs` | Hydrated real form components with offline synthetic action boundaries. |
| `tests/workspace-shell.browser.cjs` | Extend existing navigation regression with Quick Add destinations and manager invoice omission. |
| `docs/ui-phase4a-creation.md` | This review record. |

Pre-existing changes to `package.json`, project detail page, authorization permission definitions, authorization integration tests, commercial fixtures and the delivery-check files were already present and were not edited by this checkpoint. They remain in the working tree. Do not stage the entire working tree as Phase 4A.

All lists now show creation to actors who can currently write that resource. Existing contextual entry points retain their client/project without requiring reselection. Context options are fetched with fresh server authorization; posted IDs remain untrusted.

Client labels distinguish a client/primary contact name from an optional company/organization. The shared form supports Cancel, Escape when not saving, modal focus containment/restoration, inline errors and retained values. Saving disables fields/actions and uses an immediate in-memory latch against rapid double submission. Native mobile date/email controls and 16px fields remain available. No new UI library was added.

Project creation can temporarily switch to a client stage using the same client schema/service. Successful client creation is a separate committed operation, explicitly reported as such. The selected new client and project values survive a project failure; retrying the project does not create another client. Cancel after that stage leaves the already saved client available. This is not a combined atomic client/project promise.

Invoice client changes clear the selected project; options only show that client's projects. Standard invoice creation retains the shared service's **SENT** default; it neither sends email nor records payment. Quick invoice's existing DRAFT service contract was not changed. Successful creation refreshes workspace lists/dashboard and relevant client/project context. A post-commit cache failure returns truthful saved guidance rather than encouraging a duplicate insertion.

Quick Add navigates to the existing workspace lists with a fresh opaque open intent. The list keys the form by that intent, so choosing it again on the same list can reopen it. The intent is UI state, never authority. Existing contextual dashboard Quick Add requests route to these flows as well. Existing unused micro-form files/actions remain available for their prior tests; they are no longer mounted by Quick Add.

## C. Security and integrity

The existing `workspaceMutation` boundary still locks the Workspace, rechecks active membership/role, current market/commercial feature and write access, and executes mutations/audits transactionally. Permission definitions were not changed: Owner/Manager create clients/projects/tasks; only Owner creates invoices. Staff cannot load creation choices or mutate these records. Pending, suspended, excluded-feature and expired-write workspaces retain their existing restrictions. In particular, **grace still permits writes under the current policy**; read-only starts after grace ends.

Client/project/teammate options only contain current-workspace identifiers and necessary names/relationships, not client contacts, financial details or arbitrary tenant records. Each service independently validates resource ownership. Invoices reject foreign-workspace clients and cross-client projects.

Task creation calls the extracted existing assignment validator under the same transaction. An active same-workspace teammate is required; Staff additionally require project membership. The helper checks the existing `tasks:assign` permission. Invalid assignment rolls back the task and its audit. Existing `TASK_CREATED` and `TASK_ASSIGNMENT_CHANGED` audit payload semantics remain unchanged. No new permission or membership flow was introduced.

Approved schema messages remain inline. Unexpected failures return a generic message and server-generated reference; ordinary logs contain only a closed event/code/reference object. No arbitrary exception text, stack, SQL, customer records or provider data is serialized. Framework control-flow exceptions are preserved. Date and non-negative decimal syntax checks reject malformed form values without floating-point conversion; the existing Decimal storage/accounting behavior remains in the service/database.

No authentication, Clerk/MFA, subscription/Paystack/tax, schema/migration, invitation or lifecycle/export/notification gate change was made. Phase 2 shell/navigation architecture and Phase 3 dashboard markup/services remain unchanged.

## D. Verification and limits

| Check | Result / evidence boundary |
| --- | --- |
| Creation + existing authorization PostgreSQL suites | **36 tests passed, zero failed**, including parent containers: 8 new creation scenarios plus existing authorization scenarios. Real writes, Decimal persistence, tenant/role rejection, task assignment rollback/audit and commercial checks; synthetic request identity only. |
| Creation browser | **28 kind/viewport combinations passed** at 320/375/390/430/768/1024/1440px, plus retry/double-click, inline-client recovery, context, assignment filtering, invoice selection, empty lists, focus and reduced-height checks. Actual components/CSS; synthetic server-action responses, all external requests blocked. |
| Workspace shell/navigation browser | Passed existing drawer/role/focus/shortcut/scroll/resize checks and new Quick Add destination/role assertions. |
| Workspace theme browser | Passed pearl/white/text/focus/status and legacy-scope regression. |
| Dashboard browser | **72 role/state/viewport renderings passed**; Phase 3 metrics, permissions, empty states and navigation preserved. |
| Navigation, workspace navigation, dashboard and branding script regressions | All four script files passed. |
| TypeScript | `npm run typecheck` passed. |
| Affected-file ESLint | Zero errors; six existing unused-import/helper warnings on Invoices list. New/changed form, action, service and Quick Add files lint clean. |
| Local production build | Passed. Sandbox initially blocked Turbopack's worker port; permitted local build succeeded. No deployment. |
| Diff whitespace | `git diff --check` passed. |

Database verification used a fresh password-protected PostgreSQL 16 cluster bound only to numeric loopback, with a disposable `coreops_auth_rehearsal_market_creation_261121` database. The existing **38-migration chain** was applied there unchanged. The private test cluster was stopped afterward. No existing local/staging/preview/production database was altered. Fixtures do not disable the immutable financial-period constraints: a disposable period fixture was replaced to establish after-grace state. Early fixture attempts were rejected by those guards and corrected.

Useful repeat commands with Node 22 and an **already migrated disposable named rehearsal database** supplied securely by the existing rehearsal runner:

```bash
node --test --test-concurrency=1 tests/creation.integration.cjs tests/authorization.integration.cjs
WORKFLOWCONNECT_TEST_CHROME=/bin/google-chrome node tests/creation.browser.cjs
WORKFLOWCONNECT_TEST_CHROME=/bin/google-chrome node tests/workspace-shell.browser.cjs
WORKFLOWCONNECT_TEST_CHROME=/bin/google-chrome node tests/workspace-theme.browser.cjs
WORKFLOWCONNECT_TEST_CHROME=/bin/google-chrome node tests/dashboard.browser.cjs
node --test tests/navigation.test.cjs tests/workspace-navigation.test.cjs tests/dashboard.test.cjs tests/brand-experience.test.cjs
npm run typecheck
npm run build
```

Do not point the database tests at `.env`'s ordinary target. The temporary local harness created its own isolated credentials/target and overrode the child connection, then stopped it. Browser fixtures perform no Clerk, provider or database calls; database tests substitute identity/request boundaries. This is not a deployed signed-in Next/Clerk acceptance result.

Screenshots were captured with synthetic fixtures and visually inspected. Representative files:

- [Client, 320px](/tmp/workflowconnect-creation-client-320.png)
- [Project, 390px](/tmp/workflowconnect-creation-project-390.png)
- [Task, 390px](/tmp/workflowconnect-creation-task-390.png)
- [Invoice, 390px](/tmp/workflowconnect-creation-invoice-390.png)
- [Task, desktop](/tmp/workflowconnect-creation-task-1440.png)

Additional captures are `/tmp/workflowconnect-creation-{client,project,task,invoice}-*.png`; logs use `/tmp/workflowconnect-creation-{authorization,browser,shell,theme,dashboard,units,types,lint,final-lint,build,migrations}.log`. Temporary evidence is not durable release custody.

Remaining limits: native iOS/Android keyboards were not used; reduced browser viewport height approximates available space. The original reported overflow was not reproduced in the baseline fixture. Selectors currently load minimal workspace-wide option lists and need a separately reviewed search/pagination approach for very large tenants. No durable request-idempotency or invoice-number uniqueness model was introduced; ambiguous network failures advise checking for an already saved record before retry. Existing invoice rounding/date UX/financial architecture findings are not declared closed. Client creation in the integrated project flow is intentionally a separately saved record with explicit recovery.

## E. Read-only Pass 2 handoff

Invitation inspection: `memberships.service.ts` generates a high-entropy token, stores its hash, sets seven-day expiry, revokes prior pending invitations on reissue, and enforces Owner permission/capacity. Acceptance binds a live verified Clerk identity/email, checks expiry/status/replay, locks the workspace and retains commercial/member safeguards. `features/memberships/actions.ts` returns a central invitation URL; do not equate generating a link with confirmed email delivery. Next pass should review recipient guidance, sign-in/continuation, already-member/suspended/expired/revoked outcomes, safe link custody and meaningful capacity errors without weakening checks or enabling sending.

Activity inspection: `activity.service.ts` requires Owner `audit:read` and returns the latest **100** events ordered only by `createdAt DESC`. It has no cursor/page contract or total-count query. The current Activity summary explicitly counts the displayed window. A later pagination design should use a stable timestamp-plus-ID order, scoped/validated cursors and bounded pages; define concurrent-insert behavior and keep summary scope truthful. Preserve resource scoping and avoid exposing audit metadata/actors or adding read-audit guarantees implicitly. No invitation or Activity implementation was changed.

Stop for Phase 4A review. No commit, push, deployment, Vercel alias operation or environment change occurred.
