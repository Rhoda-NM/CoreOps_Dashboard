// Real PostgreSQL integration tests; only request identity/headers are replaced.
// Run against an isolated migrated database, never a customer database.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AsyncLocalStorage } = require('node:async_hooks');
const { randomUUID } = require('node:crypto');
const Module = require('node:module');
const path = require('node:path');
const target=process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
if (!target || !['localhost','127.0.0.1','[::1]'].includes(target.hostname) || !/^\/coreops_auth_rehearsal_/.test(target.pathname) || process.env.VERCEL || process.env.VERCEL_ENV) throw new Error('Use an explicitly isolated loopback rehearsal database.');
global.fetch=async()=>{throw Error('Outbound provider calls forbidden in Phase 4B fixtures');};
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
  if (name === 'next/cache') return { revalidatePath: () => { if(request.getStore()?.refreshFailure) throw Error('SYNTHETIC_CACHE_SECRET'); } };
  if (name === 'next/headers') return { headers: async () => new Headers({ host: 'localhost:3000', ...(request.getStore()?.slug ? { 'x-coreops-workspace': request.getStore().slug, 'x-coreops-path': `/w/${request.getStore().slug}/dashboard` } : {}), ...(request.getStore()?.headers ?? {}) }), cookies: async () => ({ get: () => request.getStore()?.selected ? { value: request.getStore().selected } : undefined }) };
  if (name === '@clerk/nextjs/server') return { auth: async()=>({userId:request.getStore()?.user?.externalId??null}), currentUser: async()=>profile() };
  if(name.endsWith('/clerk-identity')) return {requireClerkIdentity:async()=>{if(!request.getStore()?.user||request.getStore()?.unverified)throw Error('Synthetic identity unavailable');return profile();}};
  if (name.startsWith('@/')) name = path.resolve(__dirname, '../src', name.slice(2));
  return load.call(this, name, parent, main);
};
function profile(){const c=request.getStore();return {id:c?.providerId??c?.user?.externalId,emailAddresses:[{emailAddress:c?.user?.email,verification:{status:c?.unverified?'unverified':'verified'}}]};}
const { prisma } = require('../src/server/db/prisma.ts');
const memberships=require('../src/server/services/memberships.service.ts');
const {getInvitationView}=require('../src/server/services/invitation-view.service.ts');
const {getAuditActivity}=require('../src/server/services/activity.service.ts');
const {loadOlderActivity}=require('../src/features/activity/actions.ts');
const {paidWorkspace,cleanupCommercial}=require('./commercial-fixtures.cjs');
const {createHash}=require('node:crypto');
const id=()=>`phase4b-${randomUUID()}`,hash=token=>createHash('sha256').update(token).digest('hex');
const run=(user,workspace,fn,extra={})=>request.run({user,slug:workspace?.slug,...extra},fn);

test('Phase 4B invitation and paginated audit history',async t=>{
 const users=[],workspaces=[],offers=[];
 const newUser=async()=>{const u=await prisma.user.create({data:{id:id(),externalId:id(),email:id()+'@example.test'}});users.push(u);return u;};
 const newWorkspace=async()=>{const w=await prisma.workspace.create({data:{id:id(),slug:id(),name:'A long synthetic invitation workspace'}});workspaces.push(w);return w;};
 const invite=async(owner,w,recipient)=>run(owner,w,()=>memberships.createInvitation({email:recipient.email,role:'STAFF'}));
 try{
  const owner=await newUser(),manager=await newUser(),staff=await newUser(),recipient=await newUser(),wrong=await newUser(),fresh=await newUser();
  const a=await newWorkspace(),b=await newWorkspace();offers.push(await paidWorkspace(prisma,a,owner),await paidWorkspace(prisma,b,owner));
  for(const [user,w,role] of [[owner,a,'OWNER'],[owner,b,'OWNER'],[manager,a,'MANAGER'],[staff,a,'STAFF'],[recipient,b,'STAFF']])await prisma.workspaceMember.create({data:{userId:user.id,workspaceId:w.id,role}});
  const invitation=await invite(owner,a,recipient);
  await t.test('anonymous metadata is minimal; authenticated verified recipient sees actual details',async()=>{
   const stored=await prisma.workspaceInvitation.findUniqueOrThrow({where:{id:invitation.id}});assert.equal(stored.tokenHash,hash(invitation.token));assert.notEqual(stored.tokenHash,invitation.token);
   const before=await prisma.workspaceMember.count();const anonymous=await run(null,null,()=>getInvitationView(invitation.token));assert.equal(anonymous.state,'SIGN_IN');for(const field of ['email','workspaceName','role','workspaceId','id','tokenHash'])assert.equal(anonymous[field],undefined);assert.ok(anonymous.maskedEmail.includes('•••'));
   const correct=await run(recipient,null,()=>getInvitationView(invitation.token));assert.equal(correct.state,'READY');assert.equal(correct.email,recipient.email);assert.equal(correct.workspaceName,a.name);assert.equal(correct.role,'STAFF');assert.equal(correct.expiresAt,stored.expiresAt.toISOString());assert.equal(await prisma.workspaceMember.count(),before);
  });
  await t.test('wrong identity and unverified email reveal no private details and cannot accept',async()=>{
   for(const [user,extra] of [[wrong,{}],[recipient,{unverified:true}]])await run(user,null,async()=>{const view=await getInvitationView(invitation.token);assert.equal(view.state,extra.unverified?'ACCOUNT_UNAVAILABLE':'WRONG_ACCOUNT');assert.equal(view.email,undefined);assert.equal(view.workspaceName,undefined);await assert.rejects(memberships.acceptInvitation(invitation.token));},extra);
  });
  await t.test('explicit acceptance, concurrent retries and replay preserve one membership/audit and other workspace',()=>run(recipient,b,async()=>{
   const count=await prisma.workspace.count(),subs=await prisma.subscription.count();const results=await Promise.all(Array.from({length:8},()=>memberships.acceptInvitation(invitation.token)));assert.ok(results.every(w=>w===a.id));
   const member=await prisma.workspaceMember.findUniqueOrThrow({where:{userId_workspaceId:{userId:recipient.id,workspaceId:a.id}}});assert.equal(member.role,'STAFF');assert.equal(await prisma.auditLog.count({where:{workspaceId:a.id,resourceId:member.id,action:'INVITATION_ACCEPTED'}}),1);
   assert.equal(await prisma.workspace.count(),count);assert.equal(await prisma.subscription.count(),subs);assert.ok(await prisma.workspaceMember.findUnique({where:{userId_workspaceId:{userId:recipient.id,workspaceId:b.id}}}));
   const view=await getInvitationView(invitation.token);assert.equal(view.state,'ACCEPTED');assert.ok(view.continuation.includes(a.slug));await memberships.acceptInvitation(invitation.token);
   const foreign=await run(wrong,null,()=>getInvitationView(invitation.token));assert.equal(foreign.state,'WRONG_ACCOUNT');await run(wrong,null,()=>assert.rejects(memberships.acceptInvitation(invitation.token)));
  }));
  await t.test('newly provisioned account joins existing workspace; posted role/workspace cannot override',()=>run(fresh,null,async()=>{
   const inv=await invite(owner,a,fresh);const before=await prisma.workspace.count();assert.equal((await getInvitationView(inv.token)).state,'READY');
   // The service accepts only the token; extra client fields cannot supply authority.
   await memberships.acceptInvitation(inv.token,{role:'OWNER',workspaceId:b.id,email:wrong.email});const member=await prisma.workspaceMember.findUniqueOrThrow({where:{userId_workspaceId:{userId:fresh.id,workspaceId:a.id}}});assert.equal(member.role,'STAFF');assert.equal(await prisma.workspace.count(),before);
  }));
  await t.test('expired, revoked, malformed and manipulated invitations fail safely',async()=>{
   const expUser=await newUser(),exp=await invite(owner,a,expUser);await prisma.workspaceInvitation.update({where:{id:exp.id},data:{expiresAt:new Date(Date.now()-1000)}});assert.equal((await run(expUser,null,()=>getInvitationView(exp.token))).state,'EXPIRED');await run(expUser,null,()=>assert.rejects(memberships.acceptInvitation(exp.token)));
   const rev=await invite(owner,a,expUser);await run(owner,a,()=>memberships.revokeInvitation(rev.id));assert.equal((await run(expUser,null,()=>getInvitationView(rev.token))).state,'UNAVAILABLE');await run(expUser,null,()=>assert.rejects(memberships.acceptInvitation(rev.token)));
   for(const token of ['', 'a'.repeat(1000),'../../secret','a'.repeat(43),invitation.token.slice(0,-1)+'!']){assert.equal((await run(null,null,()=>getInvitationView(token))).state,'UNAVAILABLE');await run(recipient,null,()=>assert.rejects(memberships.acceptInvitation(token)));}
  });
  await t.test('suspended member and accepted invitation without this identity membership are denied',async()=>{
   await prisma.workspaceMember.update({where:{userId_workspaceId:{userId:recipient.id,workspaceId:a.id}},data:{status:'SUSPENDED'}});assert.equal((await run(recipient,null,()=>getInvitationView(invitation.token))).state,'SUSPENDED');await run(recipient,null,()=>assert.rejects(memberships.acceptInvitation(invitation.token)));
   const inv=await invite(owner,a,wrong);await prisma.workspaceInvitation.update({where:{id:inv.id},data:{status:'ACCEPTED'}});assert.equal((await run(wrong,null,()=>getInvitationView(inv.token))).state,'UNAVAILABLE');await run(wrong,null,()=>assert.rejects(memberships.acceptInvitation(inv.token)));
  });
  await t.test('capacity exhaustion and subscription denial retain service checks',async()=>{
   const c=await newWorkspace();offers.push(await paidWorkspace(prisma,c,owner));await prisma.workspaceMember.create({data:{workspaceId:c.id,userId:owner.id,role:'OWNER'}});
   const inv=await invite(owner,c,wrong);
   // Lowering no limits: instead replace this disposable paid fixture with a
   // one-seat reviewed period, preserving all financial SQL checks.
   const period=await prisma.subscriptionPeriod.findFirstOrThrow({where:{workspaceId:c.id}});await prisma.subscriptionPeriod.delete({where:{id:period.id}});await prisma.subscriptionPeriod.create({data:{...period,memberLimit:1}});
   assert.equal((await run(wrong,null,()=>getInvitationView(inv.token))).state,'RESTRICTED');await run(wrong,null,()=>assert.rejects(memberships.acceptInvitation(inv.token)));
   await prisma.workspace.update({where:{id:c.id},data:{activationStatus:'SUSPENDED'}});assert.equal((await run(wrong,null,()=>getInvitationView(inv.token))).state,'RESTRICTED');await run(wrong,null,()=>assert.rejects(memberships.acceptInvitation(inv.token)));
  });
  await t.test('activity empty, fewer than five, exactly five and bounded first page',()=>run(owner,b,async()=>{
   await prisma.auditLog.deleteMany({where:{workspaceId:b.id}});assert.deepEqual((await getAuditActivity()).events,[]);
   const date=new Date('2026-01-01T00:00:00.000Z');const add=n=>prisma.auditLog.createMany({data:Array.from({length:n},()=>({id:id(),workspaceId:b.id,actorUserId:owner.id,action:'TASK_CREATED',resourceType:'Task',resourceId:id(),createdAt:date}))});
   await add(3);let page=await getAuditActivity();assert.equal(page.events.length,3);assert.equal(page.nextCursor,null);await add(2);page=await getAuditActivity();assert.equal(page.events.length,5);assert.equal(page.nextCursor,null);await add(1);page=await getAuditActivity();assert.equal(page.events.length,5);assert.ok(page.nextCursor);
  }));
  await t.test('more than 100 events, timestamp ties and concurrent insertion: no skips or duplicates',()=>run(owner,b,async()=>{
   await prisma.auditLog.createMany({data:Array.from({length:123},(_,n)=>({id:id(),workspaceId:b.id,actorUserId:owner.id,action:'TASK_CREATED',resourceType:'Task',resourceId:id(),createdAt:new Date(n<60?'2026-01-01T00:00:00Z':'2025-12-31T00:00:00Z')}))});
   const expected=await prisma.auditLog.findMany({where:{workspaceId:b.id},orderBy:[{createdAt:'desc'},{id:'desc'}],select:{id:true}});let page=await getAuditActivity(),all=[...page.events];const first=page;
   const inserted=await prisma.auditLog.create({data:{workspaceId:b.id,actorUserId:owner.id,action:'TASK_CREATED',resourceType:'Task',resourceId:id()}});
   let requests=0;while(page.nextCursor){const result=await loadOlderActivity(page.nextCursor);assert.equal(result.success,true);page=result.page;assert.ok(page.events.length<=20);all.push(...page.events);assert.ok(++requests<20);}
   assert.deepEqual(all.map(e=>e.id),expected.map(e=>e.id));assert.equal(new Set(all.map(e=>e.id)).size,expected.length);assert.equal(all.length,129);assert.equal((await getAuditActivity()).events[0].id,inserted.id);
   assert.ok(all.every(e=>Object.keys(e).sort().join(',')==='action,createdAt,id,resourceId,resourceType'));
   for(const user of [manager,staff]){await run(user,a,()=>assert.rejects(getAuditActivity()));assert.equal((await run(user,a,()=>loadOlderActivity(first.nextCursor))).success,false);}
   assert.equal((await run(owner,a,()=>loadOlderActivity(first.nextCursor))).success,false);
   for(const cursor of ['',null,'a'.repeat(513),'not-base64!!',Buffer.from(JSON.stringify({v:1,id:expected[0].id,at:'2020-01-01T00:00:00.000Z',workspaceId:b.id})).toString('base64url')])assert.equal((await loadOlderActivity(cursor)).success,false);
   assert.equal((await run(null,b,()=>loadOlderActivity(first.nextCursor))).success,false);assert.equal(await prisma.auditLog.count({where:{workspaceId:b.id}}),130);
  }));
 }finally{
  const ids=workspaces.map(w=>w.id),uids=users.map(u=>u.id),where={workspaceId:{in:ids}};
  await prisma.auditLog.deleteMany({where});await prisma.workspaceInvitation.deleteMany({where});await cleanupCommercial(prisma,ids,uids,offers);await prisma.workspace.deleteMany({where:{id:{in:ids}}});await prisma.user.deleteMany({where:{id:{in:uids}}});await prisma.$disconnect();
 }
});
