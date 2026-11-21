const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path');
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}});
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{dashboardFixture}=require('./dashboard-fixtures.cjs');
let fixture=dashboardFixture(),role='OWNER',denied=false,write=true,calls=[];
const member=()=>({id:'fixture-member',workspaceId:'workspace-a',role});
const db=Object.fromEntries(['client','project','task','invoice'].map(model=>[model,Object.fromEntries(['count','findMany','aggregate'].map(method=>[method,async args=>{calls.push({model,method,args});if(method==='count')return 0;if(method==='aggregate')return {_sum:{amount:null}};return [];}]))]));
const original=Module._load;
Module._load=function(name,parent,main){
 if(name==='server-only')return {};
 if(name==='@/server/db/prisma')return {prisma:db};
 if(name==='../auth/get-current-workspace'&&parent.filename.endsWith('dashboard.service.ts'))return {getOperationalMembership:async feature=>{assert.equal(feature,'dashboard');if(denied)throw Error('SYNTHETIC_DENIED');return member();}};
 if(name==='../commercial/access'&&parent.filename.endsWith('dashboard.service.ts'))return {commercialAccess:async workspaceId=>{assert.equal(workspaceId,'workspace-a');return {write};}};
 if(name==='@/server/services/dashboard.service')return {getDashboardMetrics:async()=>fixture};
 if(name==='next/link'||name==='@/components/workspaces/WorkspaceLink')return {__esModule:true,default:({children,...props})=>React.createElement('a',props,children)};
 if(name.startsWith('@/'))name=path.resolve(__dirname,'../src',name.slice(2));return original.call(this,name,parent,main);
};
const {getDashboardMetrics}=require('../src/server/services/dashboard.service.ts');
const Page=require('../src/app/w/[workspaceSlug]/dashboard/page.tsx').default;
const {QuickAddProvider}=require('../src/features/quick-add/components/QuickAddProvider.tsx');
const {recentDashboardWork,formatDashboardMoney}=require('../src/features/dashboard/presentation.ts');
const render=async()=>renderToStaticMarkup(React.createElement(QuickAddProvider,null,await Page()));
test('real dashboard service preserves role/tenant/assignment predicates and never queries invoice data for non-owners',async()=>{
 for(role of ['STAFF','MANAGER','OWNER']){
  calls=[];write=true;const metrics=await getDashboardMetrics();
  const invoice=calls.filter(c=>c.model==='invoice');assert.equal(invoice.length,role==='OWNER'?3:0);
  if(role!=='OWNER'){assert.equal(metrics.revenueThisMonth,null);assert.equal(metrics.outstandingInvoices,null);assert.deepEqual(metrics.recentInvoices,[]);}
  const project=calls.find(c=>c.model==='project'&&c.method==='findMany');assert.equal(project.args.where.workspaceId,'workspace-a');assert.equal(project.args.take,5);assert.equal(project.args.select.createdAt,true);assert.equal('budget' in project.args.select,false);
  const task=calls.find(c=>c.model==='task'&&c.method==='findMany');assert.equal(task.args.where.workspaceId,'workspace-a');assert.equal(task.args.select.createdAt,true);
  if(role==='STAFF'){assert.deepEqual(project.args.where.projectMembers,{some:{memberId:'fixture-member'}});assert.deepEqual(task.args.where.OR,[{assignedMemberId:'fixture-member'},{teamVisible:true}]);assert.equal(calls.some(c=>c.model==='client'),false);assert.equal(metrics.canQuickAdd,false);}
  if(role==='OWNER'){
   const paid=invoice.find(c=>c.args.where.status==='PAID');assert.ok(paid.args.where.createdAt.gte instanceof Date);assert.ok(paid.args.where.createdAt.lt>paid.args.where.createdAt.gte);
   assert.deepEqual(invoice.find(c=>c.args.where.status?.not).args.where.status,{not:'PAID'});
   assert.equal(invoice.find(c=>c.method==='findMany').args.select.amount,undefined);
  }
 }
 role='OWNER';write=false;assert.equal((await getDashboardMetrics()).canQuickAdd,false);write=true;
 denied=true;calls=[];await assert.rejects(getDashboardMetrics(),/SYNTHETIC_DENIED/);assert.deepEqual(calls,[]);denied=false;
});
test('non-owner HTML omits financial values, invoice records, audit links and inaccessible client navigation',async()=>{
 for(const r of ['STAFF','MANAGER','OWNER']){
  fixture=dashboardFixture(r);const html=await render();
  for(const marker of ['Paid invoices · this month','Outstanding Invoices','PRIVATE_INVOICE_SENTINEL',formatDashboardMoney(fixture.revenueThisMonth),formatDashboardMoney(fixture.outstandingInvoices),'href="/activity"'])assert.equal(html.includes(marker),r==='OWNER',marker+' '+r);
  assert.equal(html.includes('Total Clients'),r!=='STAFF');assert.equal(html.includes('href="/clients"'),false);assert.equal(html.includes('Quick Add'),r!=='STAFF');
  assert.equal((html.match(/<h1/g)||[]).length,1);assert.doesNotMatch(html,/Today’s Focus|Revenue This Month|due today|growth|forecast|Live data/);
 }
});
test('recent work uses five chronological creation records and existing scoped destinations, never invoice amounts',()=>{
 fixture=dashboardFixture();const records=recentDashboardWork(fixture);assert.equal(records.length,5);assert.equal(records[0].kind,'Invoice');
 for(let i=1;i<records.length;i++)assert.ok(records[i-1].createdAt>=records[i].createdAt);
 assert.ok(records.every(r=>r.href.startsWith('/projects/')||r.href==='/tasks'||r.href==='/invoices'));
 assert.equal(JSON.stringify(records).includes('91827364'),false);
 assert.ok(recentDashboardWork(dashboardFixture('STAFF')).every(r=>r.kind!=='Invoice'));
});
test('empty/zero and read-only workspaces avoid false warnings and fabricated creation claims',async()=>{
 for(const scenario of ['empty','zero']){fixture=dashboardFixture('OWNER',scenario);fixture.revenueThisMonth=0;const html=await render();assert.ok(html.includes('No pending work to highlight'));assert.equal((html.match(/dashboard-metric dashboard-tone-(danger|warning)/g)||[]).length,0);assert.ok(html.includes('KES 0.00'));if(scenario==='empty')assert.ok(html.includes('No recent work yet'));}
 fixture=dashboardFixture('OWNER','readonly');assert.equal((await render()).includes('Quick Add'),false);
});
