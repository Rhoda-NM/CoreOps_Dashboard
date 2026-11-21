// Real React shell + native dialog in Chromium. Provider/data boundaries are
// synthetic and offline; no Clerk login, database or business action is executed.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,expect}=require('@playwright/test'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'..');
const origin='https://workspace.example.test';
const stubs={
 'next/navigation':`import {useSyncExternalStore} from 'react';export function usePathname(){return useSyncExternalStore(f=>{addEventListener('popstate',f);return()=>removeEventListener('popstate',f)},()=>location.pathname,()=>'/w/synthetic/projects/42')}export function useRouter(){return {push:href=>{history.pushState(null,'',href);dispatchEvent(new PopStateEvent('popstate'));}}}`,
 'next/link':`import React from 'react';export default function Link({href,onClick,children,...props}){return <a {...props} href={href} onClick={event=>{onClick?.(event);if(event.defaultPrevented||event.metaKey||event.ctrlKey)return;event.preventDefault();history.pushState(null,'',href);dispatchEvent(new PopStateEvent('popstate'));}}>{children}</a>}`,
 '@clerk/nextjs':`import React from 'react';export function UserButton(props){return <button aria-label="Synthetic account menu" data-profile-url={props.userProfileUrl}>AB</button>}`,
 '../actions/quick-create-invoice':`export async function quickCreateInvoiceAction(){throw Error('Business actions forbidden in offline shell test')}`,
 '@/server/routing/config':`export const runtimeRoutingPolicy=()=>({appOrigin:'${origin}'});`,
};
(async()=>{
 let browser;
 try{
  const cssFile=path.join(root,'src/app/globals.css');
  const css=(await require('postcss')([require('@tailwindcss/postcss')()]).process(fs.readFileSync(cssFile,'utf8'),{from:cssFile})).css;
  const bundle=await esbuild.build({absWorkingDir:root,stdin:{contents:`
    import React from 'react';import {createRoot} from 'react-dom/client';
    import {DashboardShell} from './src/components/ui/layout/DashboardShell';
    import {QuickAddProvider} from './src/features/quick-add/components/QuickAddProvider';
    import {QuickAddDialog} from './src/features/quick-add/components/QuickAddDialog';
    const empty=new URLSearchParams(location.search).get('empty')==='true';const role=new URLSearchParams(location.search).get('role')||'OWNER';const multiple=new URLSearchParams(location.search).get('multiple')==='true';
    const workspace={id:'synthetic',name:'A very long synthetic business workspace name for narrow screen testing',slug:'synthetic'};
    createRoot(document.getElementById('app')).render(<><aside role="note" id="staging-banner" className="bg-amber-100 px-5 py-2 text-center text-sm font-medium text-amber-950">WorkflowConnect staging · Synthetic records only · Paystack Test Mode</aside><div className="workspace-theme"><QuickAddProvider><DashboardShell workspace={workspace} workspaces={multiple?[{slug:'synthetic',name:workspace.name},{slug:'other',name:'Other synthetic workspace'}]:[]} user={{name:empty?null:'An extremely long synthetic administrator name to test truncation',email:'synthetic@example.test',role,imageUrl:null}}><h1>Workspace shell fixture</h1><p>Offline synthetic content only.</p><button id="content-action">Content action</button><div style={{height:'160vh'}}/><button id="last-content-action">Last content action</button></DashboardShell>{role!=='STAFF'&&<QuickAddDialog role={role==='OWNER'?'OWNER':'MANAGER'}/>}</QuickAddProvider></div></>);
  `,resolveDir:root,loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'offline-boundaries',setup(build){build.onResolve({filter:/^(next\/navigation|next\/link|@clerk\/nextjs|@\/server\/routing\/config|\.\.\/actions\/quick-create-invoice)$/},args=>({path:args.path,namespace:'fixture'}));build.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:stubs[args.path],loader:'jsx',resolveDir:root}));}}]});
  const html=`<style>${css}</style><div id="app"></div><script>${bundle.outputFiles[0].text.replace(/<\/script/g,'<\\/script')}</script>`;
  const executablePath=fs.existsSync(chromium.executablePath())?chromium.executablePath():process.env.WORKFLOWCONNECT_TEST_CHROME;
  browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});const context=await browser.newContext({reducedMotion:'reduce'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.fulfill({contentType:'text/html',body:html}):route.abort());
  const page=await context.newPage();page.setDefaultTimeout(8000);
  const start=async(role='OWNER',multiple=false)=>{await page.goto(`${origin}/w/synthetic/projects/project-1?role=${role}&multiple=${multiple}`);await expect(page.locator('h1')).toHaveText('Workspace shell fixture');};
  const drawer=page.getByRole('dialog',{name:'Workspace navigation menu'}),trigger=page.getByRole('button',{name:'Open workspace navigation',exact:true});
  const open=async()=>{await trigger.click();await expect(drawer).toBeVisible();await expect(trigger).toHaveAttribute('aria-expanded','true');await expect(page.getByRole('button',{name:'Close workspace navigation',exact:true})).toBeFocused();};
  const closed=async()=>{await expect(drawer).toBeHidden();await expect(trigger).toHaveAttribute('aria-expanded','false');await expect(trigger).toBeFocused();await expect(page.locator('body')).not.toHaveCSS('overflow','hidden');};
  await page.setViewportSize({width:1440,height:1000});await start('OWNER',true);
  const sidebar=page.getByRole('complementary',{name:'Workspace sidebar'});
  await expect(sidebar).toBeVisible();await expect(sidebar).toHaveCSS('background-color','rgb(255, 255, 255)');await expect(sidebar.locator('.workspace-identity')).toHaveCSS('background-color','rgb(20, 61, 59)');
  await expect(sidebar.getByRole('link',{name:'Projects',exact:true})).toHaveAttribute('aria-current','page');
  await expect(sidebar.locator('[aria-current="page"]')).toHaveCount(1);await expect(sidebar.locator('[aria-current="page"]')).toHaveCSS('background-color','rgb(234, 243, 238)');await expect(sidebar.locator('[aria-current="page"]')).toHaveCSS('font-weight','650');await expect(sidebar.getByLabel('Switch workspace')).toHaveCount(1);await expect(page.getByText('Workspace Mode',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Synthetic account menu'})).toHaveAttribute('data-profile-url',origin+'/account');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await expect(trigger).toBeHidden();
  await page.screenshot({path:'/tmp/workflowconnect-shell-phase2-desktop.png',fullPage:false});
  await sidebar.getByRole('link',{name:'Tasks',exact:true}).click();await expect(sidebar.getByRole('link',{name:'Tasks',exact:true})).toHaveAttribute('aria-current','page');
  for(const width of [320,375,390,430]){
   await page.setViewportSize({width,height:780});await start('OWNER',true);await expect(sidebar).toBeHidden();await expect(page.getByRole('note')).toBeVisible();await open();
   await expect(drawer.getByRole('link',{name:'Projects',exact:true})).toHaveAttribute('aria-current','page');
   const box=await drawer.boundingBox();assert.ok(box.width<=width-31);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   for(let step=0;step<18;step++){await page.keyboard.press('Tab');assert.ok(await drawer.evaluate(el=>el.contains(document.activeElement)),'Tab escaped drawer');}
   for(let step=0;step<18;step++){await page.keyboard.press('Shift+Tab');assert.ok(await drawer.evaluate(el=>el.contains(document.activeElement)),'Shift+Tab escaped drawer');}
   await page.locator('#content-action').evaluate(el=>el.focus());assert.ok(await drawer.evaluate(el=>el.contains(document.activeElement)),'Background was not inert');
   await expect(drawer.locator('nav a').first()).toHaveCSS('transition-duration','0s');
   await expect(page.locator('body')).toHaveCSS('overflow','hidden');const before=await page.evaluate(()=>scrollY);await page.mouse.move(width-8,300);await page.mouse.wheel(0,600);assert.equal(await page.evaluate(()=>scrollY),before);
   await drawer.evaluate(el=>el.scrollTo(0,0));await page.screenshot({path:`/tmp/workflowconnect-shell-phase2-drawer-${width}.png`});
   await page.keyboard.press('Escape');await closed();await open();await page.mouse.click(width-8,200);await closed();
   await open();await drawer.getByRole('link',{name:'Tasks',exact:true}).click();await closed();assert.ok(page.url().endsWith('/w/synthetic/tasks'));
  }
  for(const [role,expected] of [['STAFF',['Dashboard','Projects','Tasks']],['MANAGER',['Dashboard','Clients','Projects','Tasks']],['OWNER',['Dashboard','Clients','Projects','Tasks','Invoices','Activity','Settings']]]){
   await start(role);await open();assert.deepEqual(await drawer.locator('nav a').allTextContents(),expected);await expect(drawer.getByLabel('Switch workspace')).toHaveCount(0);
   if(role==='STAFF'){await expect(drawer.getByText('Business finances',{exact:true})).toHaveCount(0);await expect(drawer.getByRole('button',{name:/Quick Add/})).toHaveCount(0);}await page.keyboard.press('Escape');await closed();
  }
  await start();await trigger.focus();await page.keyboard.press('Enter');await expect(drawer).toBeVisible();await page.keyboard.press('Escape');await closed();
  await page.setViewportSize({width:390,height:480});await start();await open();assert.ok(await drawer.evaluate(el=>el.scrollHeight>el.clientHeight),'Short drawer should scroll');await page.keyboard.press('Escape');await closed();
  await start();await open();await drawer.getByRole('button',{name:/Quick Add/}).click();await expect(drawer).toBeHidden();await expect(page.getByPlaceholder('Type a command or search...')).toBeFocused();await page.keyboard.press('Control+k');await expect(page.getByPlaceholder('Type a command or search...')).toBeHidden();
  await open();await page.keyboard.press('Control+k');await expect(drawer).toBeHidden();await expect(page.getByPlaceholder('Type a command or search...')).toBeFocused();await page.keyboard.press('Control+k');await expect(page.getByPlaceholder('Type a command or search...')).toBeHidden();
  await open();await page.setViewportSize({width:1280,height:800});await expect(drawer).toBeHidden();await expect(sidebar).toBeVisible();await expect(page.locator('body')).not.toHaveCSS('overflow','hidden');
  await page.goto(origin+'/w/synthetic/dashboard?empty=true');await page.setViewportSize({width:1280,height:800});await expect(page.locator('.workspace-user-details p')).toHaveText('synthetic@example.test');
  await page.setViewportSize({width:390,height:780});await start('OWNER',true);await open();
  const switchRequest=page.waitForRequest(r=>{const u=new URL(r.url());return u.pathname==='/dashboard/continue'&&u.searchParams.get('workspace')==='other'&&u.searchParams.get('path')==='/dashboard';});await drawer.getByLabel('Switch workspace').selectOption('other');await switchRequest;
  console.log('PASS: real hydrated shell, all roles, nested active links, actual workspace-switch destination, desktop and 320/375/390/430px drawers, modal focus/inertness, Escape/backdrop/link closure, scroll restoration, resize closure, Quick Add click/shortcut coexistence, long names, staging banner and reduced motion. Offline synthetic fixture only.');
 }finally{if(browser)await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
