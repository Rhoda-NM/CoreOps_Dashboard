# Workspace authorization implementation

Implemented 5 November 2026. This document records the tenant authorization change; the broader launch-readiness checklist still applies.

Milestone 2 follow-up: [acceptance and stabilization report](milestone-2-acceptance.md). Demo/pricing lint errors have been resolved and automated data/SSR checks expanded. Real signed-in browser acceptance remains blocked by the unavailable browser connection. Verification notes below retain the original implementation-stage evidence.

Authentication finalization follow-up: see [Clerk configuration, draft legal integration, recovery, and verification evidence](clerk-auth-finalization.md). The workspace permission matrix remains unchanged.

Commercial lifecycle follow-up (6 November 2026): [subscription and platform implementation](subscription-platform-implementation.md) adds server-side activation, paid-period, feature and seat checks alongside the unchanged workspace permission matrix. New workspaces are PENDING_ACTIVATION, not automatic trials. The older trial/subscription notes below describe the earlier implementation, not the proposed commercial rollout. These new migrations have only been rehearsed on an isolated restored database; the legacy tenant transition still requires a decision.

## Identity and tenant boundaries

A User is one global Clerk-linked identity. A Workspace is one business. A WorkspaceMember is that user's role, job title, and active/suspended status in that business. ProjectMember and task assignee IDs refer to workspace memberships, never to global users. No DEVELOPER or PLATFORM_ADMIN role was added to the workspace role enum.

| Capability | OWNER | MANAGER | STAFF |
| --- | --- | --- | --- |
| Client records and contacts | Yes | Yes | No; only client names attached to authorized work |
| Project list/details | All in workspace | All in workspace | Assigned projects only |
| Project budgets | Yes | Yes | Excluded from service selection |
| Create/edit projects | Yes | Yes | No |
| Read tasks | All in workspace | All in workspace | Assigned tasks and explicit team-visible tasks in assigned projects |
| Update task title, description, progress | Yes | Yes | Individually assigned tasks in assigned projects |
| Assign project members/tasks, team visibility | Yes | Yes | No |
| Invoices and financial dashboard values | Yes | No | No |
| Invitations, membership/role/status administration | Yes | No | No |
| Workspace name, subscription record, audit timeline | Yes | No | No |

Permissions are centralized in `src/server/authorization/permissions.ts`; unspecified permissions are denied. Job titles do not confer authority. Staff cannot update a team-visible task simply because it is visible.

## Requests and navigation

Canonical business URLs are `/w/[workspaceSlug]/…`. The proxy strips any client-provided workspace context header and derives a fresh context from the URL. Services verify the signed-in user's ACTIVE membership for that workspace. The slug and selection cookie never confer authority.

`/dashboard` automatically redirects when exactly one active membership exists and shows choices for multiple memberships. The switcher is rendered only for multiple active memberships. Explicit selection stores a server-managed cookie used only by old bookmarks. Existing `/clients`, `/projects`, `/tasks`, `/invoices`, `/settings`, and `/activity` bookmarks redirect to a verified selected workspace; users with multiple memberships and no selection see the selector. Business pages, filters, mutation redirects, and cache invalidation retain their workspace prefix. Different tabs use their own URL contexts for operations.

New users still create their first workspace through onboarding. Creating a client, project, task, or invoice never creates a workspace. Additional workspace memberships are acquired through invitations. An existing member is not automatically provisioned with another business through onboarding.

## Data and concurrent writes

Project, Task, and Invoice workspace IDs are required. Compound foreign keys enforce same-workspace parent links and assignments. Client/project deletion is restricted when financial or project relationships must be retained. Task assignees must be active members; STAFF assignees must also be assigned to the project. Project membership cannot be removed while task assignments remain. Demoting a member to STAFF requires their assigned projects to be accessible first.

All application business, assignment, and membership mutations serialize on the workspace row, then recheck current ACTIVE membership and permissions inside the transaction. This is an intentionally simple MVP concurrency strategy; high-write workloads may later require finer-grained locks with equivalent safeguards. Scoped writes include workspace predicates. Administrative writes and audit entries commit together. The last active owner cannot be removed, suspended, or demoted through the application. Direct database administration is outside the application permission boundary.

Initial onboarding locks the User row and rechecks membership inside the creation transaction, preventing simultaneous first submissions from creating multiple workspaces. Workspace, first OWNER membership, subscription record, and initial audit entry commit atomically.

User provisioning uses the external identity as the binding and verifies Clerk's primary email before provisioning or synchronizing profile fields. Matching an existing legacy email does not automatically transfer its workspace access to a new external identity. Such collisions require an explicit verified account-linking process; no legacy identity data was rebound in this migration.

## Invitations and subscription scope

Owners create private invitation links from Settings. Tokens are random, expire after seven days, and are stored only as hashes. Reissuing revokes prior pending links for that email in that workspace. Acceptance checks fresh verified Clerk email ownership, locks the workspace, and derives the role from the stored invitation. A replay cannot create duplicate memberships or change an existing member's role. Suspended members cannot reactivate themselves through an invitation. Owners can revoke pending invitations.

Email is not sent automatically: the owner copies and shares the private link. No outbound messaging integration was added.

Subscription is a separate one-per-workspace model, with plan/status and optional provider identifiers. New workspaces start with a STARTER/TRIALING record. Existing workspaces without a subscription remain explicitly unconfigured, rather than inventing historical billing state. Payment collection, plan limits, entitlement enforcement, platform administration, and exceptional support access remain future work. A workspace owner is not a platform administrator.

## Migration evidence

1. Pre-migration custom PostgreSQL backup created and archive inspected: `/tmp/coreops-before-authorization.dump` on the host and inside `core_ops_db`. The host file is restricted to its owner. Move it to durable protected storage if needed; `/tmp` is temporary.
2. Read-only `prisma/audit-workspace-scope.sql` passed: all ten problem counts were zero; no orphan IDs were returned.
3. Backup restored into isolated `coreops_auth_rehearsal_20261105`; staged migrations applied successfully there.
4. The same two migrations applied to local `core_ops_db`; Prisma schema diff reported **No difference detected**.

The first migration rejects conflicting ownership before repairing null IDs from verified parents. It never assigns records to a default business. The second adds tenant constraints, membership lifecycle, assignments, invitations, subscription schema, and audit logs. The standalone backfill entry point delegates to the same checked SQL so it works with both old and new generated Prisma types.

No production database or deployment was changed. Do not edit already-applied migrations. For another environment, take a backup, audit, rehearse against its data, then run the pinned Prisma version's `migrate deploy` command. Prefer a forward fix; restoring a backup after new writes can lose those writes and requires a separate recovery decision.

## Verification and remaining boundaries

`npm run typecheck` validates generated Next route types and TypeScript. `npm run build` validates the production bundle. New authorization code and test harnesses have a focused ESLint check. Full-project lint still has pre-existing errors in demo/pricing pages; they are not authorization changes.

The automated suite uses real PostgreSQL for services, database constraints, concurrent role/assignment changes, invitation acceptance, audit rollback, onboarding, and identity provisioning. Clerk identity and Next request context are replaced at the test boundary; this is not an end-to-end test of Clerk or a signed-in browser session. A separate proxy test verifies forged context headers are replaced by the URL-derived workspace.

To run the suite, point `DATABASE_URL` at an isolated migrated database whose name includes `coreops_auth_rehearsal`, then run `npm run test:authorization`. The test guard rejects the normal application database. Fixture cleanup is restricted to test-created records. Do not change `.env` to production credentials for testing.

A signed-in browser acceptance pass remains necessary: one-workspace automatic entry; two-workspace switching and tabs; each role's project/task views; owner invitations and membership administration; suspension and final-owner errors. No connected browser was available in this session. Production Clerk email delivery and real invitation handoff remain unverified.

Final local results: production build and TypeScript passed; the Node runner reported 22 passing tests (including suite containers); focused lint for new authorization modules and test harnesses passed. The full-project lint failures remain in the existing demo/pricing pages. Local record counts for User, Workspace, WorkspaceMember, Client, Project, Task, and Invoice matched the restored pre-migration backup after test cleanup. HTTP smoke requests reached Clerk's development handshake (307), including protected workspace requests with forged context headers; this does not establish a completed signed-in browser flow. The temporary verification server on port 3100 was stopped afterward.

The implementation does not resolve unrelated launch blockers such as general invoice idempotency, accounting definitions, payment processing, full-project lint failures, or production backup/monitoring setup.
