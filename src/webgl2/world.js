import {FlightCamera,safeFlightStart} from './flight.js';
import {oralSurfaceGeometry,oralSurfaceHeight} from './oral-surface.js';
import {oralPlaque,oralPH} from '../local/oral.js';
import {filmGeometry,filmHeight} from './mucus-film.js';
import {GPU,STRIDE,writeInstance,colorOf} from './gpu.js';
import {sphere,capsule,revolve,combine,tube,catmull,torus,segment,surface,heightAt,microbeGeometry,lightMicrobeGeometry,mediumMicrobeGeometry,octahedron,splitPlane} from './geometry.js';
import {perspective,lookAt,multiply,project,rayFromCamera,quatFromY,mix,mix3,unit,vsub} from './math.js';
import {settle,smooth,burst} from '../../gl.mjs';
import {SITES} from '../data.js';
import {LOCAL_SPECIES as byId} from '../local/traits.js';
import {LocalCloud} from '../local/cloud-adapter.js';
import {rng,clamp} from '../model.js';
import {LivingCloud,liveColor} from './living.js';
import {humanGeometry} from './human.js';
import {pickRecords,intersectInstance} from './picking.js';
import {layerLayout,LAYER_COLORS} from './layers.js';
import {cellBlueprint} from './cell-blueprints.js';
export const ORGAN_POINTS={colon:[0,-.65,.35],mouth:[0,2.025,.28],skin:[-1.04,.28,.21],nose:[0,2.15,.37],lung:[.37,.94,.05],stomach:[.38,.03,.2],small:[0,-.54,.33],vagina:[0,-1.04,.22],urinary:[0,-.93,.28]};
const instance=(pos,scale,color,q=[0,0,0,1],alpha=1,glow=0)=>({pos,scale,color,q,alpha,glow});
export class World{
 constructor(canvas,overlay,model){this.flight=new FlightCamera();this.canvas=canvas;this.overlay=overlay;this.ctx=overlay.getContext('2d');this.model=model;this.gpu=new GPU(canvas);this.cloud=new LivingCloud(model);this.travel={x:0,v:0};this.goal=0;this.yaw={x:.12,v:0};this.pitch={x:.06,v:0};this.targetYaw=.12;this.targetPitch=.06;this.pan=[0,0,0];this.follow=false;this.focusPoint=[{x:0,v:0},{x:4,v:0},{x:0,v:0}];this.selected=-1;this.selectedSpecies=null;this.inspect=false;this.exploded=false;this.lifts=Array.from({length:5},()=>({x:0,v:0}));this.explodeElapsed=0;this.clock=0;this.calm=false;this.field=0;this.ratio=1.4;this.showConnections=false;this.bodyGroups=[];this.tissueGroups=[];this.dynamic={};this.resources=[];this.one=new Float32Array(STRIDE);this.speciesBuffers={};this.bodyLabels=[];this.lost=false;this.contextGeneration=0;this.gpu.vivid=1;this.lifeRate=1;this.thoughts=true;this.quality='auto';this.autoLow=false;this.bubbleHits=[];this.bubbleSlots=[];this.visibleAgents=[];this.lodStats={};this.pickTargets=[];this.layerHover=-1;this.layerMode=false;this.blockFluid=false;this.cellPart=null;
 this.initMeshes();this.buildBody();this.setSite();
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;});
 canvas.addEventListener('webglcontextrestored',()=>{try{this.gpu=new GPU(canvas);this.gpu.vivid=1;this.resources=[];this.bodyGroups=[];this.tissueGroups=[];this.dynamic={};this.initMeshes();this.buildBody();this.setSite();this.lost=false;this.contextGeneration++;}catch(e){this.restoreError=e.message;}});
 }
 initMeshes(){const g=this.gpu;this.ball=g.mesh(sphere(8,6));this.rod=g.mesh(capsule(8,8));this.ring=g.mesh(torus(1,.02,32));this.particle=g.mesh(sphere(6,4));this.microMeshes=Object.fromEntries(Object.entries(microbeGeometry()).map(([key,data])=>[key,g.mesh(data)]));this.lightMeshes=Object.fromEntries(Object.entries(lightMicrobeGeometry()).map(([key,data])=>[key,g.mesh(data)]));this.mediumMeshes=Object.fromEntries(Object.entries(mediumMicrobeGeometry()).map(([key,data])=>[key,g.mesh(data)]));this.mediumBuffers={};for(const key of Object.keys(this.mediumMeshes))this.mediumBuffers[key]=new Float32Array(8000*STRIDE);this.tissueCell=g.mesh(octahedron());this.smallRing=g.mesh(torus(1,.025,12));this.lightBuffers={};for(const key of Object.keys(this.lightMeshes))this.lightBuffers[key]=new Float32Array(8000*STRIDE);
 for(const key of Object.keys(this.microMeshes))this.speciesBuffers[key]=new Float32Array(8000*STRIDE);
 this.miscBuffer=new Float32Array(3000*STRIDE);this.particleBuffer=new Float32Array(4000*STRIDE);
 const cells={...microbeGeometry(),rod:capsule(24,20),oval:sphere(24,18)};
 this.cellCuts=Object.fromEntries(['rod','oval','branch','spiral'].map(key=>[key,g.mesh(splitPlane(cells[key],2,0)[1])]));
 this.cellOrganelle=g.mesh(sphere(18,14));
 this.cellFlagellum=g.mesh(tube(Array.from({length:40},(_,i)=>[Math.sin(i*.45)*.18,-i*.06,Math.cos(i*.45)*.18]),.025,6));
 this.cellShell=g.mesh(capsule(28,24));this.dna=g.mesh(tube(Array.from({length:90},(_,i)=>[Math.sin(i/89*Math.PI*2)*.55,-.7+1.4*i/89,Math.cos(i/89*Math.PI*2)*.55]),.035,6));this.plasmid=g.mesh(torus(.45,.035));this.spring=g.mesh(tube(Array.from({length:85},(_,i)=>[Math.cos(i/84*Math.PI*14)*.27,-1+i/84*2,Math.sin(i/84*Math.PI*14)*.27]),.04,6));
 }
 group(mesh,instances,extra={}){const data=new Float32Array(instances.length*STRIDE);instances.forEach((o,i)=>writeInstance(data,i,o.pos,o.scale,o.color,o.q,o.alpha??1,o.glow??0));const obj={mesh,count:instances.length,data,...extra};return obj;}
 custom(data){return this.gpu.mesh(data);}
 buildBody(){const anatomy=humanGeometry();this.bodyMesh=this.custom(anatomy.skin);this.skinGroup=this.group(this.bodyMesh,[instance([0,0,0],[1,1,1],'#ddaf92')]);this.windowGroup=this.group(this.custom(anatomy.window),[instance([0,0,0],[1,1,1],'#edc2a7')]);this.faceGroups=anatomy.features.map(f=>this.group(this.custom(f.mesh),[instance([0,0,0],[1,1,1],f.color)]));
 this.bodyGroups=[];const add=(mesh,inst,site=null)=>this.bodyGroups.push(this.group(mesh,inst,{site}));
 add(this.ball,[instance([-.37,.89,.005],[.3,.56,.24],'#6e9daa'),instance([.37,.89,.005],[.3,.56,.24],'#74abb3')],'lung');add(this.ball,[instance([.08,.66,.27],[.2,.26,.18],'#d08579')],'heart');
 add(this.ball,[instance([-.3,.12,.03],[.46,.23,.26],'#b08562')],'liver');add(this.ball,[instance([.35,.02,.19],[.25,.33,.22],'#d19b7d')],'stomach');
 const colonPath=catmull([[-.46,-1.05,.22],[-.62,-.72,.24],[-.65,-.23,.22],[-.54,-.12,.21],[0,-.14,.29],[.5,-.12,.2],[.65,-.29,.17],[.62,-.81,.19],[.35,-1.0,.2],[.02,-1.02,.25],[0,-1.25,.21]],8);add(this.custom(tube(colonPath,.105,14)),[instance([0,0,0],[1,1,1],'#c5b884')],'colon');
 const intestine=[];for(let i=0;i<90;i++){const t=i/89;intestine.push([Math.sin(t*Math.PI*10)*(.34+.06*Math.sin(t*25)),-.24-t*.65,.29+Math.cos(t*Math.PI*10)*.045]);}add(this.custom(tube(catmull(intestine,2),.045,9)),[instance([0,0,0],[1,1,1],'#a59081')],'small');
 const oesophagus=tube(catmull([[0,1.93,.02],[0,1.35,.03],[0,.6,.05],[.2,.25,.10],[.35,.12,.2]],8),.045,9);add(this.custom(oesophagus),[instance([0,0,0],[1,1,1],'#aec7b0')],'stomach');
 add(this.ball,[instance([0,2.02,.14],[.10,.025,.035],'#d8b1a3')],'mouth');add(this.ball,[instance([0,2.18,.15],[.045,.07,.035],'#c7b7a0')],'nose');add(this.ball,[instance([0,-1.1,.2],[.14,.15,.11],'#b8a4c2')],'urinary');add(this.rod,[instance([0,-1.03,.10],[.045,.07,.055],'#c298b7')],'vagina');
 // Reference nerves/vessels are schematic routes, not a circulation simulation.
 const path=catmull([[0,2,.02],[.12,1.5,-.11],[.19,.4,-.13],[.12,-.4,.05]],12);add(this.custom(tube(path,.015,6)),[instance([0,0,0],[1,1,1],'#bed4a0')],'nerve');
 add(this.ring,[instance([0,-3.34,0],[1.4,1,1.4],'#547a73',undefined,.75,.2),instance([0,-3.36,0],[2.1,1,2.1],'#365956',undefined,.6)],'floor');
 const stars=[],rand=rng(531);for(let i=0;i<170;i++)stars.push(instance([(rand()-.5)*18,(rand()-.5)*12,-4-rand()*6],[.007,.007,.007],'#8ea99f',undefined,.45,.5));add(this.particle,stars,'stars');
 }
 setSite(){this.flight.exit();for(const m of this.resources)this.gpu.release(m);this.resources=[];this.cloud.model=this.model;this.cloud.reset(this.cloud.requested);this.selected=-1;this.follow=false;this.inspect=false;this.pan=[0,0,0];this.layerHover=-1;this.pickTargets=[];this.bubbleSlots=[];this.bubbleHits=[];this.buildTissue();}
 enterLocal(sim){this.layerMode=false;if(!this.local)this.ambientCloud=this.cloud;this.local=sim;this.cloud=new LocalCloud(sim,this.model);this.setSite();this.setExploded(false);this.lifts.forEach(l=>{l.x=0;l.v=0;});this.goal=2.35;}
 leaveLocal(){if(!this.local)return;this.local=null;this.cloud=this.ambientCloud;this.ambientCloud=null;this.setSite();}
 buildTissue(){if(this.local){const own=data=>{const mesh=this.gpu.mesh(data);this.resources.push(mesh);return mesh;};
  if(this.local.oral){
   this.oralTooth=own(oralSurfaceGeometry(this.local));this.oralRenderTick=-1;this.oralSurfaceInfo=null;
   this.tissueGroups=[this.group(this.ball,[instance([0,-3,0],[25,5.5,25],'#c7a885')],{layer:0}),this.group(this.oralTooth,[instance([0,0,0],[1,1,1],'#eee7d0')],{layer:0})];
   this.capillaryGroup=this.group(this.rod,[],{layer:0});this.gel=own(surface(()=>0,24,8));this.gelBuffers=Array.from({length:5},()=>new Float32Array(STRIDE));return;
  }
  this.mucusFilmTick=-1;this.mucusFilmInfo=null;
  if(this.local.mucus){this.mucusMeshes=[own(filmGeometry(this.local.mucus,this.local.chemistry.n)),own(filmGeometry(this.local.mucus,this.local.chemistry.n,true))];}
  this.tissueGroups=[this.group(own(surface(()=>this.local.mucus?-.65:-4,32,8)),[instance([0,0,0],[1,1,1],this.local.mucus?'#b17b91':'#654c60')],{layer:0})];
  if(this.local.mucus){const cells=[];for(let z=-22;z<=22;z+=4)for(let x=-22;x<=22;x+=4)cells.push(instance([x,-.45,z],[1.93,.55,1.93],'#d8a7ae'));this.tissueGroups.push(this.group(this.tissueCell,cells,{layer:0}));}
  this.capillaryGroup=this.group(this.rod,[],{layer:0});this.gel=own(surface(()=>0,32,12));this.gelBuffers=Array.from({length:5},()=>new Float32Array(STRIDE));return;
 }const site=this.model.site.id,rand=rng(28),g=this.gpu;const own=mesh=>{const m=g.mesh(mesh);this.resources.push(m);return m;};this.tissueGroups=[];
 const color=site==='mouth'?'#cfbea4':site==='skin'?'#c69080':site==='lung'||site==='nose'?'#b888ae':'#c2859b';
 this.tissueGroups.push(this.group(own(surface((x,z)=>heightAt(site,x,z),32,36)),[instance([0,0,0],[1,1,1],color)],{layer:0}));
 const cells=[];for(let x=-29;x<=29;x+=3.1)for(let z=-29;z<=29;z+=3.1){const y=heightAt(site,x,z)-.28,c=(Math.round(x+z)*3)%11===0?'#699c93':color;cells.push(instance([x,y,z],[1.48,.45,1.48],c,undefined,1));}this.tissueGroups.push(this.group(this.tissueCell,cells,{layer:0}));
 if(site==='colon'){const rings=[];for(let x=-22.5;x<30;x+=9)for(let z=-22.5;z<30;z+=9)rings.push(instance([x,heightAt(site,x,z)+1.6,z],[1.05,.5,1.05],'#b18a86'));this.tissueGroups.push(this.group(this.smallRing,rings,{layer:0}));}
 if(site==='small'){const villi=[];for(let x=-26;x<28;x+=4.3)for(let z=-26;z<28;z+=4.3)villi.push(instance([x,2.5+heightAt(site,x,z),z],[.8,1.9,.8],'#b28c84'));this.tissueGroups.push(this.group(this.rod,villi,{layer:0}));}
 if(site==='skin'){const hair=tube(catmull([[0,-5,0],[.1,-1,.2],[1,5,1],[3,11,2]],12),.5,12);this.tissueGroups.push(this.group(own(hair),[instance([0,0,0],[1,1,1],'#6b5140')],{layer:0}));}
 if(['lung','nose'].includes(site)){const cilia=[];for(let x=-28;x<30;x+=1.5)for(let z=-28;z<30;z+=1.5)cilia.push(instance([x,1.2+heightAt(site,x,z),z],[.055,.65,.055],'#9eabb6',quatFromY([.3,1,.1])));this.tissueGroups.push(this.group(this.rod,cilia,{layer:0}));}
 if(site==='mouth'){const domes=[];for(let i=0;i<18;i++){const x=(rand()-.5)*43,z=(rand()-.5)*43;domes.push(instance([x,1,z],[3+rand()*3,1.8,3+rand()*3],'#7caa93',undefined,.13));}this.tissueGroups.push(this.group(this.ball,domes,{layer:2,transparent:true}));}
 this.gel=own(surface((x,z)=>.35*Math.sin(x*.18)*Math.cos(z*.18),32,20));this.gelData=new Float32Array(STRIDE);this.gelBuffers=Array.from({length:5},()=>new Float32Array(STRIDE));
 this.capillary=own(tube(catmull([[-30,-3,8],[-12,-4,3],[0,-3,9],[15,-3,-1],[30,-4,-6]],10),.7,10));this.capillaryGroup=this.group(this.capillary,[instance([0,0,0],[1,1,1],'#a66468')],{layer:0});
 }
 get microLayer(){return layerLayout(this.model.site).micro;}
 get microShift(){if(this.local)return 0;return this.lifts[this.microLayer].x*this.microLayer*3.8;}
 highlight(layer){return this.layerHover===layer?1:0;}
 recordGroup(group,data,alpha){
  for(let i=0;i<group.count;i++)this.pickTargets.push({geometry:group.mesh.geometry,data,offset:i*STRIDE,kind:group.transparent?'fluid':'tissue',layer:group.layer??0,opacity:alpha*data[i*STRIDE+13]});
 }
 setExploded(value){this.flight.exit();this.exploded=value;this.explodeElapsed=0;}
 flightRecords(){
  if(this.travel.x>1.88)return this.pickTargets.filter(r=>r.kind==='tissue');
  const groups=this.bodyGroups.filter(g=>!['stars','floor'].includes(g.site));if(this.travel.x<1.25)groups.push(this.skinGroup,...this.faceGroups);
  return groups.flatMap(g=>Array.from({length:g.count},(_,i)=>({geometry:g.mesh.geometry,data:g.data,offset:i*STRIDE,kind:'tissue',opacity:1})));
 }
 startFlight(){if(this.inspect||this.lost||!this.cameraState||Math.abs(this.travel.x-this.goal)>.01||this.travel.x>1.25&&this.travel.x<1.89)return false;this.follow=false;this.goal=this.travel.x;return this.flight.enter(this.cameraState,this.flightRecords(),this.travel.x>1.88);}
 update(dt,paused=false){if(this.flight.active&&!this.lost){const records=this.flightRecords(),safe=safeFlightStart(this.flight.position,this.flight.radius,records);if(safe){this.flight.position=safe;this.flight.update(dt,records);}else this.flight.exit();}if(this.travel.x>1.6||this.goal>1.6)this.cloud.advance(dt,{paused,calm:this.calm,rate:this.lifeRate});this.updateCamera(dt,paused);}
 updateCamera(dt,paused=false){if(dt>.05){const n=Math.ceil(dt/.05);for(let i=0;i<n;i++)this.updateCamera(dt/n,paused);return;}if(!paused)this.clock+=dt;this.explodeElapsed+=dt;settle(this.travel,this.goal,dt,.55,this.calm);settle(this.yaw,this.targetYaw,dt,.13,this.calm);settle(this.pitch,this.targetPitch,dt,.13,this.calm);for(let i=0;i<5;i++){if(!this.calm&&this.explodeElapsed<(this.exploded?i:4-i)*.035)continue;const s=this.lifts[i],target=this.exploded?1:0;if(this.calm){s.x=target;s.v=0;continue;}for(let k=0;k<4;k++){const h=dt/4;s.v+=(64*(target-s.x)-14.2*s.v)*h;s.x+=s.v*h;}}if(this.follow&&this.selected>=0){const point=this.cloud.position(this.selected);point[1]+=this.microShift;for(let i=0;i<3;i++)settle(this.focusPoint[i],point[i],dt,.27,this.calm);}}
 camera(target,distance,yaw,pitch,fog){if(this.flight.active){const eye=[...this.flight.position];target=eye.map((v,i)=>v+this.flight.direction()[i]);const near=this.flight.radius*.1,far=2000,vp=multiply(perspective(.72,this.w/this.h,near,far),lookAt(eye,target));this.gpu.camera(vp,eye,fog);this.cameraState={target,eye,vp,near,far};return this.cameraState;}const eye=[target[0]+Math.sin(yaw)*Math.cos(pitch)*distance,target[1]+Math.sin(pitch)*distance,target[2]+Math.cos(yaw)*Math.cos(pitch)*distance],vp=multiply(perspective(.72,this.w/this.h,Math.max(.001,distance/2000),Math.max(100,distance*20)),lookAt(eye,target));this.gpu.camera(vp,eye,fog);this.cameraState={target,eye,vp,near:Math.max(.001,distance/2000),far:Math.max(100,distance*20)};return this.cameraState;}
 drawGroup(group,alpha=1,material=0,dy=0,pickable=false){let data=group.data;if(dy){data=group.data.slice();for(let i=0;i<group.count;i++)data[i*STRIDE+1]+=dy;}this.gpu.upload(group.mesh,data,group.count);this.gpu.draw(group.mesh,group.count,alpha,material,!group.transparent&&alpha>.9,pickable?this.highlight(group.layer??0):0);if(pickable)this.recordGroup(group,data,alpha);}
 renderLoop(alpha){
  const a=this.local.axisLoop,n=a.neural,im=a.immune;
  const colors={source:'#85ead2',neural:'#c7b0fa',humoral:'#ffe18e',immune:'#f4a8ba'};
  const draw=(mesh,p,scale,color,value=0,q=undefined)=>{writeInstance(this.one,0,p,scale,color,q,alpha,.1+Math.min(1,value));this.gpu.upload(mesh,this.one,1);this.gpu.draw(mesh,1,alpha);};
  const line=(from,to,color,on=true)=>{const d=vsub(to,from),mid=from.map((v,i)=>(v+to[i])/2);draw(this.rod,mid,[.11,Math.hypot(...d)/3.4,.11],on?color:'#617378',on?.35:0,quatFromY(d));};
  const node=(p,label,color,value)=>{draw(this.ball,p,[1.35,1.35,1.35],color,value);this.label(label,p,color);};
  const source=[-20,6,0],gut=[-20,16,0],nts=[15,16,0];
  line(gut,source,colors.source);node(gut,'Желудок · '+a.food.stomach.toFixed(2)+' C',colors.source,a.food.stomach/12);
  // Fixed glyphs represent ONE functional population, not individual counts.
  for(let i=0;i<5;i++)draw(this.rod,[-21+(i%3)*1.2,5+Math.floor(i/3)*1.6,0],[.45,.9,.45],colors.source,a.gates.fermentation?.6:.05,quatFromY([.4,1,0]));
  this.label('Микробный источник',[-20,8,0],colors.source);
  for(const [y,color,value,label,outLabel,outValue,gate] of [
   [16,colors.neural,n.receptor,'FFAR3', 'NTS',n.nts,a.gates.neural],
   [6,colors.humoral,a.acetate.blood/(1+a.acetate.blood),'Кровь · ацетат','Мозг · ацетат',a.acetate.brain/(.06+a.acetate.brain),a.gates.bbb],
   [-1,colors.immune,im.cytokines,'Цитокины','PGE₂ → EP3',im.ep3,a.gates.immune]]){
   const middle=[-3,y,0],end=[15,y,0];line(source,middle,color);line(middle,end,color,gate);node(middle,label,color,value);node(end,outLabel,color,outValue);
  }
  const motor=[2,23,0];line(nts,[24,16,0],colors.neural,a.gates.feedback);line([24,16,0],[24,23,0],colors.neural,a.gates.feedback);line([24,23,0],motor,colors.neural,a.gates.feedback);line(motor,[-20,23,0],colors.neural,a.gates.feedback);line([-20,23,0],gut,colors.neural,a.gates.feedback);
  node(motor,'↶ Моторный выход ×'+a.emptying.toFixed(2),colors.neural,n.motor);
 }
 renderAxis(alpha){const a=this.local.axis,nodes=[['Сенсор','sensor'],['Глутаматный выход','glutamate'],['Афферент','afferent'],['NTS','nts']];nodes.forEach(([label,key],i)=>{const p=[-18+i*12,8,0],value=a[key];writeInstance(this.one,0,p,[2,2,2],['#77ead1','#f7cc8e','#bba1ef','#f49eaf'][i],undefined,alpha,.1+value);this.gpu.upload(this.ball,this.one,1);this.gpu.draw(this.ball,1,alpha);this.label(label+' · '+value.toFixed(3),[p[0],12,0]);if(i<3){writeInstance(this.one,0,[p[0]+6,8,0],[.18,5,.18],'#8bbdba',quatFromY([1,0,0]),alpha,.1);this.gpu.upload(this.rod,this.one,1);this.gpu.draw(this.rod,1,alpha);}});}
 render(){this.w=this.canvas.clientWidth;this.h=this.canvas.clientHeight;const ratio=Math.min(devicePixelRatio||1,1.5);if(this.overlay.width!==Math.round(this.w*ratio)||this.overlay.height!==Math.round(this.h*ratio)){this.overlay.width=Math.round(this.w*ratio);this.overlay.height=Math.round(this.h*ratio);}const c=this.ctx;c.setTransform(ratio,0,0,ratio,0,0);c.clearRect(0,0,this.w,this.h);if(this.lost){c.fillStyle='#d1dcc6';c.font='16px system-ui';c.fillText('Графический контекст потерян. Ожидаем восстановления…',30,80);return;}
 const q=this.travel.x,blend=smooth(1.32,1.88,q);this.gpu.begin(this.model.time,q<1.5?Math.max(1,this.ratio):this.ratio);this.gpu.fields(this.local?this.cloud.fieldPixels:this.model.fields,this.local?0:this.field);this.bodyLabels=[];this.pickTargets=[];this.bubbleHits=[];
 if(this.inspect){this.renderCell();return;}
 if(blend<.998){const target=mix3([0,-.32,0],ORGAN_POINTS[this.model.site.id],smooth(0,1,q)),distance=q<1?mix(9.7,2.6,smooth(0,1,q)):2.6*Math.exp(-(q-1)*3.8);const cam=this.camera(target,distance*(this.w<650?2.3:1),this.yaw.x,this.pitch.x,.022);
  for(const group of this.bodyGroups){const isSelected=group.site===this.model.site.id;const a=group.site==='stars'?(1-smooth(0,.8,q)):(group.site==='floor'?1-smooth(.3,.9,q):1-(isSelected?0:smooth(.6,1.5,q)*.76));this.drawGroup(group,(1-blend)*a);}
  const shellOpacity=1-smooth(.2,1.3,q);this.drawGroup(this.skinGroup,(1-blend)*shellOpacity,0);for(const face of this.faceGroups)this.drawGroup(face,(1-blend)*shellOpacity,0);this.drawGroup(this.windowGroup,(1-blend)*shellOpacity*.10,1);
  if(q<1.25)for(const s of SITES){const p=project(ORGAN_POINTS[s.id],cam.vp,this.w,this.h);if(p&&p.z<1){this.bodyLabels.push({...p,id:s.id,name:s.name});}}
  this.drawBodyLabels(q);
 }
 if(blend>.001){this.gpu.gl.clear(this.gpu.gl.DEPTH_BUFFER_BIT);const proximity=clamp(q-2,0,1),target=[this.pan[0],4+this.pan[1]+this.lifts[4].x*3,this.pan[2]];if(this.follow&&this.selected>=0){for(let i=0;i<3;i++)target[i]=this.focusPoint[i].x;}
  const distance=q<2?mix(110,51,smooth(1.32,2,q)):mix(51,8,smooth(2,3,q));const pitch=clamp(this.pitch.x+.44,.06,1.35);this.camera(this.local?.axisLoop?[target[0],10+this.pan[1],target[2]]:target,distance*(this.local?.axisLoop?1.85*Math.max(1,1.4/(this.w/this.h)):1),this.yaw.x,pitch,.014);
  if(this.local?.oral&&this.oralRenderTick!==this.local.tick){this.gpu.morph(this.oralTooth,oralSurfaceGeometry(this.local).vertices);this.oralRenderTick=this.local.tick;this.oralSurfaceInfo={tick:this.local.tick,minHeight:Math.min(...this.oralTooth.geometry.vertices.filter((_,i)=>i%6===1)),vertices:this.oralTooth.geometry.vertices.length/6};}
  this.drawGroup(this.capillaryGroup,blend,0,0,true);
  for(const group of this.tissueGroups.filter(g=>!g.transparent))this.drawGroup(group,blend,0,this.lifts[group.layer||0].x*(group.layer||0)*3.8,true);
  if(this.local?.mucus)this.renderMucus(blend,false);
  if(this.local?.oral)this.renderOral(blend);
  if(this.local?.axisLoop)this.renderLoop(blend);else if(this.local?.axis)this.renderAxis(blend);else this.renderCloud(blend);if(this.local)this.renderLocalEvents(blend);else{this.renderParticles(blend);this.renderLifeEvents(blend);}
  if(this.local?.mucus)this.renderMucus(blend,true);
  if(this.showConnections&&!this.local)this.connections(blend);
  for(const group of this.tissueGroups.filter(g=>g.transparent))this.drawGroup(group,blend,0,this.lifts[group.layer||0].x*(group.layer||0)*3.8,true);
  const fluids=this.local?.oral||this.local?.axisLoop?[]:this.local?[1]:layerLayout(this.model.site).fluid;
  for(const i of fluids){
   if(this.autoLow&&i!==fluids[0]&&!this.exploded&&this.layerHover!==i&& !this.layerMode)continue;
   const z=this.local?this.cloud.slice*2:i*1.4+this.lifts[i].x*i*3.8,data=this.gelBuffers[i];
   writeInstance(data,0,[0,z,0],[1,1,1],LAYER_COLORS[i],undefined,this.local?.7:.14);
   this.gpu.upload(this.gel,data,1);this.gpu.draw(this.gel,1,blend,2,false,this.highlight(i));
   this.pickTargets.push({geometry:this.gel.geometry,data,offset:0,kind:'fluid',layer:i,opacity:(this.local?.7:.14)*blend});
  }
  this.drawMicroLabels();
 }
 }
 renderOral(alpha){
  const sim=this.local,o=sim.oral;let n=0;
  for(let i=0;i<36;i++){
   const x=sim.entities[i].pos[0]*2,z=sim.entities[i].pos[2]*2,y=oralSurfaceHeight(sim,x,z),plaque=oralPlaque(sim,i);
   writeInstance(this.miscBuffer,n++,[x,y+.03,z],[3.7,.07,3.7],o.capacity[i]<.999?'#b79a70':o.mineral[i]<.8?'#dbd5b5':'#fbf1d6',undefined,.75);
  }
  this.gpu.upload(this.ball,this.miscBuffer,n);this.gpu.draw(this.ball,n,alpha,0,false);
  n=0;for(let i=0;i<36;i++){
   const x=sim.entities[i].pos[0]*2,z=sim.entities[i].pos[2]*2,y=oralSurfaceHeight(sim,x,z),p=oralPlaque(sim,i),h=Math.max(.05,p*2.2);
   writeInstance(this.miscBuffer,n++,[x,y+h*.4,z],[2.9,h,2.9],'#d9bd73',undefined,Math.min(.6,p*.8),.08);
  }
  this.gpu.upload(this.ball,this.miscBuffer,n);this.gpu.draw(this.ball,n,alpha,0,false);
  n=0;for(let i=0;i<36;i++){
   const x=sim.entities[i].pos[0]*2,z=sim.entities[i].pos[2]*2,y=oralSurfaceHeight(sim,x,z),acidity=clamp((6.9-oralPH(sim,i))/2);
   writeInstance(this.miscBuffer,n++,[x,y+.2,z],[3.2,1,3.2],'#ef92bc',undefined,acidity,.25);
  }
  this.gpu.upload(this.ring,this.miscBuffer,n);this.gpu.draw(this.ring,n,alpha,0,false);
  n=0;for(let i=0;i<24;i++){const x=-23+((sim.time*o.flow*1.5+i*3.71)%46),z=-22+(i%6)*8;
   writeInstance(this.particleBuffer,n++,[x,6.5+Math.sin(i),z],[.12,.12,.32],'#99e8f1',undefined,.7,.35);
  }
  this.gpu.upload(this.particle,this.particleBuffer,n);this.gpu.draw(this.particle,n,alpha,0,false);
 }
 renderMucus(alpha,outer){
  const sim=this.local,m=sim.mucus,n=sim.chemistry.n;
  if(this.mucusFilmTick!==sim.tick){
   this.mucusMeshes.forEach((mesh,i)=>this.gpu.morph(mesh,filmGeometry(m,n,!!i).vertices));
   this.mucusFilmTick=sim.tick;this.mucusFilmInfo={tick:sim.tick,patches:n*n,vertices:this.mucusMeshes[0].geometry.vertices.length/6,minInnerHeight:Math.min(...m.inner)/.22*2.4,maxInnerHeight:Math.max(...m.inner)/.22*2.4};
  }
  const mesh=this.mucusMeshes[+outer];
  writeInstance(this.one,0,[0,0,0],[1,1,1],outer?'#a5e4bd':'#73cddd',undefined,outer?.25:.66,.10);
  this.gpu.upload(mesh,this.one,1);this.gpu.draw(mesh,1,alpha,0,false);
  if(outer){
   let count=0;
   // Motion follows computed cumulative secretion, not the decorative clock.
   for(let k=0;k<n*n;k+=7){const x=((k%n)+.5)/n*48-24,z=(Math.floor(k/n)+.5)/n*48-24,phase=(m.secreted*.1+k*.173)%1;
    writeInstance(this.particleBuffer,count++,[x,.1+phase*filmHeight(m,n,x,z),z],[.09,.16,.09],'#e7f6cf',undefined,.7,.4);
   }
   this.gpu.upload(this.particle,this.particleBuffer,count);this.gpu.draw(this.particle,count,alpha,0,false);
  }
 }
 renderCloud(alpha){
 const cloud=this.cloud,high={},low={},mid={},t=cloud.visualTime;this.visibleAgents=[];let details=0,middle=0;
 const budget=this.quality==='detail'?420:this.quality==='eco'||this.autoLow?36:120;
 for(const key in this.speciesBuffers){high[key]=0;low[key]=0;mid[key]=0;}
 for(let i=0;i<cloud.count;i++){
  if(cloud.alive&&!cloud.alive[i])continue;
  const id=cloud.ids[cloud.species[i]],s=byId[id],type=cloud.shape?cloud.shape(i):s.shape,vp=this.cameraState.vp,x=cloud.x[i],y=cloud.y[i]+this.microShift,z=cloud.z[i];
  const cw=vp[3]*x+vp[7]*y+vp[11]*z+vp[15],cx=vp[0]*x+vp[4]*y+vp[8]*z+vp[12],cy=vp[1]*x+vp[5]*y+vp[9]*z+vp[13];
  if(cw<.01||Math.abs(cx)>cw+2||Math.abs(cy)>cw+2)continue;
  const mass=this.local?1:this.model.pop[id]/this.model.initial[id],size=cloud.size[i]*clamp(Math.sqrt(mass),.24,1.5),radius=size*this.h/(.75*cw);
  this.visibleAgents.push({id:i,x:(cx/cw*.5+.5)*this.w,y:(.5-cy/cw*.5)*this.h,radius,depth:cw,size});
 }
 this.visibleAgents.sort((a,b)=>(b.id===this.selected?1:0)-(a.id===this.selected?1:0)||b.radius-a.radius);
 for(const item of this.visibleAgents){
  const i=item.id,id=cloud.ids[cloud.species[i]],s=byId[id],type=cloud.shape?cloud.shape(i):s.shape,size=item.size,phase=cloud.phase[i],angle=cloud.angle[i];
  const detailed=i===this.selected||(item.radius>7&&details<budget),medium=!detailed&&item.radius>3&&middle<(this.quality==='detail'?400:180);
  if(detailed)details++;if(medium)middle++;
  const buf=detailed?this.speciesBuffers[type]:medium?this.mediumBuffers[type]:this.lightBuffers[type],counts=detailed?high:medium?mid:low;
  const mass=this.local?1:this.model.pop[id]/this.model.initial[id],a=clamp(mass,.06,1)*(this.selectedSpecies&&this.selectedSpecies!==id?.25:1);
  const q=quatFromY([Math.cos(angle),Math.sin(phase+t*.55)*.16,Math.sin(angle)]),pulse=this.calm?1:1+cloud.activity[i]*.07*Math.sin(t*5+phase);
  const slot=counts[type]++;item.kind='agent';item.agent=i;item.layer=this.microLayer;item.data=buf;item.offset=slot*STRIDE;item.opacity=a*alpha;item.geometry=(detailed?this.microMeshes[type]:medium?this.mediumMeshes[type]:this.lightMeshes[type]).geometry;this.pickTargets.push(item);
  writeInstance(buf,slot,[cloud.x[i],cloud.y[i]+this.microShift,cloud.z[i]],[size*pulse,size,size*pulse],cloud.color?cloud.color(i):liveColor(id),q,a,cloud.activity[i]*.45,phase);
 }
 for(const[type,count]of Object.entries(mid))if(count){this.gpu.upload(this.mediumMeshes[type],this.mediumBuffers[type],count);this.gpu.draw(this.mediumMeshes[type],count,alpha,0,true,this.highlight(this.microLayer));}
 for(const[type,count]of Object.entries(low))if(count){this.gpu.upload(this.lightMeshes[type],this.lightBuffers[type],count);this.gpu.draw(this.lightMeshes[type],count,alpha,0,true,this.highlight(this.microLayer));}
 for(const[type,count]of Object.entries(high))if(count){this.gpu.upload(this.microMeshes[type],this.speciesBuffers[type],count);this.gpu.draw(this.microMeshes[type],count,alpha,0,true,this.highlight(this.microLayer));}
 this.lodStats={visible:this.visibleAgents.length,detailed:details,medium:middle,light:this.visibleAgents.length-details-middle};
 // Only nearby flagella merit filament geometry; at a distance the swimming trajectory carries the story.
 let n=0,filaments=0;
 for(const item of this.visibleAgents){if(filaments>=24)break;const i=item.id,s=byId[cloud.ids[cloud.species[i]]];if(!s.flagellum||item.radius<4||this.local?.get(i+1)?.state==='persister')continue;filaments++;
  const pos=cloud.position(i),angle=cloud.angle[i],r=cloud.size[i];
  for(let j=0;j<7;j++){const u=j*.16;writeInstance(this.miscBuffer,n++,[pos[0]-Math.cos(angle)*(.5+u),pos[1]+Math.sin(j*.9+t*7)*.14+this.microShift,pos[2]-Math.sin(angle)*(.5+u)],[r*.12,r*.12,r*.12],liveColor(s.id));}
 }
 this.gpu.upload(this.tissueCell,this.miscBuffer,n);this.gpu.draw(this.tissueCell,n,alpha);
 if(this.selected>=0){const p=cloud.position(this.selected);p[1]+=this.microShift;writeInstance(this.one,0,p,[.9,.9,.9],'#fff2a3',undefined,1,.5);this.gpu.upload(this.ring,this.one,1);this.gpu.draw(this.ring,1,alpha);}
 }
 renderLocalEvents(alpha){
  if(this.local.oral){if(this.w>900&&this.travel.x<2.6){this.label('Налёт · микроколонии и матрикс',[-6,5,8],'#f4d28e');this.label('Эмаль · запас минералов, не диагноз',[-6,2,12],'#f8ebce');}return;}
  const sim=this.local;let n=0;
  if(sim.pulseRelay){const o=sim.pulseRelay.oxygen;this.label('Группа 1 · субстрат → ацетат',[-8,9,0],'#8ce3ce');this.label('Группа 2 · ацетат → бутират',[4,9,0],'#f3db83');this.label('O₂ просвета '+o.lumen.toFixed(3)+' · ткань '+o.tissue.toFixed(3),[-6,13,4],'#b5d7f5');return;}
  if(!sim.mucus){writeInstance(this.one,0,[0,0,0],[.75,1,.75],sim.barrier>.5?'#75d6bd':'#e68b75',undefined,.04+sim.barrier*.16);this.gpu.upload(this.gel,this.one,1);this.gpu.draw(this.gel,1,alpha,0,false);}
  for(const job of sim.jobs){if(sim.contactStudy&&Math.hypot(...sim.get(job.from).pos.map((v,i)=>v-sim.get(job.to).pos[i]))>1.5)continue;const a=this.cloud.position(job.from-1),b=this.cloud.position(job.to-1),seg=segment(a,b,.045);writeInstance(this.miscBuffer,n++,seg.pos,seg.scale,'#ffdf6c',seg.q,1,.5);}
  for(const e of sim.entities)if(e.alive&&e.state==='hypha'&&e.parents.length){const parent=sim.get(e.parents[0]);if(parent?.alive){const seg=segment(this.cloud.position(e.id-1),this.cloud.position(parent.id-1),.12);writeInstance(this.miscBuffer,n++,seg.pos,seg.scale,'#ed80e7',seg.q);}}
  for(const event of sim.events.slice(-60)){if(sim.tick-event.tick>20||event.actors.length<2)continue;
   if(!['transfer','t6','adsorption','engulf'].includes(event.kind))continue;
   if(sim.contactStudy&&Math.hypot(...sim.get(event.actors[0]).pos.map((v,i)=>v-sim.get(event.actors[1]).pos[i]))>1.5)continue;
   const a=this.cloud.position(event.actors[0]-1),b=this.cloud.position(event.actors[1]-1),seg=segment(a,b,.065);
   writeInstance(this.miscBuffer,n++,seg.pos,seg.scale,event.kind==='t6'?'#ff716b':event.kind==='engulf'?'#e9faff':'#ffe879',seg.q,1,.4);
  }
  this.gpu.upload(this.rod,this.miscBuffer,n);this.gpu.draw(this.rod,n,alpha);
  if(!sim.mucus&&!sim.axisLoop&&!sim.axis)this.label('Локальный срез: ткань y < 0 · просвет y > 0',[-12,-1,0],'#d6c4ee');
 }
 renderLifeEvents(alpha){
 let n=0;const cloud=this.cloud,t=cloud.visualTime;
 for(const e of cloud.events){
  const age=t-e.at,u=clamp(age/3),a=cloud.position(e.from),b=cloud.position(e.to);
  for(let j=0;j<6;j++){
   const f=clamp(u-j*.035),p=mix3(a,b,f);p[1]+=Math.sin(f*Math.PI)*1.2+this.microShift;
   writeInstance(this.particleBuffer,n++,p,[.09,.09,.09],j%2?'#ffd65d':'#55e3ff',undefined,(1-j/7)*Math.sin(u*Math.PI),.7);
  }
  if(age>2.9){const v=clamp((age-2.9)/1.9),p=[b[0],b[1]*(1-v)+heightAt(this.model.site.id,b[0],b[2])*v,b[2]];
   writeInstance(this.particleBuffer,n++,p,[.12,.12,.12],'#ffd65d',undefined,Math.sin(v*Math.PI),.8);
  }
 }
 this.gpu.upload(this.tissueCell,this.particleBuffer,n);this.gpu.draw(this.tissueCell,n,alpha,0,false);
 }
 renderParticles(alpha){let count=0;const t=this.model.time,visual=this.cloud.visualTime;for(const d of this.cloud.deposits){const age=this.calm?0:t-d.at;for(let i=0;i<85;i++){const phase=i*2.399,spread=1+age*.21,r=Math.sqrt(i/85)*spread*3,pos=[d.pos[0]+Math.cos(phase)*r,d.pos[1]+Math.cos(i*3.1)*2-age*.1,d.pos[2]+Math.sin(phase)*r],size=d.kind==='fiber'?[.045,.3,.045]:[.09,.09,.09];writeInstance(this.particleBuffer,count++,pos,size,d.kind==='fiber'?'#e6c678':'#dfabc4',quatFromY([Math.cos(phase),1,Math.sin(phase)]),clamp(1-age/28),.7);}}
 const evt=this.model.events.at(-1);if(evt&&evt.kind==='antibiotic'){const age=t-evt.time,env=this.calm?0:burst(age,.08,5);for(let i=0;i<180;i++){const a=i*2.399,y=(i%13)/13*12,r=age*3;writeInstance(this.particleBuffer,count++,[Math.cos(a)*r,y,Math.sin(a)*r],[.06,.06,.06],'#d59ada',undefined,env,.8);}}
 if(this.model.site.id==='colon'){for(let i=0;i<75;i++){const x=Math.sin(i*13.2)*24,z=Math.cos(i*9.1)*24,y=1+((i*.71-(this.calm?0:visual)*1.6)%10+10)%10;writeInstance(this.particleBuffer,count++,[x,y,z],[.035,.12,.035],'#bbd885',undefined,this.model.butyrate,.8);}}
 this.gpu.upload(this.tissueCell,this.particleBuffer,count);this.gpu.draw(this.tissueCell,count,alpha,0,false,this.highlight(this.model.site.layers.length-1));
 }
 connections(alpha){let n=0;const ids=['bact','faec','akk','meth'],cloud=this.cloud;for(let i=0;i<ids.length-1;i++){const a=cloud.ids.indexOf(ids[i]),b=cloud.ids.indexOf(ids[i+1]);let from=-1,to=-1;for(let j=0;j<cloud.count;j++){if(from<0&&cloud.species[j]===a)from=j;if(to<0&&cloud.species[j]===b)to=j;}if(from<0||to<0)continue;for(let k=0;k<32;k++){const u=((k/32+(this.calm?0:this.model.time)*.08)%1),p=mix3(cloud.position(from),cloud.position(to),u);p[1]+=Math.sin(u*Math.PI)*3+this.microShift;writeInstance(this.miscBuffer,n++,p,[.035,.035,.035],'#d9d999',undefined,.7,.8);}}
 this.gpu.upload(this.particle,this.miscBuffer,n);this.gpu.draw(this.particle,n,alpha,0,false);
 }
 renderCell(){
  if(this.mechanism){this.renderMechanism();return;}
  const id=this.inspectedSpecies||'faec',s=byId[id],blueprint=cellBlueprint(id),parts=blueprint.parts;
  this.camera([0,1,0],this.w<650?17:13,this.yaw.x,.25+this.pitch.x,.012);
  const draw=(key,mesh,pos,scale,alpha=1,q=undefined)=>{
   const p=parts.find(p=>p.id===key);if(!p)return;
   writeInstance(this.one,0,pos,scale,p.color,q,alpha);this.gpu.upload(mesh,this.one,1);
   this.gpu.draw(mesh,1,1,0,alpha>.9,this.cellPart===key?1:0);
   if(this.cellPart===key)this.label(p.name,pos,p.color);
  };
  const lift=(i)=>this.lifts[Math.min(i,4)].x;
  if(s.group==='Вирусы'){
   draw('capsid',this.cellCuts.oval,[0,1.5+lift(1),0],[1.1,1.2,1.1]);
   draw('genome',this.dna,[0,1.5+lift(1),0],[.65,.65,.65]);
   draw('tail',this.rod,[0,0,0],[.18,.65,.18]);
   for(let i=0;i<6;i++){const a=i*Math.PI/3,seg=segment([0,-.5,0],[Math.cos(a)*1.3,-2-lift(2),Math.sin(a)*1.3],.055);draw('fibres',this.rod,seg.pos,seg.scale,1,seg.q);}
   return;
  }
  const rounded=['Грибы','Протисты','Археи'].includes(s.group)||s.shape==='cocci'||s.shape==='oval';
  const shell=rounded?this.cellCuts.oval:this.cellCuts[s.shape]||this.cellCuts.rod;
  const shells=parts.filter(p=>['wall','membrane','outer'].includes(p.id));
  for(let i=0;i<shells.length;i++){
   const key=shells[i].id,r=key==='membrane'?.84:key==='outer'?1.06:.97,shift=(i+1)*1.25*lift(i+1);
   draw(key,shell,[-shift,shift*.25,0],[r,rounded?(s.group==='Грибы'?r*1.25:r):r,r]);
  }
  if(s.group==='Протисты'){
   draw('vacuole',this.cellOrganelle,[0,0,0],[.73,.73,.73],.68);
   draw('cytoplasm',this.ring,[0,0,0],[.86,.86,.86]);
   for(const x of[-.75,.75])draw('nucleus',this.cellOrganelle,[x,.30+lift(2)*.6,.18],[.19,.24,.19]);
  }else if(s.group==='Грибы'){
   draw('nucleus',this.cellOrganelle,[-.36,.35,.12],[.35,.43,.35],.8);
   draw('vacuole',this.cellOrganelle,[.24,-.38,.12],[.46,.50,.46],.7);
   draw('bud',this.cellOrganelle,[.82+lift(3)*.8,1.08,0],[.48,.55,.48]);
  }else{
   draw('genome',this.dna,[0,0,0],[rounded?.72:.6,rounded?.7:1,rounded?.72:.6]);
   for(let i=0;i<18;i++){const a=i*2.4;draw('ribosomes',this.cellOrganelle,[Math.cos(a)*.48,(i%6-2.5)*(rounded?.18:.32),Math.sin(a)*.4],[.055,.055,.055]);}
   draw('plasmid',this.plasmid,[.55+lift(3)*.5,-.65,.25],[.5,.5,.5]);
   draw('flagellum',this.cellFlagellum,[0,-1.55,0],[1,1,1]);
  }
 }
 renderMechanism(){const t=this.calm?.8:this.clock-this.mechanismAt,env=this.calm?0:burst(t-1,.075,1.1);this.camera([0,0,0],16,this.yaw.x,.35+this.pitch.x,.008);const q=quatFromY([1,0,0]);
  for(const [x,color]of[[-3,'#7dcba7'],[3,'#b0a0d6']]){writeInstance(this.one,0,[x,0,0],[.85,1,.85],color,q,.45);this.gpu.upload(this.cellShell,this.one,1);this.gpu.draw(this.cellShell,1,1,1,false);}
  if(this.mechanism==='t6'){writeInstance(this.one,0,[-.9,0,0],[1,1-env*.55,1],'#dbc898',q,1,.2);this.gpu.upload(this.spring,this.one,1);this.gpu.draw(this.spring,1);writeInstance(this.one,0,[env*.9,0,0],[.06,1.3,.06],'#d9d993',q);this.gpu.upload(this.rod,this.one,1);this.gpu.draw(this.rod,1);this.label('Белковая оболочка сокращается',[-1,1,0]);this.label('Эффекторы → совместимый сосед',[2,0,0]);}
  else if(this.mechanism==='conj'){writeInstance(this.one,0,[0,0,0],[.08,1,.08],'#84b7a9',q);this.gpu.upload(this.rod,this.one,1);this.gpu.draw(this.rod,1);for(const x of[-3,3]){writeInstance(this.one,0,[x,0,0],[1,1,1],'#d5df9b',undefined,x<0?1:clamp(t/5),.6);this.gpu.upload(this.plasmid,this.one,1);this.gpu.draw(this.plasmid,1);}let n=0;for(let i=0;i<40*clamp(t/5);i++)writeInstance(this.miscBuffer,n++,[-1.7+i*.085,Math.sin(i*.6)*.08,.05],[.04,.04,.04],'#d9dea7',undefined,1,.8);this.gpu.upload(this.particle,this.miscBuffer,n);this.gpu.draw(this.particle,n);this.label('Донор сохраняет копию',[-3,1,0]);this.label('Цепь ДНК → достройка копии',[3,1,0]);}
  else{writeInstance(this.one,0,[-3,1.1,0],[.23,.23,.23],'#a7baf0');this.gpu.upload(this.microMeshes.phage,this.one,1);this.gpu.draw(this.microMeshes.phage,1);let n=0;for(let i=0;i<50;i++){const a=i*2.399,r=env*2;writeInstance(this.miscBuffer,n++,[-3+Math.cos(a)*r,Math.sin(a)*r,.1],[.06,.06,.06],'#aac6f3',undefined,env,.6);}this.gpu.upload(this.particle,this.miscBuffer,n);this.gpu.draw(this.particle,n);this.label('Только подходящий хозяин',[-3,1.8,0]);this.label('Иллюстрация, не расчёт полного цикла',[2,-1,0]);}
 }

 label(text,pos,color='#c4dba0'){const p=project(pos,this.cameraState.vp,this.w,this.h);if(!p||p.z>1)return;const c=this.ctx;c.font='11px system-ui';const width=c.measureText(text).width+20,x=clamp(p.x+24,8,this.w-width-8),y=p.y;c.strokeStyle=color+'88';c.lineWidth=.8;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(x,y-14);c.stroke();c.fillStyle='#102526ec';c.beginPath();c.roundRect(x,y-30,width,25,5);c.fill();c.fillStyle=color;c.fillText(text,x+10,y-13);}
 drawBodyLabels(q){if(q>.9)return;const c=this.ctx;for(const p of this.bodyLabels){const selected=p.id===this.model.site.id;if(!selected&&['mouth','nose'].includes(p.id))continue;c.fillStyle=selected?'#d7e7a1':'#abc8bb';c.beginPath();c.arc(p.x,p.y,selected?5:2.4,0,6.28);c.fill();if(selected){c.strokeStyle='#d7e7a16b';c.beginPath();c.arc(p.x,p.y,12,0,6.28);c.stroke();const side=p.x<this.w/2?-1:1;const tx=p.x+side*80;c.strokeStyle='#c1d4aa70';c.beginPath();c.moveTo(p.x+side*14,p.y);c.lineTo(tx,p.y-19);c.stroke();c.font='12px system-ui';c.textAlign=side<0?'right':'left';c.fillStyle='#d8e0c8';c.fillText(p.name,tx,p.y-28);c.textAlign='left';}}}
 drawMicroLabels(){if(this.local?.mucus&&this.travel.x<2.65&&this.w>900){this.label('Наружный слой · питание и вынос',[-6,filmHeight(this.local.mucus,12,-6,8,true),8],'#a5e4bd');this.label('Внутренний слой · запас покрытия',[-6,filmHeight(this.local.mucus,12,-6,12),12],'#83dbef');this.label('Эпителий · повреждение не моделируется',[-6,-.5,12],'#efbdc7');}if(this.exploded){this.model.site.layers.forEach((l,i)=>this.label(l,[-20,i*1.4+this.lifts[i].x*i*3.8,5],this.layerHover===i?'#fff296':LAYER_COLORS[i]));}if(this.selected>=0){const pos=this.cloud.position(this.selected);pos[1]+=this.microShift;const s=byId[this.cloud.ids[this.cloud.species[this.selected]]];if(!this.thoughts)this.label(s.name+' · #'+(this.local?this.selected+1:this.selected),pos,liveColor(s.id));}this.drawThoughts();}
 drawThoughts(){
 this.bubbleHits=[];if(!this.thoughts||this.inspect||this.exploded||this.travel.x<1.9)return;
 const cloud=this.cloud,c=this.ctx,t=cloud.visualTime,epoch=Math.floor(t/7),mobile=this.w<650;
 const left=mobile?12:this.w*.26,right=mobile?this.w-12:this.w*.72,top=mobile?430:180,bottom=mobile?568:this.h-160;
 if(this.bubbleEpoch!==epoch||!this.bubbleSlots.length){
  this.bubbleEpoch=epoch;const candidates=this.visibleAgents.filter(p=>p.x>left+80&&p.x<right-80&&p.y>top+55&&p.y<bottom-25&&p.radius>2.4).sort((a,b)=>((a.id+epoch*137)%701)-((b.id+epoch*137)%701));
  this.bubbleSlots=candidates.slice(0,35).map(p=>p.id);
 }
 const ids=[...(this.selected>=0?[this.selected]:[]),...cloud.events.flatMap(e=>[e.from,e.to]),...this.bubbleSlots],boxes=[];
 for(const id of ids){
  if(boxes.length>=(mobile?1:3))break;if(boxes.some(b=>b.id===id||this.cloud.species[b.id]===this.cloud.species[id]))continue;
  const p=this.visibleAgents.find(p=>p.id===id);if(!p||p.x<left||p.x>right||p.y<top||p.y>bottom||this.agentBlocked(id))continue;
  const text=cloud.thought(id),s=byId[cloud.ids[cloud.species[id]]];c.font='600 12px system-ui';
  const maxWidth=Math.min(285,right-left-8),words=text.split(' '),lines=[];let line='';
  for(const word of words){if(c.measureText(line+' '+word).width>maxWidth-22&&line){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);
  const width=Math.min(maxWidth,Math.max(145,...lines.map(l=>c.measureText(l).width+24))),height=31+lines.length*16;
  const x=clamp(p.x-width*.5,left,right-width),y=clamp(p.y-p.radius-26-height,top,bottom-height),box={id,x,y,w:width,h:height};
  if(boxes.some(b=>x<b.x+b.w+12&&x+width+12>b.x&&y<b.y+b.h+15&&y+height+15>b.y))continue;
  const alpha=this.calm||id===this.selected?1:Math.min(1,(t%7)/.25,(7-t%7)/.4);if(alpha<.02)continue;c.globalAlpha=alpha;
  c.strokeStyle=liveColor(s.id);c.lineWidth=1.4;c.fillStyle='#122940f5';c.beginPath();c.roundRect(x,y,width,height,10);c.fill();c.stroke();
  c.beginPath();c.moveTo(clamp(p.x,x+10,x+width-10),y+height);c.lineTo(p.x,p.y-p.radius-3);c.stroke();
  c.fillStyle=liveColor(s.id);c.font='10px system-ui';c.fillText(s.name+' · #'+(this.local?id+1:id),x+11,y+16);c.fillStyle='#fff9e8';c.font='600 12px system-ui';
  lines.forEach((line,j)=>c.fillText(line,x+11,y+34+j*16));c.globalAlpha=1;boxes.push(box);
 }
 this.bubbleHits=boxes;
 }
 agentBlocked(id){
  const p=this.cloud.position(id);p[1]+=this.microShift;const eye=this.cameraState.eye,d=vsub(p,eye),distance=Math.hypot(...d);
  const ray={origin:eye,dir:d.map(v=>v/distance)},record=this.visibleAgents.find(r=>r.id===id),hit=record?intersectInstance(ray,record):Infinity,limit=Number.isFinite(hit)?hit:distance;
  return !!pickRecords(ray,this.pickTargets,{occludersOnly:true,blockFluid:this.blockFluid,limit});
 }
 pickRay(ray,options={}){return pickRecords(ray,this.pickTargets,{blockFluid:this.blockFluid,layersOnly:this.layerMode,...options});}
 pick(x,y){
  if(this.travel.x<1.1){const p=this.bodyLabels.reduce((best,p)=>{const d=Math.hypot(p.x-x,p.y-y);return d<26&&(!best||d<best.d)?{...p,d}:best;},null);return p?{site:p.id}:null;}
  if(this.travel.x<1.8||this.inspect)return null;
  if(!this.layerMode){const bubble=this.bubbleHits.find(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h);if(bubble&&!this.agentBlocked(bubble.id))return {agent:bubble.id,via:'narration'};}
  const camera=this.cameraState,ray=rayFromCamera(x,y,this.w,this.h,camera.eye,camera.target,.72),forward=unit(vsub(camera.target,camera.eye)),cos=ray.dir.reduce((sum,v,i)=>sum+v*forward[i],0),hit=cos>0?this.pickRay(ray,{minDistance:camera.near/cos,limit:camera.far/cos}):null;
  return hit?.kind==='agent'?{...hit,via:'triangle'}:hit?{...hit,blocked:!this.layerMode}:null;
 }
 floorPoint(x,y){const r=rayFromCamera(x,y,this.w,this.h,this.cameraState.eye,this.cameraState.target,.72);if(Math.abs(r.dir[1])<.001)return[0,7,0];const t=(5-r.origin[1])/r.dir[1];return t>0?[clamp(r.origin[0]+r.dir[0]*t,-28,28),5,clamp(r.origin[2]+r.dir[2]*t,-28,28)]:[0,5,0];}
 focusAgent(i){this.flight.exit();this.selected=i;if(!this.follow){const target=this.cameraState?.target||[0,4,0];this.focusPoint.forEach((s,j)=>{s.x=target[j];s.v=0;});}this.follow=true;this.goal=2.88;this.targetPitch=.15;}
}
function instancePart(mesh,pos,scale,q){return{mesh,pos,scale,q};}
