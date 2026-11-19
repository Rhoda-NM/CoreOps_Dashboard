// Offline presentation regression: real workspace components, synthetic metrics,
// no database, provider authentication, navigation or business action execution.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}});
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{chromium,expect}=require('@playwright/test');
const original=Module._load;
const metrics={role:'OWNER',totalClients:8,activeProjects:4,pendingTasks:12,overdueTasks:2,revenueThisMonth:0,outstandingInvoices:24000,recentProjects:[],recentTasks:[],recentInvoices:[]};
Module._load=function(name,parent,main){
 if(name==='server-only')return {};
 if(name==='@/server/services/dashboard.service')return {getDashboardMetrics:async()=>metrics};
 if(name==='@/server/routing/config')return {runtimeRoutingPolicy:()=>({appOrigin:'https://synthetic.example.test'})};
 if(name==='@clerk/nextjs')return {UserButton:()=>React.createElement('button',{'aria-label':'Synthetic account'},'AB')};
 if(name==='next/navigation')return {usePathname:()=>'/w/synthetic/dashboard'};
 if(name==='@/features/quick-add/components/QuickAddProvider'||name==='./QuickAddProvider')return {useQuickAdd:()=>({openQuickAdd:()=>{}})};
 if(name==='next/link'||name==='@/components/workspaces/WorkspaceLink')return {__esModule:true,default:({children,...props})=>React.createElement('a',props,children)};
 if(name.startsWith('@/'))name=path.resolve(__dirname,'../src',name.slice(2));
 return original.call(this,name,parent,main);
};
(async()=>{
 let browser;
 try{
  const {DashboardShell}=require('../src/components/ui/layout/DashboardShell.tsx');
  const Dashboard=require('../src/app/w/[workspaceSlug]/dashboard/page.tsx').default;
  const {Input}=require('../src/components/ui/Input.tsx');
  const {Card,CardContent}=require('../src/components/ui/Card.tsx');
  const cssFile=path.resolve('src/app/globals.css');
  const css=(await require('postcss')([require('@tailwindcss/postcss')()]).process(fs.readFileSync(cssFile,'utf8'),{from:cssFile})).css;
  const html=renderToStaticMarkup(React.createElement(DashboardShell,{workspace:{id:'synthetic',name:'Sample business',slug:'synthetic'},user:{name:'Synthetic owner',email:'synthetic@example.test',role:'OWNER',imageUrl:null}},await Dashboard(),React.createElement(Card,{'data-testid':'form-card'},React.createElement(CardContent,null,React.createElement(Input,{id:'synthetic-field',label:'Synthetic field',placeholder:'Example'}),React.createElement(Input,{id:'synthetic-error',error:'Synthetic validation message'})))));
  const executablePath=fs.existsSync(chromium.executablePath())?chromium.executablePath():process.env.WORKFLOWCONNECT_TEST_CHROME;
  browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});const context=await browser.newContext();await context.route('**/*',r=>r.abort());const page=await context.newPage();
  await page.setContent(`<style>${css}</style><div id="outside" class="bg-core-bg text-core-text">Unchanged legacy area</div>${html}`);
  const color=(selector,prop)=>page.locator(selector).first().evaluate((el,p)=>getComputedStyle(el)[p],prop);
  assert.equal(await color('#outside','backgroundColor'),'rgb(14, 36, 37)');
  assert.equal(await color('#outside','color'),'rgb(244, 248, 245)');
  assert.equal(await color('.workspace-theme','backgroundColor'),'rgb(247, 248, 245)');
  assert.equal(await color('[data-testid="form-card"]','backgroundColor'),'rgb(255, 255, 255)');
  assert.equal(await color('.workspace-theme h1','color'),'rgb(25, 43, 50)');
  assert.equal(await color('#synthetic-field','backgroundColor'),'rgb(255, 255, 255)');
  assert.equal(await color('#synthetic-field','borderTopColor'),'rgb(122, 143, 134)');
  assert.equal(await color('.workspace-theme .text-red-300','color'),'rgb(153, 27, 27)');
  await page.locator('#synthetic-field').focus();await expect(page.locator('#synthetic-field')).toHaveCSS('outline-color','rgb(20, 125, 112)');
  assert.notEqual(await color('#synthetic-error','borderTopColor'),'rgb(122, 143, 134)');
  await page.locator('#synthetic-error').evaluate(el=>el.parentElement.remove());
  await page.locator('#outside').evaluate(el=>el.remove());
  for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
   await page.setViewportSize({width,height});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name+' horizontal overflow');
   await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});
   await page.screenshot({path:`/tmp/workflowconnect-workspace-${name}.png`,fullPage:true});
  }
  console.log('PASS: real workspace presentation renders pearl canvas, white cards/fields, dark text, readable status/focus; legacy fallback unchanged; desktop/mobile no overflow. Offline synthetic fixture only.');
 }finally{if(browser)await browser.close();Module._load=original;}
})().catch(error=>{console.error(error);process.exitCode=1;});
