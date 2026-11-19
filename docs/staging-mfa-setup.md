# Complete staging setup with your existing Clerk authenticator

19 November 2026. Focused operator handoff; no new MFA provider, administrator, database table or migration. Production remains prohibited. The normal platform authorization path and its strict MFA requirement remain intact.

The protected operator environment and approved manifest are:

- `~/.config/workflowconnect/staging/operator.env`
- `~/.config/workflowconnect/staging/setup-approved.json`

A read-only preflight with these files passed during this implementation. It found the existing authorized administrator and required migration; **StagingEnvironment did not yet exist**. No setup write occurred. This explains why normal platform entry cannot be used to authorize the initial setup: normal entry requires that registry row. The setup-only mode below validates the configured staging identity and the existing live-verified SUPER_ADMIN without granting ordinary platform access before initialization.

## Procedure

This procedure requires the reviewed workflow release on the existing trusted **Preview/staging** alias. Do not promote it to Production. The browser page must be served by that configured staging deployment, not a locally spoofed Vercel environment. Use the existing Node 22 toolchain.

In a terminal at the repository root, run:

```bash
umask 077
STAGING_HANDOFF_DIR=$(mktemp -d /tmp/workflowconnect-setup.XXXXXX)
node --env-file="$HOME/.config/workflowconnect/staging/operator.env" \
  scripts/staging-setup.cjs \
  --manifest "$HOME/.config/workflowconnect/staging/setup-approved.json" \
  --prepare-authorization "$STAGING_HANDOFF_DIR/staging-setup.request.json" \
  --report "$STAGING_HANDOFF_DIR/preflight.json"
```

This is read-only on the existing staging database. It creates an ephemeral RSA private key and a public request in your private local directory, prints the **nonsecret request fingerprint**, and prints the exact staging `/platform/verify?setup=1` URL. It does not create a role or workspace. The request lasts at most ten minutes and cannot outlive the manifest's approval window. If the manifest window has expired, obtain the operator's reviewed extension; no script extends approval automatically.

In the **same terminal**, start the waiting command before approving in the browser:

```bash
node --env-file="$HOME/.config/workflowconnect/staging/operator.env" \
  scripts/staging-setup.cjs \
  --manifest "$HOME/.config/workflowconnect/staging/setup-approved.json" \
  --apply \
  --authorization-request "$STAGING_HANDOFF_DIR/staging-setup.request.json" \
  --authorization-directory "$HOME/Downloads" \
  --wait \
  --report "$STAGING_HANDOFF_DIR/result.json"
```

If your browser saves downloads elsewhere, replace `$HOME/Downloads` with that directory. The CLI waits for the exact request-specific filename, not any arbitrary recent download.

Then:

1. Open the URL printed by preparation. Sign in using the **existing** administrator if necessary. The fixed setup sign-in continuation returns to this mode; it cannot select an arbitrary return URL.
2. Upload only `staging-setup.request.json`. **Never upload the adjacent `.private.json` file, an environment file, session token or credential.**
3. Review the application, project, database and approval reference; compare the full fingerprint with your terminal. Confirm the checkbox.
4. Click **Verify MFA & download authorization**. If Clerk requests reverification, enter your existing authenticator-app code in **Clerk's dialog only**. Already-fresh strict MFA may not prompt again.
5. Allow the single encrypted authorization download. The waiting terminal command consumes it immediately, authenticates the enclosed ordinary session through Clerk's supported SDK, verifies live identity/session and fresh strict MFA again, then performs the existing audited transaction.

A downloaded authorization lasts **no more than 60 seconds**, and often less because the Clerk session token or manifest can expire sooner. A near-expiry token is rejected before download; click authorize again to refresh through Clerk. If a download expires or the command fails after consuming its private key, start with a new private directory/request. Do not copy old private keys, delete consumption markers or extend timestamps.

## What successful completion looks like

The script writes its private result, prints `STAGING_SETUP_REPORT_WRITTEN`, and automatically runs `scripts/staging-readiness.cjs` against the same reviewed environment. The readiness JSON should report:

- `persistentEnvironmentValidated: true`
- `deploymentSpecificAdmissionRequired: false`
- `catalogMatches: true`
- `syntheticNonVatScenario: true`
- `checkoutConfigured: true`
- `testMerchantRegistered: true`
- An existing active SUPER_ADMIN count greater than zero.

Setup creates the persistent environment, approved pricing versions, synthetic non-VAT scenario and atomic audit evidence. It **does not** register a Paystack merchant, create a User/administrator/workspace, send messages, publish legal terms or perform a payment. A missing merchant or disabled checkout remains an independent readiness blocker; verify it through the existing strict-MFA merchant process. No merchant approval is fabricated.

If setup commits but readiness is incomplete, the script prints `STAGING_SETUP_COMMITTED_READINESS_INCOMPLETE`. Do not reset the database or recreate the administrator. Resolve the reported configuration/merchant blocker and rerun the read-only check:

```bash
node --env-file="$HOME/.config/workflowconnect/staging/operator.env" \
  scripts/staging-readiness.cjs
```

Only after readiness passes, proceed with synthetic customer registration and a real Paystack **Test Mode** subscription transaction. Readiness does not prove payment acceptance or authorize Live Mode.

## Security and preservation

- Uses the installed Clerk `useReverification`, `reverificationError("strict_mfa")`, ordinary session `getToken` and backend `authenticateRequest`. No custom OTP verification or new MFA enrollment. [Clerk reverification](https://clerk.com/docs/guides/secure/reverification), [SDK Auth object](https://clerk.com/docs/reference/backend/types/auth-object).
- The server obtains the ordinary Clerk session internally and seals it to the request's ephemeral RSA-3072 public key using RSA-OAEP/SHA-256 plus AES-256-GCM. The browser receives only encrypted bytes; it never extracts a JWT from developer tools. This encryption is transport protection, **not** a replacement for Clerk verification.
- Bound to exact approved-manifest content, staging ID/project/branch/origin/database/Clerk instance, nonce, request hash and local private key. The operator's independent Vercel target checks are preserved.
- The private key is mode 0600, outside the repository under a mode-0700 directory. Exclusive consumption rejects concurrent use/replay; the private key is removed after a consumption attempt. Removal is not a claim of forensic secure erasure from storage/backups. Do not back up or share temporary authorization material.
- No session token or TOTP code is stored in database evidence, URLs, Git, command arguments, terminal history or ordinary logs. No raw-token file flag is accepted. Logs use closed phase codes; final audit records only hashes, request ID, expiry and reviewed evidence references.
- Existing active SUPER_ADMIN is rechecked; suspended/inactive/other-role identities, missing enrollment, revoked sessions, missing factors, stale MFA, wrong targets and changed manifests fail closed. No administrator bootstrap is invoked.
- Final transaction preserves versioned pricing/financial history, idempotency and audit; authority expiry is checked both before writes and before commit. The existing operator-supplied preflight timeout change is preserved, with a bounded matching apply transaction timeout.
- Normal platform pages continue to require the established environment registry. The setup-only path releases no platform data and can only produce an encrypted handoff for the reviewed external command.

## Verification boundary

The actual target preflight is read-only. Automated tests cover encryption/tampering, exact target/manifest binding, expiry, private-file permissions, concurrent consumption/replay, stale MFA, missing enrollment/factors, wrong roles, revoked sessions, unchanged normal platform step-up and CLI initialization/idempotency/readiness using explicitly synthetic database/Clerk substitutes. The CLI test creates **no actual database or administrator** and forbids network access.

Actual browser TOTP approval, registry initialization and resulting real staging readiness remain pending until the operator performs the procedure against the reviewed Preview code. They are not represented as passing based on substituted SDK/database tests.

Final local verification: **50 tests passed** (5 handoff/bootstrap-routing, 3 staging configuration/operator proof, 13 existing platform MFA, 14 routing, 7 authentication-page, 7 account-entry and 1 CLI initialization/idempotency/readiness contract). Typecheck and production build passed; full lint has zero errors and 12 pre-existing business-page warnings. Operator and manifest permissions were confirmed private. The actual pre-setup readiness command was run read-only and exited 1, as expected while the registry row is absent; this is **not** a post-initialization readiness pass. Real TOTP approval and post-setup readiness remain pending. No actual setup transaction, role grant, migration or Production change was performed. Preview-only configuration alignment and the focused source release are described below.

## Initial-administrator routing and Preview release correction

The deployed baseline `751d596` did not contain this authorization workflow. A separate Preview inspection could not read five configuration values because they were marked sensitive: `COREOPS_ENVIRONMENT`, `COREOPS_STAGING_ENABLED`, `COREOPS_STAGING_BRANCH`, `COREOPS_STAGING_DATABASE_HOST` and `COREOPS_STAGING_DATABASE_NAME`. Their original values could not be certified from the API response. These existing Preview-only entries were aligned to the approved operator values, preserving their sensitive type. The required database name is **neondb**; Production/shared rows were not changed. The setup sign-in page exposes only a generic target-verified indication after validating runtime configuration and PostgreSQL current_database(), not credential values.

Before the first registry row exists, the existing verified administrator's ordinary dashboard, platform sign-in, platform layout and verification entry now redirect to `/platform/verify?setup=1`. This requires the configured staging identity, the actual PostgreSQL `current_database()`, the existing active nonsuspended SUPER_ADMIN, verified live Clerk development identity/session and existing MFA enrollment. Stale MFA permits only opening the setup form; Clerk strict MFA remains mandatory to release an encrypted authorization. Other users, mismatched databases and Production do not receive this routing exception. Normal `platformEntry()` and customer authorization retain the registry guard.

Each initial-setup handoff additionally binds the exact reviewed Git revision obtained independently through the operator's Vercel API inspection to Vercel's runtime-provided commit SHA. A deployment change requires a fresh setup request, not a new persistent staging admission. The revision is included in setup audit evidence. No Vercel runtime marker is manually set or cleared.

The project uses `main` as its Production branch. The safe release procedure is a source-file Preview deployment using the REST API’s explicit built-in `staging` target (not Production and not a custom environment) of the exact local committed tree, with truthful Git metadata, followed by assigning only the existing approved Preview branch alias after READY/commit/project verification. Do not push `main`, promote a deployment, or modify Production settings to release this fix. The final release ID and stable-alias verification are recorded in the delivery response and protected operator evidence.
