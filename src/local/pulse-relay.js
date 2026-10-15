// Bounded, well-mixed carbon-equivalent relay. Labels are conservative fractions,
// not animated molecules or measured isotope tracing. Oxygen has a separate budget.
export const PULSE_POOLS=['food','acetate','butyrate','tissue','producer','consumer','used','exported'];
export const PULSE_FLUX=['foodUsed','acetateMade','acetateUsed','butyrateMade','tissueDelivery','oxidized','oxygenUsed'];
export const PULSE_RULES=Object.freeze({dose:8,producerRate:.55,consumerRate:.45,half:.5,producerYield:.3,consumerYield:.35,delivery:.3,washout:.012,maintenance:.008,oxidation:.4,oxygenRatio:.75,oxygenSupply:.15,oxygenExchange:.18,oxygenExit:.2});
export const PULSE_TRIALS={consumer:{name:'Прервать использование ацетата',command:'relay_consumer_off'},respiration:{name:'Прервать окисление в ткани',command:'relay_respiration_off'},intact:{name:'Не прерывать эстафету',command:null}};
export function pulsePlan(trial='consumer'){const command=PULSE_TRIALS[trial].command;return command?[{tick:0,kind:command,pos:[0,3,0]},{tick:500,kind:'relay_restore',pos:[0,3,0]}]:[];}
const zeros=keys=>Object.fromEntries(keys.map(k=>[k,0]));
const sum=o=>Object.values(o).reduce((s,v)=>s+v,0);
function source(id,tick,amount){return {id,tick,input:amount,pools:zeros(PULSE_POOLS),flux:zeros(PULSE_FLUX)};}
export function seedPulseRelay(sim){
 sim.chemistry.values.food.fill(0);sim.chemistry.values.oxygen.fill(0);
 const k=PULSE_RULES,lumen=k.oxygenSupply*.1/(1-Math.exp(-k.oxygenExit*.1)),tissue=lumen+k.oxygenSupply/k.oxygenExchange;
 const background=source('background',0,2);background.pools.producer=1;background.pools.consumer=1;
 sim.pulseRelay={sources:[background],consumerEnabled:true,respirationEnabled:true,manual:0,oxygen:{tissue,lumen,initial:tissue+lumen,input:0,used:0,exported:0},responded:false};
 const a=sim.create('bact',[-2,3,0],'relay-producer',[],1),b=sim.create('faec',[2,3,0],'relay-consumer',[],1);a.relayGroup='producer';b.relayGroup='consumer';
}
export function addRelayPulse(sim,id){const r=sim.pulseRelay,p=source(id,sim.tick,PULSE_RULES.dose);p.pools.food=p.input;r.sources.push(p);sim.inputCarbon+=p.input;sim.emit('relay_pulse',[],{pulse:id,amount:p.input});}
export function pulseCommand(sim,kind){const r=sim.pulseRelay;if(kind==='relay_consumer_off')r.consumerEnabled=false;if(kind==='relay_respiration_off')r.respirationEnabled=false;if(kind==='relay_restore'){r.consumerEnabled=true;r.respirationEnabled=true;}if(kind==='relay_pulse')addRelayPulse(sim,'manual-'+(++r.manual));sim.emit('relay_condition',[],{action:kind});}
export function pulseTotals(sim){const r=sim.pulseRelay;return Object.fromEntries(PULSE_POOLS.map(k=>[k,r.sources.reduce((n,p)=>n+p.pools[k],0)]));}
export function pulseCarbon(sim){if(!sim.pulseRelay)return 0;const p=pulseTotals(sim);return sum(p)-p.producer-p.consumer;}
export function pulseStats(sim){const r=sim.pulseRelay;if(!r)return null;const p=pulseTotals(sim),o=r.oxygen;return {...p,oxygenTissue:o.tissue,oxygenLumen:o.lumen,oxygenUsed:o.used,oxygenError:o.tissue+o.lumen+o.used+o.exported-o.initial-o.input,consumerEnabled:r.consumerEnabled,respirationEnabled:r.respirationEnabled,pulses:Object.fromEntries(r.sources.map(s=>[s.id,{tick:s.tick,input:s.input,...s.pools,...s.flux,error:sum(s.pools)-s.input}]))};}
export function stepPulseRelay(sim,dt){
 const r=sim.pulseRelay,k=PULSE_RULES;
 if(sim.tick===10)addRelayPulse(sim,'meal-1');if(sim.tick===300)addRelayPulse(sim,'meal-2');
 const before=r.sources.map(p=>({...p.pools})),total=pulseTotals(sim),o=r.oxygen,oldO={...o};
 // One source's newly produced label cannot be consumed at the next stage in this
 // update: allocation uses its start-of-step amount, not the mutated mixture.
 const move=(from,outputs,amount,flux={})=>{if(total[from]<=0||amount<=0)return;for(let i=0;i<r.sources.length;i++){const p=r.sources[i],part=amount*before[i][from]/total[from];p.pools[from]-=part;for(const [to,yieldPart] of Object.entries(outputs))p.pools[to]+=part*yieldPart;for(const [key,factor] of Object.entries(flux))p.flux[key]+=part*factor;}};
 const useFood=Math.min(total.food,dt*k.producerRate*total.producer*total.food/(k.half+total.food));
 const useAcetate=r.consumerEnabled?Math.min(total.acetate,dt*k.consumerRate*total.consumer*total.acetate/(k.half+total.acetate)):0;
 const delivered=total.butyrate*(1-Math.exp(-k.delivery*dt));
 const oxidized=r.respirationEnabled?Math.min(total.tissue,oldO.tissue/k.oxygenRatio,dt*k.oxidation*total.tissue/(.2+total.tissue)*oldO.tissue/(.2+oldO.tissue)):0;
 move('food',{producer:k.producerYield,acetate:1-k.producerYield},useFood,{foodUsed:1,acetateMade:1-k.producerYield});
 move('acetate',{consumer:k.consumerYield,butyrate:1-k.consumerYield},useAcetate,{acetateUsed:1,butyrateMade:1-k.consumerYield});
 move('butyrate',{tissue:1},delivered,{tissueDelivery:1});move('tissue',{used:1},oxidized,{oxidized:1,oxygenUsed:k.oxygenRatio});
 for(const [pool,already] of [['food',useFood],['acetate',useAcetate],['butyrate',delivered]])move(pool,{exported:1},(total[pool]-already)*(1-Math.exp(-k.washout*dt)));
 for(const pool of ['producer','consumer'])move(pool,{exported:1},total[pool]*(1-Math.exp(-k.maintenance*dt)));
 const oxygenUsed=oxidized*k.oxygenRatio;o.tissue-=oxygenUsed;o.used+=oxygenUsed;
 const supplied=k.oxygenSupply*dt;o.tissue+=supplied;o.input+=supplied;
 // Signed finite exchange, bounded by the donor's old available reserve. O2 newly
 // supplied in this step cannot leak instantly; tissue oxidation has first claim.
 const raw=(oldO.tissue-oldO.lumen)*k.oxygenExchange*dt,exchange=raw>=0?Math.min(raw,oldO.tissue-oxygenUsed):Math.max(raw,-oldO.lumen);
 o.tissue-=exchange;o.lumen+=exchange;
 const exported=Math.min(o.lumen,oldO.lumen*(1-Math.exp(-k.oxygenExit*dt)));o.lumen-=exported;o.exported+=exported;
 const now=pulseTotals(sim);sim.get(1).mass=now.producer;sim.get(2).mass=now.consumer;sim.entities.forEach(e=>e.age++);
 if(!r.responded&&o.lumen<.65){r.responded=true;sim.emit('relay_oxygen',[],{lumen:o.lumen,used:o.used});}
}
