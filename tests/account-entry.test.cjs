const {test}=require('node:test');
const assert=require('node:assert/strict');
const Module=require('node:module');
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node'}});
const load=Module._load;
const redirectError=Object.assign(new Error('NEXT_REDIRECT'),{digest:'NEXT_REDIRECT;replace;/sign-in;307;'});
let location;
Module._load=function(name,parent,main){if(name==='server-only')return {};if(name==='next/navigation')return {redirect:to=>{location=to;throw redirectError;}};return load.call(this,name,parent,main);};
const {Prisma}=require('@prisma/client');
const {IdentityError}=require('../src/server/auth/identity-error.ts');
const {Pay1AdmissionError}=require('../src/server/preview/pay1-error.ts');
const entry=require('../src/server/auth/account-entry.ts');
test('account entry handles closed expected reasons without exposing exceptions',async t=>{
 const warn=console.warn;let logs=[];console.warn=line=>logs.push(line);
 try{
 await t.test('each identity reason becomes safe help and a closed log code',async()=>{
  for(const reason of ['VERIFICATION_REQUIRED','IDENTITY_CONFLICT','ACCOUNT_UNAVAILABLE','SESSION_UNAVAILABLE','PROVIDER_UNAVAILABLE','LEGAL_ACCEPTANCE_REQUIRED']){
   logs=[];location=null;const e=new IdentityError(reason);e.cause={secret:'SENSITIVE_MARKER',sql:'SELECT private_customer'};
   await assert.rejects(entry.accountEntry(async()=>{throw e;}),x=>x===redirectError);assert.equal(location,'/account/recovery');assert.deepEqual(JSON.parse(logs[0]),{event:'ACCOUNT_ENTRY_DENIED',code:reason});assert.doesNotMatch(logs.join(''),/SENSITIVE_MARKER|SELECT|cause/);
  }
 });
 await t.test('PAY-1 failure retains actionable nonsecret reason',async()=>{
  for(const reason of ['PAY1_CONFIGURATION_REQUIRED','PAY1_SCHEMA_REQUIRED','PAY1_ADMISSION_REQUIRED','PAY1_ADMISSION_UNAVAILABLE','PAY1_TARGET_MISMATCH','PAY1_WINDOW_CLOSED','PAY1_ACTOR_NOT_ADMITTED','PAY1_REGISTRATION_UNAVAILABLE'])assert.equal(entry.accountEntryFailure(new Pay1AdmissionError(reason)),reason);
 });
 await t.test('actual Prisma schema/connection classes map without SQL, metadata or credentials',()=>{
  const missing=new Prisma.PrismaClientKnownRequestError('SENSITIVE_MARKER',{code:'P2022',clientVersion:'fixture',meta:{column:'private_column'}});
  assert.equal(entry.accountEntryFailure(missing),'ACCOUNT_SCHEMA_REQUIRED');
  assert.equal(entry.accountEntryFailure(new Prisma.PrismaClientInitializationError('SENSITIVE_MARKER','fixture')),'ACCOUNT_DATABASE_UNAVAILABLE');
  assert.equal(entry.accountEntryFailure({code:'P2022',message:'SENSITIVE_MARKER'}),null);
 });
 await t.test('success, unknown exceptions and framework control flow are unchanged',async()=>{
  assert.equal(await entry.accountEntry(async()=>42),42);
  for(const e of [new Error('SENSITIVE_MARKER'),redirectError,Object.assign(new Error('NEXT_HTTP_ERROR_FALLBACK;404'),{digest:'NEXT_HTTP_ERROR_FALLBACK;404'})]){
   logs=[];await assert.rejects(entry.accountEntry(async()=>{throw e;}),x=>x===e);assert.equal(logs.length,0);
  }
 });
 await t.test('a forged typed reason and log sink failure never leak or grant access',async()=>{
  assert.equal(entry.accountEntryFailure(new IdentityError('SENSITIVE_MARKER')),null);
  console.warn=()=>{throw new Error('sink failed');};await assert.rejects(entry.accountEntry(async()=>{throw new IdentityError('SESSION_UNAVAILABLE');}),x=>x===redirectError);
 });
 }finally{console.warn=warn;}
});
