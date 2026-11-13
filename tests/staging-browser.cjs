// Actual Chromium + built application, external browser traffic blocked.
// No Clerk login, Paystack payment or full provider acceptance is claimed here.
const {chromium,expect}=require('@playwright/test'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),{once}=require('node:events'),fs=require('node:fs'),{Client}=require('pg');
const u=new URL(process.env.DATABASE_URL||'invalid:');
if(!['localhost','127.0.0.1'].includes(u.hostname)||!/^\/coreops_auth_rehearsal_staging_[a-z0-9_]+$/.test(u.pathname)||process.env.VERCEL||process.env.VERCEL_ENV)throw Error('Disposable local staging browser test only.');
const log=fs.openSync('/tmp/workflowconnect-staging-browser-server.log','w',0o600);
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3000'],{env:{...process.env,NODE_ENV:'production',COREOPS_PUBLIC_ONBOARDING_READY:'false'},stdio:['ignore','pipe','pipe']});
let browser,db;
(async()=>{let timer;try{
 await new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(Error('STARTUP_TIMEOUT')),30000);server.once('error',reject);server.once('exit',()=>reject(Error('STARTUP_FAILED_OR_PORT_BUSY')));server.stdout.on('data',d=>{fs.writeSync(log,d);if(d.toString().includes('Ready'))resolve();});server.stderr.on('data',d=>fs.writeSync(log,d));});clearTimeout(timer);
 db=new Client({connectionString:u.toString()});await db.connect();
 const counts=async()=>(await db.query('SELECT (SELECT count(*) FROM "User") users,(SELECT count(*) FROM "Workspace") workspaces,(SELECT count(*) FROM "SubscriptionPaymentReceipt") receipts,(SELECT count(*) FROM "PaystackWebhookEvent") events,(SELECT count(*) FROM "SubscriptionPeriod") periods,(SELECT count(*) FROM "PlatformAdmin") admins')).rows[0];const before=await counts();
 browser=await chromium.launch({headless:true});const context=await browser.newContext();
 await context.route('**/*',route=>['localhost','127.0.0.1'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
 const page=await context.newPage();await page.goto('http://127.0.0.1:3000/pricing',{waitUntil:'domcontentloaded'});
 await expect(page.getByText('KES 100',{exact:true})).toBeVisible();await expect(page.getByText('KES 300',{exact:true})).toBeVisible();await expect(page.getByText('KES 1,000',{exact:true})).toBeVisible();
 await page.screenshot({path:'/tmp/workflowconnect-staging-pricing-monthly.png',fullPage:true});
 await page.getByRole('button',{name:'Annual',exact:true}).click();await expect(page.getByRole('button',{name:'Annual',exact:true})).toHaveAttribute('aria-pressed','true');
 for(const amount of ['KES 1,000','KES 3,000','KES 10,000'])await expect(page.getByText(amount,{exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:'Contact Sales'})).toBeVisible();await expect(page.getByText(/One upfront payment for 12 months/)).toBeVisible();
 await page.screenshot({path:'/tmp/workflowconnect-staging-pricing-annual.png',fullPage:true});
 const unsigned=await context.request.post('http://127.0.0.1:3000/api/payments/paystack/test/webhook',{data:'{}',headers:{'content-type':'application/json','x-paystack-signature':'0'.repeat(128)}});assert.equal(unsigned.status(),401);
 const live=await context.request.post('http://127.0.0.1:3000/api/payments/paystack/live/webhook',{data:'{}'});assert.equal(live.status(),404);
 assert.deepEqual(await counts(),before);console.log('PASS: actual Chromium monthly/annual pricing and Enterprise CTA, unsigned webhook denied and live route unavailable; external requests blocked; database counts unchanged.');
}finally{clearTimeout(timer);if(browser)await browser.close();if(db)await db.end();if(server.exitCode===null){const end=once(server,'exit');server.kill('SIGTERM');const kill=setTimeout(()=>server.kill('SIGKILL'),5000);await end;clearTimeout(kill);}fs.closeSync(log);}})().catch(error=>{fs.writeFileSync('/tmp/workflowconnect-staging-browser-error.log',String(error?.message??'unknown'),{mode:0o600});console.error('STAGING_BROWSER_SMOKE_FAILED: see protected local test evidence; server stopped.');process.exitCode=1;});
