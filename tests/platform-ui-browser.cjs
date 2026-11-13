const {chromium,expect}=require('@playwright/test'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext();await context.route('**/*',r=>r.abort());
  const page=await context.newPage(),folder='/tmp/workflowconnect-platform-ui';page.setDefaultTimeout(10000);
  const routes=['overview','workspaces','requests','payments','history','offers','tax','users','audit','security'];
  for(const route of routes){
   await page.setViewportSize({width:1440,height:1000});
   await page.setContent(fs.readFileSync(`${folder}/${route}-populated.html`,'utf8'));
   await expect(page.locator('main h1')).toHaveCount(1);
   await expect(page.locator('.platform-sidebar [aria-current="page"]')).toHaveCount(1);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Desktop overflow: ${route}`);
   await page.screenshot({path:`${folder}/${route}-desktop.png`,fullPage:true});
   if(route==='requests'){
    await page.locator('summary').filter({hasText:'Review commercial quotation'}).click();
    await expect(page.getByLabel('Quoted amount',{exact:true})).toHaveValue('300.00');
    await expect(page.locator('input[name="operation"][value="review"]')).toHaveCount(1);
    await expect(page.getByRole('button',{name:'Approve commercial quotation'})).toBeVisible();
   }
   if(route==='payments'){
    await page.locator('summary').filter({hasText:'Confirm independently received funds'}).click();
    await expect(page.getByLabel('Actual transaction reference',{exact:true})).toBeVisible();
    await expect(page.locator('input[name="operation"][value="verify"]')).toHaveCount(1);
   }
   if(route==='offers'){
    await page.getByText('Create a new offer version',{exact:true}).click();
    await expect(page.getByLabel('KES amount (empty for enterprise quotation)',{exact:true})).toBeVisible();
   }
   await page.setViewportSize({width:390,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Mobile overflow: ${route}`);
   await expect(page.locator('.platform-sidebar')).toBeHidden();
   await page.locator('.platform-mobile-nav > summary').click();
   await expect(page.getByRole('navigation',{name:'Mobile platform navigation',exact:true})).toBeVisible();
   await page.locator('.platform-mobile-nav > summary').click();
   await page.screenshot({path:`${folder}/${route}-mobile.png`,fullPage:true});
  }
  await page.setContent(fs.readFileSync(`${folder}/workspaces-empty.html`,'utf8'));
  await expect(page.getByRole('heading',{name:'No workspaces yet'})).toBeVisible();
  console.log('PASS: 10 real server-rendered platform page presentations, desktop/mobile navigation, no page overflow, review-form fields/payloads and workspace empty state. Offline synthetic data; no authenticated runtime or action execution claimed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
