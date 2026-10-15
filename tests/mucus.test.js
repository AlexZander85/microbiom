import test from 'node:test';
import assert from 'node:assert/strict';
import {LocalSimulation} from '../src/local/engine.js';
import {ChemicalGrid,CARBON} from '../src/local/chemistry.js';
import {MUCUS_RULES,mucusPatch,stepMucus,mucusPermeability} from '../src/local/mucus.js';
import {STUDIES,LearningSession,learningMeta,measure,narrate,report} from '../src/local/learning.js';
import {exportReplay,replay,validateReplay,checksum} from '../src/local/replay.js';
import {engineForScenario,commandsFor} from '../src/local/traits.js';
import {filmHeight,filmGeometry} from '../src/webgl2/mucus-film.js';
const make=seed=>new LocalSimulation({scenario:'mucus',seed:seed??85});
const run=(s,n)=>{for(let i=0;i<n;i++)s.step();};
const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
function study(seed=85){
 const sim=make(seed),control=make(seed),learning=new LearningSession({version:1,study:'mucus',prediction:1,reflection:'Баланс, а не ярлык.',guided:true}),stages={};
 learning.capture(sim,control);
 while(sim.tick<STUDIES.mucus.end){sim.step();control.step();learning.applyPlan(sim);learning.capture(sim,control);if([90,360,720].includes(sim.tick))stages[sim.tick]={b:sim.summary(),a:control.summary()};}
 return {sim,control,learning,stages};
}
const computed=study();

test('mucus has its own version, commands and independent counted material pools',()=>{
 const s=make();assert.equal(s.version,'local-0.8.0');assert.equal(engineForScenario('persistence'),'local-0.7.0');assert.equal(engineForScenario('community'),'local-0.5.0');
 assert.equal(s.mucus.inner.length,144);assert.equal(s.mucus.outer.length,144);assert.equal(s.entities.length,20);
 assert.deepEqual(commandsFor('mucus'),['substrate_off','substrate_on','secretion_slow','secretion_restore']);
 near(s.summary().carbonError,0);assert.throws(()=>s.command('breach'));assert.throws(()=>s.command('antibiotic'));
 const before=checksum(s.snapshot()),other=make();other.mucus.inner[0]=0;assert.equal(checksum(s.snapshot()),before);
});
test('changing supply neither deletes existing substrate nor instantly repairs mucus',()=>{
 const s=make(),before=s.carbon(),food=s.chemistry.total('food'),film=[...s.mucus.inner];
 s.command('substrate_off');assert.equal(s.chemistry.total('food'),food);assert.deepEqual(s.mucus.inner,film);near(s.carbon(),before);
 run(s,300);const thin=[...s.mucus.inner],used=s.mucus.innerUsed;assert.ok(used>0);
 s.command('substrate_on');assert.deepEqual(s.mucus.inner,thin);assert.equal(s.mucus.innerUsed,used);assert.equal(s.mucus.substrate,true);
});
test('the host supplies carbon independently of luminal input and distributes a scarce reserve fairly',()=>{
 const s=make();s.command('substrate_off');s.mucus.inner.fill(0);s.mucus.outer.fill(0);s.mucus.host=0;
 const carbon=s.carbon(),input=s.inputCarbon;stepMucus(s,.1);
 assert.ok(s.mucus.host>=0);assert.ok(s.mucus.secreted<=MUCUS_RULES.hostInput*.1+1e-12);
 assert.ok(s.mucus.inner.every(v=>Math.abs(v-s.mucus.inner[0])<1e-12));
 assert.equal(s.mucus.foodInput,0);assert.ok(s.mucus.hostInput>0);near(s.carbon()-carbon,s.inputCarbon-input);
});
test('maturation and shedding transfer carbon instead of creating or silently removing it',()=>{
 const s=make();s.command('substrate_off');const before=s.carbon(),input=s.inputCarbon;
 stepMucus(s,.1);assert.ok(s.mucus.secreted>0&&s.mucus.matured>0&&s.mucus.shed>0&&s.mucus.exported>0);
 near(s.carbon()-before,s.inputCarbon-input);assert.ok(s.mucus.outer[0]>MUCUS_RULES.outer);
});
test('outer consumption is normal here: the specialist does not consume inner material',()=>{
 const s=make(),e=s.get(13),k=mucusPatch(s,e.pos);assert.equal(e.species,'akk');
 s.mucus.outer[k]=0;const inner=s.mucus.inner[k],carbon=s.carbon();s.grow(e);
 assert.equal(s.mucus.inner[k],inner);assert.equal(s.mucus.innerUsed,0);near(s.carbon(),carbon);
 const c=computed.control.summary().mucus;assert.ok(c.outerUsed>0);assert.equal(c.innerUsed,0);assert.equal(c.thinPatches,0);assert.ok(c.minInner>=1);
});
test('switching needs local shortage and inner access requires depletion of outer cover',()=>{
 const s=make(),e=s.get(1),k=mucusPatch(s,e.pos),inner=s.mucus.inner[k];s.grow(e);assert.equal(e.mucusMode,'food');
 s.chemistry.values.food.fill(0);const carbon=s.carbon();s.grow(e);assert.equal(e.mucusMode,'mucin');assert.equal(s.mucus.inner[k],inner);near(s.carbon(),carbon);
 s.mucus.outer[k]=0;const before=s.carbon();s.grow(e);assert.ok(s.mucus.inner[k]<inner);assert.ok(s.mucus.innerUsed>0);near(s.carbon(),before);
 s.chemistry.values.food.fill(.2);s.grow(e);assert.equal(e.mucusMode,'food');
});
test('lower secretion changes renewal without changing the microbial supply or host input rule',()=>{
 const a=make(),b=make();b.command('secretion_slow');a.step();b.step();near(b.mucus.secreted,a.mucus.secreted*.25);run(a,249);run(b,249);
 assert.equal(b.mucus.substrate,true);near(a.mucus.foodInput,b.mucus.foodInput);
 assert.ok(b.mucus.secreted<a.mucus.secreted);assert.ok(b.summary().mucus.minInner<a.summary().mucus.minInner);
 const film=[...b.mucus.inner];b.command('secretion_restore');assert.deepEqual(b.mucus.inner,film);near(b.summary().carbonError,0);
});
test('local film resistance changes chemical transport but conserves paired face fluxes',()=>{
 const a=new ChemicalGrid(),b=new ChemicalGrid(),k=a.index(4,2,4),column=k%144;
 a.values.butyrate[k]=b.values.butyrate[k]=1;
 const intact=Array(144).fill(1),thin=[...intact];thin[column]=0;
 a.diffuse(.1,intact);b.diffuse(.1,thin);assert.ok(b.values.butyrate[k-144]>a.values.butyrate[k-144]);near(a.carbon(),1);near(b.carbon(),1);
 const sim=make();sim.mucus.inner[column]=0;assert.equal(mucusPermeability(sim)[column],0);assert.equal(mucusPermeability(sim)[column+1],1);
});
test('guided depletion and recovery are computed with matched independent control and no epithelial invasion',()=>{
 const {sim,control,stages}=computed;
 assert.equal(stages[90].b.mucus.substrate,false);assert.equal(stages[360].b.mucus.substrate,true);
 assert.ok(stages[360].b.mucus.minInner<.2);assert.equal(stages[360].b.mucus.thinPatches,12);
 assert.ok(stages[720].b.mucus.minInner>.9);assert.equal(stages[720].b.mucus.thinPatches,0);
 assert.equal(sim.counts.mucus_recover,12);assert.equal(control.commands.length,0);assert.equal(control.counts.mucus_thin,undefined);
 assert.ok(sim.entities.every(e=>!e.alive||e.pos[1]>=0));assert.equal(sim.chemistry.total('signal'),0);
 near(sim.summary().carbonError,0);near(control.summary().carbonError,0);assert.equal(sim.capacityHits,0);
});
test('material bookkeeping remains finite and nonnegative for the bounded long run',()=>{
 const s=make(19);for(let t=0;t<6000;t++){if(t===100)s.command('substrate_off');if(t===900)s.command('secretion_slow');if(t===1600)s.command('substrate_on');if(t===2400)s.command('secretion_restore');s.step();}
 assert.equal(s.stopped,true);assert.ok(Math.abs(s.summary().carbonError)<1e-7);
 for(const pool of [s.mucus.inner,s.mucus.outer,...CARBON.map(k=>s.chemistry.values[k])])assert.ok(pool.every(v=>Number.isFinite(v)&&v>=0));
 assert.ok(s.mucus.host>=0&&s.mucus.host<=10);assert.ok(s.entities.filter(e=>e.alive).every(e=>e.mass>=0));
});
test('mucus replay restores pools, input/export ledger, events, metrics and teaching record exactly',()=>{
 const {sim,learning}=computed,record=learning.export(sim),restored=replay(record);
 assert.deepEqual(restored.snapshot(),sim.snapshot());assert.deepEqual(restored.flux,sim.flux);assert.deepEqual(measure(restored),measure(sim));
 assert.deepEqual(learningMeta(record.learning,record),learning.meta);
 const snap=sim.snapshot(),before=checksum(snap);snap.mucus.inner[0]+=.01;assert.notEqual(checksum(snap),before);
 assert.throws(()=>validateReplay({...record,engine:'local-0.7.0'}));assert.throws(()=>validateReplay({...record,scenario:'persistence'}));
 assert.throws(()=>learningMeta({...record.learning,guided:true},{...record,commands:record.commands.slice(0,1)}));
});
test('rewind and fork do not silently restore future dietary substrate',()=>{
 const {sim,learning}=computed,record=learning.export(sim),branch=replay(record,220);
 assert.equal(branch.mucus.substrate,false);run(branch,300);assert.equal(branch.commands.length,1);assert.equal(branch.mucus.substrate,false);
 assert.ok(branch.summary().mucus.minInner<.1);assert.equal(learningMeta({...learning.meta,guided:false},exportReplay(branch)).guided,false);
});
test('new seed runs also deplete and renew; no scheduled amount assignment produces the result',()=>{
 for(const seed of [7,2026]){const s=make(seed);run(s,90);s.command('substrate_off');run(s,270);const low=s.summary().mucus.minInner;assert.ok(low<.2);s.command('substrate_on');run(s,360);assert.ok(s.summary().mucus.minInner>low+.6);near(s.summary().carbonError,0);}
});
test('narrator and report distinguish material renewal from epithelial injury and taxon moral labels',()=>{
 const {sim,control,learning}=computed;
 for(const kind of ['mucus_supply','mucus_switch','mucus_thin','mucus_recover']){
  const e=sim.events.find(e=>e.kind===kind),n=narrate(sim,e);assert.ok(e);assert.equal(n.seq,e.seq);assert.ok(n.text&&n.rule&&n.limit);
 }
 assert.match(narrate(sim,sim.events.find(e=>e.kind==='mucus_thin')).limit,/не равно повреждению эпителия/);
 const r=report(sim,control,learning);assert.ok(r.observations.some(x=>/Минимальный внутренний запас/.test(x)));assert.match(r.explanation,/пропущенном обеде/);
 assert.ok(learning.samples.every(p=>Number.isFinite(p.a.mucusMinimum)&&Number.isFinite(p.b.mucusMinimum)));
});
test('3D surfaces derive from both local material arrays; changing a pixel cannot change the model',()=>{
 const s=make(),m=s.mucus,initial=checksum(s.snapshot()),k=5*12+4,x=-24+(4+.5)*4,z=-24+(5+.5)*4;
 near(filmHeight(m,12,x,z),2.4);near(filmHeight(m,12,x,z,true),3.8);
 const geometry=filmGeometry(m,12);assert.ok(geometry.vertices.every(Number.isFinite));assert.ok(geometry.indices.every(i=>i>=0&&i<geometry.vertices.length/6));
 assert.equal(checksum(s.snapshot()),initial);m.inner[k]*=.5;m.outer[k]=0;near(filmHeight(m,12,x,z),1.2);near(filmHeight(m,12,x,z,true),1.2);
 assert.equal(filmGeometry(m,12).vertices.length,geometry.vertices.length);
});
