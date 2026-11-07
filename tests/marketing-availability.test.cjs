const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'Node' } });
const originalLoad = Module._load;
let failure, offers = [], tax = null, identityChecks = 0;
Module._load = function(name, parent, main) {
  if (name === 'server-only') return {};
  if (name === '@/config/auth') return { getAuthConfiguration: () => ({ supportEmail: 'support@example.test' }) };
  if (parent?.filename.endsWith('/commercial/marketing.ts')) {
    if (name === './service') return { publishedOffers: async () => { if (failure) throw failure; return offers; } };
    if (name === './tax') return { currentTaxConfiguration: async () => tax };
    if (name === '../auth/clerk-configuration') return { isRegistrationReady: async () => { identityChecks++; return true; } };
  }
  return originalLoad.call(this, name, parent, main);
};
const { marketingContent } = require('../src/server/commercial/marketing.ts');
Module._load = originalLoad;
test('public catalog degrades safely for outages and missing migration tables, then recovers', async () => {
  const old = process.env.COREOPS_PUBLIC_ONBOARDING_READY;
  process.env.COREOPS_PUBLIC_ONBOARDING_READY = 'true';
  const warn = console.warn, warnings = [];
  console.warn = message => warnings.push(message);
  try {
    for (const code of ['P1001', 'P1002', 'P1017', 'P2021', 'P2022']) {
      failure = Object.assign(new Error('secret connection payload'), { code });
      const result = await marketingContent();
      assert.equal(result.catalogAvailable, false);
      assert.deepEqual(result.offers, []);
      assert.equal(result.tax, null);
      assert.equal(result.onboardingReady, false);
      assert.equal(result.ctaHref, "/sign-in");
      assert.equal(result.ctaLabel, "Get access");
    }
    assert.equal(identityChecks, 0);
    assert.equal(warnings.length, 5);
    assert.ok(warnings.every(message => !message.includes('secret')));
    failure = undefined;
    offers = [{ id: 'approved-offer' }];
    tax = { id: 'approved-tax' };
    const recovered = await marketingContent();
    assert.equal(recovered.catalogAvailable, true);
    assert.equal(recovered.offers, offers);
    assert.equal(recovered.tax, tax);
    assert.equal(recovered.ctaHref, '/sign-in');
    assert.equal(identityChecks, 1);
  } finally {
    console.warn = warn;
    if (old === undefined) delete process.env.COREOPS_PUBLIC_ONBOARDING_READY;
    else process.env.COREOPS_PUBLIC_ONBOARDING_READY = old;
  }
});
test('unexpected programming, authorization and configuration errors are not hidden', async () => {
  for (const error of [new TypeError('unexpected defect'), Object.assign(new Error('forbidden'), { code: 'FORBIDDEN' }), Object.assign(new Error('bad credentials'), { code: 'P1000' })]) {
    failure = error;
    await assert.rejects(marketingContent, actual => actual === error);
  }
  failure = undefined;
});
