// Actual local production-bundle handler/Proxy. No signed-in Clerk claim.
const assert=require('node:assert/strict'),{randomBytes}=require('node:crypto'),{spawn}=require('node:child_process'),{once}=require('node:events'),{Client}=require('pg');
const url=new URL(process.env.DATABASE_URL||'invalid:');if(!['localhost','127.0.0.1'].includes(url.hostname)||!/^\/coreops_auth_rehearsal_notifications_[a-z0-9_]+$/.test(url.pathname))throw Error('Dedicated notification rehearsal required');
const secret=randomBytes(32).toString('hex');
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3100'],{env:{...process.env,NODE_ENV:'production',COREOPS_ROUTING_MODE:'path',COREOPS_APP_ORIGIN:'http://127.0.0.1:3100',COREOPS_MARKETING_ORIGIN:'http://127.0.0.1:3100',COREOPS_LIFECYCLE_ENFORCEMENT_ENABLED:'false',COREOPS_LIFECYCLE_PROCESSING_ENABLED:'false',COREOPS_SECURE_EXPORTS_ENABLED:'false',COREOPS_NOTIFICATIONS_CAPTURE_ENABLED:'true',COREOPS_NOTIFICATIONS_SEND_ENABLED:'false',COREOPS_NOTIFICATION_DIGEST_KEY:randomBytes(32).toString('base64'),CRON_SECRET:secret},stdio:['ignore','pipe','pipe']});
(async()=>{let timer;try{
 await new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(Error('Startup timeout')),30000);server.once('error',reject);server.once('exit',()=>reject(Error('Premature exit')));server.stdout.on('data',d=>{if(d.toString().includes('Ready'))resolve();});server.stderr.resume();});clearTimeout(timer);
 const c=new Client({connectionString:url.toString()});await c.connect();try{
  const counts=async()=>(await c.query('SELECT (SELECT count(*) FROM "NotificationSource") sources,(SELECT count(*) FROM "NotificationOutbox") outbox,(SELECT count(*) FROM "NotificationRun") runs,(SELECT count(*) FROM "WorkspaceLifecycleEvent") events')).rows[0];const before=await counts();
  const endpoint='http://127.0.0.1:3100/api/notifications/capture',call=(query='',headers={},method='GET')=>fetch(endpoint+query,{headers,method,redirect:'manual'}),auth={authorization:`Bearer ${secret}`};
  assert.equal((await call()).status,401);assert.equal((await call('',{authorization:'Bearer wrong','x-coreops-workspace':'forged'})).status,401);
  const r=await call('',auth);assert.equal(r.status,200);assert.equal((await r.json()).dryRun,true);assert.match(r.headers.get('cache-control'),/no-store/);
  assert.equal((await call('?limit=999',auth)).status,400);assert.equal((await call('',auth,'POST')).status,404);
  const webhook='http://127.0.0.1:3100/api/notifications/resend/webhook';
  assert.equal((await fetch(webhook,{method:'POST',body:'{}',redirect:'manual'})).status,404);
  assert.equal((await fetch(webhook,{redirect:'manual'})).status,404);
  assert.deepEqual(await counts(),before);console.log('PASS: 7 production-bundle HTTP checks; private read-only capture, machine auth, Clerk bypass, bounds, POST denial, disabled Resend POST/GET; no DB changes.');
 }finally{await c.end();}
}finally{clearTimeout(timer);if(server.exitCode===null){const end=once(server,'exit');server.kill('SIGTERM');const kill=setTimeout(()=>server.kill('SIGKILL'),5000);await end;clearTimeout(kill);}}})().catch(e=>{console.error('Notification HTTP smoke failed; server stopped:',e.message);process.exitCode=1;});
