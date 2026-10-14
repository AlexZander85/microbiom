import { SITES, byId } from './data.js';
export const clamp = (v,lo=0,hi=1) => Math.max(lo,Math.min(hi,v));
export function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7,61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function shannon(values) { const sum=values.reduce((a,b)=>a+b,0); return sum ? -values.reduce((h,n)=>n>0?h+(n/sum)*Math.log(n/sum):h,0):0; }
// All ecological rates are deliberately uncalibrated teaching parameters, not clinical fits.
export class Model {
 constructor(site='colon',seed=85){this.seed=seed;this.reset(site);}
 reset(id=this.site.id){
  this.site=SITES.find(s=>s.id===id)||SITES[0];this.random=rng(this.seed);this.time=0;this.phase='Наблюдение';this.events=[];this.eventAt=2;
  this.food=.65;this.sugar=.18;this.acetate=.28;this.hydrogen=.2;this.butyrate=this.site.id==='colon'?.4:0;this.antibiotic=0;this.fasting=false;this.barrier=.94;this.oxygen=this.site.o2;this.pH=this.site.pH;this.pop={};this.resistant={};this.agents=[];this.lastAction=null;
  this.site.species.forEach((id,i)=>{this.pop[id]=id==='phage'?.12:id==='coli'?.13:id==='blast'?.025:id==='meth'?.3:byId[id].group==='Грибы'?.12:i===0?1.5:.35+this.random()*.65;this.resistant[id]=byId[id].group==='Бактерии'?.04:0;
   const count=this.site.sparse?5:12;
   for(let n=0;n<count;n++)this.agents.push({id:`${id}-${n}`,species:id,x:(this.random()-.5)*136,y:(this.random()-.5)*100,z:21+this.random()*10,phase:this.random()*Math.PI*2,weight:.8+this.random()*.4,display:1});
  });
  this.initial={...this.pop};this.size=20;this.fields=new Float32Array(this.size*this.size*3);this.next=new Float32Array(this.fields.length);this.updateFields(0);this.baseline=this.snapshot();
 }
 act(id){
  this.lastAction=id;this.phase=({fiber:'Поступление клетчатки',sugar:'Поступление сахаров',fast:'Перерыв в поступлении пищи',antibiotic:'Антибактериальный импульс',invader:'Заселение новой группы'})[id]||'Наблюдение';
  if(id==='fiber'){this.food=clamp(this.food+.65,0,2);this.fasting=false;}
  if(id==='sugar'){this.sugar=clamp(this.sugar+.75,0,2);this.fasting=false;}
  if(id==='fast')this.fasting=!this.fasting;
  if(id==='antibiotic')this.antibiotic=1;
  if(id==='invader'){const s=this.site.species.includes('coli')?'coli':this.site.species.includes('strep')?'strep':'epid';this.pop[s]+= .25;this.agents.filter(a=>a.species===s).slice(0,3).forEach(a=>{a.invader=true;a.x=64;});}
  this.events.push({kind:id,time:this.time,x:0,y:0});
 }
 tick(dt){
  dt=clamp(dt,0,.1);this.time+=dt;this.antibiotic*=Math.exp(-dt*.045);
  const total=Object.values(this.pop).reduce((a,b)=>a+b,0), capacity=this.site.sparse?4:7;
  const deg=(this.pop.bact||0)+(this.pop.bif||0);
  const breakdown=.08*deg*this.food;
  this.food=clamp(this.food+dt*((this.fasting?0:.023)-breakdown-.006*this.food),0,2);
  this.sugar=clamp(this.sugar+dt*(breakdown*.35-.09*this.sugar*total),0,2);
  this.acetate=clamp(this.acetate+dt*(breakdown*.65-.05*(this.pop.faec||0)*this.acetate-.025*this.acetate));
  this.hydrogen=clamp(this.hydrogen+dt*(breakdown*.4-.1*(this.pop.meth||0)*this.hydrogen-.012*this.hydrogen));
  const production=.13*(this.pop.faec||0)*this.acetate;
  this.butyrate=clamp(this.butyrate+dt*(production-.06*this.butyrate));
  const oxygenTarget=this.site.id==='colon'?.05+.15*(1-this.barrier)+.065*(1-this.butyrate):this.site.o2;
  this.oxygen+=dt*.12*(oxygenTarget-this.oxygen);
  const acid=Object.entries(this.pop).reduce((s,[id,n])=>s+(byId[id].guild==='acid'?n:0),0);
  const acidTarget=this.site.pH-(this.site.id==='mouth'?1.6:.24)*acid*this.sugar;
  this.pH=clamp(this.pH+dt*.16*(acidTarget-this.pH),1.5,8);
  this.barrier=clamp(this.barrier+dt*(.007*(.96-this.barrier)+(this.site.id==='colon'?.003*(this.butyrate-.35):0)),.5,1);
  for(const [id,n] of Object.entries(this.pop)){
   const s=byId[id];const res=this.resistant[id];
   const nutrient=({butyrate:this.acetate,degrader:this.food,mucin:.38,methane:this.hydrogen,facultative:.12+this.sugar,fungus:.12+this.sugar,acid:.2+this.sugar,lipid:.45,virus:.3,protist:.3})[s.guild];
   const oxygenPenalty=['butyrate','methane'].includes(s.guild)?this.oxygen*.13:0;
   const susceptibleKill=this.antibiotic*s.sensitivity*.22;
   const resistantKill=susceptibleKill*.13;
   const kill=(1-res)*susceptibleKill+res*resistantKill;
   const growth=.12*nutrient*(1-total/capacity)-.006-oxygenPenalty;
   this.pop[id]=clamp(n+dt*n*(growth-kill),.002,10);
   if(s.group==='Бактерии')this.resistant[id]=clamp(res+dt*res*(1-res)*(susceptibleKill-resistantKill));
  }
  for(const a of this.agents){
   const speed=byId[a.species].flagellum?1.8:.3;
   a.x+=Math.cos(this.time*.18+a.phase)*dt*speed;a.y+=Math.sin(this.time*.14+a.phase)*dt*speed;
   if(a.x>72)a.x=-72;if(a.x< -72)a.x=72;if(a.y>53)a.y=-53;if(a.y< -53)a.y=53;
  }
  if(this.time>this.eventAt){
   this.eventAt=this.time+3;
   const producer=this.agents.find(a=>a.species==='bact'),consumer=this.agents.find(a=>a.species==='faec');
   if(producer&&consumer&&this.food>.08)this.events.push({kind:'crossfeed',time:this.time,from:producer,to:consumer,x:producer.x,y:producer.y});
   const host=this.agents.find(a=>a.species==='coli'),phage=this.agents.find(a=>a.species==='phage');
   if(host&&phage&&this.random()>.6){this.events.push({kind:'lysis',time:this.time,x:host.x,y:host.y});this.pop.coli*=.985;}
  }
  this.events=this.events.filter(e=>this.time-e.time<8).slice(-32);
  this.updateFields(dt);
 }
 updateFields(dt){
  const N=this.size,src=this.fields,dst=this.next;
  // No-flux boundaries; explicit stable diffusion (dt <= .1), continuous sinks.
  for(let y=0;y<N;y++)for(let x=0;x<N;x++)for(let c=0;c<3;c++){
   const k=(y*N+x)*3+c,v=src[k];
   const lap=src[(y*N+Math.max(0,x-1))*3+c]+src[(y*N+Math.min(N-1,x+1))*3+c]+src[(Math.max(0,y-1)*N+x)*3+c]+src[(Math.min(N-1,y+1)*N+x)*3+c]-4*v;
   const target=c===0?this.butyrate*.45:c===1?this.oxygen*(.4+.6*y/N):this.antibiotic;
   dst[k]=clamp(v+dt*(lap*.65+.7*(target-v)));
  }
  if(dt)for(const a of this.agents){if(a.species!=='faec')continue;const x=Math.round((a.x+76)/152*(N-1)),y=Math.round((a.y+57)/114*(N-1));const k=(clamp(y,0,N-1)*N+clamp(x,0,N-1))*3;dst[k]=clamp(dst[k]+dt*this.butyrate*.5);}
  this.fields=dst;this.next=src;
 }
 snapshot(){const entries=Object.entries(this.pop),sum=entries.reduce((a,[,n])=>a+n,0);const bacteria=entries.filter(([id])=>byId[id].group==='Бактерии');const bs=bacteria.reduce((a,[,n])=>a+n,0);return {time:this.time,pH:this.pH,oxygen:this.oxygen,butyrate:this.butyrate,barrier:this.barrier,diversity:shannon(entries.map(([,n])=>n)),antibiotic:this.antibiotic,food:this.food,resistance:bs?bacteria.reduce((a,[id,n])=>a+n*this.resistant[id],0)/bs:0,total:sum,phase:this.phase,pop:{...this.pop}};}
}
