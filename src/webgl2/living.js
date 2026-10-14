import {RepresentativeCloud} from './cloud.js';
import {byId} from '../data.js';
import {clamp,rng} from '../model.js';
import {heightAt} from './geometry.js';

export const LIVE_COLORS={faec:'#ffd052',bact:'#25d6a0',akk:'#b28aff',bif:'#44caff',meth:'#ff8bbc',coli:'#ff8b59',cand:'#ed80e7',phage:'#81a5ff',blast:'#c6e85c',strep:'#ffbd59',epid:'#55d5c4',cuti:'#eb9766',mala:'#e3acfc',lacto:'#5beab9',hp:'#ff7991',cdiff:'#daa9ff'};
export const liveColor=id=>LIVE_COLORS[id]||byId[id]?.color||'#c6e85c';
const lines={
 faec:['Из обеда соседей делаю бутират!','Бутират — топливо для клеток кишки.'],
 bact:['Разбираю волокна — угощаю соседей!','Мои продукты пригодятся соседям.'],
 akk:['Моя ниша — рядом со слизью.','Использую некоторые сахара слизи.'],
 bif:['Из сахаров получаются ацетат и лактат!','Я не плаваю: меня переносит среда.'],
 meth:['Использую водород соседей!','Я архея, а не бактерия.'],
 coli:['У меня есть жгутики — могу плыть!','Роль зависит от штамма и места.'],
 cand:['Я гриб: умею образовывать почки.','Мой рост зависит от условий.'],
 phage:['Я фаг. Подходит не любая бактерия!','Путешествую с потоком. Не каждая клетка мне подходит!'],
 blast:['Я протист. Мою роль ещё изучают.','Одна находка не означает болезнь.'],
 strep:['Использую сахар — образуются кислоты.','Мы можем жить в зубной биоплёнке.'],
 epid:['Живу на коже вместе с соседями.','Место обитания имеет значение!'],
 cuti:['Мне подходят липиды кожного сала.','У фолликула своя микросреда.'],
 mala:['Я гриб, использующий липиды.','Условия на коже бывают разными.'],
 lacto:['Из сахаров получается молочная кислота.','Здесь важна кислотность среды.'],
 hp:['Жгутики помогают двигаться в слизи.','Моя уреаза расщепляет мочевину.'],
 cdiff:['Некоторые штаммы образуют токсины.','Спора — отдельная форма покоя.']
};

// Visual teaching clock, deliberately independent of aggregate physiology.
// Non-motile cells are advected; only flagged taxa add active swimming/chemotaxis.
export class LivingCloud extends RepresentativeCloud {
 constructor(model,count=3600){super(model,count);}
 reset(count=this.requested){
  super.reset(count);this.visualTime=0;this.accumulator=0;this.events=[];this.eventSerial=0;this.nextEvent=1.5;
  this.randomVisual=rng(this.model.seed+83);this.vx=new Float32Array(this.capacity);this.vz=new Float32Array(this.capacity);
  this.heading=new Float32Array(this.capacity);this.heading.set(this.angle);this.contacts=0;this.steps=0;this.pushX=new Float32Array(this.capacity);this.pushZ=new Float32Array(this.capacity);this.clearance=new Float32Array(this.capacity);for(let i=0;i<this.count;i++)this.clearance[i]=this.baseY[i]-heightAt(this.model.site.id,this.baseX[i],this.baseZ[i]);
 }
 update(steady=false){
  // Activity can change on food placement even while paused; positions cannot.
  this.deposits=this.deposits.filter(d=>this.model.time-d.at<28);
  for(let i=0;i<this.count;i++){
   const s=byId[this.ids[this.species[i]]];let a=0;
   for(const d of this.deposits){
    const available=d.kind==='fiber'?['degrader','butyrate'].includes(s.guild):d.kind==='sugar'&&!['virus','methane'].includes(s.guild);
    const dx=d.pos[0]-this.x[i],dy=d.pos[1]-this.y[i],dz=d.pos[2]-this.z[i],r2=dx*dx+dy*dy+dz*dz;
    if(available&&r2<100)a=Math.max(a,(1-r2/100)*Math.exp(-(this.model.time-d.at)/18));
   }
   this.activity[i]=a;
  }
 }
 advance(seconds,{paused=false,calm=false,rate=1}={}){
  this.update();if(paused||calm)return;
  this.accumulator+=Math.min(.25,Math.max(0,seconds))*rate;
  let n=0;while(this.accumulator+1e-9>=1/30&&n++<30){this.step(1/30);this.accumulator-=1/30;}
  if(n>=30)this.accumulator=Math.min(this.accumulator,1/30);
 }
 step(dt){
  this.visualTime+=dt;const t=this.visualTime,site=this.model.site.id,attached=['skin','mouth','vagina'].includes(site);
  // A small spatial hash, not all-pairs attraction. Refreshed at 5 Hz; cached separation forces are applied at 30 Hz.
  const collisions=this.steps++%6===0,grid=new Map(),key=(x,z)=>Math.floor(x/2)+64*Math.floor(z/2);
  if(collisions)for(let i=0;i<this.count;i++){const k=key(this.x[i],this.z[i]);let bucket=grid.get(k);if(!bucket){bucket=[];grid.set(k,bucket);}bucket.push(i);}
  for(let i=0;i<this.count;i++){
   const s=byId[this.ids[this.species[i]]],p=this.phase[i],motile=!!s.flagellum,x=this.x[i],z=this.z[i];
   const flow=attached?.06:.85;
   let ux=flow*(Math.cos(z*.18+t*.12)*1.1),uz=flow*(Math.sin(x*.15+t*.08)*1.1);
   if(motile){const heading=this.heading[i]+Math.sin(t*.85+p)*.8;ux+=Math.cos(heading)*2.5;uz+=Math.sin(heading)*2.5;}
   // Coarse deterministic fluctuation: visible transport, not calibrated Brownian dynamics.
   ux+=Math.sin(t*1.6+p*3)*.2;uz+=Math.cos(t*1.4+p*4)*.2;
   if(motile)for(const d of this.deposits){if(d.kind!=='sugar')continue;const dx=d.pos[0]-x,dz=d.pos[2]-z,r=Math.hypot(dx,dz);if(r>1&&r<14){ux+=dx/r*2;uz+=dz/r*2;}}
   const cx=Math.floor(x/2),cz=Math.floor(z/2);let checks=0,px=0,pz=0;
   if(collisions)for(let gx=-1;gx<=1;gx++)for(let gz=-1;gz<=1;gz++){
    const bucket=grid.get(cx+gx+64*(cz+gz));if(!bucket)continue;
    for(const j of bucket){if(j===i||checks++>18)continue;const dy=this.y[i]-this.y[j];if(Math.abs(dy)>1)continue;
     const dx=x-this.x[j],dz=z-this.z[j],r2=dx*dx+dz*dz,min=this.size[i]+this.size[j];
     if(r2>.0001&&r2<min*min){const f=(min-Math.sqrt(r2))/Math.sqrt(r2)*2.5;px+=dx*f;pz+=dz*f;this.contacts++;}
    }
   }
   if(collisions){this.pushX[i]=px;this.pushZ[i]=pz;}ux+=this.pushX[i];uz+=this.pushZ[i];
   ux+=Math.max(0,-25-x)*.8-Math.max(0,x-25)*.8;uz+=Math.max(0,-25-z)*.8-Math.max(0,z-25)*.8;
   const blend=1-Math.exp(-dt*3);this.vx[i]+=(ux-this.vx[i])*blend;this.vz[i]+=(uz-this.vz[i])*blend;
   this.x[i]=clamp(x+this.vx[i]*dt,-30,30);this.z[i]=clamp(z+this.vz[i]*dt,-30,30);
   if(Math.abs(this.x[i])>29.8||Math.abs(this.z[i])>29.8){this.heading[i]+=dt*3;this.vx[i]-=Math.sign(this.x[i])*dt*4;this.vz[i]-=Math.sign(this.z[i])*dt*4;}
   const clearance=this.clearance[i];
   const y=heightAt(site,this.x[i],this.z[i])+clearance+Math.sin(t*.9+p)*.22;
   this.y[i]+=(y-this.y[i])*(1-Math.exp(-dt*4));
   this.angle[i]=Math.atan2(this.vz[i],this.vx[i]);
  }
  this.events=this.events.filter(e=>t-e.at<4.8);
  if(t>=this.nextEvent){this.nextEvent=t+1.6;this.makeEvent();}
 }
 makeEvent(){
  if(this.model.site.id!=='colon'||this.model.acetate<.06)return;
  // Choose local compatible pairs. Illustrative transfer does NOT modify model biomass.
  const start=Math.floor(this.randomVisual()*this.count);
  for(let k=0;k<Math.min(this.count,180);k++){
   const from=(start+k)%this.count,id=this.ids[this.species[from]];
   if(id!=='bact'&&id!=='bif')continue;
   let to=-1,best=144;
   for(let j=0;j<this.count;j++){if(this.ids[this.species[j]]!=='faec')continue;
    const r2=(this.x[from]-this.x[j])**2+(this.y[from]-this.y[j])**2+(this.z[from]-this.z[j])**2;
    if(r2<best){best=r2;to=j;}}
   if(to>=0){this.events.push({serial:this.eventSerial++,kind:'exchange',from,to,at:this.visualTime,position:this.position(from)});return;}
  }
 }
 thought(i){
  const id=this.ids[this.species[i]],s=byId[id];
  if(this.activity[i]>.15)return s.guild==='degrader'?'Рядом волокно: разбираю его!':s.guild==='butyrate'?'Рядом корм для сообщества!':'Рядом доступный корм!';
  const evt=this.events.find(e=>e.from===i||e.to===i);
  if(evt)return evt.from===i?'Продукты моего обмена — соседу!':'Использую продукт соседа → бутират!';
  if(this.model.antibiotic>.12&&s.group==='Бактерии')return 'Реакция на антибиотик зависит от штамма.';
  if(this.model.food<.12&&['degrader','butyrate'].includes(s.guild))return 'Внешней пищи стало меньше.';
  const list=lines[id]||[s.role];return list[(Math.floor(this.visualTime/8)+i)%list.length];
 }
}
