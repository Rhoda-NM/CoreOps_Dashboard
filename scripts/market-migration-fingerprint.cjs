/* eslint-disable @typescript-eslint/no-require-imports -- isolated synthetic preservation tool */
const fs=require('node:fs'),{Client}=require('pg');
const url=new URL(process.env.DATABASE_URL||'invalid:');
if(!['localhost','127.0.0.1'].includes(url.hostname)||!/^\/coreops_auth_rehearsal_market_preserve_[a-z0-9_]+$/.test(url.pathname))throw Error('Dedicated isolated market preservation DB required');
const [mode,file]=process.argv.slice(2);if(!['prepare','verify'].includes(mode)||!file?.startsWith('/tmp/'))throw Error('Use prepare/verify /tmp/new-evidence.json');
const quote=s=>'"'+s.replaceAll('"','""')+'"';
(async()=>{const c=new Client({connectionString:url.toString()});await c.connect();try{
 await c.query('BEGIN READ ONLY');
 const before=mode==='verify'?JSON.parse(fs.readFileSync(file,'utf8')):null;
 const tables=before?Object.keys(before):(await c.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'_prisma_migrations' ORDER BY tablename`)).rows.map(r=>r.tablename);
 const result={};for(const t of tables){const columns=before?before[t].columns:(await c.query('SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position',['public',t])).rows.map(r=>r.column_name);const row=(await c.query(`SELECT count(*)::int AS count,md5(coalesce(string_agg(row_to_json(s)::text,'' ORDER BY row_to_json(s)::text),'')) AS digest FROM (SELECT ${columns.map(quote).join(',')} FROM ${quote(t)}) s`)).rows[0];result[t]={columns,...row};}
 await c.query('COMMIT');if(mode==='prepare')fs.writeFileSync(file,JSON.stringify(result),{flag:'wx',mode:0o600});else if(JSON.stringify(before)!==JSON.stringify(result))throw Error('Preservation mismatch');console.log(`${mode}: ${tables.length} prior tables, ${Object.values(result).reduce((n,r)=>n+r.count,0)} records; full prior-column fingerprints ${mode==='verify'?'matched':'recorded'}.`);
 }finally{await c.end();}})().catch(()=>{console.error('Market preservation check failed');process.exitCode=1;});
