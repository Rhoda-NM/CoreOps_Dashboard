// Real PostgreSQL integration tests; only request identity/headers are replaced.
// Run against an isolated migrated database, never a customer database.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AsyncLocalStorage } = require('node:async_hooks');
const { randomUUID } = require('node:crypto');
const Module = require('node:module');
const path = require('node:path');
if (!process.env.DATABASE_URL || !new URL(process.env.DATABASE_URL).pathname.includes('coreops_auth_rehearsal')) throw new Error('Use an isolated coreops_auth_rehearsal database for these tests.');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', jsx: 'react-jsx' } });
const request = new AsyncLocalStorage();
const load = Module._load;
Module._load = function(name, parent, main) {
  if (name === 'server-only') return {};
  if (name.endsWith('/get-current-user') || name === './get-current-user') return { getCurrentUser: async () => {
    const context = request.getStore();
    if (!context?.user) { const { AccessError } = require('../src/server/authorization/errors.ts'); throw new AccessError('UNAUTHENTICATED'); }
    return context.user;
  } };
  if (name === 'next/cache') return { revalidatePath: () => {} };
  if (name === 'next/headers') return { headers: async () => new Headers(request.getStore()?.slug ? { 'x-coreops-workspace': request.getStore().slug } : {}), cookies: async () => ({ get: () => request.getStore()?.selected ? { value: request.getStore().selected } : undefined }) };
  if (name === '@clerk/nextjs/server') return { currentUser: async () => ({ id: request.getStore()?.providerId ?? request.getStore()?.user?.externalId, emailAddresses: [{ emailAddress: request.getStore()?.user?.email, verification: { status: 'verified' } }] }) };
  if (name.startsWith('@/')) name = path.resolve(__dirname, '../src', name.slice(2));
  return load.call(this, name, parent, main);
};
const { prisma } = require('../src/server/db/prisma.ts');
const { getCurrentWorkspaceMembership } = require('../src/server/auth/get-current-workspace.ts');
const projects = require('../src/server/services/projects.service.ts');
const tasks = require('../src/server/services/tasks.service.ts');
const clients = require('../src/server/services/clients.service.ts');
const invoices = require('../src/server/services/invoices.service.ts');
const memberships = require('../src/server/services/memberships.service.ts');
const assignments = require('../src/server/services/assignments.service.ts');
const { getDashboardMetrics } = require('../src/server/services/dashboard.service.ts');
const { workspaceMutation } = require('../src/server/authorization/authorize.ts');
const { AccessError } = require('../src/server/authorization/errors.ts');
const id = () => `test-${randomUUID()}`;
const run = (user, workspace, fn) => request.run({ user, slug: workspace.slug }, fn);
const denied = promise => assert.rejects(promise, e => e instanceof AccessError || e.code === 'P2025');

test('workspace authorization and tenant integrity', async t => {
  const a = await prisma.workspace.create({ data: { id: id(), name: 'Authorization test A', slug: id() } });
  const b = await prisma.workspace.create({ data: { id: id(), name: 'Authorization test B', slug: id() } });
  const users = [];
  const extraWorkspaces = [];
  const commercialOffers = [];
  const { paidWorkspace, cleanupCommercial } = require('./commercial-fixtures.cjs');
  async function user() { const u = await prisma.user.create({ data: { id: id(), externalId: id(), email: `${id()}@example.test` } }); users.push(u); return u; }
  try {
    const owner = await user(), worker = await user(), outsider = await user(), teammate = await user();
    commercialOffers.push(await paidWorkspace(prisma, a, owner), await paidWorkspace(prisma, b, owner));
    const ownerA = await prisma.workspaceMember.create({ data: { userId: owner.id, workspaceId: a.id, role: 'OWNER' } });
    await prisma.workspaceMember.create({ data: { userId: owner.id, workspaceId: b.id, role: 'OWNER' } });
    const staff = await prisma.workspaceMember.create({ data: { userId: worker.id, workspaceId: a.id, role: 'STAFF' } });
    const manager = await prisma.workspaceMember.create({ data: { userId: worker.id, workspaceId: b.id, role: 'MANAGER' } });
    const otherStaff = await prisma.workspaceMember.create({ data: { userId: teammate.id, workspaceId: a.id, role: 'STAFF' } });
    const ca = await prisma.client.create({ data: { workspaceId: a.id, name: 'Private client A', email: 'private@example.test', phone: 'confidential' } });
    const cb = await prisma.client.create({ data: { workspaceId: b.id, name: 'Private client B' } });
    const pa = await prisma.project.create({ data: { workspaceId: a.id, clientId: ca.id, name: 'Assigned project', budget: '12345.67' } });
    const hidden = await prisma.project.create({ data: { workspaceId: a.id, clientId: ca.id, name: 'Hidden project' } });
    const pb = await prisma.project.create({ data: { workspaceId: b.id, clientId: cb.id, name: 'Other tenant project' } });
    await prisma.projectMember.create({ data: { workspaceId: a.id, projectId: pa.id, memberId: staff.id } });
    const mine = await prisma.task.create({ data: { workspaceId: a.id, projectId: pa.id, title: 'Assigned task', assignedMemberId: staff.id } });
    const shared = await prisma.task.create({ data: { workspaceId: a.id, projectId: pa.id, title: 'Team-visible task', teamVisible: true } });
    const secret = await prisma.task.create({ data: { workspaceId: a.id, projectId: pa.id, title: 'Unassigned confidential task' } });
    const invoiceA = await prisma.invoice.create({ data: { workspaceId: a.id, clientId: ca.id, invoiceNo: id(), amount: '9999', status: 'PAID' } });
    const invoiceB = await prisma.invoice.create({ data: { workspaceId: b.id, clientId: cb.id, invoiceNo: id(), amount: '8888' } });

    await t.test('unauthenticated, nonmember, and missing workspace contexts are denied', async () => {
      await denied(run(null, a, getCurrentWorkspaceMembership));
      await denied(run(outsider, a, getCurrentWorkspaceMembership));
      await denied(run(owner, {}, getCurrentWorkspaceMembership));
    });
    await t.test('one identity receives different permissions in each workspace', async () => {
      await denied(run(worker, a, () => clients.createClient({ name: 'Not allowed' })));
      const created = await run(worker, b, () => clients.createClient({ name: 'Manager allowed' }));
      assert.equal(created.workspaceId, b.id);
      await denied(run(worker, b, () => invoices.getInvoices()));
    });
    await t.test('staff see assigned projects, assigned tasks and explicit team tasks only', async () => {
      const visible = await run(worker, a, () => projects.getProjects());
      assert.deepEqual(visible.map(p => p.id), [pa.id]);
      assert.equal(await run(worker, a, () => projects.getProjectById(hidden.id)), null);
      assert.equal(await run(worker, a, () => projects.getProjectById(pb.id)), null);
      assert.equal('budget' in visible[0], false);
      assert.equal('email' in visible[0].client, false);
      assert.deepEqual(visible[0].invoices, []);
      const ts = await run(worker, a, () => tasks.getTasks());
      assert.deepEqual(new Set(ts.map(t => t.id)), new Set([mine.id, shared.id]));
      assert.equal('email' in ts[0].project.client, false);
      await run(worker, a, () => tasks.updateTaskStatus({ taskId: mine.id, status: 'DONE' }));
      await denied(run(worker, a, () => tasks.updateTaskStatus({ taskId: shared.id, status: 'DONE' })));
      await denied(run(worker, a, () => tasks.updateTaskStatus({ taskId: secret.id, status: 'DONE' })));
      await denied(run(worker, a, () => projects.updateProjectStatus({ projectId: pa.id, status: 'COMPLETED' })));
    });
    await t.test('cross-tenant reads, writes, searches and totals are scoped', async () => {
      assert.equal(await run(owner, a, () => projects.getProjectById(pb.id)), null);
      await denied(run(owner, a, () => projects.updateProjectStatus({ projectId: pb.id, status: 'PAUSED' })));
      assert.equal((await run(owner, a, () => clients.getClients({ query: 'Private client B' }))).length, 0);
      const metrics = await run(owner, a, getDashboardMetrics);
      assert.equal(metrics.revenueThisMonth, 9999);
      const restricted = await run(worker, a, getDashboardMetrics);
      assert.equal(restricted.revenueThisMonth, null);
      assert.equal(restricted.outstandingInvoices, null);
      assert.deepEqual(restricted.recentInvoices, []);
      const managerMetrics = await run(worker, b, getDashboardMetrics);
      assert.equal(managerMetrics.revenueThisMonth, null);
    });
    await t.test('serialized service data and dashboard HTML omit unauthorized financial and contact sentinels', async () => {
      const { renderToStaticMarkup } = require('react-dom/server');
      const DashboardPage = require('../src/app/w/[workspaceSlug]/dashboard/page.tsx').default;
      const staffData = await run(worker, a, async () => ({
        projects: await projects.getProjects(), detail: await projects.getProjectById(pa.id), tasks: await tasks.getTasks(), metrics: await getDashboardMetrics(),
      }));
      const serialized = JSON.stringify(staffData);
      for (const sentinel of [ca.email, ca.phone, '12345.67', invoiceA.invoiceNo, secret.title, hidden.name, pb.name]) assert.equal(serialized.includes(sentinel), false);
      const managerData = await run(worker, b, async () => ({ client: await clients.getClientById(cb.id), project: await projects.getProjectById(pb.id), metrics: await getDashboardMetrics() }));
      assert.equal(JSON.stringify(managerData).includes(invoiceB.invoiceNo), false);
      for (const [actor, workspace, financialAllowed] of [[owner, a, true], [worker, a, false], [worker, b, false]]) {
        const html = await run(actor, workspace, async () => renderToStaticMarkup(await DashboardPage()));
        assert.equal(html.includes('Revenue This Month'), financialAllowed);
        assert.equal(html.includes('Outstanding Invoices'), financialAllowed);
        assert.equal(html.includes(invoiceA.invoiceNo), financialAllowed);
      }
    });
    await t.test('parallel workspace requests and legacy selection cookies do not cross tenant contexts', async () => {
      const { legacyWorkspacePath } = require('../src/server/auth/legacy-workspace.ts');
      const { getActiveMemberships } = require('../src/server/auth/get-current-workspace.ts');
      const WorkspaceSelector = require('../src/app/dashboard/page.tsx').default;
      const { WorkspaceSwitcher } = require('../src/components/workspaces/WorkspaceSwitcher.tsx');
      const { renderToStaticMarkup } = require('react-dom/server');
      const multi = await run(worker, a, WorkspaceSelector);
      assert.equal(multi.props.children.filter(child => Array.isArray(child)).flat().length, 2);
      assert.equal(renderToStaticMarkup(require('react').createElement(WorkspaceSwitcher, { current: a.slug, workspaces: [{ slug: a.slug, name: a.name }] })), '');
      const switcher = renderToStaticMarkup(require('react').createElement(WorkspaceSwitcher, { current: a.slug, workspaces: [{ slug: a.slug, name: a.name }, { slug: b.slug, name: b.name }] }));
      assert.equal((switcher.match(/<option /g) || []).length, 2);
      const [tabA, tabB] = await Promise.all([
        run(worker, a, () => projects.getProjects()), run(worker, b, () => projects.getProjects()),
      ]);
      assert.deepEqual(tabA.map(p => p.id), [pa.id]);
      assert.deepEqual(tabB.map(p => p.id), [pb.id]);
      assert.equal(await run(worker, a, () => legacyWorkspacePath('/projects')), '/dashboard');
      const selected = await request.run({ user: worker, slug: a.slug, selected: b.slug }, () => legacyWorkspacePath('/projects'));
      assert.equal(selected, `/w/${b.slug}/projects`);
      const forged = await request.run({ user: outsider, selected: a.slug }, () => legacyWorkspacePath('/projects'));
      assert.equal(forged, '/onboarding');
      await run(owner, b, () => memberships.changeMembership(manager.id, { status: 'SUSPENDED' }));
      const active = await run(worker, a, getActiveMemberships);
      assert.equal(active.length, 1);
      await assert.rejects(run(worker, a, WorkspaceSelector), e => String(e.digest).includes(`/w/${a.slug}/dashboard`));
      await assert.rejects(run(outsider, a, WorkspaceSelector), e => String(e.digest).includes('/onboarding'));
      assert.equal(await request.run({ user: worker, selected: b.slug }, () => legacyWorkspacePath('/projects')), `/w/${a.slug}/projects`);
      await run(owner, b, () => memberships.changeMembership(manager.id, { status: 'ACTIVE' }));
    });
    await t.test('authorized server action results contain no business records and unauthorized actions reject', async () => {
      const { updateTaskStatusAction } = require('../src/features/tasks/actions/update-task-status.ts');
      const { updateInvoiceStatusAction } = require('../src/features/invoices/actions/update-invoice-status.ts');
      assert.deepEqual(await run(worker, a, () => updateTaskStatusAction(pa.id, mine.id, 'DONE')), { success: true });
      assert.deepEqual(await run(owner, a, () => updateInvoiceStatusAction(invoiceA.id, 'PAID')), { success: true });
      await denied(run(worker, b, () => updateInvoiceStatusAction(invoiceB.id, 'PAID')));
      await denied(run(worker, a, () => updateTaskStatusAction(pa.id, secret.id, 'DONE')));
    });
    await t.test('suspended members immediately lose reads and writes', async () => {
      await run(owner, a, () => memberships.changeMembership(staff.id, { status: 'SUSPENDED' }));
      await denied(run(worker, a, () => projects.getProjects()));
      await denied(run(worker, a, () => tasks.updateTaskStatus({ taskId: mine.id, status: 'TODO' })));
      await run(owner, a, () => memberships.changeMembership(staff.id, { status: 'ACTIVE' }));
    });
    await t.test('compound foreign keys reject cross-tenant relationships', async () => {
      for (const operation of [
        () => prisma.project.create({ data: { workspaceId: a.id, clientId: cb.id, name: 'Invalid' } }),
        () => prisma.task.create({ data: { workspaceId: a.id, projectId: pb.id, title: 'Invalid' } }),
        () => prisma.invoice.create({ data: { workspaceId: a.id, clientId: cb.id, invoiceNo: id(), amount: '1' } }),
        () => prisma.invoice.create({ data: { workspaceId: a.id, clientId: ca.id, projectId: pb.id, invoiceNo: id(), amount: '1' } }),
        () => prisma.projectMember.create({ data: { workspaceId: a.id, projectId: pa.id, memberId: manager.id } }),
        () => prisma.task.update({ where: { id: mine.id }, data: { assignedMemberId: manager.id } }),
      ]) await assert.rejects(operation(), e => e.code === 'P2003');
    });
    await t.test('members cannot promote themselves; final active owner is protected', async () => {
      await denied(run(worker, a, () => memberships.changeMembership(staff.id, { role: 'OWNER' })));
      await denied(run(owner, a, () => memberships.changeMembership(ownerA.id, { role: 'MANAGER' })));
      await denied(run(owner, a, () => memberships.removeMembership(ownerA.id)));
      await denied(run(owner, a, () => memberships.changeMembership(ownerA.id, { status: 'SUSPENDED' })));
    });
    await t.test('assignment requires active same-workspace membership and staff project assignment', async () => {
      await denied(run(owner, a, () => assignments.assignTask(secret.id, otherStaff.id, false)));
      await run(owner, a, () => assignments.setProjectMember(pa.id, otherStaff.id, true));
      await run(owner, a, () => assignments.assignTask(secret.id, otherStaff.id, false));
      await denied(run(owner, a, () => assignments.setProjectMember(pa.id, otherStaff.id, false)));
      await denied(run(owner, a, () => assignments.assignTask(secret.id, manager.id, false)));
    });
    await t.test('concurrent suspension cannot bypass membership recheck inside write lock', async () => {
      let locked;
      const ready = new Promise(resolve => { locked = resolve; });
      let release;
      const gate = new Promise(resolve => { release = resolve; });
      const revocation = prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${b.id} FOR UPDATE`;
        await tx.workspaceMember.update({ where: { id: manager.id }, data: { status: 'SUSPENDED' } });
        locked(); await gate;
      });
      await ready;
      // Initial context can see the old active membership while lock is held.
      const initial = await run(worker, b, getCurrentWorkspaceMembership);
      assert.equal(initial.status, 'ACTIVE');
      const attempt = run(worker, b, () => clients.createClient({ name: 'Must not commit' }));
      const rejected = denied(attempt);
      release(); await revocation; await rejected;
      assert.equal(await prisma.client.count({ where: { workspaceId: b.id, name: 'Must not commit' } }), 0);
    });
    await t.test('concurrent last-owner demotions leave one active owner', async () => {
      await run(owner, a, () => memberships.changeMembership(staff.id, { role: 'OWNER' }));
      const results = await Promise.allSettled([
        run(owner, a, () => memberships.changeMembership(ownerA.id, { role: 'MANAGER' })),
        run(worker, a, () => memberships.changeMembership(staff.id, { role: 'MANAGER' })),
      ]);
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
      assert.equal(await prisma.workspaceMember.count({ where: { workspaceId: a.id, role: 'OWNER', status: 'ACTIVE' } }), 1);
      // Restore original owner directly for remaining test fixtures.
      await prisma.workspaceMember.update({ where: { id: ownerA.id }, data: { role: 'OWNER' } });
      await prisma.workspaceMember.update({ where: { id: staff.id }, data: { role: 'STAFF' } });
    });
    await t.test('concurrent assignment revocation prevents a stale staff write', async () => {
      let locked, release;
      const ready = new Promise(resolve => { locked = resolve; });
      const gate = new Promise(resolve => { release = resolve; });
      const revocation = run(owner, a, () => workspaceMutation('tasks:assign', async (tx, actor) => {
        await tx.task.update({ where: { id: mine.id, workspaceId: actor.workspaceId }, data: { assignedMemberId: null } });
        await tx.projectMember.deleteMany({ where: { projectId: pa.id, memberId: staff.id, workspaceId: actor.workspaceId } });
        locked(); await gate;
      }));
      await ready;
      const attempt = run(worker, a, () => tasks.updateTaskStatus({ taskId: mine.id, status: 'TODO' }));
      const rejected = denied(attempt);
      release(); await revocation; await rejected;
      assert.equal((await prisma.task.findUnique({ where: { id: mine.id } })).status, 'DONE');
    });
    await t.test('invitations verify identity and support safe replay without escalating an existing role', async () => {
      const invitation = await run(owner, a, () => memberships.createInvitation({ email: outsider.email, role: 'STAFF' }));
      await denied(run(teammate, a, () => memberships.acceptInvitation(invitation.token)));
      await denied(request.run({ user: outsider, slug: a.slug, providerId: 'mismatched-provider-identity' }, () => memberships.acceptInvitation(invitation.token)));
      assert.equal(await run(outsider, a, () => memberships.acceptInvitation(invitation.token)), a.id);
      assert.equal(await run(outsider, a, () => memberships.acceptInvitation(invitation.token)), a.id);
      assert.equal(await prisma.workspaceMember.count({ where: { userId: outsider.id, workspaceId: a.id } }), 1);
      const higher = await run(owner, a, () => memberships.createInvitation({ email: outsider.email, role: 'OWNER' }));
      await run(outsider, a, () => memberships.acceptInvitation(higher.token));
      assert.equal((await prisma.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: outsider.id, workspaceId: a.id } } })).role, 'STAFF');
      const revoked = await run(owner, a, () => memberships.createInvitation({ email: outsider.email, role: 'STAFF' }));
      await run(owner, a, () => memberships.revokeInvitation(revoked.id));
      await denied(run(outsider, a, () => memberships.acceptInvitation(revoked.token)));
      const expired = await run(owner, a, () => memberships.createInvitation({ email: outsider.email, role: 'STAFF' }));
      await prisma.workspaceInvitation.update({ where: { id: expired.id }, data: { expiresAt: new Date(0) } });
      await denied(run(outsider, a, () => memberships.acceptInvitation(expired.token)));
    });
    await t.test('concurrent initial onboarding creates one workspace, owner, and subscription', async () => {
      const newcomer = await user();
      const { createWorkspaceAction } = require('../src/features/workspaces/actions/create-workspace.ts');
      const form = new FormData(); form.set('name', 'Concurrent onboarding test');
      const results = await Promise.allSettled(Array.from({ length: 10 }, () => run(newcomer, {}, () => createWorkspaceAction({ error: '' }, form))));
      const createdMemberships = await prisma.workspaceMember.findMany({ where: { userId: newcomer.id } });
      extraWorkspaces.push(...createdMemberships.map(m => m.workspaceId));
      assert.equal(createdMemberships.length, 1);
      assert.equal(createdMemberships[0].role, 'OWNER');
      assert.equal(await prisma.subscription.count({ where: { workspaceId: createdMemberships[0].workspaceId } }), 1);
      assert.equal(results.every(r => r.status === 'rejected' && String(r.reason.digest).startsWith('NEXT_REDIRECT')), true);
    });
    await t.test('audit entry and administrative mutation share one transaction', async () => {
      assert.ok(await prisma.auditLog.count({ where: { workspaceId: a.id, action: 'MEMBERSHIP_CHANGED' } }) > 0);
      const before = await prisma.client.count({ where: { workspaceId: a.id } });
      await assert.rejects(run(owner, a, () => workspaceMutation('clients:create', async (tx, actor) => {
        await tx.client.create({ data: { workspaceId: actor.workspaceId, name: 'Rollback sentinel' } });
        throw new Error('simulate audit failure');
      })));
      assert.equal(await prisma.client.count({ where: { workspaceId: a.id } }), before);
    });
  } finally {
    // Cleanup only fixture-owned tenants, including restrictive financial FKs.
    const ids = [a.id, b.id, ...extraWorkspaces];
    await prisma.auditLog.deleteMany({ where: { workspaceId: { in: ids } } });
    await prisma.workspaceInvitation.deleteMany({ where: { workspaceId: { in: ids } } });
    await prisma.task.deleteMany({ where: { workspaceId: { in: ids } } });
    await prisma.invoice.deleteMany({ where: { workspaceId: { in: ids } } });
    await prisma.projectMember.deleteMany({ where: { workspaceId: { in: ids } } });
    await prisma.project.deleteMany({ where: { workspaceId: { in: ids } } });
    await prisma.client.deleteMany({ where: { workspaceId: { in: ids } } });
    await cleanupCommercial(prisma, ids, users.map(u => u.id), commercialOffers);
    await prisma.workspace.deleteMany({ where: { id: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: users.map(u => u.id) } } });
    await prisma.$disconnect();
  }
});
