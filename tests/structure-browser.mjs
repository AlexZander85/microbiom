import{chromium}from'playwright';import chrome from'@sparticuz/chromium';import assert from'node:assert/strict';
import{writeFile}from'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:await chrome.executablePath(),args:[...chrome.args.filter(a=>!a.startsWith('--use-')&&!['--single-process','--in-process-gpu','--disable-web-security','--allow-running-insecure-content'].includes(a)),'--disable-gpu']});
const errors=[],page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:8000');await page.waitForFunction(()=>microcosmos2?.available);
 await page.click('#dive');await page.waitForFunction(()=>microcosmos2.depth>2.5);await page.click('#pause');await page.click('#thoughts');
 const before=await page.evaluate(()=>microcosmos2.snapshot());
 const picked=await page.evaluate(()=>{for(let i=0;i<300;i++){const p=microcosmos2.projectAgent(i).screen;if(!p||p.z>1||p.x<0||p.y<0||p.x>innerWidth)continue;const hit=microcosmos2.pickAt(p.x,p.y);if(hit?.agent!==undefined)return hit;}return null;});
 assert.equal(picked?.via,'triangle');console.log('Main route uses triangle picking, not narration/proxy: PASS');
 await page.click('#explode');await page.locator('[data-layer="0"]').focus();await page.waitForFunction(()=>microcosmos2.highlightedLayer===0);
 await page.waitForTimeout(350);const highlighted=await page.locator('#universe').screenshot();
 await page.locator('#viewport').focus();await page.waitForFunction(()=>microcosmos2.highlightedLayer===-1);await page.waitForTimeout(350);const normal=await page.locator('#universe').screenshot();
 assert.notDeepEqual(highlighted,normal);assert.deepEqual(await page.evaluate(()=>microcosmos2.snapshot()),before);
 await page.locator('[data-layer="1"]').click();assert.match(await page.locator('#explain-copy').textContent(),/внутренней слизи/);
 await page.click('#pick-layers');assert.equal(await page.evaluate(()=>microcosmos2.layerMode),true);await page.click('#pick-layers');
 console.log('Layer keyboard focus visibly changes canvas, explanation, no biological change: PASS');
 for(const [id,group,part] of [['coli','Бактерии','outer'],['meth','Археи','wall'],['cand','Грибы','vacuole'],['blast','Протисты','nucleus'],['phage','Вирусы','capsid']]){
  await page.click('#atlas');await page.locator(`[data-card="${id}"]`).click();await page.click('#inspect-from-atlas');
  await page.waitForFunction(id=>microcosmos2.structure?.id===id,id);assert.equal(await page.evaluate(()=>microcosmos2.structure.group),group);
  await page.locator(`[data-part="${part}"]`).focus();await page.waitForFunction(part=>microcosmos2.highlightedPart===part,part);
  assert.match(await page.locator('#explain-copy').textContent(),/учебная схема/);
  await page.locator('#viewport').focus();await page.locator('#viewport').scrollIntoViewIfNeeded();await page.waitForTimeout(350);
  if(id==='cand')await page.screenshot({path:'docs/screenshots/08-cell-structure.png',fullPage:true});
  await page.locator('#viewport').focus();await page.keyboard.press('Space');await page.keyboard.press('Space');
  await page.click('#to-human');assert.equal(await page.locator('[data-part]').count(),0);
 }
 await page.click('#atlas');await page.locator('[data-card="cand"]').click();await page.click('#inspect-from-atlas');await page.locator('[data-species="faec"]').click();assert.equal(await page.evaluate(()=>microcosmos2.inspect),false);assert.equal(await page.locator('[data-part]').count(),0);
 console.log('Five biological groups + structure controls + reversible inspector: PASS');
 // Controlled production World, with the real terrain and uploaded Float32 instances.
 const fixture=await page.evaluate(async()=>{
  const [{World},{Model},{heightAt}]=await Promise.all([import('/src/webgl2/world.js'),import('/src/model.js'),import('/src/webgl2/geometry.js')]);
  const canvases=[0,1].map(()=>{const c=document.createElement('canvas');c.style.cssText='position:fixed;left:-1000px;width:400px;height:400px';document.body.append(c);return c;});
  const world=new World(...canvases,new Model());world.calm=true;world.travel.x=2.55;world.goal=2.55;world.thoughts=false;world.cloud.count=1;world.selected=0;
  world.cloud.x[0]=0;world.cloud.z[0]=0;world.cloud.y[0]=heightAt('colon',0,0)+3;
  world.render();const front=world.pickRay({origin:[0,25,0],dir:[0,-1,0]});
  world.cloud.y[0]=heightAt('colon',0,0)-5;world.render();const behind=world.pickRay({origin:[0,25,0],dir:[0,-1,0]});
  world.gpu.gl.getExtension('WEBGL_lose_context')?.loseContext();canvases.forEach(c=>c.remove());return {front,behind};
 });
 assert.equal(fixture.front?.kind,'agent');assert.equal(fixture.behind?.kind,'tissue');
 console.log('Actual production terrain blocks the behind-tissue cell: PASS');
 await page.setViewportSize({width:390,height:844});await page.click('#atlas');await page.locator('[data-card="blast"]').click();await page.click('#inspect-from-atlas');await page.waitForTimeout(350);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await page.locator('[data-part]').count(),4);
 assert.deepEqual(errors,[]);
 await writeFile('docs/benchmarks/structure-validation.json',JSON.stringify({testedAt:new Date().toISOString(),browser:browser.version(),mainPick:picked,productionFixture:fixture,groups:5,mobileWidth:390,errors},null,2)+'\n');
 console.log('390px structure controls + no JS errors: PASS');
}finally{await browser.close();}
