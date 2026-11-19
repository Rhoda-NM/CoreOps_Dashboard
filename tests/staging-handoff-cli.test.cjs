const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node'}});
const {sealSession}=require('../src/server/staging/setup-handoff.ts');
test('real setup CLI consumes encrypted approval, initializes once, runs readiness, preserves history on repeat and rejects stale MFA',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'workflowconnect-handoff-cli-'));fs.chmodSync(dir,0o700);
 const stateFile=path.join(dir,'state.json');fs.writeFileSync(stateFile,JSON.stringify({environment:null,offers:[],tax:null,audits:[]}),{mode:0o600});
 const env={PATH:process.env.PATH,HOME:os.homedir(),NODE_OPTIONS:'--require '+path.resolve('tests/fixtures/staging-setup-operator.cjs'),STAGING_HANDOFF_TEST_STATE:stateFile,COREOPS_STAGING_ENABLED:'true',COREOPS_ENVIRONMENT:'staging',COREOPS_STAGING_REHEARSAL_ENABLED:'true',COREOPS_PAY1_PREVIEW_ENABLED:'false',COREOPS_STAGING_ID:'synthetic-staging-cli',COREOPS_STAGING_BRANCH:'test',COREOPS_STAGING_PROJECT_ID:'prj_Synthetic',DATABASE_URL:'postgresql://synthetic:synthetic@localhost:5432/coreops_auth_rehearsal_staging_handoff',COREOPS_STAGING_DATABASE_HOST:'localhost:5432',COREOPS_STAGING_DATABASE_NAME:'coreops_auth_rehearsal_staging_handoff',COREOPS_APP_ORIGIN:'http://localhost:3000',COREOPS_STAGING_CLERK_HOST:'synthetic.clerk.accounts.dev',NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:'pk_test_'+Buffer.from('synthetic.clerk.accounts.dev$').toString('base64'),CLERK_SECRET_KEY:'sk_test_fixture',PAYSTACK_TEST_SECRET_KEY:'sk_test_fixture',PAYSTACK_TEST_MERCHANT_ID:'synthetic',PAYSTACK_TEST_CHECKOUT_ENABLED:'true',PAYSTACK_TEST_CHANNELS:'card',PAYSTACK_TEST_CAPABILITIES_APPROVAL:'Synthetic fixture only',PAYSTACK_TEST_SETTLEMENT_APPROVAL:'Synthetic fixture only'};
 const manifest={approved:true,stagingId:env.COREOPS_STAGING_ID,clerkUserId:'user_3LykI0tFI8Me3PRkkxOuLTUo5M2',pricingApproval:'FOUNDER-2026-11-12-FINAL-PRICING-DECISION',syntheticTaxStatus:'NOT_REGISTERED',syntheticTaxApprovalReference:'Synthetic tax scenario',targetSeparationEvidence:'Synthetic isolated fixture',backupReference:'Synthetic fixture backup',syntheticDataEvidenceReference:'Synthetic records only',approvalReference:'Synthetic approved operation',validFrom:new Date(Date.now()-60000).toISOString(),validUntil:new Date(Date.now()+600000).toISOString()};
 const manifestFile=path.join(dir,'manifest.json');fs.writeFileSync(manifestFile,JSON.stringify(manifest),{mode:0o600});
 const run=(args,patch={})=>{const r=spawnSync(process.execPath,['scripts/staging-setup.cjs','--manifest',manifestFile,...args],{env:{...env,...patch},encoding:'utf8',timeout:30000});assert.ifError(r.error);assert.doesNotMatch(r.stdout+r.stderr,/SYNTHETIC_PRIVATE_SESSION_MARKER|PRIVATE KEY|synthetic-session/);return r;};
 try{
  for(const pass of [1,2,3]){
   const requestFile=path.join(dir,'setup'+pass+'.request.json');
   const preflight=run(['--prepare-authorization',requestFile,'--report',path.join(dir,'dry'+pass+'.json')]);assert.equal(preflight.status,0,preflight.stderr);
   const request=JSON.parse(fs.readFileSync(requestFile)),authorization=path.join(dir,'workflowconnect-staging-'+request.id+'.authorization.json');
   fs.writeFileSync(authorization,JSON.stringify(sealSession(request,'SYNTHETIC_PRIVATE_SESSION_MARKER',Date.now()+60000)),{mode:0o600});
   const applied=run(['--apply','--authorization-request',requestFile,'--authorization-directory',dir,'--wait','--report',path.join(dir,'applied'+pass+'.json')],pass===3?{STAGING_HANDOFF_TEST_STALE:'true'}:{});
   assert.equal(applied.status,pass===3?1:0,applied.stderr);
   if(pass!==3)assert.match(applied.stdout,/"catalogMatches": true/);
   const saved=JSON.parse(fs.readFileSync(stateFile));assert.equal(saved.offers.length,8);assert.equal(saved.audits.length,1);assert.equal(saved.tax.registrationStatus,'NOT_REGISTERED');
   assert.equal(fs.existsSync(requestFile+'.private.json'),false);
   assert.equal(run(['--apply','--authorization-request',requestFile,'--authorization-directory',dir,'--report',path.join(dir,'replay'+pass+'.json')]).status,1);
  }
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
