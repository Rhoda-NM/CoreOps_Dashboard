const {test}=require('node:test'),assert=require('node:assert/strict');
const Module=require('node:module'),path=require('node:path');
const {AsyncLocalStorage}=require('node:async_hooks');
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}});
let registrationReady=true;
const context=new AsyncLocalStorage(),load=Module._load;
Module._load=function(name,parent,main){
 if(name==='server-only')return {};
 if(name==='next/headers')return {headers:async()=>new Headers(context.getStore()?.headers??{})};
 if(name==='next/navigation')return {usePathname:()=>context.getStore()?.pathname??null};
 if(name==='@/server/auth/clerk-configuration')return {isRegistrationReady:async()=>registrationReady};
 if(name.startsWith('@/'))name=path.resolve(__dirname,'../src',name.slice(2));
 return load.call(this,name,parent,main);
};
const nav=require('../src/lib/routing/navigation.ts');
const {createRoutingPolicy}=require('../src/lib/routing/host-policy.ts');
const policy=createRoutingPolicy({mode:'subdomain',environment:'production',appOrigin:'https://app.workflowconnect.test',marketingOrigin:'https://workflowconnect.test',tenantRootDomain:'workflowconnect.test'});
function configured(fn){
 const vars={COREOPS_ROUTING_MODE:'subdomain',COREOPS_APP_ORIGIN:policy.appOrigin,COREOPS_MARKETING_ORIGIN:policy.marketingOrigin,COREOPS_TENANT_ROOT_DOMAIN:policy.tenantRootDomain,COREOPS_CANONICAL_URL:policy.marketingOrigin,COREOPS_PUBLIC_INDEXING_ENABLED:'true',NODE_ENV:'production',VERCEL_ENV:'production'};
 const old=Object.fromEntries(Object.keys(vars).map(key=>[key,process.env[key]]));Object.assign(process.env,vars);
 return Promise.resolve().then(fn).finally(()=>{for(const[key,value]of Object.entries(old)){if(value===undefined)delete process.env[key];else process.env[key]=value;}});
}
test('auth continuation rejects foreign destinations and only retains canonical scoped intent',()=>{
 const value=nav.workspaceContinuation('business-one','/tasks?status=TODO');
 assert.equal(nav.safeAuthReturn(value),value);
 const invitation=`/invitations/${'x'.repeat(43)}`;assert.equal(nav.safeAuthReturn(invitation),invitation);
 for(const bad of ['https://evil.test','//evil.test','/\\evil.test','/dashboard/continue?workspace=other&path=%2Fplatform','/dashboard/continue?workspace=other&workspace=second&path=%2Ftasks','/dashboard/continue?workspace=app&path=%2Ftasks','/dashboard/continue?workspace=other&path=%2Ftasks%2F..%2Fplatform','https://intent.invalid'+value])assert.equal(nav.safeAuthReturn(bad),'/dashboard',bad);
 assert.equal(nav.authReturnForPath('/w/business-one/tasks?status=TODO'),value);
 assert.equal(nav.signInDestination(policy,invitation),`${policy.appOrigin}/sign-in?${new URLSearchParams({returnTo:invitation})}`);
 const payment='/payments/paystack/return?reference=wc_reference-123';assert.equal(nav.safeAuthReturn(payment),payment);
 assert.equal(nav.safeAuthReturn(payment+'&workspace=other'),'/dashboard');
 assert.equal(nav.safeAuthReturn(payment+'&attempt=wc_reference-123&trxref=wc_reference-123'),payment);
 assert.equal(nav.safeAuthReturn(payment+'&reference=duplicate'),'/dashboard');
 assert.equal(nav.safeAuthReturn(payment+'&attempt=other'),'/dashboard');
 assert.equal(nav.paymentReturnReference({attempt:['duplicate'],reference:'wc_reference-123'}),undefined);
});
test('public and account links use configured authorities, with explicit same-origin workspace paths',()=>{
 assert.equal(nav.siteHref(policy,'/#how-it-works'),'https://workflowconnect.test/#how-it-works');
 assert.equal(nav.siteHref(policy,'/pricing'),'https://workflowconnect.test/pricing');
 assert.equal(nav.siteHref(policy,'/account'),'https://app.workflowconnect.test/account');
 const {renderToStaticMarkup}=require('react-dom/server'),{createElement:h}=require('react');
 const {NavigationProvider}=require('../src/components/workspaces/NavigationProvider.tsx'),WorkspaceLink=require('../src/components/workspaces/WorkspaceLink.tsx').default;
 const html=context.run({pathname:'/w/business-one/tasks'},()=>renderToStaticMarkup(h(NavigationProvider,{policy},h(WorkspaceLink,{href:'/projects'},'Projects'),h(WorkspaceLink,{href:'/account'},'Account'))));
 assert.match(html,/href="\/projects"/);assert.match(html,/href="https:\/\/app.workflowconnect.test\/account"/);assert.doesNotMatch(html,/href="\/w\//);
 const pathPolicy=createRoutingPolicy({mode:'path',environment:'development',appOrigin:'http://localhost:3000',marketingOrigin:'http://localhost:3000'});
 const legacy=context.run({pathname:'/w/business-two/tasks'},()=>renderToStaticMarkup(h(NavigationProvider,{policy:pathPolicy},h(WorkspaceLink,{href:'/projects'},'Projects'))));assert.match(legacy,/href="\/w\/business-two\/projects"/);
});
test('Clerk sign-in and sign-up force only validated central continuations and preserve invitations',()=>configured(async()=>{
 const SignIn=require('../src/app/(auth)/sign-in/[[...signin]]/page.tsx').default,SignUp=require('../src/app/(auth)/sign-up/[[...signup]]/page.tsx').default;
 const invitation=`/invitations/${'x'.repeat(43)}`;
 await context.run({headers:{host:'app.workflowconnect.test'}},async()=>{
  const signIn=await SignIn({searchParams:Promise.resolve({returnTo:invitation})});
  assert.equal(signIn.props.children.props.forceRedirectUrl,policy.appOrigin+invitation);assert.equal(signIn.props.children.props.signUpForceRedirectUrl,policy.appOrigin+invitation);
  const signUp=await SignUp({searchParams:Promise.resolve({returnTo:invitation})});
  assert.equal(signUp.props.children.props.children[0].props.forceRedirectUrl,policy.appOrigin+invitation);
  registrationReady=false;
  try {
   const blocked=await SignUp({searchParams:Promise.resolve({returnTo:invitation})});
   const {renderToStaticMarkup}=require('react-dom/server');const html=renderToStaticMarkup(blocked);
   assert.ok(html.includes('/sign-in?returnTo=%2Finvitations%2F'+ 'x'.repeat(43)));
  } finally { registrationReady=true; }
  const forged=await SignIn({searchParams:Promise.resolve({returnTo:'https://evil.test'})});assert.equal(forged.props.children.props.forceRedirectUrl,policy.appOrigin+'/dashboard');
 });
}));
test('robots, sitemap, manifest and root metadata respect actual host and preview boundaries',()=>configured(async()=>{
 const robots=require('../src/app/robots.ts').default,sitemap=require('../src/app/sitemap.ts').default,manifest=require('../src/app/manifest.ts').default;
 for(const host of ['workflowconnect.test','app.workflowconnect.test','business-one.workflowconnect.test'])await context.run({headers:{host}},async()=>{
  const publicHost=host==='workflowconnect.test';const rules=await robots();assert.equal(rules.rules.disallow==='/',!publicHost);
  const map=await sitemap();assert.equal(map.length>0,publicHost);assert.ok(map.every(row=>row.url.startsWith(policy.marketingOrigin+'/')));
  const install=await manifest();assert.equal(install.start_url,publicHost?'/':'/dashboard');assert.equal(install.scope,'/');
  const {hostMetadata}=require('../src/server/routing/metadata.ts');const metadata=await hostMetadata();assert.equal(metadata.index,publicHost);assert.equal(metadata.origin,`https://${host}`);
 });
 process.env.VERCEL_ENV='preview';process.env.COREOPS_ROUTING_MODE='path';process.env.COREOPS_APP_ORIGIN=process.env.COREOPS_MARKETING_ORIGIN='https://isolated.vercel.app';process.env.COREOPS_PREVIEW_HOSTS='isolated.vercel.app';
 await context.run({headers:{host:'isolated.vercel.app'}},async()=>{assert.deepEqual(await sitemap(),[]);assert.equal((await robots()).rules.disallow,'/');});
 delete process.env.COREOPS_PREVIEW_HOSTS;
}));
