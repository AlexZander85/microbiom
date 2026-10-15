import {chromium} from 'playwright';
import chrome from '@sparticuz/chromium';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const browser=await chromium.launch({headless:true,executablePath:await chrome.executablePath(),args:[...chrome.args.filter(a=>!a.startsWith('--use-')&&!['--single-process','--in-process-gpu','--disable-web-security','--allow-running-insecure-content'].includes(a)),'--disable-gpu']});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[],stages={};page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));
const ready=t=>page.waitForFunction(t=>!microcosmos2.replayBusy&&microcosmos2.local?.tick===t,t);
const start=async()=>{await page.click('[data-study="persistence"]');await page.check('[name="prediction"][value="1"]');await page.click('#study-form button');};
try{
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:8000');await page.waitForFunction(()=>microcosmos2?.available);await start();
 assert.equal(await page.locator('#persistence-panel').isVisible(),true);
 assert.equal(await page.locator('[data-local-action="antibiotic"]').isVisible(),false);assert.equal(await page.locator('[data-local-action="washout"]').isDisabled(),true);
 const aggregate=await page.evaluate(()=>microcosmos2.snapshot());
 for(const tick of [100,330,440]){
  await page.click(`[data-assay-stop="${tick}"]`);await ready(tick);assert.equal(await page.evaluate(()=>microcosmos2.paused),true);
  stages[tick]=await page.evaluate(()=>microcosmos2.local.assay);
 }
 assert.equal(stages[100].persisterOrigin,3);assert.equal(stages[100].sensitive,0);assert.ok(stages[330].recoveredLine>3);assert.equal(stages[440].persisterOrigin,0);assert.ok(stages[440].resistant>0);
 assert.deepEqual(await page.evaluate(()=>microcosmos2.snapshot()),aggregate);assert.equal(await page.locator('#persistence-rounds tr').count(),2);
 assert.equal(await page.inputValue('#learning-metric'),'persisterLine');assert.match(await page.locator('#learning-chart svg').getAttribute('aria-label'),/линия исходных/);
 await page.click('#learning-report');assert.match(await page.locator('#dialog-content').textContent(),/Воздействие №2/);await page.fill('#study-reflection','После пробуждения потомки снова чувствительны.');
 const [download]=await Promise.all([page.waitForEvent('download'),page.click('#report-save')]);const record=JSON.parse(await readFile(await download.path(),'utf8'));assert.equal(record.engine,'local-0.7.0');await page.click('#report-back');
 const full=await page.evaluate(()=>microcosmos2.learning.samples);
 await page.click('[data-assay-stop="100"]');await ready(100);assert.equal(await page.locator('#persistence-rounds tr').count(),1);
 await page.click('[data-assay-stop="330"]');await ready(330);assert.equal(await page.evaluate(()=>microcosmos2.local.assay.recoveredLine),6);
 await page.locator('#local-events button').filter({hasText:'Возвращение к росту'}).first().click();assert.match(await page.locator('#narrator-rule').textContent(),/ген устойчивости не появился/);
 await page.evaluate(()=>document.activeElement?.blur());
 await page.locator('#learning-panel').screenshot({path:'docs/screenshots/13-persistence-recovery.png'});
 await page.click('#learning-finish');await ready(440);assert.deepEqual(await page.evaluate(()=>microcosmos2.learning.samples),full);
 await page.setInputFiles('#local-load',{name:'persistence.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(record))});await ready(440);assert.deepEqual(await page.evaluate(()=>microcosmos2.localRecord()),record);
 const bad={...record,engine:'local-0.5.0'};await page.setInputFiles('#local-load',{name:'wrong-engine.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});await page.waitForFunction(()=>document.getElementById('explain-title').textContent==='Запись не загружена');assert.deepEqual(await page.evaluate(()=>microcosmos2.localRecord()),record);
 await page.evaluate(()=>{window.ext=document.querySelector('#universe').getContext('webgl2').getExtension('WEBGL_lose_context');ext.loseContext();});await page.waitForFunction(()=>microcosmos2.lost);await page.evaluate(()=>ext.restoreContext());await page.waitForFunction(()=>!microcosmos2.lost);assert.deepEqual(await page.evaluate(()=>microcosmos2.localRecord()),record);
 await page.setViewportSize({width:390,height:844});await page.locator('#persistence-panel').scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.evaluate(()=>document.activeElement?.blur());await page.locator('#persistence-panel').screenshot({path:'docs/screenshots/14-persistence-mobile.png'});
 // A branch before challenge #2 must not secretly apply it.
 await page.locator('#local-seek').evaluate(el=>{el.value='330';el.dispatchEvent(new Event('change'));});await ready(330);
 await page.click('#local-fork');await page.evaluate(()=>{if(!microcosmos2.paused)document.getElementById('local-pause').click();for(let i=0;i<110;i++)document.getElementById('local-step').click();});
 assert.equal(await page.evaluate(()=>microcosmos2.local.counts.challenge),1);assert.ok(await page.evaluate(()=>microcosmos2.local.assay.persisterOrigin>0));assert.equal(await page.locator('[data-assay-stop="440"]').isDisabled(),true);
 // Free-play assay supports real commands with correct availability and no decorative-only changes.
 await page.selectOption('#local-scenario','persistence');await page.click('#local-start');await page.evaluate(()=>{if(!microcosmos2.paused)document.getElementById('local-pause').click();});
 await page.click('[data-local-action="challenge"]');assert.equal(await page.evaluate(()=>microcosmos2.local.bath),1);assert.equal(await page.locator('[data-local-action="challenge"]').isDisabled(),true);
 await page.click('[data-local-action="washout"]');assert.equal(await page.evaluate(()=>microcosmos2.local.bath),0);
 console.log('Staged assay, computed cohorts, narrator, graph restore, notes, engine validation, GL recovery, mobile and fork: PASS');
 const offline=await browser.newPage({viewport:{width:1000,height:800},reducedMotion:'reduce'}),requests=[];offline.on('pageerror',e=>errors.push(e.message));offline.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});await offline.route(/^https?:/,r=>r.abort());
 await offline.goto(pathToFileURL(resolve('standalone.html')).href);await offline.waitForFunction(()=>microcosmos2?.available);await offline.click('[data-study="persistence"]');await offline.check('[name="prediction"][value="1"]');await offline.click('#study-form button');await offline.click('#learning-finish');await offline.waitForFunction(()=>!microcosmos2.replayBusy&&microcosmos2.local.tick===440);assert.equal(await offline.evaluate(()=>microcosmos2.local.counts.challenge),2);assert.deepEqual(requests,[]);await offline.close();
 assert.deepEqual(errors,[]);await writeFile('docs/benchmarks/persistence-validation.json',JSON.stringify({testedAt:new Date().toISOString(),browser:browser.version(),softwareRenderer:true,stages,errors},null,2)+'\n');console.log('Standalone persistence module, no remote requests or JS errors: PASS');
}finally{await browser.close();}
