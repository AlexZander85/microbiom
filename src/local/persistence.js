// A bounded, well-mixed teaching assay, not a clinical antibiotic regimen.
// Persistence is represented by ONE reversible low-activity mechanism, not all persistence biology.
export const PERSISTENCE_RULES=Object.freeze({entryRate:.001,wakeRate:.5,minRest:30,activeKill:.8,slowKill:.004,resistantKill:.003,uptake:.075});
export const COHORT_NAMES={sensitive:'Изначально активные S','persister-origin':'Линия исходных персистеров S',resistant:'Наследуемый R-demo'};
export function assayCounts(sim){
 const live=sim.entities.filter(e=>e.alive&&e.assayCell);
 return {sensitive:live.filter(e=>e.cohort==='sensitive').length,persisterOrigin:live.filter(e=>e.cohort==='persister-origin').length,
  resistant:live.filter(e=>e.traits.demoResistance).length,persisters:live.filter(e=>e.state==='persister').length,
  activeSensitive:live.filter(e=>!e.traits.demoResistance&&e.state==='vegetative').length,
  recoveredLine:live.filter(e=>e.cohort==='persister-origin'&&e.state==='vegetative').length,total:live.length};
}
export function seedPersistence(sim){
 sim.assay={bath:0,rounds:[]};sim.chemistry.values.food.fill(.3);
 for(let i=0;i<20;i++){
  const resistant=i>=16,p=i>=13&&i<16;
  const e=sim.create('coli',[-8+(i%5)*4,3,-6+Math.floor(i/5)*4],resistant?'assay-R':'assay-S');
  e.cohort=resistant?'resistant':p?'persister-origin':'sensitive';
  if(p){e.state='persister';sim.emit('persistence_enter',[e.id],{prepared:true});}
 }
}
export function assayCommand(sim,kind){
 if(kind==='challenge'){
  if(sim.assay.bath)throw new Error('Воздействие уже идёт. Сначала удалите препарат из среды.');
  sim.assay.bath=1;sim.chemistry.values.drug.fill(1);
  sim.assay.rounds.push({round:sim.assay.rounds.length+1,startTick:sim.tick,start:assayCounts(sim),endTick:null,end:null});
  sim.emit('challenge',[],{round:sim.assay.rounds.length});
 }
 if(kind==='washout'){
  if(!sim.assay.bath)throw new Error('В среде нет препарата для удаления.');
  sim.assay.bath=0;sim.chemistry.values.drug.fill(0);
  const round=sim.assay.rounds.at(-1);round.endTick=sim.tick;round.end=assayCounts(sim);
  sim.emit('washout',[],{round:round.round});
 }
}
export function growAssay(sim,e,dt){
 const r=PERSISTENCE_RULES,f=sim.chemistry,drug=f.sample('drug',e.pos),res=e.traits.demoResistance;
 e.exposure+=drug*dt;
 if(e.state==='persister'){
  e.slowTicks++;
  if(!drug&&e.slowTicks>=r.minRest&&f.sample('food',e.pos)>.01&&sim.random()<1-Math.exp(-r.wakeRate*dt)){
   e.state='vegetative';e.slowTicks=0;sim.emit('persistence_exit',[e.id],{geneticResistance:!!res});
  }
 }else if(!res&&sim.random()<1-Math.exp(-r.entryRate*dt)){
  e.state='persister';e.slowTicks=0;sim.emit('persistence_enter',[e.id],{prepared:false});
 }
 const slow=e.state==='persister',maintenance=Math.min(e.mass,dt*(slow?.00015:.0015));
 e.mass-=maintenance;f.add('waste',e.pos,maintenance);
 if(e.mass<.08){sim.kill(e,'starvation');return;}
 const rate=slow?r.slowKill:res?r.resistantKill:r.activeKill;
 if(drug&&sim.random()<1-Math.exp(-rate*drug*dt)){
  sim.emit('assay_kill',[e.id],{state:e.state,geneticResistance:!!res,exposure:e.exposure,round:sim.assay.rounds.length});
  sim.kill(e,'antibiotic');return;
 }
 // Slow survivors do not grow. Sensitive active cells cannot grow under this exposure;
 // genetically resistant controls can. Children inherit R-demo, not the slow state.
 if(slow||drug&&!res)return;
 const used=f.take('food',e.pos,Math.min(dt*r.uptake*(drug?.55:1),Math.max(0,(1.7-e.mass)*2)));
 e.mass+=used*.5;f.add('waste',e.pos,used*.5);
 if(e.mass>=1.6)sim.divide(e,'division');
}
