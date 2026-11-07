// Real database provisioning tests with the Clerk identity boundary replaced.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AsyncLocalStorage } = require('node:async_hooks');
const { randomUUID } = require('node:crypto');
const Module = require('node:module');
const path = require('node:path');
if (!process.env.DATABASE_URL || !new URL(process.env.DATABASE_URL).pathname.includes('coreops_auth_rehearsal')) throw new Error('Use an isolated coreops_auth_rehearsal database.');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'Node' } });
const request = new AsyncLocalStorage();
const load = Module._load;
Module._load = function(name, parent, main) {
  if (name === 'server-only') return {};
  if (name === '@clerk/nextjs/server') return {
    auth: async () => ({ userId: request.getStore()?.id, sessionId: request.getStore()?.id ? 'test-session' : null }),
    currentUser: async () => { const profile = request.getStore(); if (profile?.providerError) throw { status: profile.providerError }; return profile?.deleted ? null : profile; },
    clerkClient: async () => ({ sessions: { getSession: async () => ({ userId: request.getStore()?.sessionUserId ?? request.getStore()?.id, status: request.getStore()?.sessionStatus ?? 'active', expireAt: request.getStore()?.sessionExpireAt ?? Date.now() + 3600000 }) } }),
  };
  if (name.startsWith('@/')) name = path.resolve(__dirname, '../src', name.slice(2));
  return load.call(this, name, parent, main);
};
const { prisma } = require('../src/server/db/prisma.ts');
const { getCurrentUser } = require('../src/server/auth/get-current-user.ts');
const { AccessError } = require('../src/server/authorization/errors.ts');
const prefix = `identity-test-${randomUUID()}`;
const profile = (id, email, verified = true) => ({ id, firstName: 'Test', lastName: 'Person', imageUrl: 'https://example.test/avatar.png', primaryEmailAddress: { emailAddress: email, verification: { status: verified ? 'verified' : 'unverified' } } });
const run = p => request.run(p, getCurrentUser);

test('identity provisioning preserves verified external bindings', async t => {
  const workspaceIds = [];
  try {
    const p = profile(`${prefix}-external`, `${prefix}@example.test`);
    await t.test('20 simultaneous first requests provision exactly one user', async () => {
      const users = await Promise.all(Array.from({ length: 20 }, () => run(p)));
      assert.equal(new Set(users.map(u => u.id)).size, 1);
      assert.equal(await prisma.user.count({ where: { externalId: p.id } }), 1);
    });
    await t.test('existing identity synchronizes verified profile without changing ownership', async () => {
      const before = await run(p);
      const after = await run({ ...p, firstName: 'Updated' });
      assert.equal(after.id, before.id);
      assert.equal(after.externalId, p.id);
      assert.equal(after.name, 'Updated Person');
    });
    await t.test('unverified signup is denied', async () => {
      await assert.rejects(run(profile(`${prefix}-unverified`, `${prefix}-unverified@example.test`, false)), e => e instanceof AccessError);
    });
    await t.test('email collision never takes over a different external binding', async () => {
      await assert.rejects(run(profile(`${prefix}-attacker`, p.primaryEmailAddress.emailAddress)), e => e instanceof AccessError && e.code === 'CONFLICT');
      assert.equal((await prisma.user.findUnique({ where: { email: p.primaryEmailAddress.emailAddress } })).externalId, p.id);
    });
    await t.test('legacy email record requires explicit linking instead of automatic reassignment', async () => {
      const legacy = await prisma.user.create({ data: { email: `${prefix}-legacy@example.test` } });
      await assert.rejects(run(profile(`${prefix}-new`, legacy.email)), e => e instanceof AccessError && e.code === 'CONFLICT');
      assert.equal((await prisma.user.findUnique({ where: { id: legacy.id } })).externalId, null);
    });
    await t.test('unverified changes, revoked/expired/mismatched sessions, deleted/banned identities and provider failures fail closed', async () => {
      for (const overrides of [{ sessionStatus: 'revoked' }, { sessionExpireAt: 1 }, { sessionUserId: 'different-user' }, { deleted: true }, { banned: true }, { locked: true }, { providerError: 404 }, { providerError: 429 }, { providerError: 500 }]) {
        await assert.rejects(run({ ...p, ...overrides }), e => e instanceof AccessError && !e.message.includes(p.primaryEmailAddress.emailAddress));
      }
      const unverified = profile(p.id, `${prefix}-unverified-change@example.test`, false);
      await assert.rejects(run(unverified), e => e instanceof AccessError);
      assert.equal((await prisma.user.findUnique({ where: { externalId: p.id } })).email, p.primaryEmailAddress.emailAddress);
    });
    await t.test('case variants of a legacy email cannot create a second internal identity', async () => {
      const legacy = await prisma.user.create({ data: { email: `${prefix}-case@example.test`.toUpperCase() } });
      await assert.rejects(run(profile(`${prefix}-case-external`, legacy.email.toLowerCase())), e => e instanceof AccessError && e.code === 'CONFLICT');
      assert.equal((await prisma.user.findUnique({ where: { id: legacy.id } })).externalId, null);
    });
    await t.test('verified email and authentication-method changes preserve identity, workspaces, roles and assignments', async () => {
      const before = await run(p);
      assert.equal(await prisma.workspaceMember.count({ where: { userId: before.id } }), 0, 'sign-in must not create a workspace');
      const a = await prisma.workspace.create({ data: { name: 'Identity A', slug: `${prefix}-a` } });
      const b = await prisma.workspace.create({ data: { name: 'Identity B', slug: `${prefix}-b` } });
      workspaceIds.push(a.id, b.id);
      const membership = await prisma.workspaceMember.create({ data: { userId: before.id, workspaceId: a.id, role: 'OWNER' } });
      await prisma.workspaceMember.create({ data: { userId: before.id, workspaceId: b.id, role: 'STAFF' } });
      const client = await prisma.client.create({ data: { name: 'Fixture', workspaceId: a.id } });
      const project = await prisma.project.create({ data: { name: 'Fixture project', workspaceId: a.id, clientId: client.id } });
      await prisma.projectMember.create({ data: { workspaceId: a.id, projectId: project.id, memberId: membership.id } });
      const task = await prisma.task.create({ data: { title: 'Fixture task', workspaceId: a.id, projectId: project.id, assignedMemberId: membership.id } });
      p.primaryEmailAddress.emailAddress = `${prefix}-updated@example.test`;
      const after = await run({ ...p, authenticationMethod: 'google-linked-by-clerk' });
      assert.equal(after.id, before.id);
      assert.equal((await prisma.workspaceMember.findMany({ where: { userId: after.id } })).length, 2);
      assert.equal((await prisma.workspaceMember.findUnique({ where: { id: membership.id } })).role, 'OWNER');
      assert.equal((await prisma.task.findUnique({ where: { id: task.id } })).assignedMemberId, membership.id);
      assert.equal(await prisma.projectMember.count({ where: { memberId: membership.id } }), 1);
      assert.equal(await prisma.auditLog.count({ where: { workspaceId: a.id, action: 'IDENTITY_EMAIL_UPDATED' } }), 1);
    });
    await t.test('draft legal documents never create receipts; approved versions require explicit and idempotent acceptance', async () => {
      const { recordLegalAcceptance, requireCurrentLegalReceipt } = require('../src/server/auth/legal-acceptance.ts');
      const keys = ['COREOPS_LEGAL_DOCUMENTS_APPROVED', 'COREOPS_TERMS_EFFECTIVE_AT', 'COREOPS_PRIVACY_EFFECTIVE_AT', 'COREOPS_REQUIRE_LEGAL_ACCEPTANCE', 'COREOPS_TERMS_VERSION', 'COREOPS_PRIVACY_VERSION'];
      const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
      const versions = { termsVersion: 'TEST-TOS-v1', privacyVersion: 'TEST-PRIV-v1' };
      const u = await run(p);
      try {
        process.env.COREOPS_LEGAL_DOCUMENTS_APPROVED = 'false';
        await assert.rejects(request.run(p, () => recordLegalAcceptance(true, versions)), e => e instanceof AccessError);
        assert.equal(await prisma.legalAcceptance.count({ where: { userId: u.id } }), 0);
        process.env.COREOPS_LEGAL_DOCUMENTS_APPROVED = 'true';
        process.env.COREOPS_TERMS_EFFECTIVE_AT = '2020-01-01T00:00:00Z';
        process.env.COREOPS_PRIVACY_EFFECTIVE_AT = '2020-01-01T00:00:00Z';
        process.env.COREOPS_TERMS_VERSION = versions.termsVersion;
        process.env.COREOPS_PRIVACY_VERSION = versions.privacyVersion;
        await assert.rejects(request.run(p, () => recordLegalAcceptance(false, versions)), e => e instanceof AccessError);
        await assert.rejects(request.run(p, () => recordLegalAcceptance(true, { ...versions, termsVersion: 'STALE-VERSION' })), e => e instanceof AccessError);
        const receipts = await Promise.all(Array.from({ length: 10 }, () => request.run({ ...p, legalAcceptedAt: 1 }, () => recordLegalAcceptance(true, versions))));
        assert.equal(await prisma.legalAcceptance.count({ where: { userId: u.id } }), 1);
        assert.equal(new Set(receipts.map(r => r.acceptedAt.toISOString())).size, 1);
        assert.equal(receipts[0].source, 'COREOPS_EXPLICIT');
        assert.equal(receipts[0].termsVersion, versions.termsVersion);
        assert.ok(receipts[0].acceptedAt.getTime() > 1, 'provider timestamp is not reused as explicit acceptance time');
        process.env.COREOPS_REQUIRE_LEGAL_ACCEPTANCE = 'true';
        process.env.COREOPS_TERMS_VERSION = 'TEST-TOS-v2';
        await assert.rejects(requireCurrentLegalReceipt(u.id), e => String(e.digest).includes('/account/legal'));
        assert.equal(await prisma.legalAcceptance.count({ where: { userId: u.id, termsVersion: 'TEST-TOS-v2' } }), 0);
      } finally {
        for (const key of keys) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; }
      }
    });
  } finally {
    await prisma.auditLog.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
    await prisma.task.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
    await prisma.projectMember.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
    await prisma.project.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
    await prisma.client.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
    await prisma.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: prefix, mode: 'insensitive' } } });
    await prisma.$disconnect();
  }
});
