// Operator-driven isolated migration rehearsal: prepare -> migrate deploy -> verify.
const assert=require('node:assert/strict');
const {randomUUID,createHash}=require('node:crypto');
const {Client}=require('pg');
const fs=require('node:fs');
const url=new URL(process.env.DATABASE_URL||'invalid:');
if(!['localhost','127.0.0.1'].includes(url.hostname)||!/^\/coreops_auth_rehearsal_lifecycle_populated_[a-z0-9_]+$/.test(url.pathname))throw Error('Dedicated isolated populated rehearsal required');
const mode=process.argv[2], evidence=process.argv[3];
if(!['prepare','verify'].includes(mode)||!evidence?.startsWith('/tmp/'))throw Error('Provide prepare|verify and a /tmp evidence file');
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node'}});
const {prisma}=require('../src/server/db/prisma.ts');
const {paidWorkspace}=require('./commercial-fixtures.cjs');
async function fingerprints(){
  const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();
  try{
    await c.query('BEGIN READ ONLY');
    const tables=['User','Workspace','WorkspaceMember','Client','Project','Task','Invoice','ProjectMember','Subscription','SubscriptionRequest','SubscriptionPeriod','SubscriptionPlanOffer','PlatformAdmin'];
    const result={};
    for(const table of tables){const rows=(await c.query(`SELECT * FROM "${table}" ORDER BY id`)).rows;result[table]={count:rows.length,sha256:createHash('sha256').update(JSON.stringify(rows)).digest('hex')};}
    await c.query('ROLLBACK');return result;
  }finally{await c.end();}
}
(async()=>{
 try{
  if(mode==='prepare'){
    assert.equal(fs.existsSync(evidence),false,'Never overwrite prior evidence');
    const prefix=`lifecycle-migration-${randomUUID()}`;
    await prisma.$transaction(async tx=>{
      const user=await tx.user.create({data:{id:`${prefix}-user`,externalId:prefix,email:`${prefix}@example.test`}});
      const workspace=await tx.workspace.create({data:{id:`${prefix}-workspace`,name:'Synthetic migration fixture',slug:prefix}});
      await paidWorkspace(tx,workspace,user);
      const member=await tx.workspaceMember.create({data:{workspaceId:workspace.id,userId:user.id,role:'OWNER'}});
      const client=await tx.client.create({data:{workspaceId:workspace.id,name:'Synthetic business client'}});
      const project=await tx.project.create({data:{workspaceId:workspace.id,clientId:client.id,name:'Synthetic delivery',budget:'900.25'}});
      await tx.projectMember.create({data:{workspaceId:workspace.id,projectId:project.id,memberId:member.id}});
      await tx.task.create({data:{workspaceId:workspace.id,projectId:project.id,title:'Synthetic assigned task',assignedMemberId:member.id}});
      await tx.invoice.create({data:{workspaceId:workspace.id,clientId:client.id,projectId:project.id,invoiceNo:prefix,amount:'123.45'}});
    });
    fs.writeFileSync(evidence,JSON.stringify(await fingerprints()),{mode:0o600,flag:'wx'});
    console.log('Prepared disposable business, financial, identity and assignment fixture; fingerprint evidence stored privately.');
  }else{
    assert.deepEqual(await fingerprints(),JSON.parse(fs.readFileSync(evidence,'utf8')));
    assert.equal(await prisma.workspaceLifecycle.count(),0);assert.equal(await prisma.workspaceLifecycleEvent.count(),0);
    console.log('All 13 populated-table fingerprints match; no lifecycle rows or events backfilled. Synthetic fixture retained in its dedicated isolated database for review.');
  }
 }finally{await prisma.$disconnect();}
})().catch(()=>{console.error('Isolated migration preservation rehearsal failed');process.exitCode=1;});
