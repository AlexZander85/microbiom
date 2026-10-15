// Distinct glucose tracer model. Never reinterpret stage-1 D/R/Q/M as glucose.
// Amounts: mmol added glucose; volumes: illustrative L; time: teaching units.
export const AXIS_RULES=Object.freeze({volumes:{lumen:.1,portal:.02,liver:.05,blood:.3},gastric:.12,absorb:.18,transit:.025,portal:.3,liverOut:.18,liverUse:.08,clearance:.04,sensorK:2,sensorTau:.6,synapseTau:.3,ntsTau:1.2,delayTicks:10,pulse:1});
export const AXIS_TRIALS={synapse:{name:'Прервать глутаматную передачу',command:'axis_synapse_off'},vagus:{name:'Прервать вагальную передачу',command:'axis_vagus_off'},iv:{name:'Тот же вход — сразу в кровь',command:'axis_route_iv'},intact:{name:'Ничего не нарушать',command:null}};
export function axisPlan(trial='synapse'){const t=AXIS_TRIALS[trial];return t.command?[{tick:0,kind:t.command,pos:[0,3,0]},...(['synapse','vagus'].includes(trial)?[{tick:450,kind:'axis_restore',pos:[0,3,0]}]:[])]:[];}
export function seedAxis(sim){sim.chemistry.values.food.fill(0);sim.chemistry.values.oxygen.fill(0);sim.axis={stomach:0,lumen:0,portal:0,liver:0,blood:0,used:0,excreted:0,input:0,route:'gut',synapseEnabled:true,vagusEnabled:true,sensor:0,glutamate:0,afferent:0,nts:0,queue:Array(AXIS_RULES.delayTicks).fill(0),ledger:{},pulses:0,active:false,ntsArea:0};}
export function axisTotal(a){return ['stomach','lumen','portal','liver','blood','used','excreted'].reduce((n,k)=>n+a[k],0);}
function transfer(a,from,to,amount){a[from]-=amount;a[to]+=amount;const key=from+'→'+to;a.ledger[key]=(a.ledger[key]||0)+amount;}
export function axisPulse(sim){const a=sim.axis,k=a.route==='gut'?'stomach':'blood',amount=AXIS_RULES.pulse;a[k]+=amount;a.input+=amount;a.pulses++;a.ledger['input→'+k]=(a.ledger['input→'+k]||0)+amount;sim.emit('axis_pulse',[],{route:a.route,amount});}
export function axisCommand(sim,kind){const a=sim.axis;if(kind==='axis_synapse_off')a.synapseEnabled=false;if(kind==='axis_vagus_off')a.vagusEnabled=false;if(kind==='axis_route_iv')a.route='blood';if(kind==='axis_restore'){a.synapseEnabled=true;a.vagusEnabled=true;}if(kind==='axis_pulse')axisPulse(sim);sim.emit('axis_condition',[],{action:kind});}
export function stepAxis(sim,dt){
 const a=sim.axis,r=AXIS_RULES;
 if(sim.tick===10||sim.tick===600)axisPulse(sim);
 const old={...a},out=(x,k)=>x*(1-Math.exp(-k*dt));
 transfer(a,'stomach','lumen',out(old.stomach,r.gastric));
 const leaving=out(old.lumen,r.absorb+r.transit);transfer(a,'lumen','portal',leaving*r.absorb/(r.absorb+r.transit));transfer(a,'lumen','excreted',leaving*r.transit/(r.absorb+r.transit));
 transfer(a,'portal','liver',out(old.portal,r.portal));const hepatic=out(old.liver,r.liverOut+r.liverUse);transfer(a,'liver','blood',hepatic*r.liverOut/(r.liverOut+r.liverUse));transfer(a,'liver','used',hepatic*r.liverUse/(r.liverOut+r.liverUse));transfer(a,'blood','used',out(old.blood,r.clearance));
 // Neural states carry information, NOT glucose or material along the nerve.
 const concentration=old.lumen/r.volumes.lumen,drive=concentration/(r.sensorK+concentration),approach=(value,target,tau)=>value+(target-value)*(1-Math.exp(-dt/tau));
 a.sensor=approach(old.sensor,drive,r.sensorTau);
 a.glutamate=approach(old.glutamate,old.sensor,r.synapseTau);
 a.afferent=a.synapseEnabled?a.glutamate:0;
 const arrived=a.queue.shift();a.queue.push(a.vagusEnabled?a.afferent:0);
 a.nts=approach(old.nts,arrived,r.ntsTau);a.ntsArea+=a.nts*dt;
 if(!a.active&&a.nts>.1){a.active=true;sim.emit('axis_response',[],{nts:a.nts});}
 if(a.active&&a.nts<.05){a.active=false;sim.emit('axis_decay',[],{nts:a.nts});}
}
export function axisStats(sim){const a=sim.axis;if(!a)return null;return {stomach:a.stomach,lumen:a.lumen,portal:a.portal,liver:a.liver,blood:a.blood,lumenConcentration:a.lumen/AXIS_RULES.volumes.lumen,bloodConcentration:a.blood/AXIS_RULES.volumes.blood,used:a.used,excreted:a.excreted,input:a.input,error:axisTotal(a)-a.input,sensor:a.sensor,glutamate:a.glutamate,afferent:a.afferent,nts:a.nts,ntsArea:a.ntsArea,route:a.route,synapseEnabled:a.synapseEnabled,vagusEnabled:a.vagusEnabled,pulses:a.pulses};}
