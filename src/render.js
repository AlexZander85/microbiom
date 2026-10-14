import {iso,depthOf,slabOf,coil,pathOf} from '../iso-kit.mjs';
import {lathe,solidOf,frameAlong,ringBand,ribsOf,rodOut} from '../lathe.mjs';
import {tubePieces} from '../tube.mjs';
import {settle,burst} from '../gl.mjs';
import {paths,paint,rgb,paintTube} from './painter.js';
import {createFX} from './fx.js';
import {byId} from './data.js';
import {clamp} from './model.js';
const TAU=Math.PI*2;
const circle=(c,x,y,r,color)=>{c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=color;c.fill();};
export class Renderer{
 constructor(back,fx,front,model){
  this.back=back;this.front=front;this.bc=back.getContext('2d');this.c=front.getContext('2d');this.model=model;this.zoom={x:1,v:0};this.targetZoom=1;this.angle={x:43,v:0};this.targetAngle=43;this.lift=Array.from({length:5},()=>({x:0,v:0}));this.exploded=false;this.explodeAt=0;this.clock=0;this.selected=null;this.mode='biome';this.field=0;this.fxInterval=0;this.lastFx=-1;this.calm=false;this.cache=new Map();this.hits=[];this.layerHits=[];this.hoverLayer=-1;this.P={origin:[0,0],scale:2,azimuth:43,elevation:29};this.resize();
  this.fx=createFX(fx,this.P,this.w,this.h,()=>{this.fxError=true;});
  fx.addEventListener('webglcontextlost',e=>{e.preventDefault();this.fx=null;this.fxError=true;});
  fx.addEventListener('webglcontextrestored',()=>{this.fx=createFX(fx,this.P,this.w,this.h,()=>{this.fxError=true;});});
 }
 resize(){const rect=this.front.getBoundingClientRect();this.w=rect.width;this.h=rect.height;const dpr=Math.min(devicePixelRatio||1,1.75);for(const canvas of[this.back,this.front]){canvas.width=Math.round(this.w*dpr);canvas.height=Math.round(this.h*dpr);canvas.getContext('2d').setTransform(dpr,0,0,dpr,0,0);}this.cache.clear();}
 setExploded(value){this.exploded=value;this.explodeAt=this.clock;}
 update(dt){this.clock+=dt;settle(this.zoom,this.targetZoom,dt,.15,this.calm);settle(this.angle,this.targetAngle,dt,.11,this.calm);
  this.lift.forEach((s,i)=>{const order=this.exploded?i:4-i;if(this.clock-this.explodeAt<order*.035)return;const target=this.exploded?1:0;if(this.calm){s.x=target;s.v=0;return;}for(let k=0;k<4;k++){const h=dt/4;s.v+=(64*(target-s.x)-14.2*s.v)*h;s.x+=s.v*h;}});
 }
 localP(){return {...this.P,origin:[0,0],scale:1};}
 get(key,fn){if(!this.cache.has(key))this.cache.set(key,fn());return this.cache.get(key);}
 shape(id){return this.get(id,()=>{
  const s=byId[id],P=this.localP(),F=frameAlong([0,0,0],[1,.25,0]);let profile;
  if(s.shape==='cocci'||s.shape==='protist')profile=[[-2.6,0],[-2,1.8],[0,2.7],[2,1.8],[2.6,0]];
  else if(s.shape==='yeast')profile=[[-3.4,0],[-2.8,1.8],[0,2.8],[2.8,1.8],[3.4,0]];
  else profile=[[-5,0],[-4.2,1.7],[-3,2],[3,2],[4.2,1.7],[5,0]];
  if(s.shape==='oval')profile=profile.map(([x,r])=>[x*.62,r]);
  const body=paths(lathe(profile,F,P,{smooth:true,steps:24,rims:'none'}));
  const ribs=ribsOf(F,-3,3,2,9,P,{fade:[.1,.55],seams:true}).map(p=>({path:new Path2D(p.d),alpha:p.alpha}));
  const flag=s.flagellum?Array.from({length:17},(_,i)=>[4+i*.65,Math.sin(i*.6)*1.8,Math.cos(i*.6)*.5]):null;
  const tubes=flag?tubePieces(flag,.17,P,{spacing:.6,maxLength:5}).map(p=>({p:paths(p),mid:p.mid})):[];
  return {body,ribs,tubes};
 });}
 microbe(c,id,x,y,z,scale=1,alpha=1,detail=true){
  const s=byId[id],pos=iso([x,y,z],this.P),k=this.P.scale*scale;
  // Raster LOD compiled from the same cached Path2D geometry. The inspector still uses the source paths.
  if(!this.inSprite){
   const sprite=this.get('sprite-'+id,()=>{const canvas=document.createElement('canvas');canvas.width=320;canvas.height=240;const context=canvas.getContext('2d');const old=this.P;this.P={...old,origin:[120,120],scale:8};this.inSprite=true;this.microbe(context,id,0,0,0,1,1,true);this.inSprite=false;this.P=old;return canvas;});
   c.save();c.globalAlpha*=alpha;c.drawImage(sprite,pos[0]-120*k/8,pos[1]-120*k/8,320*k/8,240*k/8);c.restore();return pos;
  }
  c.save();c.translate(...pos);c.scale(k,k);c.globalAlpha*=alpha;
  if(s.shape==='phage'){
   c.strokeStyle=s.color;c.lineWidth=.55;c.beginPath();c.moveTo(0,-2);c.lineTo(0,4);for(let i=0;i<3;i++){c.moveTo(0,3);c.lineTo((i-1)*3,5);c.lineTo((i-1)*4,7);}c.stroke();
   c.beginPath();for(let i=0;i<6;i++){const a=i*TAU/6;c.lineTo(Math.cos(a)*2.5,Math.sin(a)*2.5-3);}c.closePath();c.fillStyle=rgb(s.color,.75);c.fill();c.stroke();c.beginPath();c.moveTo(-2,-4);c.lineTo(0,-1);c.lineTo(2,-4);c.stroke();
  }else if(s.shape==='spiral'){
   c.strokeStyle=rgb(s.color,.45);c.lineWidth=3.5;c.beginPath();for(let i=0;i<=30;i++)c.lineTo(-6+i*.4,Math.sin(i*.55)*2);c.stroke();c.strokeStyle=s.color;c.lineWidth=1.7;c.stroke();
  }else{
   const a=this.shape(id);for(const t of a.tubes)paintTube(c,t.p,s.color);
   paint(c,a.body,s.color);
   if(s.shape==='cocci'){c.save();c.translate(-2,-4);paint(c,a.body,s.color);c.translate(4,1);paint(c,a.body,s.color);c.restore();}
   if(s.shape==='branch'){c.save();c.rotate(-.7);c.translate(-3,-2);c.scale(.7,.65);paint(c,a.body,s.color);c.restore();}
   if(s.shape==='yeast'){c.save();c.translate(3,-3);c.scale(.45,.45);paint(c,a.body,s.color);c.restore();}
   if(detail){c.lineWidth=.22;for(const r of a.ribs){c.globalAlpha=alpha*r.alpha*.25;c.strokeStyle='#ffffff';c.stroke(r.path);}c.globalAlpha=alpha;for(let j=0;j<4;j++)circle(c,-2+j*1.1,Math.sin(j*2)*.7,.25,'#efffffb0');}
   if(['yeast','protist'].includes(s.shape))circle(c,0,-.3,1.05,'#594c9777');
  }
  c.restore();return pos;
 }
 render(){
  const c=this.c,b=this.bc,w=this.w,h=this.h;c.clearRect(0,0,w,h);this.hits=[];this.layerHits=[];
  const angle=this.angle.x;
  if(Math.abs((this.cachedAngle??-100)-angle)>.02){this.cache.clear();this.cachedAngle=angle;}
  this.P={origin:[w*.5,h*(.62+this.lift[4].x*.085)],scale:Math.min(w/260,h/184)*this.zoom.x,azimuth:angle,elevation:29};
  if(this.mode==='body'){b.clearRect(0,0,w,h);this.backKey=null;this.fx?.clear();this.drawBody(c,w/2-95,h*.09,190,h*.79,true);return;}
  if(this.mode==='cell'){b.clearRect(0,0,w,h);this.backKey=null;this.fx?.clear();this.drawCell(c);return;}
  const P=this.P,layers=this.model.site.layers,n=layers.length;
  const backKey=[w,h,P.scale.toFixed(3),P.azimuth.toFixed(2),...this.lift.map(s=>s.x.toFixed(3)),this.model.site.id].join('/');
  const dirty=backKey!==this.backKey;this.backKey=backKey;if(dirty)b.clearRect(0,0,w,h);
  // The geometry is cached in local projected coordinates; world translation stays continuous.
  const slab=this.get('slab',()=>paths(slabOf({x:-76,y:-57,w:152,d:114,r:7},0,4,this.localP(),6,1)));
  const drawSlab=(z,color,alpha,ctx=b)=>{if(ctx===b&&!dirty)return;ctx.save();ctx.translate(...iso([0,0,z],P));ctx.scale(P.scale,P.scale);paint(ctx,slab,color,alpha);ctx.restore();};
  // Ambient shadow and floor grid provide spatial orientation, not measured chemistry.
  if(dirty){
  const origin=iso([0,0,-14],P);b.save();b.translate(...origin);b.scale(1,.32);const halo=b.createRadialGradient(0,0,10,0,0,w*.38);halo.addColorStop(0,'#27675835');halo.addColorStop(1,'#06141600');b.fillStyle=halo;b.fillRect(-w/2,-h,w,h*2);b.restore();
  b.strokeStyle='#89b4a410';b.lineWidth=.7;for(let i=-100;i<=100;i+=20){b.beginPath();b.moveTo(...iso([i,-90,-15],P));b.lineTo(...iso([i,90,-15],P));b.stroke();b.beginPath();b.moveTo(...iso([-100,i,-15],P));b.lineTo(...iso([100,i,-15],P));b.stroke();}
  drawSlab(-13,'#244e50',.98);
  const base=this.model.site.id==='mouth'?'#96a4a1':this.model.site.id==='skin'?'#947b70':'#887073';
  const cell=this.get('tissueCell',()=>paths(solidOf([[0,3.7],[2,4.1],[9,4.1],[12,3.6]],frameAlong([0,0,0],[0,0,1]),this.localP(),{steps:14,smooth:true,rims:'none'})));
  const cells=[];for(let x=-68;x<=68;x+=9)for(let y=-48;y<=48;y+=9)cells.push([x,y,-9]);cells.sort((a,b)=>depthOf(a,P)-depthOf(b,P));
  const cellSprite=color=>this.get('cellSprite'+color,()=>{const cv=document.createElement('canvas');cv.width=100;cv.height=140;const cc=cv.getContext('2d');cc.translate(50,110);cc.scale(5,5);paint(cc,cell,color,.95);return cv;});
  for(const p of cells){const q=iso(p,P),goblet=(Math.round(p[0]+p[1])%7===0)&&this.model.site.id==='colon';b.drawImage(cellSprite(goblet?'#659f9b':base),q[0]-10*P.scale,q[1]-22*P.scale,20*P.scale,28*P.scale);if(Math.round(p[0])%3===0){const top=iso([p[0],p[1],4],P);circle(b,...top,1.1,'#93d9c0a0');}}
  }
  const colors=['#777473','#649b93','#4b9686','#589d83','#79a994'];
  for(let i=1;i<n;i++){
   const z=4+i*6+this.lift[i].x*i*12;
   drawSlab(z,colors[i],i===1?.18:.1);
   const mid=iso([72,48,z],P);this.layerHits.push({index:i,x:mid[0],y:mid[1],z});
   if(this.lift[i].x>.2){this.callout(c,layers[i],mid[0],mid[1],Math.min(w-22,mid[0]+55),mid[1]-2,colors[i],this.hoverLayer===i);}
  }
  const zAgent=24+this.lift[Math.min(3,n-1)].x*(Math.min(3,n-1)*12);
  if(this.fx){const moving=Math.abs(this.angle.v)>.02||Math.abs(this.zoom.v)>.001||this.lift.some(s=>Math.abs(s.v)>.001);if(moving||this.clock-this.lastFx>=this.fxInterval){this.fx.draw(this.model,P,w,h,17+this.lift[2].x*24,this.field,1-this.lift[4].x*.7);this.lastFx=this.clock;}}
  else{drawSlab(17,'#377c79',.08);}
  // Nutrient polymers, not muscle fibres. Cached 3-D tube segments, depth sorted.
  if(this.model.site.id==='colon'){
   const tubes=this.get('fiber',()=>tubePieces(Array.from({length:21},(_,i)=>[-15+i*1.5,Math.sin(i*.55)*2,Math.cos(i*.55)*1.3]),.65,this.localP(),{spacing:1,maxLength:5,rings:{pitch:2.5,twist:1,fade:[.1,.55]}}).map(t=>({p:paths(t),mid:t.mid})).sort((a,b)=>depthOf(a.mid,P)-depthOf(b.mid,P)));
   for(let j=0;j<4;j++){c.save();c.globalAlpha=clamp(this.model.food*.8,.1,.8);c.translate(...iso([-44+j*25,-22+(j%2)*45,zAgent+18],P));c.scale(P.scale,P.scale);for(const t of tubes)paintTube(c,t.p,'#d1b16c');c.restore();}
  }
  const visible=this.model.agents.map(a=>({a,z:zAgent+(a.z-24)+(this.calm?0:Math.sin(this.model.time*.6+a.phase)*.6)})).sort((a,b)=>depthOf([a.a.x,a.a.y,a.z],P)-depthOf([b.a.x,b.a.y,b.z],P));
  for(const {a,z}of visible){const ratio=this.model.pop[a.species]/this.model.initial[a.species];const scale=clamp(Math.sqrt(ratio),.4,1.3)*a.weight*(byId[a.species].shape==='protist'?1.45:1);const alpha=clamp(ratio,.08,1);const q=this.microbe(c,a.species,a.x,a.y,z,scale,alpha,this.zoom.x>1.3);this.hits.push({a,x:q[0],y:q[1],radius:Math.max(11,P.scale*6*scale)});
   if(a.id===this.selected){c.strokeStyle=byId[a.species].color;c.lineWidth=1.3;c.beginPath();c.ellipse(q[0],q[1]+9,19*scale,8*scale,0,0,TAU);c.stroke();}
   if(a.invader){c.strokeStyle='#f6bd81';c.lineWidth=.8;c.strokeRect(q[0]-9,q[1]-9,18,18);}
  }
  for(const e of this.model.events){const age=this.model.time-e.time,env=this.calm?0:burst(age,.075,1.4);if(e.kind==='crossfeed'&&age<3){const a=iso([e.from.x,e.from.y,zAgent],P),end=iso([e.to.x,e.to.y,zAgent],P);c.strokeStyle='#a4d79630';c.setLineDash([2,5]);c.beginPath();c.moveTo(...a);c.quadraticCurveTo((a[0]+end[0])/2,Math.min(a[1],end[1])-24,...end);c.stroke();c.setLineDash([]);const t=clamp(age/3),x=a[0]+(end[0]-a[0])*t,y=a[1]+(end[1]-a[1])*t-Math.sin(t*Math.PI)*24;circle(c,x,y,2.5,'#dfeb9d');}if(e.kind==='lysis'){const q=iso([e.x,e.y,zAgent],P);c.strokeStyle=`rgba(174,199,255,${env})`;c.beginPath();c.arc(...q,8+age*14,0,TAU);c.stroke();}}
  if(!this.exploded&&this.zoom.x<1.35&&w>500){
   const q=iso([-52,-24,zAgent],P);this.callout(c,'Живое сообщество',q[0],q[1],Math.max(20,q[0]-92),q[1]-64,'#b1d8be');
   const r=iso([60,48,0],P);this.callout(c,this.model.site.layers[0].split(' и ')[0],r[0],r[1],Math.min(w-24,r[0]+60),r[1]+37,'#bda6aa');
  }
  if(this.selected){const hit=this.hits.find(h=>h.a.id===this.selected);if(hit){const s=byId[hit.a.species];this.bubble(c,s.quote||s.role,hit.x,hit.y-28,s.color);}}
  const metric=this.model.site.sparse?'Численность увеличена для наглядности':'Размеры и численность показаны условно';
  c.font='10px system-ui';c.fillStyle='#809991';c.textAlign='left';c.fillText(metric,22,h-20);c.textAlign='right';if(w>500)c.fillText(this.fx?'ОБЪЁМНАЯ СЦЕНА · WEBGL + CANVAS':'CANVAS · БЕЗ WEBGL',w-22,h-20);
 }
 callout(c,text,x,y,ex,ey,color,lit=false){c.save();c.strokeStyle=color;c.globalAlpha=lit?1:.65;c.lineWidth=.7;c.beginPath();c.moveTo(x,y);c.lineTo(ex,ey);c.lineTo(ex+(ex>x?-12:12),ey);c.stroke();circle(c,x,y,2,color);c.font=`${lit?'600':'400'} 11px system-ui`;c.fillStyle=lit?'#fff':color;c.textAlign=ex>x?'right':'left';c.fillText(text,ex,ey-8);c.restore();}
 bubble(c,text,x,y,color){c.save();c.font='11px system-ui';const width=Math.min(this.w-32,c.measureText(text).width+24);x=clamp(x-width/2,16,this.w-width-16);y=Math.max(30,y);c.fillStyle='#132d2bf5';c.strokeStyle=color+'70';c.beginPath();c.roundRect(x,y-24,width,30,7);c.fill();c.stroke();c.fillStyle='#edf5e9';c.textAlign='center';c.fillText(text,x+width/2,y-5,width-16);c.restore();}
 pick(x,y){return [...this.hits].reverse().find(h=>Math.hypot(h.x-x,h.y-y)<h.radius)?.a;}
 drawCell(c){
  const id=this.cellSpecies||'faec',s=byId[id],w=this.w,h=this.h;
  this.P={origin:[w*.43,h*.64],scale:Math.min(w/120,h/94)*this.zoom.x,azimuth:this.angle.x,elevation:29};const P=this.P;
  const profile=[[-22,0],[-20,7],[-15,9],[15,9],[20,7],[22,0]],shell=paths(lathe(profile,frameAlong([0,0,0],[1,0,0]),{...P,origin:[0,0]},{smooth:true,steps:48,rims:'none'}));
  if(s.group==='Вирусы'){
   this.microbe(c,id,0,0,0,9,1);this.callout(c,'Капсид с генетическим материалом',w*.43,h*.64-120,w-24,h*.3,s.color);this.callout(c,'Хвост и структуры узнавания хозяина',w*.43,h*.64,w-24,h*.66,s.color);return;
  }
  const labels=s.group==='Грибы'||s.group==='Протисты'?['Цитоплазма и ядро','Клеточная мембрана',s.group==='Грибы'?'Клеточная стенка':'Наружная поверхность']:s.group==='Археи'?['Цитоплазма и ДНК','Особая мембрана архей','Оболочка (без бактериального муреина)']:['Цитоплазма и нуклеоид','Клеточная мембрана','Клеточная стенка'];
  // A deliberately labelled generic cutaway. No universal capsule or bacterial nucleus.
  for(let i=0;i<3;i++){
   const z=i*2+this.lift[i+1].x*i*15;const q=iso([0,0,z],P);c.save();c.translate(...q);c.scale(1-i*.06,1-i*.06);paint(c,shell,i===0?'#688d8d':s.color,i===0?.35:.19);c.restore();const a=iso([20,0,z],P);this.callout(c,labels[i],...a,w-22,a[1]-(this.exploded?0:i*17),s.color);
  }
  const euk=s.group==='Грибы'||s.group==='Протисты';const DNA=Array.from({length:47},(_,i)=>[Math.cos(i/46*TAU)*(euk?3:13),Math.sin(i/46*TAU)*(euk?2:5),2+Math.sin(i*1.9)]);
  for(const t of tubePieces(DNA,.32,P,{spacing:1,maxLength:9})){paintTube(c,paths(t),'#e4ce89');}
  if(s.group==='Грибы'||s.group==='Протисты'){const q=iso([0,0,2],P);circle(c,...q,P.scale*4,'#b4a2dcaa');this.callout(c,'Ядро (у эукариот)',...q,28,h*.44,'#d3b2eb');}
  if(s.plasmid){paint(c,paths(ringBand(-.1,.1,2.5,2.8,frameAlong([8,3,3],[0,0,1]),P,{steps:36})), '#a5e1a2');const q=iso([8,3,3],P);this.callout(c,'Возможная плазмида · не у всех штаммов',...q,26,h*.8,'#bae79f');}
  if(s.flagellum){const points=Array.from({length:45},(_,i)=>[21+i*.7,Math.sin(i*.42)*2,Math.cos(i*.42)*2]);for(const t of tubePieces(points,.3,P,{spacing:1,maxLength:6}))paintTube(c,paths(t),s.color);}
  c.fillStyle='#8ea9a2';c.font='11px system-ui';c.textAlign='left';c.fillText('Учебный разрез · пропорции внутренних структур условны',22,h-23);
 }
 drawBody(c,x,y,w,h,large=false){
  c.save();c.translate(x,y);c.scale(w/160,h/400);
  const body=new Path2D('M66 64 C50 70 38 77 33 100 L12 204 Q9 217 18 221 Q25 223 30 209 L52 136 L48 221 Q48 246 55 270 L54 371 Q50 385 38 391 Q37 397 59 395 Q72 395 72 380 L80 285 L87 380 Q87 395 101 395 Q123 397 122 391 Q111 385 107 371 L106 270 Q113 245 112 221 L108 136 L130 209 Q136 223 143 221 Q152 217 148 204 L127 100 Q122 77 95 64 L94 51 Q104 44 103 24 Q102 1 80 1 Q58 1 57 24 Q56 44 66 51 Z');
  const grad=c.createLinearGradient(0,0,160,0);grad.addColorStop(0,'#355a4d30');grad.addColorStop(.5,'#90b59a28');grad.addColorStop(1,'#355a4d30');c.fillStyle=grad;c.fill(body);c.strokeStyle='#83ac9060';c.lineWidth=1;c.stroke(body);
  // Schematic anatomy: body is an orientation map, not diagnostic anatomy.
  c.strokeStyle='#a5c4a125';c.lineWidth=.5;for(let yy=105;yy<170;yy+=11){c.beginPath();c.ellipse(80,yy,29,8,0,0,TAU);c.stroke();}
  c.fillStyle='#70aea638';c.beginPath();c.ellipse(65,119,13,31,.2,0,TAU);c.fill();c.beginPath();c.ellipse(96,119,13,31,-.2,0,TAU);c.fill();
  c.strokeStyle='#9fc3a35c';c.lineWidth=2;c.beginPath();c.moveTo(80,48);c.lineTo(80,147);c.quadraticCurveTo(107,148,98,171);c.quadraticCurveTo(90,183,76,169);c.stroke();
  c.strokeStyle='#d1b881a0';c.lineWidth=4;c.lineCap='round';c.beginPath();c.moveTo(61,221);c.lineTo(55,189);c.quadraticCurveTo(53,182,64,182);c.lineTo(101,182);c.lineTo(104,217);c.lineTo(86,226);c.lineTo(82,241);c.stroke();
  c.strokeStyle='#83b4a66a';c.lineWidth=2;c.beginPath();for(let i=0;i<4;i++){c.moveTo(64,190+i*7);c.bezierCurveTo(101,184+i*7,66,202+i*7,97,196+i*7);}c.stroke();
  const points=[['nose',80,35],['mouth',80,48],['lung',104,120],['skin',123,149],['stomach',97,161],['colon',57,196],['small',80,205],['urinary',87,241],['vagina',80,261]];
  this.bodyHits=[];
  for(const [id,px,py]of points){const selected=this.model.site.id===id;circle(c,px,py,selected?6:3,selected?'#c6de9a':'#adc5a7');if(selected){c.strokeStyle='#c4e4a450';c.lineWidth=1;c.beginPath();c.arc(px,py,11,0,TAU);c.stroke();}this.bodyHits.push({id,x:x+px*w/160,y:y+py*h/400});}
  c.restore();
  if(large){c.fillStyle='#91aba4';c.font='12px system-ui';c.textAlign='center';c.fillText('Выберите место обитания на карте или в списке слева',this.w/2,this.h-20);}
 }
}
// Independent explanatory mechanism diagram; it does not claim these traits for every species.
export function drawMechanism(canvas,kind,time,calm=false){
 const c=canvas.getContext('2d'),w=canvas.clientWidth||700,h=canvas.clientHeight||280,dpr=Math.min(devicePixelRatio||1,1.5);if(canvas.width!==w*dpr){canvas.width=w*dpr;canvas.height=h*dpr;}c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
 const P={origin:[w*.5,h*.62],scale:Math.min(w/105,4),azimuth:36,elevation:25};
 const envelope=calm?0:burst(time-1,.075,1.4),F=frameAlong([-38,0,0],[1,0,0]);
 const body=(pos,color)=>paint(c,paths(lathe([[-13,0],[-11,6],[-7,7],[7,7],[11,6],[13,0]],frameAlong(pos,[1,0,0]),P,{smooth:true,steps:28,rims:'none'})),color,.6);
 body([-24,0,0],'#81c9ac');body([24,0,0],'#b5a0d7');
 if(kind==='t6'){
  const spring=coil(-7,8-envelope*6,[0,0],1.8,7,'x',P);c.strokeStyle='#d9d9a8';c.lineWidth=1.2;c.stroke(new Path2D(spring.back));
  const rod=rodOut(frameAlong([0,0,0],[1,0,0]),-9,13,.5,P,{stroke:envelope*8});c.save();c.clip(new Path2D(rod.clip));const delta=iso([envelope*8,0,0],{...P,origin:[0,0]});c.translate(...delta);paint(c,paths(rod.paths),'#d8c77c');c.restore();c.stroke(new Path2D(spring.front));
 }else if(kind==='conj'){
  const points=[[-13,0,0],[-7,1,1],[0,0,2],[7,-1,1],[13,0,0]];for(const p of tubePieces(points,.65,P,{spacing:1,maxLength:5}))paintTube(c,paths(p),'#97c8b5');
  for(const x of[-24,24])paint(c,paths(ringBand(-.1,.1,3,3.5,frameAlong([x,0,8],[0,0,1]),P)), '#d4d88f',x<0?1:clamp(time/5));
  const progress=calm?.5:clamp(time/5);c.strokeStyle='#ede4a4';c.lineWidth=2;c.beginPath();for(let i=0;i<40*progress;i++)c.lineTo(...iso([-13+i*.66,Math.sin(i*.6)*.55,2],P));c.stroke();
 }else{
  const q=iso([-24,0,9],P);circle(c,...q,8,'#a9c6fa');c.strokeStyle='#a9c6fa';c.beginPath();c.moveTo(q[0],q[1]);c.lineTo(q[0],q[1]+16);c.stroke();c.strokeStyle=`rgba(154,185,245,${envelope})`;c.beginPath();c.arc(...q,10+Math.max(0,time-1)*24,0,TAU);c.stroke();
 }
 c.font='12px system-ui';c.textAlign='center';c.fillStyle='#b4c8bc';c.fillText(kind==='conj'?'Донор сохраняет свою копию':kind==='t6'?'Сокращение белковой оболочки, а не металлическая пружина':'Обобщённый литический цикл; хозяин должен быть совместим',w/2,h-18);
}
