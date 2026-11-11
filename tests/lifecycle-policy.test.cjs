const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'Node' } });
const load = Module._load;
Module._load = function(name, ...args) { return name === 'server-only' ? {} : load.call(this, name, ...args); };
const { calculateLifecycle, utcDays } = require('../src/server/lifecycle/policy.ts');
const { lifecycleEnforcementEnabled, lifecycleProcessingEnabled } = require('../src/server/lifecycle/config.ts');
test('exact UTC expiry, grace, cancellation and retention boundaries', () => {
  const expiry = new Date('2028-02-29T23:45:12.345Z');
  for (const [offset, state] of [[-1,'ACTIVE'],[0,'GRACE'],[7*86400000-1,'GRACE'],[7*86400000,'ARCHIVED'],[60*86400000-1,'ARCHIVED'],[60*86400000,'CANCELED'],[150*86400000,'CANCELED']]) {
    const result = calculateLifecycle(expiry, new Date(+expiry + offset));
    assert.equal(result.state,state);
    assert.equal(+result.retentionEndsAt,+expiry+150*86400000);
    assert.equal(result.retentionExpired,offset>=150*86400000);
  }
  assert.equal(calculateLifecycle(null,new Date()).state,'PENDING');
  assert.equal(utcDays(new Date('2026-12-31T22:00:00Z'),60).toISOString(),'2027-03-01T22:00:00.000Z');
  assert.throws(()=>calculateLifecycle(new Date('invalid'),new Date()));
});
test('calendar policy ignores client/server timezone and delayed observation', () => {
  const prior = process.env.TZ;
  try {
    for (const tz of ['Africa/Nairobi','America/New_York','Pacific/Auckland']) {
      process.env.TZ=tz;
      const result=calculateLifecycle(new Date('2028-02-29T23:45:12.345Z'),new Date('2028-05-29T23:45:12.345Z'));
      assert.equal(result.cancellationAt.toISOString(),'2028-04-29T23:45:12.345Z');
      assert.equal(result.retentionEndsAt.toISOString(),'2028-07-28T23:45:12.345Z');
    }
  } finally { if(prior===undefined) delete process.env.TZ; else process.env.TZ=prior; }
});
test('enforcement and processing default off; deployed or non-rehearsal activation is rejected', () => {
  const keys=['DATABASE_URL','COREOPS_LIFECYCLE_ENFORCEMENT_ENABLED','COREOPS_LIFECYCLE_PROCESSING_ENABLED','VERCEL','VERCEL_ENV'];
  const old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  try {
    for(const k of keys)delete process.env[k];
    assert.equal(lifecycleEnforcementEnabled(),false);assert.equal(lifecycleProcessingEnabled(),false);
    process.env.COREOPS_LIFECYCLE_ENFORCEMENT_ENABLED='true';
    process.env.DATABASE_URL='postgresql://localhost/core_ops_db';assert.throws(()=>lifecycleEnforcementEnabled());
    process.env.DATABASE_URL='postgresql://localhost/coreops_auth_rehearsal_lifecycle_test';assert.equal(lifecycleEnforcementEnabled(),true);
    process.env.VERCEL_ENV='preview';assert.throws(()=>lifecycleEnforcementEnabled());
  } finally { for(const k of keys) { if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k]; } }
});
