// Local tooth-surface assay. Invented coefficients, not doses, days or a caries forecast.
// Agents represent attached microcolonies; mass is active biomass, not a cell count.
export const ORAL_RULES=Object.freeze({n:6,period:120,firstSugar:30,sugar:.18,restPH:6.9,criticalPH:5.5,
 bufferSupply:.012,bufferCap:.025,foodClear:.25,acidClear:.15,uptake:.065,
 dissolution:.006,remin:.02,ionInput:.003,ionCap:.1,lesionThreshold:.6});
export const ORAL_TRIALS={
 brush_once:{name:'Одна механическая чистка',action:'oral_brush',ticks:[360]},
 brush_regular:{name:'Повторная механическая чистка',action:'oral_brush',ticks:Array.from({length:9},(_,i)=>360+i*240)},
 water:{name:'Полоскание водой',action:'oral_water',ticks:Array.from({length:9},(_,i)=>360+i*240)},
 fluoride:{name:'Фторсодержащий ополаскиватель',action:'oral_fluoride',ticks:Array.from({length:9},(_,i)=>360+i*240)},
 antiseptic:{name:'Антисептический ополаскиватель',action:'oral_antiseptic',ticks:Array.from({length:9},(_,i)=>360+i*240)},
 none:{name:'Без чистки и полосканий',action:null,ticks:[]}
};
export const oralPlan=trial=>ORAL_TRIALS[trial].ticks.map(tick=>({tick,kind:ORAL_TRIALS[trial].action,pos:[0,3,0]}));
const sum=a=>a.reduce((s,x)=>s+x,0),clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export function seedOral(sim){
 const n=ORAL_RULES.n**2,fill=v=>Array(n).fill(v);
 sim.chemistry.values.food.fill(0);sim.chemistry.values.oxygen.fill(0);
 sim.oral={sugar:fill(0),acid:fill(0),buffer:fill(.02),matrix:fill(.02),dead:fill(0),waste:fill(0),
  mineral:fill(.94),capacity:fill(1),ions:fill(.05),fluoride:fill(0),antiseptic:fill(0),
  access:Array.from({length:n},(_,i)=>i%6===2||i%6===3?.3:.85),
  flow:1,snacks:true,exported:0,foodInput:0,ionInput:0,ionExport:0,acidMade:0,neutralized:0,
  dissolved:0,remineralized:0,brushed:0,acidTime:0,acidic:false,records:[]};
 for(let i=0;i<n;i++){const e=sim.create('strep',[-10+(i%6)*4,1,-10+Math.floor(i/6)*4],'oral-colony',[],.06*(.9+sim.random()*.2));e.oralPatch=i;}
 sim.oral.initialMineral=sum(sim.oral.mineral)+sum(sim.oral.ions);
}
export function oralPlaque(sim,i){const o=sim.oral;return sim.entities[i].mass+o.matrix[i]+o.dead[i];}
export function oralPH(sim,i){const o=sim.oral;return Math.max(3.8,ORAL_RULES.restPH-1.25*Math.log10(1+o.acid[i]/(.004+o.buffer[i])));}
export function oralCarbon(sim){const o=sim.oral;return o?sum(o.sugar)+sum(o.acid)+sum(o.matrix)+sum(o.dead)+sum(o.waste)+o.exported:0;}
export function oralStats(sim){
 const o=sim.oral;if(!o)return null;const ph=o.sugar.map((_,i)=>oralPH(sim,i));
 return {plaque:o.sugar.reduce((s,_,i)=>s+oralPlaque(sim,i),0),active:sum(sim.entities.map(e=>e.mass)),matrix:sum(o.matrix),dead:sum(o.dead),
  minPH:Math.min(...ph),meanPH:sum(ph)/ph.length,mineral:sum(o.mineral)/o.mineral.length*100,
  minMineral:Math.min(...o.mineral)*100,defects:o.capacity.filter(v=>v<.999).length,capacity:sum(o.capacity)/o.capacity.length*100,
  fluoride:sum(o.fluoride)/o.fluoride.length,antiseptic:sum(o.antiseptic)/o.antiseptic.length,
  flow:o.flow,snacks:o.snacks,sugar:sum(o.sugar),acid:sum(o.acid),buffer:sum(o.buffer),
  dissolved:o.dissolved,remineralized:o.remineralized,brushed:o.brushed,exported:o.exported,foodInput:o.foodInput,
  acidMade:o.acidMade,neutralized:o.neutralized,acidTime:o.acidTime,
  mineralError:sum(o.mineral)+sum(o.ions)+o.ionExport-o.initialMineral-o.ionInput};
}
function sugarPulse(sim,manual=false){const o=sim.oral;for(let i=0;i<o.sugar.length;i++)o.sugar[i]+=ORAL_RULES.sugar;
 const added=ORAL_RULES.sugar*o.sugar.length;o.foodInput+=added;sim.inputCarbon+=added;sim.emit('oral_sugar',[],{amount:added,manual});}
export function oralCommand(sim,kind){
 const o=sim.oral,before=oralStats(sim);
 if(kind==='oral_sugar')sugarPulse(sim,true);
 if(kind==='oral_snacks_off')o.snacks=false;if(kind==='oral_snacks_on')o.snacks=true;
 if(kind==='oral_dry')o.flow=.2;if(kind==='oral_saliva')o.flow=1;
 if(kind==='oral_brush')for(let i=0;i<o.sugar.length;i++){
  const fraction=o.access[i],e=sim.entities[i],removed=oralPlaque(sim,i)*fraction;
  e.mass*=1-fraction;o.matrix[i]*=1-fraction;o.dead[i]*=1-fraction;o.exported+=removed;o.brushed+=removed;
 }
 if(['oral_water','oral_fluoride','oral_antiseptic'].includes(kind))for(let i=0;i<o.sugar.length;i++){
  // Same idealised aqueous vehicle for all three rinses. Attached plaque remains.
  for(const key of ['sugar','acid','waste']){const removed=o[key][i]*.4;o[key][i]-=removed;o.exported+=removed;}
  o.fluoride[i]*=.4;o.antiseptic[i]*=.4;
  if(kind==='oral_fluoride')o.fluoride[i]=Math.min(2,o.fluoride[i]+1);
  if(kind==='oral_antiseptic')o.antiseptic[i]=Math.min(2,o.antiseptic[i]+1);
 }
 const after=oralStats(sim);o.records.push({tick:sim.tick,kind,before,after});
 sim.emit('oral_care',[],{action:kind,plaqueBefore:before.plaque,plaqueAfter:after.plaque,mineralBefore:before.mineral,mineralAfter:after.mineral});
}
export function stepOral(sim,dt){
 const o=sim.oral,r=ORAL_RULES;
 if(o.snacks&&sim.tick>=r.firstSugar&&(sim.tick-r.firstSugar)%r.period===0)sugarPulse(sim);
 for(let i=0;i<o.sugar.length;i++){
  const e=sim.entities[i],plaque=oralPlaque(sim,i),shield=1+plaque*6;
  o.buffer[i]=Math.min(r.bufferCap,o.buffer[i]+dt*r.bufferSupply*o.flow/shield);
  const ions=Math.min(Math.max(0,r.ionCap-o.ions[i]),dt*r.ionInput*o.flow);o.ions[i]+=ions;o.ionInput+=ions;
  const uptake=Math.min(o.sugar[i],dt*r.uptake*e.mass/(.06+e.mass)*o.sugar[i]/(.015+o.sugar[i])/(1+5*o.antiseptic[i]));
  o.sugar[i]-=uptake;e.mass+=uptake*.25;o.matrix[i]+=uptake*.2;o.acid[i]+=uptake*.55;o.acidMade+=uptake*.55;
  const maintenance=Math.min(e.mass,dt*.001*e.mass);e.mass-=maintenance;o.waste[i]+=maintenance;
  // Antimicrobial effect transfers active material to inactive attached material;
  // killing is not equivalent to brushing off the scaffold.
  const inactive=e.mass*(1-Math.exp(-dt*.04*o.antiseptic[i]/shield));e.mass-=inactive;o.dead[i]+=inactive;
  const neutral=Math.min(o.acid[i],o.buffer[i]);o.acid[i]-=neutral;o.buffer[i]-=neutral;o.waste[i]+=neutral;o.neutralized+=neutral;
  for(const key of ['sugar','acid','waste']){
   const rate=key==='sugar'?r.foodClear:r.acidClear,cleared=o[key][i]*(1-Math.exp(-dt*rate*o.flow/shield));o[key][i]-=cleared;o.exported+=cleared;
  }
  // Natural detachment is slow, not complete cleaning or sterility.
  const detach=1-Math.exp(-dt*.001*o.flow);
  for(const key of ['matrix','dead']){const lost=o[key][i]*detach;o[key][i]-=lost;o.exported+=lost;}
  const lost=e.mass*detach;e.mass-=lost;o.exported+=lost;
  const ph=oralPH(sim,i),f=o.fluoride[i];
  if(ph<r.criticalPH){const dissolved=Math.min(o.mineral[i],dt*r.dissolution*(r.criticalPH-ph)/(1+2*f));o.mineral[i]-=dissolved;o.ions[i]+=dissolved;o.dissolved+=dissolved;
   // Explicit teaching threshold for structural loss. Capacity never grows back.
   if(o.mineral[i]<r.lesionThreshold){const cap=Math.min(o.capacity[i],.4+o.mineral[i]);if(o.capacity[i]>=.999&&cap<.999)sim.emit('oral_defect',[e.id],{patch:i});o.capacity[i]=cap;}
  }else{
   const gain=Math.min(o.ions[i],Math.max(0,o.capacity[i]-o.mineral[i]),dt*r.remin*(ph-r.criticalPH)*(1+3*f)*Math.max(0,o.capacity[i]-o.mineral[i]));
   o.mineral[i]+=gain;o.ions[i]-=gain;o.remineralized+=gain;
  }
  const ionOut=o.ions[i]*(1-Math.exp(-dt*.04*o.flow));o.ions[i]-=ionOut;o.ionExport+=ionOut;
  o.fluoride[i]*=Math.exp(-dt*.025*o.flow);o.antiseptic[i]*=Math.exp(-dt*.08*o.flow);
  e.age++;e.pos[1]=Math.min(5.8,.6+oralPlaque(sim,i)*2);
 }
 const ph=Math.min(...o.sugar.map((_,i)=>oralPH(sim,i)));
 if(ph<r.criticalPH)o.acidTime+=dt;
 if(!o.acidic&&ph<5.4){o.acidic=true;sim.emit('oral_acid',[],{ph});}
 if(o.acidic&&ph>5.8){o.acidic=false;sim.emit('oral_buffer',[],{ph});}
}
