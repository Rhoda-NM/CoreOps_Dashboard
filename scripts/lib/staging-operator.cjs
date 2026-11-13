/* eslint-disable @typescript-eslint/no-require-imports -- operator-only provider verification */
// No environment-marker spoofing. Web requests never use this operator adapter.
const {stagingTarget}=require('../../src/server/staging/config.ts');
async function reviewedOperatorTarget(){
 const url=new URL(process.env.DATABASE_URL||'invalid:');
 if(['localhost','127.0.0.1'].includes(url.hostname))return stagingTarget();
 if(process.env.VERCEL||process.env.VERCEL_ENV==='production'||!process.env.VERCEL_TOKEN||!process.env.COREOPS_STAGING_TEAM_ID)throw Error('OPERATOR_CONTEXT_REQUIRED');
 const candidate=stagingTarget({reviewedOperator:true});
 const response=await fetch(`https://api.vercel.com/v13/deployments/${encodeURIComponent(new URL(candidate.origin).host)}?teamId=${encodeURIComponent(process.env.COREOPS_STAGING_TEAM_ID)}`,{headers:{Authorization:'Bearer '+process.env.VERCEL_TOKEN},redirect:'error',signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('PROJECT_VERIFICATION_REQUIRED');
 const d=await response.json(),branch=d.meta?.githubCommitRef??d.gitSource?.ref;
 if((d.projectId??d.project?.id)!==candidate.projectId||!['preview',null].includes(d.target)||d.customEnvironment||d.readyState!=='READY'||branch!==process.env.COREOPS_STAGING_BRANCH)throw Error('PROJECT_SCOPE_MISMATCH');
 return candidate;
}
module.exports={reviewedOperatorTarget};
