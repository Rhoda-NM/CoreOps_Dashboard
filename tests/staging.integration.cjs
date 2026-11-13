const {test}=require('node:test'),assert=require('node:assert/strict');
const {AsyncLocalStorage}=require('node:async_hooks'),{randomUUID,createHmac,createHash}=require('node:crypto');
const Module=require('node:module'),path=require('node:path');
if(!['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL||'invalid:').hostname)||!new URL(process.env.DATABASE_URL).pathname.startsWith('/coreops_auth_rehearsal_staging_'))throw Error('Disposable loopback staging fixture only');
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}});
const context=new AsyncLocalStorage(),load=Module._load,profiles=new Map(),providerOverrides=new Map();
let prisma,providerCalls=0,initializeCalls=0;
Module._load=function(n,p,m){
 if(n==='server-only')return {};
 if(n==='next/navigation')return {redirect:url=>{throw Error('REDIRECT:'+url);},notFound:()=>{throw Error('NOT_FOUND');},unstable_rethrow:()=>{}};
 if(n==='next/headers')return {headers:async()=>new Headers({host:'localhost:3000','x-coreops-workspace':context.getStore()?.workspace?.slug??'','x-coreops-path':'/w/'+(context.getStore()?.workspace?.slug??'')+'/subscription'})};
 if(n==='@clerk/nextjs/server')return {auth:async()=>({userId:context.getStore()?.externalId,sessionId:context.getStore()?.externalId?'session-synthetic':null,sessionClaims:{fva:context.getStore()?.stale?[12,12]:[0,0]},has:()=>!context.getStore()?.stale}),currentUser:async()=>profiles.get(context.getStore()?.externalId),clerkClient:async()=>({sessions:{getSession:async()=>({userId:context.getStore()?.externalId,status:context.getStore()?.expired?'revoked':'active',expireAt:Date.now()+60000})},users:{getUser:async id=>profiles.get(id)}})};
 if(n.startsWith('@/'))n=path.resolve(__dirname,'../src',n.slice(2));return load.call(this,n,p,m);
};
({prisma}=require('../src/server/db/prisma.ts'));
const {stagingTarget}=require('../src/server/staging/config.ts');
const {requireStagingEnvironment}=require('../src/server/staging/environment.ts');
const {getCurrentUser}=require('../src/server/auth/get-current-user.ts');
const {acknowledgeStaging}=require('../src/server/staging/acknowledgment.ts');
const market=require('../src/server/market/service.ts'),{createInitialWorkspace}=require('../src/server/services/workspace-onboarding.service.ts');
const commercial=require('../src/server/commercial/service.ts'),gateway=require('../src/server/payments/paystack.ts');
const {commercialAccess}=require('../src/server/commercial/access.ts'),{requirePlatform}=require('../src/server/commercial/platform-auth.ts');
const clients=require('../src/server/services/clients.service.ts');
const {approvedCatalog,pricingApproval,publicPricing}=require('../src/config/public-pricing.ts');
const {calculateTax}=require('../src/server/commercial/tax.ts');
const run=(externalId,workspace,fn,extra={})=>context.run({externalId,workspace,...extra},fn);
const id=()=>randomUUID();
async function user(admin=false){const externalId='user_staging_'+id().replaceAll('-',''),email=externalId+'@example.test';profiles.set(externalId,{id:externalId,firstName:'Synthetic',lastName:'Tester',imageUrl:'',twoFactorEnabled:admin,primaryEmailAddressId:'primary',emailAddresses:[{id:'primary',emailAddress:email,verification:{status:'verified'}}],primaryEmailAddress:{emailAddress:email,verification:{status:'verified'}}});await assert.rejects(run(externalId,null,()=>getCurrentUser()),/staging-terms/);const local=await prisma.user.findUniqueOrThrow({where:{externalId}});await run(externalId,null,()=>acknowledgeStaging(true));return {...local,externalId};}
async function workspace(owner,country='KE'){const app=await run(owner.externalId,null,()=>market.submitMarketApplication({country,interest:'WORKFLOW',useCase:'Synthetic workflow acceptance fixture',attested:true,idempotencyKey:id()}));if(country!=='KE')return {app};const w=await run(owner.externalId,null,()=>createInitialWorkspace('Synthetic test business','s'+id().replaceAll('-',''),app.id));return {...w,app};}
async function request(owner,w,offer,type='INITIAL'){const r=await run(owner.externalId,w,()=>commercial.submitRequest(offer.id,type,id()));assert.equal(r.status,'QUOTED');assert.equal(r.reviewedById,null);assert.equal(r.payableAmount.toFixed(2),offer.amount.toFixed(2));await run(owner.externalId,w,()=>commercial.acceptQuote(r.id));return r;}
async function checkout(owner,w,r){return run(owner.externalId,w,()=>gateway.initializePaystack(r.id,id(),'test'));}
async function webhook(reference){const raw=Buffer.from(JSON.stringify({event:'charge.success',data:{reference}}));return gateway.processPaystackWebhook(raw,null,createHmac('sha512',process.env.PAYSTACK_TEST_SECRET_KEY).update(raw).digest('hex'),'test');}
const fetchOriginal=global.fetch;
global.fetch=async(url,options={})=>{
 if(String(url)==='https://synthetic.clerk.accounts.dev/v1/environment')return Response.json({user_settings:{actions:{delete_self:false}}});
 assert.ok(String(url).startsWith('https://api.paystack.co/transaction/'),'No live or unrelated provider boundary');providerCalls++;
 if(options.method==='POST'){initializeCalls++;const body=JSON.parse(options.body);assert.equal(body.currency,'KES');assert.deepEqual(body.channels,['card']);assert.equal(body.amount,(await prisma.paystackAttempt.findUniqueOrThrow({where:{reference:body.reference}})).expectedMinor.toString());return Response.json({status:true,data:{reference:body.reference,authorization_url:'https://checkout.paystack.com/'+body.reference}});}
 const ref=decodeURIComponent(String(url).split('/').pop()),a=await prisma.paystackAttempt.findUniqueOrThrow({where:{reference:ref}});
 const txid=BigInt('0x'+createHash('sha256').update(a.id).digest('hex').slice(0,12)).toString();
 return Response.json({status:true,data:{status:'success',reference:ref,domain:'test',currency:'KES',amount:Number(a.expectedMinor),id:txid,paid_at:new Date(Date.now()-1000).toISOString(),channel:'card',integration:a.merchantId,metadata:{coreopsRequestId:a.requestId,coreopsWorkspaceId:a.workspaceId,coreopsAttemptId:a.id,coreopsMerchantId:a.merchantId,coreopsMode:'test'},...(providerOverrides.get(ref)||{})}});
};
test('persistent staging full domain journey with synthetic Clerk/Paystack and real PostgreSQL',async t=>{
 const target=stagingTarget();let admin,actor,offers,owner,w,r,payment;
 try{
  const identity={...target};delete identity.local;
  await prisma.stagingEnvironment.upsert({where:{id:target.id},update:{},create:{...identity,approvalReference:'Synthetic isolated staging boundary fixture'}});
  admin=await user(true);actor=await prisma.platformAdmin.create({data:{userId:admin.id,role:'SUPER_ADMIN'}});
  await t.test('persistent identity admits new deployments but rejects production, wrong DB and mixed PAY-1',async()=>{const old={...process.env};try{process.env.VERCEL_DEPLOYMENT_ID='dpl_Different';await requireStagingEnvironment();process.env.VERCEL_ENV='production';await assert.rejects(requireStagingEnvironment());process.env= {...old,COREOPS_STAGING_DATABASE_NAME:'different'};await assert.rejects(requireStagingEnvironment());process.env={...old,COREOPS_PAY1_PREVIEW_ENABLED:'true'};await assert.rejects(requireStagingEnvironment());}finally{process.env=old;}});
  let tax=await prisma.taxConfiguration.findFirst({orderBy:{version:'desc'}});
  if(!tax?.synthetic)tax=await prisma.taxConfiguration.create({data:{version:(tax?.version??0)+1,registrationStatus:'NOT_REGISTERED',effectiveFrom:new Date(Date.now()-1000),rate:'0',allowedTreatments:['NON_VAT_REGISTERED'],synthetic:true,approvalReference:'Synthetic non-registration scenario; no legal status attestation',approvedById:actor.id}});
  offers=[];for(const entry of approvedCatalog){const previous=await prisma.subscriptionPlanOffer.findFirst({where:{plan:entry.plan,interval:entry.interval},orderBy:{version:'desc'}});offers.push(await prisma.subscriptionPlanOffer.create({data:{...entry,version:(previous?.version??0)+1,pricingRelease:pricingApproval.release,stagingEnvironmentId:target.id,taxTreatment:'NON_VAT_REGISTERED',published:true,businessApprovedAt:new Date(),businessApprovalRef:pricingApproval.reference,approvedById:actor.id}}));}
  await run(admin.externalId,null,()=>gateway.registerPaystackMerchant('test','Synthetic merchant approval for fixture boundary only'));
  await t.test('zero-workspace registration records only synthetic acknowledgment and keeps same identity on return',async()=>{owner=await user();assert.equal(await prisma.workspaceMember.count({where:{userId:owner.id}}),0);assert.equal(await prisma.legalAcceptance.count({where:{userId:owner.id}}),0);await assert.rejects(run(owner.externalId,null,()=>require('../src/server/auth/legal-acceptance.ts').recordLegalAcceptance(true,{termsVersion:'synthetic',privacyVersion:'synthetic'})));assert.equal((await run(owner.externalId,null,()=>getCurrentUser())).id,owner.id);await assert.rejects(run(null,null,()=>getCurrentUser()),/REDIRECT/);});
  await t.test('KE declaration provisions one pending workspace under concurrent replay and denies operations',async()=>{w=await workspace(owner);const replay=await Promise.all(Array.from({length:5},()=>run(owner.externalId,null,()=>createInitialWorkspace('Synthetic replay',undefined,w.app.id))));assert.ok(replay.every(x=>x.id===w.id));assert.equal(await prisma.workspace.count({where:{marketApplicationId:w.app.id}}),1);assert.equal(w.activationStatus,'PENDING_ACTIVATION');await assert.rejects(run(owner.externalId,w,()=>clients.getClients()));});
  await t.test('approved catalog matches founder monthly/annual pricing and non-registration is not exemption',async()=>{const published=await commercial.publishedOffers();for(const plan of ['SOLO','STARTER','BUSINESS'])for(const interval of ['MONTHLY','ANNUAL'])assert.equal(published.find(o=>o.plan===plan&&o.interval===interval).amount.toFixed(2),publicPricing[plan][interval]);assert.equal(calculateTax(offers[0].amount,'NON_VAT_REGISTERED',tax).tax.toFixed(2),'0.00');assert.equal(calculateTax(offers[0].amount,'NON_VAT_REGISTERED',tax).snapshot.treatment,'NON_VAT_REGISTERED');});
  await t.test('server prices a standard quote; accepted quote initializes exact Paystack minor amount once',async()=>{r=await request(owner,w,offers[0]);payment=await checkout(owner,w,r);const attempt=await prisma.paystackAttempt.findUniqueOrThrow({where:{reference:payment.reference}});assert.equal(attempt.expectedMinor,10000n);const count=initializeCalls;await run(owner.externalId,w,()=>gateway.initializePaystack(r.id,attempt.idempotencyKey,'test'));assert.equal(initializeCalls,count);assert.equal((await prisma.workspace.findUnique({where:{id:w.id}})).activationStatus,'PENDING_ACTIVATION');});
  await t.test('unsigned success, wrong amount/currency/domain/metadata cannot credit or activate',async()=>{await assert.rejects(gateway.processPaystackWebhook(Buffer.from('{}'),null,'0'.repeat(128),'test'));for(const mismatch of [{amount:9999},{currency:'USD'},{domain:'live'},{metadata:{}}]){providerOverrides.set(payment.reference,mismatch);await assert.rejects(run(owner.externalId,w,()=>gateway.reconcileOwnPaystack(payment.reference)));assert.equal(await prisma.subscriptionPaymentReceipt.count({where:{requestId:r.id}}),0);}providerOverrides.delete(payment.reference);});
  await t.test('concurrent signed webhook and payer reconciliation atomically credit once and activate once',async()=>{await Promise.all([webhook(payment.reference),webhook(payment.reference),run(owner.externalId,w,()=>gateway.reconcileOwnPaystack(payment.reference))]);assert.equal(await prisma.subscriptionPaymentReceipt.count({where:{requestId:r.id}}),1);const period=await prisma.subscriptionPeriod.findUniqueOrThrow({where:{sourceRequestId:r.id}});assert.equal(period.activatedById,null);assert.equal(period.activationSource,'PAYSTACK_TEST');assert.ok(period.verifiedReceiptId);assert.equal((await commercialAccess(w.id)).write,true);assert.equal((await run(owner.externalId,w,()=>gateway.reconcileOwnPaystack(payment.reference))).status,'ACTIVATED');assert.equal(await prisma.subscriptionPeriod.count({where:{sourceRequestId:r.id}}),1);});
  await t.test('returning customer preserves workspace and can operate subscribed services; foreign tenant stays denied',async()=>{assert.equal((await run(owner.externalId,w,()=>getCurrentUser())).id,owner.id);await run(owner.externalId,w,()=>clients.getClients());const outsider=await user();await assert.rejects(run(outsider.externalId,w,()=>clients.getClients()));await assert.rejects(run(outsider.externalId,null,()=>gateway.reconcileOwnPaystack(payment.reference)));await assert.rejects(run(owner.externalId,w,()=>requirePlatform()));await assert.rejects(run(admin.externalId,null,()=>requirePlatform(),{stale:true}));await assert.rejects(run(owner.externalId,w,()=>getCurrentUser(),{expired:true}));});
  await t.test('renewal creates a contiguous future period without duplicate or premature entitlement changes',async()=>{const renewal=await request(owner,w,offers[0],'RENEWAL'),next=await checkout(owner,w,renewal);await webhook(next.reference);const periods=await prisma.subscriptionPeriod.findMany({where:{workspaceId:w.id},orderBy:{startsAt:'asc'}});assert.equal(periods.length,2);assert.equal(+periods[1].startsAt,+periods[0].endsAt);assert.equal((await commercialAccess(w.id)).write,true);});
  await t.test('abandoned and failed payments stay restricted and can reconcile the same reference later',async()=>{const other=await user(),pending=await workspace(other),req=await request(other,pending,offers[2]),attempt=await checkout(other,pending,req);for(const status of ['abandoned','failed','pending']){providerOverrides.set(attempt.reference,{status});await assert.rejects(run(other.externalId,pending,()=>gateway.reconcileOwnPaystack(attempt.reference)));assert.equal((await commercialAccess(pending.id)).write,false);}providerOverrides.delete(attempt.reference);await webhook(attempt.reference);assert.equal((await commercialAccess(pending.id)).write,true);});
  await t.test('independently failed checkout permits a fresh checkout without deleting prior evidence',async()=>{
   const applicant=await user(),pending=await workspace(applicant),req=await request(applicant,pending,offers[0]),first=await checkout(applicant,pending,req);providerOverrides.set(first.reference,{status:'failed'});await assert.rejects(run(applicant.externalId,pending,()=>gateway.reconcileOwnPaystack(first.reference)));const prior=await prisma.paystackAttempt.findUniqueOrThrow({where:{reference:first.reference}});assert.equal(prior.status,'FAILED');assert.equal((await prisma.subscriptionPayment.findUnique({where:{id:prior.paymentId}})).status,'REJECTED');const replacement=await checkout(applicant,pending,req);assert.notEqual(replacement.reference,first.reference);await webhook(replacement.reference);assert.equal(await prisma.subscriptionPaymentReceipt.count({where:{requestId:req.id}}),1);assert.equal((await commercialAccess(pending.id)).write,true);
  });
  await t.test('international inquiry is account-only and cannot silently inherit KE approval',async()=>{const foreign=await user(),inquiry=await workspace(foreign,'US');assert.equal(inquiry.app.state,'SUBMITTED');assert.equal(await prisma.workspaceMember.count({where:{userId:foreign.id}}),0);await assert.rejects(run(foreign.externalId,null,()=>createInitialWorkspace('Foreign test',undefined,inquiry.app.id)));await assert.rejects(run(owner.externalId,null,()=>market.submitMarketApplication({applicationId:w.app.id,expectedRevision:w.app.revision,country:'US',interest:'WORKFLOW',useCase:'Changed country fixture',attested:true,idempotencyKey:id()})));});
  await t.test('market revocation after checkout preserves verified money without granting access',async()=>{
   const applicant=await user(),pending=await workspace(applicant),req=await request(applicant,pending,offers[0]),attempt=await checkout(applicant,pending,req);
   await run(admin.externalId,null,()=>market.reviewMarketApplication(pending.app.id,{type:'REVOKE',expectedRevision:pending.app.revision,reason:'Synthetic approved restriction test',operationKey:id()}));
   await webhook(attempt.reference);assert.equal(await prisma.subscriptionPaymentReceipt.count({where:{requestId:req.id}}),1);assert.equal(await prisma.subscriptionPeriod.count({where:{sourceRequestId:req.id}}),0);assert.equal((await commercialAccess(pending.id)).write,false);
  });
  await t.test('audit failure rolls back receipt and activation together; retry fulfills exactly once',async()=>{
   const applicant=await user(),pending=await workspace(applicant),req=await request(applicant,pending,offers[0]),attempt=await checkout(applicant,pending,req);
   const suffix=id().replaceAll('-',''),fn='staging_fixture_'+suffix,tr='staging_fixture_trigger_'+suffix;
   await prisma.$executeRawUnsafe(`CREATE FUNCTION ${fn}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."workspaceId"='${pending.id}' AND NEW.action='STANDARD_SUBSCRIPTION_ACTIVATED' THEN RAISE EXCEPTION 'SYNTHETIC_AUDIT_FAILURE'; END IF; RETURN NEW; END $$`);
   await prisma.$executeRawUnsafe(`CREATE TRIGGER ${tr} BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION ${fn}()`);
   try{await assert.rejects(webhook(attempt.reference));assert.equal(await prisma.subscriptionPaymentReceipt.count({where:{requestId:req.id}}),0);assert.equal(await prisma.subscriptionPeriod.count({where:{sourceRequestId:req.id}}),0);}finally{await prisma.$executeRawUnsafe(`DROP TRIGGER ${tr} ON "AuditLog"`);await prisma.$executeRawUnsafe(`DROP FUNCTION ${fn}()`);}
   await webhook(attempt.reference);assert.equal(await prisma.subscriptionPeriod.count({where:{sourceRequestId:req.id}}),1);
  });
  await t.test('annual approved amount buys twelve calendar months upfront; grace and expiry retain existing policy',async()=>{
   const applicant=await user(),pending=await workspace(applicant),req=await request(applicant,pending,offers[5]),attempt=await checkout(applicant,pending,req);await webhook(attempt.reference);
   const period=await prisma.subscriptionPeriod.findUniqueOrThrow({where:{sourceRequestId:req.id}}),receipt=await prisma.subscriptionPaymentReceipt.findFirstOrThrow({where:{requestId:req.id}});
   assert.equal(period.endsAt.getUTCFullYear()-period.startsAt.getUTCFullYear(),1);assert.equal(period.agreedAmount.toFixed(2),'10000.00');assert.equal(receipt.amount.toFixed(2),'10000.00');assert.equal((await prisma.paystackAttempt.findUnique({where:{reference:attempt.reference}})).expectedMinor,1000000n);
   assert.equal((await commercialAccess(pending.id,prisma,new Date(+period.endsAt+1000))).inGrace,true);assert.equal((await commercialAccess(pending.id,prisma,new Date(+period.graceEndsAt+1000))).write,false);
  });
  await t.test('upgrade requests remain reviewed and cannot immediately expand current entitlements',async()=>{
   const upgrade=await run(owner.externalId,w,()=>commercial.submitRequest(offers[2].id,'UPGRADE',id()));assert.equal(upgrade.commercialPath,'MANUAL');assert.equal(upgrade.status,'SUBMITTED');assert.equal((await commercialAccess(w.id)).period.plan,'SOLO');
   await run(admin.externalId,null,()=>commercial.closeRequest(upgrade.id,false,'Synthetic upgrade request closed without funding'));
  });
  await t.test('reversed independently verified payment revokes its paid period and restricts workspace pending review',async()=>{providerOverrides.set(payment.reference,{status:'reversed'});await assert.rejects(run(owner.externalId,w,()=>gateway.reconcileOwnPaystack(payment.reference)));assert.equal((await commercialAccess(w.id)).write,false);assert.ok((await prisma.subscriptionPeriod.findUnique({where:{sourceRequestId:r.id}})).revokedAt);assert.equal(await prisma.subscriptionPaymentReceipt.count({where:{requestId:r.id}}),1);});
  await t.test('strict-MFA SUPER_ADMIN customer suspension is audited, reversible and blocks payment activation',async()=>{
   const {stagingUsers,setStagingUserSuspended}=require('../src/server/staging/users.ts');
   const applicant=await user(),pending=await workspace(applicant),req=await request(applicant,pending,offers[0]),attempt=await checkout(applicant,pending,req);
   await assert.rejects(run(applicant.externalId,pending,()=>stagingUsers()));
   await assert.rejects(run(admin.externalId,null,()=>setStagingUserSuspended(applicant.id,true,'Synthetic suspension test'),{stale:true}));
   await assert.rejects(run(admin.externalId,null,()=>setStagingUserSuspended(admin.id,true,'Synthetic self suspension denied')));
   const before=await prisma.workspaceMember.count({where:{userId:applicant.id}});
   await run(admin.externalId,null,()=>setStagingUserSuspended(applicant.id,true,'Synthetic reviewed account restriction'));
   await assert.rejects(run(applicant.externalId,pending,()=>getCurrentUser()));
   await assert.rejects(run(applicant.externalId,pending,()=>clients.getClients()));
   await webhook(attempt.reference);
   assert.equal(await prisma.subscriptionPaymentReceipt.count({where:{requestId:req.id}}),1);
   assert.equal(await prisma.subscriptionPeriod.count({where:{sourceRequestId:req.id}}),0);
   assert.equal(await prisma.workspaceMember.count({where:{userId:applicant.id}}),before);
   assert.equal(await prisma.platformAuditEvent.count({where:{resourceId:applicant.id,action:'STAGING_USER_SUSPENDED'}}),1);
   await run(admin.externalId,null,()=>setStagingUserSuspended(applicant.id,true,'Synthetic idempotent restriction'));
   assert.equal(await prisma.platformAuditEvent.count({where:{resourceId:applicant.id,action:'STAGING_USER_SUSPENDED'}}),1);
   await run(admin.externalId,null,()=>setStagingUserSuspended(applicant.id,false,'Synthetic reviewed account restoration'));
   await run(applicant.externalId,pending,()=>gateway.reconcileOwnPaystack(attempt.reference));
   assert.equal(await prisma.subscriptionPeriod.count({where:{sourceRequestId:req.id}}),1);
   await run(applicant.externalId,pending,()=>clients.getClients());
   assert.ok((await run(admin.externalId,null,()=>stagingUsers())).some(u=>u.id===applicant.id));
  });
  await t.test('raw SQL cannot manufacture an automatic paid period without a matching Test Mode receipt',async()=>{await assert.rejects(prisma.$executeRaw`INSERT INTO "SubscriptionPeriod" (id,"workspaceId","subscriptionId","sourceRequestId",plan,interval,"startsAt","endsAt","graceEndsAt","anchorDay","memberLimit","invitationsEnabled",features,"agreedAmount",currency,"activationSource") VALUES (${id()},${w.id},${r.subscriptionId},${r.id},'SOLO','MONTHLY',now(),now()+interval '1 month',now()+interval '1 month 7 days',1,1,false,'{}',100,'KES','PAYSTACK_TEST')`);});
  assert.ok(providerCalls>0);
 }finally{global.fetch=fetchOriginal;await prisma.$disconnect();}
});
