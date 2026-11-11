/* eslint-disable @typescript-eslint/no-require-imports -- read-only operator CLI */
// No Backend API, credentials in output, user records, or configuration writes.
const { parseArgs } = require('node:util');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'Node' } });
const { getAuthConfiguration } = require('../src/config/auth.ts');
const { registrationRequirements } = require('../src/lib/auth/registration-readiness.ts');
(async () => {
  const { values } = parseArgs({ options: { 'expected-host': { type: 'string' } }, strict: true });
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key?.startsWith('pk_test_')) throw new Error('This inspector is restricted to development instances.');
  const host = Buffer.from(key.slice(8), 'base64').toString().replace(/\$$/, '');
  if (!/^[a-z0-9-]+\.clerk\.accounts\.dev$/i.test(host)) throw new Error('Unexpected development host.');
  if (values['expected-host'] && values['expected-host'] !== host) throw new Error('Selected Clerk instance does not match --expected-host. No request was sent.');
  const response = await fetch(`https://${host}/v1/environment`, { signal: AbortSignal.timeout(10000), redirect: 'error' });
  if (!response.ok) throw new Error(`Public configuration returned HTTP ${response.status}.`);
  const environment = await response.json();
  const user = environment.user_settings ?? {}, display = environment.display_config ?? {};
  const config = getAuthConfiguration();
  const requirements = registrationRequirements(config, environment);
  console.log(JSON.stringify({
    checkedAt: new Date().toISOString(), clerkHost: host, expectedInstanceMatched: Boolean(values['expected-host']),
    environment: display.instance_environment_type, applicationName: display.application_name,
    googleEnabled: user.social?.oauth_google?.enabled,
    googleScopes: 'Not exposed by this endpoint; verify the actual authorization request in a regular browser. The scope-review flag is an operator attestation, not independent verification.',
    legalConsentEnabled: user.sign_up?.legal_consent_enabled, termsUrl: display.terms_url || null,
    privacyUrl: display.privacy_policy_url || null, supportEmailConfigured: Boolean(display.support_email),
    selfDeleteEnabled: user.actions?.delete_self, emailVerificationAtSignup: user.attributes?.email_address?.verify_at_sign_up,
    passwordEnabled: user.attributes?.password?.enabled, authenticatorAppEnabled: user.attributes?.authenticator_app?.enabled,
    backupCodesEnabled: user.attributes?.backup_code?.enabled, captchaEnabled: user.sign_up?.captcha_enabled,
    registrationRequirements: requirements,
    acceptance: 'Public configuration only. Does not establish instance/database isolation, legal approval evidence, deployed values, email delivery, Google login, MFA, recovery or session behavior.',
  }, null, 2));
  if (!requirements.ready) process.exitCode = 2;
})().catch(() => { console.error('Clerk inspection failed. Check the test publishable key, expected host and public endpoint availability. No credentials were logged.'); process.exitCode = 1; });
