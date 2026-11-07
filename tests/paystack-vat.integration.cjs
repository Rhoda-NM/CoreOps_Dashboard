const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AsyncLocalStorage } = require('node:async_hooks');
const { randomUUID, createHmac, randomInt } = require('node:crypto');
const Module = require('node:module'), path = require('node:path');
if (!process.env.DATABASE_URL || !new URL(process.env.DATABASE_URL).pathname.includes('coreops_auth_rehearsal')) throw Error('Use an isolated rehearsal database.');
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}});
const context=new AsyncLocalStorage(),load=Module._load;
Module._load=function(name,parent,main){
  if(name==='server-only')return {};
  if(name.endsWith('/get-current-user')||name==='./get-current-user')return {getCurrentUser:async()=>context.getStore().user};
  if(name.endsWith('/clerk-identity'))return {requireClerkIdentity:async()=>({id:context.getStore()?.user?.externalId,twoFactorEnabled:true})};
  if(name==='next/headers')return {headers:async()=>new Headers({host:'localhost:3000','x-coreops-workspace':context.getStore()?.workspace?.slug??'','x-coreops-path':`/w/${context.getStore()?.workspace?.slug??''}/subscription`})};
  if(name==='@clerk/nextjs/server')return {auth:async()=>({userId:context.getStore()?.user?.externalId,sessionClaims:{fva:[0,0]},has:()=>true}),clerkClient:async()=>({users:{getUser:async externalId=>{const u=await prisma.user.findUniqueOrThrow({where:{externalId}});return {id:externalId,primaryEmailAddressId:'p',emailAddresses:[{id:'p',emailAddress:u.email,verification:{status:'verified'}}]};}}})};
  if(name.startsWith('@/'))name=path.resolve(__dirname,'../src',name.slice(2));
  return load.call(this,name,parent,main);
};
const {prisma}=require('../src/server/db/prisma.ts');
const commercial=require('../src/server/commercial/service.ts');
const gateway=require('../src/server/payments/paystack.ts');
const {calculateTax,approveTaxConfiguration}=require('../src/server/commercial/tax.ts');
const {verifyPaystackSignature}=require('../src/server/payments/paystack-signature.ts');
const {paystackConfig}=require('../src/server/payments/paystack-config.ts');
const {Prisma}=require('@prisma/client');
const id=()=>`gateway-${randomUUID()}`,run=(user,workspace,fn)=>context.run({user,workspace},fn);

test('fresh payment preparation, VAT snapshots and authenticated gateway confirmation',async t=>{
 const users=[],workspaces=[],offers=[],taxIds=[];let adminUser,owner,outsider,admin,account,offer;
 const originalFetch=global.fetch,oldEnv={};
 const vars={PAYSTACK_TEST_SECRET_KEY:'sk_test_coreops_isolated_fixture',PAYSTACK_TEST_MERCHANT_ID:'fixtureMerchant',PAYSTACK_TEST_CHANNELS:'card',PAYSTACK_TEST_CURRENCY:'KES',PAYSTACK_TEST_CHECKOUT_ENABLED:'true',PAYSTACK_TEST_CAPABILITIES_APPROVAL:'Isolated test capability approval',PAYSTACK_TEST_SETTLEMENT_APPROVAL:'Isolated test settlement approval',PAYSTACK_TEST_ALLOW_LEGACY_SIGNATURE:'true',PAYSTACK_TEST_WEBHOOK_SECRET:'whsec_coreops_isolated_fixture',COREOPS_PUBLIC_URL:'http://localhost:3100',COREOPS_APP_ORIGIN:'http://localhost:3100',COREOPS_MARKETING_ORIGIN:'http://localhost:3100',COREOPS_ENVIRONMENT:'preview'};
 for(const[k,v]of Object.entries(vars)){oldEnv[k]=process.env[k];process.env[k]=v;}
 const overrides=new Map();let initializeCalls=0;
 global.fetch=async(url,options)=>{
  assert.ok(String(url).startsWith('https://api.paystack.co/transaction/'));
  if(options.method==='POST'){
   initializeCalls++;const payload=JSON.parse(options.body);
   assert.equal('plan'in payload,false);assert.equal('authorization_code'in payload,false);assert.equal('subaccount'in payload,false);
   assert.equal(payload.callback_url,`http://localhost:3100/payments/paystack/return?attempt=${payload.reference}`);
   assert.equal(payload.currency,'KES');assert.deepEqual(payload.channels,['card']);
   return new Response(JSON.stringify({status:true,data:{reference:payload.reference,authorization_url:`https://checkout.paystack.com/${payload.reference}`}}));
  }
  const reference=decodeURIComponent(String(url).split('/').pop()),a=await prisma.paystackAttempt.findUniqueOrThrow({where:{reference}});
  const base={id:String(randomInt(100000,999999999)),status:'success',reference,domain:a.mode,currency:a.currency,amount:Number(a.expectedMinor),channel:'card',paid_at:new Date(Date.now()-1000).toISOString(),metadata:{coreopsRequestId:a.requestId,coreopsWorkspaceId:a.workspaceId,coreopsAttemptId:a.id,coreopsMerchantId:a.merchantId,coreopsMode:a.mode},integration:a.merchantId};
  // Stable ledger identifier across duplicate confirmations.
  base.id=String(parseInt(a.id.slice(-6),36)||12345);
  return new Response(JSON.stringify({status:true,data:{...base,...overrides.get(reference)}}));
 };
 async function user(){const u=await prisma.user.create({data:{id:id(),externalId:id(),email:`${id()}@example.test`}});users.push(u);return u;}
 async function prepared(){
  const w=await prisma.workspace.create({data:{id:id(),slug:id(),name:'Gateway test workspace',subscription:{create:{}}}});workspaces.push(w);
  await prisma.workspaceMember.create({data:{workspaceId:w.id,userId:owner.id,role:'OWNER'}});
  const r=await run(owner,w,()=>commercial.submitRequest(offer.id,'INITIAL',id()));
  await run(adminUser,null,()=>commercial.reviewRequest(r.id,{amount:'100',tax:'0',memberLimit:1,accountId:account.id,notes:'Approved isolated gateway quotation'}));
  await run(owner,w,()=>commercial.acceptQuote(r.id));return{w,r};
 }
 function signed(reference,modern=false){const raw=Buffer.from(JSON.stringify({event:'charge.success',data:{reference,amount:1,status:'success'}}));const now=Math.floor(Date.now()/1000);return {raw,modern:modern?`t=${now},v1=whk_fixture:${createHmac('sha512',vars.PAYSTACK_TEST_WEBHOOK_SECRET).update(`${now}.`).update(raw).digest('hex')}`:null,legacy:createHmac('sha512',vars.PAYSTACK_TEST_SECRET_KEY).update(raw).digest('hex')};}
 try{
  adminUser=await user();owner=await user();outsider=await user();admin=await prisma.platformAdmin.create({data:{userId:adminUser.id,role:'SUPER_ADMIN'}});
  account=await run(adminUser,null,()=>gateway.registerPaystackMerchant('test','Explicit isolated merchant and settlement verification'));
  offer=await prisma.subscriptionPlanOffer.create({data:{id:id(),plan:'SOLO',interval:'MONTHLY',version:randomInt(1000,2000000000),name:'Gateway test offer',amount:'100',currency:'KES',memberLimit:1,invitationsEnabled:false,features:{clients:true,projects:true,tasks:true,invoices:true,dashboard:true},taxTreatment:'INCLUSIVE',published:true,businessApprovedAt:new Date(),businessApprovalRef:'Test approval',approvedById:admin.id}});offers.push(offer);
  await t.test('private platform entry denies nonadmins without provisioning identities and exposes no registration flow',async()=>{
   const {platformEntry}=require('../src/server/commercial/platform-auth.ts');
   const Layout=require('../src/app/platform/(protected)/layout.tsx').default;
   const before=await prisma.user.count();
   const entry=await run({externalId:'user_clerk_only_fixture'},null,()=>platformEntry());assert.equal(entry.admin,null);assert.equal(entry.signedIn,true);
   assert.equal(await prisma.user.count(),before);
   await assert.rejects(run(outsider,null,()=>Layout({children:null})),e=>String(e.digest).includes('/platform/access-denied'));
   await assert.rejects(context.run({},()=>Layout({children:null})),e=>String(e.digest).includes('/platform/sign-in'));
   const SignInPage=require('../src/app/platform/sign-in/[[...sign-in]]/page.tsx').default;
   const tree=await context.run({},()=>SignInPage());assert.equal(tree.props.children[1].props.withSignUp,false);assert.equal(tree.props.children[1].props.forceRedirectUrl,'/platform');
  });
  await t.test('VAT stays zero without registration, supports inclusive/exclusive exact calculations',()=>{
   const amount=new Prisma.Decimal('100');assert.equal(calculateTax(amount,'EXCLUSIVE',null).tax.toFixed(2),'0.00');
   const config={id:'fixture',version:1,registrationStatus:'REGISTERED',registrationReference:'Verified test registration',effectiveFrom:new Date(0),rate:new Prisma.Decimal('16'),allowedTreatments:['INCLUSIVE','EXCLUSIVE'],approvalReference:'Fixture only'};
   assert.equal(calculateTax(amount,'EXCLUSIVE',config).payable.toFixed(2),'116.00');
   const inclusive=calculateTax(new Prisma.Decimal('116'),'INCLUSIVE',config);assert.equal(inclusive.net.toFixed(2),'100.00');assert.equal(inclusive.tax.toFixed(2),'16.00');assert.equal(inclusive.payable.toFixed(2),'116.00');
   assert.equal(calculateTax(amount,'EXCLUSIVE',{...config,registrationStatus:'NOT_REGISTERED'}).tax.toFixed(2),'0.00');
   assert.equal(calculateTax(amount,'EXCLUSIVE',{...config,effectiveFrom:new Date(Date.now()+86400000)}).tax.toFixed(2),'0.00');
  });
  await t.test('nonregistered positive-rate configuration and unapproved/manual VAT charges are rejected',async()=>{
   await assert.rejects(run(adminUser,null,()=>approveTaxConfiguration({version:100,registrationStatus:'NOT_REGISTERED',effectiveFrom:new Date(Date.now()+86400000).toISOString(),rate:'16',treatments:['EXCLUSIVE'],approval:'Invalid rate before registration'})));
   const {w,r}=await prepared();await assert.rejects(run(outsider,w,()=>gateway.initializePaystack(r.id,id(),'test')));
   await assert.rejects(run(owner,w,()=>gateway.initializePaystack(r.id,id(),'live')));
   process.env.COREOPS_ENVIRONMENT='production';try { assert.throws(()=>paystackConfig('test')); } finally {process.env.COREOPS_ENVIRONMENT='preview';}
   assert.equal((await prisma.subscriptionRequest.findUniqueOrThrow({where:{id:r.id}})).taxAmount.toFixed(2),'0.00');
  });
  await t.test('webhook HMAC validates raw bytes, rejects tampering/stale timestamps and downgrade',()=>{
   const s=signed('unknown',true),config=paystackConfig('test');assert.equal(verifyPaystackSignature(s.raw,s.modern,null,config),true);
   assert.equal(verifyPaystackSignature(Buffer.from('changed'),s.modern,s.legacy,config),false);
   assert.equal(verifyPaystackSignature(s.raw,'malformed',s.legacy,config),false);
   assert.equal(verifyPaystackSignature(s.raw,s.modern,s.legacy,config,Date.now()+301000),false);
   assert.equal(verifyPaystackSignature(s.raw,null,s.legacy,{...config,allowLegacy:false}),false);
  });
  let pending,attempt;
  await t.test('concurrent initialization is idempotent and never authorizes recurring charges',async()=>{
   pending=await prepared();const key=id(),before=initializeCalls;
   const results=await Promise.all(Array.from({length:5},()=>run(owner,pending.w,()=>gateway.initializePaystack(pending.r.id,key,'test'))));
   assert.equal(new Set(results.map(r=>r.reference)).size,1);assert.equal(initializeCalls-before,1);
   attempt=await prisma.paystackAttempt.findUniqueOrThrow({where:{reference:results[0].reference}});
   await assert.rejects(run(owner,pending.w,()=>gateway.initializePaystack(pending.r.id,id(),'test')));
   assert.equal(await prisma.subscriptionPaymentReceipt.count({where:{requestId:pending.r.id}}),0);
   assert.equal((await prisma.workspace.findUniqueOrThrow({where:{id:pending.w.id}})).activationStatus,'PENDING_ACTIVATION');
  });
  await t.test('success-return page is informational and cannot credit or activate',async()=>{
   const {renderToStaticMarkup}=require('react-dom/server');const page=require('../src/app/payments/paystack/return/page.tsx').default;
   const html=await run(owner,pending.w,async()=>renderToStaticMarkup(await page({searchParams:Promise.resolve({attempt:attempt.reference,reference:attempt.reference,trxref:attempt.reference})})));
   assert.match(html,/does not confirm receipt or activate/);assert.ok(html.includes('path=%2Fsubscription'));
   const {paymentReturnPath}=require('../src/server/payments/payment-return.ts');
   assert.equal(await run(outsider,pending.w,()=>paymentReturnPath(attempt.reference)),'/dashboard');
   assert.equal(await run(owner,pending.w,()=>paymentReturnPath('unknown')),'/dashboard');
   assert.equal(await prisma.subscriptionPaymentReceipt.count({where:{requestId:pending.r.id}}),0);
   assert.equal(await prisma.subscriptionPeriod.count({where:{workspaceId:pending.w.id}}),0);
  });
  await t.test('bad webhook signatures do not create records; API mismatches do not credit',async()=>{
   const s=signed(attempt.reference);const before=await prisma.paystackWebhookEvent.count();
   await assert.rejects(gateway.processPaystackWebhook(s.raw,null,'bad','test'));assert.equal(await prisma.paystackWebhookEvent.count(),before);
   for(const bad of [{amount:1},{currency:'USD'},{domain:'live'},{integration:'otherMerchant'},{metadata:{}},{channel:'bank'},{plan:{id:'recurring'}}]){
    overrides.set(attempt.reference,bad);await assert.rejects(gateway.processPaystackWebhook(s.raw,null,s.legacy,'test'));assert.equal(await prisma.subscriptionPaymentReceipt.count({where:{requestId:pending.r.id}}),0);
   }overrides.delete(attempt.reference);
  });
  await t.test('concurrent duplicate verified webhooks create exactly one receipt and no activation',async()=>{
   const s=signed(attempt.reference,true);await Promise.all(Array.from({length:6},()=>gateway.processPaystackWebhook(s.raw,s.modern,null,'test')));
   assert.equal(await prisma.subscriptionPaymentReceipt.count({where:{requestId:pending.r.id}}),1);
   const receipt=await prisma.subscriptionPaymentReceipt.findUniqueOrThrow({where:{submissionId:attempt.paymentId}});
   assert.equal(receipt.confirmationSource,'PAYSTACK');assert.equal(receipt.verifiedById,null);assert.equal(receipt.amount.toFixed(2),'100.00');assert.ok(receipt.taxSnapshot);
   assert.equal((await prisma.subscriptionRequest.findUniqueOrThrow({where:{id:pending.r.id}})).status,'READY_FOR_ACTIVATION');
   assert.equal((await prisma.workspace.findUniqueOrThrow({where:{id:pending.w.id}})).activationStatus,'PENDING_ACTIVATION');
   await assert.rejects(run(owner,pending.w,()=>commercial.activateSubscription(pending.r.id,'Cannot self activate')));
   await run(adminUser,null,()=>commercial.activateSubscription(pending.r.id,'Independent final super administrator approval'));
   assert.equal(await prisma.subscriptionPeriod.count({where:{workspaceId:pending.w.id}}),1);
  });
  await t.test('webhook HTTP route enforces body limits, mode and signatures',async()=>{
   const {POST}=require('../src/app/api/payments/paystack/[mode]/webhook/route.ts');
   const s=signed(attempt.reference,true),url='http://localhost/api/payments/paystack/test/webhook';
   assert.equal((await POST(new Request(url,{method:'POST',body:s.raw,headers:{'paystack-signature':s.modern}}),{params:Promise.resolve({mode:'test'})})).status,200);
   assert.equal((await POST(new Request(url,{method:'POST',body:s.raw,headers:{'paystack-signature':'invalid','x-paystack-signature':s.legacy}}),{params:Promise.resolve({mode:'test'})})).status,401);
   assert.equal((await POST(new Request(url,{method:'POST',body:Buffer.alloc(262145)}),{params:Promise.resolve({mode:'test'})})).status,413);
   assert.equal((await POST(new Request(url,{method:'POST',body:s.raw}),{params:Promise.resolve({mode:'unknown'})})).status,404);
  });
  await t.test('quote and receipt snapshots survive later tax changes and are immutable',async()=>{
   const before=await prisma.subscriptionRequest.findUniqueOrThrow({where:{id:pending.r.id}});
   const c=await prisma.taxConfiguration.create({data:{version:randomInt(1000,2000000000),registrationStatus:'REGISTERED',registrationReference:'Isolated synthetic registration',effectiveFrom:new Date(Date.now()-1000),rate:'16',allowedTreatments:['INCLUSIVE','EXCLUSIVE'],approvalReference:'Isolated approval fixture',approvedById:admin.id}});taxIds.push(c.id);
   const after=await prisma.subscriptionRequest.findUniqueOrThrow({where:{id:pending.r.id}});assert.deepEqual(after.taxSnapshot,before.taxSnapshot);
   await assert.rejects(prisma.subscriptionRequest.update({where:{id:pending.r.id},data:{vatRate:'16'}}));
   await assert.rejects(prisma.taxConfiguration.update({where:{id:c.id},data:{rate:'17'}}));
   const receipt=await prisma.subscriptionPaymentReceipt.findUniqueOrThrow({where:{submissionId:attempt.paymentId}});assert.deepEqual(receipt.taxSnapshot,before.taxSnapshot);
  });
 } finally {
  global.fetch=originalFetch;for(const[k,v]of Object.entries(oldEnv)){if(v===undefined)delete process.env[k];else process.env[k]=v;}
  const ws=workspaces.map(w=>w.id),us=users.map(u=>u.id);
  await prisma.paystackWebhookEvent.deleteMany({where:{reference:{in:(await prisma.paystackAttempt.findMany({where:{workspaceId:{in:ws}},select:{reference:true}})).map(a=>a.reference)}}});
  await prisma.subscriptionPaymentReceipt.deleteMany({where:{workspaceId:{in:ws}}});await prisma.paystackAttempt.deleteMany({where:{workspaceId:{in:ws}}});
  await prisma.subscriptionPayment.deleteMany({where:{workspaceId:{in:ws}}});await prisma.subscriptionPeriod.deleteMany({where:{workspaceId:{in:ws}}});await prisma.subscriptionRequest.deleteMany({where:{workspaceId:{in:ws}}});
  await prisma.taxConfiguration.deleteMany({where:{id:{in:taxIds}}});await prisma.platformAuditEvent.deleteMany({where:{actor:{userId:{in:us}}}});
  if(account)await prisma.paymentReceivingAccount.delete({where:{id:account.id}});await prisma.subscriptionPlanOffer.deleteMany({where:{id:{in:offers.map(o=>o.id)}}});
  await prisma.auditLog.deleteMany({where:{workspaceId:{in:ws}}});await prisma.workspace.deleteMany({where:{id:{in:ws}}});await prisma.platformAdmin.deleteMany({where:{userId:{in:us}}});await prisma.user.deleteMany({where:{id:{in:us}}});await prisma.$disconnect();
 }
});
