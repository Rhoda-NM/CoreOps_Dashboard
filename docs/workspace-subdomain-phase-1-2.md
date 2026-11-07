# Workspace subdomains — Phase 1 and 2 review


7 November Phase 4 follow-up: [navigation, account/invitation/payment continuation and metadata results](phase4-navigation-and-phase5-acceptance.md). Phase 5 HTTPS/Clerk staging acceptance is prepared and remains pending the operator’s Vercel connection; prior phase evidence below is historical.

7 November follow-up: [Selected Slugs and Phase 3 implementation report](selected-slugs-phase-3-routing.md) supersedes the automatic-only onboarding and not-wired-to-Proxy statements below. Explicit subdomain routing is now implemented but remains off by default; the earlier evidence is retained as history.

7 November 2026. **Foundation implemented; hostname routing is not enabled.**

## Scope and rollout boundary

This change implements the host/URL policy foundation and safe automatic slug allocation from the readiness assessment. The new host helpers are deliberately **not wired into Proxy** yet. Current `/w/[slug]` navigation, existing Clerk configuration, membership/role/assignment guards, subscription restrictions, and private administration continue to operate as before. Phase 3 rewrites and later navigation/authentication changes require the next reviewed change.

No `.env`, Vercel, DNS, Clerk, production database, Prisma schema, migration or deployment changes were made. No administrator or paid subscription was created. Existing workspace names and slugs were not edited.

## Phase 1: host policy and URL separation

Implemented in `src/lib/routing/host-policy.ts`:

- Explicit development, preview and production policies; path mode is the default.
- Required nonlocal application/marketing origins; HTTPS outside local development. Origins cannot contain credentials, paths, queries or fragments.
- Exact apex/app classification, explicit preview-host lists, local development hosts and one-label tenant candidates.
- Case/default HTTPS port normalization. Malformed hosts, trailing dots, comma-separated authorities, invalid labels, unsupported ports, lookalike suffixes and conflicting forwarded-host values are rejected.
- Reserved infrastructure labels are not tenant candidates. A syntactically valid unknown slug remains only a candidate; it does not prove the workspace exists or grant authority.
- Preview cannot use subdomain mode or generate production tenant URLs; preview origins must be explicitly listed preview deployments.
- Separate `internalWorkspacePath`, `workspaceUrl`, `centralUrl`, and `marketingUrl` builders. Internal paths remain suitable for future cache invalidation; visible URLs depend on routing mode.
- `verifiedWorkspaceReturnUrl` accepts only canonical workspace URLs whose slugs are in a request-local membership list already verified by its caller. It rejects external, reserved, credential-bearing, traversal and unauthorized destinations.

These pure helpers do not read sessions or query memberships. Phase 3 must call the host policy before deriving request context, verify candidate existence/membership, strip forged context headers and use the internal route identity consistently for rewrites and pending-subscription redirects. Host classification is not authorization. Query-string values are data, not permission to redirect; downstream return destinations must pass the verified return helper.

The environment adapter recognizes these **new, currently unused** settings:

| Setting | Meaning |
| --- | --- |
| `COREOPS_ROUTING_MODE` | `path` (default) or explicitly configured `subdomain` |
| `COREOPS_APP_ORIGIN` | Exact account/authentication/platform origin |
| `COREOPS_MARKETING_ORIGIN` | Exact public marketing origin |
| `COREOPS_TENANT_ROOT_DOMAIN` | Validated domain for one-level tenant labels |
| `COREOPS_PREVIEW_HOSTS` | Comma-separated explicit preview deployment hostnames; not a wildcard |

In a future approved subdomain environment, the configured app/apex origins must be `https://app.<root>` and `https://<root>`. No inferred host or request Origin can set these values. Standard localhost development defaults to `http://localhost:3000` path mode. Local aliases/ports and production-style HTTPS staging need explicit configuration and testing; these helpers do not configure DNS.

## Phase 2: bounded, retry-safe slug allocation

Shared validation/auditing is in `src/lib/routing/workspace-slug.ts`. Initial creation is in `src/server/services/workspace-onboarding.service.ts`, called by the existing onboarding action.

- Keep automatically generated immutable slugs; no new editable-address field or availability endpoint.
- Normalize a business name to lowercase ASCII words and hyphens. Non-Latin-only names use `workspace` as the address base while retaining the business display name.
- Bound the base to 54 characters and append an eight-character random hexadecimal suffix, keeping the complete DNS label at most 63 characters.
- Reject malformed, reserved and unsupported `xn--` labels. A business can be named “App”; its generated `app-<suffix>` address does not claim reserved `app`.
- Business names are server-validated at 2–120 characters, matching the existing rename limit; the form now has the same maximum length.
- Database slug uniqueness remains authoritative. On a slug-only uniqueness violation, retry the complete transaction, up to five attempts. Other uniqueness errors are not treated as slug collisions.
- Support Prisma 7 PostgreSQL adapter constraint metadata, as well as the older target metadata shape.
- Retain User-row locking and ACTIVE-membership rechecks. A repeated/concurrent first submission returns the existing workspace rather than creating another tenant.
- Pending workspace, pending subscription, OWNER membership and initial audit entry still commit together. No trial or business access is granted.
- Identity/recovery redirects remain outside the database-error boundary. Error output no longer prints complete database/provider payloads.

The existing database slug unique index remains in use. Nullability/canonical-format database constraints were not migrated. The app allocator now enforces the policy for new workspaces; direct database administration remains outside that boundary. Before a later production rollout, audit each target database, then separately review any required forward constraints. Customer-selected slugs, renaming/reuse, aliases and custom domains remain unimplemented decisions.

## Verification

| Check | Result and limit |
| --- | --- |
| Host/URL/slug unit program | 8 passing tests: host classes, malformed/forwarded headers, preview isolation, configuration, safe builders/returns, bounded allocation and nonmutating audits |
| Real PostgreSQL authorization/onboarding suite | 20 passing Node tests including its container. Includes existing concurrent onboarding and two added cases for actual slug collision retry, exhausted retries, no partial membership, pending status, audit atomicity and idempotent return |
| Local slug audit | 2 existing workspaces checked, zero problems; transaction explicitly READ ONLY |
| TypeScript | Passed |
| Focused ESLint and whitespace | Passed |
| Production compilation | `npm run build` passed; no deployment |
| Signed-in/subdomain browser testing | Not performed for this phase. No hostname rewrites or production-style domain configuration were activated |

The collision tests run against `coreops_auth_rehearsal_release_20261107`, never the normal application database. Identity and Next request boundaries are substituted; PostgreSQL constraints and rollback are real. Fixture cleanup uses test-owned records. An initial collision test exposed the installed Prisma adapter's different constraint metadata; retry detection was corrected and the suite passed afterward.

Reproduction:

```bash
npm run test:host-policy
npm run audit:workspace-hostnames  # read-only; reports invalid IDs/reasons, not repairs
COREOPS_COMMERCIAL_REHEARSAL_DB=coreops_auth_rehearsal_release_20261107 \
  node --env-file=.env scripts/with-commercial-rehearsal.cjs \
  node --test --test-concurrency=1 tests/authorization.integration.cjs
npm run typecheck
```

Evidence logs: `/tmp/workflowconnect-host-onboarding-tests.log`, `/tmp/workflowconnect-routing-types.log`, `/tmp/workflowconnect-host-phases-build.log`. These are temporary local evidence, not durable rollout records.

## Next review

Review the reserved-name list, generated-suffix policy, environment-origin contract and helper APIs before Phase 3. The next phase should add the actual host-to-internal-route rewrite, candidate lookup, canonical request context, host/path mismatch denial and pending-subscription loop tests. Navigation updates and the real Clerk/DNS/MFA rollout remain later phases. No claim is made that the current live Proxy already rejects unknown hosts or restricts administrative hosts.
