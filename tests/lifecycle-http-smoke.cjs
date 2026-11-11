// Local production-bundle machine-route smoke; no Clerk session is simulated.
const assert=require('node:assert/strict');
const {randomBytes}=require('node:crypto');
const {spawn}=require('node:child_process');
const {once}=require('node:events');
const {Client}=require('pg');
const url=new URL(process.env.DATABASE_URL||'invalid:');
if(!['localhost','127.0.0.1'].includes(url.hostname)||!/^\/coreops_auth_rehearsal_[a-z0-9_]+$/.test(url.pathname))throw Error('Isolated local rehearsal required');
const secret=randomBytes(32).toString('hex');
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3100'],{
  env:{...process.env,NODE_ENV:'production',COREOPS_ROUTING_MODE:'path',COREOPS_APP_ORIGIN:'http://127.0.0.1:3100',COREOPS_MARKETING_ORIGIN:'http://127.0.0.1:3100',COREOPS_LIFECYCLE_ENFORCEMENT_ENABLED:'false',COREOPS_LIFECYCLE_PROCESSING_ENABLED:'false',COREOPS_SECURE_EXPORTS_ENABLED:'false',CRON_SECRET:secret},stdio:['ignore','pipe','pipe']
});
(async()=>{
 let timer;
 try{
  await new Promise((resolve,reject)=>{
    timer=setTimeout(()=>reject(Error('Local server startup timeout')),30000);
    server.once('error',reject);server.once('exit',()=>reject(Error('Local server exited before readiness')));
    server.stdout.on('data',data=>{if(data.toString().includes('Ready'))resolve();});
    server.stderr.resume();
  });clearTimeout(timer);
  const db=new Client({connectionString:process.env.DATABASE_URL});await db.connect();
  const counts=async()=>(await db.query('SELECT (SELECT count(*)::int FROM "WorkspaceLifecycle") AS states, (SELECT count(*)::int FROM "WorkspaceLifecycleEvent") AS events, (SELECT count(*)::int FROM "LifecycleJobRun") AS runs')).rows[0];
  try{
    const before=await counts();
    const endpoint='http://127.0.0.1:3100/api/lifecycle/process';
    const call=(query='',headers={},method='GET')=>fetch(endpoint+query,{method,headers:{host:'127.0.0.1:3100',...headers},redirect:'manual'});
    assert.equal((await call()).status,401);
    assert.equal((await call('',{authorization:'Bearer wrong','x-coreops-workspace':'forged'})).status,401);
    const auth={authorization:`Bearer ${secret}`};
    const dry=await call('',auth);assert.equal(dry.status,200);assert.equal((await dry.json()).dryRun,true);assert.match(dry.headers.get('cache-control'),/no-store/);
    assert.equal((await call('?dryRun=false',auth)).status,503);
    assert.equal((await call('',auth,'POST')).status,404);
    const cleanup='http://127.0.0.1:3100/api/lifecycle/export-cleanup';
    assert.equal((await fetch(cleanup)).status,401);
    assert.equal((await fetch(cleanup,{headers:auth})).status,503);
    assert.deepEqual(await counts(),before);
    console.log('PASS: 7 production-bundle HTTP checks; cleanup authentication and disabled state; bearer auth, no Clerk redirect, private dry-run, disabled writes, POST denial; no database changes.');
  }finally{await db.end();}
 }finally{
  clearTimeout(timer);
  if(server.exitCode===null){const exit=once(server,'exit');server.kill('SIGTERM');const kill=setTimeout(()=>server.kill('SIGKILL'),5000);await exit;clearTimeout(kill);}
 }
})().catch(error=>{console.error('Local lifecycle HTTP smoke failed; server stopped.',error.message);process.exitCode=1;});
