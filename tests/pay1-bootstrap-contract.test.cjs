const {test}=require('node:test'),assert=require('node:assert/strict');
const c=require('../scripts/lib/pay1-bootstrap-contract.cjs');
const now=Date.now(),seconds=Math.floor(now/1000);
const base={kind:'PAY1_PREVIEW_INITIAL_SUPER_ADMIN',clerkUserId:c.TARGET,approved:false,projectId:'prj_Synthetic',deploymentId:'dpl_Synthetic',teamId:'team_Synthetic',gitSha:'a'.repeat(40),origin:'https://preview.example.test',admissionId:'synthetic-admission',databaseHost:'ep-synthetic-pooler.example.test:5432',databaseName:'synthetic_preview',clerkHost:'synthetic.clerk.accounts.dev',validFrom:new Date(now-60000).toISOString(),validUntil:new Date(now+3600000).toISOString(),approvalReference:'SYNTHETIC: draft approval',operatorReference:'SYNTHETIC: operator',reviewerReference:'SYNTHETIC: independent reviewer',nonProductionEvidenceReference:'SYNTHETIC: target comparison',backupReference:'SYNTHETIC: protected checkpoint',syntheticIdentityEvidenceReference:'SYNTHETIC: authorized tester'};
const profile={id:c.TARGET,banned:false,locked:false,twoFactorEnabled:true,primaryEmailAddressId:'primary',emailAddresses:[{id:'primary',emailAddress:'synthetic@example.test',verification:{status:'verified'}}]};
const auth={userId:c.TARGET,sessionId:'synthetic-session',tokenType:'session_token',sessionClaims:{fva:[0,0],iat:seconds,exp:seconds+300,iss:'https://'+base.clerkHost,azp:base.origin},has:options=>options.reverification==='strict_mfa'};
const session={id:auth.sessionId,userId:c.TARGET,status:'active',expireAt:now+3600000};
const user={id:'synthetic-user',adminId:null,role:null,active:null};
const proof={...c.verifyMfa(auth,profile,session,base,now),totalAdminRecords:0,codeSha256:'b'.repeat(64)};
test('PAY-1 bootstrap preparation contract; no provider or database calls',async t=>{
 await t.test('approval binds one exact intended synthetic identity and explicit window/references',()=>{
  assert.equal(c.validateApproval(base,now).approved,false);
  for(const patch of [{clerkUserId:'user_Other'},{projectId:'unknown'},{teamId:''},{validUntil:new Date(now-1).toISOString()},{validFrom:'2026-01-01T00:00:00'},{reviewerReference:base.operatorReference},{backupReference:''}])assert.throws(()=>c.validateApproval({...base,...patch},now));
 });
 await t.test('only TLS matching Preview connections admit; production/local/foreign targets fail',()=>{
  const env={COREOPS_ENVIRONMENT:'preview',PAY1_PREVIEW_DATABASE_URL:'postgresql://synthetic:secret@ep-synthetic.example.test/synthetic_preview?sslmode=verify-full'};
  assert.ok(c.databaseUrl(env,base));
  for(const patch of [{COREOPS_ENVIRONMENT:'production'},{VERCEL_ENV:'production'},{VERCEL_ENV:'staging'},{PAY1_PREVIEW_DATABASE_URL:'postgresql://synthetic:secret@localhost/synthetic_preview?sslmode=require'},{PAY1_PREVIEW_DATABASE_URL:env.PAY1_PREVIEW_DATABASE_URL.replace('synthetic_preview','other')}])assert.throws(()=>c.databaseUrl({...env,...patch},base));
 });
 await t.test('deployment must be READY Preview with exact origin, project and revision',()=>{
  const d={id:base.deploymentId,projectId:base.projectId,target:null,gitSource:{sha:base.gitSha},readyState:'READY',url:'immutable.example.test',alias:['preview.example.test']};c.assertDeployment(d,base);
  for(const patch of [{target:'production'},{projectId:'prj_Other'},{gitSource:{sha:'c'.repeat(40)}},{alias:[]},{readyState:'ERROR'}])assert.throws(()=>c.assertDeployment({...d,...patch},base));
 });
 await t.test('current admission must match the target and intended actor',()=>{
  const row={...base,id:base.admissionId,syntheticOnly:true,revokedAt:null,notBefore:new Date(now-60000),expiresAt:new Date(now+60000),actorExternalIds:[c.TARGET]};c.assertAdmission(row,base,new Date(now));
  for(const patch of [{actorExternalIds:[]},{deploymentId:'dpl_Other'},{syntheticOnly:false},{revokedAt:new Date()},{expiresAt:new Date(now)}])assert.throws(()=>c.assertAdmission({...row,...patch},base,new Date(now)));
 });
 await t.test('actual SDK-verified session still needs verified account and strict MFA, not enrollment alone',()=>{
  assert.ok(c.verifyMfa(auth,profile,session,base,now).proofExpiresAt);
  for(const patch of [{userId:'user_Other'},{has:()=>false},{sessionClaims:{...auth.sessionClaims,fva:[0,-1]}},{sessionClaims:{...auth.sessionClaims,fva:[11,0]}},{sessionClaims:{...auth.sessionClaims,azp:'https://other.example.test'}},{sessionClaims:{...auth.sessionClaims,exp:seconds-1}}])assert.throws(()=>c.verifyMfa({...auth,...patch},profile,session,base,now));
  for(const patch of [{twoFactorEnabled:false},{banned:true},{locked:true},{emailAddresses:[]}])assert.throws(()=>c.verifyMfa(auth,{...profile,...patch},session,base,now));
  assert.throws(()=>c.verifyMfa(auth,profile,{...session,status:'revoked'},base,now));
 });
 await t.test('existing roles, inactive rows, other admins and missing User never become initial grants',()=>{
  assert.equal(c.classification(null,0),'USER_MISSING');assert.equal(c.classification(user,0),'ELIGIBLE_INITIAL_BOOTSTRAP');
  assert.equal(c.classification(user,1),'OTHER_ADMIN_RECORDS_BLOCK_INITIAL_BOOTSTRAP');assert.equal(c.classification({...user,adminId:'existing',role:'SUPER_ADMIN',active:true},1),'ALREADY_SUPER_ADMIN');assert.equal(c.classification({...user,adminId:'existing',role:'SUPER_ADMIN',active:false},1),'EXISTING_ROLE_REQUIRES_REVIEW');
  for(const count of [1,2])assert.throws(()=>c.prepareSql({...base,approved:true},{...proof,totalAdminRecords:count},user,'d'.repeat(64)));
 });
 await t.test('SQL is unavailable before approval and fresh proof; outputs only atomic role plus audit',()=>{
  assert.throws(()=>c.prepareSql(base,proof,user,'d'.repeat(64)));assert.throws(()=>c.prepareSql({...base,approved:true},{...proof,proofExpiresAt:new Date(0).toISOString()},user,'d'.repeat(64)));
  const sql=c.prepareSql({...base,approved:true,approvalReference:"SYNTHETIC: reviewer's approval"},proof,user,'d'.repeat(64));
  assert.match(sql,/reviewer''s/);assert.match(sql,/LOCK TABLE public\."PlatformAdmin" IN EXCLUSIVE MODE/);assert.match(sql,/IF EXISTS\(SELECT 1 FROM public\."PlatformAdmin"\)/);assert.equal((sql.match(/INSERT INTO/g)||[]).length,2);assert.match(sql,/PAY1_INITIAL_SUPER_ADMIN_BOOTSTRAPPED/);assert.match(sql,/Proof expired during lock wait/);assert.match(sql,/COMMIT;/);assert.doesNotMatch(sql,/INSERT INTO public\."(User|Workspace|WorkspaceMember)"|(?:^|;)\s*UPDATE\s|(?:^|;)\s*DELETE\s|synthetic@example.test|Bearer/);
 });
 await t.test('operator CLI rejects execution mode before any credentials, provider or SQL work',()=>{
  const {spawnSync}=require('node:child_process');const result=spawnSync(process.execPath,['scripts/pay1-preview-admin-review.cjs','--execute'],{cwd:require('node:path').resolve(__dirname,'..'),env:{PATH:process.env.PATH},encoding:'utf8'});assert.ifError(result.error);assert.equal(result.status,1);assert.match(result.stderr,/LOCAL_INPUT/);assert.equal(result.stdout,'');
 });
});
