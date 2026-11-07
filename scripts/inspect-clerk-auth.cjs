// Public configuration inspection only: never requests user records or writes.
(async () => {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key?.startsWith('pk_test_')) throw new Error('This inspector is restricted to development instances.');
  const host = Buffer.from(key.slice(8), 'base64').toString().replace(/\$$/, '');
  if (!/^[a-z0-9.-]+\.clerk\.accounts\.dev$/i.test(host)) throw new Error('Unexpected development host.');
  const response = await fetch(`https://${host}/v1/environment`, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Public configuration returned HTTP ${response.status}.`);
  const environment = await response.json();
  const user = environment.user_settings ?? {}, display = environment.display_config ?? {};
  console.log(JSON.stringify({
    checkedAt: new Date().toISOString(), environment: display.instance_environment_type,
    applicationName: display.application_name, googleEnabled: user.social?.oauth_google?.enabled,
    googleScopes: 'Not exposed by this endpoint; verify in Clerk/Google and capture the actual authorization request.',
    legalConsentEnabled: user.sign_up?.legal_consent_enabled, termsUrl: display.terms_url || null,
    privacyUrl: display.privacy_policy_url || null, supportEmailConfigured: Boolean(display.support_email),
    selfDeleteEnabled: user.actions?.delete_self, emailVerificationAtSignup: user.attributes?.email_address?.verify_at_sign_up,
    passwordEnabled: user.attributes?.password?.enabled, authenticatorAppEnabled: user.attributes?.authenticator_app?.enabled,
    backupCodesEnabled: user.attributes?.backup_code?.enabled, captchaEnabled: user.sign_up?.captcha_enabled,
  }, null, 2));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
