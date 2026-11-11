// Real PostgreSQL integration tests; only request identity/headers are replaced.
// Run against an isolated migrated database, never a customer database.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AsyncLocalStorage } = require('node:async_hooks');
const { randomUUID } = require('node:crypto');
const Module = require('node:module');
const path = require('node:path');
if (!process.env.DATABASE_URL || !['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname) || !/^\/coreops_auth_rehearsal_[a-z0-9_]+$/.test(new URL(process.env.DATABASE_URL).pathname)) throw new Error('Use an isolated coreops_auth_rehearsal database for these tests.');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', jsx: 'react-jsx' } });
const request = new AsyncLocalStorage();
const load = Module._load;
Module._load = function(name, parent, main) {
  if (name === 'server-only') return {};
  if (name.endsWith('/get-current-user') || name === './get-current-user') return { getCurrentUser: async () => {
    const context = request.getStore();
    if (!context?.user) { const { AccessError } = require('../src/server/authorization/errors.ts'); throw new AccessError('UNAUTHENTICATED'); }
    return context.user;
  } };
  if (name === 'next/cache') return { revalidatePath: () => {if(refreshFault)throw Error(marker);} };
  if (name === 'next/headers') return { headers: async () => new Headers({ host: 'localhost:3000', ...(request.getStore()?.slug ? { 'x-coreops-workspace': request.getStore().slug, 'x-coreops-path': `/w/${request.getStore().slug}/dashboard` } : {}), ...(request.getStore()?.headers ?? {}) }), cookies: async () => ({ get: () => request.getStore()?.selected ? { value: request.getStore().selected } : undefined }) };
  if (name === '@clerk/nextjs/server') return { currentUser: async () => ({ id: request.getStore()?.providerId ?? request.getStore()?.user?.externalId, emailAddresses: [{ emailAddress: request.getStore()?.user?.email, verification: { status: 'verified' } }] }) };
  if (name.startsWith('@/')) name = path.resolve(__dirname, '../src', name.slice(2));
  return load.call(this, name, parent, main);
};
const { prisma } = require('../src/server/db/prisma.ts');
const invoices=require('../src/server/services/invoices.service.ts');
const {quickCreateInvoiceAction:action}=require('../src/features/quick-add/actions/quick-create-invoice.ts');
const id = () => `test-${randomUUID()}`;
const run = (user, workspace, fn) => request.run({ user, slug: workspace.slug }, fn);


const {Prisma}=require('@prisma/client'),{paidWorkspace,cleanupCommercial}=require('./commercial-fixtures.cjs');
const marker='PC1_SYNTHETIC_PRIVATE_SQL_TOKEN_PASSWORD_customer_internal_path';let refreshFault=false;
function form(client,patch={}){const f=new FormData();for(const[k,v]of Object.entries({clientId:client.id,invoiceNo:id(),amount:'123.45',...patch}))f.set(k,v);return f;}
async function captured(fn){const logs=[],log=console.error;console.error=(...args)=>logs.push(args);try{const response=await fn();assert.ok(!JSON.stringify({logs,response}).includes(marker));return {response,logs};}finally{console.error=log;}}
async function withFault(kind,collision,fn){const original=prisma.$transaction.bind(prisma);prisma.$transaction=(callback,options)=>original(tx=>callback(new Proxy(tx,{get(target,key){if(key==='invoice')return new Proxy(target.invoice,{get(model,method){if(method==='create')return async input=>{if(kind==='database')throw new Prisma.PrismaClientKnownRequestError(marker,{code:'P2028',clientVersion:'7.8.0',meta:{response:marker}});if(kind==='duplicate')return model.create({...input,data:{...input.data,id:collision}});if(kind==='fk')return model.create({...input,data:{...input.data,clientId:marker}});return model.create(input);};return Reflect.get(model,method);}});if(key==='auditLog'&&kind==='audit')return new Proxy(target.auditLog,{get(model,method){if(method==='create')return async()=>{throw Error(marker);};return Reflect.get(model,method);}});const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}})),options);try{return await fn();}finally{prisma.$transaction=original;}}

test('P-C1 private invoice failure containment with real PostgreSQL',async t=>{
 const ws=[],users=[],offers=[];let a,b,owner,staff,outsider,ca,cb;
 try{
  for(let i=0;i<3;i++)users.push(await prisma.user.create({data:{id:id(),externalId:id(),email:`${id()}@example.test`}}));[owner,staff,outsider]=users;
  a=await prisma.workspace.create({data:{id:id(),name:'Disposable PC1 A',slug:id()}});b=await prisma.workspace.create({data:{id:id(),name:'Disposable PC1 B',slug:id()}});ws.push(a.id,b.id);
  offers.push(await paidWorkspace(prisma,a,owner),await paidWorkspace(prisma,b,outsider));
  await prisma.workspaceMember.createMany({data:[{workspaceId:a.id,userId:owner.id,role:'OWNER'},{workspaceId:a.id,userId:staff.id,role:'STAFF'},{workspaceId:b.id,userId:outsider.id,role:'OWNER'}]});
  ca=await prisma.client.create({data:{workspaceId:a.id,name:marker,email:'synthetic@example.test'}});cb=await prisma.client.create({data:{workspaceId:b.id,name:'Disposable B'}});
  await t.test('authorized quick creation commits exact amount as DRAFT and one audit',async()=>{const f=form(ca),before=await prisma.auditLog.count({where:{workspaceId:a.id}}),{response,logs}=await captured(()=>run(owner,a,()=>action({},f)));assert.equal(response.success,true);assert.equal(response.message,'Invoice draft created.');assert.equal(logs.length,0);const row=await prisma.invoice.findFirstOrThrow({where:{workspaceId:a.id,invoiceNo:f.get('invoiceNo')}});assert.equal(row.status,'DRAFT');assert.ok(row.amount.equals('123.45'));assert.equal(await prisma.auditLog.count({where:{workspaceId:a.id}}),before+1);});
  await t.test('expected validation failures do not persist or log invoice payloads',async()=>{const before=await prisma.invoice.count({where:{workspaceId:a.id}}),{response,logs}=await captured(()=>run(owner,a,()=>action({},form(ca,{invoiceNo:'',amount:'0'}))));assert.equal(response.code,'QUICK_INVOICE_VALIDATION');assert.equal(logs.length,0);assert.equal(await prisma.invoice.count({where:{workspaceId:a.id}}),before);});
  await t.test('unauthenticated, STAFF, foreign tenant and foreign client attempts remain denied',async()=>{const before=await prisma.invoice.count({where:{workspaceId:{in:ws}}});for(const [person,target,client]of [[undefined,a,ca],[staff,a,ca],[outsider,a,ca],[owner,a,cb]]){const {response}=await captured(()=>run(person,target,()=>action({},form(client))));assert.equal(response.success,false);assert.equal(response.code,'QUICK_INVOICE_UNAVAILABLE');}assert.equal(await prisma.invoice.count({where:{workspaceId:{in:ws}}}),before);});
  await t.test('actual database uniqueness/FK failures and synthetic database exceptions are sanitized',async()=>{const original=await prisma.invoice.create({data:{id:marker,workspaceId:a.id,clientId:ca.id,invoiceNo:id(),amount:'1'}});for(const kind of ['duplicate','fk','database']){const before=await prisma.invoice.count({where:{workspaceId:a.id}}),{response,logs}=await withFault(kind,original.id,()=>captured(()=>run(owner,a,()=>action({},form(ca)))));assert.equal(response.success,false);assert.equal(response.code,kind==='duplicate'?'QUICK_INVOICE_CONFLICT':'QUICK_INVOICE_FAILED');assert.equal(logs.length,1);assert.equal(await prisma.invoice.count({where:{workspaceId:a.id}}),before);}});
  await t.test('Prisma validation error for malformed date remains private and creates no invoice',async()=>{const before=await prisma.invoice.count({where:{workspaceId:a.id}}),{response}=await captured(()=>run(owner,a,()=>action({},form(ca,{dueDate:marker}))));assert.equal(response.success,false);assert.equal(response.code,'QUICK_INVOICE_FAILED');assert.equal(await prisma.invoice.count({where:{workspaceId:a.id}}),before);});
  await t.test('audit failure rolls back real invoice insertion and cannot become success',async()=>{const before=await prisma.invoice.count({where:{workspaceId:a.id}}),audits=await prisma.auditLog.count({where:{workspaceId:a.id}});const {response}=await withFault('audit',null,()=>captured(()=>run(owner,a,()=>action({},form(ca)))));assert.equal(response.success,false);assert.equal(response.code,'QUICK_INVOICE_FAILED');assert.equal(await prisma.invoice.count({where:{workspaceId:a.id}}),before);assert.equal(await prisma.auditLog.count({where:{workspaceId:a.id}}),audits);});
  await t.test('post-commit refresh error truthfully reports creation without a retry insertion',async()=>{const f=form(ca);refreshFault=true;try{const {response}=await captured(()=>run(owner,a,()=>action({},f)));assert.equal(response.success,true);assert.equal(response.code,'QUICK_INVOICE_REFRESH_FAILED');assert.equal(await prisma.invoice.count({where:{workspaceId:a.id,invoiceNo:f.get('invoiceNo')}}),1);}finally{refreshFault=false;}});
  await t.test('shared service default status is preserved; invoice-number dedup remains a separately documented gap',async()=>{const n=id();await run(owner,a,()=>invoices.createInvoiceForClient({clientId:ca.id,invoiceNo:n,amount:'10'}));const {response}=await captured(()=>run(owner,a,()=>action({},form(ca,{invoiceNo:n}))));assert.equal(response.success,true);const rows=await prisma.invoice.findMany({where:{workspaceId:a.id,invoiceNo:n}});assert.deepEqual(rows.map(r=>r.status).sort(),['DRAFT','SENT']);});
 }finally{
  await prisma.auditLog.deleteMany({where:{workspaceId:{in:ws}}});await prisma.invoice.deleteMany({where:{workspaceId:{in:ws}}});await prisma.client.deleteMany({where:{workspaceId:{in:ws}}});await cleanupCommercial(prisma,ws,users.map(u=>u.id),offers);await prisma.workspace.deleteMany({where:{id:{in:ws}}});await prisma.user.deleteMany({where:{id:{in:users.map(u=>u.id)}}});await prisma.$disconnect();
 }
});
