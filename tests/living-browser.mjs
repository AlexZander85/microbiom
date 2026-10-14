import{chromium}from'playwright';import chrome from'@sparticuz/chromium';import assert from'node:assert/strict';import{writeFile}from'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:await chrome.executablePath(),args:[...chrome.args.filter(a=>!a.startsWith('--use-')&&!['--single-process','--in-process-gpu','--disable-web-security','--allow-running-insecure-content'].includes(a)),'--disable-gpu']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'no-preference'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.TEST_URL||'http://127.0.0.1:8000');await page.waitForFunction(()=>microcosmos2?.available);
 await page.screenshot({path:'docs/screenshots/05-living-human.png'});
 await page.click('#dive');await page.waitForFunction(()=>microcosmos2.depth>2.549);const start=await page.evaluate(()=>({time:microcosmos2.visualTime,pos:microcosmos2.projectAgent(0).position}));
 await page.waitForFunction(t=>microcosmos2.visualTime>t+3,start.time);
 const live=await page.evaluate(()=>({time:microcosmos2.visualTime,pos:microcosmos2.projectAgent(0).position,events:microcosmos2.lifeEvents.length,stats:microcosmos2.stats,quality:microcosmos2.quality}));
 const displacement=Math.hypot(...live.pos.map((v,i)=>v-start.pos[i]));assert.ok(displacement>.5);assert.ok(live.events>0);assert.ok(live.stats.triangles<150000);
 await page.waitForFunction(()=>microcosmos2.bubbles.length>0);await page.screenshot({path:'docs/screenshots/06-living-community.png'});
 await page.click('#pause');const frozen=await page.evaluate(()=>({time:microcosmos2.visualTime,pos:microcosmos2.projectAgent(0).position,snapshot:microcosmos2.snapshot()}));
 await page.selectOption('#life-rate','4');await page.selectOption('#quality','detail');await page.waitForTimeout(300);
 assert.deepEqual(await page.evaluate(()=>({time:microcosmos2.visualTime,pos:microcosmos2.projectAgent(0).position,snapshot:microcosmos2.snapshot()})),frozen);
 await page.locator('#viewport').scrollIntoViewIfNeeded();const bubble=await page.evaluate(()=>{const b=microcosmos2.bubbles[0],r=document.querySelector('#universe').getBoundingClientRect();return b?{id:b.id,x:b.x+b.w/2+r.left,y:b.y+b.h/2+r.top}:null;});assert.ok(bubble);
 await page.mouse.click(bubble.x,bubble.y);assert.equal(await page.evaluate(()=>microcosmos2.selected),bubble.id);
 await page.click('#thoughts');await page.waitForFunction(()=>microcosmos2.bubbles.length===0);await page.click('#thoughts');await page.waitForFunction(()=>microcosmos2.bubbles.length>0);
 await page.selectOption('#quality','eco');await page.selectOption('#life-rate','1');await page.click('#pause');await page.waitForFunction(t=>microcosmos2.visualTime>t+1,frozen.time);
 await page.click('#calm');const calm=await page.evaluate(()=>({time:microcosmos2.visualTime,pos:microcosmos2.projectAgent(0).position}));await page.waitForTimeout(500);assert.deepEqual(await page.evaluate(()=>({time:microcosmos2.visualTime,pos:microcosmos2.projectAgent(0).position})),calm);
 // Measure actual default motion with the current profile, not the old static renderer lab.
 await page.click('#calm');await page.selectOption('#quality','auto');await page.locator('#viewport').scrollIntoViewIfNeeded();
 const performance=await page.evaluate(()=>new Promise(resolve=>{let first=null,last=null,dt=[];function f(t){if(first===null)first=t;if(last!==null)dt.push(t-last);last=t;if(t-first<8000)requestAnimationFrame(f);else{dt.sort((a,b)=>a-b);const gl=document.querySelector('#universe').getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');resolve({fps:1000/(dt.reduce((a,b)=>a+b)/dt.length),medianMs:dt[Math.floor(dt.length/2)],p95Ms:dt[Math.floor(dt.length*.95)],frames:dt.length,stats:microcosmos2.stats,quality:microcosmos2.quality,renderer:gl.getParameter(e.UNMASKED_RENDERER_WEBGL)});}}requestAnimationFrame(f);}));
 await page.setViewportSize({width:390,height:844});await page.click('#to-human');await page.click('#dive');await page.waitForFunction(()=>microcosmos2.depth>2.54);await page.waitForFunction(()=>microcosmos2.bubbles.length>0);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'docs/screenshots/07-living-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
 await writeFile('docs/benchmarks/living-world.json',JSON.stringify({testedAt:new Date().toISOString(),viewport:[1440,1000],browser:browser.version(),displacementInThreeVisualSeconds:displacement,live,performance,errors},null,2)+'\n');
 console.log('Real travel, exchanges, clickable narration, pause, independent rate/quality, reduced motion, mobile: PASS');console.log(performance);
}finally{await browser.close();}
