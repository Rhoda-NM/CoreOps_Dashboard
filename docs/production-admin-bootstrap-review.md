# Production administrator bootstrap: review procedure

Prepared 7 November 2026. **Not approved or executed.** The existing `scripts/bootstrap-platform-admin.cjs` remains restricted to local development/rehearsal and refuses production. Do not remove its guards to bootstrap production.

A private sign-in cannot create a CoreOps User or a PlatformAdmin. A fresh production database therefore needs an explicitly reviewed operator identity-provisioning and bootstrap change. Customer sign-up is not an administrator enrollment route. A customer User that is already bound to the intended verified Clerk identity can be reused; no existing email binding can be transferred.

## Approval artifact

Before any production identity or role write, obtain explicit approval for a concrete change request containing:

- Target hosting organization, project, environment, database endpoint/name and migration version. Production must be independent of preview and local development.
- Clerk production instance and exact existing Clerk user ID, independently verified primary email, available identity (not banned/deleted/locked), enrolled MFA, recent real two-factor sign-in and tested recovery factors.
- Whether a CoreOps User already exists. A new local identity may be provisioned only by the reviewed operator job using that verified external ID; never by email matching/rebinding or a public administrator sign-up.
- Intended single `SUPER_ADMIN`, operator identity, independent reviewer, reason/change reference, execution window and explicit approval to perform the production bootstrap. No workspace membership or customer data access is granted.
- Protected backup, restore verification and recovery plan. Rollback must revoke the new role through audited maintenance; do not delete the audit trail.

## Reviewed execution contract

Prepare the privileged operator job and its exact diff for review. It must use short-lived production operator credentials and a production Clerk secret from the approved secret store, never browser input or a customer-facing route. The job must:

1. Fail unless the operator-supplied environment/database/Clerk instance match the approved artifact. Default to read-only dry run; do not add an environment-variable bypass to the development CLI.
2. Fetch the existing Clerk identity freshly, verify primary email ownership and MFA, and stop on provider failures, missing second-factor evidence, unavailable identity, or any binding/email collision. Verify real-session MFA separately; enrollment alone is not sufficient.
3. Lock the PlatformAdmin table for the initial bootstrap and lock/check the relevant local identity. Require an empty administrator table. Never silently add or elevate a later administrator as an initial bootstrap retry.
4. Provision or reuse exactly the approved global User binding. Do not create any Workspace or WorkspaceMember and do not merge or rebind identities.
5. Create the initial SUPER_ADMIN and `INITIAL_SUPER_ADMIN_BOOTSTRAPPED` audit event atomically; include operator/reviewer/change-reference evidence and the target identity binding. The initial event may reference the newly created administrator as its actor, with the independently approved operator evidence recorded in metadata.
6. Return a non-sensitive change receipt and verify that public sign-in still cannot create an admin and that a non-admin Clerk identity is denied. Complete real two-factor sign-in at `/platform/sign-in` before using administrative actions.
7. Remove operator credentials and record execution evidence, reviewer and date. Establish a second reviewed recovery/grant/revocation procedure; do not use workspace roles as a platform-admin backdoor.

This is a procedure and execution contract, not an approved production mutation script. Creating/reviewing the concrete job is the final prerequisite before requesting approval to run it. No production bootstrap identity has been selected, and no production role has been granted.
