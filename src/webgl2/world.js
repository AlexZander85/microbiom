import {GPU,STRIDE,writeInstance,colorOf} from './gpu.js';
import {sphere,capsule,revolve,combine,tube,catmull,torus,segment,surface,heightAt,microbeGeometry} from './geometry.js';
import {perspective,lookAt,multiply,project,rayFromCamera,raySphere,quatFromY,mix,mix3,unit,vsub} from './math.js';
import {settle,smooth,burst} from '../../gl.mjs';
import {byId,SITES} from '../data.js';
import {rng,clamp} from '../model.js';
import {RepresentativeCloud} from './cloud.js';
export const ORGAN_POINTS={colon:[0,-.65,.35],mouth:[0,2.2,.34],skin:[-1.04,.28,.21],nose:[0,2.36,.39],lung:[.37,.94,.05],stomach:[.38,.03,.2],small:[0,-.54,.33],vagina:[0,-1.04,.22],urinary:[0,-.93,.28]};
const instance=(pos,scale,color,q=[0,0,0,1],alpha=1,glow=0)=>({pos,scale,color,q,alpha,glow});
export class World{
 constructor(canvas,overlay,model){this.canvas=canvas;this.overlay=overlay;this.ctx=overlay.getContext('2d');this.model=model;this.gpu=new GPU(canvas);this.cloud=new RepresentativeCloud(model);this.travel={x:0,v:0};this.goal=0;this.yaw={x:.12,v:0};this.pitch={x:.06,v:0};this.targetYaw=.12;this.targetPitch=.06;this.pan=[0,0,0];this.follow=false;this.focusPoint=[{x:0,v:0},{x:4,v:0},{x:0,v:0}];this.selected=-1;this.selectedSpecies=null;this.inspect=false;this.exploded=false;this.lifts=Array.from({length:5},()=>({x:0,v:0}));this.explodeAt=0;this.clock=0;this.calm=false;this.field=0;this.ratio=1.4;this.showConnections=false;this.bodyGroups=[];this.tissueGroups=[];this.dynamic={};this.resources=[];this.one=new Float32Array(STRIDE);this.speciesBuffers={};this.bodyLabels=[];this.lost=false;this.contextGeneration=0;
 this.initMeshes();this.buildBody();this.setSite();
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;});
 canvas.addEventListener('webglcontextrestored',()=>{try{this.gpu=new GPU(canvas);this.resources=[];this.bodyGroups=[];this.tissueGroups=[];this.dynamic={};this.initMeshes();this.buildBody();this.setSite();this.lost=false;this.contextGeneration++;}catch(e){this.restoreError=e.message;}});
 }
 initMeshes(){const g=this.gpu;this.ball=g.mesh(sphere(8,6));this.rod=g.mesh(capsule(8,8));this.ring=g.mesh(torus(1,.02,32));this.particle=g.mesh(sphere(6,4));this.microMeshes=Object.fromEntries(Object.entries(microbeGeometry()).map(([key,data])=>[key,g.mesh(data)]));
 for(const key of Object.keys(this.microMeshes))this.speciesBuffers[key]=new Float32Array(8000*STRIDE);
 this.miscBuffer=new Float32Array(3000*STRIDE);this.particleBuffer=new Float32Array(4000*STRIDE);
 this.cellShell=g.mesh(capsule(28,24));this.dna=g.mesh(tube(Array.from({length:90},(_,i)=>[Math.sin(i/89*Math.PI*2)*.55,-.7+1.4*i/89,Math.cos(i/89*Math.PI*2)*.55]),.035,6));this.plasmid=g.mesh(torus(.45,.035));this.spring=g.mesh(tube(Array.from({length:85},(_,i)=>[Math.cos(i/84*Math.PI*14)*.27,-1+i/84*2,Math.sin(i/84*Math.PI*14)*.27]),.04,6));
 }
 group(mesh,instances,extra={}){const data=new Float32Array(instances.length*STRIDE);instances.forEach((o,i)=>writeInstance(data,i,o.pos,o.scale,o.color,o.q,o.alpha??1,o.glow??0));const obj={mesh,count:instances.length,data,...extra};return obj;}
 custom(data){return this.gpu.mesh(data);}
 buildBody(){const ball=sphere(24,18),cap=capsule(18,16),parts=[];
 const torso=revolve([[-1.1,.47],[-.8,.65],[-.25,.51],[.45,.64],[1.03,.83],[1.32,.7],[1.51,.24],[1.75,.2]],40,36);parts.push(instancePart(torso,[0,0,0],[1,1,.6]));parts.push(instancePart(ball,[0,2.18,0],[.34,.47,.32]));
 for(const sign of[-1,1]){
 const arm=tube(catmull([[sign*.67,1.18,0],[sign*.9,.87,0],[sign*1.04,.31,0],[sign*1.10,-.16,.02],[sign*1.13,-.53,.03]],10),t=>.22*(1-t)+.12*t+Math.sin(t*3.14)*.025,16);
 const leg=tube(catmull([[sign*.3,-.88,0],[sign*.34,-1.3,0],[sign*.39,-1.99,.015],[sign*.43,-2.4,.03],[sign*.44,-3.02,.03]],10),t=>.26*(1-t)+.12*t+Math.sin(t*6.28)*.028,18);
 parts.push(instancePart(arm,[0,0,0],[1,1,1]),instancePart(leg,[0,0,0],[1,1,1]),instancePart(ball,[sign*1.15,-.72,.03],[.13,.25,.10]),instancePart(ball,[sign*.44,-3.12,.15],[.16,.14,.3]));
 }
 this.bodyMesh=this.custom(combine(parts));this.skinGroup=this.group(this.bodyMesh,[instance([0,0,0],[1,1,1],'#83bfbb')]);
 this.bodyGroups=[];const add=(mesh,inst,site=null)=>this.bodyGroups.push(this.group(mesh,inst,{site}));
 add(this.ball,[instance([-.37,.89,.005],[.3,.56,.24],'#6e9daa'),instance([.37,.89,.005],[.3,.56,.24],'#74abb3')],'lung');add(this.ball,[instance([.08,.66,.27],[.2,.26,.18],'#d08579')],'heart');
 add(this.ball,[instance([-.3,.12,.03],[.46,.23,.26],'#b08562')],'liver');add(this.ball,[instance([.35,.02,.19],[.25,.33,.22],'#d19b7d')],'stomach');
 const colonPath=catmull([[-.46,-1.05,.22],[-.62,-.72,.24],[-.65,-.23,.22],[-.54,-.12,.21],[0,-.14,.29],[.5,-.12,.2],[.65,-.29,.17],[.62,-.81,.19],[.35,-1.0,.2],[.02,-1.02,.25],[0,-1.25,.21]],8);add(this.custom(tube(colonPath,.105,14)),[instance([0,0,0],[1,1,1],'#c5b884')],'colon');
 const intestine=[];for(let i=0;i<90;i++){const t=i/89;intestine.push([Math.sin(t*Math.PI*10)*(.34+.06*Math.sin(t*25)),-.24-t*.65,.29+Math.cos(t*Math.PI*10)*.045]);}add(this.custom(tube(catmull(intestine,2),.045,9)),[instance([0,0,0],[1,1,1],'#a59081')],'small');
 const oesophagus=tube(catmull([[0,1.93,.02],[0,1.35,.03],[0,.6,.05],[.2,.25,.10],[.35,.12,.2]],8),.045,9);add(this.custom(oesophagus),[instance([0,0,0],[1,1,1],'#aec7b0')],'stomach');
 add(this.ball,[instance([0,2.20,.27],[.15,.04,.1],'#d8b1a3')],'mouth');add(this.ball,[instance([0,2.37,.3],[.07,.08,.1],'#c7b7a0')],'nose');add(this.ball,[instance([0,-1.1,.2],[.14,.15,.11],'#b8a4c2')],'urinary');add(this.rod,[instance([0,-1.3,.12],[.055,.09,.065],'#c298b7')],'vagina');
 // Reference nerves/vessels are schematic routes, not a circulation simulation.
 const path=catmull([[0,2,.02],[.12,1.5,-.11],[.19,.4,-.13],[.12,-.4,.05]],12);add(this.custom(tube(path,.015,6)),[instance([0,0,0],[1,1,1],'#bed4a0')],'nerve');
 add(this.ring,[instance([0,-3.34,0],[1.4,1,1.4],'#547a73',undefined,.75,.2),instance([0,-3.36,0],[2.1,1,2.1],'#365956',undefined,.6)],'floor');
 const stars=[],rand=rng(531);for(let i=0;i<170;i++)stars.push(instance([(rand()-.5)*18,(rand()-.5)*12,-4-rand()*6],[.007,.007,.007],'#8ea99f',undefined,.45,.5));add(this.particle,stars,'stars');
 }
 setSite(){for(const m of this.resources)this.gpu.release(m);this.resources=[];this.cloud.model=this.model;this.cloud.reset(this.cloud.requested);this.selected=-1;this.follow=false;this.inspect=false;this.pan=[0,0,0];this.buildTissue();}
 buildTissue(){const site=this.model.site.id,rand=rng(28),g=this.gpu;const own=mesh=>{const m=g.mesh(mesh);this.resources.push(m);return m;};this.tissueGroups=[];
 const color=site==='mouth'?'#b8b09a':site==='skin'?'#98745f':site==='lung'||site==='nose'?'#857f91':'#9e7476';
 this.tissueGroups.push(this.group(own(surface((x,z)=>heightAt(site,x,z),32,70)),[instance([0,0,0],[1,1,1],color)],{layer:0}));
 const cells=[];for(let x=-29;x<=29;x+=2.1)for(let z=-29;z<=29;z+=2.1){const y=heightAt(site,x,z)-.28,c=(Math.round(x+z)*3)%11===0?'#699c93':color;cells.push(instance([x,y,z],[.98,.63,.98],c,undefined,1));}this.tissueGroups.push(this.group(this.ball,cells,{layer:0}));
 if(site==='colon'){const rings=[];for(let x=-22.5;x<30;x+=9)for(let z=-22.5;z<30;z+=9)rings.push(instance([x,heightAt(site,x,z)+1.6,z],[1.05,.5,1.05],'#b18a86'));this.tissueGroups.push(this.group(this.ring,rings,{layer:0}));}
 if(site==='small'){const villi=[];for(let x=-26;x<28;x+=4.3)for(let z=-26;z<28;z+=4.3)villi.push(instance([x,2.5+heightAt(site,x,z),z],[.8,1.9,.8],'#b28c84'));this.tissueGroups.push(this.group(this.rod,villi,{layer:0}));}
 if(site==='skin'){const hair=tube(catmull([[0,-5,0],[.1,-1,.2],[1,5,1],[3,11,2]],12),.5,12);this.tissueGroups.push(this.group(own(hair),[instance([0,0,0],[1,1,1],'#6b5140')],{layer:0}));}
 if(['lung','nose'].includes(site)){const cilia=[];for(let x=-28;x<30;x+=1.5)for(let z=-28;z<30;z+=1.5)cilia.push(instance([x,1.2+heightAt(site,x,z),z],[.055,.65,.055],'#9eabb6',quatFromY([.3,1,.1])));this.tissueGroups.push(this.group(this.rod,cilia,{layer:1}));}
 if(site==='mouth'){const domes=[];for(let i=0;i<18;i++){const x=(rand()-.5)*43,z=(rand()-.5)*43;domes.push(instance([x,1,z],[3+rand()*3,1.8,3+rand()*3],'#7caa93',undefined,.13));}this.tissueGroups.push(this.group(this.ball,domes,{layer:3,transparent:true}));}
 this.gel=own(surface((x,z)=>.35*Math.sin(x*.18)*Math.cos(z*.18),32,20));this.gelData=new Float32Array(STRIDE);
 this.capillary=own(tube(catmull([[-30,-3,8],[-12,-4,3],[0,-3,9],[15,-3,-1],[30,-4,-6]],10),.7,10));this.capillaryGroup=this.group(this.capillary,[instance([0,0,0],[1,1,1],'#a66468')],{layer:0});
 }
 setExploded(value){this.exploded=value;this.explodeAt=this.clock;}
 update(dt,paused=false){if(dt>.05){const n=Math.ceil(dt/.05);for(let i=0;i<n;i++)this.update(dt/n,paused);return;}if(!paused)this.clock+=dt;settle(this.travel,this.goal,dt,.55,this.calm);settle(this.yaw,this.targetYaw,dt,.13,this.calm);settle(this.pitch,this.targetPitch,dt,.13,this.calm);for(let i=0;i<5;i++){if(this.clock-this.explodeAt<(this.exploded?i:4-i)*.035)continue;const s=this.lifts[i],target=this.exploded?1:0;if(this.calm){s.x=target;s.v=0;continue;}for(let k=0;k<4;k++){const h=dt/4;s.v+=(64*(target-s.x)-14.2*s.v)*h;s.x+=s.v*h;}}if(this.follow&&this.selected>=0){const point=this.cloud.position(this.selected);for(let i=0;i<3;i++)settle(this.focusPoint[i],point[i],dt,.27,this.calm);}this.cloud.update(this.calm);}
 camera(target,distance,yaw,pitch,fog){const eye=[target[0]+Math.sin(yaw)*Math.cos(pitch)*distance,target[1]+Math.sin(pitch)*distance,target[2]+Math.cos(yaw)*Math.cos(pitch)*distance],vp=multiply(perspective(.72,this.w/this.h,Math.max(.001,distance/2000),Math.max(100,distance*20)),lookAt(eye,target));this.gpu.camera(vp,eye,fog);this.cameraState={target,eye,vp};return this.cameraState;}
 drawGroup(group,alpha=1,material=0,dy=0){let data=group.data;if(dy){data=group.data.slice();for(let i=0;i<group.count;i++)data[i*STRIDE+1]+=dy;}this.gpu.upload(group.mesh,data,group.count);this.gpu.draw(group.mesh,group.count,alpha,material,!group.transparent&&alpha>.9);}
 render(){this.w=this.canvas.clientWidth;this.h=this.canvas.clientHeight;const ratio=Math.min(devicePixelRatio||1,1.5);if(this.overlay.width!==Math.round(this.w*ratio)||this.overlay.height!==Math.round(this.h*ratio)){this.overlay.width=Math.round(this.w*ratio);this.overlay.height=Math.round(this.h*ratio);}const c=this.ctx;c.setTransform(ratio,0,0,ratio,0,0);c.clearRect(0,0,this.w,this.h);if(this.lost){c.fillStyle='#d1dcc6';c.font='16px system-ui';c.fillText('Графический контекст потерян. Ожидаем восстановления…',30,80);return;}
 const q=this.travel.x,blend=smooth(1.32,1.88,q);this.gpu.begin(this.model.time,this.ratio);this.gpu.fields(this.model.fields,this.field);this.bodyLabels=[];
 if(this.inspect){this.renderCell();return;}
 if(blend<.998){const target=mix3([0,-.32,0],ORGAN_POINTS[this.model.site.id],smooth(0,1,q)),distance=q<1?mix(9.7,2.6,smooth(0,1,q)):2.6*Math.exp(-(q-1)*3.8);const cam=this.camera(target,distance*(this.w<650?2.3:1),this.yaw.x,this.pitch.x,.022);
  for(const group of this.bodyGroups){const isSelected=group.site===this.model.site.id;const a=group.site==='stars'?(1-smooth(0,.8,q)):(group.site==='floor'?1-smooth(.3,.9,q):1-(isSelected?0:smooth(.6,1.5,q)*.76));this.drawGroup(group,(1-blend)*a);}
  const shellOpacity=(1-smooth(.08,1.3,q))*.32;this.drawGroup(this.skinGroup,(1-blend)*shellOpacity,1);
  if(q<1.25)for(const s of SITES){const p=project(ORGAN_POINTS[s.id],cam.vp,this.w,this.h);if(p&&p.z<1){this.bodyLabels.push({...p,id:s.id,name:s.name});}}
  this.drawBodyLabels(q);
 }
 if(blend>.001){this.gpu.gl.clear(this.gpu.gl.DEPTH_BUFFER_BIT);const proximity=clamp(q-2,0,1),target=[this.pan[0],4+this.pan[1]+this.lifts[4].x*3,this.pan[2]];if(this.follow&&this.selected>=0){for(let i=0;i<3;i++)target[i]=this.focusPoint[i].x;}
  const distance=q<2?mix(110,51,smooth(1.32,2,q)):mix(51,8,smooth(2,3,q));const pitch=clamp(this.pitch.x+.44,.06,1.35);this.camera(target,distance,this.yaw.x,pitch,.014);
  this.drawGroup(this.capillaryGroup,blend);
  for(const group of this.tissueGroups.filter(g=>!g.transparent))this.drawGroup(group,blend,0,this.lifts[group.layer||0].x*(group.layer||0)*3.8);
  this.renderCloud(blend);this.renderParticles(blend);
  if(this.showConnections)this.connections(blend);
  for(const group of this.tissueGroups.filter(g=>g.transparent))this.drawGroup(group,blend,0,this.lifts[group.layer||0].x*(group.layer||0)*3.8);
  for(let i=1;i<Math.min(4,this.model.site.layers.length);i++){const z=i*1.4+this.lifts[i].x*i*3.8;writeInstance(this.gelData,0,[0,z,0],[1,1,1],'#659e95',undefined,.14);this.gpu.upload(this.gel,this.gelData,1);this.gpu.draw(this.gel,1,blend,2,false);}
  this.drawMicroLabels();
 }
 }
 renderCloud(alpha){const counts={};for(const k in this.speciesBuffers)counts[k]=0;const cloud=this.cloud,t=this.calm?0:this.model.time;
 for(let i=0;i<cloud.count;i++){const id=cloud.ids[cloud.species[i]],s=byId[id],type=s.shape,buf=this.speciesBuffers[type];if(!buf)continue;const vp=this.cameraState.vp,x=cloud.x[i],y=cloud.y[i]+this.lifts[3].x*11.4,z=cloud.z[i],cw=vp[3]*x+vp[7]*y+vp[11]*z+vp[15],cx=vp[0]*x+vp[4]*y+vp[8]*z+vp[12],cy=vp[1]*x+vp[5]*y+vp[9]*z+vp[13];if(cw<.01||Math.abs(cx)>cw+2||Math.abs(cy)>cw+2)continue;const mass=this.model.pop[id]/this.model.initial[id];const size=cloud.size[i]*clamp(Math.sqrt(mass),.24,1.5);const a=clamp(mass,.06,1)*(this.selectedSpecies&&this.selectedSpecies!==id?.22:1);const phase=cloud.phase[i],angle=cloud.angle[i]+(this.calm?0:Math.sin(t*.13+phase)*.1),q=quatFromY([Math.cos(angle),Math.sin(phase)*.3,Math.sin(angle)]),pos=[cloud.x[i],cloud.y[i]+this.lifts[3].x*11.4,cloud.z[i]];writeInstance(buf,counts[type]++,pos,[size,size,size],s.color,q,a,cloud.activity[i]*.6,phase);}
 for(const[type,count]of Object.entries(counts)){if(count){this.gpu.upload(this.microMeshes[type],this.speciesBuffers[type],count);this.gpu.draw(this.microMeshes[type],count,alpha);}}
 // Flagella are genuine 3D filaments on a bounded set of motile representatives.
 let n=0;for(let i=0;i<Math.min(cloud.count,600);i++){const s=byId[cloud.ids[cloud.species[i]]];if(!s.flagellum)continue;const pos=cloud.position(i),angle=cloud.angle[i],r=cloud.size[i];for(let j=0;j<8;j++){const u=j*.16;writeInstance(this.miscBuffer,n++,[pos[0]+Math.cos(angle)*(.5+u),pos[1]+Math.sin(j*.9+t*2)*.13+this.lifts[3].x*11.4,pos[2]+Math.sin(angle)*(.5+u)],[r*.10,r*.1,r*.1],s.color);}}
 this.gpu.upload(this.particle,this.miscBuffer,n);this.gpu.draw(this.particle,n,alpha);
 if(this.selected>=0){const p=cloud.position(this.selected);p[1]+=this.lifts[3].x*11.4;writeInstance(this.one,0,p,[.9,.9,.9],'#d8e4ac',undefined,1,1);this.gpu.upload(this.ring,this.one,1);this.gpu.draw(this.ring,1,alpha);}
 }
 renderParticles(alpha){let count=0;const t=this.model.time;for(const d of this.cloud.deposits){const age=this.calm?0:t-d.at;for(let i=0;i<85;i++){const phase=i*2.399,spread=1+age*.21,r=Math.sqrt(i/85)*spread*3,pos=[d.pos[0]+Math.cos(phase)*r,d.pos[1]+Math.cos(i*3.1)*2-age*.1,d.pos[2]+Math.sin(phase)*r],size=d.kind==='fiber'?[.045,.3,.045]:[.09,.09,.09];writeInstance(this.particleBuffer,count++,pos,size,d.kind==='fiber'?'#e6c678':'#dfabc4',quatFromY([Math.cos(phase),1,Math.sin(phase)]),clamp(1-age/28),.7);}}
 const evt=this.model.events.at(-1);if(evt&&evt.kind==='antibiotic'){const age=t-evt.time,env=this.calm?0:burst(age,.08,5);for(let i=0;i<180;i++){const a=i*2.399,y=(i%13)/13*12,r=age*3;writeInstance(this.particleBuffer,count++,[Math.cos(a)*r,y,Math.sin(a)*r],[.06,.06,.06],'#d59ada',undefined,env,.8);}}
 if(this.model.site.id==='colon'){for(let i=0;i<75;i++){const x=Math.sin(i*13.2)*24,z=Math.cos(i*9.1)*24,y=1+((i*.71-(this.calm?0:t)*.5)%10+10)%10;writeInstance(this.particleBuffer,count++,[x,y,z],[.035,.12,.035],'#bbd885',undefined,this.model.butyrate,.8);}}
 this.gpu.upload(this.particle,this.particleBuffer,count);this.gpu.draw(this.particle,count,alpha,0,false);
 }
 connections(alpha){let n=0;const ids=['bact','faec','akk','meth'],cloud=this.cloud;for(let i=0;i<ids.length-1;i++){const a=cloud.ids.indexOf(ids[i]),b=cloud.ids.indexOf(ids[i+1]);let from=-1,to=-1;for(let j=0;j<cloud.count;j++){if(from<0&&cloud.species[j]===a)from=j;if(to<0&&cloud.species[j]===b)to=j;}if(from<0||to<0)continue;for(let k=0;k<32;k++){const u=((k/32+(this.calm?0:this.model.time)*.08)%1),p=mix3(cloud.position(from),cloud.position(to),u);p[1]+=Math.sin(u*Math.PI)*3+this.lifts[3].x*11.4;writeInstance(this.miscBuffer,n++,p,[.035,.035,.035],'#d9d999',undefined,.7,.8);}}
 this.gpu.upload(this.particle,this.miscBuffer,n);this.gpu.draw(this.particle,n,alpha,0,false);
 }
 renderCell(){if(this.mechanism){this.renderMechanism();return;}const id=this.inspectedSpecies||'faec',s=byId[id],camera=this.camera([0,1.3,0],13,this.yaw.x,.25+this.pitch.x,.012),euk=['Грибы','Протисты'].includes(s.group);
 if(s.group==='Вирусы'){writeInstance(this.one,0,[0,1,0],[1.1,1.1,1.1],s.color);this.gpu.upload(this.microMeshes.phage,this.one,1);this.gpu.draw(this.microMeshes.phage,1);this.label('Капсид и генетический материал',[0,3,0],s.color);this.label('Хвост: узнавание хозяина',[0,-.5,0],s.color);return;}
 const shellPositions=[];for(let i=0;i<3;i++){const y=this.lifts[i+1].x*i*1.45,x=0;writeInstance(this.one,0,[x,y,0],[1-i*.1,1.15-i*.07,1-i*.1],s.color,undefined,i===0?.24:.18);this.gpu.upload(this.cellShell,this.one,1);this.gpu.draw(this.cellShell,1,1,1,false);shellPositions.push([1,y,0]);}
 writeInstance(this.one,0,[0,0,0],[1,1,1],'#d2c190',undefined,1,.5);this.gpu.upload(this.dna,this.one,1);this.gpu.draw(this.dna,1);
 if(euk){writeInstance(this.one,0,[0,0,0],[.65,.85,.65],'#aa9bc5',undefined,.5);this.gpu.upload(this.ball,this.one,1);this.gpu.draw(this.ball,1,1,1,false);}
 if(s.plasmid){writeInstance(this.one,0,[.9,-.65,.2],[.5,.5,.5],'#bbdb9a',undefined,1,.6);this.gpu.upload(this.plasmid,this.one,1);this.gpu.draw(this.plasmid,1);this.label('Плазмида: возможна у этого штамма',[.9,-.65,.2],'#bbdb9a');}
 ['Цитоплазма и '+(euk?'ядро':'нуклеоид'),'Клеточная мембрана',s.group==='Протисты'?'Наружная поверхность':'Клеточная оболочка'].forEach((text,i)=>this.label(text,shellPositions[i],s.color));
 }
 renderMechanism(){const t=this.calm?.8:this.clock-this.mechanismAt,env=this.calm?0:burst(t-1,.075,1.1);this.camera([0,0,0],16,this.yaw.x,.35+this.pitch.x,.008);const q=quatFromY([1,0,0]);
  for(const [x,color]of[[-3,'#7dcba7'],[3,'#b0a0d6']]){writeInstance(this.one,0,[x,0,0],[.85,1,.85],color,q,.45);this.gpu.upload(this.cellShell,this.one,1);this.gpu.draw(this.cellShell,1,1,1,false);}
  if(this.mechanism==='t6'){writeInstance(this.one,0,[-.9,0,0],[1,1-env*.55,1],'#dbc898',q,1,.2);this.gpu.upload(this.spring,this.one,1);this.gpu.draw(this.spring,1);writeInstance(this.one,0,[env*.9,0,0],[.06,1.3,.06],'#d9d993',q);this.gpu.upload(this.rod,this.one,1);this.gpu.draw(this.rod,1);this.label('Белковая оболочка сокращается',[-1,1,0]);this.label('Эффекторы → совместимый сосед',[2,0,0]);}
  else if(this.mechanism==='conj'){writeInstance(this.one,0,[0,0,0],[.08,1,.08],'#84b7a9',q);this.gpu.upload(this.rod,this.one,1);this.gpu.draw(this.rod,1);for(const x of[-3,3]){writeInstance(this.one,0,[x,0,0],[1,1,1],'#d5df9b',undefined,x<0?1:clamp(t/5),.6);this.gpu.upload(this.plasmid,this.one,1);this.gpu.draw(this.plasmid,1);}let n=0;for(let i=0;i<40*clamp(t/5);i++)writeInstance(this.miscBuffer,n++,[-1.7+i*.085,Math.sin(i*.6)*.08,.05],[.04,.04,.04],'#d9dea7',undefined,1,.8);this.gpu.upload(this.particle,this.miscBuffer,n);this.gpu.draw(this.particle,n);this.label('Донор сохраняет копию',[-3,1,0]);this.label('Цепь ДНК → достройка копии',[3,1,0]);}
  else{writeInstance(this.one,0,[-3,1.1,0],[.23,.23,.23],'#a7baf0');this.gpu.upload(this.microMeshes.phage,this.one,1);this.gpu.draw(this.microMeshes.phage,1);let n=0;for(let i=0;i<50;i++){const a=i*2.399,r=env*2;writeInstance(this.miscBuffer,n++,[-3+Math.cos(a)*r,Math.sin(a)*r,.1],[.06,.06,.06],'#aac6f3',undefined,env,.6);}this.gpu.upload(this.particle,this.miscBuffer,n);this.gpu.draw(this.particle,n);this.label('Только подходящий хозяин',[-3,1.8,0]);this.label('Иллюстрация, не расчёт полного цикла',[2,-1,0]);}
 }

 label(text,pos,color='#c4dba0'){const p=project(pos,this.cameraState.vp,this.w,this.h);if(!p||p.z>1)return;const c=this.ctx;c.font='11px system-ui';const width=c.measureText(text).width+20,x=clamp(p.x+24,8,this.w-width-8),y=p.y;c.strokeStyle=color+'88';c.lineWidth=.8;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(x,y-14);c.stroke();c.fillStyle='#102526ec';c.beginPath();c.roundRect(x,y-30,width,25,5);c.fill();c.fillStyle=color;c.fillText(text,x+10,y-13);}
 drawBodyLabels(q){if(q>.9)return;const c=this.ctx;for(const p of this.bodyLabels){const selected=p.id===this.model.site.id;c.fillStyle=selected?'#d7e7a1':'#abc8bb';c.beginPath();c.arc(p.x,p.y,selected?5:2.4,0,6.28);c.fill();if(selected){c.strokeStyle='#d7e7a16b';c.beginPath();c.arc(p.x,p.y,12,0,6.28);c.stroke();const side=p.x<this.w/2?-1:1;const tx=p.x+side*80;c.strokeStyle='#c1d4aa70';c.beginPath();c.moveTo(p.x+side*14,p.y);c.lineTo(tx,p.y-19);c.stroke();c.font='12px system-ui';c.textAlign=side<0?'right':'left';c.fillStyle='#d8e0c8';c.fillText(p.name,tx,p.y-28);c.textAlign='left';}}}
 drawMicroLabels(){if(this.exploded){this.model.site.layers.forEach((l,i)=>this.label(l,[-20,i*1.4+this.lifts[i].x*i*3.8,5]));}if(this.selected>=0){const pos=this.cloud.position(this.selected);pos[1]+=this.lifts[3].x*11.4;const s=byId[this.cloud.ids[this.cloud.species[this.selected]]];this.label(s.name+' · #'+this.selected,pos,s.color);}}
 pick(x,y){if(this.travel.x<1.1){const p=this.bodyLabels.reduce((best,p)=>{const d=Math.hypot(p.x-x,p.y-y);return d<26&&(!best||d<best.d)?{...p,d}:best;},null);return p?{site:p.id}:null;}if(this.travel.x<1.8||this.inspect)return null;const ray=rayFromCamera(x,y,this.w,this.h,this.cameraState.eye,this.cameraState.target,.72);let best=-1,nearest=Infinity;for(let i=0;i<this.cloud.count;i++){const pos=this.cloud.position(i);pos[1]+=this.lifts[3].x*11.4;const t=raySphere(ray,pos,Math.max(.23,this.cloud.size[i]*1.7));if(t<nearest){nearest=t;best=i;}}return best>=0?{agent:best}:null;}
 floorPoint(x,y){const r=rayFromCamera(x,y,this.w,this.h,this.cameraState.eye,this.cameraState.target,.72);if(Math.abs(r.dir[1])<.001)return[0,7,0];const t=(5-r.origin[1])/r.dir[1];return t>0?[clamp(r.origin[0]+r.dir[0]*t,-28,28),5,clamp(r.origin[2]+r.dir[2]*t,-28,28)]:[0,5,0];}
 focusAgent(i){this.selected=i;if(!this.follow){const target=this.cameraState?.target||[0,4,0];this.focusPoint.forEach((s,j)=>{s.x=target[j];s.v=0;});}this.follow=true;this.goal=2.88;this.targetPitch=.15;}
}
function instancePart(mesh,pos,scale,q){return{mesh,pos,scale,q};}
