/* eslint-disable @typescript-eslint/no-require-imports -- operator-run read-only preflight */
const {Client}=require('pg');
const {createHash}=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
async function main(){
 const env=process.env,url=new URL(env.PAY1_PREVIEW_DATABASE_URL||'invalid:');
 const host=`${url.hostname}:${url.port||'5432'}`,database=decodeURIComponent(url.pathname.slice(1));
 if(env.PAY1_PREVIEW_SCOPE_CONFIRMED!=='true'||!['postgres:','postgresql:'].includes(url.protocol)||!['require','verify-full'].includes(url.searchParams.get('sslmode'))||host!==env.PAY1_EXPECTED_DATABASE_HOST||database!==env.PAY1_EXPECTED_DATABASE_NAME||host+'/'+database===env.PAY1_PRODUCTION_DATABASE_IDENTITY||!env.PAY1_PRODUCTION_DATABASE_IDENTITY||['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error('SCOPE');
 // For the migration review pass, reject stale inherited Prisma targets too.
 if(env.PAY1_REQUIRE_MIGRATION_URLS==='true')for(const key of ['DATABASE_URL','DIRECT_URL']){
  if(!env[key])throw Error('MIGRATION_SCOPE');
  const candidate=new URL(env[key]);
  if(!['postgres:','postgresql:'].includes(candidate.protocol)||`${candidate.hostname}:${candidate.port||'5432'}`!==host||decodeURIComponent(candidate.pathname.slice(1))!==database||!['require','verify-full'].includes(candidate.searchParams.get('sslmode')))throw Error('MIGRATION_SCOPE');
 }
 const client=new Client({connectionString:url.toString(),connectionTimeoutMillis:5000});
 try{
 await client.connect();await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 await client.query("SET LOCAL statement_timeout='5s'");
 const identity=(await client.query('SELECT current_database() AS name, current_setting(\'server_version\') AS version')).rows[0];
 if(identity.name!==database)throw Error('TARGET');
 const tables=(await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name")).rows.map(r=>r.table_name);
 let applied=[];
 if(tables.includes('_prisma_migrations'))applied=(await client.query('SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY started_at')).rows;
 const root=path.resolve(__dirname,'../prisma/migrations');
 const local=fs.readdirSync(root).filter(n=>fs.existsSync(path.join(root,n,'migration.sql')));
 const checksum=n=>createHash('sha256').update(fs.readFileSync(path.join(root,n,'migration.sql'))).digest('hex');
 const pending=local.filter(n=>!applied.some(a=>a.migration_name===n&&a.finished_at&&!a.rolled_back_at));
 const incompatible=applied.filter(a=>!a.rolled_back_at&&(!a.finished_at||!local.includes(a.migration_name)||a.checksum!==checksum(a.migration_name))).map(a=>a.migration_name);
 const columns=(await client.query("SELECT table_name,column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position")).rows;
 const counts={};
 for(const table of ['User','Workspace','WorkspaceMember','Subscription','SubscriptionPaymentReceipt','LegalAcceptance','MarketApplication','Pay1PreviewAdmission'])if(tables.includes(table))counts[table]=(await client.query(`SELECT count(*)::text AS count FROM "${table}"`)).rows[0].count;
 await client.query('COMMIT');
 console.log(JSON.stringify({readOnly:true,database:identity.name,postgres:identity.version,applied,pending,incompatible,columns,counts,limitations:['Counts do not establish synthetic data provenance.','Distinct endpoint strings do not establish independent Neon branches or credential isolation.','Backup and actual deployed revision require separate provider evidence.']},null,2));
 if(incompatible.length)process.exitCode=1;
 }finally{await client.end();}
}
main().catch(()=>{console.error('PAY1_PREFLIGHT_FAILED: target, TLS, credentials, history or read-only inspection unavailable. No credentials or records are logged.');process.exitCode=1;});
