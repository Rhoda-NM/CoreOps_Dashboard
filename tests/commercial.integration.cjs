const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AsyncLocalStorage } = require('node:async_hooks');
const { randomUUID, randomInt } = require('node:crypto');
const Module = require('node:module');
const path = require('node:path');
if (!process.env.DATABASE_URL || !new URL(process.env.DATABASE_URL).pathname.includes('coreops_auth_rehearsal')) throw new Error('Use an isolated coreops_auth_rehearsal database.');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', jsx: 'react-jsx' } });
const request = new AsyncLocalStorage(), load = Module._load;
Module._load = function(name, parent, main) {
  if (name === 'server-only') return {};
  if (name.endsWith('/get-current-user') || name === './get-current-user') return { getCurrentUser: async () => { if (!request.getStore()?.user) throw new Error('Unauthenticated'); return request.getStore().user; } };
  if (name.endsWith('/clerk-identity')) return { requireClerkIdentity: async () => ({ id: request.getStore()?.user?.externalId, twoFactorEnabled: request.getStore()?.mfa !== false }) };
  if (name === 'next/headers') return { headers: async () => new Headers({ 'x-coreops-workspace': request.getStore()?.workspace?.slug ?? '' }) };
  if (name === '@clerk/nextjs/server') return { clerkClient: async()=>({users:{getUser:async externalId=>{const user=await prisma.user.findUniqueOrThrow({where:{externalId}});return {id:externalId,primaryEmailAddressId:'primary',emailAddresses:[{id:'primary',emailAddress:user.email,verification:{status:request.getStore()?.ownerVerified===false?'unverified':'verified'}}]};}}}), auth: async () => ({ userId: request.getStore()?.user?.externalId, sessionClaims:{fva:request.getStore()?.secondFactor===false?[0,-1]:[0,0]}, has: () => request.getStore()?.mfa !== false }), currentUser: async () => ({ id: request.getStore()?.user?.externalId, emailAddresses: [{ emailAddress: request.getStore()?.user?.email, verification: { status: 'verified' } }] }) };
  if (name.startsWith('@/')) name = path.resolve(__dirname, '../src', name.slice(2));
  return load.call(this,name,parent,main);
};
const { prisma } = require('../src/server/db/prisma.ts');
const service = require('../src/server/commercial/service.ts');
const { commercialAccess, requireCommercialAccess } = require('../src/server/commercial/access.ts');
const { money, periodEnd, DAY } = require('../src/server/commercial/policy.ts');
const members = require('../src/server/services/memberships.service.ts');
const clients = require('../src/server/services/clients.service.ts');
const { requirePlatform } = require('../src/server/commercial/platform-auth.ts');
const id = () => `commercial-test-${randomUUID()}`;
const run = (user, workspace, fn, mfa=true) => request.run({ user, workspace, mfa },fn);

test('commercial lifecycle, database integrity, entitlements and platform isolation', async t => {
  const users=[], workspaces=[], offers=[], accounts=[];
  async function user() { const u = await prisma.user.create({ data: { id:id(), externalId:id(), email:`${id()}@example.test` } }); users.push(u); return u; }
  async function workspace(owner) { const w=await prisma.workspace.create({ data:{ id:id(),slug:id(),name:'Commercial fixture',subscription:{create:{}} } }); workspaces.push(w); await prisma.workspaceMember.create({data:{workspaceId:w.id,userId:owner.id,role:'OWNER'}});return w; }
  let admin, superuser, owner, billinguser, supportuser, soloOffer, starterOffer, businessOffer, account, a, b;
  async function offer(plan,memberLimit) { const o=await prisma.subscriptionPlanOffer.create({data:{id:id(),plan,interval:'MONTHLY',version:randomInt(1000,2000000000),name:'Approved test offer',amount:'100.00',currency:'KES',memberLimit,invitationsEnabled:plan!=='SOLO',features:{clients:true,projects:true,tasks:true,invoices:true,dashboard:true},taxTreatment:'INCLUSIVE',published:true,businessApprovedAt:new Date(),businessApprovalRef:'Isolated test approval',approvedById:admin.id}});offers.push(o);return o; }
  async function ready(w, o=soloOffer, type='INITIAL', amount='100') {
    const r=await run(owner,w,()=>service.submitRequest(o.id,type,id()));
    await run(superuser,null,()=>service.reviewRequest(r.id,{amount:'100',tax:'0',memberLimit:o.memberLimit,accountId:account.id,notes:'Independent commercial test review'}));
    await run(owner,w,()=>service.acceptQuote(r.id));
    const p=await run(owner,w,()=>service.submitPayment(r.id,{reference:id(),amount,idempotencyKey:id()}));
    await run(billinguser,null,()=>service.verifyPayment(p.id,{amount,reference:p.normalizedReference,ledgerEntryId:id(),receivedAt:new Date(Date.now()-1000).toISOString(),notes:'Checked actual isolated receiving ledger'}));
    return {r,p};
  }
  try {
    superuser=await user(); owner=await user(); billinguser=await user(); supportuser=await user();
    admin=await prisma.platformAdmin.create({data:{userId:superuser.id,role:'SUPER_ADMIN'}});
    await prisma.platformAdmin.create({data:{userId:billinguser.id,role:'BILLING_ADMIN'}});
    await prisma.platformAdmin.create({data:{userId:supportuser.id,role:'SUPPORT'}});
    soloOffer=await offer('SOLO',1); starterOffer=await offer('STARTER',3);businessOffer=await offer('BUSINESS',10);
    account=await prisma.paymentReceivingAccount.create({data:{id:id(),label:'Test receiving account',method:'MPESA',currency:'KES',accountIdentifier:id(),instructions:'Isolated test only',active:true,verifiedAt:new Date(),verifiedById:admin.id}});accounts.push(account);
    a=await workspace(owner);b=await workspace(owner);
    await t.test('exact decimal validation and UTC month-end/leap-year calculations',()=>{
      for (const value of ['NaN','Infinity','1e4','-1','0','0.001','1,000']) assert.throws(()=>money(value));
      assert.equal(money('123.45').toFixed(2),'123.45');
      const jan=new Date('2027-01-31T12:34:56.789Z'), feb=periodEnd(jan,'MONTHLY');
      assert.equal(feb.toISOString(),'2027-02-28T12:34:56.789Z');
      assert.equal(periodEnd(feb,'MONTHLY',31).toISOString(),'2027-03-31T12:34:56.789Z');
      assert.equal(periodEnd(new Date('2024-02-29T00:00:00Z'),'ANNUAL').toISOString(),'2025-02-28T00:00:00.000Z');
      assert.equal(periodEnd(new Date('2027-12-31T00:00:00Z'),'MONTHLY').toISOString(),'2028-01-31T00:00:00.000Z');
    });
    await t.test('pending owners cannot use operational services or invite; platform roles have no tenant access',async()=>{
      assert.equal(a.activationStatus,'PENDING_ACTIVATION');
      assert.equal((await prisma.subscription.findUnique({where:{workspaceId:a.id}})).status,'PENDING_ACTIVATION');
      await assert.rejects(run(owner,a,()=>clients.getClients()));
      await assert.rejects(run(owner,a,()=>members.createInvitation({email:'invite@example.test',role:'STAFF'})));
      await assert.rejects(run(superuser,a,()=>clients.getClients()));
      await assert.rejects(run(owner,null,()=>requirePlatform()));
      await assert.rejects(run(supportuser,null,()=>requirePlatform('billing')));
      await assert.rejects(run(billinguser,null,()=>requirePlatform('activate')));
      await assert.rejects(run(superuser,null,()=>requirePlatform(),false));
      await assert.rejects(request.run({user:superuser,mfa:true,secondFactor:false},()=>requirePlatform()));
    });
    await t.test('commercial data is owner-scoped and Support receives only directory and redacted audit fields',async()=>{
      const staffUser=await user();
      await prisma.workspaceMember.create({data:{workspaceId:a.id,userId:staffUser.id,role:'STAFF'}});
      await assert.rejects(run(staffUser,a,()=>service.ownerSubscription()));
      await prisma.workspaceMember.delete({where:{userId_workspaceId:{userId:staffUser.id,workspaceId:a.id}}});
      const directory=await run(supportuser,null,()=>service.platformDirectory());
      const fixture=directory.find(w=>w.id===a.id);assert.ok(fixture);assert.equal('clients' in fixture,false);assert.equal('members' in fixture,false);
      await assert.rejects(run(supportuser,null,()=>service.platformRequests()));
      await prisma.platformAuditEvent.create({data:{actorAdminId:admin.id,action:"REDACTION_FIXTURE",resourceType:"Test",resourceId:id(),reason:"Private bank verification notes",metadata:{privatePayer:"Confidential fixture"}}});
      const events=await run(supportuser,null,()=>service.platformAuditHistory());
      assert.ok(events.some(e=>e.action==="REDACTION_FIXTURE"));
      for(const event of events) { assert.equal('reason' in event,false);assert.equal('metadata' in event,false); }
      const otherOwner=await user(),otherWorkspace=await workspace(otherOwner);
      await assert.rejects(run(owner,otherWorkspace,()=>service.ownerSubscription()));
    });
    await t.test('server-rendered pending onboarding contains no operational links or unapproved draft prices',async()=>{
      const {renderToStaticMarkup}=require('react-dom/server');
      const page=require('../src/app/w/[workspaceSlug]/subscription/page.tsx').default;
      const html=await run(owner,a,async()=>renderToStaticMarkup(await page()));
      assert.match(html,/Subscription &amp; activation/);assert.match(html,/PENDING ACTIVATION/);
      assert.doesNotMatch(html,/draft-solo|15,000|2,900|\/projects|\/invoices/);
      const outsider=await user();await assert.rejects(run(outsider,a,()=>page()));
    });
    await t.test('concurrent request retries return one row and different payloads cannot reuse a key',async()=>{
      const key=id();
      const results=await Promise.all(Array.from({length:8},()=>run(owner,a,()=>service.submitRequest(soloOffer.id,'INITIAL',key))));
      assert.equal(new Set(results.map(r=>r.id)).size,1);
      await assert.rejects(run(owner,a,()=>service.submitRequest(starterOffer.id,'INITIAL',key)));
      const open=await Promise.allSettled(Array.from({length:4},()=>run(owner,a,()=>service.submitRequest(soloOffer.id,'INITIAL',id()))));
      assert.equal(open.filter(r=>r.status==='fulfilled').length,0);
      await assert.rejects(run(owner,a,()=>service.activateSubscription(results[0].id,'Privilege escalation')));
      await run(superuser,null,()=>service.closeRequest(results[0].id,true,'Close isolated duplicate-submission test'));
    });
    await t.test('draft prices stay unpublished and historical offer and quote snapshots are immutable',async()=>{
      assert.equal(await prisma.subscriptionPlanOffer.count({where:{id:{startsWith:'draft-'},published:true}}),0);
      await assert.rejects(run(superuser,null,()=>service.createOffer({plan:'SOLO',interval:'MONTHLY',version:99,name:'Invalid Solo offering',amount:'100',memberLimit:1,projectLimit:null,invitationsEnabled:false,taxTreatment:'INCLUSIVE',features:{clients:true,projects:true,tasks:true,invoices:false,dashboard:true}})));
      const draft=await prisma.subscriptionPlanOffer.findUniqueOrThrow({where:{id:'draft-solo-monthly-v1'}});
      await assert.rejects(run(owner,a,()=>service.submitRequest(draft.id,'INITIAL',id())));
      await assert.rejects(prisma.subscriptionPlanOffer.update({where:{id:soloOffer.id},data:{amount:'1'}}));
    });
    let activated, readyA;
    await t.test('independent partial receipts, quote acceptance, duplicate references, and activation requirements',async()=>{
      const r=await run(owner,a,()=>service.submitRequest(soloOffer.id,'INITIAL',id()));
      await assert.rejects(run(owner,a,()=>service.submitPayment(r.id,{amount:'100',reference:id(),idempotencyKey:id()})));
      await run(superuser,null,()=>service.reviewRequest(r.id,{amount:'100',tax:'0',memberLimit:1,accountId:account.id,notes:'Approved exact quote'}));
      await assert.rejects(prisma.subscriptionRequest.update({where:{id:r.id},data:{payableAmount:'90'}}));
      await run(owner,a,()=>service.acceptQuote(r.id));
      const ref=id(), paymentKey=id();
      const submissions=await Promise.all(Array.from({length:5},()=>run(owner,a,()=>service.submitPayment(r.id,{reference:ref,amount:'40',idempotencyKey:paymentKey}))));
      assert.equal(new Set(submissions.map(p=>p.id)).size,1);
      await assert.rejects(run(owner,a,()=>service.submitPayment(r.id,{reference:ref,amount:'40',idempotencyKey:id()})));
      await run(billinguser,null,()=>service.verifyPayment(submissions[0].id,{amount:'40',reference:ref,ledgerEntryId:id(),receivedAt:new Date().toISOString(),notes:'Independent first partial receipt'}));
      await assert.rejects(run(superuser,null,()=>service.activateSubscription(r.id,'Insufficient funds')));
      const p2=await run(owner,a,()=>service.submitPayment(r.id,{reference:id(),amount:'60',idempotencyKey:id()}));
      await run(billinguser,null,()=>service.verifyPayment(p2.id,{amount:'60',reference:p2.normalizedReference,ledgerEntryId:id(),receivedAt:new Date().toISOString(),notes:'Independent remaining receipt'}));
      readyA={r,p:p2};
      await assert.rejects(request.run({user:superuser,mfa:true,ownerVerified:false},()=>service.activateSubscription(r.id,'Unverified owner must fail')));
      const periods=await Promise.all(Array.from({length:6},()=>run(superuser,null,()=>service.activateSubscription(r.id,'Final independent activation review'))));
      assert.equal(new Set(periods.map(p=>p.id)).size,1); activated=periods[0];
      assert.equal(await prisma.subscriptionPeriod.count({where:{workspaceId:a.id}}),1);
      assert.equal((await commercialAccess(a.id)).write,true);
      await assert.rejects(run(owner,a,()=>members.createInvitation({email:'solo@example.test',role:'STAFF'})));
      assert.equal((await commercialAccess(a.id,prisma,new Date(+activated.endsAt+6*DAY))).write,true);
      const expired=await commercialAccess(a.id,prisma,new Date(+activated.endsAt+7*DAY));assert.equal(expired.read,true);assert.equal(expired.write,false);
    });
    await t.test('early renewals serialize, extend paid-through, and leave current access intact',async()=>{
      const {r}=await ready(a,soloOffer,'RENEWAL');
      assert.equal((await commercialAccess(a.id)).write,true);
      const periods=await Promise.all(Array.from({length:5},()=>run(superuser,null,()=>service.activateSubscription(r.id,'Approved early renewal'))));
      assert.equal(new Set(periods.map(p=>p.id)).size,1);
      assert.equal(+periods[0].startsAt,+activated.endsAt);
      assert.equal((await commercialAccess(a.id)).period.id,activated.id);
      assert.equal(await prisma.subscriptionPeriod.count({where:{workspaceId:a.id}}),2);
    });
    let starter;
    await t.test('concurrent invitations reserve seats; revocation and expiry release capacity; acceptance rechecks',async()=>{
      const {r}=await ready(b,starterOffer); starter=await run(superuser,null,()=>service.activateSubscription(r.id,'Activate starter capacity test'));
      const results=await Promise.allSettled(Array.from({length:8},(_,i)=>run(owner,b,()=>members.createInvitation({email:`invite-${i}-${id()}@example.test`,role:'STAFF'}))));
      const ok=results.filter(r=>r.status==='fulfilled');assert.equal(ok.length,2);
      await run(owner,b,()=>members.revokeInvitation(ok[0].value.id));
      const invitee=await user();const inv=await run(owner,b,()=>members.createInvitation({email:invitee.email,role:'STAFF'}));
      await run(superuser,null,()=>service.setWorkspaceStatus(b.id,'SUSPENDED','Suspend before invitation acceptance'));
      await assert.rejects(run(invitee,b,()=>members.acceptInvitation(inv.token)));
      await run(superuser,null,()=>service.setWorkspaceStatus(b.id,'ACTIVE','Reactivate paid subscription'));
      await run(invitee,b,()=>members.acceptInvitation(inv.token));
      const m=await prisma.workspaceMember.findUniqueOrThrow({where:{userId_workspaceId:{userId:invitee.id,workspaceId:b.id}}});
      await run(owner,b,()=>members.changeMembership(m.id,{status:'SUSPENDED'}));
      await assert.rejects(run(owner,b,()=>members.createInvitation({email:`extra-${id()}@example.test`,role:'STAFF'})));
      await assert.rejects(run(invitee,b,()=>clients.getClients()));
      await prisma.workspaceInvitation.update({where:{id:ok[1].value.id},data:{expiresAt:new Date(0)}});
      await run(owner,b,()=>members.createInvitation({email:`replacement-${id()}@example.test`,role:'STAFF'}));
      assert.equal(starter.memberLimit,3);
    });
    await t.test('cross-workspace request/payment references and overlapping periods fail in PostgreSQL',async()=>{
      const paid=await prisma.subscriptionPayment.findUniqueOrThrow({where:{id:readyA.p.id}});
      await assert.rejects(prisma.subscriptionPayment.create({data:{workspaceId:b.id,requestId:paid.requestId,receivingAccountId:account.id,method:'MPESA',currency:'KES',submittedByUserId:owner.id,proposedAmount:'1',submittedReference:'CROSS123',normalizedReference:'CROSS123',idempotencyKey:id(),payloadHash:'test'}}));
      const other=await workspace(owner);const {r}=await ready(other);
      await assert.rejects(prisma.subscriptionPeriod.create({data:{workspaceId:a.id,subscriptionId:activated.subscriptionId,sourceRequestId:r.id,plan:'SOLO',interval:'MONTHLY',startsAt:activated.startsAt,endsAt:activated.endsAt,graceEndsAt:activated.graceEndsAt,anchorDay:activated.anchorDay,memberLimit:1,invitationsEnabled:false,features:{},agreedAmount:'100',currency:'KES',activatedById:admin.id}}));
      await run(superuser,null,()=>service.closeRequest(r.id,true,'Cannot close funded request')).then(()=>assert.fail('Funded request closed'),()=>{});
    });
    await t.test('overpayment requires a recorded disposition; reversal is auditable and restricts operations',async()=>{
      const w=await workspace(owner),{r,p}=await ready(w,soloOffer,'INITIAL','120');
      await assert.rejects(run(superuser,null,()=>service.activateSubscription(r.id,'Unreviewed overpayment')));
      await run(billinguser,null,()=>service.reviewOverpayment(r.id,'Refund excess KES 20 through separately reconciled bank process'));
      await run(superuser,null,()=>service.activateSubscription(r.id,'Reconciled overpayment accepted'));
      const receipt=await prisma.subscriptionPaymentReceipt.findUniqueOrThrow({where:{submissionId:p.id}});
      const before=await prisma.platformAuditEvent.count({where:{workspaceId:w.id}});
      await run(superuser,null,()=>service.reverseReceipt(receipt.id,'Receiving bank reversed actual receipt'));
      assert.equal((await commercialAccess(w.id)).read,false);
      assert.equal((await prisma.subscription.findUniqueOrThrow({where:{workspaceId:w.id}})).currentPeriodEnd,null);
      assert.equal(await prisma.subscriptionPaymentReversal.count({where:{receiptId:receipt.id}}),1);
      assert.equal(await prisma.platformAuditEvent.count({where:{workspaceId:w.id}}),before+1);
      await assert.rejects(run(superuser,null,()=>service.setWorkspaceStatus(w.id,'ACTIVE','Cannot reactivate revoked paid period')));
      await assert.rejects(prisma.subscriptionPaymentReceipt.update({where:{id:receipt.id},data:{amount:'100'}}));
    });
    await t.test('Business reserves ten seats; suspended owners cannot self-reactivate; last owner remains protected',async()=>{
      const w=await workspace(owner), {r}=await ready(w,businessOffer);
      await run(superuser,null,()=>service.activateSubscription(r.id,'Activate Business seat fixture'));
      const invitations=await Promise.allSettled(Array.from({length:12},()=>run(owner,w,()=>members.createInvitation({email:`business-${id()}@example.test`,role:'STAFF'}))));
      assert.equal(invitations.filter(r=>r.status==='fulfilled').length,9);
      const member=await prisma.workspaceMember.findUniqueOrThrow({where:{userId_workspaceId:{userId:owner.id,workspaceId:w.id}}});
      await assert.rejects(run(owner,w,()=>members.changeMembership(member.id,{status:'SUSPENDED'})));
      await assert.rejects(run(owner,w,()=>members.removeMembership(member.id)));
    });
    await t.test('independent verification rejects own submissions and duplicate actual ledger receipts',async()=>{
      const w=await workspace(owner),r=await run(owner,w,()=>service.submitRequest(soloOffer.id,'INITIAL',id()));
      await run(superuser,null,()=>service.reviewRequest(r.id,{amount:'100',tax:'0',memberLimit:1,accountId:account.id,notes:'Independent receipt verification fixture'}));
      await run(owner,w,()=>service.acceptQuote(r.id));
      const p=await run(owner,w,()=>service.submitPayment(r.id,{reference:id(),amount:'50',idempotencyKey:id()}));
      const self=await prisma.platformAdmin.create({data:{userId:owner.id,role:'BILLING_ADMIN'}});
      await assert.rejects(run(owner,null,()=>service.verifyPayment(p.id,{amount:'50',reference:p.normalizedReference,ledgerEntryId:id(),receivedAt:new Date().toISOString(),notes:'Cannot verify own payment'})));
      await prisma.platformAdmin.delete({where:{id:self.id}});
      const ledger=id();
      await run(billinguser,null,()=>service.verifyPayment(p.id,{amount:'50',reference:p.normalizedReference,ledgerEntryId:ledger,receivedAt:new Date().toISOString(),notes:'First actual receipt'}));
      const other=await run(owner,w,()=>service.submitPayment(r.id,{reference:id(),amount:'50',idempotencyKey:id()}));
      await assert.rejects(run(billinguser,null,()=>service.verifyPayment(other.id,{amount:'50',reference:p.normalizedReference,ledgerEntryId:id(),receivedAt:new Date().toISOString(),notes:'Duplicate actual reference'})));
      await assert.rejects(run(billinguser,null,()=>service.verifyPayment(other.id,{amount:'50',reference:other.normalizedReference,ledgerEntryId:ledger,receivedAt:new Date().toISOString(),notes:'Duplicate actual ledger entry'})));
      assert.equal(await prisma.subscriptionPaymentReceipt.count({where:{requestId:r.id}}),1);
    });
    await t.test('late renewal starts now, expired periods are read-only, and database overlap protection is active',async()=>{
      const w=await workspace(owner), sub=await prisma.subscription.findUniqueOrThrow({where:{workspaceId:w.id}});
      const old=await prisma.subscriptionRequest.create({data:{workspaceId:w.id,subscriptionId:sub.id,submittedByUserId:owner.id,offerId:soloOffer.id,type:'INITIAL',status:'ACTIVATED',idempotencyKey:id(),payloadHash:'past-fixture',plan:'SOLO',interval:'MONTHLY',offerVersion:soloOffer.version,catalogAmount:'100',currency:'KES',memberLimit:1,invitationsEnabled:false,features:soloOffer.features,taxTreatment:'INCLUSIVE'}});
      const starts=new Date(Date.now()-60*DAY),ends=new Date(Date.now()-30*DAY);
      const oldPeriod=await prisma.subscriptionPeriod.create({data:{workspaceId:w.id,subscriptionId:sub.id,sourceRequestId:old.id,plan:'SOLO',interval:'MONTHLY',startsAt:starts,endsAt:ends,graceEndsAt:new Date(+ends+7*DAY),anchorDay:starts.getUTCDate(),memberLimit:1,invitationsEnabled:false,features:soloOffer.features,agreedAmount:'100',currency:'KES',activatedById:admin.id}});
      await prisma.workspace.update({where:{id:w.id},data:{activationStatus:'ACTIVE'}});
      await prisma.subscription.update({where:{id:sub.id},data:{status:'ACTIVE'}});
      assert.equal((await commercialAccess(w.id)).read,true); assert.equal((await commercialAccess(w.id)).write,false);
      await requireCommercialAccess(w.id,false);
      await assert.rejects(run(owner,w,()=>clients.createClient({name:'Expired cannot write'})));
      const {r}=await ready(w,soloOffer,'RENEWAL');
      await assert.rejects(prisma.subscriptionPeriod.create({data:{workspaceId:w.id,subscriptionId:sub.id,sourceRequestId:r.id,plan:'SOLO',interval:'MONTHLY',startsAt:oldPeriod.startsAt,endsAt:oldPeriod.endsAt,graceEndsAt:oldPeriod.graceEndsAt,anchorDay:oldPeriod.anchorDay,memberLimit:1,invitationsEnabled:false,features:soloOffer.features,agreedAmount:'100',currency:'KES',activatedById:admin.id}}));
      const before=Date.now(), period=await run(superuser,null,()=>service.activateSubscription(r.id,'Late renewal review'));
      assert.ok(+period.startsAt>=before); assert.ok(+period.startsAt<=Date.now()); assert.equal((await commercialAccess(w.id)).write,true);
    });
    await t.test('administrator revocation while activation waits is rechecked inside the transaction',async()=>{
      const w=await workspace(owner),{r}=await ready(w);
      let release,locked;
      const gate=new Promise(resolve=>release=resolve), lockReady=new Promise(resolve=>locked=resolve);
      const revoke=prisma.$transaction(async tx=>{
        await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${w.id} FOR UPDATE`;
        await tx.platformAdmin.update({where:{id:admin.id},data:{active:false}});locked();await gate;
      });
      await lockReady;
      const attempt=run(superuser,null,()=>service.activateSubscription(r.id,'Revoked administrator must fail'));
      const rejected=assert.rejects(attempt);
      release();await revoke;await rejected;
      await prisma.platformAdmin.update({where:{id:admin.id},data:{active:true}});
      assert.equal(await prisma.subscriptionPeriod.count({where:{workspaceId:w.id}}),0);
    });
    await t.test('reviewed and funded upgrades wait for policy approval and their future effective period',async()=>{
      const w=await workspace(owner),initial=await ready(w);
      const paid=await run(superuser,null,()=>service.activateSubscription(initial.r.id,'Initial solo activation'));
      const upgrade=await ready(w,starterOffer,'UPGRADE');
      await assert.rejects(run(superuser,null,()=>service.activateSubscription(upgrade.r.id,'Upgrade policy not approved')));
      const policy=process.env.COREOPS_PLAN_UPGRADE_POLICY;
      try {
        process.env.COREOPS_PLAN_UPGRADE_POLICY='NEXT_PAID_PERIOD';
        const next=await run(superuser,null,()=>service.activateSubscription(upgrade.r.id,'Approved next-period upgrade'));
        assert.equal(+next.startsAt,+paid.endsAt);assert.equal(next.plan,'STARTER');
        assert.equal((await commercialAccess(w.id)).period.plan,'SOLO');
        assert.equal((await commercialAccess(w.id,prisma,next.startsAt)).period.plan,'STARTER');
        await assert.rejects(run(owner,w,()=>members.createInvitation({email:`future-${id()}@example.test`,role:'STAFF'})));
      } finally { if(policy===undefined) delete process.env.COREOPS_PLAN_UPGRADE_POLICY;else process.env.COREOPS_PLAN_UPGRADE_POLICY=policy; }
    });
    await t.test('all pending claims are reconciled before activation, including extra receipts after initial coverage',async()=>{
      const w=await workspace(owner),r=await run(owner,w,()=>service.submitRequest(soloOffer.id,'INITIAL',id()));
      await run(superuser,null,()=>service.reviewRequest(r.id,{amount:'100',tax:'0',memberLimit:1,accountId:account.id,notes:'Multiple payment claim fixture'}));
      await run(owner,w,()=>service.acceptQuote(r.id));
      const p1=await run(owner,w,()=>service.submitPayment(r.id,{reference:id(),amount:'100',idempotencyKey:id()}));
      const p2=await run(owner,w,()=>service.submitPayment(r.id,{reference:id(),amount:'20',idempotencyKey:id()}));
      await run(billinguser,null,()=>service.verifyPayment(p1.id,{amount:'100',reference:p1.normalizedReference,ledgerEntryId:id(),receivedAt:new Date().toISOString(),notes:'Independent covered amount'}));
      await assert.rejects(run(superuser,null,()=>service.activateSubscription(r.id,'Pending claim must be reviewed')));
      await run(billinguser,null,()=>service.verifyPayment(p2.id,{amount:'20',reference:p2.normalizedReference,ledgerEntryId:id(),receivedAt:new Date().toISOString(),notes:'Independent additional actual receipt'}));
      await assert.rejects(run(superuser,null,()=>service.activateSubscription(r.id,'Overpayment still needs review')));
      await run(billinguser,null,()=>service.reviewOverpayment(r.id,'Refund excess independently before closing reconciliation'));
      await run(superuser,null,()=>service.activateSubscription(r.id,'All claims independently reconciled'));
    });
    await t.test('audit failure rolls back workspace state changes',async()=>{
      const before=await prisma.workspace.findUniqueOrThrow({where:{id:b.id}});
      await assert.rejects(run(superuser,null,()=>service.setWorkspaceStatus(b.id,'SUSPENDED','x')));
      assert.equal((await prisma.workspace.findUniqueOrThrow({where:{id:b.id}})).activationStatus,before.activationStatus);
      const upgrade=await run(owner,a,()=>service.submitRequest(starterOffer.id,'UPGRADE',id()));
      assert.equal(upgrade.type,'UPGRADE');
      assert.equal((await commercialAccess(a.id)).period.plan,'SOLO');
      await assert.rejects(run(superuser,null,()=>service.activateSubscription(upgrade.id,'No approved upgrade policy or payment')));
    });
  } finally {
    const ws=workspaces.map(w=>w.id), us=users.map(u=>u.id);
    await prisma.subscriptionPaymentReversal.deleteMany({where:{receipt:{workspaceId:{in:ws}}}});
    await prisma.subscriptionPaymentReceipt.deleteMany({where:{workspaceId:{in:ws}}});
    await prisma.subscriptionPayment.deleteMany({where:{workspaceId:{in:ws}}});
    await prisma.subscriptionPeriod.deleteMany({where:{workspaceId:{in:ws}}});
    await prisma.subscriptionRequest.deleteMany({where:{workspaceId:{in:ws}}});
    await prisma.platformAuditEvent.deleteMany({where:{actor:{userId:{in:us}}}});
    await prisma.paymentReceivingAccount.deleteMany({where:{id:{in:accounts.map(a=>a.id)}}});
    await prisma.subscriptionPlanOffer.deleteMany({where:{id:{in:offers.map(o=>o.id)}}});
    await prisma.auditLog.deleteMany({where:{workspaceId:{in:ws}}});
    await prisma.workspace.deleteMany({where:{id:{in:ws}}});
    await prisma.platformAdmin.deleteMany({where:{userId:{in:us}}});
    await prisma.user.deleteMany({where:{id:{in:us}}});
    await prisma.$disconnect();
  }
});
