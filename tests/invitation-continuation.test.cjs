// Actual continuation functions/pages/actions; identity, database and admission
// boundaries substituted. No Clerk/provider requests or database writes.
const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path');
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}});
const invitation='/invitations/'+'x'.repeat(43),policy={appOrigin:'https://app.example.test',mode:'path'};
let staging=true,acknowledged=false,admitted=true,legalReady=true,legalCalls=0,receipt=false,synthetic=false;
const load=Module._load;
Module._load=function(name,parent,main){
 if(name==='server-only')return {};
 if(name.endsWith('/staging/config'))return{stagingRequested:()=>staging};
 if(name.endsWith('/preview/pay1-config'))return{pay1Enabled:()=>false};
 if(name.endsWith('/staging/environment'))return{requireStagingEnvironment:async()=>{if(!admitted)throw Error('Synthetic admission denied');return{id:'synthetic'};}};
 if(name.endsWith('/staging/acknowledgment'))return{stagingNotice:'SYNTHETIC TEST NOTICE',hasStagingAcknowledgment:async()=>acknowledged,acknowledgeStaging:async accepted=>{if(!admitted||!accepted)throw Error('Synthetic acknowledgment denied');acknowledged=true;}};
 if(name.endsWith('/clerk-identity'))return{requireClerkIdentity:async()=>{if(!admitted)throw Error('Synthetic identity denied');return{id:'synthetic'};}};
 if(name.endsWith('/routing/request-context'))return{requireCentralHost:async()=>({policy}),requestRoutingContext:async()=>({policy,requestHeaders:new Headers({'x-coreops-return-to':invitation,'x-coreops-path':invitation})})};
 if(name==='@/config/auth')return{getAuthConfiguration:()=>({requireLegal:true,legalReady,termsVersion:'test-terms',privacyVersion:'test-privacy'})};
 if(name.endsWith('/legal/config'))return{requireLegalRehearsal:()=>{},legalRehearsalAvailable:()=>true};
 if(name.endsWith('/legal/acceptance'))return{hasCurrentSyntheticLegalReceipt:async()=>false,presentSyntheticLegalSet:async()=>({version:'test',termsVersion:'test',privacyVersion:'test',termsText:'SYNTHETIC TEST TERMS',privacyText:'SYNTHETIC TEST PRIVACY',presentationId:'test',publicationId:'test',manifestHash:'test'}),acceptSyntheticLegalSet:async input=>{if(!input.agreeTerms||!input.acknowledgePrivacy)throw Error('Synthetic acknowledgment denied');synthetic=true;}};
 if(name==='@/server/auth/legal-acceptance'&&parent.filename.endsWith('/account/legal/actions.ts'))return{recordLegalAcceptance:async accepted=>{if(!accepted||!legalReady)throw Error('No approved agreement');legalCalls++;}};
 if(name==='@/server/db/prisma')return{prisma:{legalAcceptance:{findUnique:async()=>receipt?{id:'test'}:null}}};
 if(name.startsWith('@/'))name=path.resolve(__dirname,'../src',name.slice(2));return load.call(this,name,parent,main);
};
const nav=require('../src/lib/routing/navigation.ts');
const guard=require('../src/server/auth/legal-acceptance.ts');
const {acceptStagingNotice}=require('../src/app/account/staging-terms/actions.ts');
const {acceptCurrentLegalAction}=require('../src/app/account/legal/actions.ts');
const {acceptRehearsalLegalAction}=require('../src/app/account/legal/rehearsal/actions.ts');
async function destination(fn){try{await fn();assert.fail('Expected redirect');}catch(e){if(!e.digest?.startsWith('NEXT_REDIRECT'))throw e;return e.digest.split(';')[2];}}
const form=fields=>{const d=new FormData();for(const [k,v]of Object.entries(fields))d.set(k,v);return d;};
test('staging guard carries original invitation; explicit acknowledgment returns to it',async()=>{
 staging=true;acknowledged=false;
 const url=new URL(await destination(()=>guard.requireCurrentLegalReceipt('synthetic')));assert.equal(url.pathname,'/account/staging-terms');assert.equal(url.searchParams.get('returnTo'),invitation);
 assert.equal(await destination(()=>acceptStagingNotice(invitation,form({accepted:'on'}))),invitation);assert.equal(acknowledged,true);assert.equal(legalCalls,0);
 await guard.requireCurrentLegalReceipt('synthetic');
});
test('staging acknowledgement never bypasses admission, identity, or affirmative acceptance',async()=>{
 acknowledged=false;await assert.rejects(acceptStagingNotice(invitation,form({})));assert.equal(acknowledged,false);
 admitted=false;try{await assert.rejects(acceptStagingNotice(invitation,form({accepted:'on'})));assert.equal(acknowledged,false);}finally{admitted=true;}
 for(const value of ['https://evil.test','//evil.test','/\\evil.test','/invitations/'+ 'x'.repeat(43)+'?to=https://evil.test','/account/staging-terms?returnTo=//evil.test'])assert.equal(await destination(()=>acceptStagingNotice(value,form({accepted:'on'}))),'/dashboard');
});
test('ordinary legal receipt guard/action preserve invitation without treating drafts as agreement',async()=>{
 staging=false;receipt=false;const url=new URL(await destination(()=>guard.requireCurrentLegalReceipt('synthetic')));assert.equal(url.pathname,'/account/legal');assert.equal(url.searchParams.get('returnTo'),invitation);
 assert.equal(await destination(()=>acceptCurrentLegalAction('test-terms','test-privacy',invitation,form({acceptLegal:'on'}))),invitation);
 assert.equal(await destination(()=>acceptCurrentLegalAction('test-terms','test-privacy','https://evil.test',form({acceptLegal:'on'}))),'/dashboard');
 legalReady=false;try{await guard.requireCurrentLegalReceipt('synthetic');await assert.rejects(acceptCurrentLegalAction('test','test',invitation,form({acceptLegal:'on'})));}finally{legalReady=true;}
});
test('synthetic exact-document rehearsal continuation stays separate and allowlisted',async()=>{
 const before=process.env.COREOPS_LEGAL_CATALOG_REHEARSAL_ENABLED;process.env.COREOPS_LEGAL_CATALOG_REHEARSAL_ENABLED='true';
 try{const url=new URL(await destination(()=>guard.requireCurrentLegalReceipt('synthetic')));assert.equal(url.pathname,'/account/legal/rehearsal');assert.equal(url.searchParams.get('returnTo'),invitation);
 const data=form({returnTo:invitation,agreeTerms:'on',acknowledgePrivacy:'on'});assert.equal(await destination(()=>acceptRehearsalLegalAction(data)),invitation);assert.equal(synthetic,true);
 }finally{if(before===undefined)delete process.env.COREOPS_LEGAL_CATALOG_REHEARSAL_ENABLED;else process.env.COREOPS_LEGAL_CATALOG_REHEARSAL_ENABLED=before;}
});
test('invitation intent remains strict, relative and independent of workspace checkout',()=>{
 assert.equal(nav.safeAuthReturn(invitation),invitation);assert.equal(nav.authReturnForPath(invitation),invitation);
 for(const bad of ['https://evil.test','//evil.test','/invitations/short','/invitations/'+ 'x'.repeat(43)+'/extra',invitation+'#fragment','/%2f%2fevil.test'])assert.equal(nav.safeAuthReturn(bad),'/dashboard');
});
