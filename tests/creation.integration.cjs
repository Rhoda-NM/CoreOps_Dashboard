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
global.fetch=async()=>{throw Error('Outbound provider calls forbidden in creation fixtures');};
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
  if (name === '@clerk/nextjs/server') return { currentUser: async () => ({ id: request.getStore()?.providerId ?? request.getStore()?.user?.externalId, emailAddresses: [{ emailAddress: request.getStore()?.user?.email, verification: { status: 'verified' } }] }) };
  if (name.startsWith('@/')) name = path.resolve(__dirname, '../src', name.slice(2));
  return load.call(this, name, parent, main);
};
const { prisma } = require('../src/server/db/prisma.ts');
const { createRecord, creationOptions, canOpenCreation } = require('../src/features/creation/actions.ts');
const { paidWorkspace, cleanupCommercial } = require('./commercial-fixtures.cjs');
const id = () => `creation-${randomUUID()}`;
const form = data => { const f = new FormData(); for(const [key,value] of Object.entries(data)) f.set(key,value); return f; };
const run = (user, workspace, fn) => request.run({user,slug:workspace.slug},fn);
test('Phase 4A real isolated creation boundaries',async t=>{
 const users=[],workspaces=[],offers=[];
 const user=async()=>{const u=await prisma.user.create({data:{id:id(),externalId:id(),email:id()+'@example.test',name:'Synthetic teammate'}});users.push(u);return u;};
 const workspace=async()=>{const w=await prisma.workspace.create({data:{id:id(),slug:id(),name:'Synthetic creation workspace'}});workspaces.push(w);return w;};
 const logs=[],original=console.error;console.error=line=>logs.push(line);
 try{
  const owner=await user(),manager=await user(),staff=await user(),ineligible=await user(),outsider=await user();const a=await workspace(),b=await workspace();
  offers.push(await paidWorkspace(prisma,a,owner),await paidWorkspace(prisma,b,outsider));
  for(const [u,w,role] of [[owner,a,'OWNER'],[manager,a,'MANAGER'],[staff,a,'STAFF'],[ineligible,a,'STAFF'],[outsider,b,'OWNER']])await prisma.workspaceMember.create({data:{userId:u.id,workspaceId:w.id,role}});
  const staffMember=await prisma.workspaceMember.findUnique({where:{userId_workspaceId:{userId:staff.id,workspaceId:a.id}}});
  const badMember=await prisma.workspaceMember.findUnique({where:{userId_workspaceId:{userId:ineligible.id,workspaceId:a.id}}});
  let client,project,otherClient;
  await t.test('client validation preserves failure contract and actual creation/audit',()=>run(owner,a,async()=>{
   const invalid=await createRecord('client',form({name:'x',email:'bad'}));assert.equal(invalid.success,false);assert.ok(invalid.fields.name);assert.ok(invalid.fields.email);
   client=await createRecord('client',form({name:'Synthetic main contact',company:'Synthetic company',email:'contact@example.test',phone:''}));assert.equal(client.success,true);
   assert.equal((await prisma.client.findUnique({where:{id:client.id}})).workspaceId,a.id);
   assert.equal(await prisma.auditLog.count({where:{resourceId:client.id,action:'CLIENT_CREATED'}}),1);
  }));
  await t.test('global and contextual project creation share binding and reject foreign clients',()=>run(manager,a,async()=>{
   project=await createRecord('project',form({clientId:client.id,name:'Context project',description:'Test',budget:'120.35'}));assert.equal(project.success,true);
   const second=await createRecord('project',form({clientId:client.id,name:'Global project'}));assert.equal(second.success,true);
   assert.equal((await prisma.project.findUnique({where:{id:project.id}})).clientId,client.id);
   const foreign=await run(outsider,b,()=>createRecord('client',form({name:'Foreign synthetic'})));
   assert.equal((await createRecord('project',form({clientId:foreign.id,name:'Forbidden project'}))).success,false);
   const opts=await creationOptions('project');assert.ok(opts.success);assert.ok(!opts.options.clients.some(c=>c.id===foreign.id));
   otherClient=await createRecord('client',form({name:'Other local client'}));
  }));
  await t.test('task contextual/global creation and atomic eligible assignment',()=>run(manager,a,async()=>{
   await prisma.projectMember.create({data:{workspaceId:a.id,projectId:project.id,memberId:staffMember.id}});
   const good=await createRecord('task',form({projectId:project.id,title:'Assigned task',priority:'HIGH',assignedMemberId:staffMember.id}));assert.equal(good.success,true);
   assert.equal((await prisma.task.findUnique({where:{id:good.id}})).assignedMemberId,staffMember.id);
   const unassigned=await createRecord('task',form({projectId:project.id,title:'Global unassigned',priority:'MEDIUM'}));assert.equal(unassigned.success,true);
   const before=await prisma.task.count();const audits=await prisma.auditLog.count();
   assert.equal((await createRecord('task',form({projectId:project.id,title:'Must roll back',priority:'MEDIUM',assignedMemberId:badMember.id}))).success,false);
   assert.equal(await prisma.task.count(),before);assert.equal(await prisma.auditLog.count(),audits);
   const opts=await creationOptions('task');assert.ok(opts.success);assert.deepEqual(opts.options.members.find(m=>m.id===staffMember.id).projectIds,[project.id]);
  }));
  await t.test('owner invoices global/context: exact money, unchanged SENT, cross-client rejection',()=>run(owner,a,async()=>{
   for(const projectId of ['',project.id]){const invoice=await createRecord('invoice',form({clientId:client.id,projectId,invoiceNo:id(),amount:'1234.56'}));assert.equal(invoice.success,true);const row=await prisma.invoice.findUnique({where:{id:invoice.id}});assert.equal(row.status,'SENT');assert.equal(row.amount.toFixed(2),'1234.56');}
   assert.equal((await createRecord('invoice',form({clientId:otherClient.id,projectId:project.id,invoiceNo:'invalid-cross-client',amount:'100'}))).success,false);
   assert.equal((await createRecord('invoice',form({clientId:client.id,invoiceNo:'date-test',amount:'100',dueDate:'2026-02-30'}))).success,false);
  }));
  await t.test('unexpected service exceptions and refresh failures are sanitized and truthful',()=>run(owner,a,async()=>{
   const service=require('../src/server/services/clients.service.ts'),originalCreate=service.createClient;
   service.createClient=async()=>{throw Error('SYNTHETIC_SQL_TOKEN_CUSTOMER_RECORD');};
   try{const result=await createRecord('client',form({name:'Synthetic failure'}));assert.equal(result.success,false);assert.ok(!JSON.stringify(result).includes('SYNTHETIC_SQL'));}finally{service.createClient=originalCreate;}
   const before=await prisma.client.count({where:{workspaceId:a.id}});
   const committed=await request.run({user:owner,slug:a.slug,refreshFailure:true},()=>createRecord('client',form({name:'Cache failure after commit'})));
   assert.equal(committed.success,true);assert.match(committed.message,/Do not submit/);assert.equal(await prisma.client.count({where:{workspaceId:a.id}}),before+1);
  }));
  await t.test('roles, unauthenticated and cross-workspace selectors fail closed',async()=>{
   for(const kind of ['client','project','task','invoice']){assert.equal(await run(staff,a,()=>canOpenCreation(kind)),false);assert.equal((await run(staff,a,()=>creationOptions(kind))).success,false);assert.equal((await run(staff,a,()=>createRecord(kind,form({name:'Blocked client project',clientId:client.id,projectId:project.id,title:'Blocked task',priority:'MEDIUM',invoiceNo:'blocked',amount:'100'})))).success,false);}
   assert.equal(await run(manager,a,()=>canOpenCreation('invoice')),false);
   assert.equal((await run(manager,a,()=>createRecord('invoice',form({clientId:client.id,invoiceNo:'blocked',amount:'1'})))).success,false);
   assert.equal((await run(outsider,b,()=>createRecord('task',form({projectId:project.id,title:'Foreign task',priority:'LOW'})))).success,false);
   assert.equal((await run(null,a,()=>createRecord('client',form({name:'Unauthorized'})))).success,false);
  });
  await t.test('read-only after grace blocks all writes, pending blocks all operations',()=>run(owner,a,async()=>{
   // Replace only our disposable period fixture; never UPDATE immutable periods.
   const old=await prisma.subscriptionPeriod.findFirstOrThrow({where:{workspaceId:a.id}});await prisma.subscriptionPeriod.delete({where:{id:old.id}});
   const end=new Date(Date.now()-8*86400000);await prisma.subscriptionPeriod.create({data:{...old,startsAt:new Date(+end-86400000),endsAt:end,graceEndsAt:new Date(+end+7*86400000)}});
   for(const kind of ['client','project','task','invoice'])assert.equal(await canOpenCreation(kind),false);
   assert.equal((await createRecord('client',form({name:'Read-only denied'}))).success,false);
   await prisma.workspace.update({where:{id:a.id},data:{activationStatus:'PENDING_ACTIVATION'}});assert.equal((await creationOptions('task')).success,false);
  }));
  await t.test('captured logs only contain closed codes/references',()=>{assert.ok(logs.length);for(const line of logs){const event=JSON.parse(line);assert.deepEqual(Object.keys(event),['event','code','reference']);assert.equal(event.event,'RECORD_CREATION_FAILED');}});
 }finally{
  console.error=original;const ids=workspaces.map(w=>w.id),uids=users.map(u=>u.id),where={workspaceId:{in:ids}};
  for(const model of ['auditLog','task','invoice','projectMember','project','client'])await prisma[model].deleteMany({where});
  await cleanupCommercial(prisma,ids,uids,offers);await prisma.workspace.deleteMany({where:{id:{in:ids}}});await prisma.user.deleteMany({where:{id:{in:uids}}});await prisma.$disconnect();
 }
});
