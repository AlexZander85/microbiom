// Closed EDUCATIONAL microbiota–gut–brain loop. All coefficients are teaching
// assumptions, not fitted physiology. Carbon is mmol C; acetate has 2 C, propionate 3.
// Neural / immune states are normalized evoked signals, not conserved molecules.
export const LOOP_RULES = Object.freeze({
 volumes:{wall:.1,portal:.05,liver:.1,blood:.3,brain:.03},
 meal:12,gastric:.06,smallTransit:.12,fermentation:.3,halfSubstrate:1,
 biomassYield:.2,acetateYield:.55,propionateYield:.2,maintenance:.005,foodExit:.01,
 absorption:.18,wallOut:.25,acidExit:.02,portalOut:.3,liverOut:.18,liverUse:.08,
 peripheralUse:.035,bbb:.012,brainPartition:.7,brainUse:.06,
 receptorK:.2,receptorTau:.7,ntsTau:2,dmvTau:4,motorTau:3,feedbackGain:2,
 afferentDelay:10,efferentDelay:20,
 markerRelease:.04,markerExit:.08,permeability:.0004,markerClearance:.15,
 immuneK:.02,cytokineTau:6,endotheliumTau:5,pgeTau:4,ep3Tau:3
});
export const LOOP_TRIALS = {
 intact:{name:'Все звенья работают · A = B',plan:[]},
 source:{name:'Выключить микробную ферментацию',plan:[[0,'loop_source_off']]},
 neural:{name:'Выключить FFAR3-афферентный вход',plan:[[0,'loop_neural_off']]},
 bbb:{name:'Остановить перенос ацетата через ГЭБ',plan:[[0,'loop_bbb_off']]},
 immune:{name:'Выключить цитокиновый приём эндотелием',plan:[[0,'loop_immune_off']]},
 feedback:{name:'Разомкнуть моторную обратную связь',plan:[[0,'loop_feedback_off']]},
 barrier:{name:'Изменить кишечную проницаемость и вернуть',plan:[[200,'loop_barrier_open'],[700,'loop_barrier_restore']]},
 rescue:{name:'При выключенной ферментации внести SCFA',plan:[[0,'loop_source_off'],[250,'loop_metabolites']]},
 recover:{name:'Вернуть микробную ферментацию на шаге 700',plan:[[0,'loop_source_off'],[700,'loop_source_on']]}
};
export function loopPlan(trial='intact') {
 return LOOP_TRIALS[trial].plan.map(([tick,kind])=>({tick,kind,pos:[0,3,0]}));
}
const sum = o => Object.values(o).reduce((n,v)=>n+v,0);
const acid = brain => ({lumen:0,wall:0,portal:0,liver:0,blood:0,...(brain?{brain:0}:{}),used:0,exported:0});
export function seedLoop(sim) {
 sim.chemistry.values.food.fill(0);sim.chemistry.values.oxygen.fill(0);
 sim.axisLoop={food:{stomach:0,small:0,colon:0,biomass:1,terminal:0},
  acetate:acid(true),propionate:acid(false),
  gates:{fermentation:true,neural:true,bbb:true,immune:true,feedback:true},barrier:1,
  marker:{lumen:0,tissue:0,input:0,exported:0},
  neural:{receptor:0,afferent:0,nts:0,dmvBrake:0,motor:0,inbound:Array(LOOP_RULES.afferentDelay).fill(0),outbound:Array(LOOP_RULES.efferentDelay).fill(0)},
  immune:{tlr4:0,cytokines:0,endothelium:0,pge:0,ep3:0},
  flux:{fermented:0,delivered:0,acetateMade:0,propionateMade:0,brainIn:0,brainOut:0,brainUsed:0},
  exposure:0,input:0,emptying:1,ledger:{},marks:[],pulses:0};
}
export function loopCarbon(sim) {const a=sim.axisLoop;return a?sum(a.food)+sum(a.acetate)+sum(a.propionate):0;}
function edge(a,from,to,material,amount) {
 const key=[from,to,material].join(':');const e=a.ledger[key]??={from,to,material,amount:0};e.amount+=amount;
}
function move(a,pool,from,to,amount,material) {
 pool[from]-=amount;pool[to]+=amount;edge(a,from,to,material,amount);
}
export function loopMeal(sim) {
 const a=sim.axisLoop,amount=LOOP_RULES.meal;a.food.stomach+=amount;a.input+=amount;sim.inputCarbon+=amount;a.pulses++;
 edge(a,'input','stomach','substrateC',amount);sim.emit('loop_meal',[],{amount,round:a.pulses});
}
export function loopCommand(sim,kind) {
 const a=sim.axisLoop;
 const off={loop_source_off:'fermentation',loop_neural_off:'neural',loop_bbb_off:'bbb',loop_immune_off:'immune',loop_feedback_off:'feedback'};
 if(off[kind])a.gates[off[kind]]=false;
 if(kind==='loop_source_on')a.gates.fermentation=true;
 if(kind==='loop_barrier_open')a.barrier=30;
 if(kind==='loop_barrier_restore')a.barrier=1;
 if(kind==='loop_restore'){for(const key in a.gates)a.gates[key]=true;a.barrier=1;}
 if(kind==='loop_meal')loopMeal(sim);
 if(kind==='loop_metabolites'){
  a.acetate.lumen+=4;a.propionate.lumen+=2;a.input+=6;sim.inputCarbon+=6;
  edge(a,'input','lumen','acetateC',4);edge(a,'input','lumen','propionateC',2);
  sim.emit('loop_rescue',[],{acetateMmol:2,propionateMmol:2/3});
 }
 sim.emit('loop_condition',[],{action:kind});
}
export function stepLoop(sim,dt) {
 const a=sim.axisLoop,r=LOOP_RULES;
 if(sim.tick===10||sim.tick===500)loopMeal(sim);
 const f=a.food,oldF={...f},oldA={...a.acetate},oldP={...a.propionate},n=a.neural,oldN={...n},im=a.immune,oldI={...im},m=a.marker,oldM={...m};
 const out=(x,k)=>x*(1-Math.exp(-k*dt)),approach=(x,t,tau)=>x+(t-x)*(1-Math.exp(-dt/tau));
 // Teaching closure: selected inhibitory vagovagal motor branch, not an empirical
 // FFAR3 -> gastric-emptying law. Only this branch closes the feedback loop.
 a.emptying=1/(1+r.feedbackGain*oldN.motor);
 const gastric=out(oldF.stomach,r.gastric*a.emptying);move(a,f,'stomach','small',gastric,'substrateC');
 const toColon=out(oldF.small,r.smallTransit);move(a,f,'small','colon',toColon,'substrateC');a.flux.delivered+=toColon;
 const used=a.gates.fermentation?Math.min(oldF.colon,dt*r.fermentation*oldF.biomass*oldF.colon/(r.halfSubstrate+oldF.colon)):0;
 f.colon-=used;f.biomass+=used*r.biomassYield;a.acetate.lumen+=used*r.acetateYield;a.propionate.lumen+=used*r.propionateYield;
 const rest=1-r.biomassYield-r.acetateYield-r.propionateYield;f.terminal+=used*rest;
 for(const [to,fraction] of [['biomass',r.biomassYield],['acetate.lumen',r.acetateYield],['propionate.lumen',r.propionateYield],['terminal',rest]])edge(a,'colon',to,'substrateC',used*fraction);
 a.flux.fermented+=used;a.flux.acetateMade+=used*r.acetateYield;a.flux.propionateMade+=used*r.propionateYield;
 move(a,f,'colon','terminal',out(oldF.colon-used,r.foodExit),'substrateC');move(a,f,'biomass','terminal',out(oldF.biomass,r.maintenance),'biomassC');
 for(const [key,old] of [['acetate',oldA],['propionate',oldP]]){
  const pool=a[key],material=key+'C',leaving=out(old.lumen,r.absorption+r.acidExit);
  move(a,pool,'lumen','wall',leaving*r.absorption/(r.absorption+r.acidExit),material);move(a,pool,'lumen','exported',leaving*r.acidExit/(r.absorption+r.acidExit),material);
  move(a,pool,'wall','portal',out(old.wall,r.wallOut),material);move(a,pool,'portal','liver',out(old.portal,r.portalOut),material);
  const hepatic=out(old.liver,r.liverOut+r.liverUse);move(a,pool,'liver','blood',hepatic*r.liverOut/(r.liverOut+r.liverUse),material);move(a,pool,'liver','used',hepatic*r.liverUse/(r.liverOut+r.liverUse),material);
  const clearance=out(old.blood,r.peripheralUse);move(a,pool,'blood','used',clearance,material);
  if(key==='acetate'){
   const brainUsed=out(old.brain,r.brainUse);move(a,pool,'brain','used',brainUsed,material);a.flux.brainUsed+=brainUsed;
   // Explicit bidirectional concentration-driven exchange. Never move more than
   // the donor's OLD reserve left after its own use; new inflow waits a step.
   const raw=a.gates.bbb?r.bbb*dt*(old.blood/r.volumes.blood-old.brain/(r.volumes.brain*r.brainPartition)):0;
   const exchange=raw>=0?Math.min(raw,old.blood-clearance):Math.max(raw,-(old.brain-brainUsed));
   if(exchange>=0){move(a,pool,'blood','brain',exchange,material);a.flux.brainIn+=exchange;}
   else {move(a,pool,'brain','blood',-exchange,material);a.flux.brainOut-=exchange;}
  }
 }
 // Accessible propionate is in the gut-wall pool, not magically at a receptor
 // behind the epithelium merely because it was present in the lumen.
 const propionate=oldP.wall/(3*r.volumes.wall);
 n.receptor=approach(oldN.receptor,propionate/(r.receptorK+propionate),r.receptorTau);
 n.afferent=a.gates.neural?n.receptor:0;
 const incoming=n.inbound.shift();n.inbound.push(n.afferent);n.nts=approach(oldN.nts,incoming,r.ntsTau);
 n.dmvBrake=approach(oldN.dmvBrake,oldN.nts,r.dmvTau);
 const motorInput=n.outbound.shift();n.outbound.push(a.gates.feedback?n.dmvBrake:0);n.motor=approach(oldN.motor,motorInput,r.motorTau);
 // Marker is TLR4-agonist ACTIVITY units, not mmol or mg LPS. Shed material can
 // remain present when fermentation is disabled; loss of a function isn't sterility.
 const release=r.markerRelease*oldF.biomass*dt;m.lumen+=release;m.input+=release;edge(a,'microbial-source','marker-lumen','marker',release);
 const markerOut=out(oldM.lumen,r.markerExit+r.permeability*a.barrier),translocated=markerOut*r.permeability*a.barrier/(r.markerExit+r.permeability*a.barrier);
 move(a,m,'lumen','tissue',translocated,'marker');move(a,m,'lumen','exported',markerOut-translocated,'marker');move(a,m,'tissue','exported',out(oldM.tissue,r.markerClearance),'marker');
 im.tlr4=oldM.tissue/(r.immuneK+oldM.tissue);im.cytokines=approach(oldI.cytokines,im.tlr4,r.cytokineTau);
 im.endothelium=approach(oldI.endothelium,a.gates.immune?oldI.cytokines:0,r.endotheliumTau);
 im.pge=approach(oldI.pge,oldI.endothelium,r.pgeTau);im.ep3=approach(oldI.ep3,oldI.pge,r.ep3Tau);
 a.exposure+=a.acetate.brain/(2*r.volumes.brain)*dt;
 for(const [mark,yes] of [['source',a.flux.fermented>.01],['neural',n.nts>.1],['humoral',a.acetate.brain>.005],['immune',im.ep3>.1],['feedback',n.motor>.1]]){
  if(yes&&!a.marks.includes(mark)){a.marks.push(mark);sim.emit('loop_response',[],{branch:mark});}
 }
}
export function loopStats(sim) {
 const a=sim.axisLoop;if(!a)return null;const r=LOOP_RULES;
 return {stomach:a.food.stomach,small:a.food.small,substrate:a.food.colon,biomass:a.food.biomass,
  fermented:a.flux.fermented,delivered:a.flux.delivered,acetateLumen:a.acetate.lumen/2,propionateLumen:a.propionate.lumen/3,
  acetateBlood:a.acetate.blood/(2*r.volumes.blood),acetateBrain:a.acetate.brain/(2*r.volumes.brain),propionateWall:a.propionate.wall/(3*r.volumes.wall),
  brainUsed:a.flux.brainUsed/2,exposure:a.exposure,nts:a.neural.nts,receptor:a.neural.receptor,afferent:a.neural.afferent,motor:a.neural.motor,dmvBrake:a.neural.dmvBrake,emptying:a.emptying,
  markerTissue:a.marker.tissue,cytokines:a.immune.cytokines,endothelium:a.immune.endothelium,pge:a.immune.pge,ep3:a.immune.ep3,
  markerError:a.marker.lumen+a.marker.tissue+a.marker.exported-a.marker.input,
  carbonError:loopCarbon(sim)-1-a.input,input:a.input,gates:{...a.gates},barrier:a.barrier,pulses:a.pulses};
}
