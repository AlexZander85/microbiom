// Stage 1: carbon-equivalent material transfer, not calibrated human pharmacology.
export const TRANSPORT_RULES=Object.freeze({feed:{d:1,r:.7,q:.6},gastric:.25,transit:.12,absorption:.35,portal:.4,liverOut:.3,liverUse:.2,bloodUse:.1,bloodExcretion:.04});
const channels=['d','m'],sum=o=>Object.values(o).reduce((a,b)=>a+b,0);
export function newTransport(steady=false){
 return {stomach:{d:steady?4:0,r:steady?2.8:0,q:steady?2.4:0},small:{d:steady?1/.47:0,r:steady?.7/.12:0,q:steady?.6/.12:0},
  portal:{d:0,m:0},liver:{d:0,m:0},blood:{d:0,m:0},used:{d:0,m:0},excreted:{d:0,m:0},
  feeding:steady,emptying:1,absorption:1,input:0,flux:{gastric:0,toColon:0,absorbedD:0,absorbedM:0,portal:0,systemic:0},ledger:{}};
}
// Accumulated edge quantities, bounded by the finite set of routes (not a per-tick log).
export function recordTransfer(t,from,to,substance,amount){
 const key=[from,to,substance].join(':');const edge=t.ledger[key]??={from,to,substance,amount:0};edge.amount+=amount;
}
export function transportCarbon(t){return ['stomach','small','portal','liver','blood','used','excreted'].reduce((n,k)=>n+sum(t[k]),0);}
export function addMeal(sim,amount={d:10,r:7,q:6}){
 const t=sim.ecology.transport;for(const k of ['d','r','q']){t.stomach[k]+=amount[k];recordTransfer(t,'input','stomach',k,amount[k]);}const total=sum(amount);t.input+=total;sim.inputCarbon+=total;sim.emit('transport_meal',[],{amount:{...amount}});
}
export function stepTransport(sim,dt){
 const c=sim.ecology,t=c.transport,r=TRANSPORT_RULES;
 // All outgoing transfers use the start-of-step state. New material cannot traverse
 // several compartments during one update; hold-up, not a scripted delay, sets timing.
 const old=Object.fromEntries(['stomach','small','portal','liver','blood'].map(k=>[k,{...t[k]}]));
 if(t.feeding){const food=Object.fromEntries(Object.entries(r.feed).map(([k,v])=>[k,v*dt]));for(const k in food){t.stomach[k]+=food[k];recordTransfer(t,'input','stomach',k,food[k]);}const input=sum(food);t.input+=input;sim.inputCarbon+=input;}
 for(const k of ['d','r','q']){
  const out=old.stomach[k]*(1-Math.exp(-r.gastric*t.emptying*dt));t.stomach[k]-=out;t.small[k]+=out;t.flux.gastric+=out;recordTransfer(t,'stomach','small',k,out);
  const a=k==='d'?r.absorption*t.absorption:0,rate=r.transit+a,total=old.small[k]*(1-Math.exp(-rate*dt)),absorbed=total*a/rate,toColon=total-absorbed;
  t.small[k]-=total;if(absorbed){t.portal.d+=absorbed;t.flux.absorbedD+=absorbed;recordTransfer(t,'small','portal',k,absorbed);}
  const pool=k==='q'?c.q:c.r;for(let i=0;i<pool.length;i++)pool[i]+=toColon/pool.length;t.flux.toColon+=toColon;recordTransfer(t,'small','colon',k,toColon);
 }
 for(const k of channels){
  const p=old.portal[k]*(1-Math.exp(-r.portal*dt));t.portal[k]-=p;t.liver[k]+=p;t.flux.portal+=p;recordTransfer(t,'portal','liver',k,p);
  const out=old.liver[k]*(1-Math.exp(-(r.liverOut+r.liverUse)*dt)),systemic=out*r.liverOut/(r.liverOut+r.liverUse);
  t.liver[k]-=out;t.blood[k]+=systemic;t.used[k]+=out-systemic;t.flux.systemic+=systemic;recordTransfer(t,'liver','blood',k,systemic);recordTransfer(t,'liver','used',k,out-systemic);
  const cleared=old.blood[k]*(1-Math.exp(-(r.bloodUse+r.bloodExcretion)*dt)),used=cleared*r.bloodUse/(r.bloodUse+r.bloodExcretion);
  t.blood[k]-=cleared;t.used[k]+=used;t.excreted[k]+=cleared-used;recordTransfer(t,'blood','used',k,used);recordTransfer(t,'blood','excreted',k,cleared-used);
 }
}
export function transportStats(sim){const t=sim.ecology.transport;return {stomach:sum(t.stomach),small:sum(t.small),portal:sum(t.portal),liver:sum(t.liver),blood:sum(t.blood),bloodD:t.blood.d,bloodM:t.blood.m,used:sum(t.used),excreted:sum(t.excreted),input:t.input,emptying:t.emptying,feeding:t.feeding,...t.flux};}
