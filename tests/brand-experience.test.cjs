const {test}=require('node:test');const assert=require('node:assert/strict');const Module=require('node:module');const path=require('node:path');
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}});
const load=Module._load;
let content={offers:[],tax:null,ctaHref:'/sign-in',ctaLabel:'Get access',onboardingReady:false};
Module._load=function(name,parent,main){
 if(name==='next/headers')return {headers:async()=>new Headers({host:process.env.COREOPS_TEST_HOST||'approved.example.test'})};
 if(name==='server-only')return {};
 if(name==='@/server/commercial/marketing')return {marketingContent:async()=>content};
 if(name==='@/server/commercial/tax')return {calculateTax:amount=>({payable:amount})};
 if(name.startsWith('@/'))name=path.resolve(__dirname,'../src',name.slice(2));
 return load.call(this,name,parent,main);
};
const {renderToStaticMarkup}=require('react-dom/server');
const {createElement}=require('react');
const brand=require('../src/config/brand.ts');
const Home=require('../src/app/page.tsx').default;
const Pricing=require('../src/app/pricing/page.tsx').default;
const {visibleDashboardNav}=require('../src/config/dashboard-nav.ts');
test('landing stays concise and links to truthful dedicated features and pricing pages',async()=>{
 const html=renderToStaticMarkup(await Home());
 assert.match(html,/WorkflowConnect/);assert.doesNotMatch(html,/CoreOps|workflowconnect\.io|80%|SOC 2|ISO 27001/);
 assert.match(html,/SAMPLE DATA/);assert.match(html,/No automatic free trial/);
 const Features=require('../src/app/features/page.tsx').default;
 const featureHtml=renderToStaticMarkup(createElement(Features));
 assert.match(featureHtml,/Future client portal/);assert.match(featureHtml,/Post-MVP concept/);assert.match(featureHtml,/Not available in the current product/);
 const pricingHtml=renderToStaticMarkup(await Pricing());
 assert.match(pricingHtml,/KES 1,500/);assert.doesNotMatch(pricingHtml,/coming soon|being finalized|temporarily unavailable/);
 assert.doesNotMatch(html,/KES 1,500|KES 1500|KES 2,900|KES 2900|KES 7,900/);
 for(const href of ['/features','/pricing'])assert.ok(html.includes(`href="${href}"`));
 for(const anchor of ['how-it-works','main-content'])assert.ok(html.includes(`id="${anchor}"`));
 assert.ok(html.includes('href="/sign-in"'));assert.match(html,/Get access/);assert.match(html,/Terms of Service \(draft\)/);
});
test('pricing prioritizes published amounts and offers monthly and annual controls',async()=>{
 const {Prisma}=require('@prisma/client');
 const original=content;
 try{
  content={...content,offers:['MONTHLY','ANNUAL'].map((interval,i)=>({id:`published-${i}`,plan:'SOLO',interval,name:'Solo',amount:new Prisma.Decimal(i?'23456':'2345.67'),currency:'KES',memberLimit:1,invitationsEnabled:false,taxTreatment:'EXCLUSIVE',version:2}))};
  const html=renderToStaticMarkup(await Pricing());assert.match(html,/KES 2,345.67/);assert.match(html,/Monthly/);assert.match(html,/Annual/);assert.match(html,/Payable:/);assert.doesNotMatch(html,/href="\/sign-up"/);
 }finally{content=original;}
});
test('canonical/indexing require a secured configured origin and never default to proposed domain',async()=>{
 const keys=['COREOPS_CANONICAL_URL','COREOPS_PUBLIC_INDEXING_ENABLED','VERCEL_ENV','COREOPS_APP_ORIGIN','COREOPS_MARKETING_ORIGIN','COREOPS_PREVIEW_HOSTS','COREOPS_TEST_HOST'];const old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 try{
  delete process.env.COREOPS_CANONICAL_URL;assert.equal(brand.canonicalOrigin(),undefined);assert.equal(brand.indexingEnabled(),false);
  for(const value of ['http://example.test','https://user:secret@example.test','https://example.test/path','not a URL']){process.env.COREOPS_CANONICAL_URL=value;assert.equal(brand.canonicalOrigin(),undefined);}
  process.env.COREOPS_CANONICAL_URL='https://approved.example.test';process.env.COREOPS_PUBLIC_INDEXING_ENABLED='true';process.env.VERCEL_ENV='production';assert.equal(brand.indexingEnabled(),true);
  process.env.COREOPS_APP_ORIGIN=process.env.COREOPS_MARKETING_ORIGIN='https://approved.example.test';
  const sitemap=await require('../src/app/sitemap.ts').default();assert.ok(sitemap.every(row=>row.url.startsWith('https://approved.example.test/')));assert.ok(!sitemap.some(row=>row.url.includes('/w/')));
  process.env.VERCEL_ENV='preview';assert.equal(brand.indexingEnabled(),false);process.env.COREOPS_APP_ORIGIN=process.env.COREOPS_MARKETING_ORIGIN='https://isolated-preview.vercel.app';process.env.COREOPS_PREVIEW_HOSTS=process.env.COREOPS_TEST_HOST='isolated-preview.vercel.app';assert.deepEqual(await require('../src/app/sitemap.ts').default(),[]);
 }finally{for(const[k,v]of Object.entries(old)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});
test('mobile and desktop nav share the existing role visibility policy',()=>{
 const links=role=>visibleDashboardNav(role).map(item=>item.href);
 assert.deepEqual(links('STAFF'),['/dashboard','/projects','/tasks']);assert.deepEqual(links('MANAGER'),['/dashboard','/clients','/projects','/tasks']);assert.ok(links('OWNER').includes('/invoices'));assert.ok(links('OWNER').includes('/settings'));
});
test('static demo cannot create a workspace or launch a business session',()=>{
 const Demo=require('../src/app/demo/page.tsx').default;const html=renderToStaticMarkup(createElement(Demo));assert.match(html,/static product preview/);assert.match(html,/No workspace is created/);assert.doesNotMatch(html,/CoreOps|href="\/dashboard"|80%/);
});

test('catalog outage retains approved display pricing without offering checkout or asserting VAT status',async()=>{
 const original=content;
 try{
  content={...content,catalogAvailable:false};
  const html=renderToStaticMarkup(await Pricing());
  assert.match(html,/KES 1,500/);
  assert.match(html,/Your quotation confirms the final payable amount/);
  assert.doesNotMatch(html,/coming soon|being finalized|temporarily unavailable/);
  assert.doesNotMatch(html,/No VAT is currently charged|Payable:|href="\/sign-up"/);
 }finally{content=original;}
});
