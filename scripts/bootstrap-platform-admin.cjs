/* eslint-disable @typescript-eslint/no-require-imports -- privileged Node CLI loads its TypeScript runtime explicitly */
// Privileged operator CLI. Never exposed as a web endpoint. Dry-run by default.
require('dotenv').config({ quiet: true });
const Module = require('node:module');
const path = require('node:path');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'Node' } });
const original = Module._load;
Module._load = function(name, parent, main) {
  if (name === 'server-only') return {};
  if (name.startsWith('@/')) name = path.resolve(__dirname, '../src', name.slice(2));
  return original.call(this, name, parent, main);
};
const { prisma } = require('../src/server/db/prisma.ts');
async function main() {
  const args = process.argv.slice(2);
  const arg = name => args[args.indexOf(name) + 1];
  const externalId = args.includes('--clerk-user') ? arg('--clerk-user') : '';
  const reason = args.includes('--reason') ? arg('--reason') : '';
  if (!/^user_[a-zA-Z0-9]+$/.test(externalId) || reason.trim().length < 10) throw new Error('Provide --clerk-user user_... and a documented --reason (at least 10 characters).');
  if (process.env.NODE_ENV === 'production') throw new Error('Production bootstrap requires a separately reviewed operator procedure; this CLI is development/staging only.');
  const database = new URL(process.env.DATABASE_URL || 'invalid:');
  if (!['localhost', '127.0.0.1'].includes(database.hostname) || !/^\/(?:core_ops_db|coreops_auth_rehearsal_[a-z0-9_]+)$/.test(database.pathname)) throw new Error('This bootstrap CLI is restricted to approved local development/rehearsal databases.');
  const { createClerkClient } = require('@clerk/backend');
  const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const identity = await client.users.getUser(externalId);
  const email = identity.emailAddresses.find(e => e.id === identity.primaryEmailAddressId);
  if (!email || email.verification?.status !== 'verified' || !identity.twoFactorEnabled || identity.banned || identity.locked) throw new Error('The existing Clerk identity must have a verified primary email, MFA, and an available account.');
  const user = await prisma.user.findUnique({ where: { externalId } });
  if (!user || user.email.toLowerCase() !== email.emailAddress.toLowerCase()) throw new Error('A matching existing CoreOps identity is required; no user is provisioned or linked here.');
  if (!args.includes('--execute')) { console.log('Dry run passed. No role was granted. Review the target and rerun with --execute.'); return; }
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`LOCK TABLE "PlatformAdmin" IN EXCLUSIVE MODE`;
    if (await tx.platformAdmin.count()) throw new Error('Initial bootstrap is already complete. No administrator was changed.');
    const admin = await tx.platformAdmin.create({ data: { userId: user.id, role: 'SUPER_ADMIN' } });
    await tx.platformAuditEvent.create({ data: { actorAdminId: admin.id, action: 'INITIAL_SUPER_ADMIN_BOOTSTRAPPED', resourceType: 'PlatformAdmin', resourceId: admin.id, reason: reason.trim(), metadata: { mechanism: 'PRIVILEGED_OPERATOR_CLI' } } });
  });
  console.log('Initial super administrator created and audited. No workspace access was granted.');
}
main().catch(() => { console.error('Bootstrap failed. Verify the environment, identity, MFA, and bootstrap state. No sensitive provider details are logged.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
