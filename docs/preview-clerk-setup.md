# Isolated Clerk configuration and HTTPS Preview acceptance

8 November 2026. **Preparation and configuration diagnostics completed; isolated application setup, legal approval and authenticated acceptance remain pending.** Registration safeguards remain enabled. No Clerk settings, Vercel environment values, database records, credentials or deployments were changed. The operator uses a different Vercel account; the connected Vercel account was not used.

## Observed configuration

A read-only request to the public environment endpoint of the **existing local development instance**, `vital-octopus-83.clerk.accounts.dev`, found:

| Setting | Observed | Required outcome |
| --- | --- | --- |
| Display name | My Application | WorkflowConnect |
| Google | Enabled; actual scopes not exposed | Inspect actual scope request and consent UI |
| Support address | Not configured in Clerk | info@stravectsystems.com, matching application configuration |
| Terms/Privacy URLs | Both absent in Clerk | Exact approved document URLs, matching application configuration |
| Express legal consent | Disabled | Enable only after document approval, for email and OAuth registration |
| Self-service deletion | Enabled | Disable at instance level; retain verified ownership-transfer/deletion process |
| Verified email at sign-up | Enabled | Retain and test ownership challenges |
| Password | Enabled | Retain for the intended email/password and password-recovery tests |
| Authenticator app / backup codes | Disabled / disabled | Configure MFA and recovery for the intended test plan |
| CAPTCHA | Enabled | Retain |
| Registration requirements | Not satisfied | Resolve the listed requirements; never override them to make a test pass |

This is **not** proof that the application's keys are currently deployed to Preview or that a new isolated instance exists. No secret key or user record was requested by the inspector.

The Preview URL from the previous screenshot, `https://workflow-connect-git-main-stravect-systems-90ef5233.vercel.app`, returned HTTP 302 to `vercel.com` for `/sign-in`, `/sign-up`, `/terms` and `/privacy`. This is a deployment-protection boundary, not a Clerk authentication result. The exact current URL must be confirmed by the operator. No Vercel protection was disabled or bypassed.

Browser inventory contained only the in-app browser, with no connected regular Chrome/Edge session. Clerk's Google setup documentation says Google OAuth is not supported in in-app browsers. Complete Google acceptance in a regular browser; do not count an in-app-browser rejection as an application account-linking defect.

## 1. Create the isolated application

In the operator's Clerk account, create a **separate application** for Preview testing, rather than reusing the main application's identities. Use its **Development** instance with the paired `pk_test_…` publishable key and `sk_test_…` secret key. Do not paste either key into chat; the secret belongs only in Preview secrets. No production key is needed for ordinary `.vercel.app` preview testing.

Set the user-facing application name to **WorkflowConnect**, exactly, because the readiness check compares this value. Distinguish the separate Preview application through its recorded application/instance IDs and Frontend API hostname in the operator inventory. If the dashboard has an independent internal label, it may identify Preview, but a user-facing name of “WorkflowConnect Preview” will not pass the current exact branding check.

Record the new application's Frontend API hostname, application/instance IDs, owner and purpose. Keep the existing local and production application's keys and user stores separate. Before switching Preview keys, check whether its database already contains identities from another Clerk instance. Do not merge/rebind those users by matching email; decide how to preserve test data or use an explicitly approved clean Preview branch.

Clerk supports separate application data for independent previews, and recommends development keys on host-provided preview domains. Production Clerk keys are not supported on ordinary `.vercel.app` preview domains. These development-session tests do not establish production subdomain-cookie behavior. [Clerk environment guidance](https://clerk.com/docs/guides/development/managing-environments).

## 2. Configure authentication and branding

Use Clerk's supported Dashboard controls and prebuilt flows:

- Set display name **WorkflowConnect**, the correct product logo, and support/recovery address **info@stravectsystems.com**. Inspect the actual form and outgoing test emails; CSS changes do not correct provider branding.
- Enable email and the intended password flow. Require email verification. Keep password protection, CAPTCHA and abuse controls enabled.
- Configure Google for sign-in/sign-up with only identity permissions. Development shared OAuth credentials can test the flow but do not prove production Google branding. For a dedicated Google test OAuth client, use its own credentials and the **exact Clerk-provided redirect URI**, restrict its audience to the intended testers, and review its actual consent screen. Do not add Gmail, Drive, contacts or Calendar access. [Google connection setup](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google).
- Keep self-service account deletion disabled at the instance level and check any per-user exceptions. Do not weaken the last-owner protection to expose account settings.
- Enable authenticator-app MFA and available backup/recovery options for MFA acceptance. Users enter and keep their own enrollment/recovery secrets; never put them in reports or chat.
- Align Clerk's application paths with the exact stable Preview origin: `/sign-in`, `/sign-up`, `/account`, with completion handled by the application's central continuation flows. Preserve invitation and workspace return intent. No wildcard redirect trust, satellite workaround, custom password handling or broad Server Action origin exception is required for this path-based preview.

Keep provider-side public registration restricted while legal approval is unresolved. Hiding the Next.js SignUp page alone is insufficient: Google SignIn may start a new Clerk registration. Do not disable legal checks, mark a user accepted through an API, backdate approval or invent a receipt.

## 3. Resolve legal content before enabling consent

The checked-in `/terms` and `/privacy` pages remain drafts. They contain explicit unresolved sections and provisional content; flipping environment flags cannot turn these into approved documents.

The operator's legal/business review needs to settle and provide approved text for:

| Topic | Decision/text still required |
| --- | --- |
| Provider and eligibility | Legal service-provider identity and contact details; intended customer/user eligibility |
| Contract terms | Governing law, disputes, licensing, liability, suspension/termination and notice rules |
| Commercial terms | Activation/manual payment process, billing intervals, renewals, grace/read-only rules, cancellation/refunds and approved limits |
| Data responsibilities | Workspace/customer versus platform responsibilities and any required processing agreement |
| Processing inventory | Actual subprocessors, locations, purposes, contracts and transfers; distinguish prepared services from enabled services |
| Retention and recovery | Account/workspace/audit/payment/backups retention, deletion, exports and recovery procedures |
| Rights and contacts | Applicable requests, verification, business administrator handling and complaint channels |
| Versioning | Approved Terms/Privacy URLs, version labels and effective timestamps; immutable approved content archive and approval record |

This is an approval checklist, not a legal opinion or claim of compliance. Approved documents must replace the draft text, not merely hide its badge. Final legal URLs must be accessible to users without Vercel team authentication; use an approved public legal-document location instead of disabling protection across Preview. Keep corresponding application legal pages consistent with those approved versions. The earlier `coreops.studio` URLs and `COREOPS-*-v1.0` labels are provisional; do not silently replace or treat them as approved.

After the operator supplies approved documents and effective dates, configure those **exact** URLs in Clerk and the Preview environment. Then enable **Require express consent to legal documents** in Clerk. Its prebuilt flow prompts OAuth users on return before sign-up completion; verify this in the browser. The application also records its explicit versioned acknowledgment. Marketing consent remains separate and optional. [Clerk legal consent](https://clerk.com/docs/guides/secure/legal-compliance).

## 4. Set Preview values through the operator's Vercel account

Use Preview scope only. Set the paired new test keys, exact path-mode origins/hostname allowlist, support email and approved legal configuration. The existing [preview template](phase5-staging.env.example) supplies routing and disabled-payment defaults; it deliberately does not supply approval or credentials.

```dotenv
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<new isolated instance public test key>
CLERK_SECRET_KEY=<matching isolated instance secret test key>
COREOPS_ROUTING_MODE=path
COREOPS_ENVIRONMENT=preview
COREOPS_APP_ORIGIN=https://EXACT-PREVIEW.vercel.app
COREOPS_MARKETING_ORIGIN=https://EXACT-PREVIEW.vercel.app
COREOPS_PREVIEW_HOSTS=EXACT-PREVIEW.vercel.app
COREOPS_SUPPORT_EMAIL=info@stravectsystems.com
COREOPS_PUBLIC_INDEXING_ENABLED=false
PAYSTACK_TEST_CHECKOUT_ENABLED=false
PAYSTACK_LIVE_CHECKOUT_ENABLED=false

# Supply approved values only after content review and publication:
COREOPS_TERMS_URL=<approved accessible HTTPS Terms URL>
COREOPS_PRIVACY_URL=<approved accessible HTTPS Privacy URL>
COREOPS_TERMS_VERSION=<approved Terms version>
COREOPS_PRIVACY_VERSION=<approved Privacy version>
COREOPS_TERMS_EFFECTIVE_AT=<approved ISO timestamp with timezone>
COREOPS_PRIVACY_EFFECTIVE_AT=<approved ISO timestamp with timezone>
# Keep false until their corresponding evidence is complete:
COREOPS_LEGAL_DOCUMENTS_APPROVED=false
COREOPS_GOOGLE_IDENTITY_SCOPES_REVIEWED=false
```

Do not manually override `NODE_ENV` or `VERCEL_ENV`. Vercel Preview runs a production build, so the production registration prerequisites apply. `COREOPS_REQUIRE_LEGAL_ACCEPTANCE=false` does not bypass them. Keep the Preview-only Neon database attached; no database migration or reset is part of this authentication setup.

After entering the actual reviewed values, redeploy Preview so the client receives the new publishable key. Verify the deployed Frontend API hostname against the recorded isolated instance, and verify matching secret-key/instance configuration without printing either key. No secret was inspected or matched during the preparation recorded here.

## 5. Run the read-only configuration check

The inspector uses the same requirements as the server registration gate. It never changes them, requests users, reads a database, or uses a secret key. `--expected-host` rejects a mismatched development instance before any network request. Exit codes: `0` means the configuration requirements match, `2` means requirements are unmet, `1` means the inspector could not complete. A passing configuration check is not browser acceptance or independent proof of legal approval/scope review.

Load **Preview's nonsecret configuration and test publishable key** into a separate ignored file, without database credentials or the Clerk secret, then run:

```bash
node --env-file=.env.preview-auth-check scripts/inspect-clerk-auth.cjs \
  --expected-host=NEW-INSTANCE.clerk.accounts.dev
```

The example host is a placeholder, not the existing instance's hostname. Inspect the new instance, not the previous local one. Check name, support address, legal URLs/consent, self-deletion settings, verification, email/password and MFA settings against the intended configuration. Keep approval/scope flags false until their actual evidence exists. Do not post keys or unredacted OAuth requests.

## 6. Perform real acceptance in a regular browser

Authenticate to Vercel Deployment Protection using the operator's own authorized account, then use disposable identities in the isolated Clerk application. Do not disable protection. Connect that regular browser to this session if agent-driven inspection is required. The operator performs password changes and enters passwords, verification/MFA/recovery codes privately.

| Scenario | Required observation | Current result |
| --- | --- | --- |
| Email registration | Real email verification, correct branding and required approved consent; exactly one internal identity; pending onboarding only | Unverified |
| Email/password sign-in | Returning identity retains workspace memberships, roles and assignments | Unverified |
| Google registration/return | Actual identity scope list and consent branding; legal prompt on OAuth return; fresh and returning users handled | Unverified |
| Verified same-email method linking | Clerk verified linking retains the same external ID; no second internal User or transfer | Unverified |
| Unverified and legacy collisions | Ownership challenge or safe recovery path; no implicit rebinding | Unverified in browser |
| Password/account recovery | Delivered message reaches a controlled inbox; expired/used reset rejected; operator completes new password entry; roles unchanged | Unverified |
| MFA enrollment/recovery | Actual second-factor challenge, recovery behavior and freshness; no fabricated factor claims | Unverified |
| Logout and revocation | Second tab cannot perform a protected action after revocation; expired/unavailable session fails safely | Unverified |
| Invitations and return intent | Token survives sign-in/Google/consent; acceptance explicit and verified; no extra workspace created | Unverified on HTTPS Preview |
| Multi-workspace tabs | Each tab retains its URL context; no private field/resource leak through RSC/actions; pending subscriptions stay restricted | Unverified on HTTPS Preview |
| Declined/unchecked/stale legal acceptance | Registration or continuation is blocked as appropriate; only the explicitly accepted active versions get a receipt | Unverified in browser |
| Preview isolation | New test app/keys and Preview-only DB mapping independently confirmed; no production identities or records used | Unverified |

Use at least two disposable, operator-controlled identities: one real inbox for email/password and recovery, and one real Google test identity. For method-linking acceptance, use a Google inbox that you also register through Clerk email/password, then verify the two methods retain one Clerk identity and one internal User. Workspace OWNER/MANAGER/STAFF roles stay in WorkspaceMember, not in Clerk metadata or a replacement organization model. No test identities or passwords were created during this preparation.

Use real controlled inboxes to test delivered email/recovery. Clerk's `+clerk_test` addresses use simulated verification and do not receive mail in test mode, so they cannot establish delivery. Do not disable security checks to simulate acceptance. [Clerk test-email guidance](https://clerk.com/docs/guides/development/testing/test-emails-and-phones).

Evidence should record deployment/commit, nonsecret Clerk hostname/instance identifiers, browser, disposable actor reference, timestamps, redacted screenshots/request results and record counts. Do not store passwords, session cookies, authorization codes, OAuth state/nonce, verification/MFA/recovery codes or invitation tokens.

## Current code verification

The shared evaluator preserves all existing server requirements and the development/production distinction. It adds detailed operator diagnostics, not a bypass. Configuration tests cover each unmet requirement and expected-host rejection; navigation tests preserve existing continuation behavior. Actual setup and browser results must be added only after access, documents and configuration are supplied.


| Local verification | Result |
| --- | --- |
| Auth configuration and diagnostic tests | 3 passed, with fixture provider responses; includes all ten readiness requirements and wrong-instance/no-secret output behavior |
| Navigation tests | 4 passed; existing sign-in/sign-up and invitation/continuation behavior retained |
| TypeScript / Next route types | Passed |
| Focused lint | Passed |
| Production build | Passed locally; no deployment |
| Real public Clerk configuration | Existing local instance inspected; deficiencies recorded above, not repaired or relabeled as an isolated instance |
| HTTPS Preview | Four public probes reached Vercel protection (302); no signed-in acceptance established |
| Real email, Google, recovery, MFA and sessions | Not performed; require operator access, approved documents and disposable identities |

An initial child-process test could not launch under the local subprocess restriction (EPERM); the same fixture-only test passed with subprocess execution permitted. No security setting was changed to satisfy it. Temporary local evidence: `/tmp/workflowconnect-preview-clerk-{tests,types,lint,navigation,build}.log` and `/tmp/workflowconnect-preview-clerk-current-instance.json` (public configuration only). Preserve needed evidence durably before rollout.
