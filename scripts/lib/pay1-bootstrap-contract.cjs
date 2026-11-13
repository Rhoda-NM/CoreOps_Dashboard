/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS operator contract, no application entry point */
const {createHash,randomUUID}=require('node:crypto');
const TARGET='user_3LykI0tFI8Me3PRkkxOuLTUo5M2';
const sha=value=>createHash('sha256').update(value).digest('hex');
function requireCondition(value,code){if(!value)throw Error(code);}
function validateApproval(a,now=Date.now()){
 requireCondition(a?.kind==='PAY1_PREVIEW_INITIAL_SUPER_ADMIN'&&a.clerkUserId===TARGET,'APPROVAL_IDENTITY');
 requireCondition(typeof a.approved==='boolean'&&/^prj_[a-zA-Z0-9]+$/.test(a.projectId)&&/^dpl_[a-zA-Z0-9]+$/.test(a.deploymentId)&&/^team_[a-zA-Z0-9]+$/.test(a.teamId)&&/^[a-f0-9]{40}$/.test(a.gitSha),'APPROVAL_TARGET');
 const u=new URL(a.origin);requireCondition(u.protocol==='https:'&&u.origin===a.origin&&!u.username&&!u.password,'APPROVAL_ORIGIN');
 requireCondition(typeof a.admissionId==='string'&&a.admissionId.length>=8&&/^[-a-zA-Z0-9.]+:[0-9]{1,5}$/.test(a.databaseHost)&&!/^localhost:|^127\./.test(a.databaseHost)&&typeof a.databaseName==='string'&&a.databaseName.length>0&&a.databaseName.length<=63&&/^[a-z0-9-]+\.clerk\.accounts\.dev$/.test(a.clerkHost),'APPROVAL_DATABASE');
 for(const key of ['approvalReference','operatorReference','reviewerReference','nonProductionEvidenceReference','backupReference','syntheticIdentityEvidenceReference'])requireCondition(typeof a[key]==='string'&&a[key].trim().length>=10&&a[key].length<=300&&!a[key].includes('\0')&&!a[key].includes('$pay1_bootstrap$'),'APPROVAL_REFERENCES');
 requireCondition(a.operatorReference!==a.reviewerReference,'INDEPENDENT_REVIEW');
 requireCondition([a.validFrom,a.validUntil].every(value=>typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(value))&&Number.isFinite(Date.parse(a.validFrom))&&Number.isFinite(Date.parse(a.validUntil))&&Date.parse(a.validFrom)<=now&&now<Date.parse(a.validUntil),'APPROVAL_WINDOW');
 return a;
}
function databaseUrl(env,a){
 requireCondition(env.COREOPS_ENVIRONMENT==='preview'&&(!env.VERCEL_ENV||env.VERCEL_ENV==='preview'),'PRODUCTION_FORBIDDEN');
 const u=new URL(env.PAY1_PREVIEW_DATABASE_URL||'invalid:');
 const canonical=host=>host.replace('-pooler.', '.');
 requireCondition(['postgres:','postgresql:'].includes(u.protocol)&&['require','verify-full'].includes(u.searchParams.get('sslmode'))&&canonical(`${u.hostname}:${u.port||'5432'}`)===canonical(a.databaseHost)&&decodeURIComponent(u.pathname.slice(1))===a.databaseName,'DATABASE_TARGET');
 return u.toString();
}
function assertDeployment(d,a){
 requireCondition(d.id===a.deploymentId&&(d.projectId??d.project?.id)===a.projectId&&(d.target==='preview'||d.target===null)&&!d.customEnvironment,'DEPLOYMENT_TARGET');
 const hosts=[d.url,...(Array.isArray(d.alias)?d.alias:[])];requireCondition(hosts.includes(new URL(a.origin).host),'DEPLOYMENT_ORIGIN');
 requireCondition((d.gitSource?.sha??d.meta?.githubCommitSha)===a.gitSha&&d.readyState==='READY','DEPLOYMENT_REVISION');
}
function assertAdmission(r,a,now){
 requireCondition(r&&r.id===a.admissionId&&r.projectId===a.projectId&&r.deploymentId===a.deploymentId&&r.origin===a.origin&&r.databaseHost===a.databaseHost&&r.databaseName===a.databaseName&&r.clerkHost===a.clerkHost&&r.syntheticOnly===true&&!r.revokedAt&&new Date(r.notBefore)<=now&&now<new Date(r.expiresAt)&&r.actorExternalIds.includes(TARGET),'ADMISSION_TARGET');
}
function verifyMfa(auth,user,session,a,now=Date.now()){
 const email=user.emailAddresses?.find(e=>e.id===user.primaryEmailAddressId);
 const fva=auth?.sessionClaims?.fva,claims=auth?.sessionClaims;
 requireCondition(auth?.userId===TARGET&&auth.sessionId&&auth.tokenType==='session_token'&&typeof auth.has==='function'&&auth.has({reverification:'strict_mfa'})&&Array.isArray(fva)&&fva.length===2&&fva.every(n=>Number.isInteger(n)&&n>=0),'STRICT_MFA_REQUIRED');
 requireCondition(user.id===TARGET&&!user.banned&&!user.locked&&user.twoFactorEnabled&&email?.verification?.status==='verified','CLERK_IDENTITY');
 const issuer=new URL(claims.iss);
 requireCondition(issuer.protocol==='https:'&&issuer.hostname===a.clerkHost&&claims.azp===a.origin&&Number.isInteger(claims.exp)&&Number.isInteger(claims.iat)&&claims.iat*1000<=now,'CLERK_TOKEN_BINDING');
 requireCondition(session.id===auth.sessionId&&session.userId===TARGET&&session.status==='active'&&session.expireAt>now,'CLERK_SESSION');
 // strict_mfa is 10 minutes in the installed SDK; account for token age too.
 const deadline=Math.min(claims.exp*1000,(claims.iat+(10-Math.max(...fva))*60)*1000,now+60000,Date.parse(a.validUntil));
 requireCondition(deadline>now,'MFA_PROOF_EXPIRED');
 return {emailHash:sha(email.emailAddress.trim().toLowerCase()),proofExpiresAt:new Date(deadline).toISOString(),sessionEvidenceHash:sha(a.admissionId+':'+auth.sessionId)};
}
function classification(user,total){
 if(!user)return 'USER_MISSING';
 if(user.adminId)return user.active&&user.role==='SUPER_ADMIN'?'ALREADY_SUPER_ADMIN':'EXISTING_ROLE_REQUIRES_REVIEW';
 return total===0?'ELIGIBLE_INITIAL_BOOTSTRAP':'OTHER_ADMIN_RECORDS_BLOCK_INITIAL_BOOTSTRAP';
}
function prepareSql(a,proof,user,manifestHash){
 requireCondition(a.approved===true&&classification(user,proof.totalAdminRecords)==='ELIGIBLE_INITIAL_BOOTSTRAP','EXECUTION_NOT_APPROVED');
 requireCondition(/^[a-f0-9]{64}$/.test(manifestHash)&&/^[a-f0-9]{64}$/.test(proof.emailHash)&&/^[a-f0-9]{64}$/.test(proof.codeSha256)&&Date.parse(proof.proofExpiresAt)>Date.now(),'INVALID_PROOF');
 const q=value=>{const s=String(value);requireCondition(!s.includes('\0')&&!s.includes('$pay1_bootstrap$'),'UNSAFE_LITERAL');return "'"+s.replaceAll("'","''")+"'";};
 const adminId=randomUUID(),auditId=randomUUID();
 const meta={mechanism:'PAY1_PREVIEW_REVIEWED_OPERATOR',approvalSha256:manifestHash,codeSha256:proof.codeSha256,operatorReference:a.operatorReference,reviewerReference:a.reviewerReference,nonProductionEvidenceReference:a.nonProductionEvidenceReference,backupReference:a.backupReference,syntheticIdentityEvidenceReference:a.syntheticIdentityEvidenceReference,admissionId:a.admissionId,projectId:a.projectId,deploymentId:a.deploymentId,gitSha:a.gitSha,mfaPolicy:'strict_mfa',sessionEvidenceHash:proof.sessionEvidenceHash,proofExpiresAt:proof.proofExpiresAt};
 return `-- PREPARED ONLY. Execute only after explicit authorization, on the verified Preview connection.\n-- Fresh proof expires at ${proof.proofExpiresAt}; rerunning after expiry must fail.\nBEGIN;\nSET LOCAL standard_conforming_strings=on;\nSET LOCAL TIME ZONE 'UTC';\nSET LOCAL lock_timeout='5s';\nSET LOCAL statement_timeout='10s';\nDO $pay1_bootstrap$\nDECLARE target_id text;\nBEGIN\n IF current_database()<>${q(a.databaseName)} OR clock_timestamp()>=${q(proof.proofExpiresAt)}::timestamptz OR clock_timestamp()<${q(a.validFrom)}::timestamptz THEN RAISE EXCEPTION 'Bootstrap target or proof invalid'; END IF;\n SELECT id INTO STRICT target_id FROM public."User" WHERE id=${q(user.id)} AND "externalId"=${q(TARGET)} AND encode(sha256(convert_to(lower(btrim(email)),'UTF8')),'hex')=${q(proof.emailHash)} FOR UPDATE;\n PERFORM id FROM public."Pay1PreviewAdmission" WHERE id=${q(a.admissionId)} FOR SHARE;\n IF NOT EXISTS(SELECT 1 FROM public."Pay1PreviewAdmission" WHERE id=${q(a.admissionId)} AND "projectId"=${q(a.projectId)} AND "deploymentId"=${q(a.deploymentId)} AND origin=${q(a.origin)} AND "databaseHost"=${q(a.databaseHost)} AND "databaseName"=current_database() AND "clerkHost"=${q(a.clerkHost)} AND "syntheticOnly" AND "revokedAt" IS NULL AND "notBefore"<=clock_timestamp() AND "expiresAt">clock_timestamp() AND ${q(TARGET)}=ANY("actorExternalIds")) THEN RAISE EXCEPTION 'Bootstrap admission invalid'; END IF;\n LOCK TABLE public."PlatformAdmin" IN EXCLUSIVE MODE;\n IF EXISTS(SELECT 1 FROM public."PlatformAdmin") THEN RAISE EXCEPTION 'Initial bootstrap already closed; no role changed'; END IF;\n IF clock_timestamp()>=${q(proof.proofExpiresAt)}::timestamptz THEN RAISE EXCEPTION 'Proof expired during lock wait'; END IF;\n INSERT INTO public."PlatformAdmin" (id,"userId",role,active,"createdAt","updatedAt") VALUES (${q(adminId)},target_id,'SUPER_ADMIN',true,clock_timestamp(),clock_timestamp());\n INSERT INTO public."PlatformAuditEvent" (id,"actorAdminId",action,"resourceType","resourceId",reason,metadata,"createdAt") VALUES (${q(auditId)},${q(adminId)},'PAY1_INITIAL_SUPER_ADMIN_BOOTSTRAPPED','PlatformAdmin',${q(adminId)},${q(a.approvalReference)},${q(JSON.stringify(meta))}::jsonb,clock_timestamp());\nEND $pay1_bootstrap$;\nCOMMIT;\n`;
}
module.exports={TARGET,sha,validateApproval,databaseUrl,assertDeployment,assertAdmission,verifyMfa,classification,prepareSql};
