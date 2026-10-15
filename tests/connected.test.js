import test from 'node:test';
import assert from 'node:assert/strict';
import {LocalSimulation} from '../src/local/engine.js';
import {COMPETITION_TRIALS,COMPETITION_RULES} from '../src/local/competition.js';
import {LearningSession,learningMeta,measure,report} from '../src/local/learning.js';
import {replay,checksum,exportReplay} from '../src/local/replay.js';
import {engineForScenario} from '../src/local/traits.js';
const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
function run(scenario='competition',trial='function',seed=85){
 const s=new LocalSimulation({scenario,seed}),a=new LocalSimulation({scenario,seed});
 const l=new LearningSession({version:1,study:scenario,prediction:1,reflection:'Проверяю функцию',guided:true,...(scenario==='competition'?{competitionTrial:trial}:{})});
 const checkpoints={};l.applyPlan(s);l.capture(s,a);
 while(s.tick<l.study.end){s.step();a.step();l.applyPlan(s);l.capture(s,a);if([30,290,300,400,600,900,1600].includes(s.tick))checkpoints[s.tick]=s.summary().ecology;}
 return {s,a,l,checkpoints};
}
test('occupied resource limits newcomer; function loss releases resource before biomass expansion',()=>{
 const {s,a,checkpoints:p}=run();
 assert.equal(p[30].arrivals,1);assert.equal(a.summary().ecology.arrivals,1);
 assert.ok(p[290].newcomer<.4);assert.equal(p[300].resident,0);
 assert.ok(p[400].r>p[300].r*3);assert.ok(p[600].newcomer>p[300].newcomer*10);
 assert.ok(s.summary().ecology.newcomer<p[900].newcomer*.05);
 assert.ok(a.summary().ecology.newcomer<.001);
 assert.ok(s.counts.competition_growth);assert.ok(s.counts.competition_limited);
 for(const kind of ['death','t6','engulf','lysis','transfer','division'])assert.equal(s.counts[kind],undefined);
 assert.ok(s.entities.every(e=>e.alive&&e.plasmids.length===0&&e.infection===null));
});
test('equal biomass with unrelated function does not substitute for competition over R',()=>{
 const right=run('competition','function'),other=run('competition','other'),none=run('competition','none');
 assert.equal(right.s.ecology.cellInput,other.s.ecology.cellInput);
 assert.ok(other.s.summary().ecology.newcomer>right.s.summary().ecology.newcomer*20);
 for(const k of ['newcomer','resident','r'])assert.equal(other.s.summary().ecology[k],none.s.summary().ecology[k]);
 assert.deepEqual(right.checkpoints[900].newcomer,other.checkpoints[900].newcomer);
});
test('intact B and A have identical states; no seed-specific scripted outcome',()=>{
 for(const seed of [1,85,999]){const {s,a}=run('competition','intact',seed);assert.deepEqual(s.snapshot(),a.snapshot());}
});
test('restoration does not instantly kill newcomers and external biomass is balanced',()=>{
 const s=new LocalSimulation({scenario:'competition'});for(let i=0;i<400;i++)s.step();
 const before=s.summary().ecology.newcomer,carbon=s.carbon();s.command('restore_competitors');
 assert.equal(s.summary().ecology.newcomer,before);near(s.carbon()-carbon,16*.65);near(s.summary().carbonError,0);
 const biomass=s.summary().ecology.resident;s.command('remove_competitors');assert.equal(s.summary().ecology.resident,0);near(s.carbon()-carbon,16*.65);assert.ok(s.ecology.exported>=biomass);
 assert.throws(()=>s.command('antibiotic'));assert.throws(()=>s.command('feed'));
});
test('competition yield and newcomer mass close independently, not just global carbon',()=>{
 const {s}=run(),e=s.summary().ecology;
 near(e.newcomer,16*.08+COMPETITION_RULES.yield*e.usedByNewcomer-e.washedNewcomer-e.maintenanceNewcomer);
 const edges=Object.values(s.ecology.transport.ledger);
 near(edges.filter(e=>['resident','newcomer','other'].includes(e.from)&&e.to==='colon').reduce((n,e)=>n+e.amount,0),Object.values(s.ecology.uptake).reduce((n,v)=>n+v,0)*(1-COMPETITION_RULES.yield));
 near(s.summary().carbonError,0);
});
test('new meal cannot traverse the whole chain in one step',()=>{
 const s=new LocalSimulation({scenario:'transport'});s.command('transport_meal');
 assert.equal(s.ecology.transport.small.d,0);s.step();assert.ok(s.ecology.transport.small.d>0);assert.equal(s.ecology.transport.portal.d,0);
 s.step();assert.ok(s.ecology.transport.portal.d>0);assert.equal(s.ecology.transport.liver.d,0);
 s.step();assert.ok(s.ecology.transport.liver.d>0);assert.equal(s.ecology.transport.blood.d,0);
 s.step();assert.ok(s.ecology.transport.blood.d>0);near(s.summary().carbonError,0);
});
test('slower gastric emptying delays and reduces D peak for same bolus',()=>{
 const {s,a,l}=run('transport'),peak=side=>l.samples.reduce((p,v)=>v[side].bloodD>p.amount?{tick:v.tick,amount:v[side].bloodD}:p,{tick:0,amount:0});
 assert.equal(s.ecology.transport.input,23);assert.equal(a.ecology.transport.input,23);
 assert.ok(peak('b').tick>peak('a').tick);assert.ok(peak('b').amount<peak('a').amount);
 assert.ok(s.ecology.transport.flux.absorbedD>0);assert.ok(s.ecology.transport.flux.absorbedM>0);
 assert.ok(s.ecology.transport.used.d>0&&s.ecology.transport.excreted.d>0);
 assert.ok(s.ecology.transport.flux.systemic<s.ecology.transport.flux.portal);
 near(s.summary().carbonError,0);near(a.summary().carbonError,0);
});
test('closed-system ledger conserves material, nonnegative pools, no hidden feeding',()=>{
 const s=new LocalSimulation({scenario:'transport'});
 for(let i=0;i<4000;i++){
  s.step();if(i===1600){s.command('introduce_newcomer');s.command('restore_other');s.command('transport_feed_on');}
  if(i===1700)s.command('transport_feed_off');
  if(i%20===0){near(s.summary().carbonError,0);for(const key of ['stomach','small','portal','liver','blood','used','excreted'])assert.ok(Object.values(s.ecology.transport[key]).every(v=>Number.isFinite(v)&&v>=0));for(const key of ['r','q','m'])assert.ok(s.ecology[key].every(v=>Number.isFinite(v)&&v>=0));assert.ok(s.entities.every(e=>e.mass>=0));}
 }
 assert.equal(s.ecology.transport.feeding,false);assert.ok(Object.keys(s.ecology.transport.ledger).length<60);
 const t=s.ecology.transport,edges=Object.values(t.ledger),flow=(from,to,k)=>edges.filter(e=>e.from===from&&e.to===to&&e.substance===k).reduce((n,e)=>n+e.amount,0);
 for(const k of ['d','m']){near(t.blood[k],flow('liver','blood',k)-flow('blood','used',k)-flow('blood','excreted',k));near(t.liver[k],flow('portal','liver',k)-flow('liver','blood',k)-flow('liver','used',k));}
});
test('all trials replay shared compartments and validate guided metadata; fork stays free',()=>{
 for(const trial of Object.keys(COMPETITION_TRIALS)){
  const {s,l}=run('competition',trial),record=l.export(s);assert.deepEqual(learningMeta(record.learning,record),l.meta);
  assert.deepEqual(replay(record).snapshot(),s.snapshot());
  const back=replay(record,600);near(back.summary().carbonError,0);back.command('transport_meal');l.fork();assert.equal(l.meta.guided,false);assert.deepEqual(replay(exportReplay(back)).snapshot(),back.snapshot());
 }
 const {s,l}=run('transport');assert.deepEqual(replay(l.export(s)).snapshot(),s.snapshot());
 assert.throws(()=>learningMeta({...l.meta,competitionTrial:'other'},l.export(s)));
});
test('inspection is observational, reports avoid cell counts and brain claims',()=>{
 const {s,a,l}=run(),before=checksum(s.snapshot());measure(s);const r=report(s,a,l);
 assert.equal(checksum(s.snapshot()),before);assert.match(r.observations.join(' '),/группы, не индивидуальные клетки/);assert.match(r.observations.join(' '),/Мозг и нейросигналы не рассчитываются/);
 assert.equal(engineForScenario('oral'),'local-0.9.0');assert.equal(engineForScenario('mucus'),'local-0.8.0');assert.equal(engineForScenario('persistence'),'local-0.7.0');assert.equal(engineForScenario('community'),'local-0.5.0');assert.equal(engineForScenario('competition'),'local-0.10.0');
});
