/* eslint-disable @typescript-eslint/no-require-imports -- guarded migration operator */
// Does not reset or seed. Default reports pending migrations without applying.
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node'}});
const Module=require('node:module'),load=Module._load;Module._load=function(n,p,m){if(n==='server-only')return {};return load.call(this,n,p,m);};
const {reviewedOperatorTarget}=require('./lib/staging-operator.cjs');
const {spawnSync}=require('node:child_process');
(async()=>{try{
 const target=await reviewedOperatorTarget();
 const direct=new URL(process.env.DIRECT_URL||'invalid:');
 if(!['postgres:','postgresql:'].includes(direct.protocol)||(!target.local&&!['require','verify-full'].includes(direct.searchParams.get('sslmode')))||direct.hostname.includes('-pooler.')||`${direct.hostname}:${direct.port||'5432'}`!==target.databaseHost||decodeURIComponent(direct.pathname.slice(1))!==target.databaseName)throw Error('DIRECT_TARGET_REQUIRED');
 const apply=process.argv.includes('--apply');
 if(apply&&(!process.env.COREOPS_STAGING_MIGRATION_APPROVAL||!process.env.COREOPS_STAGING_BACKUP_REFERENCE))throw Error('APPROVAL_AND_BACKUP_REQUIRED');
 const child=spawnSync(process.platform==='win32'?'npx.cmd':'npx',['prisma','migrate',apply?'deploy':'status'],{stdio:'inherit',env:{...process.env,DATABASE_URL:direct.toString()}});
 process.exitCode=child.status??1;
}catch{console.error('STAGING_MIGRATION_TARGET_OR_APPROVAL_REQUIRED');process.exitCode=1;}})();
