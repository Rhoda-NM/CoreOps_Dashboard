const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'Node' } });
const load = Module._load;
Module._load = function(name, parent, main) {
  if (name === '@clerk/nextjs/server') return {
    clerkMiddleware: callback => callback,
    createRouteMatcher: patterns => request => patterns.some(pattern => new RegExp(`^${pattern}$`).test(request.nextUrl.pathname)),
  };
  return load.call(this, name, parent, main);
};
const proxy = require('../src/proxy.ts').default;
const { NextRequest } = require('next/server');
test('workspace context header is derived from the URL, not accepted from clients', async () => {
  let protectedRequests = 0;
  const auth = { protect: async () => { protectedRequests++; } };
  for (const slug of ['business-a', 'business-b']) {
    const response = await proxy(auth, new NextRequest(`http://localhost/w/${slug}/projects`, { headers: { 'x-coreops-workspace': 'forged-tenant', 'x-coreops-path': '/w/forged-tenant/subscription' } }));
    assert.equal(response.headers.get('x-middleware-request-x-coreops-workspace'), slug);
    assert.equal(response.headers.get('x-middleware-request-x-coreops-path'), `/w/${slug}/projects`);
  }
  const publicResponse = await proxy(auth, new NextRequest('http://localhost/', { headers: { 'x-coreops-workspace': 'forged-tenant', 'x-coreops-path': '/w/forged-tenant/subscription' } }));
  assert.equal(publicResponse.headers.get('x-middleware-request-x-coreops-workspace'), null);
  assert.equal(protectedRequests, 2);
  await assert.rejects(proxy({ protect: async () => { throw new Error('UNAUTHENTICATED'); } }, new NextRequest('http://localhost/w/business-a/projects')));
});

test('private platform sign-in and webhook routes bypass Clerk session redirects without exposing platform operations', async () => {
  let calls = 0;
  const auth = Object.assign(async () => ({ userId: null }), { protect: async () => { calls++; } });
  for (const pathname of ['/platform/sign-in', '/platform/sign-in/factor-two', '/platform/access-denied', '/api/payments/paystack/test/webhook']) {
    const response = await proxy(auth, new NextRequest(`http://localhost${pathname}`));
    assert.equal(response.status, 200);
  }
  assert.equal(calls, 0);
  const denied = await proxy(auth, new NextRequest('http://localhost/platform/payments'));
  assert.equal(denied.status, 307);
  assert.equal(denied.headers.get('location'), 'http://localhost/platform/sign-in');
});
