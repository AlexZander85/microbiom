import {chromium} from 'playwright';
import chrome from '@sparticuz/chromium';
import assert from 'node:assert/strict';
import {writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const browser=await chromium.launch({headless:true,executablePath:await chrome.executablePath(),args:[...chrome.args.filter(a=>!a.startsWith('--use-')&&!['--single-process','--in-process-gpu','--disable-web-security','--allow-running-insecure-content'].includes(a)),'--disable-gpu']});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[],results={};
page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
const ready=t=>page.waitForFunction(t=>!microcosmos2.replayBusy&&microcosmos2.local?.tick===t,t);
const start=async trial=>{await page.click('[data-study="axisLoop"]');await page.selectOption('#loop-trial',trial);await page.check('[name="prediction"][value="1"]');await page.click('#study-form button');};
try{
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:8000');await page.waitForFunction(()=>microcosmos2?.available);
 await page.click('#loop-entry');assert.equal(await page.locator('#loop-trial option').count(),9);await page.check('[name="prediction"][value="1"]');await page.click('#study-form button');
 await ready(200);assert.equal(await page.evaluate(()=>microcosmos2.paused),true);
 assert.ok(await page.locator('#loop-panel').isVisible());for(const id of ['axis-panel','relay-details','local-fields'])assert.equal(await page.locator('#'+id).isVisible(),false);
 await page.click('[data-loop-stop="700"]');await ready(700);
 const before=await page.evaluate(()=>({hash:microcosmos2.localRecord().checksum,samples:microcosmos2.learning.samples}));
 for(const branch of ['neural','humoral','immune','feedback','source']){
  await page.click(`[data-loop-branch="${branch}"]`);assert.equal(await page.getAttribute(`[data-loop-branch="${branch}"]`,'aria-pressed'),'true');
  assert.doesNotMatch(await page.locator('#loop-detail-text').textContent(),/undefined/);assert.doesNotMatch(await page.locator('#learning-chart').innerHTML(),/NaN|Infinity/);
 }
 assert.equal(await page.evaluate(()=>microcosmos2.localRecord().checksum),before.hash);assert.deepEqual(await page.evaluate(()=>microcosmos2.learning.samples),before.samples);
 await page.locator('#loop-map').screenshot({path:'docs/screenshots/32-axis-loop-map.png'});
 await page.click('#loop-scene');await page.waitForFunction(()=>Math.abs(microcosmos2.depth-2.35)<.001);await page.locator('#expedition').screenshot({path:'docs/screenshots/33-axis-loop-scene.png'});
 assert.ok((await page.evaluate(()=>microcosmos2.stats)).drawCalls>10);
 await page.click('#learning-finish');await ready(1400);results.intact=await page.evaluate(()=>microcosmos2.local.axisLoop);assert.deepEqual(await page.evaluate(()=>microcosmos2.local),await page.evaluate(()=>microcosmos2.localControl));
 for(const option of await page.locator('#learning-metric option:not([hidden])').evaluateAll(els=>els.map(el=>el.value))){assert.ok(option.startsWith('loop'));await page.selectOption('#learning-metric',option);assert.doesNotMatch(await page.locator('#learning-chart').innerHTML(),/NaN|Infinity/);}
 await page.click('#learning-report');assert.match(await page.locator('#dialog-content').textContent(),/EP3/);assert.match(await page.locator('#dialog-content').textContent(),/мотор/);await page.fill('#study-reflection','Проверяю разные пути и обратную связь, а не настроение.');
 const [download]=await Promise.all([page.waitForEvent('download'),page.click('#report-save')]);const record=JSON.parse(await readFile(await download.path(),'utf8'));assert.equal(record.engine,'local-0.13.0');assert.equal(record.learning.loopTrial,'intact');await page.click('#report-back');
 const samples=await page.evaluate(()=>microcosmos2.learning.samples);
 await page.click('[data-loop-stop="200"]');await ready(200);await page.click('#learning-finish');await ready(1400);assert.deepEqual(await page.evaluate(()=>microcosmos2.learning.samples),samples);
 await page.setInputFiles('#local-load',{name:'loop.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(record))});await page.waitForFunction(()=>document.getElementById('local-load').value===''&&!microcosmos2.replayBusy);assert.deepEqual(await page.evaluate(()=>microcosmos2.localRecord()),record);
 await page.setInputFiles('#local-load',{name:'bad-loop.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...record,learning:{...record.learning,loopTrial:'bbb'}}))});await page.waitForFunction(()=>document.getElementById('explain-title').textContent==='Запись не загружена');assert.deepEqual(await page.evaluate(()=>microcosmos2.localRecord()),record);
 await page.click('[data-loop-stop="200"]');await ready(200);await page.click('[data-local-action="loop_metabolites"]');assert.equal(await page.evaluate(()=>microcosmos2.learning.meta.guided),false);assert.equal(await page.locator('[data-loop-stop="700"]').isDisabled(),true);assert.equal(await page.evaluate(()=>microcosmos2.local.axisLoop.input),18);
 for(const trial of ['source','neural','bbb','immune','feedback','barrier','rescue','recover']){
  await start(trial);await page.click('[data-loop-stop="700"]');await ready(700);const middle=await page.evaluate(()=>microcosmos2.local.axisLoop);await page.click('#learning-finish');await ready(1400);results[trial]=await page.evaluate(()=>microcosmos2.local.axisLoop);
  if(trial==='source'){assert.equal(middle.nts,0);assert.equal(middle.brainUsed,0);assert.ok(middle.cytokines>0);}
  if(trial==='bbb'){assert.ok(middle.acetateBlood>0);assert.equal(middle.acetateBrain,0);assert.equal(await page.getAttribute('#loop-gate-bbb','data-open'),'false');}
  if(trial==='immune'){assert.ok(middle.cytokines>0);assert.equal(middle.ep3,0);}
  if(trial==='feedback'){assert.equal(middle.emptying,1);assert.ok(middle.delivered>await page.evaluate(()=>microcosmos2.learning.samples.find(p=>p.tick===700).a.loopDelivered));}
  if(trial==='rescue'){assert.equal(middle.fermented,0);assert.ok(middle.brainUsed>0);assert.ok(middle.nts>0);assert.equal(middle.input,30);}
  if(trial==='recover'){assert.equal(middle.fermented,0);assert.ok(results[trial].fermented>0);}
 }
 await page.click('#learning-control');assert.match(await page.locator('#dialog-content').textContent(),/EP3/);await page.click('#compare-graphs');
 await page.setViewportSize({width:390,height:844});await page.locator('#loop-map').scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.click('[data-loop-branch="immune"]');await page.evaluate(()=>document.activeElement?.blur());await page.locator('#loop-map').screenshot({path:'docs/screenshots/34-axis-loop-mobile.png'});
 const state=await page.evaluate(()=>microcosmos2.localRecord());await page.evaluate(()=>{window.ext=document.querySelector('#universe').getContext('webgl2').getExtension('WEBGL_lose_context');ext.loseContext();});await page.waitForFunction(()=>microcosmos2.lost);await page.evaluate(()=>ext.restoreContext());await page.waitForFunction(()=>!microcosmos2.lost);assert.deepEqual(await page.evaluate(()=>microcosmos2.localRecord()),state);
 const off=await browser.newPage({viewport:{width:1100,height:900},reducedMotion:'reduce'}),requests=[];off.setDefaultTimeout(60000);off.on('pageerror',e=>errors.push(e.message));off.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});await off.route(/^https?:/,r=>r.abort());await off.goto(pathToFileURL(resolve('standalone.html')).href);await off.waitForFunction(()=>microcosmos2?.available);
 await off.click('#loop-entry');await off.selectOption('#loop-trial','feedback');await off.check('[name="prediction"][value="1"]');await off.click('#study-form button');await off.click('#learning-finish');await off.waitForFunction(()=>!microcosmos2.replayBusy&&microcosmos2.local?.tick===1400);assert.deepEqual(await off.evaluate(()=>microcosmos2.local.axisLoop),results.feedback);assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);
 await writeFile('docs/benchmarks/axis-loop-validation.json',JSON.stringify({testedAt:new Date().toISOString(),browser:browser.version(),softwareRenderer:true,results,errors,checks:['nine controls','automatic checkpoint pause','branch inspection observational','all 12 chart metrics','three-endpoint report','save/load exact','rewind rebuilds history','invalid metadata rejected atomically','manual fork and material entry','native WebGL2 diagram','mobile no horizontal overflow','context restoration','standalone file:// without HTTP']},null,2)+'\n');
 console.log('Closed gut–brain loop: nine controls, balances, charts, replay, mobile, WebGL2, offline PASS');
}catch(error){console.error('DEBUG',errors,await page.evaluate(()=>({local:microcosmos2.local,meta:microcosmos2.learning?.meta,explain:document.getElementById('explain-copy').textContent})).catch(()=>null));throw error;}finally{await browser.close();}
