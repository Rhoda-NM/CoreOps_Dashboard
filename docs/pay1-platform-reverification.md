# PAY-1 — Platform administrator MFA access repair

12 November 2026. **Local source implementation and verification only. No deployment, admission insertion, role grant or provider configuration change.** The reported deployment is `dpl_GHnP4BwwcDVkBtFo39cmyjpdJJts`.

## Root cause and evidence boundary

The confirmed application defect was a dead end for authenticated administrators whose session did not satisfy strict MFA. `platformEntry()` required all of: active database-backed role, live verified identity, MFA enrollment, two nonnegative factor ages and `session.has({ reverification: "strict_mfa" })`. The protected layout sent every MFA failure to access denied. Platform sign-in sent an already-authenticated user straight back to `/platform`. Neither route invoked Clerk's supported reverification flow. The access-denied instructions to sign in again did not provide an in-session step-up mechanism.

The supplied facts establish an existing User, active SUPER_ADMIN, initial bootstrap audit and MFA enrollment. They do **not** establish fresh factor verification ages or a passing SDK strict-MFA check. Enrollment is distinct from verification of this session. Missing/negative factor ages, ages at or above the strict window, or another SDK check failure all previously looked identical.

Read-only inspection of the supplied deployment through the connected Vercel account returned **403 for this team's scope**. No live session claims were inspected, and no claim is made that a particular live `fva` value, Clerk enrollment flag or lookup failed. This repair fixes the source dead end and provides safe diagnostics to determine the remaining live condition after reviewed Preview release. An initial bootstrap audit is historical grant evidence, not a current MFA or session authorization.

The installed `@clerk/nextjs` exports `useReverification` and server `reverificationError`. The [official Clerk reverification guide](https://clerk.com/docs/guides/secure/reverification) documents the server error/client hook retry contract and possible first-factor downgrade when a second factor is unavailable. The existing explicit enrollment and verified-second-factor fences are therefore retained in addition to the SDK check. The installed SDK's `strict_mfa` preset requires both verified factors within ten minutes; no freshness setting or provider configuration was changed.

## Implementation diff and exact files

| File | Change |
| --- | --- |
| `src/server/commercial/platform-auth.ts` | Preview-only closed-code/boolean diagnostics; fail-closed identity/admission handling; explicit `canReverify` only after live identity, active role and enrollment; stale direct service/RSC entry redirects to verification while releasing no data. Role permissions and strict MFA still gate every successful `requirePlatform()` result. |
| `src/app/platform/(protected)/layout.tsx` | Distinguish signed-out, missing role/no enrollment and eligible step-up; redirect eligible stale administrators to `/platform/verify`. |
| `src/app/platform/sign-in/[[...sign-in]]/page.tsx` | Already-authenticated administrators are assessed rather than blindly redirected back to the protected page. Signed-out users retain the Clerk SignIn widget. |
| `src/app/platform/verify/page.tsx` | Dynamic server-gated step-up screen outside the protected layout, available only to an admitted, enrolled active administrator needing verification. No platform data passed to the client. |
| `src/app/platform/verify/actions.ts` | Read-only server action rechecks identity/admission/active role on every invocation. Returns `reverificationError("strict_mfa")` only to an eligible administrator; successful fresh verification returns a fixed status, not role or platform data. |
| `src/app/platform/verify/PlatformVerification.tsx` | Supported `useReverification()` modal/retry flow; explicit user gesture, pending/cancel/failure feedback and fixed `/platform` navigation only after server success. No client flag grants access and no caller-controlled return URL. |
| `src/app/platform/access-denied/page.tsx` | Accurate enrollment/operator/step-up guidance. No suggestion that ordinary sign-in grants a role. |
| `src/app/platform/error.tsx` | Safe verification link for expired access, including direct protected-page failures. |
| `tests/platform-reverification.test.cjs` | Server, route, client-wiring, MFA, role, admission-expiry and privacy regressions using synthetic dependencies. |
| `package.json` | Adds `test:platform-reverification`; no dependency changes. |
| This report | Findings, test evidence and target-specific release instructions. |

Existing bootstrap-preparation artifacts from the prior task are separate uncommitted files and were not changed here. No schema, migration, role, approval history, country eligibility, catalog mutation rule, payment verification or lifecycle/export/notification release gate changed.

## Flow and security behavior

1. Anonymous platform visitor receives platform sign-in. Authentication itself grants no administrator rights.
2. An authenticated request checks central host, live Clerk session/profile, verified email and existing PAY-1 actor/admission rules through `requireClerkIdentity()`.
3. An active PlatformAdmin lookup is bound to that authoritative Clerk external ID. Missing/inactive roles cannot receive a privileged reverification hint or platform content. MFA enrollment is also mandatory before this privileged flow starts.
4. An enrolled active administrator with missing, unverified or stale factor claims goes to the verification screen. The server action returns the exact strict-MFA hint; Clerk handles factor entry and retries the action. Codes, passwords, tokens and factor challenges never enter our action arguments or application logs.
5. The retried action repeats admission, role and MFA checks. Revocation/expiry or role removal during verification denies the retry. Any SDK first-factor fallback still fails the explicit two-verified-factor fence.
6. Only server-confirmed success navigates to `/platform`; the new document request again checks the server guards. Page/service permissions remain enforced independently. A direct sensitive-action invocation without fresh MFA cannot execute its mutation. Existing action wrappers may present a generic failure if they catch a redirect; navigating to platform verification restores the normal entry flow without replaying a financial mutation automatically.

The entry verification action is read-only and returns no business/platform records. It is not an authorization grant, impersonation facility, role bootstrap or replacement for strict MFA on sensitive actions. Unavailable live identity/admission fails closed. Database lookup failures produce a fixed error without raw database exceptions. No shared authorization cache or cross-request positive MFA cache was introduced.

## Sanitized Preview diagnostics

Only when `VERCEL_ENV=preview` **and** `COREOPS_PAY1_PREVIEW_ENABLED=true`, entry emits `PLATFORM_ENTRY_CHECK`. Allowed reason codes:

| Reason | Meaning / next check |
| --- | --- |
| `SIGN_IN_REQUIRED` | No authenticated user in the request. |
| `IDENTITY_UNAVAILABLE` | Live identity/session/verified-email requirements failed. No provider details logged. |
| `PAY1_WINDOW_CLOSED` | Actual admission evaluator denied its active time/revocation window. |
| `PAY1_ADMISSION_DENIED` | Another existing PAY-1 admission/configuration/actor check failed. Keep the guard; review target settings separately. |
| `ADMIN_NOT_FOUND` | No matching active database-backed role; includes inactive-role denial. |
| `ADMIN_LOOKUP_UNAVAILABLE` | Database lookup failed; no driver body/identifier is logged. |
| `MFA_NOT_ENROLLED` | Live Clerk profile did not report `twoFactorEnabled=true`. |
| `MFA_CLAIMS_MISSING` / `MFA_CLAIMS_INVALID` | Factor-age claim absent or malformed. |
| `MFA_NOT_VERIFIED` | At least one factor has not been verified for this session. |
| `MFA_STALE` | SDK check failed and a factor age reached the strict ten-minute boundary. |
| `MFA_CHECK_FAILED` | Claims appear verified, but the SDK strict-MFA check still failed. |
| `READY` | Entry MFA and active-role checks pass; permission-specific checks still apply. |

The only additional fields are booleans: `adminFound`, `mfaEnrolled`, `fvaPresent`, `fvaValid`, `factorsVerified`, `strictMfa`. No raw `fva`, role object, user/external ID, email, session ID, JWT, token, MFA code, request URL, secret or exception is logged. Failed logging has no raw fallback. Identity/admission failures before the role lookup have only the closed reason. Diagnostics are not an independent audit ledger and do not establish cloud log IAM or retention. Ordinary hosting request metadata remains outside this application log contract.

## Verification

- Focused suite: **13 passed including parent, 12 scenarios**, zero failures. Covers fresh MFA, stale MFA/step-up/retry, unenrolled account, missing/malformed/unverified claims, SDK fallback rejection, absent/inactive role, expired admission and role removal during step-up, role permissions, signed-out/foreign-host/unavailable identity, client wrapper/continuation and marker-free Preview-only diagnostics.
- Combined existing auth/PAY-1/host plus initial focused suite: **65 passed**, zero failures. The later additional SDK fallback scenario separately passed in the final 13-test focused run.
- Existing PostgreSQL commercial/identity regressions: **30 passed**, zero failures, using the guarded existing disposable loopback `coreops_auth_rehearsal_market_legal_chain_261111` database. No Preview/Production access or migration occurred.
- Typecheck and local production build passed. Build includes dynamic `/platform/verify`; no deployment occurred. Focused lint passed; full lint has **zero errors and 12 existing business-page warnings**.
- Initial sandbox runs hit local subprocess/port restrictions; permitted reruns passed. No security check was removed to obtain a pass.

Auth/provider/session inputs and client hook execution are substituted in the focused suite; the actual entry/actions/pages, SDK reverification-error shape and PAY-1 admission evaluator are exercised against synthetic rows. These tests do not establish real Clerk modal completion, live MFA values or deployed access. PostgreSQL regressions exercise real local transactions with synthetic fixtures. No Preview record or provider setting was changed.

Reproduction:

```bash
npm run test:platform-reverification
node --test tests/pay1-preview.test.cjs tests/pay1-registration.test.cjs \
  tests/account-entry.test.cjs tests/auth-pages.test.cjs \
  tests/auth-configuration.test.cjs tests/host-policy.test.cjs
npm run typecheck
npm run lint
npm run build
```

Protected local evidence: `/tmp/workflowconnect-platform-stepup-{focused,tests,domain,types,lint,build}.log`. Temporary logs are not durable release custody.

## Preview deployment instructions — operator approval still required

1. Review this diff and tests. No new database migration or administrator bootstrap is required for this repair. Preserve the confirmed User/admin/audit records and current test-only feature restrictions.
2. Create a **Preview-only** deployment of the reviewed revision when authorized; record its actual deployment/project identity and origin. Do not promote it to Production. This task does not deploy.
3. Prepare and review a **new PAY-1 admission binding for that new deployment** using the existing admission generator/procedure. The supplied `dpl_GHnP4BwwcDVkBtFo39cmyjpdJJts` admission cannot authorize a different deployment. Admission insertion, window, actor list and environment configuration need their existing review; do not edit immutable historical admission records or spoof deployment IDs to reuse one.
4. Keep the intended synthetic administrator allowlisted, existing strict MFA enabled, Test Mode keys and unrelated lifecycle/export/notification/destructive features disabled as before. No Clerk dashboard weakening or global catalog unlock is required.
5. On the newly admitted Preview, use `/platform/sign-in` or `/platform/verify` with the intended synthetic administrator. Complete Clerk's modal. Confirm `READY`, then `/platform` and authorized `/platform/offers` reads. A stale session should produce the appropriate code and require verification. If claims remain absent after genuine verification, inspect actual Clerk session-token configuration with an authorized operator; never fabricate `fva` or force the result true.
6. Verify a nonadmin cannot load the verification component, obtain a server challenge or read platform data; expired admission and role removal must deny retries. Test sensitive actions with fresh/stale MFA using approved synthetic records only. MFA repair does **not** remove PAY-1's separate restrictions on creating/publishing global offers.
7. If regression occurs, retain safe diagnostics and use the approved Preview rollback procedure. An older deployment still needs its own valid admission; rollback does not bypass admission expiry or restore role/financial evidence automatically.

No production or Preview deployment, database mutation, provider setting, real payment, customer communication, admission grant or global commercial mutation was performed. Broad onboarding/subscription UI improvements remain outside this repair.
