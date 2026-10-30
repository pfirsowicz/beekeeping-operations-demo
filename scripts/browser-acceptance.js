import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {spawn} from 'node:child_process';
const live=process.argv.includes('--live'), url=live?'https://pfirsowicz.github.io/beekeeping-operations-demo/':'http://127.0.0.1:31861/?offline=1';
let server;
if(!live){server=spawn(process.execPath,['scripts/static-server.js']);for(let i=0;i<60;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}}
const executablePath=process.env.CHROME_EXECUTABLE||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':'/usr/bin/google-chrome');
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox']});
try{for(const width of [1440,768,390,320]){
 const ctx=await browser.newContext({viewport:{width,height:850}}),p=await ctx.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.goto(url,{waitUntil:'networkidle'});
 await p.locator('#mode-label').waitFor();
 assert.deepEqual(await p.locator('#navigation button[data-view]').evaluateAll(nodes=>nodes.map(n=>n.dataset.view)),['overview','apiaries','colonies','activity','followups']);
 assert.equal(await p.locator('.nav-locked').count(),0);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'overflow '+width);
 await p.locator('#theme-select').selectOption('studio');await p.reload({waitUntil:'networkidle'});
 assert.equal(await p.locator('#theme-select').inputValue(),'studio');
 if(width===1440){
  await p.locator('button[data-action="new-inspection"]').first().click();
  await p.locator('#f-colonyId').selectOption('col_101');
  await p.locator('#f-notes').fill('Browser original');
  await p.locator('#f-followUpDate').fill('2026-12-20');
  await p.locator('#submit-form').click();await p.getByText('Browser original').waitFor();
  await p.locator('button[data-action="edit-inspection"]').first().click();
  await p.locator('#f-notes').fill('Browser edited');
  await p.locator('#submit-form').click();await p.getByText('Browser edited').waitFor();
  await p.locator('button[data-view="followups"]').click();
  await p.locator('button[data-action="complete-task"]').first().click();
  await p.getByText('Follow-up completed; audit event retained.').waitFor();
  await p.locator('#navigation button[data-view="colonies"]').click();
  await p.locator('button[data-action="colony"][data-id="col_101"]').click();
  await p.locator('button[data-action="move"]').click();
  await p.locator('#f-toApiaryId').selectOption('api_hill');
  await p.locator('#f-reason').fill('Acceptance move');
  await p.locator('#submit-form').click();
  assert.match(await p.locator('.detail-facts').textContent(),/Stonefield/);
  await p.reload({waitUntil:'networkidle'});
  await p.locator('#navigation button[data-view="colonies"]').click();
  await p.locator('button[data-action="colony"][data-id="col_101"]').click();
  assert.match(await p.locator('.detail-facts').textContent(),/Stonefield/);
  p.once('dialog',d=>d.accept());
  await p.locator('#reset-demo').click();
  await p.getByText('Synthetic sample data restored.').waitFor();
  await p.locator('#navigation button[data-view="colonies"]').click();
  await p.locator('button[data-action="colony"][data-id="col_101"]').click();
  assert.match(await p.locator('.detail-facts').textContent(),/Fern Ridge/);
 }
 await p.locator('#navigation button[data-view="overview"]').focus();await p.keyboard.press('Enter');
 assert.equal(await p.locator('#page-title').textContent(),'Overview');
 assert.equal(await p.locator('#editor').evaluate(e=>e.open),false);
 assert.deepEqual(errors,[]);
 console.log('PASS '+width+'px '+(live?'hosted':'local'));
 await ctx.close();
}}finally{await browser.close();server?.kill();}