const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AsyncLocalStorage } = require('node:async_hooks');
const { randomUUID } = require('node:crypto');
const Module = require('node:module');
const path = require('node:path');
if (!process.env.DATABASE_URL || !['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname) || !/^\/coreops_auth_rehearsal_market_legal_[a-z0-9_]+$/.test(new URL(process.env.DATABASE_URL).pathname)) throw new Error('Use an isolated coreops_auth_rehearsal database.');
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
const id = () => `commercial-test-${randomUUID()}`;
const run = (user, workspace, fn, mfa=true) => request.run({ user, workspace, mfa },fn);

process.env.COREOPS_LEGAL_CATALOG_REHEARSAL_ENABLED='true';
const catalog=require('../src/server/legal/catalog.ts'),acceptance=require('../src/server/legal/acceptance.ts'),content=require('../src/server/legal/content.ts'),retention=require('../src/server/legal/retention.ts');
const {cleanupLegal}=require('./legal-fixtures.cjs');
test('P-C2C exact synthetic content, presentations, receipts and minimal evidence',async t=>{
 const users=[],admins=[],workspaceIds=[];let publisher,person,outsider,billing,admin,terms,privacy,set,presentation,receipt;
 const oldFetch=global.fetch;global.fetch=async()=>{throw Error('OUTBOUND_NETWORK_FORBIDDEN');};
 async function user(){const u=await prisma.user.create({data:{id:id(),externalId:id(),email:`${id()}@example.test`}});users.push(u);return u;}
 async function version(kind,label,body=`SYNTHETIC TEST — ${kind}\n客户 <script>alert("x")</script>\n`){return run(publisher,null,()=>catalog.createSyntheticLegalVersion({kind,version:label,language:'en',content:Buffer.from(body)}));}
 async function approve(v){return run(publisher,null,()=>catalog.reviewSyntheticLegalVersion(v.id,'SYNTHETIC:qualified-review-reference','Synthetic review only, not actual legal approval'));}
 const present=u=>run(u,null,acceptance.presentSyntheticLegalSet);
 const accept=(u,p,patch={})=>run(u,null,()=>acceptance.acceptSyntheticLegalSet({presentationId:p.presentationId,publicationId:p.publicationId,manifestHash:p.manifestHash,agreeTerms:true,acknowledgePrivacy:true,...patch}));
 try{
  publisher=await user();person=await user();outsider=await user();billing=await user();
  admin=await prisma.platformAdmin.create({data:{userId:publisher.id,role:'SUPER_ADMIN'}});admins.push(admin.id);admins.push((await prisma.platformAdmin.create({data:{userId:billing.id,role:'BILLING_ADMIN'}})).id);
  await t.test('catalog creation requires SUPER_ADMIN/MFA and preserves exact bytes, hash, length and metadata',async()=>{
   await assert.rejects(run(billing,null,()=>catalog.createSyntheticLegalVersion({kind:'TERMS',version:'TEST-BILLING-1',language:'en',content:Buffer.from('SYNTHETIC TEST fake')})));
   await assert.rejects(run(publisher,null,()=>catalog.createSyntheticLegalVersion({kind:'TERMS',version:'TEST-TOS-MFA',language:'en',content:Buffer.from('SYNTHETIC TEST fake')}),false));
   terms=await version('TERMS','TEST-TOS-1');privacy=await version('PRIVACY','TEST-PRIV-1');assert.equal(content.legalHash(terms.content),terms.contentHash);assert.equal(terms.byteLength,terms.content.length);assert.equal(content.reconstructLegalVersion(terms),Buffer.from(terms.content).toString('utf8'));
   await assert.rejects(version('TERMS','TEST-TOS-1','SYNTHETIC TEST changed words'));await assert.rejects(version('TERMS','BAD-CONTENT','Real legal draft must not be approved'));
   for(const bytes of [Buffer.from('SYNTHETIC TEST\r\n'),Buffer.from([255]),Buffer.from('\uFEFFSYNTHETIC TEST')])assert.throws(()=>content.canonicalLegalText(bytes));
  });
  await t.test('SQL rejects in-place content/hash tampering; simulated approval is separate provenance',async()=>{
   await assert.rejects(prisma.legalDocumentVersion.update({where:{id:terms.id},data:{content:Buffer.from('SYNTHETIC TEST altered')}}));
   await assert.rejects(prisma.legalDocumentVersion.create({data:{kind:'TERMS',version:'TEST-BAD-HASH',language:'en',content:Buffer.from('SYNTHETIC TEST'),contentHash:'0'.repeat(64),byteLength:14,createdById:admin.id}}));
   assert.throws(()=>content.reconstructLegalVersion({...terms,content:Buffer.from('SYNTHETIC TEST fake')}));await approve(terms);await approve(privacy);
   const review=await prisma.legalVersionReview.findFirstOrThrow({where:{versionId:terms.id}});assert.equal(review.action,'SIMULATED_APPROVE');assert.equal(review.reviewerId,admin.id);assert.match(review.evidenceReference,/^SYNTHETIC:/);
  });
  await t.test('publication requires matching reviewed kinds and cannot execute a customer DPA',async()=>{
   const dpa=await version('CUSTOMER_DPA','TEST-DPA-1');await approve(dpa);await assert.rejects(run(publisher,null,()=>catalog.publishSyntheticLegalSet('TEST-WRONG-SET',dpa.id,privacy.id)));
   assert.throws(()=>retention.executeCustomerDpa());assert.throws(()=>retention.disposeLegalEvidence());
   await assert.rejects(run(billing,null,()=>catalog.publishSyntheticLegalSet('TEST-BILLING-SET',terms.id,privacy.id)));
   set=await run(publisher,null,()=>catalog.publishSyntheticLegalSet('TEST-SET-1',terms.id,privacy.id));assert.equal(set.synthetic,true);assert.ok(set.effectiveAt>=set.publishedAt);
   const loaded=await prisma.legalPublication.findUniqueOrThrow({where:{id:set.id},include:catalog.publicationInclude});assert.equal(catalog.reconstructPublication(loaded).termsText,content.reconstructLegalVersion(terms));assert.equal(content.legalHash(set.manifest),set.manifestHash);
  });
  await t.test('presentation binds authenticated subject; agreement and acknowledgment are independently required',async()=>{
   presentation=await present(person);await assert.rejects(accept(outsider,presentation));await assert.rejects(accept(person,presentation,{agreeTerms:false}));await assert.rejects(accept(person,presentation,{acknowledgePrivacy:false}));await assert.rejects(accept(person,presentation,{manifestHash:'0'.repeat(64)}));
   assert.equal(await prisma.legalAcceptanceEvidence.count(),0);
  });
  await t.test('concurrent repeated acceptance produces one unchanged receipt and independent atomic event',async()=>{
   const results=await Promise.all(Array.from({length:10},()=>accept(person,presentation)));receipt=results[0];assert.equal(new Set(results.map(r=>r.id)).size,1);assert.equal(new Set(results.map(r=>+r.acceptedAt)).size,1);
   const event=await prisma.legalEvidenceEvent.findUniqueOrThrow({where:{operationKey:`${receipt.id}:ACCEPTED`}});assert.equal(event.type,'TERMS_AGREED_PRIVACY_ACKNOWLEDGED');assert.equal(event.actorAdminId,null);assert.equal(event.receiptId,receipt.id);
   const r=await prisma.legalAcceptanceEvidence.findUniqueOrThrow({where:{id:receipt.id}});assert.equal(r.termsAgreement,true);assert.equal(r.privacyAcknowledgment,true);assert.equal(r.publicationId,set.id);assert.equal(r.source,'REHEARSAL_AUTHENTICATED_EXPLICIT');
  });
  await t.test('supersession preserves exact previous bytes and rejects stale presentation/receipt reuse',async()=>{
   const stale=await present(outsider);const next=await version('TERMS','TEST-TOS-2','SYNTHETIC TEST — changed words\n');await approve(next);const nextSet=await run(publisher,null,()=>catalog.publishSyntheticLegalSet('TEST-SET-2',next.id,privacy.id));
   await assert.rejects(accept(outsider,stale));await assert.rejects(accept(person,presentation));assert.equal(await acceptance.hasCurrentSyntheticLegalReceipt(person.id),false);
   assert.equal((await run(person,null,()=>acceptance.ownSyntheticLegalReceipt(receipt.id))).termsText,content.reconstructLegalVersion(terms));await assert.rejects(run(outsider,null,()=>acceptance.ownSyntheticLegalReceipt(receipt.id)));
   assert.ok(await prisma.legalEvidenceEvent.count({where:{publicationId:set.id,type:'SUPERSEDED'}}));set=nextSet;
  });
  await t.test('publication and acceptance race has one serialized outcome, never a mixed set',async()=>{
   const p=await present(outsider),next=await version('PRIVACY','TEST-PRIV-2','SYNTHETIC TEST — new notice\n');await approve(next);
   const previousSet=await prisma.legalPublication.findUniqueOrThrow({where:{id:set.id}});const before=await prisma.legalAcceptanceEvidence.count();const result=await Promise.allSettled([accept(outsider,p),run(publisher,null,()=>catalog.publishSyntheticLegalSet('TEST-SET-3',previousSet.termsId,next.id))]);
   assert.equal(result[1].status,'fulfilled');set=result[1].value;
   const old=await prisma.legalAcceptanceEvidence.findMany({where:{publicationId:p.publicationId,subject:{userId:outsider.id}}});assert.equal(old.length,result[0].status==='fulfilled'?1:0);assert.equal(await prisma.legalAcceptanceEvidence.count(),before+old.length);assert.equal(await acceptance.hasCurrentSyntheticLegalReceipt(outsider.id),false);
  });
  await t.test('withdrawn versions are never silently republished or accepted; reconstruction still works',async()=>{
   const p=await present(outsider),current=await prisma.legalPublication.findUniqueOrThrow({where:{id:set.id}});await run(publisher,null,()=>catalog.withdrawSyntheticLegalVersion(current.privacyId,'SYNTHETIC:withdraw-review','Synthetic withdrawal, no public notice'));
   await assert.rejects(accept(outsider,p));await assert.rejects(run(publisher,null,()=>catalog.publishSyntheticLegalSet('TEST-WITHDRAW-REUSE',current.termsId,current.privacyId)));
   const newPrivacy=await version('PRIVACY','TEST-PRIV-3');await approve(newPrivacy);set=await run(publisher,null,()=>catalog.publishSyntheticLegalSet('TEST-SET-4',current.termsId,newPrivacy.id));
  });
  await t.test('historical labels/URLs cannot reconstruct content or satisfy the catalog; no backfill',async()=>{
   const legacy=await prisma.legalAcceptance.create({data:{userId:person.id,termsVersion:'HISTORICAL-UNKNOWN',privacyVersion:'HISTORICAL-UNKNOWN',termsUrl:'https://example.test/old-terms',privacyUrl:'https://example.test/old-privacy'}});const before=await prisma.legalAcceptance.findUniqueOrThrow({where:{id:legacy.id}});
   const v1=require('../src/server/auth/legal-acceptance.ts');await assert.rejects(run(person,null,()=>v1.recordLegalAcceptance(true,{termsVersion:legacy.termsVersion,privacyVersion:legacy.privacyVersion})));
   const limited=await run(person,null,acceptance.ownHistoricalLegalReceipts);assert.equal(limited.find(r=>r.id===legacy.id).evidenceClass,'LABEL_URL_ONLY');assert.equal(limited.find(r=>r.id===legacy.id).reconstructableFromReceipt,false);assert.equal((await run(outsider,null,acceptance.ownHistoricalLegalReceipts)).length,0);
   assert.deepEqual(await prisma.legalAcceptance.findUniqueOrThrow({where:{id:legacy.id}}),before);await assert.rejects(prisma.legalAcceptance.update({where:{id:legacy.id},data:{termsVersion:'GUESSED'}}));await assert.rejects(prisma.user.delete({where:{id:person.id}}));await assert.rejects(run(publisher,null,()=>retention.detachSyntheticLegalSubject(person.id,'SYNTHETIC:retain-required-evidence')));
  });
  await t.test('concurrent registration provisions one identity, requires current exact acknowledgment',async()=>{
   const external=id(),email=`${id()}@example.test`,profile={externalId:external,email};const get=require('../src/server/auth/get-current-user.ts').getCurrentUser;
   const old=process.env.COREOPS_REQUIRE_LEGAL_ACCEPTANCE;process.env.COREOPS_REQUIRE_LEGAL_ACCEPTANCE='false';try{
    const result=await Promise.allSettled(Array.from({length:10},()=>run(profile,null,get)));assert.ok(result.every(r=>r.status==='rejected'&&String(r.reason.digest).includes('/account/legal/rehearsal')));
    const rows=await prisma.user.findMany({where:{externalId:external}});assert.equal(rows.length,1);users.push(rows[0]);const p=await present(rows[0]);await accept(rows[0],p);assert.equal((await run(rows[0],null,get)).id,rows[0].id);
   }finally{if(old===undefined)delete process.env.COREOPS_REQUIRE_LEGAL_ACCEPTANCE;else process.env.COREOPS_REQUIRE_LEGAL_ACCEPTANCE=old;}
  });
  await t.test('synthetic minimal detachment preserves exact receipts; unrelated business links block it',async()=>{
   const u=await user(),p=await present(u),r=await accept(u,p);await assert.rejects(prisma.user.delete({where:{id:u.id}}));await assert.rejects(run(billing,null,()=>retention.detachSyntheticLegalSubject(u.id,'SYNTHETIC:retention-review')));
   const detached=await run(publisher,null,()=>retention.detachSyntheticLegalSubject(u.id,'SYNTHETIC:retention-review-minimal-proof'));await prisma.user.delete({where:{id:u.id}});assert.ok(await prisma.legalAcceptanceEvidence.count({where:{id:r.id,subjectId:detached.subjectId}}));
   const replacement=await prisma.user.create({data:{id:id(),externalId:u.externalId,email:u.email}});users.push(replacement);await assert.rejects(run(replacement,null,()=>acceptance.ownSyntheticLegalReceipt(r.id)));await assert.rejects(prisma.legalEvidenceSubject.update({where:{id:detached.subjectId},data:{userId:replacement.id}}));
   const businessUser=await user(),w=await prisma.workspace.create({data:{name:'Synthetic unrelated business',slug:id()}});workspaceIds.push(w.id);await prisma.workspaceMember.create({data:{workspaceId:w.id,userId:businessUser.id,role:'OWNER'}});await present(businessUser);await assert.rejects(run(publisher,null,()=>retention.detachSyntheticLegalSubject(businessUser.id,'SYNTHETIC:cannot-delete-business-evidence')));assert.ok(await prisma.workspace.count({where:{id:w.id}}));
  });
  await t.test('event/receipt tampering rolls back; exact renderer escapes arbitrary markup',async()=>{
   await assert.rejects(prisma.legalAcceptanceEvidence.update({where:{id:receipt.id},data:{acceptedAt:new Date()}}));
   const u=await user(),p=await present(u);const transaction=prisma.$transaction.bind(prisma);prisma.$transaction=(fn,options)=>transaction(tx=>fn(new Proxy(tx,{get(target,key){if(key==='legalEvidenceEvent')return {create:async()=>{throw Error('SYNTHETIC PRIVATE EVENT FAILURE');}};const v=Reflect.get(target,key);return typeof v==='function'?v.bind(target):v;}})),options);try{await assert.rejects(accept(u,p));}finally{prisma.$transaction=transaction;}assert.equal(await prisma.legalAcceptanceEvidence.count({where:{subject:{userId:u.id}}}),0);
   const Page=require('../src/app/account/legal/rehearsal/page.tsx').default,html=require('react-dom/server').renderToStaticMarkup(await run(u,null,()=>Page()));assert.match(html,/Synthetic legal-document rehearsal/);assert.ok(!html.includes('<script>alert("x")</script>'));assert.match(html,/&lt;script&gt;/);
  });
  await t.test('expired presentations fail without cleanup; mismatched SQL presentations cannot create evidence',async()=>{
   const u=await user(),p=await present(u),before=await prisma.legalAcceptanceEvidence.count();const old=catalog.legalNow;catalog.legalNow=async tx=>new Date(+(await old(tx))+6*60000);try{await assert.rejects(accept(u,p));}finally{catalog.legalNow=old;}assert.equal(await prisma.legalAcceptanceEvidence.count(),before);
   const subject=await prisma.legalEvidenceSubject.findUniqueOrThrow({where:{userId:u.id}}),foreign=await prisma.legalEvidenceSubject.findUniqueOrThrow({where:{userId:person.id}});await assert.rejects(prisma.legalAcceptanceEvidence.create({data:{subjectId:foreign.id,publicationId:p.publicationId,presentationId:p.presentationId,termsAgreement:true,privacyAcknowledgment:true}}));
   assert.ok(subject.id);assert.equal(await prisma.legalAcceptanceEvidence.count(),before);
  });
  await t.test('deployment and wrong database gates cannot activate the synthetic catalog',async()=>{
   process.env.VERCEL='1';try{await assert.rejects(present(person));}finally{delete process.env.VERCEL;}
   assert.equal(await prisma.legalDocumentVersion.count({where:{synthetic:false}}),0);
  });
 }finally{
  global.fetch=oldFetch;await cleanupLegal(prisma,users.map(u=>u.id),admins);await prisma.legalAcceptance.deleteMany({where:{userId:{in:users.map(u=>u.id)}}});await prisma.workspaceMember.deleteMany({where:{workspaceId:{in:workspaceIds}}});await prisma.workspace.deleteMany({where:{id:{in:workspaceIds}}});await prisma.platformAdmin.deleteMany({where:{id:{in:admins}}});await prisma.user.deleteMany({where:{id:{in:users.map(u=>u.id)}}});await prisma.$disconnect();
 }
});
