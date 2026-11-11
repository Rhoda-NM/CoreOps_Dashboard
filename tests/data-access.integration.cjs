// Real PostgreSQL, encrypted artifacts and ZIP output. Clerk/request/time are test boundaries.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {AsyncLocalStorage}=require('node:async_hooks');
const {randomUUID,randomInt,randomBytes}=require('node:crypto');
const Module=require('node:module'),path=require('node:path');
const url=new URL(process.env.DATABASE_URL||'invalid:');
if(!['localhost','127.0.0.1'].includes(url.hostname)||!/^\/coreops_auth_rehearsal_exports_[a-z0-9_]+$/.test(url.pathname))throw Error('Dedicated isolated exports database required');
Object.assign(process.env,{COREOPS_LIFECYCLE_ENFORCEMENT_ENABLED:'true',COREOPS_SECURE_EXPORTS_ENABLED:'true',COREOPS_EXPORT_ENCRYPTION_KEY:randomBytes(32).toString('base64')});
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}});
const request=new AsyncLocalStorage(),load=Module._load;let clock;
Module._load=function(name,parent,main){
  if(name==='server-only')return {};
  if(name.endsWith('/lifecycle/clock')||(name==='./clock'&&parent?.filename.includes('/lifecycle/')))return {lifecycleNow:async tx=>clock??(await tx.$queryRaw`SELECT clock_timestamp() AS now`)[0].now};
  if(name.endsWith('/get-current-user'))return {getCurrentUser:async()=>{if(!request.getStore()?.user)throw Error('Unauthenticated');return request.getStore().user;}};
  if(name.endsWith('/clerk-identity'))return {requireClerkIdentity:async()=>{const s=request.getStore();if(!s?.user||s.revoked)throw Error('Session unavailable');return {id:s.user.externalId,twoFactorEnabled:s.mfa!==false,primaryEmailAddress:{emailAddress:s.user.email,verification:{status:'verified'}}};}};
  if(name==='next/headers')return {headers:async()=>new Headers({host:request.getStore()?.host??'localhost:3000','x-coreops-workspace':request.getStore()?.workspace?.slug??'','x-coreops-path':`/w/${request.getStore()?.workspace?.slug??''}/subscription`})};
  if(name==='@clerk/nextjs/server')return {
    ...require('@clerk/shared/authorization-errors'),
    auth:async()=>({userId:request.getStore()?.user?.externalId,sessionClaims:{fva:request.getStore()?.secondFactor===false?[0,-1]:[0,0]},has:()=>request.getStore()?.fresh!==false}),
    clerkClient:async()=>({users:{getUser:async externalId=>{const user=await prisma.user.findUniqueOrThrow({where:{externalId}});return {id:externalId,primaryEmailAddressId:'primary',emailAddresses:[{id:'primary',emailAddress:user.email,verification:{status:request.getStore()?.unverifiedTarget?'unverified':'verified'}}],banned:request.getStore()?.bannedTarget??false};}}})
  };
  if(name==='./export-content'&&parent?.filename.endsWith('/exports.ts')){
    const actual=load.call(this,name,parent,main);
    return {...actual,exportContent:async(tx,id,now)=>{if(request.getStore()?.partialFailure)throw Error('Private payload must not escape');const data=await actual.exportContent(tx,id,now);if(request.getStore()?.timeout)clock=new Date(+now+7000);return data;}};
  }
  if(name.startsWith('@/'))name=path.resolve(__dirname,'../src',name.slice(2));
  return load.call(this,name,parent,main);
};
const {prisma}=require('../src/server/db/prisma.ts');
const exportsService=require('../src/server/data-access/exports.ts'),recovery=require('../src/server/data-access/recovery.ts');
const {exportDownloadHandler}=require('../src/server/data-access/download-handler.ts');
const {exportCleanupHandler}=require('../src/server/data-access/cleanup-handler.ts');
const {dataAction}=require('../src/app/account/data/actions.ts');
const {processWorkspaceLifecycle}=require('../src/server/lifecycle/service.ts');
const {commercialAccess}=require('../src/server/commercial/access.ts');
const commercial=require('../src/server/commercial/service.ts');
const {csv,zip}=require('../src/server/data-access/zip.ts');
async function takeExport(id,token){const result=await exportsService.downloadExport(id,token);try{return result.bytes;}finally{await exportsService.releaseDownload(result.id,result.workspaceId,result.leaseToken);}}
const id=()=>`data-test-${randomUUID()}`,DAY=86400000;
const run=(user,w,fn,options={})=>request.run({user,workspace:w,...options},fn);
function entries(bytes){const files={};let at=0;while(bytes.readUInt32LE(at)===0x04034b50){const len=bytes.readUInt32LE(at+18),nameLen=bytes.readUInt16LE(at+26),extra=bytes.readUInt16LE(at+28),start=at+30+nameLen+extra;files[bytes.subarray(at+30,at+30+nameLen).toString()]=bytes.subarray(start,start+len).toString();at=start+len;}return files;}

test('secure data access and reviewed recovery',async t=>{
 const ws=[],users=[];let adminUser,admin,staff,manager,offer,account;
 async function user(){const u=await prisma.user.create({data:{id:id(),externalId:id(),email:`${id()}@example.test`,name:'Synthetic member'}});users.push(u.id);return u;}
 async function fixture(expired=-10,owner){
  owner??=await user();const w=await prisma.workspace.create({data:{id:id(),slug:id(),name:'Disposable export workspace',activationStatus:'ACTIVE'}});ws.push(w.id);
  await prisma.workspaceMember.createMany({data:[{workspaceId:w.id,userId:owner.id,role:'OWNER'},{workspaceId:w.id,userId:staff.id,role:'STAFF'},{workspaceId:w.id,userId:manager.id,role:'MANAGER'}]});
  const sub=await prisma.subscription.create({data:{workspaceId:w.id,status:'ACTIVE',plan:'BUSINESS'}});
  const r=await prisma.subscriptionRequest.create({data:{workspaceId:w.id,subscriptionId:sub.id,submittedByUserId:owner.id,offerId:offer.id,type:'INITIAL',status:'ACTIVATED',idempotencyKey:id(),payloadHash:'fixture',plan:'BUSINESS',interval:'MONTHLY',offerVersion:offer.version,catalogAmount:'100',currency:'KES',memberLimit:10,invitationsEnabled:true,features:offer.features,taxTreatment:'EXEMPT'}});
  const end=new Date(Date.now()-expired*DAY),start=new Date(+end-30*DAY);
  const period=await prisma.subscriptionPeriod.create({data:{workspaceId:w.id,subscriptionId:sub.id,sourceRequestId:r.id,plan:'BUSINESS',interval:'MONTHLY',startsAt:start,endsAt:end,graceEndsAt:new Date(+end+7*DAY),anchorDay:start.getUTCDate(),memberLimit:10,invitationsEnabled:true,features:offer.features,agreedAmount:'100',currency:'KES',activatedById:admin.id}});
  const client=await prisma.client.create({data:{workspaceId:w.id,name:'=HYPERLINK("unsafe")',email:'client@fixture.test',phone:'123'}});
  const project=await prisma.project.create({data:{workspaceId:w.id,clientId:client.id,name:'Delivery',budget:'123.45'}});
  const member=await prisma.workspaceMember.findUniqueOrThrow({where:{userId_workspaceId:{userId:staff.id,workspaceId:w.id}}});
  await prisma.projectMember.create({data:{workspaceId:w.id,projectId:project.id,memberId:member.id}});
  await prisma.task.create({data:{workspaceId:w.id,projectId:project.id,title:'Task',assignedMemberId:member.id}});
  await prisma.invoice.create({data:{workspaceId:w.id,clientId:client.id,projectId:project.id,invoiceNo:id(),amount:'456.78'}});
  return {w,owner,period,client,project};
 }
 async function exportReady(f,grant=null){const row=await run(f.owner,f.w,()=>exportsService.requestExport(f.w.id,id(),grant));const ready=await run(f.owner,f.w,()=>exportsService.prepareExport(row.id));return {...ready,row};}
 async function grant(f,scopes={export:true,reactivate:false}){const r=await run(f.owner,null,()=>recovery.requestRecovery(f.w.id,'CASE-OWNERSHIP-TEST',id()));await run(adminUser,null,()=>recovery.reviewRecovery(r.id,{approve:true,...scopes,minutes:30,evidence:'CASE-INDEPENDENT-EVIDENCE',reason:'Independent authority and identity review',ownershipVerified:true}));return r.id;}
 async function funded(f,recoveryId){const r=await run(f.owner,f.w,()=>commercial.submitRequest(offer.id,'RENEWAL',id()));await run(adminUser,null,()=>commercial.reviewRequest(r.id,{amount:'100',tax:'0',memberLimit:10,accountId:account.id,notes:'Verified commercial quote'}));await run(f.owner,f.w,()=>commercial.acceptQuote(r.id));const p=await run(f.owner,f.w,()=>commercial.submitPayment(r.id,{amount:'100',reference:id(),idempotencyKey:id()}));if(recoveryId)await assert.rejects(run(adminUser,null,()=>commercial.activateSubscription(r.id,'Grant alone cannot activate without verified funds',recoveryId)));await run(adminUser,null,()=>commercial.verifyPayment(p.id,{amount:'100',reference:p.normalizedReference,ledgerEntryId:id(),receivedAt:new Date(Date.now()-1000).toISOString(),notes:'Verified independent receiving ledger'}));return r;}
 try{
  adminUser=await user();staff=await user();manager=await user();admin=await prisma.platformAdmin.create({data:{userId:adminUser.id,role:'SUPER_ADMIN'}});
  offer=await prisma.subscriptionPlanOffer.create({data:{id:id(),plan:'BUSINESS',interval:'MONTHLY',version:randomInt(1000,2000000000),name:'Export test offer',amount:'100',currency:'KES',memberLimit:10,invitationsEnabled:true,features:{clients:true,projects:true,tasks:true,invoices:true,dashboard:true},taxTreatment:'EXEMPT',published:true,businessApprovedAt:new Date(),businessApprovalRef:'Test only',approvedById:admin.id}});
  account=await prisma.paymentReceivingAccount.create({data:{label:'Test account',method:'BANK',currency:'KES',accountIdentifier:id(),instructions:'DO-NOT-EXPORT-PROVIDER-INSTRUCTIONS',active:true,verifiedAt:new Date(),verifiedById:admin.id}});
  await t.test('active and archived owners receive complete ZIP with exact money, minimized members and relational IDs',async()=>{
    for(const age of [-10,20]){const f=await fixture(age),ready=await exportReady(f);const stored=await prisma.workspaceExportRequest.findUniqueOrThrow({where:{id:ready.id}});assert.equal(Buffer.from(stored.artifact).includes(Buffer.from('client@fixture.test')),false);
      const bytes=await run(f.owner,null,()=>takeExport(ready.id,ready.token)),files=entries(bytes),data=JSON.parse(files['export.json']);
      assert.equal(Object.keys(files).length,9);assert.equal(data.clients[0].id,f.client.id);assert.equal(data.projects[0].clientId,f.client.id);assert.equal(data.projects[0].budget,'123.45');assert.equal(data.invoices[0].amount,'456.78');assert.equal(data.tasks[0].assignedMemberId,data.assignments[0].memberId);
      assert.equal('email' in data.members[0],false);assert.equal('userId' in data.members[0],false);assert.equal('externalId' in data.members[0],false);assert.equal(bytes.includes(Buffer.from('DO-NOT-EXPORT-PROVIDER-INSTRUCTIONS')),false);
      assert.match(files['clients.csv'],/'=HYPERLINK/);assert.equal((await commercialAccess(f.w.id)).write,age<0);
      assert.match(files['projects.csv'],/"123\.45"/);assert.equal(files['projects.csv'].includes('"""123.45"""'),false);
      assert.equal((await prisma.workspaceExportRequest.findUnique({where:{id:ready.id}})).artifact!==null,true);
    }
  });
  await t.test('STAFF, MANAGER, foreign owner, platform user, revoked session and missing/stale MFA are denied in service and action',async()=>{
    const f=await fixture(),other=await fixture();
    for(const person of [staff,manager,adminUser,other.owner]){await assert.rejects(run(person,null,()=>exportsService.requestExport(f.w.id,id())));const form=new FormData();for(const [k,v]of Object.entries({operation:'export',workspaceId:f.w.id,key:id()}))form.set(k,v);assert.ok((await run(person,null,()=>dataAction(form))).error);}
    await assert.rejects(run(f.owner,null,()=>exportsService.requestExport(f.w.id,id()),{revoked:true}));await assert.rejects(run(f.owner,null,()=>exportsService.requestExport(f.w.id,id()),{mfa:false}));await assert.rejects(run(f.owner,null,()=>exportsService.requestExport(f.w.id,id()),{secondFactor:false}));
    const form=new FormData();form.set('operation','export');form.set('workspaceId',f.w.id);form.set('key',id());assert.ok((await run(f.owner,null,()=>dataAction(form),{fresh:false})).clerk_error);
  });
  await t.test('idempotent requests, single-use token replay, fresh download authority and global shared users',async()=>{
    const f=await fixture(),other=await fixture(-10,f.owner),key=id();
    const rows=await Promise.all(Array.from({length:4},()=>run(f.owner,null,()=>exportsService.requestExport(f.w.id,key))));assert.equal(new Set(rows.map(r=>r.id)).size,1);
    await assert.rejects(run(f.owner,null,()=>exportsService.requestExport(other.w.id,key)));
    const ready=await run(f.owner,null,()=>exportsService.prepareExport(rows[0].id));await assert.rejects(run(other.owner,null,()=>takeExport(ready.id,'wrong')));
    const attempts=await Promise.allSettled([run(f.owner,null,()=>takeExport(ready.id,ready.token)),run(f.owner,null,()=>takeExport(ready.id,ready.token))]);assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);
    assert.equal(await prisma.workspaceMember.count({where:{userId:f.owner.id}}),2);assert.ok(await prisma.user.findUnique({where:{id:f.owner.id}}));
  });
  await t.test('canceled workspace needs independent reviewed grant; historical or suspended ownership alone grants no export',async()=>{
    const f=await fixture(80);await processWorkspaceLifecycle(f.w.id);await assert.rejects(run(f.owner,null,()=>exportsService.requestExport(f.w.id,id())));
    await prisma.workspaceMember.update({where:{userId_workspaceId:{userId:f.owner.id,workspaceId:f.w.id}},data:{status:'SUSPENDED'}});
    const recoveryId=await grant(f);assert.equal((await commercialAccess(f.w.id)).read,false);
    const ready=await exportReady(f,recoveryId);assert.ok((await run(f.owner,null,()=>takeExport(ready.id,ready.token))).length);
    const newOwner=await user();await prisma.workspaceMember.create({data:{workspaceId:f.w.id,userId:newOwner.id,role:'OWNER'}});await prisma.workspaceMember.delete({where:{userId_workspaceId:{userId:f.owner.id,workspaceId:f.w.id}}});
    const ready2=await run(f.owner,null,()=>exportsService.authorizeExportDownload(ready.id));assert.ok((await run(f.owner,null,()=>takeExport(ready2.id,ready2.token))).length);
  });
  await t.test('approval verifies current identity, self-review and platform isolation; revoked/expired grants immediately deny download',async()=>{
    const f=await fixture(80),pending=await run(f.owner,null,()=>recovery.requestRecovery(f.w.id,'CASE-PROOF',id()));
    const input={approve:true,export:true,reactivate:false,minutes:30,evidence:'Protected proof reference',reason:'Independent review',ownershipVerified:true};
    await assert.rejects(run(adminUser,null,()=>recovery.reviewRecovery(pending.id,input),{unverifiedTarget:true}));await assert.rejects(run(adminUser,null,()=>recovery.reviewRecovery(pending.id,{...input,ownershipVerified:false})));
    await run(adminUser,null,()=>recovery.reviewRecovery(pending.id,input));const ready=await exportReady(f,pending.id);
    await run(adminUser,null,()=>recovery.revokeRecovery(pending.id,'Authority withdrawn after review'));await assert.rejects(run(f.owner,null,()=>takeExport(ready.id,ready.token)));assert.equal((await prisma.workspaceExportRequest.findUnique({where:{id:ready.id}})).artifact,null);
    const g=await fixture(80),gId=await grant(g),r=await exportReady(g,gId);const grantRow=await prisma.workspaceRecoveryRequest.findUniqueOrThrow({where:{id:gId}});clock=new Date(+grantRow.expiresAt+1);await assert.rejects(run(g.owner,null,()=>takeExport(r.id,r.token)));await exportsService.cleanupDataAccess();assert.equal((await prisma.workspaceRecoveryRequest.findUnique({where:{id:gId}})).status,'EXPIRED');clock=undefined;
  });
  await t.test('download API enforces origin, live identity, fresh MFA, private headers and one-time consumption',async()=>{
    const f=await fixture(),r=await exportReady(f);const req=(origin='http://localhost:3000')=>new Request(`http://localhost:3000/account/data/exports/${r.id}/download`,{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:r.token})});const context={params:Promise.resolve({id:r.id})};
    assert.equal((await run(f.owner,null,()=>exportDownloadHandler(req('https://evil.test'),context))).status,403);
    const stale=await run(f.owner,null,()=>exportDownloadHandler(req(),context),{fresh:false});assert.equal(stale.status,403);assert.ok((await stale.json()).clerk_error);
    assert.equal((await run(manager,null,()=>exportDownloadHandler(req(),context))).status,403);
    const oversized=new Request(`http://localhost:3000/account/data/exports/${r.id}/download`,{method:'POST',headers:{origin:'http://localhost:3000','content-type':'application/x-www-form-urlencoded'},body:'x'.repeat(2049)});assert.equal((await run(f.owner,null,()=>exportDownloadHandler(oversized,context))).status,413);
    const result=await run(f.owner,null,()=>exportDownloadHandler(req(),context));assert.equal(result.status,200);assert.match(result.headers.get('cache-control'),/no-store/);assert.equal(result.headers.get('content-type'),'application/zip');await result.arrayBuffer();assert.equal((await run(f.owner,null,()=>exportDownloadHandler(req(),context))).status,403);
  });
  await t.test('historical authority review does not rebind identities; identity changes can be rejected without granting access',async()=>{
    const f=await fixture(80),replacement=await user();
    const before=await prisma.workspaceMember.count({where:{workspaceId:f.w.id}}),oldBinding=f.owner.externalId;
    const claim=await run(replacement,null,()=>recovery.requestRecovery(f.w.id,'CASE-CHANGED-IDENTITY',id()));
    await assert.rejects(run(replacement,null,()=>exportsService.requestExport(f.w.id,id())));
    await run(adminUser,null,()=>recovery.reviewRecovery(claim.id,{approve:true,export:true,reactivate:false,minutes:10,evidence:'Protected historical authority and verified new identity evidence',reason:'Explicit scoped access without transferring membership',ownershipVerified:true}));
    const ready=await exportReady({...f,owner:replacement},claim.id);assert.ok((await run(replacement,null,()=>takeExport(ready.id,ready.token))).length);
    assert.equal(await prisma.workspaceMember.count({where:{workspaceId:f.w.id}}),before);assert.equal((await prisma.user.findUnique({where:{id:f.owner.id}})).externalId,oldBinding);
    const other=await fixture(80),pending=await run(other.owner,null,()=>recovery.requestRecovery(other.w.id,'CASE-REJECT-STALE-IDENTITY',id()));
    await run(adminUser,null,()=>recovery.reviewRecovery(pending.id,{approve:false,export:false,reactivate:false,minutes:10,evidence:'Identity not established',reason:'Reject unverifiable identity',ownershipVerified:false}),{unverifiedTarget:true});
    assert.equal((await prisma.workspaceRecoveryRequest.findUnique({where:{id:pending.id}})).identityCheckedAt,null);
  });
  await t.test('self-review, billing/support review, foreign grants and decision tampering are denied',async()=>{
    const f=await fixture(80,adminUser),self=await run(adminUser,null,()=>recovery.requestRecovery(f.w.id,'CASE-SELF',id()));
    const input={approve:true,export:true,reactivate:false,minutes:10,evidence:'Protected test case',reason:'Reviewed authority',ownershipVerified:true};
    await assert.rejects(run(adminUser,null,()=>recovery.reviewRecovery(self.id,input)));
    const target=await fixture(80),pending=await run(target.owner,null,()=>recovery.requestRecovery(target.w.id,'CASE-ROLE',id()));
    for(const role of ['SUPPORT','BILLING_ADMIN']){const person=await user();await prisma.platformAdmin.create({data:{userId:person.id,role}});await assert.rejects(run(person,null,()=>recovery.reviewRecovery(pending.id,input)));}
    await run(adminUser,null,()=>recovery.reviewRecovery(pending.id,input));
    await assert.rejects(run(f.owner,null,()=>exportsService.requestExport(f.w.id,id(),pending.id)));
    await assert.rejects(prisma.workspaceRecoveryRequest.update({where:{id:pending.id},data:{allowReactivation:true}}));
    await assert.rejects(prisma.workspaceExportRequest.create({data:{workspaceId:f.w.id,requesterId:f.owner.id,sourcePeriodId:f.period.id,recoveryId:pending.id,idempotencyKey:id(),payloadHash:'invalid-fixture',expiresAt:new Date(Date.now()+60000)}}));
  });
  await t.test('cancellation and revocation serialize with exports, and normal owner loss revokes download authority',async()=>{
    const f=await fixture(59),cutoff=new Date(+f.period.endsAt+60*DAY);
    clock=new Date(+cutoff-60000);const ready=await exportReady(f);assert.equal(+new Date(ready.expiresAt),+cutoff);
    clock=cutoff;await processWorkspaceLifecycle(f.w.id);
    assert.ok((await prisma.workspaceExportRequest.findUnique({where:{id:ready.id}})).expiresAt>clock);
    await assert.rejects(run(f.owner,null,()=>takeExport(ready.id,ready.token)));clock=undefined;
    const active=await fixture(),r=await exportReady(active);
    await prisma.workspaceMember.update({where:{userId_workspaceId:{userId:active.owner.id,workspaceId:active.w.id}},data:{status:'SUSPENDED'}});
    await assert.rejects(run(active.owner,null,()=>takeExport(r.id,r.token)));
    const canceled=await fixture(80),grantId=await grant(canceled),g=await exportReady(canceled,grantId);
    const raced=await Promise.allSettled([run(adminUser,null,()=>recovery.revokeRecovery(grantId,'Concurrent revocation')),run(canceled.owner,null,()=>takeExport(g.id,g.token))]);assert.equal(raced[0].status,'fulfilled');
    await assert.rejects(run(canceled.owner,null,()=>takeExport(g.id,g.token)));assert.equal((await prisma.workspaceExportRequest.findUnique({where:{id:g.id}})).artifact,null);
  });
  await t.test('large bounded export succeeds; over-limit and partial/timeout failures return no partial artifacts',async()=>{
    const f=await fixture();await prisma.client.createMany({data:Array.from({length:1000},(_,i)=>({workspaceId:f.w.id,name:`Synthetic ${i}`}))});const r=await exportReady(f);const data=JSON.parse(entries(await run(f.owner,null,()=>takeExport(r.id,r.token)))['export.json']);assert.equal(data.clients.length,1001);
    for(const options of [{partialFailure:true},{timeout:true}]){const x=await fixture();const row=await run(x.owner,null,()=>exportsService.requestExport(x.w.id,id()));await assert.rejects(run(x.owner,null,()=>exportsService.prepareExport(row.id),options));clock=undefined;const stored=await prisma.workspaceExportRequest.findUniqueOrThrow({where:{id:row.id}});assert.equal(stored.status,'FAILED');assert.equal(stored.artifact,null);assert.equal(stored.tokenHash,null);}
    const x=await fixture();await prisma.client.createMany({data:Array.from({length:5000},(_,i)=>({workspaceId:x.w.id,name:`Bound ${i}`}))});const row=await run(x.owner,null,()=>exportsService.requestExport(x.w.id,id()));await assert.rejects(run(x.owner,null,()=>exportsService.prepareExport(row.id)));assert.equal((await prisma.workspaceExportRequest.findUnique({where:{id:row.id}})).errorCode,'EXPORT_TOO_LARGE');
  });
  await t.test('simultaneous preparation, recovery review and cancellation serialize on the real Workspace lock',async()=>{
    const f=await fixture(59),cutoff=new Date(+f.period.endsAt+60*DAY);
    clock=new Date(+cutoff-60000);
    const exportRow=await run(f.owner,null,()=>exportsService.requestExport(f.w.id,id()));
    const recoveryRow=await run(f.owner,null,()=>recovery.requestRecovery(f.w.id,'CASE-CONCURRENT',id()));
    let release,acquired;const held=new Promise(resolve=>{release=resolve;});const locked=new Promise(resolve=>{acquired=resolve;});
    const blocker=prisma.$transaction(async tx=>{await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${f.w.id} FOR UPDATE`;acquired();await held;},{timeout:10000});
    await locked;clock=cutoff;
    const operations=Promise.allSettled([
      run(f.owner,null,()=>exportsService.prepareExport(exportRow.id)),processWorkspaceLifecycle(f.w.id),
      run(adminUser,null,()=>recovery.reviewRecovery(recoveryRow.id,{approve:true,export:true,reactivate:false,minutes:30,evidence:'Independent concurrent case evidence',reason:'Reviewed export only',ownershipVerified:true}))
    ]);
    let waiters=0;
    try{
      for(let n=0;n<100;n++){const [row]=await prisma.$queryRaw`SELECT count(*)::int AS waiting FROM pg_stat_activity WHERE datname=current_database() AND cardinality(pg_blocking_pids(pid))>0 AND query LIKE '%FOR UPDATE%'`;waiters=row.waiting;if(waiters>=3)break;await new Promise(resolve=>setTimeout(resolve,10));}
    }finally{release();await blocker;}
    const results=await operations;
    try{assert.ok(waiters>=3);assert.equal(results[0].status,'rejected');assert.equal(results[1].status,'fulfilled');assert.equal(results[2].status,'fulfilled');assert.equal((await prisma.workspaceExportRequest.findUnique({where:{id:exportRow.id}})).artifact,null);assert.equal((await commercialAccess(f.w.id)).read,false);}finally{clock=undefined;}
  });
  await t.test('central-host protection independently rejects tenant-host Server Actions and services',async()=>{
    const f=await fixture(),keys=['COREOPS_ROUTING_MODE','COREOPS_APP_ORIGIN','COREOPS_MARKETING_ORIGIN','COREOPS_TENANT_ROOT_DOMAIN'],old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
    try{
      Object.assign(process.env,{COREOPS_ROUTING_MODE:'subdomain',COREOPS_APP_ORIGIN:'https://app.workflowconnect.io',COREOPS_MARKETING_ORIGIN:'https://workflowconnect.io',COREOPS_TENANT_ROOT_DOMAIN:'workflowconnect.io'});
      await assert.rejects(run(f.owner,null,()=>exportsService.requestExport(f.w.id,id()),{host:'tenant-one.workflowconnect.io'}));
      const form=new FormData();form.set('operation','recover');form.set('workspaceId',f.w.id);form.set('claimReference','CASE-FOREIGN-HOST');form.set('key',id());assert.ok((await run(f.owner,null,()=>dataAction(form),{host:'tenant-one.workflowconnect.io'})).error);
    }finally{for(const k of keys){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}}
  });
  await t.test('database-backed download admission bounds concurrency and leases block future purge until response release',async()=>{
    const ready=[];for(let i=0;i<5;i++){const f=await fixture();ready.push({f,r:await exportReady(f)});}
    const leases=[];
    try{
      for(const {f,r}of ready.slice(0,4))leases.push(await run(f.owner,null,()=>exportsService.downloadExport(r.id,r.token)));
      const last=ready[4];await assert.rejects(run(last.f.owner,null,()=>exportsService.downloadExport(last.r.id,last.r.token)));
      assert.equal(await prisma.$transaction(async tx=>{await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${ready[0].f.w.id} FOR UPDATE`;return exportsService.hasActiveExport(tx,ready[0].f.w.id,new Date());}),true);
      await exportsService.releaseDownload(leases[0].id,leases[0].workspaceId,leases[0].leaseToken);
      leases.push(await run(last.f.owner,null,()=>exportsService.downloadExport(last.r.id,last.r.token)));
    }finally{for(const lease of leases)await exportsService.releaseDownload(lease.id,lease.workspaceId,lease.leaseToken);}
  });
  await t.test('generation admission contention leaves a pending request safely retryable with the same key',async()=>{
    const f=await fixture(),key=id(),row=await run(f.owner,null,()=>exportsService.requestExport(f.w.id,key));
    let release,acquired;const held=new Promise(resolve=>{release=resolve;});const locked=new Promise(resolve=>{acquired=resolve;});
    const blocker=prisma.$transaction(async tx=>{await tx.$queryRaw`SELECT pg_advisory_xact_lock(811090003,1)::text`;acquired();await held;},{timeout:10000});await locked;
    try{await assert.rejects(run(f.owner,null,()=>exportsService.prepareExport(row.id)));assert.equal((await prisma.workspaceExportRequest.findUnique({where:{id:row.id}})).status,'REQUESTED');}finally{release();await blocker;}
    assert.equal((await run(f.owner,null,()=>exportsService.requestExport(f.w.id,key))).id,row.id);const ready=await run(f.owner,null,()=>exportsService.prepareExport(row.id));assert.ok((await run(f.owner,null,()=>takeExport(ready.id,ready.token))).length);
  });
  await t.test('expiry cleanup removes temporary ciphertext and pending exports protect the future purge lock contract',async()=>{
    const f=await fixture(),r=await exportReady(f);assert.equal(await prisma.$transaction(tx=>exportsService.hasActiveExport(tx,f.w.id,new Date())),true);
    clock=new Date(Date.now()+25*3600000);await exportsService.cleanupDataAccess();assert.equal((await prisma.workspaceExportRequest.findUnique({where:{id:r.id}})).artifact,null);assert.equal(await prisma.$transaction(tx=>exportsService.hasActiveExport(tx,f.w.id,clock)),false);clock=undefined;
    process.env.CRON_SECRET=randomBytes(32).toString('hex');assert.equal((await exportCleanupHandler(new Request('http://localhost:3000/api/lifecycle/export-cleanup'))).status,401);
  });
  await t.test('reviewed recovery never activates without independently funded SUPER_ADMIN activation; concurrent retries restore once',async()=>{
    const f=await fixture(80);await processWorkspaceLifecycle(f.w.id);const grantId=await grant(f,{export:true,reactivate:true});assert.equal((await commercialAccess(f.w.id)).read,false);
    const r=await funded(f,grantId);await assert.rejects(run(adminUser,null,()=>commercial.activateSubscription(r.id,'Recovery ID required')));await assert.rejects(run(f.owner,null,()=>commercial.activateSubscription(r.id,'Owner not admin',grantId)));
    const periods=await Promise.all(Array.from({length:3},()=>run(adminUser,null,()=>commercial.activateSubscription(r.id,'Reviewed recovery and verified payment',grantId))));assert.equal(new Set(periods.map(p=>p.id)).size,1);assert.equal((await commercialAccess(f.w.id)).write,true);assert.equal(await prisma.workspaceLifecycleEvent.count({where:{workspaceId:f.w.id,type:'WORKSPACE_RESTORED'}}),1);
  });
  await t.test('N-X completion near generation deadline starts a new exact 24-hour UTC availability window',async()=>{
    const f=await fixture(),row=await run(f.owner,null,()=>exportsService.requestExport(f.w.id,id())),stored=await prisma.workspaceExportRequest.findUniqueOrThrow({where:{id:row.id}});
    try{clock=new Date(+stored.expiresAt-1);const r=await run(f.owner,null,()=>exportsService.prepareExport(row.id)),ready=await prisma.workspaceExportRequest.findUniqueOrThrow({where:{id:row.id}});assert.equal(+ready.generatedAt,+clock);assert.equal(+ready.artifactExpiresAt-+ready.generatedAt,DAY);assert.equal(+new Date(r.expiresAt)-+clock,5*60000);await assert.rejects(prisma.workspaceExportRequest.update({where:{id:row.id},data:{artifactExpiresAt:null}}));clock=ready.artifactExpiresAt;await assert.rejects(run(f.owner,null,()=>exportsService.authorizeExportDownload(row.id)));await exportsService.cleanupDataAccess();assert.equal((await prisma.workspaceExportRequest.findUniqueOrThrow({where:{id:row.id}})).artifact,null);}finally{clock=undefined;}
  });
  await t.test('N-X independent single-use tokens, retry reuse of ciphertext and fenced releases',async()=>{
    const f=await fixture(),r=await exportReady(f),before=await prisma.workspaceExportRequest.findUniqueOrThrow({where:{id:r.id}});
    const a=await run(f.owner,null,()=>exportsService.downloadExport(r.id,r.token));await assert.rejects(run(f.owner,null,()=>exportsService.authorizeExportDownload(r.id)));await exportsService.releaseDownload(a.id,a.workspaceId,a.leaseToken);
    const fresh=await run(f.owner,null,()=>exportsService.authorizeExportDownload(r.id));assert.notEqual(fresh.token,r.token);await assert.rejects(run(f.owner,null,()=>takeExport(r.id,r.token)));const b=await run(f.owner,null,()=>exportsService.downloadExport(r.id,fresh.token));await exportsService.releaseDownload(a.id,a.workspaceId,a.leaseToken);assert.equal((await prisma.workspaceExportRequest.findUniqueOrThrow({where:{id:r.id}})).downloadLeaseToken,b.leaseToken);await exportsService.releaseDownload(b.id,b.workspaceId,b.leaseToken);const after=await prisma.workspaceExportRequest.findUniqueOrThrow({where:{id:r.id}});assert.deepEqual(after.artifact,before.artifact);assert.equal(await prisma.workspaceLifecycleEvent.count({where:{exportId:r.id,type:'EXPORT_DOWNLOAD_AUTHORIZED'}}),2);
  });
  await t.test('N-X expired authorizations are independently replaceable and concurrent issuance has one winner',async()=>{
    const f=await fixture(),r=await exportReady(f);try{clock=new Date(+new Date(r.expiresAt));await assert.rejects(run(f.owner,null,()=>takeExport(r.id,r.token)));const results=await Promise.allSettled(Array.from({length:5},()=>run(f.owner,null,()=>exportsService.authorizeExportDownload(r.id))));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);const winner=results.find(r=>r.status==='fulfilled').value;assert.ok((await run(f.owner,null,()=>takeExport(r.id,winner.token))).length);}finally{clock=undefined;}
  });
  await t.test('N-X missing old encryption key fails closed; retained key permits retry without changing ciphertext',async()=>{
    const f=await fixture(),r=await exportReady(f),old=process.env.COREOPS_EXPORT_ENCRYPTION_KEY;process.env.COREOPS_EXPORT_ENCRYPTION_KEY=randomBytes(32).toString('base64');try{await assert.rejects(run(f.owner,null,()=>takeExport(r.id,r.token)));process.env.COREOPS_EXPORT_PREVIOUS_ENCRYPTION_KEYS=JSON.stringify([old]);assert.ok((await run(f.owner,null,()=>takeExport(r.id,r.token))).length);}finally{process.env.COREOPS_EXPORT_ENCRYPTION_KEY=old;delete process.env.COREOPS_EXPORT_PREVIOUS_ENCRYPTION_KEYS;}
  });
  await t.test('N-X explicit other-owner supersession is audited and cannot cancel a live download',async()=>{
    const f=await fixture(),r=await exportReady(f),second=await user();await prisma.workspaceMember.create({data:{workspaceId:f.w.id,userId:second.id,role:'OWNER'}});await assert.rejects(run(second,null,()=>exportsService.requestExport(f.w.id,id())));const active=await run(f.owner,null,()=>exportsService.downloadExport(r.id,r.token));await assert.rejects(run(second,null,()=>exportsService.cancelExport(r.id)));await exportsService.releaseDownload(active.id,active.workspaceId,active.leaseToken);await run(second,null,()=>exportsService.cancelExport(r.id));assert.equal(await prisma.auditLog.count({where:{workspaceId:f.w.id,actorUserId:second.id,action:'EXPORT_CANCELED_BY_OWNER'}}),1);await assert.rejects(run(f.owner,null,()=>exportsService.authorizeExportDownload(r.id)));const replacement=await run(second,null,()=>exportsService.requestExport(f.w.id,id()));assert.notEqual(replacement.id,r.id);
  });
  await t.test('N-X per-requester authorization budget cannot be bypassed by fresh tokens',async()=>{const f=await fixture(),r=await exportReady(f);await run(f.owner,null,()=>takeExport(r.id,r.token));for(let i=0;i<4;i++){const a=await run(f.owner,null,()=>exportsService.authorizeExportDownload(r.id));await run(f.owner,null,()=>takeExport(r.id,a.token));}await assert.rejects(run(f.owner,null,()=>exportsService.authorizeExportDownload(r.id)));});
  await t.test('N-X schema rejects foreign authorization identity and deadlines; recovery access ends before artifact availability',async()=>{
    const f=await fixture(80),g=await grant(f),grantRow=await prisma.workspaceRecoveryRequest.findUniqueOrThrow({where:{id:g}});try{clock=new Date(+grantRow.expiresAt-60000);const r=await exportReady(f,g);assert.equal(+new Date(r.expiresAt),+grantRow.expiresAt);assert.ok(+new Date(r.artifactExpiresAt)>+grantRow.expiresAt);const a=await prisma.exportDownloadAuthorization.findFirstOrThrow({where:{exportId:r.id}});await assert.rejects(prisma.exportDownloadAuthorization.update({where:{id:a.id},data:{expiresAt:new Date(+a.expiresAt+1)}}));await assert.rejects(prisma.exportDownloadAuthorization.create({data:{exportId:r.id,workspaceId:f.w.id,requesterId:staff.id,tokenHash:'a'.repeat(64),issuedAt:clock,expiresAt:new Date(+clock+1000)}}));clock=grantRow.expiresAt;await assert.rejects(run(f.owner,null,()=>takeExport(r.id,r.token)));await exportsService.cleanupDataAccess();assert.equal((await prisma.workspaceExportRequest.findUniqueOrThrow({where:{id:r.id}})).artifact,null);}finally{clock=undefined;}
  });
  await t.test('N-X future ready email relevance requires actual artifact and useful grant window; never enables sending',async()=>{
    const f=await fixture(),r=await exportReady(f),e=await prisma.workspaceLifecycleEvent.findFirstOrThrow({where:{exportId:r.id,type:'EXPORT_READY'}}),{evaluateSource}=require('../src/server/notifications/recipients.ts'),source={kind:'LIFECYCLE',workspaceId:f.w.id,lifecycleEventId:e.id};
    assert.ok((await evaluateSource(source,prisma,new Date())).intents.some(i=>i.kind==='EXPORT_AVAILABLE'));await prisma.user.update({where:{id:f.owner.id},data:{email:'changed-'+randomUUID()+'@example.test'}});assert.equal((await evaluateSource(source,prisma,new Date())).intents.length,0);await prisma.user.update({where:{id:f.owner.id},data:{email:f.owner.email}});const x=await prisma.workspaceExportRequest.findUniqueOrThrow({where:{id:r.id}});assert.equal((await evaluateSource(source,prisma,new Date(+x.artifactExpiresAt-29*60000))).intents.length,0);
  });
  await t.test('N-X retained artifact count capacity is serialized and fails before generating another artifact',async()=>{
    const f=await fixture(),pending=await run(f.owner,null,()=>exportsService.requestExport(f.w.id,id())),at=new Date(),existing=await prisma.workspaceExportRequest.count({where:{artifact:{not:null}}}),count=100-existing,rows=Array.from({length:count},()=>({w:id(),sub:id(),r:id(),p:id(),x:id()}));ws.push(...rows.map(r=>r.w));
    await prisma.workspace.createMany({data:rows.map(r=>({id:r.w,name:'Capacity fixture only',slug:r.w}))});await prisma.subscription.createMany({data:rows.map(r=>({id:r.sub,workspaceId:r.w,status:'ACTIVE',plan:'BUSINESS'}))});
    await prisma.subscriptionRequest.createMany({data:rows.map(r=>({id:r.r,workspaceId:r.w,subscriptionId:r.sub,submittedByUserId:f.owner.id,offerId:offer.id,type:'INITIAL',status:'ACTIVATED',idempotencyKey:r.r,payloadHash:'fixture',plan:'BUSINESS',interval:'MONTHLY',offerVersion:offer.version,catalogAmount:'100',currency:'KES',memberLimit:10,invitationsEnabled:true,features:{},taxTreatment:'EXEMPT'}))});
    await prisma.subscriptionPeriod.createMany({data:rows.map(r=>({id:r.p,workspaceId:r.w,subscriptionId:r.sub,sourceRequestId:r.r,plan:'BUSINESS',interval:'MONTHLY',startsAt:new Date(+at-DAY*30),endsAt:new Date(+at+DAY),graceEndsAt:new Date(+at+DAY*8),anchorDay:at.getUTCDate(),memberLimit:10,invitationsEnabled:true,features:{},agreedAmount:'100',currency:'KES',activatedById:admin.id}))});
    const security=require('../src/server/data-access/security.ts'),artifact=security.encrypt(Buffer.alloc(0),'synthetic-capacity-only');
    await prisma.workspaceExportRequest.createMany({data:rows.map(r=>({id:r.x,workspaceId:r.w,requesterId:f.owner.id,sourcePeriodId:r.p,idempotencyKey:r.x,payloadHash:'fixture',expiresAt:new Date(+at+899000),createdAt:new Date(+at-1000),availabilityVersion:2,requesterExternalId:f.owner.externalId,requesterEmailHash:security.hash(f.owner.email),status:'READY',artifact,artifactDigest:'b'.repeat(64),artifactKeyVersion:security.exportKeyVersion(),generatedAt:at,artifactExpiresAt:new Date(+at+DAY)}))});
    try{assert.equal(await prisma.workspaceExportRequest.count({where:{artifact:{not:null}}}),100);await assert.rejects(run(f.owner,null,()=>exportsService.prepareExport(pending.id)));assert.equal((await prisma.workspaceExportRequest.findUniqueOrThrow({where:{id:pending.id}})).status,'REQUESTED');}finally{await prisma.workspaceExportRequest.updateMany({where:{id:{in:rows.map(r=>r.x)}},data:{status:'EXPIRED',artifact:null}});}
  });
  await t.test('N-X interrupted HTTP download can reauthorize the same artifact; crash cleanup preserves fencing and reports failures',async()=>{
    const f=await fixture();await prisma.client.update({where:{id:f.client.id},data:{name:'Synthetic bulk '.repeat(8000)}});const r=await exportReady(f),req=new Request(`http://localhost:3000/account/data/exports/${r.id}/download`,{method:'POST',headers:{origin:'http://localhost:3000','content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:r.token})});const response=await run(f.owner,null,()=>exportDownloadHandler(req,{params:Promise.resolve({id:r.id})}));assert.equal(response.status,200);await response.body.cancel();const next=await run(f.owner,null,()=>exportsService.authorizeExportDownload(r.id));const abandoned=await run(f.owner,null,()=>exportsService.downloadExport(r.id,next.token));
    try{clock=new Date(Date.now()+61000);const transaction=prisma.$transaction.bind(prisma);let failed=false;prisma.$transaction=async(...args)=>{if(!failed){failed=true;throw Error('Private cleanup fault');}return transaction(...args);};let result;try{result=await exportsService.cleanupDataAccess();}finally{prisma.$transaction=transaction;}assert.equal(result.failures.length,1);assert.equal(result.failures[0].code,'CLEANUP_FAILED');await exportsService.cleanupDataAccess();assert.equal((await prisma.workspaceExportRequest.findUniqueOrThrow({where:{id:r.id}})).downloadLeaseToken,null);const fresh=await run(f.owner,null,()=>exportsService.authorizeExportDownload(r.id));assert.ok((await run(f.owner,null,()=>takeExport(r.id,fresh.token))).length);await exportsService.releaseDownload(abandoned.id,abandoned.workspaceId,abandoned.leaseToken);}finally{clock=undefined;}
  });
  await t.test('N-X consumed restoration grant never inherits 24-hour export authority',async()=>{const f=await fixture(80);await processWorkspaceLifecycle(f.w.id);const g=await grant(f,{export:true,reactivate:true}),r=await exportReady(f,g),before=await prisma.workspaceRecoveryRequest.findUniqueOrThrow({where:{id:g}}),requestRow=await funded(f,g);await run(adminUser,null,()=>commercial.activateSubscription(requestRow.id,'Verified funded restoration',g));await assert.rejects(run(f.owner,null,()=>takeExport(r.id,r.token)));assert.equal(+(await prisma.workspaceRecoveryRequest.findUniqueOrThrow({where:{id:g}})).expiresAt,+before.expiresAt);await exportsService.cleanupDataAccess();assert.equal((await prisma.workspaceExportRequest.findUniqueOrThrow({where:{id:r.id}})).artifact,null);});
  await t.test('CSV formula injection and ZIP size limits preserve exact JSON source values',()=>{
    assert.match(csv([{v:' \t=1+1'}],['v']),/' \t=1\+1/);assert.match(csv([{v:'@cmd'}],['v']),/'@cmd/);assert.throws(()=>zip({'too-big.txt':'x'.repeat(100)},20));
  });
 }finally{
  clock=undefined;
  await prisma.workspaceLifecycleEvent.deleteMany({where:{workspaceId:{in:ws}}});await prisma.exportDownloadAuthorization.deleteMany({where:{workspaceId:{in:ws}}});await prisma.workspaceExportRequest.deleteMany({where:{workspaceId:{in:ws}}});await prisma.workspaceRecoveryRequest.deleteMany({where:{workspaceId:{in:ws}}});await prisma.workspaceLifecycle.deleteMany({where:{workspaceId:{in:ws}}});
  if(admin)await prisma.platformAuditEvent.deleteMany({where:{actorAdminId:admin.id}});await prisma.auditLog.deleteMany({where:{workspaceId:{in:ws}}});await prisma.subscriptionPaymentReceipt.deleteMany({where:{workspaceId:{in:ws}}});await prisma.subscriptionPayment.deleteMany({where:{workspaceId:{in:ws}}});await prisma.subscriptionPeriod.deleteMany({where:{workspaceId:{in:ws}}});await prisma.subscriptionRequest.deleteMany({where:{workspaceId:{in:ws}}});await prisma.subscription.deleteMany({where:{workspaceId:{in:ws}}});
  await prisma.task.deleteMany({where:{workspaceId:{in:ws}}});await prisma.invoice.deleteMany({where:{workspaceId:{in:ws}}});await prisma.projectMember.deleteMany({where:{workspaceId:{in:ws}}});await prisma.project.deleteMany({where:{workspaceId:{in:ws}}});await prisma.client.deleteMany({where:{workspaceId:{in:ws}}});await prisma.workspaceMember.deleteMany({where:{workspaceId:{in:ws}}});await prisma.workspace.deleteMany({where:{id:{in:ws}}});if(offer)await prisma.subscriptionPlanOffer.delete({where:{id:offer.id}});if(account)await prisma.paymentReceivingAccount.delete({where:{id:account.id}});await prisma.platformAdmin.deleteMany({where:{userId:{in:users}}});await prisma.user.deleteMany({where:{id:{in:users}}});await prisma.$disconnect();
 }
});
