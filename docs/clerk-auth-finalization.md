# CoreOps Clerk authentication finalization

Reviewed 5 November 2026. Operator: Stravect Systems. Support/recovery: info@stravectsystems.com.

**Status: local implementation and automated verification complete; provider configuration and signed-in browser acceptance remain blocked. Not approved for production launch.** The legal documents are provisional and have not been legally approved. No mandatory consent was enabled against them.

## SDK and scope of change

Installed versions inspected directly: `@clerk/nextjs` 7.5.18, `@clerk/backend` 3.11.5, and `@clerk/shared` 4.25.3. The implementation uses the installed SDK's prebuilt SignIn, SignUp, UserButton, and UserProfile components, its Core 3 `appearance.options`, supported redirect props, and server-side auth/currentUser/session APIs. ClerkProvider now sits inside body, following the Core 3 integration guidance.

CoreOps Workspace, membership roles, assignments, tenant constraints, and the permission matrix are retained. Clerk Organizations are not introduced. No provider user accounts were merged, rebound, deleted, or granted workspace access. The existing proxy matcher emits a deprecation warning in this SDK; service/resource authorization remains authoritative, and its eventual SDK migration needs separate route regression coverage. No production settings, data, or deployment were changed.

## Actual development configuration observed

Read-only inspection used the development instance's public `/v1/environment` endpoint. No user records or credentials were displayed.

| Setting | Observed result | Required action |
| --- | --- | --- |
| Environment | development | Audit production separately; no production evidence is inferred. |
| Google social login | Enabled | Confirm actual scopes and Google consent screen. |
| Google scopes | Not exposed by the public endpoint | Verify in Clerk/Google and capture the scope parameter of an actual authorization request. Do not mark reviewed based on defaults. |
| Application name | My Application | Set CoreOps in Clerk; configure CoreOps branding in the Google Cloud OAuth application used for production. |
| Email verification at signup | Enabled | Exercise Google and non-Google ownership challenges. |
| Password sign-in | Enabled | Test recovery, challenge expiry, and lockout with disposable accounts. |
| Legal express consent | Disabled | Keep disabled while documents are drafts; enable only after approval and finalized effective dates. |
| Terms / Privacy URLs | Empty | After approval, configure the production URLs below in Clerk and Google branding. |
| Support email | Not configured in Clerk | Set info@stravectsystems.com in Clerk. The local UI now uses this address. |
| Self-service deletion | Enabled | **Launch blocker:** disable at the Clerk instance level before enabling profile management. Audit user-specific overrides too. |
| Authenticator app / backup codes | Disabled | Enable available supported MFA options, then test actual enrollment, challenge and recovery. |
| CAPTCHA | Enabled | Preserve it; verify provider lockout/abuse controls and capacity limits. |

A bounded direct development OAuth-initiation inspection was attempted without signing into Google or granting permissions. It stopped at HTTP 400, so it did not establish the scope list. Temporary development-client tokens stayed in memory and were not printed or saved. No Google callback, user registration, or consent was completed. This is not a substitute for browser acceptance.

Reproduce the public configuration inspection with `npm run inspect:clerk-auth`. The script refuses live instance keys and performs no settings changes. It intentionally reports scopes as unknown.

## Implemented account experience

- Branded `/sign-in` and `/sign-up` pages explain what Google/Clerk/CoreOps receive: verified email, name, profile-image URL, and Clerk user ID. They explain that Google passwords are not shared and Gmail/Drive/contacts/Calendar access is not needed. Users are advised to cancel unrelated permission requests.
- No additional OAuth scope or Google API token retrieval was added to any application flow. Frontend SDK telemetry is disabled through the supported provider prop; the configuration example also supplies the server SDK diagnostics opt-out. Authentication/security logging is separate and remains necessary.
- Existing Clerk linking/verification flows remain in place. Both sign-in and sign-up cross-flow fallback destinations are explicit; invitation return behavior still needs real-session verification.
- `/auth-help` is public and gives generic sign-in/password/recovery instructions without an internal email-existence lookup.
- `/account/recovery` is authenticated and provides safe recovery guidance based on the current verified identity. It does not merge or transfer accounts. Generic page errors link there without serializing provider errors.
- `/account` hosts Clerk profile/security management for all roles, independently of workspace selection. The avatar navigates there. CoreOps withholds the profile UI until instance and user self-deletion permissions are disabled, rather than cosmetically hiding a delete button.
- The last-owner membership protections remain active. **The current Clerk configuration still permits direct self-deletion through provider surfaces. The local UI gate does not secure Clerk's API or Account Portal. Disable self-deletion globally and verify it before claiming this risk resolved.** No custom account-deletion endpoint was added.

## Provisioning, session safety, and audit

The Clerk external user ID remains authoritative. Every provisioning/profile-sync call requires a live active session belonging to that same identity and a verified primary email. Expired/revoked sessions, deleted/banned/locked identities, provider errors and 429 responses fail closed. Provider payloads and tokens are not copied into error messages or logs.

A case-insensitive email collision check also protects legacy addresses stored with different capitalization. A conflicting or null legacy external binding is never overwritten. Upserts and profile/email audit writes use transactions; concurrent first requests retain one internal user. Invitation acceptance also verifies that the provider profile ID matches the internal external identity before using a verified email. Verified email changes preserve the internal ID, memberships, roles and assignments; workspace audit entries record that a verified change occurred without duplicating the email value in metadata.

Authentication alone does not create a workspace. First-workspace creation and invitation acceptance stay separate, with the existing idempotency and ownership guards. Provider linking is delegated to Clerk, not recreated with a CoreOps email-based merge.

Live session verification adds an upstream session read alongside the existing profile read. React request caching deduplicates the normal provisioning path within a request. There is no unbounded retry loop or process-local rate limiter presented as a distributed guarantee. Clerk's native anti-abuse/rate limits remain responsible for credential attempts; application hosting limits and load/429 behavior still need deployment validation. Provider outages deny access safely and present retry/help guidance.

## Provisional legal documents and consent

| Document | Provisional URL | Version | Approval / effective date |
| --- | --- | --- | --- |
| Terms of Service | https://coreops.studio/terms | COREOPS-TOS-v1.0 | Not approved / pending |
| Privacy Policy | https://coreops.studio/privacy | COREOPS-PRIV-v1.0 | Not approved / pending |

Local `/terms` and `/privacy` pages include prominent draft notices and cover independent tenants, workspace ownership, business data, Clerk/Google authentication, recovery, third-party processing, deletion and rights requests. They explicitly leave governing law, contractual commitments, processing agreements, subprocessors, retention, transfers, complaint procedures, and other legal details for qualified review. No production publication occurred.

The source configuration uses the operator's provisional values. `COREOPS_LEGAL_DOCUMENTS_APPROVED` defaults false, and both effective dates are absent. See `auth-configuration.env.example`; `.env` credentials were not changed. Document links are available during registration and through account/settings pages. Mandatory acceptance stays inactive for drafts, regardless of version labels.

After approval, initial legal acceptance is collected by Clerk's express-consent feature, including the OAuth return flow. The CoreOps version receipt is a separate explicit acknowledgment so an old Clerk timestamp cannot be misinterpreted as agreement to new versions. Existing users are directed to review a new active version pair when enforcement is enabled.

`LegalAcceptance` records the authenticated internal user, exact version pair, configured document URLs, explicit server acceptance time, source `COREOPS_EXPLICIT`, and a separate optional Clerk acceptance timestamp. The browser cannot select another user or acceptance time. The rendered version pair is bound to the action and rechecked against current versions; stale-version submissions are rejected. Repeated/concurrent acceptance retains the original receipt and timestamp. Drafts, unchecked submissions and mismatched versions create no record. Marketing consent is not collected or inferred from this receipt.

Before approving a version, archive its immutable text and review future notice/re-consent rules. Never change approved text without versioning. The additive migration creates only the receipt table/indexes/FK. It was rehearsed and tested in the isolated local database, then applied to local development after a verified backup at `/tmp/coreops-before-auth-finalization.dump` (also inside core_ops_db). No existing identity, membership or business record was migrated or reassigned. The backup is temporary and access-restricted.

Production registration and first internal provisioning fail closed until documents are approved/effective, scopes are explicitly reviewed, support is configured, and remote Clerk legal URLs/express consent/branding/self-deletion settings match. This does not switch on Clerk consent or shut down existing users against draft terms. While legal approval is pending, keep public registration disabled in the provider as part of the launch procedure: social SignIn can itself initiate registration, even if the CoreOps SignUp page is gated.

## Clerk / Google configuration checklist

- [ ] Use separate development/staging and production instances and credentials. No secrets in client code, logs or this report.
- [ ] In Google social connection settings, request identity scopes only (`openid`, `email`, `profile`, or the provider's equivalent userinfo identity scopes). Remove added Gmail, Drive, contacts, Calendar and unrelated service scopes. Do not set additionalOAuthScopes in CoreOps.
- [ ] Capture the actual Google authorization request's scope list without storing authorization codes, state, nonce or tokens. Compare the user-visible consent screen. Verify production independently before setting COREOPS_GOOGLE_IDENTITY_SCOPES_REVIEWED=true.
- [ ] Use production Google custom OAuth credentials, the Clerk-provided callback URI, verified CoreOps domains, CoreOps name/logo, and approved policy links in Google Cloud branding. Development shared credentials are not evidence of correct production branding.
- [ ] Set Clerk application branding to CoreOps and support email to info@stravectsystems.com. Confirm the displayed provider identity at Google.
- [ ] Disable instance-level self-service account deletion. Audit per-user exceptions. Test direct Clerk profile/Account Portal/API behavior; do not rely on the CoreOps UI gate alone.
- [ ] Enable the intended password reset and MFA options, including backup/recovery functionality available for the plan. Exercise real enrollment and revoked sessions.
- [ ] Keep CAPTCHA, provider rate limits, password protection and abuse controls enabled; validate edge/application rate limits and shared deployment capacity before launch.
- [ ] Finalize and legally approve both documents and effective dates; publish accessible HTTPS pages and archive the approved versions. Confirm Google can reach them without signing in.
- [ ] Only then configure the legal URLs and Require express consent to legal documents in Clerk. Test both Google return and non-Google registration; never set skipLegalChecks or legalAccepted on a user's behalf.
- [ ] Set approved version/effective-date deployment values only after the above evidence exists. No marketing opt-in may be bundled into account terms.
- [ ] Test fallback/return URLs for returning users and invitations, blocked/revoked sessions, failure messages, and account-management access for every workspace role.

## Recovery and deletion procedure

See [account-recovery.md](account-recovery.md). There is intentionally no automatic legacy-binding repair or public email lookup. Provider-side verified method linking should retain the same Clerk ID and therefore the same CoreOps user. Exceptional legacy recovery requires verified evidence, explicit authorization and an audit record before an operator considers a change; email ownership alone is not a transfer instruction.

## Verification results and remaining blockers

| Evidence | Result |
| --- | --- |
| Isolated PostgreSQL authorization + expanded identity/consent suite | 29 passing Node results, including suite containers. Real database; mocked Clerk identities and session responses. |
| Configuration/disclosure/draft legal rendering tests | Passed. Mocked remote configuration; does not verify real Google or Clerk legal UI. |
| TypeScript / Next route types | Passed. |
| Full-project lint | Zero errors; 12 existing unused-code warnings. |
| Production build | Passed with current development configuration. Registration is intentionally gated in production mode while approval/configuration are incomplete. |
| Actual development public settings | Inspected; gaps recorded above. |
| Actual Google scope list / consent branding | Unverified. Public endpoint does not expose scopes; direct initiation was inconclusive. |
| Real Google new/returning/cross-method sign-in, ownership challenges, recovery and invitation handoff | Unverified: browser inventory remained empty. |
| Real OAuth legal acceptance, MFA, session revocation, self-deletion denial and network payload inspection | Unverified: requires provider configuration and authenticated browser sessions. |

Production blockers are: legal approval/effective dates, public deployment of the approved documents, Google scope/branding evidence, disabled provider self-deletion, configured MFA/recovery, provider legal settings, real-session acceptance, and capacity/rate-limit validation. Do not mark the authentication objective fully accepted until those are resolved.

## Primary references

- [Clerk OAuth account linking](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/account-linking) — verified linking and ownership challenges.
- [Clerk legal compliance](https://clerk.com/docs/guides/secure/legal-compliance) — provider express consent, including OAuth registrations.
- [Clerk Google connection setup](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google) — development/shared versus production/custom credentials.
- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect) — identity scope meanings.
- [Clerk user settings](https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options) — profile management, identifiers and account deletion configuration.
