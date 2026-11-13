/* eslint-disable @typescript-eslint/no-require-imports -- pure privileged operator verification */
// No SQL, role grant, network call or execution mode. The caller must obtain
// auth from the installed Clerk SDK's authenticated ordinary session.
const {createHash}=require('node:crypto');
const TARGET='user_3LykI0tFI8Me3PRkkxOuLTUo5M2';
const sha=value=>createHash('sha256').update(value).digest('hex');
function requireCondition(value,code){if(!value)throw Error(code);}
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
 return {emailHash:sha(email.emailAddress.trim().toLowerCase()),proofExpiresAt:new Date(deadline).toISOString(),sessionEvidenceHash:sha(a.scopeId+':'+auth.sessionId)};
}
module.exports={TARGET,sha,verifyMfa};
