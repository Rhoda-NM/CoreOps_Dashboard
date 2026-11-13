const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module');
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node'}});
const load=Module._load;Module._load=function(n,p,m){if(n==='server-only')return {};return load.call(this,n,p,m);};
const {stagingTarget}=require('../src/server/staging/config.ts');
const baseline={COREOPS_STAGING_ENABLED:'true',COREOPS_ENVIRONMENT:'staging',COREOPS_STAGING_ID:'reviewed-staging',COREOPS_PAY1_PREVIEW_ENABLED:'false',VERCEL:'1',VERCEL_ENV:'preview',VERCEL_PROJECT_ID:'prj_Reviewed',COREOPS_STAGING_PROJECT_ID:'prj_Reviewed',COREOPS_STAGING_BRANCH:'main',VERCEL_GIT_COMMIT_REF:'main',DATABASE_URL:'postgresql://synthetic:synthetic@ep-synthetic-pooler.example.test/preview?sslmode=verify-full',COREOPS_STAGING_DATABASE_HOST:'ep-synthetic.example.test:5432',COREOPS_STAGING_DATABASE_NAME:'preview',COREOPS_APP_ORIGIN:'https://trusted-staging.vercel.app',NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:'pk_test_'+Buffer.from('synthetic.clerk.accounts.dev$').toString('base64'),CLERK_SECRET_KEY:'sk_test_fixture',COREOPS_STAGING_CLERK_HOST:'synthetic.clerk.accounts.dev'};
test('staging uses persistent server project/branch/origin/database/Clerk identity; rejects unsafe configuration',()=>{const old={...process.env};try{process.env={...baseline,VERCEL_DEPLOYMENT_ID:'dpl_One'};const one=stagingTarget();process.env.VERCEL_DEPLOYMENT_ID='dpl_Two';assert.deepEqual(stagingTarget(),one);for(const patch of [{VERCEL_ENV:'production'},{VERCEL_TARGET_ENV:'production'},{COREOPS_ENVIRONMENT:'production'},{COREOPS_PAY1_PREVIEW_ENABLED:'true'},{VERCEL_PROJECT_ID:'prj_Other'},{VERCEL_GIT_COMMIT_REF:'untrusted-pr'},{COREOPS_STAGING_DATABASE_NAME:'production'},{PAYSTACK_LIVE_SECRET_KEY:'sk_live_forbidden'},{CLERK_SECRET_KEY:'sk_live_forbidden'},{COREOPS_NOTIFICATIONS_SEND_ENABLED:'true'},{COREOPS_SECURE_EXPORTS_ENABLED:'true'},{COREOPS_APP_ORIGIN:'https://evil.example.test/path'},{DATABASE_URL:'malformed synthetic sensitive marker'}]){process.env={...baseline,...patch};assert.throws(stagingTarget,error=>{assert.doesNotMatch(error.message,/marker|sk_live|postgresql|synthetic:/);return true;});}}finally{process.env=old;}});


test('operator preflight verifies the real alias project and branch without spoofing deployment markers',async()=>{
 const old={...process.env},fetch=global.fetch;
 try{process.env={...baseline,VERCEL_TOKEN:'synthetic-read-token',COREOPS_STAGING_TEAM_ID:'team_Synthetic'};delete process.env.VERCEL;delete process.env.VERCEL_ENV;delete process.env.VERCEL_PROJECT_ID;delete process.env.VERCEL_GIT_COMMIT_REF;
 const {reviewedOperatorTarget}=require('../scripts/lib/staging-operator.cjs');
 let reply={id:'dpl_First',projectId:'prj_Reviewed',target:null,readyState:'READY',meta:{githubCommitRef:'main'},gitSource:{ref:'a'.repeat(40)}};
 global.fetch=async(url,options)=>{assert.match(String(url),/trusted-staging.vercel.app/);assert.equal(options.redirect,'error');return Response.json(reply);};
 const first=await reviewedOperatorTarget();reply={...reply,id:'dpl_Next'};assert.deepEqual(await reviewedOperatorTarget(),first);assert.equal(process.env.VERCEL,undefined);
 reply={...reply,target:'production'};await assert.rejects(reviewedOperatorTarget());reply={...reply,target:null,meta:{githubCommitRef:'untrusted-pr'}};await assert.rejects(reviewedOperatorTarget());
 delete process.env.VERCEL_TOKEN;await assert.rejects(reviewedOperatorTarget());
 }finally{process.env=old;global.fetch=fetch;}
});


test('operator MFA proof requires signed-session binding, both verified factors, enrollment and fresh strict SDK result',()=>{
 const {TARGET,verifyMfa}=require('../scripts/lib/staging-mfa.cjs'),now=Date.now(),seconds=Math.floor(now/1000);
 const a={origin:'https://trusted-staging.vercel.app',clerkHost:'synthetic.clerk.accounts.dev',scopeId:'persistent-staging-proof-scope',validUntil:new Date(now+600000).toISOString()};
 const auth={userId:TARGET,sessionId:'synthetic-session',tokenType:'session_token',sessionClaims:{fva:[0,0],iat:seconds,exp:seconds+60,iss:'https://'+a.clerkHost,azp:a.origin},has:config=>config.reverification==='strict_mfa'};
 const user={id:TARGET,twoFactorEnabled:true,primaryEmailAddressId:'p',emailAddresses:[{id:'p',emailAddress:'synthetic@example.test',verification:{status:'verified'}}]},session={id:'synthetic-session',userId:TARGET,status:'active',expireAt:now+60000};
 assert.ok(Date.parse(verifyMfa(auth,user,session,a,now).proofExpiresAt)>now);
 for(const patch of [{has:()=>false},{userId:'other'},{sessionClaims:{...auth.sessionClaims,fva:[0,-1]}},{sessionClaims:{...auth.sessionClaims,exp:seconds-1}},{sessionClaims:{...auth.sessionClaims,azp:'https://foreign.test'}}])assert.throws(()=>verifyMfa({...auth,...patch},user,session,a,now));
 assert.throws(()=>verifyMfa(auth,{...user,twoFactorEnabled:false},session,a,now));assert.throws(()=>verifyMfa(auth,user,{...session,status:'revoked'},a,now));
});
