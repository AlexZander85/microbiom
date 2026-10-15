import {newTransport,transportCarbon,stepTransport,addMeal,transportStats,recordTransfer} from '../physiology/transport.js';
export const COMPETITION_RULES=Object.freeze({patches:16,residentRate:.7,residentK:.05,newcomerRate:.55,newcomerK:.12,otherRate:.6,otherK:.06,yield:.45,washout:.06,maintenance:.015,fluidOut:.04,absorbM:.3});
export const COMPETITION_TRIALS={function:{name:'Вернуть потребителей R',restore:'restore_competitors'},other:{name:'Вернуть столько же потребителей Q',restore:'restore_other'},none:{name:'Не восстанавливать функцию',restore:null},intact:{name:'Не нарушать сообщество',restore:null}};
export function competitionPlan(trial='function'){return trial==='intact'?[]:[{tick:300,kind:'remove_competitors',pos:[0,3,0]},...(COMPETITION_TRIALS[trial].restore?[{tick:900,kind:COMPETITION_TRIALS[trial].restore,pos:[0,3,0]}]:[])];}
const sum=a=>a.reduce((s,v)=>s+v,0);
export function seedCompetition(sim){
 const steady=sim.scenario==='competition',n=COMPETITION_RULES.patches;
 sim.chemistry.values.food.fill(0);sim.chemistry.values.oxygen.fill(0);
 sim.ecology={r:Array(n).fill(steady?.016:0),q:Array(n).fill(steady?.024:0),m:Array(n).fill(0),exported:0,cellInput:0,
  uptake:{resident:0,newcomer:0,other:0},washed:{resident:0,newcomer:0,other:0},maintenance:{resident:0,newcomer:0,other:0},
  arrivals:0,transport:newTransport(steady),records:[],growing:false,lastGrowth:0};
 for(let i=0;i<n;i++)for(const role of ['resident','other']){
  const e=sim.create(role==='resident'?'bact':'bif',[-9+(i%4)*6,2,-9+Math.floor(i/4)*6],role==='resident'?'resource-R':'resource-Q',[],role==='resident'?.4:.35);
  e.guild=role;e.patch=i;e.pos[0]+=role==='other'?1:-1;
 }
}
export function inoculate(sim){const c=sim.ecology;for(let i=0;i<c.r.length;i++){
 let e=sim.entities.find(e=>e.guild==='newcomer'&&e.patch===i);
 if(e)e.mass+=.08;else{e=sim.create('coli',[-9+(i%4)*6,3,-9+Math.floor(i/4)*6],'newcomer-R',[],.08);if(!e)continue;e.guild='newcomer';e.patch=i;}
 c.cellInput+=.08;sim.inputCarbon+=.08;recordTransfer(c.transport,'input','newcomer','biomass',.08);
 }c.arrivals++;sim.emit('competition_arrival',[],{round:c.arrivals});}
export function competitionCarbon(sim){const c=sim.ecology;return c?sum(c.r)+sum(c.q)+sum(c.m)+c.exported+transportCarbon(c.transport):0;}
export function competitionStats(sim){const c=sim.ecology;if(!c)return null;const mass=g=>sim.entities.filter(e=>e.guild===g).reduce((s,e)=>s+e.mass,0);
 return {resident:mass('resident'),newcomer:mass('newcomer'),other:mass('other'),r:sum(c.r),q:sum(c.q),m:sum(c.m),growth:c.lastGrowth,arrivals:c.arrivals,
  usedByResident:c.uptake.resident,usedByNewcomer:c.uptake.newcomer,washedNewcomer:c.washed.newcomer,maintenanceNewcomer:c.maintenance.newcomer,
  cellInput:c.cellInput,exported:c.exported,transport:transportStats(sim)};
}
export function competitionCommand(sim,kind){
 const c=sim.ecology,before=competitionStats(sim);
 if(kind==='introduce_newcomer')inoculate(sim);
 if(kind==='remove_competitors')for(const e of sim.entities)if(e.guild==='resident'){const out=e.mass;e.mass-=out;c.exported+=out;recordTransfer(c.transport,'resident','exported','biomass',out);}
 if(kind==='restore_competitors'||kind==='restore_other')for(const e of sim.entities)if(e.guild===(kind==='restore_other'?'other':'resident')){e.mass+=.65;c.cellInput+=.65;sim.inputCarbon+=.65;recordTransfer(c.transport,'input',e.guild,'biomass',.65);}
 if(kind==='transport_meal')addMeal(sim);
 if(kind==='transit_slow')c.transport.emptying=.2;
 if(kind==='transit_normal')c.transport.emptying=1;
 if(kind==='transport_feed_off')c.transport.feeding=false;
 if(kind==='transport_feed_on')c.transport.feeding=true;
 c.records.push({tick:sim.tick,kind,before,after:competitionStats(sim)});sim.emit('competition_condition',[],{action:kind});
}
export function stepCompetition(sim,dt){
 const c=sim.ecology,r=COMPETITION_RULES;
 if(sim.scenario==='competition'&&sim.tick===30)inoculate(sim);
 if(sim.scenario==='transport'&&sim.tick===10)addMeal(sim);
 stepTransport(sim,dt);const previous=competitionStats(sim).newcomer;
 // Synchronous demands are allocated proportionally: iteration order gives no
 // consumer first access to the resource. Advantage is its explicit uptake trait.
 for(let i=0;i<c.r.length;i++){
  const cells=sim.entities.filter(e=>e.patch===i),demands=cells.map(e=>{const other=e.guild==='other',resource=other?c.q[i]:c.r[i],v=e.guild==='newcomer'?r.newcomerRate:other?r.otherRate:r.residentRate,k=e.guild==='newcomer'?r.newcomerK:other?r.otherK:r.residentK;return dt*v*e.mass*resource/(k+resource);});
  const requestedR=sum(demands.filter((_,j)=>cells[j].guild!=='other')),requestedQ=sum(demands.filter((_,j)=>cells[j].guild==='other'));
  const scaleR=Math.min(1,c.r[i]/Math.max(1e-30,requestedR)),scaleQ=Math.min(1,c.q[i]/Math.max(1e-30,requestedQ));
  cells.forEach((e,j)=>{const pool=e.guild==='other'?c.q:c.r,uptake=Math.min(pool[i],demands[j]*(e.guild==='other'?scaleQ:scaleR));pool[i]-=uptake;e.mass+=uptake*r.yield;c.m[i]+=uptake*(1-r.yield);c.uptake[e.guild]+=uptake;recordTransfer(c.transport,'colon',e.guild,e.guild==='other'?'q':'r',uptake);recordTransfer(c.transport,e.guild,'colon','m',uptake*(1-r.yield));
   const maintenance=e.mass*(1-Math.exp(-r.maintenance*dt));e.mass-=maintenance;c.exported+=maintenance;c.maintenance[e.guild]+=maintenance;
   const washed=e.mass*(1-Math.exp(-r.washout*dt));e.mass-=washed;c.exported+=washed;c.washed[e.guild]+=washed;recordTransfer(c.transport,e.guild,'maintenance','biomass',maintenance);recordTransfer(c.transport,e.guild,'washout','biomass',washed);e.age++;
  });
  const out=c.m[i]*(1-Math.exp(-(r.absorbM+r.fluidOut)*dt)),absorbed=out*r.absorbM/(r.absorbM+r.fluidOut);c.m[i]-=out;c.transport.portal.m+=absorbed;c.transport.flux.absorbedM+=absorbed;c.exported+=out-absorbed;recordTransfer(c.transport,'colon','portal','m',absorbed);recordTransfer(c.transport,'colon','exported','m',out-absorbed);
  for(const pool of [c.r,c.q]){const loss=pool[i]*(1-Math.exp(-r.fluidOut*dt));pool[i]-=loss;c.exported+=loss;recordTransfer(c.transport,'colon','exported',pool===c.r?'r':'q',loss);}
 }
 const current=competitionStats(sim).newcomer;c.lastGrowth=(current-previous)/dt;
 if(c.arrivals&&c.lastGrowth>1e-5&&!c.growing){c.growing=true;sim.emit('competition_growth',[],{resource:sum(c.r),mass:current});}
 if(c.growing&&c.lastGrowth< -1e-5){c.growing=false;sim.emit('competition_limited',[],{resource:sum(c.r),mass:current});}
}
