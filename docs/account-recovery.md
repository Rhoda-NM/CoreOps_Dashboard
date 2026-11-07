# CoreOps account collision, recovery, and deletion runbook

Status: operational procedure requiring verified human review. No automatic user merge, workspace transfer, or external-ID rebinding endpoint is provided.

## User-facing recovery

1. Direct the person to `/sign-in` and their original authentication method. Password recovery and provider ownership challenges remain Clerk-managed.
2. If the person can sign in to the original Clerk account, use its supported verified connected-method flow. Confirm the Clerk ID remains the same; CoreOps should retain its internal user ID, memberships, roles and assignments.
3. If CoreOps cannot provision safely, use authenticated `/account/recovery`. Public `/auth-help` gives general instructions without checking whether an email belongs to an account.
4. Refer unresolved cases to info@stravectsystems.com. Never request passwords, one-time codes, cookies, Google tokens, MFA recovery codes or unredacted session material.

## Operator review of a legacy or conflicting binding

- Open a case and record the verified requester, authorized operator, affected environments and explicit scope. Do not use an unauthenticated email claim as proof of business ownership.
- Verify control through supported authentication to the original identity wherever possible. Check relevant workspace authority and historical evidence. A newly verified email may have been recycled and does not by itself authorize taking over an older workspace.
- Read the current external binding and membership graph without changing them. Classify the issue: missing local provisioning, legacy null binding, another active Clerk identity, email change conflict, suspended membership, revoked session, or deleted provider identity.
- Prefer resolving/linking the authentication methods inside the original Clerk account. A suspended workspace membership is an access decision, not a reason to rebind an account.
- If an exceptional binding correction is necessary, prepare the exact before/after identity mapping, ownership evidence, preserved memberships and assignment counts, backup, reversal plan, and audit entry for explicit approval. Do not execute based solely on this runbook. Do not transfer an already-bound identity without verified authorization.
- Under the approved controlled procedure, recheck uniqueness, external identity, email verification and every affected workspace. Use transactional conditional updates against the reviewed old value; abort if anything changed. Record who approved and executed the correction without storing credentials.
- Verify the original internal ID, roles, assignments and tenant isolation after the approved change. Notify the verified affected parties through the established support process. Do not reveal another account's identifiers to an unverified requester.

## Account deletion and the final owner

- Disable self-service deletion at the Clerk instance level and review user overrides before launch. Blocking the delete button in CoreOps is not equivalent to blocking the provider API.
- No CoreOps self-service deletion endpoint is implemented. A provider administrator can still delete accounts, so restrict dashboard/API privileges and require this runbook.
- Before any authorized deletion, examine **all** workspaces for the user. Transfer ownership to a verified active owner wherever necessary using the existing last-owner-protected membership services. Resolve task assignments and membership responsibilities explicitly.
- Establish a controlled change window so promotions or membership changes cannot race the deletion review. Prepare the reviewed account scope, data retention/export/deletion decisions, audit evidence and explicit approval. External provider deletion and database changes are not one atomic transaction.
- Never blindly cascade a Clerk user.deleted event into deleting the CoreOps User, memberships or business data. Current synchronous identity/session checks deny a deleted identity while preserving local records for controlled recovery.
- Handle workspace business data separately from a person's identity. Apply the final approved retention policy and applicable rights/recordkeeping requirements, including backups and legal receipts; do not invent a deletion deadline from this draft procedure.
