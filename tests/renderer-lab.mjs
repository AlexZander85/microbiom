// Sequential paired trials; only one active renderer, no concurrent benchmark tabs.
import {chromium} from 'playwright';
import chrome from '@sparticuz/chromium';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const base=process.env.TEST_URL||'http://127.0.0.1:8000';
const args=process.env.CHROME_EXECUTABLE?[]:[...chrome.args.filter(a=>!a.startsWith('--use-')&&!['--single-process','--in-process-gpu','--disable-web-security','--allow-running-insecure-content'].includes(a)),'--disable-gpu'];
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||await chrome.executablePath(),headless:true,args});
const errors=[],trials=[],requests=[],offlineRequests=[];let offline=false;
const page=await browser.newPage({viewport:{width:1100,height:900},deviceScaleFactor:1});
page.setDefaultTimeout(60000);
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('request',r=>{if(offline&&/^https?:/.test(r.url()))offlineRequests.push(r.url());if(/^https?:/.test(r.url())&&!r.url().startsWith(base+'/'))requests.push(r.url());});
const load=async engine=>{await page.goto(base+'/renderer-lab.html?renderer='+engine);await page.waitForFunction(()=>window.rendererLab?.available);};
const ms=Number(process.env.BENCH_MS)||10000;
try{
 const pixels={};let snapshot,reference;
 for(const engine of ['native','three']){
  await load(engine);await page.waitForFunction(()=>rendererLab.frames>=3);
  const state=await page.evaluate(()=>rendererLab.state());
  assert.equal(state.count,3600);assert.equal(state.calls,9);assert.equal(state.triangles,635672);
  const model=await page.evaluate(()=>rendererLab.snapshot());
  if(snapshot)assert.deepEqual(model,snapshot);else snapshot=model;
  if(reference)for(const key of ['signature','count','viewport','dpr','camera','showMucus','calls','triangles','instances'])assert.deepEqual(state[key],reference[key]);else reference=state;
  pixels[engine]=await page.evaluate(()=>rendererLab.pixels());
 }
 let total=0,max=0,changed=0;
 assert.equal(pixels.native.length,pixels.three.length);
 for(let i=0;i<pixels.native.length;i++){const d=Math.abs(pixels.native[i]-pixels.three[i]);total+=d;max=Math.max(max,d);if(d)changed++;}
 const pixelComparison={channels:pixels.native.length,changedChannels:changed,meanAbsoluteError:total/pixels.native.length,maxError:max};
 console.log('Pixel diagnostics',pixelComparison);assert.ok(pixelComparison.meanAbsoluteError<.5,'Pixel equivalence tolerance: <0.5 / 255 average channel error');
 console.log('Shared buffers, draw calls, triangles, snapshot and pixel parity: PASS',pixelComparison);
 const selected=await page.evaluate(()=>{for(let y=120;y<450;y+=35)for(let x=150;x<850;x+=45){const hit=rendererLab.pick(x,y);if(hit?.kind==='microbe')return {x,y,id:hit.id};}return null;});
 assert.ok(selected,'At least one visible cell must be selectable');
 const box=await page.locator('#scene').boundingBox();await page.mouse.click(box.x+selected.x,box.y+selected.y);
 assert.match(await page.locator('#selection').textContent(),new RegExp('#'+selected.id+' '));
 const before=await page.evaluate(()=>rendererLab.snapshot());await page.locator('[data-layer="1"]').focus();
 assert.equal(await page.evaluate(()=>rendererLab.state().highlight),1);
 await page.locator('#reset').click();await page.mouse.move(0,0);
 assert.equal(await page.evaluate(()=>rendererLab.state().highlight),-1);
 await page.uncheck('#mucus');await page.waitForFunction(()=>rendererLab.state().calls===7);
 await page.check('#mucus');await page.waitForFunction(()=>rendererLab.state().calls===9);
 assert.deepEqual(await page.evaluate(()=>rendererLab.snapshot()),before);
 console.log('Real cell click, layer focus, mucus toggle, invariant biological snapshot: PASS');
 // Balanced order, warm up each new context, measure all frames without trimming outliers.
 for(const [i,engine] of (process.env.SKIP_BENCH?[]:['native','three','three','native','native','three']).entries()){
  await load(engine);await page.waitForFunction(()=>rendererLab.frames>=10);
  const result=await page.evaluate(ms=>rendererLab.benchmark(ms),ms);
  assert.equal(result.highlight,-1);assert.deepEqual(result.camera,reference.camera);
  assert.equal(result.showMucus,true);assert.ok(result.frames>0);
  assert.deepEqual(await page.evaluate(()=>rendererLab.snapshot()),snapshot);
  trials.push({trial:i+1,...result});console.log(`Trial ${i+1} ${engine}: ${result.meanFPS.toFixed(2)} FPS, p95 ${result.p95Ms.toFixed(1)} ms`);
 }
 await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>rendererLab.state().viewport[0]<390);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('#scene').focus();const yaw=await page.evaluate(()=>rendererLab.state().camera.yaw);await page.keyboard.press('ArrowRight');assert.ok(await page.evaluate(()=>rendererLab.state().camera.yaw)>yaw);
 console.log('Mobile layout and keyboard camera: PASS');
 // Sequential offline checks for both backends. Block HTTP before navigation.
 offline=true;await page.route(/^https?:/,r=>r.abort());
 for(const engine of ['three','native']){
  await page.goto(pathToFileURL(resolve('renderer-lab-standalone.html')).href+'?renderer='+engine);
  await page.waitForFunction(()=>window.rendererLab?.available);
  assert.equal(await page.evaluate(()=>rendererLab.state().engine),engine);
  assert.equal(await page.evaluate(()=>rendererLab.state().signature),reference.signature);
 }
 console.log('Both renderers file:// offline: PASS');
 // Loss cancels measurement instead of publishing invalid numbers.
 const cancellation=page.evaluate(async()=>{
  const pending=rendererLab.benchmark(10000).then(()=>false,()=>true);
  const gl=document.querySelector('canvas').getContext('webgl2');gl.getExtension('WEBGL_lose_context').loseContext();
  return pending;
 });assert.equal(await cancellation,true);
 // No-WebGL: the prototype explains failure instead of remaining blank.
 assert.deepEqual(offlineRequests,[]);offline=false;await page.unroute(/^https?:/);
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return kind==='webgl2'?null:original.call(this,kind,...args);};});
 await page.goto(base+'/renderer-lab.html?renderer=native');await page.waitForFunction(()=>window.rendererLab?.available===false);
 assert.equal(await page.locator('#error').isVisible(),true);
 assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);
 await mkdir('docs/benchmarks',{recursive:true});
 const summary={testedAt:new Date().toISOString(),browser:browser.version(),threeVersion:'0.186.1',
  method:'Frozen shared fixture; one active context; sequential AB/BA/AB; 10 warmup frames; canvas DPR 1; no culling; identical shaders; no gl.finish',
  durationPerTrialMs:ms,pixelComparison,trials,externalRequests:requests,offlineRequests,errors};
 if(trials.length)await writeFile('docs/benchmarks/renderer-comparison.json',JSON.stringify(summary,null,2)+'\n');
 console.log('Context loss cancellation, fallback and no errors/network dependencies: PASS');
}finally{await browser.close();}
