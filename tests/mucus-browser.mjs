import {chromium} from 'playwright';
import chrome from '@sparticuz/chromium';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const browser=await chromium.launch({headless:true,executablePath:await chrome.executablePath(),args:[...chrome.args.filter(a=>!a.startsWith('--use-')&&!['--single-process','--in-process-gpu','--disable-web-security','--allow-running-insecure-content'].includes(a)),'--disable-gpu']});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[],stages={};page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));
const ready=t=>page.waitForFunction(t=>!microcosmos2.replayBusy&&microcosmos2.local?.tick===t,t);
const pause=()=>page.evaluate(()=>{if(!microcosmos2.paused)document.getElementById('local-pause').click();});
const start=async()=>{await page.click('[data-study="mucus"]');await page.check('[name="prediction"][value="1"]');await page.click('#study-form button');};
try{
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:8000');await page.waitForFunction(()=>microcosmos2?.available);assert.equal(await page.locator('[data-study]').count(),5);await start();
 assert.equal(await page.locator('#mucus-panel').isVisible(),true);assert.equal(await page.locator('#persistence-panel').isVisible(),false);
 assert.equal(await page.locator('[data-local-action="breach"]').isVisible(),false);assert.equal(await page.locator('[data-local-action="substrate_on"]').isDisabled(),true);
 const aggregate=await page.evaluate(()=>microcosmos2.snapshot());
 for(const tick of [90,360,720]){
  await page.click(`[data-mucus-stop="${tick}"]`);await ready(tick);assert.equal(await page.evaluate(()=>microcosmos2.paused),true);
  stages[tick]=await page.evaluate(()=>({b:microcosmos2.local.mucus,a:microcosmos2.localControl.mucus}));
  if(tick===360){
   await page.click('#mucus-scene');await page.waitForFunction(()=>microcosmos2.depth===2.2&&microcosmos2.mucusFilm?.tick===360);
   assert.ok(await page.evaluate(()=>microcosmos2.mucusFilm.minInnerHeight<.5));
   await page.evaluate(()=>document.activeElement?.blur());await page.locator('#expedition').screenshot({path:'docs/screenshots/15-mucus-depletion-3d.png'});
  }
 }
 assert.equal(stages[90].b.substrate,false);assert.equal(stages[360].b.substrate,true);assert.equal(stages[360].b.thinPatches,12);assert.ok(stages[360].b.minInner<.2);assert.ok(stages[720].b.minInner>.9);assert.equal(stages[720].b.thinPatches,0);
 assert.ok(stages[720].a.outerUsed>0);assert.equal(stages[720].a.innerUsed,0);
 assert.deepEqual(await page.evaluate(()=>microcosmos2.snapshot()),aggregate);assert.equal(await page.locator('#mucus-checkpoints tr').count(),3);
 assert.equal(await page.inputValue('#learning-metric'),'mucusMinimum');assert.match(await page.locator('#learning-chart svg').getAttribute('aria-label'),/минимальный запас/);
 await page.click('#mucus-panel details summary');assert.match(await page.locator('#mucus-budget').textContent(),/Погрешность баланса/);
 const recoverySeq=await page.evaluate(()=>microcosmos2.localEvents.find(e=>e.kind==='mucus_recover').seq);await page.click('#local-history');await page.click(`[data-history-event="${recoverySeq}"]`);assert.match(await page.locator('#narrator-rule').textContent(),/не медицинская норма/);
 await page.click('#learning-report');assert.match(await page.locator('#dialog-content').textContent(),/не процент здоровья/);await page.fill('#study-reflection','В контроле тоже используют слизь. Важен баланс, а не ярлык вида.');
 const [download]=await Promise.all([page.waitForEvent('download'),page.click('#report-save')]);const record=JSON.parse(await readFile(await download.path(),'utf8'));assert.equal(record.engine,'local-0.8.0');await page.click('#report-back');
 const full=await page.evaluate(()=>microcosmos2.learning.samples);
 await page.evaluate(()=>document.activeElement?.blur());await page.locator('#mucus-panel').screenshot({path:'docs/screenshots/16-mucus-recovery.png'});
 await page.click('[data-mucus-stop="360"]');await ready(360);assert.equal(await page.locator('#mucus-checkpoints tr').last().locator('td').last().textContent(),'ещё не рассчитан');
 await page.click('#learning-finish');await ready(720);assert.deepEqual(await page.evaluate(()=>microcosmos2.learning.samples),full);
 await page.setInputFiles('#local-load',{name:'mucus.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(record))});await ready(720);assert.deepEqual(await page.evaluate(()=>microcosmos2.localRecord()),record);
 const bad={...record,engine:'local-0.7.0'};await page.setInputFiles('#local-load',{name:'wrong-engine.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});await page.waitForFunction(()=>document.getElementById('explain-title').textContent==='Запись не загружена');assert.deepEqual(await page.evaluate(()=>microcosmos2.localRecord()),record);
 await page.click('#mucus-scene');await page.waitForFunction(()=>microcosmos2.mucusFilm?.tick===720);const film=await page.evaluate(()=>microcosmos2.mucusFilm);
 await page.evaluate(()=>{window.ext=document.querySelector('#universe').getContext('webgl2').getExtension('WEBGL_lose_context');ext.loseContext();});await page.waitForFunction(()=>microcosmos2.lost);await page.evaluate(()=>ext.restoreContext());await page.waitForFunction(()=>!microcosmos2.lost&&microcosmos2.mucusFilm?.tick===720);assert.deepEqual(await page.evaluate(()=>microcosmos2.localRecord()),record);assert.deepEqual(await page.evaluate(()=>microcosmos2.mucusFilm),film);
 await page.setViewportSize({width:390,height:844});await page.locator('#mucus-panel').scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.evaluate(()=>document.activeElement?.blur());await page.locator('#mucus-panel').screenshot({path:'docs/screenshots/17-mucus-mobile.png'});
 // Starting from a depleted record must not apply its future restoration command.
 await page.locator('#local-seek').evaluate(el=>{el.value='220';el.dispatchEvent(new Event('change'));});await ready(220);
 await page.click('#local-fork');await pause();await page.evaluate(()=>{for(let i=0;i<180;i++)document.getElementById('local-step').click();});
 assert.equal(await page.evaluate(()=>microcosmos2.local.mucus.substrate),false);assert.equal(await page.evaluate(()=>microcosmos2.localRecord().commands.length),1);assert.equal(await page.locator('[data-mucus-stop="720"]').isDisabled(),true);
 // In free play, secretion and substrate supply are independent interventions.
 await page.selectOption('#local-scenario','mucus');await page.click('#local-start');await pause();
 await page.click('[data-local-action="secretion_slow"]');assert.equal(await page.evaluate(()=>microcosmos2.local.mucus.secretionScale),.25);assert.equal(await page.evaluate(()=>microcosmos2.local.mucus.substrate),true);assert.equal(await page.locator('[data-local-action="secretion_slow"]').isDisabled(),true);
 await page.click('[data-local-action="secretion_restore"]');assert.equal(await page.evaluate(()=>microcosmos2.local.mucus.secretionScale),1);
 const initial=await page.evaluate(()=>microcosmos2.local.mucus.inner);await page.click('[data-local-action="substrate_off"]');assert.equal(await page.evaluate(()=>microcosmos2.local.mucus.inner),initial);assert.equal(await page.locator('[data-local-action="substrate_off"]').isDisabled(),true);
 await page.click('[data-local-action="substrate_on"]');assert.equal(await page.evaluate(()=>microcosmos2.local.mucus.substrate),true);
 console.log('Mucus stages, independent control, actual 3D film, narrator, material budget, graph rewind, notes, validation, GL recovery, mobile and fork: PASS');
 await page.close();
 const offline=await browser.newPage({viewport:{width:1000,height:800},reducedMotion:'reduce'}),requests=[];offline.setDefaultTimeout(45000);offline.on('pageerror',e=>errors.push(e.message));offline.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});await offline.route(/^https?:/,r=>r.abort());
 await offline.goto(pathToFileURL(resolve('standalone.html')).href);await offline.waitForFunction(()=>microcosmos2?.available);await offline.click('[data-study="mucus"]');await offline.check('[name="prediction"][value="1"]');await offline.click('#study-form button');await offline.click('#learning-finish');await offline.waitForFunction(()=>!microcosmos2.replayBusy&&microcosmos2.local.tick===720);assert.equal(await offline.evaluate(()=>microcosmos2.local.counts.mucus_recover),12);assert.deepEqual(requests,[]);await offline.close();
 assert.deepEqual(errors,[]);await writeFile('docs/benchmarks/mucus-validation.json',JSON.stringify({testedAt:new Date().toISOString(),browser:browser.version(),softwareRenderer:true,stages,film,errors},null,2)+'\n');console.log('Standalone mucus module, no remote requests or JS errors: PASS');
}finally{await browser.close();}
