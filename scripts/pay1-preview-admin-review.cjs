/* eslint-disable @typescript-eslint/no-require-imports -- privileged, read-only operator preparation */
// NO EXECUTION MODE. All database queries are read-only. SQL is an output file.
const fs=require('node:fs');
const path=require('node:path');
const {Client}=require('pg');
const {createClerkClient}=require('@clerk/backend');
const contract=require('./lib/pay1-bootstrap-contract.cjs');
const {TARGET,sha,validateApproval,databaseUrl,assertDeployment,assertAdmission,verifyMfa,classification,prepareSql}=contract;
function privateFile(file){
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||(stat.mode&0o077)!==0||(process.getuid&&stat.uid!==process.getuid()))throw Error('PROTECTED_FILE');
 return fs.readFileSync(file);
}
function output(file,value){
 const parent=fs.statSync(path.dirname(path.resolve(file)));
 if((parent.mode&0o077)!==0)throw Error('PROTECTED_DIRECTORY');
 fs.writeFileSync(file,value,{flag:'wx',mode:0o600});
}
async function main(){
 let stage='LOCAL_INPUT',client;
 try{
  const args=process.argv.slice(2),allowed=new Set(['--approval-file','--session-token-file','--report','--prepare-sql','--approved-manifest-sha256','--approved-code-sha256']),options={};
  for(let i=0;i<args.length;i+=2){if(!allowed.has(args[i])||!args[i+1]||args[i+1].startsWith('--')||options[args[i]])throw Error('ARGUMENTS');options[args[i]]=args[i+1];}
  if(!options['--approval-file']||!options['--session-token-file']||!options['--report'])throw Error('ARGUMENTS');
  const bytes=privateFile(options['--approval-file']),a=validateApproval(JSON.parse(bytes)),manifestHash=sha(bytes);
  const codeHash=sha(Buffer.concat([fs.readFileSync(__filename),fs.readFileSync(path.join(__dirname,'lib/pay1-bootstrap-contract.cjs'))]));
  const url=databaseUrl(process.env,a),token=privateFile(options['--session-token-file']).toString().trim();
  if(!token||!process.env.CLERK_SECRET_KEY?.startsWith('sk_test_')||!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_test_')||!process.env.VERCEL_TOKEN)throw Error('OPERATOR_CREDENTIALS');
  const issuer=Buffer.from(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.slice(8),'base64').toString().replace(/\$$/,'');
  if(issuer!==a.clerkHost)throw Error('CLERK_INSTANCE');
  if(options['--prepare-sql']&&(a.approved!==true||options['--approved-manifest-sha256']!==manifestHash||options['--approved-code-sha256']!==codeHash))throw Error('EXPLICIT_APPROVAL');
  stage='VERCEL_METADATA';
  const response=await fetch(`https://api.vercel.com/v13/deployments/${encodeURIComponent(a.deploymentId)}?teamId=${encodeURIComponent(a.teamId)}`,{headers:{Authorization:`Bearer ${process.env.VERCEL_TOKEN}`},redirect:'error',signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('VERCEL_ACCESS');assertDeployment(await response.json(),a);
  stage='CLERK_MFA';
  const clerk=createClerkClient({secretKey:process.env.CLERK_SECRET_KEY,publishableKey:process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY});
  const state=await clerk.authenticateRequest(new Request(a.origin+'/platform/sign-in',{headers:{Authorization:`Bearer ${token}`}}),{authorizedParties:[a.origin],acceptsToken:'session_token'});
  if(state.status!=='signed-in')throw Error('CLERK_SESSION');
  const auth=state.toAuth();
  const identity=await clerk.users.getUser(TARGET),session=await clerk.sessions.getSession(auth.sessionId);
  const proof=verifyMfa(auth,identity,session,a);
  stage='DATABASE_READ_ONLY';
  client=new Client({connectionString:url,connectionTimeoutMillis:5000});await client.connect();
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  await client.query("SET LOCAL statement_timeout='5s'");await client.query("SET LOCAL TIME ZONE 'UTC'");
  const actual=(await client.query('SELECT current_database() AS name, clock_timestamp() AS now')).rows[0];
  if(actual.name!==a.databaseName)throw Error('DATABASE_TARGET');
  const migration='20261111000400_pay1_preview_admission';
  const history=(await client.query('SELECT checksum FROM public."_prisma_migrations" WHERE migration_name=$1 AND finished_at IS NOT NULL AND rolled_back_at IS NULL',[migration])).rows;
  if(history.length!==1||history[0].checksum!==sha(fs.readFileSync(path.resolve(__dirname,'../prisma/migrations',migration,'migration.sql'))))throw Error('MIGRATION_HISTORY');
  const admission=(await client.query('SELECT * FROM public."Pay1PreviewAdmission" WHERE id=$1',[a.admissionId])).rows[0];assertAdmission(admission,a,actual.now);
  proof.proofExpiresAt=new Date(Math.min(Date.parse(proof.proofExpiresAt),new Date(admission.expiresAt).getTime())).toISOString();
  if(Date.parse(proof.proofExpiresAt)<=new Date(actual.now).getTime())throw Error('PROOF_EXPIRED');
  const records=(await client.query('SELECT u.id,u."externalId",lower(btrim(u.email)) AS email,p.id AS "adminId",p.role,p.active,(SELECT count(*)::int FROM public."WorkspaceMember" m WHERE m."userId"=u.id) AS memberships FROM public."User" u LEFT JOIN public."PlatformAdmin" p ON p."userId"=u.id WHERE u."externalId"=$1',[TARGET])).rows;
  if(records.length>1)throw Error('IDENTITY_BINDING');const user=records[0];
  const counts=(await client.query('SELECT count(*)::int AS total,count(*) FILTER (WHERE active AND role=\'SUPER_ADMIN\')::int AS "activeSuperAdmins" FROM public."PlatformAdmin"')).rows[0];
  await client.query('COMMIT');
  if(user&&sha(user.email)!==proof.emailHash)throw Error('LOCAL_IDENTITY_MISMATCH');
  const status=classification(user,counts.total);
  const report={mode:'READ_ONLY_REVIEW',status,clerkUserId:TARGET,localUserId:user?.id??null,currentRole:user?.role??null,currentRoleActive:user?.active??null,existingMembershipCount:user?.memberships??0,totalAdminRecords:counts.total,activeSuperAdminCount:counts.activeSuperAdmins,otherAdminRecords:counts.total-(user?.adminId?1:0),verifiedClerkIdentity:true,strictMfaVerified:true,previewDeploymentVerified:true,admissionVerified:true,manifestSha256:manifestHash,codeSha256:codeHash,approvalGranted:a.approved,proofExpiresAt:proof.proofExpiresAt,checkedAt:new Date().toISOString(),limitations:['Approval/evidence references require real human review.','No provider configuration, User, Workspace, membership or role was changed.','This report does not certify independently durable backup or restore behavior.']};
  stage='PROTECTED_OUTPUT';output(options['--report'],JSON.stringify(report,null,2)+'\n');
  if(options['--prepare-sql']){
   const sql=prepareSql(a,{...proof,totalAdminRecords:counts.total,codeSha256:codeHash},user,manifestHash);output(options['--prepare-sql'],sql);
  }
  console.log('PAY1_BOOTSTRAP_REVIEW_WRITTEN: no database writes; inspect the protected report.');
 }catch{console.error(JSON.stringify({event:'PAY1_BOOTSTRAP_REVIEW_FAILED',stage}));process.exitCode=1;}
 finally{if(client){try{await client.end();}catch{console.error(JSON.stringify({event:'PAY1_BOOTSTRAP_CONNECTION_CLOSE_FAILED'}));process.exitCode=1;}}}
}
if(require.main===module)main();
module.exports={privateFile};
