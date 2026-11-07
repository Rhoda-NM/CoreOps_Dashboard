const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', jsx: 'react-jsx' } });
const load = Module._load;
Module._load = function(name, parent, main) {
  if (name === 'server-only') return {};
  if (name.startsWith('@/')) name = path.resolve(__dirname, '../src', name.slice(2));
  return load.call(this, name, parent, main);
};
const { getAuthConfiguration } = require('../src/config/auth.ts');
const { isRegistrationReady } = require('../src/server/auth/clerk-configuration.ts');
const { renderToStaticMarkup } = require('react-dom/server');
const { createElement } = require('react');
const TermsPage = require('../src/app/terms/page.tsx').default;
const PrivacyPage = require('../src/app/privacy/page.tsx').default;
const { AuthShell } = require('../src/components/auth/AuthShell.tsx');

test('draft legal content, disclosures and production configuration fail closed', async () => {
  const keys = ['NODE_ENV', 'COREOPS_LEGAL_DOCUMENTS_APPROVED', 'COREOPS_TERMS_EFFECTIVE_AT', 'COREOPS_PRIVACY_EFFECTIVE_AT', 'COREOPS_GOOGLE_IDENTITY_SCOPES_REVIEWED', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'COREOPS_SUPPORT_EMAIL', 'COREOPS_TERMS_URL'];
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  try {
    process.env.NODE_ENV = 'production';
    process.env.COREOPS_LEGAL_DOCUMENTS_APPROVED = 'false';
    let calls = 0;
    globalThis.fetch = async () => { calls++; throw new Error('must not call before prerequisites'); };
    assert.equal(getAuthConfiguration().legalReady, false);
    assert.equal(await isRegistrationReady(), false);
    assert.equal(calls, 0);
    for (const Page of [TermsPage, PrivacyPage]) {
      const html = renderToStaticMarkup(createElement(Page));
      assert.match(html, /Draft — not legally approved/);
      assert.match(html, /Pending finalization/);
      assert.match(html, /Stravect Systems/);
    }
    const disclosure = renderToStaticMarkup(createElement(AuthShell, { registering: true }, createElement('div', null, 'Clerk boundary')));
    for (const text of ['Google password is never shared', 'Gmail, Google Drive, contacts, or Calendar', 'Clerk user ID', 'verified email address']) assert.ok(disclosure.includes(text));
    process.env.COREOPS_LEGAL_DOCUMENTS_APPROVED = 'true';
    process.env.COREOPS_TERMS_EFFECTIVE_AT = '2020-01-01T00:00:00Z';
    process.env.COREOPS_PRIVACY_EFFECTIVE_AT = '2020-01-01T00:00:00Z';
    process.env.COREOPS_GOOGLE_IDENTITY_SCOPES_REVIEWED = 'true';
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_' + Buffer.from('test-example.clerk.accounts.dev$').toString('base64');
    const config = getAuthConfiguration();
    const remote = { display_config: { application_name: 'WorkflowConnect', support_email: config.supportEmail, terms_url: config.termsUrl, privacy_policy_url: config.privacyUrl }, user_settings: { sign_up: { legal_consent_enabled: true }, actions: { delete_self: false } } };
    globalThis.fetch = async () => ({ ok: true, json: async () => remote });
    assert.equal(await isRegistrationReady(), true);
    remote.user_settings.actions.delete_self = true;
    assert.equal(await isRegistrationReady(), false);
    remote.user_settings.actions.delete_self = false;
    remote.user_settings.sign_up.legal_consent_enabled = false;
    assert.equal(await isRegistrationReady(), false);
    remote.user_settings.sign_up.legal_consent_enabled = true;
    remote.display_config.application_name = 'My Application';
    assert.equal(await isRegistrationReady(), false);
    remote.display_config.application_name = 'WorkflowConnect';
    globalThis.fetch = async () => { throw new Error('configuration unavailable'); };
    assert.equal(await isRegistrationReady(), false);
    process.env.COREOPS_TERMS_URL = 'javascript:alert(1)';
    assert.equal(getAuthConfiguration().legalConfigured, false);
    process.env.COREOPS_SUPPORT_EMAIL = 'invalid\r\nheader@example.test';
    assert.equal(getAuthConfiguration().supportEmail, undefined);
  } finally {
    for (const key of keys) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; }
    globalThis.fetch = originalFetch;
    Module._load = load;
  }
});
