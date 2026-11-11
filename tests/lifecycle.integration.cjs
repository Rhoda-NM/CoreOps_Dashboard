// Real PostgreSQL; only Clerk identity, request headers and clock are substituted.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AsyncLocalStorage } = require('node:async_hooks');
const { randomUUID, randomInt } = require('node:crypto');
const Module = require('node:module'), path = require('node:path');
const url = new URL(process.env.DATABASE_URL || 'invalid:');
if (!['localhost','127.0.0.1'].includes(url.hostname) || !/^\/coreops_auth_rehearsal_[a-z0-9_]+$/.test(url.pathname)) throw new Error('Use isolated local rehearsal database');
process.env.COREOPS_LIFECYCLE_ENFORCEMENT_ENABLED='true';
process.env.COREOPS_LIFECYCLE_PROCESSING_ENABLED='true';
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', jsx:'react-jsx' } });
const request=new AsyncLocalStorage(), load=Module._load;
let clockOverride;
Module._load=function(name,parent,main){
  if(name==='server-only')return {};
  if(name.endsWith('/lifecycle/clock') || (name==='./clock' && parent?.filename.includes('/lifecycle/'))) return { lifecycleNow: async tx => clockOverride ?? (await tx.$queryRaw`SELECT clock_timestamp() AS now`)[0].now };
  if(name.endsWith('/get-current-user')) return { getCurrentUser:async()=>{const u=request.getStore()?.user;if(!u)throw new Error('Unauthenticated');return u;} };
  if(name.endsWith('/clerk-identity'))return {requireClerkIdentity:async()=>({id:request.getStore()?.user?.externalId,twoFactorEnabled:request.getStore()?.mfa!==false})};
  if(name==='next/headers')return {headers:async()=>new Headers({host:request.getStore()?.host??'localhost:3000','x-coreops-workspace':request.getStore()?.workspace?.slug??'','x-coreops-path':`/w/${request.getStore()?.workspace?.slug??''}/subscription`})};
  if(name==='@clerk/nextjs/server')return {
    auth:async()=>({userId:request.getStore()?.user?.externalId,sessionClaims:{fva:[0,0]},has:()=>request.getStore()?.mfa!==false}),
    clerkClient:async()=>({users:{getUser:async externalId=>{const u=await prisma.user.findUniqueOrThrow({where:{externalId}});return {id:externalId,primaryEmailAddressId:'primary',emailAddresses:[{id:'primary',emailAddress:u.email,verification:{status:'verified'}}]};}}})
  };
  if(name.startsWith('@/'))name=path.resolve(__dirname,'../src',name.slice(2));
  return load.call(this,name,parent,main);
};
const { prisma }=require('../src/server/db/prisma.ts');
const { processWorkspaceLifecycle, resolveLifecycle }=require('../src/server/lifecycle/service.ts');
const { runLifecycleBatch }=require('../src/server/lifecycle/scheduler.ts');
const { lifecycleHandler }=require('../src/server/lifecycle/handler.ts');
const { commercialAccess }=require('../src/server/commercial/access.ts');
const commercial=require('../src/server/commercial/service.ts');
const clients=require('../src/server/services/clients.service.ts');
const projects=require('../src/server/services/projects.service.ts');
const memberships=require('../src/server/services/memberships.service.ts');
const id=()=>`lifecycle-${randomUUID()}`, DAY=86400000;
const run=(user,workspace,fn,extra={})=>request.run({user,workspace,...extra},fn);

test('Checkpoint B lifecycle, tenant security, renewal races and non-destructive processing', async t=>{
  const ws=[],users=[],runs=[];
  let owner,staff,manager,adminUser,admin,offer,account;
  async function user(){const u=await prisma.user.create({data:{id:id(),externalId:id(),email:`${id()}@example.test`}});users.push(u.id);return u;}
  async function fixture(daysExpired=10){
    const w=await prisma.workspace.create({data:{id:id(),slug:id(),name:'Disposable lifecycle fixture',activationStatus:'ACTIVE'}});ws.push(w.id);
    await prisma.workspaceMember.createMany({data:[{workspaceId:w.id,userId:owner.id,role:'OWNER'},{workspaceId:w.id,userId:manager.id,role:'MANAGER'},{workspaceId:w.id,userId:staff.id,role:'STAFF'}]});
    const sub=await prisma.subscription.create({data:{workspaceId:w.id,status:'ACTIVE',plan:'BUSINESS'}});
    const r=await prisma.subscriptionRequest.create({data:{workspaceId:w.id,subscriptionId:sub.id,submittedByUserId:owner.id,offerId:offer.id,type:'INITIAL',status:'ACTIVATED',idempotencyKey:id(),payloadHash:'fixture',plan:offer.plan,interval:offer.interval,offerVersion:offer.version,catalogAmount:'100',currency:'KES',memberLimit:10,invitationsEnabled:true,features:offer.features,taxTreatment:'EXEMPT'}});
    const end=new Date(Date.now()-daysExpired*DAY),start=new Date(+end-30*DAY);
    const period=await prisma.subscriptionPeriod.create({data:{workspaceId:w.id,subscriptionId:sub.id,sourceRequestId:r.id,plan:offer.plan,interval:offer.interval,startsAt:start,endsAt:end,graceEndsAt:new Date(+end+7*DAY),anchorDay:start.getUTCDate(),memberLimit:10,invitationsEnabled:true,features:offer.features,agreedAmount:'100',currency:'KES',activatedById:admin.id}});
    return {w,period,sub};
  }
  async function ready(w){
    const r=await run(owner,w,()=>commercial.submitRequest(offer.id,'RENEWAL',id()));
    await run(adminUser,null,()=>commercial.reviewRequest(r.id,{amount:'100',tax:'0',memberLimit:10,accountId:account.id,notes:'Independent test commercial review'}));
    await run(owner,w,()=>commercial.acceptQuote(r.id));
    const p=await run(owner,w,()=>commercial.submitPayment(r.id,{reference:id(),amount:'100',idempotencyKey:id()}));
    return {r,p};
  }
  async function fund(p){await run(adminUser,null,()=>commercial.verifyPayment(p.id,{amount:'100',reference:p.normalizedReference,ledgerEntryId:id(),receivedAt:new Date(Date.now()-1000).toISOString(),notes:'Independent isolated ledger verified'}));}
  try {
    owner=await user();staff=await user();manager=await user();adminUser=await user();
    admin=await prisma.platformAdmin.create({data:{userId:adminUser.id,role:'SUPER_ADMIN'}});
    offer=await prisma.subscriptionPlanOffer.create({data:{id:id(),plan:'BUSINESS',interval:'MONTHLY',version:randomInt(1000,2000000000),name:'Lifecycle test approved offer',amount:'100',currency:'KES',memberLimit:10,invitationsEnabled:true,features:{clients:true,projects:true,tasks:true,invoices:true,dashboard:true},taxTreatment:'EXEMPT',published:true,businessApprovedAt:new Date(),businessApprovalRef:'Isolated test only',approvedById:admin.id}});
    account=await prisma.paymentReceivingAccount.create({data:{label:'Lifecycle test account',method:'BANK',currency:'KES',accountIdentifier:id(),instructions:'Test only',active:true,verifiedAt:new Date(),verifiedById:admin.id}});

    await t.test('seven-day grace and archive preserve scoped reads and deny all business/member/invitation writes',async()=>{
      const {w}=await fixture(10), grace=await fixture(2);
      assert.equal((await resolveLifecycle(w.id)).state,'ARCHIVED');
      assert.equal((await commercialAccess(grace.w.id)).write,true);
      assert.equal((await commercialAccess(grace.w.id)).inGrace,true);
      const c=await prisma.client.create({data:{workspaceId:w.id,name:'Visible to manager',email:'private@example.test'}});
      const project=await prisma.project.create({data:{workspaceId:w.id,clientId:c.id,name:'Staff assigned project',budget:'900'}});
      const member=await prisma.workspaceMember.findUniqueOrThrow({where:{userId_workspaceId:{userId:staff.id,workspaceId:w.id}}});
      await prisma.projectMember.create({data:{workspaceId:w.id,projectId:project.id,memberId:member.id}});
      assert.equal((await commercialAccess(w.id)).lifecycle.state,'ARCHIVED');
      assert.equal((await run(manager,w,()=>clients.getClients())).length,1);
      await assert.rejects(run(staff,w,()=>clients.getClients()));
      const visible=await run(staff,w,()=>projects.getProjects());
      assert.equal(visible.length,1);assert.equal('budget' in visible[0],false);assert.equal('email' in visible[0].client,false);
      await assert.rejects(run(owner,w,()=>clients.createClient({name:'Denied write'})));
      await assert.rejects(run(owner,w,()=>memberships.createInvitation({email:'invite@example.test',role:'STAFF'})));
      await assert.rejects(run(owner,w,()=>memberships.changeMembership(member.id,{status:'SUSPENDED'})));
      const foreign=await fixture(10);assert.equal((await run(owner,foreign.w,()=>clients.getClients())).length,0);
      await assert.rejects(run(adminUser,w,()=>clients.getClients()));
    });
    await t.test('delayed cancellation uses original expiry; concurrent repeats emit one immutable event per transition',async()=>{
      const {w,period}=await fixture(80);
      assert.equal((await commercialAccess(w.id)).read,false); // No worker has run.
      await assert.rejects(run(owner,w,()=>clients.getClients()));
      const before=Date.now();
      await Promise.all(Array.from({length:5},()=>processWorkspaceLifecycle(w.id)));
      const l=await prisma.workspaceLifecycle.findUniqueOrThrow({where:{workspaceId:w.id}});
      assert.equal(+l.cancellationEffectiveAt,+period.endsAt+60*DAY);assert.equal(+l.retentionEndsAt,+period.endsAt+150*DAY);assert.ok(+l.cancellationRecordedAt>=before);
      const events=await prisma.workspaceLifecycleEvent.findMany({where:{workspaceId:w.id},orderBy:{effectiveAt:'asc'}});
      assert.deepEqual(events.map(e=>e.type),['WORKSPACE_ARCHIVED','WORKSPACE_CANCELED']);
      assert.equal(new Set(events.map(e=>e.operationKey)).size,2);assert.equal(events[0].episodeId,period.id);
      assert.deepEqual(Object.keys(events[0]).sort(),['effectiveAt','episodeId','id','operationKey','policyVersion','recordedAt','type','workspaceId','exportId','recoveryId'].sort());
      assert.equal(events[0].exportId,null);assert.equal(events[0].recoveryId,null);
      await assert.rejects(prisma.workspaceLifecycleEvent.update({where:{id:events[0].id},data:{policyVersion:'tampered'}}));
      await assert.rejects(run(adminUser,null,()=>commercial.setWorkspaceStatus(w.id,'ACTIVE','Cannot bypass reviewed recovery')));
      await assert.rejects(run(adminUser,w,()=>commercial.ownerSubscription()));
    });
    await t.test('archive renewal needs independent funds and admin activation; concurrent renewal/worker cannot cancel renewed coverage',async()=>{
      const {w}=await fixture(20), {r,p}=await ready(w);
      assert.equal((await commercialAccess(w.id)).write,false);
      await assert.rejects(run(adminUser,null,()=>commercial.activateSubscription(r.id,'Unverified claim denied')));
      await fund(p);assert.equal((await commercialAccess(w.id)).write,false);
      await assert.rejects(run(owner,null,()=>commercial.activateSubscription(r.id,'Owner cannot activate')));
      await assert.rejects(run(adminUser,null,()=>commercial.activateSubscription(r.id,'No MFA denied'),{mfa:false}));
      const results=await Promise.all([run(adminUser,null,()=>commercial.activateSubscription(r.id,'Verified renewal approved')),processWorkspaceLifecycle(w.id),run(adminUser,null,()=>commercial.activateSubscription(r.id,'Retry approved renewal'))]);
      assert.equal(results[0].id,results[2].id);assert.equal((await commercialAccess(w.id)).write,true);
      assert.equal(await prisma.subscriptionPeriod.count({where:{sourceRequestId:r.id}}),1);
      assert.equal(await prisma.workspaceLifecycleEvent.count({where:{workspaceId:w.id,type:'WORKSPACE_REACTIVATED'}}),1);
      assert.equal(await prisma.workspaceLifecycleEvent.count({where:{workspaceId:w.id,type:'WORKSPACE_CANCELED'}}),0);
    });
    await t.test('cutoff is rechecked after lock wait; funded requests cannot bypass cancellation when scheduler is late',async()=>{
      const {w,period}=await fixture(59),{r,p}=await ready(w);await fund(p);
      let locked,release;
      const acquired=new Promise(resolve=>{locked=resolve;});const hold=new Promise(resolve=>{release=resolve;});
      const blocker=prisma.$transaction(async tx=>{await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${w.id} FOR UPDATE`;locked();await hold;},{timeout:10000});
      await acquired;
      const activation=run(adminUser,null,()=>commercial.activateSubscription(r.id,'Waited beyond cancellation cutoff'));
      const rejected=assert.rejects(activation,/reviewed recovery/);
      let blocked=false;
      try {
        for(let attempt=0;attempt<100;attempt++){
          const [row]=await prisma.$queryRaw`SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND cardinality(pg_blocking_pids(pid)) > 0 AND query LIKE '%FOR UPDATE%') AS blocked`;
          if(row.blocked){blocked=true;break;}
          await new Promise(resolve=>setTimeout(resolve,10));
        }
        assert.equal(blocked,true,'Activation must actually wait on the Workspace lock');
        clockOverride=new Date(+period.endsAt+60*DAY);
      } finally { release();await blocker; }
      await rejected;clockOverride=undefined;
      assert.equal(await prisma.subscriptionPeriod.count({where:{sourceRequestId:r.id}}),0);
    });
    await t.test('early renewal preserves current paid coverage and future entitlements; retention expiry never deletes records',async()=>{
      const {w,period}=await fixture(-5),{r,p}=await ready(w);await fund(p);
      const next=await run(adminUser,null,()=>commercial.activateSubscription(r.id,'Early renewal with original paid coverage'));
      assert.equal(+next.startsAt,+period.endsAt);
      assert.equal((await resolveLifecycle(w.id)).period.id,period.id);
      assert.equal((await commercialAccess(w.id)).write,true);
      const expired=await fixture(160);
      await processWorkspaceLifecycle(expired.w.id);
      assert.equal((await resolveLifecycle(expired.w.id)).retentionExpired,true);
      assert.ok(await prisma.workspace.findUnique({where:{id:expired.w.id}}));
      assert.equal(await prisma.workspaceMember.count({where:{workspaceId:expired.w.id}}),3);
    });
    await t.test('cancellation and funded activation racing after cutoff cannot create a new paid period',async()=>{
      const {w}=await fixture(80),{r,p}=await ready(w);await fund(p);
      const results=await Promise.allSettled([processWorkspaceLifecycle(w.id),run(adminUser,null,()=>commercial.activateSubscription(r.id,'Cannot bypass effective cancellation'))]);
      assert.equal(results[0].status,'fulfilled');assert.equal(results[1].status,'rejected');
      assert.equal(await prisma.subscriptionPeriod.count({where:{sourceRequestId:r.id}}),0);
      assert.equal((await prisma.subscription.findUniqueOrThrow({where:{workspaceId:w.id}})).status,'CANCELED');
    });
    await t.test('failure to persist event rolls back lifecycle and subscription; tenant FKs and deadlines reject tampering',async()=>{
      const {w,period}=await fixture(80), other=await fixture(80);
      await prisma.workspaceLifecycleEvent.create({data:{id:id(),workspaceId:other.w.id,episodeId:other.period.id,type:'WORKSPACE_CANCELED',effectiveAt:new Date(),operationKey:`${period.id}:WORKSPACE_CANCELED`,policyVersion:'TEST'}});
      // A conflicting operation key must not be silently accepted as our event.
      await assert.rejects(processWorkspaceLifecycle(w.id));
      assert.equal(await prisma.workspaceLifecycle.count({where:{workspaceId:w.id}}),0);
      assert.equal(await prisma.workspaceLifecycleEvent.count({where:{workspaceId:w.id}}),0);
      assert.equal((await prisma.subscription.findUnique({where:{workspaceId:w.id}})).status,'ACTIVE');
      await assert.rejects(prisma.workspaceLifecycle.create({data:{workspaceId:w.id,sourcePeriodId:other.period.id,episodeId:other.period.id,policyVersion:'EXPIRY-60-RETENTION-90-v1'}}));
      await assert.rejects(prisma.workspaceLifecycle.create({data:{workspaceId:w.id,sourcePeriodId:period.id,episodeId:period.id,policyVersion:'EXPIRY-60-RETENTION-90-v1',archivedAt:new Date()}}));
    });
    await t.test('suspension, closure and reversal restrictions survive workers and ordinary activation',async()=>{
      for(const status of ['SUSPENDED','CLOSED']){
        const {w}=await fixture(10),{r,p}=await ready(w);await fund(p);
        await prisma.workspace.update({where:{id:w.id},data:{activationStatus:status}});
        await processWorkspaceLifecycle(w.id);assert.equal((await commercialAccess(w.id)).read,false);
        await assert.rejects(run(adminUser,null,()=>commercial.activateSubscription(r.id,'Cannot lift restriction')));
        assert.equal((await prisma.workspace.findUnique({where:{id:w.id}})).activationStatus,status);
      }
    });
    await t.test('dry-run is read-only, scheduler is bounded/idempotent, shared identities are unchanged',async()=>{
      await fixture(80);await fixture(10);
      const before=await prisma.workspaceLifecycleEvent.count();const count=await prisma.user.count();
      const dry=await runLifecycleBatch({dryRun:true,limit:2});assert.ok(dry.examined<=2);assert.equal(await prisma.workspaceLifecycleEvent.count(),before);
      const result=await runLifecycleBatch({dryRun:false,limit:50});runs.push(result.runId);assert.ok(result.processed>0);
      const journal=await prisma.lifecycleJobRun.findUniqueOrThrow({where:{id:result.runId}});
      assert.equal(journal.outcomes.length,result.processed+result.skipped+result.failed);
      assert.ok(journal.outcomes.some(item=>item.outcome==='TRANSITION_FAILED'));
      const result2=await runLifecycleBatch({dryRun:false,limit:50});runs.push(result2.runId);
      assert.equal(await prisma.user.count(),count);assert.equal(await prisma.workspace.count({where:{id:{in:ws}}}),ws.length);
      assert.ok(await prisma.workspaceMember.count({where:{userId:owner.id}})>1);
      await assert.rejects(runLifecycleBatch({limit:51}));
    });
    await t.test('scheduler secret, central host, default dry-run and disabled processing fail closed',async()=>{
      process.env.CRON_SECRET='a'.repeat(40);
      const req=q=>new Request(`http://localhost:3000/api/lifecycle/process${q}`,{headers:{authorization:`Bearer ${process.env.CRON_SECRET}`}});
      assert.equal((await lifecycleHandler(new Request('http://localhost:3000/api/lifecycle/process'))).status,401);
      const result=await lifecycleHandler(req(''));assert.equal(result.status,200);assert.equal((await result.json()).dryRun,true);
      process.env.COREOPS_LIFECYCLE_PROCESSING_ENABLED='false';
      assert.equal((await lifecycleHandler(req('?dryRun=false'))).status,503);
      assert.equal((await lifecycleHandler(req('?limit=1000'))).status,400);
      process.env.COREOPS_LIFECYCLE_PROCESSING_ENABLED='true';
      const keys=['COREOPS_ROUTING_MODE','COREOPS_APP_ORIGIN','COREOPS_MARKETING_ORIGIN','COREOPS_TENANT_ROOT_DOMAIN'];
      const old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
      try {
        Object.assign(process.env,{COREOPS_ROUTING_MODE:'subdomain',COREOPS_APP_ORIGIN:'https://app.workflowconnect.io',COREOPS_MARKETING_ORIGIN:'https://workflowconnect.io',COREOPS_TENANT_ROOT_DOMAIN:'workflowconnect.io'});
        assert.equal((await run(owner,null,()=>lifecycleHandler(req('')),{host:'tenant-one.workflowconnect.io'})).status,503);
        assert.equal((await run(owner,null,()=>lifecycleHandler(req('')),{host:'app.workflowconnect.io'})).status,200);
      } finally { for(const k of keys){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];} }
    });
  } finally {
    clockOverride=undefined;
    await prisma.lifecycleJobRun.deleteMany({where:{id:{in:runs.filter(Boolean)}}});
    await prisma.workspaceLifecycleEvent.deleteMany({where:{workspaceId:{in:ws}}});
    await prisma.workspaceLifecycle.deleteMany({where:{workspaceId:{in:ws}}});
    await prisma.auditLog.deleteMany({where:{workspaceId:{in:ws}}});
    if(admin)await prisma.platformAuditEvent.deleteMany({where:{actorAdminId:admin.id}});
    await prisma.subscriptionPaymentReceipt.deleteMany({where:{workspaceId:{in:ws}}});
    await prisma.subscriptionPayment.deleteMany({where:{workspaceId:{in:ws}}});
    await prisma.subscriptionPeriod.deleteMany({where:{workspaceId:{in:ws}}});
    await prisma.subscriptionRequest.deleteMany({where:{workspaceId:{in:ws}}});
    await prisma.subscription.deleteMany({where:{workspaceId:{in:ws}}});
    await prisma.task.deleteMany({where:{workspaceId:{in:ws}}});
    await prisma.projectMember.deleteMany({where:{workspaceId:{in:ws}}});
    await prisma.project.deleteMany({where:{workspaceId:{in:ws}}});
    await prisma.client.deleteMany({where:{workspaceId:{in:ws}}});
    await prisma.workspaceMember.deleteMany({where:{workspaceId:{in:ws}}});
    await prisma.workspace.deleteMany({where:{id:{in:ws}}});
    if(offer)await prisma.subscriptionPlanOffer.delete({where:{id:offer.id}});
    if(account)await prisma.paymentReceivingAccount.delete({where:{id:account.id}});
    await prisma.platformAdmin.deleteMany({where:{userId:{in:users}}});
    await prisma.user.deleteMany({where:{id:{in:users}}});
    await prisma.$disconnect();
  }
});
