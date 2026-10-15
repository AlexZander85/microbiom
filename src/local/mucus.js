import {CARBON} from './chemistry.js';

// An illustrative colonic film, NOT fitted human thicknesses, rates or meal times.
// All quantities are carbon-equivalent amounts. Inner/outer are model pools, not
// water volume or a measurement of MUC2 structure. Host supply is independent of
// luminal microbial substrate. No epithelial injury or bacterial invasion rule.
export const MUCUS_RULES=Object.freeze({inner:.22,outer:.18,hostReserve:5,hostCap:10,
 hostInput:.8,secretion:.005,feedback:.04,innerCap:.25,maturation:.02,shedding:.015,
 foodInput:.08,passage:.2,foodUptake:.06,mucinUptake:.05,specialistUptake:.024,
 innerAccess:.4,outerCover:.025,maintenance:.0015,thin:.45,recovered:.75});
const sum=a=>a.reduce((s,x)=>s+x,0);
const clamp=x=>Math.max(0,Math.min(1,x));
export function mucusPatch(sim,pos){return sim.chemistry.voxel(pos)%(sim.chemistry.n**2);}
export function seedMucus(sim){
 const n=sim.chemistry.n**2,r=MUCUS_RULES;
 sim.mucus={inner:Array(n).fill(r.inner),outer:Array(n).fill(r.outer),thin:Array(n).fill(false),
  host:r.hostReserve,substrate:true,secretionScale:1,hostInput:0,foodInput:0,secreted:0,
  matured:0,shed:0,outerUsed:0,innerUsed:0,foodUsed:0,exported:0,records:[]};
 const f=sim.chemistry;f.values.food.fill(0);
 for(let i=n*2;i<f.length;i++)f.values.food[i]=.04;
 // Spatially separated patches; no prearranged injury or scripted deaths.
 for(const z of [-5,-1,3])for(const x of [-5,-1,3,7])sim.create('bact',[x,1.45,z],'mucin-switch',[],.85);
 for(const z of [-5,-1,3,7])sim.create('akk',[-9,1.45,z],'outer-forager',[],.85);
 for(const z of [-5,-1,3,7])sim.create('faec',[1,1.7,z],'base',[],.85);
}
export function mucusCarbon(sim){const m=sim.mucus;return m?sum(m.inner)+sum(m.outer)+m.host+m.exported:0;}
export function mucusStats(sim){
 const m=sim.mucus;if(!m)return null;
 const reference=MUCUS_RULES.inner,minimum=Math.min(...m.inner),mean=sum(m.inner)/m.inner.length;
 return {inner:sum(m.inner),outer:sum(m.outer),minInner:minimum/reference,meanInner:mean/reference,
  thinPatches:m.inner.filter(v=>v<reference*MUCUS_RULES.thin).length,
  foragers:sim.entities.filter(e=>e.alive&&e.mucusMode==='mucin').length,
  host:m.host,substrate:m.substrate,secretionScale:m.secretionScale,
  hostInput:m.hostInput,foodInput:m.foodInput,secreted:m.secreted,matured:m.matured,
  shed:m.shed,outerUsed:m.outerUsed,innerUsed:m.innerUsed,foodUsed:m.foodUsed,exported:m.exported};
}
export function mucusCommand(sim,kind){
 const m=sim.mucus;
 if(kind==='substrate_off')m.substrate=false;
 if(kind==='substrate_on')m.substrate=true;
 if(kind==='secretion_slow')m.secretionScale=.25;
 if(kind==='secretion_restore')m.secretionScale=1;
 m.records.push({tick:sim.tick,kind,...mucusStats(sim)});
 sim.emit('mucus_supply',[],{action:kind,substrate:m.substrate,secretionScale:m.secretionScale});
}
export function stepMucus(sim,dt){
 const m=sim.mucus,r=MUCUS_RULES,f=sim.chemistry,n=f.n**2;
 const supplied=Math.min(r.hostCap-m.host,r.hostInput*dt);
 m.host+=supplied;m.hostInput+=supplied;sim.inputCarbon+=supplied;
 const wanted=m.inner.map(v=>Math.min(Math.max(0,r.innerCap-v),dt*m.secretionScale*(r.secretion+r.feedback*Math.max(0,r.inner-v))));
 const allocation=Math.min(1,m.host/Math.max(1e-30,sum(wanted)));
 let foodAdded=0,exported=0;
 for(let k=0;k<n;k++){
  const secretion=Math.min(m.host,wanted[k]*allocation);
  m.host-=secretion;m.inner[k]+=secretion;m.secreted+=secretion;
  const mature=m.inner[k]*r.maturation*dt;m.inner[k]-=mature;m.outer[k]+=mature;m.matured+=mature;
  const shed=m.outer[k]*r.shedding*dt;m.outer[k]-=shed;exported+=shed;m.shed+=shed;
  if(m.substrate){const food=r.foodInput*dt;for(let y=2;y<=4;y++){f.values.food[n*y+k]+=food;foodAdded+=food;}}
 }
 // Open luminal flow: material leaving the simulated patch has an explicit ledger.
 // Paired chemical diffusion itself remains conservative, including at the film.
 for(const kind of CARBON)for(let i=n*2;i<f.length;i++){
  const out=f.values[kind][i]*r.passage*dt;f.values[kind][i]-=out;exported+=out;
 }
 m.foodInput+=foodAdded;sim.inputCarbon+=foodAdded;m.exported+=exported;
}
export function growMucus(sim,e,dt){
 const m=sim.mucus,r=MUCUS_RULES,f=sim.chemistry,k=mucusPatch(sim,e.pos);
 let uptake=0,source='acetate';
 const capacity=Math.max(0,(1.7-e.mass)*2);
 if(e.species==='faec'){
  uptake=f.take('acetate',e.pos,Math.min(dt*.06,capacity));
  e.mass+=uptake*.5;f.add('butyrate',e.pos,uptake*.5);
  sim.flux.acetateUsed+=uptake;sim.flux.butyrateMade+=uptake*.5;
 }else{
  const previous=e.mucusMode||'food',food=f.sample('food',e.pos);
  // Hysteresis illustrates regulated substrate use, not a taxon-wide threshold.
  e.mucusMode=e.species==='akk'?'mucin':previous==='food'?(food<.008?'mucin':'food'):(food>.025?'food':'mucin');
  if(e.mucusMode!==previous)sim.emit('mucus_switch',[e.id],{mode:e.mucusMode,food,patch:k});
  source=e.mucusMode;
  if(source==='food'){
   uptake=f.take('food',e.pos,Math.min(dt*r.foodUptake,capacity));m.foodUsed+=uptake;sim.flux.producerFood+=uptake;
  }else{
   const demand=Math.min(dt*(e.species==='akk'?r.specialistUptake:r.mucinUptake),capacity);
   const outer=Math.min(m.outer[k],demand);m.outer[k]-=outer;m.outerUsed+=outer;
   // Reduced, cover-dependent access of the switcher to inner glycans. This is
   // an explicit teaching assumption, NOT bacteria traversing an intact inner layer.
   const access=e.species==='akk'?0:r.innerAccess*clamp(1-m.outer[k]/r.outerCover);
   const inner=Math.min(m.inner[k],(demand-outer)*access);m.inner[k]-=inner;m.innerUsed+=inner;
   uptake=outer+inner;
  }
  e.mass+=uptake*.25;f.add('acetate',e.pos,uptake*.5);f.add('waste',e.pos,uptake*.25);sim.flux.acetateMade+=uptake*.5;
 }
 const maintenance=Math.min(e.mass,dt*r.maintenance);e.mass-=maintenance;f.add('waste',e.pos,maintenance);
 if(e.mass<.08){sim.kill(e,'starvation');return;}
 if(e.mass>=1.6)sim.divide(e,'division');
}
export function finishMucus(sim){
 const m=sim.mucus,r=MUCUS_RULES;
 for(let k=0;k<m.inner.length;k++){
  const fraction=m.inner[k]/r.inner;
  if(!m.thin[k]&&fraction<r.thin){m.thin[k]=true;sim.emit('mucus_thin',[],{patch:k,fraction});}
  if(m.thin[k]&&fraction>r.recovered){m.thin[k]=false;sim.emit('mucus_recover',[],{patch:k,fraction});}
 }
 sim.barrier=sum(m.inner.map(v=>clamp(v/r.inner)))/m.inner.length;
 // Cells remain luminal. Thickness does NOT trigger the legacy epithelial breach.
 for(const e of sim.entities)if(e.alive)e.pos[1]=m.inner[mucusPatch(sim,e.pos)]/r.inner*1.2+.25;
}
export function mucusPermeability(sim){return sim.mucus.inner.map(v=>clamp(v/MUCUS_RULES.inner));}
