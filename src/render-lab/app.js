import {createFixture,cameraFrame} from './fixture.js';
import {NativeAdapter} from './native-adapter.js';
import {ThreeAdapter} from './three-adapter.js';
import {rayFromCamera} from '../webgl2/math.js';
import {byId} from '../data.js';

const $=id=>document.getElementById(id),canvas=$('scene');
const engine=new URLSearchParams(location.search).get('renderer')==='native'?'native':'three';
for(const name of ['native','three']) {
 $(name+'-link').href=location.pathname+'?renderer='+name;
 $(name+'-link').classList.toggle('active',name===engine);
 $(name+'-link').setAttribute('aria-current',name===engine?'page':'false');
}
try { initialize(); } catch(error) {
 $('error').hidden=false;$('error').textContent='Не удалось запустить WebGL2: '+error.message;
 window.rendererLab={available:false,error:error.message};
}
function initialize() {
 const fixture=createFixture(),adapter=engine==='three'?new ThreeAdapter(canvas,fixture):new NativeAdapter(canvas,fixture);
 const gl=adapter.gl,ext=gl.getExtension('WEBGL_debug_renderer_info');
 const renderer=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
 let yaw=.2,pitch=.46,distance=29.5,highlight=-1,frame,drag=null,lastUI=0,lastTime=null,frames=0;
 let sampling=null,lastResult=null,lost=false,disposed=false,raf;
 const dimensions=()=>[Math.round(canvas.clientWidth),Math.round(canvas.clientHeight)];
 const state=()=>({engine,threeVersion:'0.186.1',signature:fixture.signature,count:fixture.cloud.count,
  viewport:dimensions(),dpr:1,camera:{yaw,pitch,distance},showMucus:$('mucus').checked,
  highlight,renderer,webglVersion:gl.getParameter(gl.VERSION),...adapter.stats});
 const options=()=>({showMucus:$('mucus').checked,highlight});
 function draw() {const [w,h]=dimensions();frame=cameraFrame(w,h,yaw,pitch,distance);adapter.render(frame,w,h,options());frames++;}
 function unlock(){for(const el of document.querySelectorAll('button,input'))el.disabled=false;$('export').disabled=!lastResult;}
 function finishSample(error) {
  const sample=sampling;sampling=null;
  if(error){unlock();sample.reject(new Error(error));return;}
  const times=sample.times,sorted=[...times].sort((a,b)=>a-b),submit=[...sample.submit].sort((a,b)=>a-b);
  lastResult={...state(),method:'requestAnimationFrame, shared frozen fixture, no GPU finish',
   elapsedMs:times.reduce((a,b)=>a+b,0),frames:times.length,
   meanFPS:1000/(times.reduce((a,b)=>a+b,0)/times.length),medianMs:sorted[Math.floor(sorted.length*.5)],
   p95Ms:sorted[Math.floor(sorted.length*.95)],submitMedianMs:submit[Math.floor(submit.length*.5)],
   caveat:'Submission time includes possible driver stalls; it is not an isolated GPU timing.'};
  $('result').textContent=JSON.stringify(lastResult,null,2);unlock();sample.resolve(lastResult);
 }
 function loop(now) {
  if(disposed)return;
  raf=requestAnimationFrame(loop);
  if(document.hidden||lost){lastTime=null;return;}
  if(sampling&&dimensions().join('x')!==sampling.dimensions){finishSample('Размер сцены изменился во время замера.');}
  const start=performance.now();draw();const submit=performance.now()-start;
  if(sampling&&lastTime!==null){sampling.times.push(now-lastTime);sampling.submit.push(submit);if(now-sampling.started>=sampling.ms)finishSample();}
  lastTime=now;
  if(now-lastUI>750){const s=state();$('stats').textContent=`${s.count.toLocaleString('ru')} представителей · ${s.calls} draw calls · ${s.triangles.toLocaleString('ru')} треугольников · ${s.viewport.join(' × ')} px`;
   $('badge').textContent=engine==='three'?'THREE.JS / WEBGL2':'NATIVE WEBGL2';lastUI=now;}
 }
 function benchmark(ms=10000) {
  if(sampling)return Promise.reject(new Error('Замер уже идёт.'));
  if(document.hidden||lost)return Promise.reject(new Error('Вкладка должна быть видимой, а WebGL-контекст — активным.'));
  if(!Number.isFinite(ms)||ms<500||ms>120000)return Promise.reject(new Error('Длительность должна быть от 500 до 120000 мс.'));
  highlight=-1;
  for(const el of document.querySelectorAll('button,input'))el.disabled=true;
  $('result').textContent='Измеряем. Не меняйте размер окна и не переключайте вкладку…';
  lastTime=null;
  return new Promise((resolve,reject)=>{sampling={started:performance.now(),ms,times:[],submit:[],dimensions:dimensions().join('x'),resolve,reject};});
 }
 function pick(x,y,override={}) {
  if(!adapter.pick)return {unavailable:true};
  return adapter.pick(rayFromCamera(x,y,canvas.clientWidth,canvas.clientHeight,frame.eye,frame.target,.72),
   {blockMucus:$('block').checked,layersOnly:$('layers').checked,...override});
 }
 function select(x,y) {
  const hit=pick(x,y);
  if(hit?.unavailable){$('selection').textContent='Этот прототип не дорабатывает picking старого движка. Для теста треугольников и окклюзии переключитесь на Three.js.';return;}
  if(!hit){$('selection').textContent='Луч не пересёк выбираемые меши.';return;}
  if(hit.kind==='microbe'){
   const species=byId[fixture.cloud.ids[fixture.cloud.species[hit.id]]];
   $('selection').textContent=`#${hit.id} · ${species.name} · ${species.latin}. Пересечение треугольника экземпляра, расстояние ${hit.distance.toFixed(2)} усл. ед.`;
  }else $('selection').textContent=`${hit.name}: пересечение поверхности. ${hit.kind==='tissue'?'Ткань не позволяет выбрать жителя за ней.':'Прозрачная слизь учитывается согласно выбранной политике.'}`;
 }
 canvas.addEventListener('pointerdown',e=>{if(sampling||e.button!==0)return;canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,yaw,pitch,moved:false};});
 canvas.addEventListener('pointermove',e=>{if(!drag||sampling)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved ||=Math.hypot(dx,dy)>4;if(drag.moved){yaw=drag.yaw-dx*.008;pitch=Math.max(-1.3,Math.min(1.3,drag.pitch+dy*.004));}});
 canvas.addEventListener('pointerup',e=>{if(drag&&!drag.moved){const r=canvas.getBoundingClientRect();select(e.clientX-r.left,e.clientY-r.top);}drag=null;});
 canvas.addEventListener('pointercancel',()=>drag=null);
 canvas.addEventListener('wheel',e=>{e.preventDefault();if(!sampling)distance=Math.max(6,Math.min(80,distance+e.deltaY*.025));},{passive:false});
 canvas.addEventListener('keydown',e=>{if(sampling)return;const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='];if(!keys.includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')yaw-=.12;if(e.key==='ArrowRight')yaw+=.12;if(e.key==='ArrowUp')pitch=Math.max(-1.3,pitch-.08);if(e.key==='ArrowDown')pitch=Math.min(1.3,pitch+.08);if(e.key==='+'||e.key==='=')distance=Math.max(6,distance-2);if(e.key==='-')distance=Math.min(80,distance+2);});
 $('reset').onclick=()=>{yaw=.2;pitch=.46;distance=29.5;highlight=-1;};
 for(const b of document.querySelectorAll('[data-layer]')){
  const enter=()=>{if(!sampling)highlight=+b.dataset.layer;},leave=()=>{if(!sampling)highlight=-1;};
  b.onpointerenter=enter;b.onpointerleave=leave;b.onfocus=enter;b.onblur=leave;
 }
 $('benchmark').onclick=()=>benchmark().catch(e=>$('result').textContent=e.message);
 $('export').onclick=()=>{if(!lastResult)return;const url=URL.createObjectURL(new Blob([JSON.stringify(lastResult,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`renderer-lab-${engine}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 document.addEventListener('visibilitychange',()=>{lastTime=null;if(document.hidden&&sampling)finishSample('Замер отменён: вкладка скрыта.');});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;if(sampling)finishSample('Замер отменён: потерян графический контекст.');$('error').hidden=false;$('error').textContent='Контекст потерян. Для чистого повторного измерения перезагрузите страницу.';});
 canvas.addEventListener('webglcontextrestored',()=>{$('error').textContent='Контекст восстановлен. Перезагрузите прототип перед повторным замером.';});
 $('signature').textContent='Данные: '+fixture.signature;
 draw();raf=requestAnimationFrame(loop);
 window.rendererLab={available:true,state,snapshot:()=>fixture.model.snapshot(),benchmark,pick,
  get frames(){return frames;},get lost(){return lost;},
  setCamera(next){if(sampling)throw new Error('Камера заблокирована во время замера.');
   if(next.yaw!==undefined)yaw=next.yaw;if(next.pitch!==undefined)pitch=next.pitch;if(next.distance!==undefined)distance=next.distance;draw();},
  pixels(){draw();const data=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,data);return Array.from(data);},
  dispose(){if(sampling)finishSample('Прототип остановлен.');disposed=true;cancelAnimationFrame(raf);adapter.dispose();}};
}
