const { test } = require('node:test');
const assert = require('node:assert/strict');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'Node' } });
const { createRoutingPolicy, routingPolicyFromEnvironment, classifyHost, internalWorkspacePath, workspaceUrl, centralUrl, marketingUrl, verifiedWorkspaceReturnUrl } = require('../src/lib/routing/host-policy.ts');
const { workspaceSlugProblem, generateWorkspaceSlug, auditWorkspaceSlugs } = require('../src/lib/routing/workspace-slug.ts');
const production = createRoutingPolicy({ mode: 'subdomain', environment: 'production', appOrigin: 'https://app.workflowconnect.io', marketingOrigin: 'https://workflowconnect.io', tenantRootDomain: 'workflowconnect.io' });
test('exact host classes normalize case/default HTTPS port without trusting arbitrary authorities', () => {
  assert.equal(classifyHost(production, 'WORKFLOWCONNECT.IO:443').kind, 'marketing');
  assert.equal(classifyHost(production, 'app.workflowconnect.io').kind, 'app');
  assert.deepEqual(classifyHost(production, 'stravect.workflowconnect.io'), { kind: 'tenant-candidate', authority: 'stravect.workflowconnect.io', slug: 'stravect' });
  // Unknown syntactically valid names stay candidates, never verified tenants.
  assert.equal(classifyHost(production, 'not-a-real-business.workflowconnect.io').kind, 'tenant-candidate');
  for (const host of ['workflowconnect.io.evil.test', 'evilworkflowconnect.io', 'evil.test', 'preview.vercel.app', 'a.b.workflowconnect.io', 'api.workflowconnect.io', 'www.workflowconnect.io', 'admin.workflowconnect.io', 'clerk.workflowconnect.io', 'stravect.workflowconnect.io:3000', 'xn--test.workflowconnect.io']) assert.equal(classifyHost(production, host).kind, 'rejected', host);
});
test('malformed hosts and conflicting forwarded hosts fail closed', () => {
  for (const host of [null, '', ' app.workflowconnect.io', 'app.workflowconnect.io.', 'app.workflowconnect.io,evil.test', 'app.workflowconnect.io@evil.test', 'app.workflowconnect.io/path', 'app.workflowconnect.io\\evil', 'app.workflowconnect.io:0443', 'app.workflowconnect.io:99999', '-bad.workflowconnect.io', 'app.workflowconnect.io\n', 'a'.repeat(64)+'.workflowconnect.io']) assert.equal(classifyHost(production, host).kind, 'rejected', String(host));
  assert.equal(classifyHost(production, 'app.workflowconnect.io', 'APP.WORKFLOWCONNECT.IO:443').kind, 'app');
  for (const forwarded of ['', 'evil.test', 'stravect.workflowconnect.io', 'app.workflowconnect.io,evil.test']) assert.equal(classifyHost(production, 'app.workflowconnect.io', forwarded).kind, 'rejected');
});
test('preview accepts explicit deployments only and cannot generate production tenant links', () => {
  const preview = createRoutingPolicy({ environment: 'preview', mode: 'path', appOrigin: 'https://project-abc.vercel.app', marketingOrigin: 'https://project-abc.vercel.app', previewHosts: ['project-abc.vercel.app'] });
  assert.equal(classifyHost(preview, 'project-abc.vercel.app').kind, 'preview');
  for (const host of ['other.vercel.app', 'app.workflowconnect.io', 'stravect.workflowconnect.io']) assert.equal(classifyHost(preview, host).kind, 'rejected');
  assert.equal(workspaceUrl(preview, 'stravect'), 'https://project-abc.vercel.app/w/stravect/dashboard');
  assert.throws(() => createRoutingPolicy({ ...production, environment: 'preview' }));
  assert.throws(() => createRoutingPolicy({ ...preview, appOrigin: 'https://app.workflowconnect.io' }));
});
test('environment configuration defaults to local path mode and requires explicit nonlocal origins', () => {
  const local = routingPolicyFromEnvironment({ NODE_ENV: 'development' });
  assert.equal(local.mode, 'path');
  assert.equal(workspaceUrl(local, 'stravect'), 'http://localhost:3000/w/stravect/dashboard');
  assert.equal(classifyHost(local, '127.0.0.1:3000').kind, 'development');
  assert.equal(classifyHost(local, 'evil.test').kind, 'rejected');
  assert.throws(() => routingPolicyFromEnvironment({ NODE_ENV: 'production' }));
  assert.throws(() => routingPolicyFromEnvironment({ NODE_ENV: 'development', COREOPS_ROUTING_MODE: 'typo' }));
  assert.throws(() => createRoutingPolicy({ ...production, appOrigin: 'http://app.workflowconnect.io' }));
  for (const bad of ['https://user:pass@app.workflowconnect.io', 'https://app.workflowconnect.io/path', 'https://app.workflowconnect.io?query', 'https://app.workflowconnect.io#hash']) assert.throws(() => createRoutingPolicy({ ...production, appOrigin: bad }));
});
test('builders distinguish internal paths, workspace URLs and central/marketing destinations', () => {
  assert.equal(internalWorkspacePath('stravect', '/projects/item-123?status=ACTIVE'), '/w/stravect/projects/item-123?status=ACTIVE');
  assert.equal(workspaceUrl(production, 'stravect', '/subscription'), 'https://stravect.workflowconnect.io/subscription');
  assert.equal(centralUrl(production, '/platform/sign-in'), 'https://app.workflowconnect.io/platform/sign-in');
  assert.equal(marketingUrl(production, '/pricing'), 'https://workflowconnect.io/pricing');
  for (const path of ['//evil.test', '/projects/../platform', '/projects/%2e%2e/platform', '/projects/%252e%252e', '/projects/%2fetc', '/projects\\etc', '/projects//etc', 'https://evil.test', '/projects\n', '/projects#fragment']) {
    assert.throws(() => internalWorkspacePath('stravect', path), path);
    assert.throws(() => centralUrl(production, path), path);
  }
  assert.throws(() => workspaceUrl(production, 'stravect', '/platform'));
  for (const slug of ['app', 'a.b', 'other/path', 'UPPER', 'a'.repeat(64)]) assert.throws(() => workspaceUrl(production, slug));
});
test('return destinations require canonical URLs and an independently verified membership list', () => {
  assert.equal(verifiedWorkspaceReturnUrl(production, 'https://stravect.workflowconnect.io/tasks?status=DONE', ['stravect']), 'https://stravect.workflowconnect.io/tasks?status=DONE');
  for (const value of ['//evil.test', 'https://evil.test/dashboard', 'https://savannah-space.workflowconnect.io/dashboard', 'https://stravect.workflowconnect.io/platform', 'https://stravect.workflowconnect.io/projects/../settings', 'https://user@stravect.workflowconnect.io/dashboard', 'http://stravect.workflowconnect.io/dashboard', 'https://stravect.workflowconnect.io/dashboard#x']) assert.throws(() => verifiedWorkspaceReturnUrl(production, value, ['stravect']), value);
  const local = routingPolicyFromEnvironment({ NODE_ENV: 'development' });
  assert.equal(verifiedWorkspaceReturnUrl(local, 'http://localhost:3000/w/stravect/clients', ['stravect']), 'http://localhost:3000/w/stravect/clients');
  assert.throws(() => verifiedWorkspaceReturnUrl(local, 'http://localhost:3000/w/other/clients', ['stravect']));
});
test('slug generation is normalized, bounded, entropy-validated and independent from the display name', () => {
  assert.equal(generateWorkspaceSlug('  Rhoda Studio! ', '1234abcd'), 'rhoda-studio-1234abcd');
  assert.equal(generateWorkspaceSlug('中文', '1234abcd'), 'workspace-1234abcd');
  assert.equal(generateWorkspaceSlug('App', '1234abcd'), 'app-1234abcd');
  const long = generateWorkspaceSlug('a'.repeat(120), '1234abcd'); assert.equal(long.length, 63); assert.equal(workspaceSlugProblem(long), null);
  assert.equal(workspaceSlugProblem(generateWorkspaceSlug('-'.repeat(54)+'abc', '1234abcd')), null);
  for (const value of ['app', 'admin', 'www', 'clerk', 'ns1', 'preview', 'status', 'api']) assert.equal(workspaceSlugProblem(value), 'reserved');
  for (const value of [null, '', '-a', 'a-', 'A', 'a.b', 'a'.repeat(64), 'xn--abc']) assert.ok(workspaceSlugProblem(value));
  assert.throws(() => generateWorkspaceSlug('name', '../abcde'));
});
test('slug audit reports invalid/reserved/null and case-fold collisions without changing inputs', () => {
  const rows = [{ id: 'a', slug: 'stravect' }, { id: 'b', slug: 'STRAVECT' }, { id: 'c', slug: null }, { id: 'd', slug: 'app' }];
  const before = JSON.stringify(rows); const report = auditWorkspaceSlugs(rows);
  assert.equal(report.checked, 4); assert.equal(report.problems.length, 4); assert.equal(JSON.stringify(rows), before);
  assert.deepEqual(auditWorkspaceSlugs([{ id: 'x', slug: 'valid-business' }]), { checked: 1, problems: [] });
});
test('readable suggestions and owner-selected addresses share canonical validation without changing legacy labels', () => {
  const { suggestWorkspaceSlug, selectedWorkspaceSlugMessage }=require('../src/lib/routing/workspace-slug.ts');
  for(const [name,slug]of [['Stravect Systems','stravect-systems'],['Savannah Space','savannah-space'],['Blue Horizon Consulting','blue-horizon-consulting'],[' My Business! ','my-business'],['中文','workspace']])assert.equal(suggestWorkspaceSlug(name),slug);
  assert.equal(suggestWorkspaceSlug('App'),'app-workspace');
  assert.equal(suggestWorkspaceSlug('A'.repeat(120)).length,63);
  for(const slug of ['stravect','savannah','abc','a'.repeat(63)])assert.equal(selectedWorkspaceSlugMessage(slug),null);
  for(const slug of ['ab','UPPER',' a-business','a-business ','a_b','a.b','a..b','https://abc','xn--abc','a'.repeat(64)])assert.ok(selectedWorkspaceSlugMessage(slug));
  for(const slug of ['login','security','app','static','staging'])assert.match(selectedWorkspaceSlugMessage(slug),/reserved/);
  assert.equal(workspaceSlugProblem('ab'),null); // Existing short labels still route.
});
