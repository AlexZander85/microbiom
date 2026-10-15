import test from 'node:test';
import assert from 'node:assert/strict';
import {LocalSimulation} from '../src/local/engine.js';
import {assayCounts,PERSISTENCE_RULES} from '../src/local/persistence.js';
import {LearningSession,STUDIES,narrate,report,learningMeta} from '../src/local/learning.js';
import {replay,exportReplay,validateReplay,checksum} from '../src/local/replay.js';
import {LocalCloud} from '../src/local/cloud-adapter.js';
import {Model} from '../src/model.js';
const make=(seed=85)=>new LocalSimulation({scenario:'persistence',seed});
const run=(s,n)=>{for(let i=0;i<n;i++)s.step();return s;};
const plan=STUDIES.persistence;
const lesson=()=>new LearningSession({version:1,study:'persistence',prediction:1,reflection:'Выживание не доказывает новый ген.',guided:true});
function experiment(seed=85,end=440){
 const sim=make(seed),control=make(seed),learning=lesson(),stages={};learning.capture(sim,control);
 for(let i=0;i<end;i++){sim.step();control.step();learning.applyPlan(sim);learning.capture(sim,control);if([100,330,340,430,440].includes(sim.tick))stages[sim.tick]=assayCounts(sim);}
 return {sim,control,learning,stages};
}

test('prepared slow minority shares susceptible genotype, not a plasmid or spore',()=>{
 const s=make();assert.deepEqual(assayCounts(s),{sensitive:13,persisterOrigin:3,resistant:4,persisters:3,activeSensitive:13,recoveredLine:0,total:20});
 assert.equal(s.get(14).variant,s.get(1).variant);assert.deepEqual(s.get(14).traits,s.get(1).traits);
 assert.ok(s.entities.every(e=>!e.plasmids.length&&!e.traits.spore&&!e.traits.compatibility));
 assert.equal(s.summary().spores,0);assert.equal(s.summary().plasmids,0);
});
test('slow state has maintenance but no uptake or division, and conserves carbon',()=>{
 const s=make(),e=s.get(14);s.random=()=>.999999;const mass=e.mass,food=s.chemistry.total('food');
 s.grow(e);assert.ok(e.mass<mass);assert.equal(s.chemistry.total('food'),food);
 const count=s.entities.length;s.divide(e,'division');assert.equal(s.entities.length,count);
 assert.ok(Math.abs(s.summary().carbonError)<1e-8);
});
test('washout does not instantly awaken, resurrect or change the genotype',()=>{
 const s=make();s.command('challenge');run(s,90);const dead=s.entities.filter(e=>!e.alive).map(e=>e.id),slow=s.entities.filter(e=>e.alive&&e.state==='persister');assert.ok(slow.length);
 const before=slow.map(e=>[e.id,e.variant]);s.command('washout');assert.ok(slow.every(e=>e.state==='persister'));
 run(s,80);assert.ok(before.every(([id,v])=>s.get(id).variant===v));assert.ok(dead.every(id=>!s.get(id).alive));assert.ok(s.counts.persistence_exit>0);
});
test('recovery requires both absent drug and substrate, not a magic phase button',()=>{
 const s=make(),e=s.get(14);e.slowTicks=100;s.random=()=>0;s.chemistry.values.food.fill(0);s.grow(e);assert.equal(e.state,'persister');
 s.chemistry.values.food.fill(.3);s.grow(e);assert.equal(e.state,'vegetative');
 const drug=make(),p=drug.get(14);p.slowTicks=100;drug.command('challenge');drug.random=()=>.01;drug.grow(p);assert.equal(p.state,'persister');assert.equal(p.alive,true);
});
test('neither a persister nor resistant cell is invulnerable',()=>{
 for(const id of [14,17]){const s=make();s.command('challenge');s.random=()=>0;s.grow(s.get(id));assert.equal(s.get(id).alive,false);assert.equal(s.get(id).cause,'antibiotic');assert.ok(s.events.some(e=>e.kind==='assay_kill'&&e.actors.includes(id)));}
 assert.ok(PERSISTENCE_RULES.slowKill>0&&PERSISTENCE_RULES.resistantKill>0);
});
test('active sensitive cells do not grow under exposure, resistant cells can divide',()=>{
 const s=make();s.command('challenge');s.random=()=>.99999;
 const sensitive=s.get(1),resistant=s.get(17);sensitive.mass=resistant.mass=1.61;
 s.grow(sensitive);assert.equal(sensitive.alive,true);assert.equal(sensitive.parents.length,0);assert.equal(s.lineage(1).children.length,0);
 s.grow(resistant);assert.equal(resistant.state,'divided');for(const id of s.lineage(17).children){assert.equal(s.get(id).traits.demoResistance,true);assert.equal(s.get(id).state,'vegetative');}
});
test('drug field is spatially uniform; slow cells do not survive by receiving less drug',()=>{
 const s=make();s.command('challenge');s.random=()=>.99999;run(s,12);
 const field=s.chemistry.values.drug;assert.ok(field.every(v=>v===field[0]));assert.ok(field[0]>.99);
 assert.equal(s.get(1).exposure,s.get(14).exposure);assert.equal(s.get(14).exposure,s.get(17).exposure);
 s.command('washout');assert.ok(field.every(v=>v===0));
});
test('two challenges use computed outcomes: recovery, susceptible descendants, resistant comparator',()=>{
 const {sim,control,learning,stages}=experiment();
 assert.equal(stages[100].persisterOrigin,3);assert.equal(stages[100].sensitive,0);
 assert.ok(stages[330].recoveredLine>stages[100].persisterOrigin);assert.equal(stages[330].persisters,0);
 assert.ok(stages[430].persisterOrigin<stages[340].persisterOrigin);assert.ok(stages[430].resistant>0);
 assert.equal(control.commands.length,0);assert.ok(assayCounts(control).persisterOrigin>0);
 assert.equal(sim.assay.rounds.length,2);assert.deepEqual(sim.commands,plan.plan);assert.ok(Math.abs(sim.summary().carbonError)<1e-8);
 const r=report(sim,control,learning);assert.ok(r.observations.some(x=>x.includes('Воздействие №2')));assert.match(r.explanation,/не спора/);
});
test('offspring inherit origin label and genetic R, not low activity',()=>{
 const {sim}=experiment(85,330);const children=sim.entities.filter(e=>e.parents.length&&e.cohort==='persister-origin');assert.ok(children.length>=6);
 assert.ok(children.every(e=>e.state==='vegetative'&&!e.traits.demoResistance&&e.variant==='assay-S'));
 assert.ok(sim.entities.filter(e=>e.parents.length&&e.cohort==='resistant').every(e=>e.traits.demoResistance));
});
test('new engine state, exposure, phase snapshots and notes reproduce exactly; seeking has no future pulses',()=>{
 const {sim,learning}=experiment(),record=learning.export(sim),restored=replay(record);
 assert.equal(record.engine,'local-0.7.0');assert.deepEqual(restored.snapshot(),sim.snapshot());assert.deepEqual(restored.flux,sim.flux);
 assert.equal(learningMeta(record.learning,record).prediction,1);
 const branch=replay(record,200);assert.equal(branch.assay.rounds.length,1);run(branch,240);assert.equal(branch.assay.rounds.length,1);assert.equal(branch.assay.bath,0);
 assert.ok(assayCounts(branch).persisterOrigin>0);
});
test('old engines remain exact and cannot import new assay commands or changed engine tags',()=>{
 const s=new LocalSimulation({scenario:'hgt'});run(s,100);const old=exportReplay(s);assert.equal(old.engine,'local-0.5.0');assert.deepEqual(replay(old).snapshot(),s.snapshot());
 const now=exportReplay(make());assert.throws(()=>validateReplay({...now,engine:'local-0.5.0'}));assert.throws(()=>validateReplay({...old,engine:'local-0.7.0'}));
 assert.throws(()=>validateReplay({...old,commands:[{tick:0,kind:'challenge',pos:[0,3,0]}]}));
 assert.throws(()=>validateReplay({...now,commands:[{tick:0,kind:'antibiotic',pos:[0,3,0]}]}));
 const assay=make();assert.throws(()=>assay.command('washout'));assert.equal(assay.commands.length,0);assay.command('challenge');assert.throws(()=>assay.command('challenge'));assert.equal(assay.commands.length,1);
});
test('event narrator and state graphics are read-only and distinguish state from lineage',()=>{
 const s=make(),cloud=new LocalCloud(s,new Model()),hash=checksum(s.snapshot());
 assert.match(cloud.thought(13),/Ⅱ.*не спора.*S-demo/);assert.match(cloud.thought(16),/R-demo/);assert.equal(cloud.activity[13],0);assert.equal(cloud.shape(13),'rod');
 assert.match(narrate(s,s.events.find(e=>e.kind==='persistence_enter')).limit,/не все/);assert.equal(checksum(s.snapshot()),hash);
});
test('different seeds remain bounded and balanced without forced narrative outcomes',()=>{
 for(const seed of [1,12,92]){const {sim}=experiment(seed);assert.ok(sim.entities.filter(e=>e.alive).length<=192);assert.ok(Math.abs(sim.summary().carbonError)<1e-8);assert.equal(sim.assay.rounds.length,2);assert.ok(sim.entities.every(e=>Number.isFinite(e.mass)&&e.mass>=0));}
});
