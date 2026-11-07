const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module'), path = require('node:path');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'Node' } });
const load = Module._load;
let activeAuth, clerkCalls = 0;
Module._load = function(name, parent, main) {
  if (name === 'server-only') return {};
  if(name.endsWith('/tenant-existence'))return {tenantExists:async slug=>!slug.startsWith('unknown-')};
  if (name === '@clerk/nextjs/server') return { clerkMiddleware: callback => request => { clerkCalls++; return callback(activeAuth, request); } };
  if (name.startsWith('@/')) name = path.resolve(__dirname, '../src', name.slice(2));
  return load.call(this, name, parent, main);
};
const proxy = require('../src/proxy.ts').default;
const { NextRequest } = require('next/server');
const keys = ['NODE_ENV','VERCEL_ENV','COREOPS_ROUTING_MODE','COREOPS_APP_ORIGIN','COREOPS_MARKETING_ORIGIN','COREOPS_TENANT_ROOT_DOMAIN','COREOPS_PREVIEW_HOSTS'];
async function inMode(mode, fn) {
  const old = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const values = mode === 'subdomain' ? { NODE_ENV:'production', COREOPS_ROUTING_MODE:mode, COREOPS_APP_ORIGIN:'https://app.workflowconnect.io', COREOPS_MARKETING_ORIGIN:'https://workflowconnect.io', COREOPS_TENANT_ROOT_DOMAIN:'workflowconnect.io' } : { NODE_ENV:'development', COREOPS_ROUTING_MODE:'path', COREOPS_APP_ORIGIN:'http://localhost:3000', COREOPS_MARKETING_ORIGIN:'http://localhost:3000' };
  try { for(const key of keys) { delete process.env[key]; if(values[key]) process.env[key] = values[key]; } return await fn(); }
  finally { for(const key of keys) { if(old[key] === undefined) delete process.env[key]; else process.env[key] = old[key]; } }
}
async function request(url, auth, headers = {}, method='GET') {
  activeAuth = auth ?? Object.assign(async()=>({userId:'test-user'}),{protect:async()=>{}});
  return proxy(new NextRequest(url,{method,headers:{host:new URL(url).host,...headers}}),{});
}
test('workspace context comes from the URL in path mode and forged context is replaced',()=>inMode('path',async()=>{
  let calls=0;const auth=async()=>{calls++;return {userId:"test-user"};};
  for(const slug of ['business-a','business-b']) {
    const response=await request(`http://localhost:3000/w/${slug}/projects`,auth,{'x-coreops-workspace':'forged','x-coreops-path':'/w/forged/subscription','x-coreops-return-to':'https://evil.test'});
    assert.equal(response.headers.get('x-middleware-request-x-coreops-workspace'),slug);
    assert.equal(response.headers.get('x-middleware-request-x-coreops-path'),`/w/${slug}/projects`);
    assert.equal(response.headers.get('x-middleware-request-x-coreops-return-to'),`/dashboard/continue?workspace=${slug}&path=%2Fprojects`);
  }
  const response=await request('http://localhost:3000/',auth,{'x-coreops-workspace':'forged'});
  assert.equal(response.headers.get('x-middleware-request-x-coreops-workspace'),null);assert.equal(calls,2);
  const unauthenticated=await request('http://localhost:3000/w/business-a/projects',async()=>({userId:null}));
  assert.equal(unauthenticated.status,307);
  const signIn=new URL(unauthenticated.headers.get('location'));
  assert.equal(signIn.pathname,'/sign-in');assert.equal(signIn.searchParams.get('returnTo'),'/dashboard/continue?workspace=business-a&path=%2Fprojects');
}));
test('path-mode private platform entry and public metadata/webhooks retain authentication behavior',()=>inMode('path',async()=>{
  let calls=0;const auth=Object.assign(async()=>({userId:null}),{protect:async()=>{calls++;}});
  for(const pathname of ['/features','/platform/sign-in','/platform/sign-in/factor-two','/platform/access-denied','/api/payments/paystack/test/webhook','/robots.txt','/sitemap.xml','/opengraph-image','/apple-icon']) assert.equal((await request(`http://localhost:3000${pathname}`,auth)).status,200);
  assert.equal(calls,0);
  const denied=await request('http://localhost:3000/platform/payments',auth);
  assert.equal(denied.status,307);assert.equal(denied.headers.get('location'),'http://localhost:3000/platform/sign-in');
}));
test('native tenant rewrites preserve queries and RSC/action headers and replace forged tenant context',()=>inMode('subdomain',async()=>{
  for(const [slug,pathname,method]of [['stravect','/dashboard','GET'],['stravect','/projects/record-123','GET'],['savannah','/tasks','POST'],['stravect','/subscription','GET']]) {
    const response=await request(`https://${slug}.workflowconnect.io${pathname}?status=ACTIVE`,undefined,{'x-coreops-workspace':'forged','x-coreops-path':'/w/forged/subscription',rsc:'1','next-router-prefetch':'1','next-action':'test-action'},method);
    assert.equal(response.status,200);
    assert.equal(response.headers.get('x-middleware-rewrite'),`https://${slug}.workflowconnect.io/w/${slug}${pathname}?status=ACTIVE`);
    assert.equal(response.headers.get('x-middleware-request-x-coreops-workspace'),slug);
    assert.equal(response.headers.get('x-middleware-request-x-coreops-path'),`/w/${slug}${pathname}`);
    assert.equal(response.headers.get('x-middleware-request-next-action'),'test-action');
    assert.equal(response.headers.get('x-middleware-request-rsc'),'1');
    assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow');
  }
}));
test('invalid, reserved and mismatched tenant hosts fail before invoking Clerk',()=>inMode('subdomain',async()=>{
  const before=clerkCalls;
  for(const url of ['https://api.workflowconnect.io/dashboard','https://admin.workflowconnect.io/platform','https://a.b.workflowconnect.io/tasks','https://stravect.workflowconnect.io/w/savannah/tasks','https://workflowconnect.io.evil.test/projects','https://unapproved.vercel.app/w/stravect/projects']) assert.equal((await request(url)).status,404,url);
  assert.equal((await request('https://stravect.workflowconnect.io/projects',undefined,{'x-forwarded-host':'savannah.workflowconnect.io'})).status,404);
  assert.equal(clerkCalls,before);
}));
test('marketing/app/tenant restrictions cover direct POST actions and central payment endpoints',()=>inMode('subdomain',async()=>{
  for(const pathname of ['/','/pricing','/features','/terms']) assert.equal((await request(`https://workflowconnect.io${pathname}`)).status,200);
  for(const pathname of ['/platform','/w/stravect/dashboard','/onboarding','/api/payments/paystack/live/webhook']) assert.equal((await request(`https://workflowconnect.io${pathname}`)).status,404);
  for(const pathname of ['/platform','/account','/onboarding','/invitations/token','/api/payments/paystack/live/webhook','/w/other/tasks']) assert.equal((await request(`https://stravect.workflowconnect.io${pathname}`,undefined,{},'POST')).status,404);
  assert.equal((await request('https://stravect.workflowconnect.io/platform')).status,404);
  assert.equal((await request('https://app.workflowconnect.io/api/payments/paystack/live/webhook',undefined,{},'POST')).status,200);
  const denied=await request('https://app.workflowconnect.io/platform',Object.assign(async()=>({userId:null}),{protect:async()=>{}}));
  assert.equal(denied.headers.get('location'),'https://app.workflowconnect.io/platform/sign-in');
  const post=await request('https://app.workflowconnect.io/w/stravect/projects',undefined,{},'POST');assert.equal(post.status,404);assert.equal(post.headers.get('location'),null);
}));
test('legacy canonical navigation and central-page navigation redirect GET only',()=>inMode('subdomain',async()=>{
  for(const url of ['https://app.workflowconnect.io/w/stravect/projects','https://stravect.workflowconnect.io/w/stravect/projects']) {
    const response=await request(url);assert.equal(response.status,307);assert.equal(response.headers.get('location'),'https://stravect.workflowconnect.io/projects');
  }
  const access=await request('https://workflowconnect.io/sign-in');assert.equal(access.headers.get('location'),'https://app.workflowconnect.io/sign-in');
  const account=await request('https://stravect.workflowconnect.io/account');assert.equal(account.headers.get('location'),'https://app.workflowconnect.io/account');
  const post=await request('https://stravect.workflowconnect.io/w/stravect/projects',undefined,{},'POST');assert.equal(post.headers.get('x-middleware-rewrite'),'https://stravect.workflowconnect.io/w/stravect/projects');assert.equal(post.headers.get('location'),null);
}));
test('assets are served without Clerk or tenant-page rewrites; asset-looking POST actions are denied',()=>inMode('subdomain',async()=>{
  const before=clerkCalls;
  for(const pathname of ['/_next/static/chunks/app.js','/brand/workflowconnect-mark.svg','/icon.svg','/manifest.webmanifest','/robots.txt','/sw.js']) {
    const response=await request(`https://stravect.workflowconnect.io${pathname}`,undefined,{'x-coreops-workspace':'forged'});assert.equal(response.status,200);assert.equal(response.headers.get('x-middleware-rewrite'),null);assert.equal(response.headers.get('x-middleware-request-x-coreops-workspace'),null);
    assert.equal((await request(`https://stravect.workflowconnect.io${pathname}`,undefined,{'next-action':'test'},'POST')).status,404);
  }
  assert.equal(clerkCalls,before);
}));
test('explicit preview deployments stay path-based; invalid configuration fails closed',()=>inMode('path',async()=>{
  process.env.VERCEL_ENV='preview';process.env.COREOPS_APP_ORIGIN='https://approved.vercel.app';process.env.COREOPS_MARKETING_ORIGIN='https://approved.vercel.app';process.env.COREOPS_PREVIEW_HOSTS='approved.vercel.app';
  assert.equal((await request('https://approved.vercel.app/w/stravect/projects')).headers.get('x-middleware-request-x-coreops-workspace'),'stravect');
  for(const host of ['unapproved.vercel.app','stravect.workflowconnect.io']) assert.equal((await request(`https://${host}/w/stravect/projects`)).status,404);
  process.env.COREOPS_ROUTING_MODE='subdomain';assert.equal((await request('https://approved.vercel.app/projects')).status,503);
}));

test('unknown tenant pages return neutral 404 before any Clerk handshake',()=>inMode('subdomain',async()=>{
 const before=clerkCalls;const response=await request('https://unknown-business.workflowconnect.io/projects');assert.equal(response.status,404);assert.equal(await response.text(),'Not found');assert.equal(clerkCalls,before);
}));
