const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AsyncLocalStorage } = require('node:async_hooks');
const { randomUUID, randomInt, createHmac, randomBytes } = require('node:crypto');
const Module = require('node:module');
const path = require('node:path');
if (!process.env.DATABASE_URL || !['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname) || !/^\/coreops_auth_rehearsal_market_[a-z0-9_]+$/.test(new URL(process.env.DATABASE_URL).pathname)) throw new Error('Use an isolated coreops_auth_rehearsal database.');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', jsx: 'react-jsx' } });
const request = new AsyncLocalStorage(), load = Module._load;
Module._load = function(name, parent, main) {
  if (name === 'server-only') return {};
  if (name.endsWith('/get-current-user') || name === './get-current-user') return { getCurrentUser: async () => { if (!request.getStore()?.user) throw new Error('Unauthenticated'); return request.getStore().user; } };
  if (name.endsWith('/clerk-identity')) return { requireClerkIdentity: async () => ({ id: request.getStore()?.user?.externalId, twoFactorEnabled: request.getStore()?.mfa !== false, primaryEmailAddress: { emailAddress: request.getStore()?.user?.email } }) };
  if (name === 'next/headers') return { headers: async () => new Headers({ host: request.getStore()?.host ?? 'localhost:3000', 'x-coreops-workspace': request.getStore()?.workspace?.slug ?? '', 'x-coreops-path': `/w/${request.getStore()?.workspace?.slug ?? ''}/subscription` }) };
  if (name === '@clerk/nextjs/server') return { clerkClient: async()=>({users:{getUser:async externalId=>{const user=await prisma.user.findUniqueOrThrow({where:{externalId}});return {id:externalId,primaryEmailAddressId:'primary',emailAddresses:[{id:'primary',emailAddress:user.email,verification:{status:request.getStore()?.ownerVerified===false?'unverified':'verified'}}]};}}}), auth: async () => ({ userId: request.getStore()?.user?.externalId, sessionClaims:{fva:request.getStore()?.secondFactor===false?[0,-1]:[0,0]}, has: () => request.getStore()?.mfa !== false }), currentUser: async () => ({ id: request.getStore()?.user?.externalId, emailAddresses: [{ emailAddress: request.getStore()?.user?.email, verification: { status: 'verified' } }] }) };
  if (name.startsWith('@/')) name = path.resolve(__dirname, '../src', name.slice(2));
  return load.call(this,name,parent,main);
};
const { prisma } = require('../src/server/db/prisma.ts');
const service = require('../src/server/commercial/service.ts');
const { commercialAccess } = require('../src/server/commercial/access.ts');
const members = require('../src/server/services/memberships.service.ts');
const clients = require('../src/server/services/clients.service.ts');
const id = () => `commercial-test-${randomUUID()}`;
const run = (user, workspace, fn, mfa=true) => request.run({ user, workspace, mfa },fn);

process.env.COREOPS_MARKET_REHEARSAL_ENABLED='true';
const market=require('../src/server/market/service.ts');
const {createInitialWorkspace}=require('../src/server/services/workspace-onboarding.service.ts');
const {requireApplicationEligibility}=require('../src/server/market/access.ts');
const {paidWorkspace}=require('./commercial-fixtures.cjs');
const {cleanupMarket}=require('./market-fixtures.cjs');
const submit=(u,country='KE',extra={})=>run(u,null,()=>market.submitMarketApplication({country,interest:'WORKFLOW',useCase:'Synthetic project management',attested:true,idempotencyKey:id(),...extra}));
test('isolated market foundation, real SQL and domain integration',async t=>{
 const users=[],ws=[],offers=[],accounts=[];let adminUser,owner,international,other,billing,admin,app,w,intApp,intW,offer,account;
 async function user(){const u=await prisma.user.create({data:{id:id(),externalId:id(),email:`${id()}@example.test`}});users.push(u);return u;}
 const review=(a,type='APPROVE',patch={})=>run(adminUser,null,()=>market.reviewMarketApplication(a.id,{type,expectedRevision:a.revision,reason:'Independent synthetic business review',operationKey:id(),validUntil:type==='APPROVE'?new Date(Date.now()+3600000).toISOString():undefined,...patch}));
 async function ready(target,person,type='INITIAL'){
  const r=await run(person,target,()=>service.submitRequest(offer.id,type,id()));
  await run(adminUser,null,()=>service.reviewRequest(r.id,{amount:'100',tax:'0',memberLimit:10,accountId:account.id,notes:'Synthetic commercial review'}));
  await run(person,target,()=>service.acceptQuote(r.id));
  const payment=await run(person,target,()=>service.submitPayment(r.id,{reference:id(),amount:'100',idempotencyKey:id()}));
  await run(billing,null,()=>service.verifyPayment(payment.id,{amount:'100',reference:payment.normalizedReference,ledgerEntryId:id(),receivedAt:new Date(Date.now()-1000).toISOString(),notes:'Synthetic independent ledger'}));return r;
 }
 try{
  adminUser=await user();owner=await user();international=await user();other=await user();billing=await user();
  admin=await prisma.platformAdmin.create({data:{userId:adminUser.id,role:'SUPER_ADMIN'}});await prisma.platformAdmin.create({data:{userId:billing.id,role:'BILLING_ADMIN'}});
  await t.test('account-only OPEN declaration and international inquiry create no tenant records',async()=>{
   const before=[await prisma.workspace.count(),await prisma.subscription.count(),await prisma.workspaceMember.count()];
   app=await submit(owner);intApp=await submit(international,'UG');
   assert.equal(app.state,'APPROVED');assert.equal(intApp.state,'SUBMITTED');
   const d=await prisma.marketDecision.findUniqueOrThrow({where:{id:app.currentDecisionId}});assert.equal(d.type,'OPEN_POLICY');assert.equal(d.reason,'SELF_DECLARED_OPEN_MARKET');assert.equal(d.reviewerAdminId,null);
   assert.deepEqual([await prisma.workspace.count(),await prisma.subscription.count(),await prisma.workspaceMember.count()],before);
   assert.equal((await run(international,null,market.ownMarketApplications)).length,1);
  });
  await t.test('direct creation, fake country and foreign application cannot bypass eligibility',async()=>{
   await assert.rejects(run(owner,null,()=>createInitialWorkspace('No decision',id())));
   await assert.rejects(run(other,null,()=>createInitialWorkspace('Foreign case',id(),app.id)));
   await assert.rejects(run(international,null,()=>createInitialWorkspace('Unreviewed',id(),intApp.id)));
   await assert.rejects(submit(other,'XX'));await assert.rejects(submit(null));
  });
  await t.test('concurrent provision is single, bound, pending and denies direct operational services',async()=>{
   const rows=await Promise.all(Array.from({length:6},()=>run(owner,null,()=>createInitialWorkspace('Self-declared Kenyan business',id(),app.id))));w=rows[0];ws.push(w.id);assert.ok(rows.every(v=>v.id===w.id));assert.equal(w.activationStatus,'PENDING_ACTIVATION');assert.equal(w.marketApplicationId,app.id);
   assert.equal(await prisma.workspaceMember.count({where:{workspaceId:w.id,role:'OWNER'}}),1);assert.equal((await commercialAccess(w.id)).read,false);
   await assert.rejects(run(owner,w,()=>clients.getClients()));await assert.rejects(run(owner,w,()=>members.createInvitation({email:other.email,role:'STAFF'})));
   assert.ok(await run(owner,w,service.ownerSubscription));
  });
  await t.test('review enforces active SUPER_ADMIN, MFA, host, independent actor and stale revision',async()=>{
   await assert.rejects(run(billing,null,()=>market.reviewMarketApplication(intApp.id,{type:'APPROVE',expectedRevision:1,reason:'Synthetic reason',operationKey:id(),validUntil:new Date(Date.now()+100000).toISOString()})));
   await assert.rejects(request.run({user:adminUser,mfa:false},()=>market.reviewMarketApplication(intApp.id,{type:'APPROVE',expectedRevision:intApp.revision,reason:'Synthetic reason',operationKey:id(),validUntil:new Date(Date.now()+100000).toISOString()})));
   const own=await submit(adminUser,'UG');await assert.rejects(review(own));
   await assert.rejects(review(intApp,'APPROVE',{expectedRevision:0}));await assert.rejects(review(intApp,'APPROVE',{validUntil:undefined}));
   await review(intApp);intApp=await prisma.marketApplication.findUniqueOrThrow({where:{id:intApp.id}});
   intW=await run(international,null,()=>createInitialWorkspace('Reviewed international business',id(),intApp.id));ws.push(intW.id);
  });
  await t.test('country revisions never inherit approval, idempotency mismatches fail, bound changes blocked',async()=>{
   const key=id();const a=await submit(other,'KE',{idempotencyKey:key});const same=await submit(other,'KE',{idempotencyKey:key});assert.equal(same.id,a.id);await assert.rejects(submit(other,'UG',{idempotencyKey:key}));
   const updated=await submit(other,'UG',{applicationId:a.id,expectedRevision:a.revision});assert.equal(updated.state,'SUBMITTED');assert.equal(updated.currentDecisionId,null);assert.equal(updated.operativeSubmissionId,null);assert.equal(await prisma.marketSubmission.count({where:{applicationId:a.id}}),2);
   await assert.rejects(submit(owner,'UG',{applicationId:app.id,expectedRevision:app.revision}));
  });
  offer=await prisma.subscriptionPlanOffer.create({data:{id:id(),plan:'BUSINESS',interval:'MONTHLY',version:randomInt(1000,2000000000),name:'Synthetic offer',amount:'100',memberLimit:10,invitationsEnabled:true,features:{clients:true,projects:true,tasks:true,invoices:true,dashboard:true},taxTreatment:'EXEMPT',published:true,businessApprovedAt:new Date(),businessApprovalRef:'Synthetic approval',approvedById:admin.id}});offers.push(offer.id);
  account=await prisma.paymentReceivingAccount.create({data:{id:id(),label:'Synthetic bank',method:'BANK',currency:'KES',accountIdentifier:id(),instructions:'Synthetic only',active:true,verifiedAt:new Date(),verifiedById:admin.id}});accounts.push(account.id);
  let r,ir;
  await t.test('market does not replace quote, funding or independent activation; renewal preserved',async()=>{
   await assert.rejects(run(adminUser,null,()=>service.setWorkspaceStatus(w.id,'ACTIVE','Synthetic status')));
   r=await ready(w,owner);await assert.rejects(run(billing,null,()=>service.activateSubscription(r.id,'Not authorized')));
   const period=await run(adminUser,null,()=>service.activateSubscription(r.id,'Synthetic activation'));assert.ok(period.id);assert.equal((await commercialAccess(w.id)).read,true);
   assert.equal((await run(adminUser,null,()=>service.activateSubscription(r.id,'Synthetic replay'))).id,period.id);
   const renewal=await ready(w,owner,'RENEWAL');const next=await run(adminUser,null,()=>service.activateSubscription(renewal.id,'Synthetic renewal'));assert.equal(+next.startsAt,+period.endsAt);
   const c=await run(owner,w,()=>clients.createClient({name:'Synthetic authorized business record'}));assert.equal(c.workspaceId,w.id);
   ir=await ready(intW,international);
  });
  await t.test('revocation blocks funded activation, status restoration and service access without rewriting funds',async()=>{
   const before=await prisma.subscriptionPaymentReceipt.count({where:{workspaceId:intW.id}});
   intApp=await prisma.marketApplication.findUniqueOrThrow({where:{id:intApp.id}});await review(intApp,'REVOKE');
   await assert.rejects(run(adminUser,null,()=>service.activateSubscription(ir.id,'Must deny')));assert.equal((await commercialAccess(intW.id)).read,false);await assert.rejects(run(international,intW,()=>clients.getClients()));assert.equal(await prisma.subscriptionPaymentReceipt.count({where:{workspaceId:intW.id}}),before);
   app=await prisma.marketApplication.findUniqueOrThrow({where:{id:app.id}});await review(app,'REVOKE');
   await assert.rejects(run(adminUser,null,()=>service.activateSubscription(r.id,'Replay denied')));await assert.rejects(run(adminUser,null,()=>service.setWorkspaceStatus(w.id,'ACTIVE','Reactivation denied')));
   const blocked=await commercialAccess(w.id);assert.equal(blocked.read,false);delete process.env.COREOPS_MARKET_REHEARSAL_ENABLED;assert.equal((await commercialAccess(w.id)).read,false);process.env.COREOPS_MARKET_REHEARSAL_ENABLED='true';
  });
  await t.test('shared users retain independent legacy membership and cannot clear immutable bindings',async()=>{
   const legacy=await prisma.workspace.create({data:{id:id(),name:'Synthetic legacy',slug:id()}});ws.push(legacy.id);offers.push(await paidWorkspace(prisma,legacy,owner));await prisma.workspaceMember.create({data:{workspaceId:legacy.id,userId:owner.id,role:'OWNER'}});assert.equal((await commercialAccess(legacy.id)).read,true);assert.equal((await commercialAccess(w.id)).read,false);
   await assert.rejects(prisma.workspace.update({where:{id:w.id},data:{marketApplicationId:null}}));
   await assert.rejects(prisma.marketDecision.update({where:{id:intApp.currentDecisionId},data:{reason:'rewrite'}}));
   await assert.rejects(prisma.marketApplication.update({where:{id:app.id},data:{applicantUserId:other.id,revision:{increment:1}}}));
  });
  await t.test('concurrent decisions and withdrawal/provision races preserve one authority',async()=>{
   const u=await user();const a=await submit(u,'UG');const results=await Promise.allSettled([review(a),review(a)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
   const ku=await user();const ka=await submit(ku);const race=await Promise.allSettled([run(ku,null,()=>createInitialWorkspace('Race business',id(),ka.id)),run(ku,null,()=>market.withdrawMarketApplication(ka.id,ka.revision,id()))]);
   const created=await prisma.workspace.findUnique({where:{marketApplicationId:ka.id}});if(created)ws.push(created.id);
   assert.equal(race.filter(r=>r.status==='fulfilled').length,1);assert.equal((await prisma.marketApplication.findUniqueOrThrow({where:{id:ka.id}})).state,created?'APPROVED':'WITHDRAWN');
   const operation=prisma.$transaction.bind(prisma);prisma.$transaction=(fn,options)=>operation(tx=>fn(new Proxy(tx,{get(target,key){if(key==='platformAuditEvent')return {create:async()=>{throw Error('SYNTHETIC_PRIVATE_AUDIT_ERROR');}};const v=Reflect.get(target,key);return typeof v==='function'?v.bind(target):v;}})),options);
   const b=await submit(await user(),'UG');try{await assert.rejects(review(b));}finally{prisma.$transaction=operation;}assert.equal((await prisma.marketApplication.findUniqueOrThrow({where:{id:b.id}})).state,'SUBMITTED');assert.equal(await prisma.marketDecision.count({where:{applicationId:b.id}}),0);
  });
  await t.test('recovery grants cannot override market revocation and preserve N-X scope checks',async()=>{
   const flags={COREOPS_LIFECYCLE_ENFORCEMENT_ENABLED:'true',COREOPS_SECURE_EXPORTS_ENABLED:'true',COREOPS_EXPORT_ENCRYPTION_KEY:randomBytes(32).toString('base64')};const old=Object.fromEntries(Object.keys(flags).map(k=>[k,process.env[k]]));Object.assign(process.env,flags);
   try{
    const recovery=require('../src/server/data-access/recovery.ts');const requested=await run(owner,w,()=>recovery.requestRecovery(w.id,'Synthetic authority reference',id()));await run(adminUser,null,()=>recovery.reviewRecovery(requested.id,{approve:true,export:true,reactivate:true,minutes:30,evidence:'Synthetic ownership evidence',reason:'Independent synthetic review',ownershipVerified:true}));
    const renewal=await prisma.subscriptionRequest.findFirstOrThrow({where:{workspaceId:w.id},orderBy:{createdAt:'desc'}});await assert.rejects(run(adminUser,null,()=>service.activateSubscription(renewal.id,'Recovery cannot override market',requested.id)));assert.equal((await commercialAccess(w.id)).read,false);
   }finally{for(const[k,v]of Object.entries(old)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
  });
  await t.test('signed payment callbacks reconcile money after revocation without market activation',async()=>{
   const gateway=require('../src/server/payments/paystack.ts');const vars={PAYSTACK_TEST_SECRET_KEY:'sk_test_synthetic_market',PAYSTACK_TEST_MERCHANT_ID:`market_${randomUUID().replaceAll('-','')}`,PAYSTACK_TEST_CURRENCY:'KES',PAYSTACK_TEST_CHANNELS:'card',PAYSTACK_TEST_CHECKOUT_ENABLED:'true',PAYSTACK_TEST_CAPABILITIES_APPROVAL:'Synthetic capabilities',PAYSTACK_TEST_SETTLEMENT_APPROVAL:'Synthetic settlement',PAYSTACK_TEST_ALLOW_LEGACY_SIGNATURE:'true'};
   const old=Object.fromEntries(Object.keys(vars).map(k=>[k,process.env[k]])),fetch=global.fetch;Object.assign(process.env,vars);
   let reference;
   global.fetch=async(url,options={})=>{assert.ok(String(url).startsWith('https://api.paystack.co/'));if(options.method==='POST'){const body=JSON.parse(options.body);reference=body.reference;return new Response(JSON.stringify({status:true,data:{reference,authorization_url:`https://checkout.paystack.com/${reference}`}}));}const a=await prisma.paystackAttempt.findUniqueOrThrow({where:{reference}});return new Response(JSON.stringify({status:true,data:{id:'987654321',status:'success',reference,domain:'test',currency:'KES',amount:10000,channel:'card',paid_at:new Date(Date.now()-1000).toISOString(),integration:a.merchantId,metadata:{coreopsRequestId:a.requestId,coreopsWorkspaceId:a.workspaceId,coreopsAttemptId:a.id,coreopsMerchantId:a.merchantId,coreopsMode:'test'}}}));};
   try{
    const u=await user(),a=await submit(u),target=await run(u,null,()=>createInitialWorkspace('Synthetic callback business',id(),a.id));ws.push(target.id);
    const receiving=await run(adminUser,null,()=>gateway.registerPaystackMerchant('test','Synthetic independently reviewed merchant'));accounts.push(receiving.id);
    const r=await run(u,target,()=>service.submitRequest(offer.id,'INITIAL',id()));await run(adminUser,null,()=>service.reviewRequest(r.id,{amount:'100',tax:'0',memberLimit:10,accountId:receiving.id,notes:'Synthetic reviewed quote'}));await run(u,target,()=>service.acceptQuote(r.id));
    await run(u,target,()=>gateway.initializePaystack(r.id,id(),'test'));await review(a,'REVOKE');
    const raw=Buffer.from(JSON.stringify({event:'charge.success',data:{reference}})),signature=createHmac('sha512',vars.PAYSTACK_TEST_SECRET_KEY).update(raw).digest('hex');await gateway.processPaystackWebhook(raw,null,signature,'test');await gateway.processPaystackWebhook(raw,null,signature,'test');
    assert.equal(await prisma.subscriptionPaymentReceipt.count({where:{requestId:r.id}}),1);await assert.rejects(run(adminUser,null,()=>service.activateSubscription(r.id,'Callback is not market approval')));assert.equal((await commercialAccess(target.id)).read,false);
   }finally{global.fetch=fetch;for(const[k,v]of Object.entries(old)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
  });
  await t.test('account and reviewer RSC boundaries scope projections and never grant service access',async()=>{
   const Page=require('../src/app/account/market/page.tsx').default;const Admin=require('../src/app/platform/(protected)/market/page.tsx').default;
   const ownTree=await run(other,null,()=>Page());const seen=new WeakSet();const projected=JSON.stringify(ownTree,(_key,v)=>{if(v&&typeof v==='object'){if(seen.has(v))return undefined;seen.add(v);}return v;});assert.ok(!projected.includes(intApp.id));await assert.rejects(run(billing,null,()=>Admin()));await assert.rejects(run(adminUser,null,()=>Admin(),false));
   const approved=await prisma.marketApplication.findFirstOrThrow({where:{applicantUserId:owner.id}});await assert.rejects(submit(owner,'KE',{applicationId:approved.id,expectedRevision:approved.revision}));
  });
  await t.test('finite synthetic approvals expire without scheduler; policy configuration is audited and prospective',async()=>{
   const u=await user();const a=await submit(u,'UG');await review(a,'APPROVE',{validUntil:new Date(Date.now()+500).toISOString()});await new Promise(r=>setTimeout(r,550));await assert.rejects(requireApplicationEligibility(prisma,a.id));
   const p=await run(adminUser,null,()=>market.configureMarketPolicy({version:`TEST-${Date.now()}`,countries:{KE:'OPEN',UG:'UNAVAILABLE'},reason:'Synthetic prospective policy'}));assert.equal((await submit(await user(),'UG')).state,'REJECTED');assert.equal((await prisma.marketSubmission.findFirstOrThrow({where:{applicationId:w.marketApplicationId}})).policyId,'KENYA-FIRST-v1');
   await prisma.platformAuditEvent.deleteMany({where:{resourceType:'MarketPolicy',resourceId:p.id}});
  });
  await t.test('remote/deployed gate denies even correct approval and does not enable manual production release',async()=>{
   process.env.VERCEL='1';try{await assert.rejects(submit(await user()));assert.equal((await commercialAccess(w.id)).read,false);}finally{delete process.env.VERCEL;}
  });
 }finally{
  await prisma.platformAuditEvent.deleteMany({where:{workspaceId:{in:ws}}});
  await prisma.auditLog.deleteMany({where:{workspaceId:{in:ws}}});await prisma.client.deleteMany({where:{workspaceId:{in:ws}}});
  await prisma.workspaceLifecycleEvent.deleteMany({where:{workspaceId:{in:ws}}});await prisma.workspaceRecoveryRequest.deleteMany({where:{workspaceId:{in:ws}}});
  const attempts=await prisma.paystackAttempt.findMany({where:{workspaceId:{in:ws}},select:{reference:true}});await prisma.paystackWebhookEvent.deleteMany({where:{reference:{in:attempts.map(a=>a.reference)}}});
  await prisma.subscriptionPaymentReversal.deleteMany({where:{receipt:{workspaceId:{in:ws}}}});await prisma.subscriptionPaymentReceipt.deleteMany({where:{workspaceId:{in:ws}}});await prisma.paystackAttempt.deleteMany({where:{workspaceId:{in:ws}}});await prisma.subscriptionPayment.deleteMany({where:{workspaceId:{in:ws}}});
  await prisma.subscriptionPeriod.deleteMany({where:{workspaceId:{in:ws}}});await prisma.subscriptionRequest.deleteMany({where:{workspaceId:{in:ws}}});await prisma.subscription.deleteMany({where:{workspaceId:{in:ws}}});await prisma.workspaceMember.deleteMany({where:{workspaceId:{in:ws}}});await prisma.workspace.deleteMany({where:{id:{in:ws}}});
  await cleanupMarket(prisma,users.map(u=>u.id));await prisma.platformAuditEvent.deleteMany({where:{actorAdminId:admin.id}});await prisma.subscriptionPlanOffer.deleteMany({where:{id:{in:offers}}});await prisma.paymentReceivingAccount.deleteMany({where:{id:{in:accounts}}});await prisma.platformAdmin.deleteMany({where:{userId:{in:users.map(u=>u.id)}}});await prisma.user.deleteMany({where:{id:{in:users.map(u=>u.id)}}});
  await prisma.marketPolicy.deleteMany({where:{id:{startsWith:'TEST-'}}});await prisma.$disconnect();
 }
});
