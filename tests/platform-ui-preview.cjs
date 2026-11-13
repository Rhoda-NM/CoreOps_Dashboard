// Renders the real administrative components with synthetic read models only.
// No auth route, database, provider call or administrative action is executed.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}});
const {Prisma:{Decimal}}=require('@prisma/client');
const d=n=>new Decimal(n),when=new Date('2026-11-13T09:30:00.000Z');
let pathname='/platform',empty=false;
const workspaces=[{id:'workspace_demo_01',name:'Acacia Studio',activationStatus:'ACTIVE',subscription:{plan:'BUSINESS',currentPeriodEnd:new Date('2026-12-13')},_count:{members:7}},{id:'workspace_demo_02',name:'Northstar Consulting',activationStatus:'PENDING_ACTIVATION',subscription:{plan:'STARTER',currentPeriodEnd:null},_count:{members:1}},{id:'workspace_demo_03',name:'Greenfield Collective',activationStatus:'SUSPENDED',subscription:{plan:'STARTER',currentPeriodEnd:when},_count:{members:3}}];
const requests=[{id:'request_demo_01',workspace:workspaces[1],plan:'STARTER',interval:'MONTHLY',type:'INITIAL',status:'SUBMITTED',currency:'KES',catalogAmount:d(300),payableAmount:null,memberLimit:3,offerVersion:2,taxTreatment:'NON_VAT_REGISTERED',payments:[]},{id:'request_demo_02',workspace:workspaces[0],plan:'BUSINESS',interval:'ANNUAL',type:'RENEWAL',status:'READY_FOR_ACTIVATION',currency:'KES',catalogAmount:d(10000),payableAmount:d(10000),memberLimit:10,offerVersion:2,taxTreatment:'NON_VAT_REGISTERED',payments:[]}];
requests[0].payments=[{id:'payment_demo',method:'BANK',status:'SUBMITTED',submittedReference:'SYNTHETIC-CLAIM',currency:'KES',proposedAmount:d(300),receivingAccountId:'account_demo',receipt:null}];
const offers=['SOLO','STARTER','BUSINESS','ENTERPRISE'].flatMap((plan,i)=>['MONTHLY','ANNUAL'].map((interval,j)=>({id:`offer_${i}_${j}`,name:plan.charAt(0)+plan.slice(1).toLowerCase(),plan,interval,version:2,amount:plan==='ENTERPRISE'?null:d([[100,1000],[300,3000],[1000,10000]][i][j]),currency:'KES',memberLimit:[1,3,10,null][i],taxTreatment:'NON_VAT_REGISTERED',published:true,invitationsEnabled:i>0,projectLimit:null})));
const list=data=>empty?[]:data;
const service={platformMetrics:async()=>({active:24,pending:6,expiring:3,expired:2,pendingRequests:8}),platformDirectory:async()=>list(workspaces),platformRequests:async()=>list(requests),platformOffers:async()=>({offers:list(offers),accounts:[]}),platformHistory:async()=>list([{id:'period_demo',workspaceId:'workspace_demo_01',sourceRequestId:'request_demo_02',plan:'BUSINESS',interval:'ANNUAL',currency:'KES',agreedAmount:d(10000),startsAt:when,endsAt:new Date('2027-11-13'),graceEndsAt:new Date('2027-11-20'),memberLimit:10,revokedAt:null}]),platformAuditHistory:async()=>list([{id:'audit_demo',action:'STANDARD_SUBSCRIPTION_ACTIVATED',createdAt:when,resourceId:'period_demo',workspaceId:'workspace_demo_01',reason:'Independently verified matching Test Mode transaction.'},{id:'audit_demo2',action:'OFFER_PUBLISHED',createdAt:when,resourceId:'offer_2_1',workspaceId:null,reason:'Founder-approved pricing release.'}])};
const tax={synthetic:true,version:2,id:'tax_demo',registrationStatus:'NOT_REGISTERED',rate:d(0),allowedTreatments:['NON_VAT_REGISTERED'],approvalReference:'Synthetic staging scenario',registrationReference:null,effectiveFrom:when};
const load=Module._load;
Module._load=function(n,p,m){
 if(n==='server-only')return {};
 if(n==='next/link')return {__esModule:true,default:({href,children,...props})=>React.createElement('a',{href,...props},children)};
 if(n==='next/navigation')return {usePathname:()=>pathname};
 if(n.endsWith('/commercial/service'))return service;
 if(n.endsWith('/commercial/platform-auth'))return {requirePlatform:async()=>({role:'SUPER_ADMIN'}),platformCan:()=>true};
 if(n.endsWith('/commercial/tax'))return {currentTaxConfiguration:async()=>tax,taxConfigurationHistory:async()=>list([tax]),calculateTax:()=>({tax:d(0)})};
 if(n.endsWith('/db/prisma'))return {prisma:{paymentReceivingAccount:{findMany:async()=>[]}}};
 if(n.endsWith('/payments/paystack'))return {paystackQueue:async()=>list([{id:'attempt_demo',mode:'test',status:'CONFIRMED',reference:'workflowconnect_synthetic_20261113',currency:'KES',expectedMinor:1000000n,requestId:'request_demo_02',lastError:null},{id:'attempt_demo2',mode:'test',status:'REVIEW',reference:'workflowconnect_synthetic_pending',currency:'KES',expectedMinor:30000n,requestId:'request_demo_01',lastError:'VERIFICATION_REQUIRED'}])};
 if(n.endsWith('/staging/users'))return {stagingUsers:async()=>list([{id:'account_demo',name:'Synthetic Customer',email:'customer@example.test',platformSuspended:false,platformAdmin:null,_count:{memberships:1}},{id:'account_demo2',name:'Synthetic Administrator',email:'admin@example.test',platformSuspended:false,platformAdmin:{role:'SUPER_ADMIN'},_count:{memberships:0}}])};
 if(n.endsWith('/data-access/security'))return {dataAccessEnabled:()=>false};
 if(n==='../actions'||n==='./actions')return {platformAction:async()=>({success:'Synthetic action not executed'}),changeAccountStatus:async()=>{throw Error('Preview is read-only');}};
 if(n.startsWith('@/'))n=path.resolve(__dirname,'../src',n.slice(2));
 return load.call(this,n,p,m);
};
(async()=>{
 const {PlatformShell}=require('../src/components/platform/PlatformShell.tsx');
 const routes=[['','Overview'],['workspaces','Workspaces'],['requests','Subscriptions'],['payments','Payments'],['history','Paid periods'],['offers','Plans & pricing'],['tax','Tax configuration'],['users','Accounts'],['audit','Audit trail'],['security','Security']];
 const cssRoot=path.resolve('.next/static/chunks'),css=fs.readdirSync(cssRoot).filter(n=>n.endsWith('.css')).map(n=>fs.readFileSync(path.join(cssRoot,n),'utf8')).join('\n');
 assert.ok(css.includes('platform-shell'),'Build the new CSS before visual review');
 const folder='/tmp/workflowconnect-platform-ui';fs.mkdirSync(folder,{recursive:true,mode:0o700});
 for(const [route] of routes){
  pathname='/platform'+(route?'/'+route:'');
  const Page=require('../src/app/platform/(protected)/'+(route?route+'/':'')+'page.tsx').default;
  for(const state of ['populated',...(route==='workspaces'?['empty']:[])]){
   empty=state==='empty';const page=await Page();
   const shell=React.createElement(PlatformShell,{role:'SUPER_ADMIN',environment:'Staging',links:routes.map(([path,label])=>({path,label,group:['offers','tax','users','audit','security'].includes(path)?'Administration':'Workspace'}))},page);
   const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Synthetic platform UI review</title><style>'+css+'</style></head><body>'+renderToStaticMarkup(shell)+'</body></html>';
   fs.writeFileSync(`${folder}/${route||'overview'}-${state}.html`,html,{mode:0o600});
  }
 }
 console.log('Rendered 10 real platform pages plus empty state. Synthetic read models; no auth, database or actions invoked.');
})().catch(e=>{console.error(e);process.exitCode=1;});
