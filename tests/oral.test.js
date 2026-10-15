import test from 'node:test';
import assert from 'node:assert/strict';
import {LocalSimulation} from '../src/local/engine.js';
import {ORAL_TRIALS,oralPlan,oralPH,oralPlaque} from '../src/local/oral.js';
import {LearningSession,learningMeta,narrate,report} from '../src/local/learning.js';
import {replay,exportReplay,checksum,validateReplay} from '../src/local/replay.js';
import {engineForScenario,siteForScenario,commandsFor} from '../src/local/traits.js';
import {oralSurfaceHeight,oralSurfaceGeometry} from '../src/webgl2/oral-surface.js';
const make=()=>new LocalSimulation({scenario:'oral'}),run=(s,n)=>{for(let i=0;i<n;i++)s.step();},near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
function experiment(trial){const s=make(),plan=oralPlan(trial);for(let i=0;i<2400;i++){s.step();for(const c of plan)if(c.tick===s.tick)s.command(c.kind,c.pos);}return s;}
const results=Object.fromEntries(Object.keys(ORAL_TRIALS).map(k=>[k,experiment(k)]));
test('oral module is isolated to mouth, preserving all three prior replay engines',()=>{
 assert.equal(engineForScenario('oral'),'local-0.9.0');assert.equal(engineForScenario('mucus'),'local-0.8.0');assert.equal(engineForScenario('persistence'),'local-0.7.0');assert.equal(engineForScenario('hgt'),'local-0.5.0');assert.equal(siteForScenario('oral'),'mouth');assert.equal(siteForScenario('mucus'),'colon');
 const s=make();assert.equal(s.entities.length,36);assert.ok(s.entities.every(e=>e.species==='strep'&&Number.isInteger(e.oralPatch)));assert.ok(!commandsFor('oral').includes('breach'));assert.throws(()=>s.command('antibiotic'));
});
test('sugar is a carbon input, not an instantaneous pH or mineral edit',()=>{
 const s=make(),p=oralPH(s,0),m=[...s.oral.mineral],before=s.carbon();s.command('oral_sugar');assert.equal(oralPH(s,0),p);assert.deepEqual(s.oral.mineral,m);near(s.carbon()-before,s.inputCarbon);run(s,60);assert.ok(s.oral.acidMade>0);assert.ok(oralPH(s,0)<p);near(s.summary().carbonError,0);
});
test('mechanical cleaning removes live, matrix and inactive material but not minerals',()=>{
 const s=make();run(s,330);s.command('oral_antiseptic');run(s,20);const a=s.summary().oral,mineral=[...s.oral.mineral],acid=[...s.oral.acid],before=s.carbon();assert.ok(a.dead>0);s.command('oral_brush');const b=s.summary().oral;
 assert.ok(b.plaque<a.plaque&&b.active<a.active&&b.dead<a.dead&&b.matrix<a.matrix);assert.deepEqual(s.oral.mineral,mineral);assert.deepEqual(s.oral.acid,acid);near(s.carbon(),before);assert.ok(s.entities.every(e=>e.mass>0));assert.ok(s.oral.records.at(-1).after.brushed>0);
});
test('brush access is lower in prepared grooves; rinse cannot remove attached scaffold',()=>{
 const s=make(),before=s.entities.map(e=>e.mass);s.command('oral_brush');near(s.entities[0].mass/before[0],.15);near(s.entities[2].mass/before[2],.7);
 for(const action of ['oral_water','oral_fluoride','oral_antiseptic']){const b=s.summary().oral;s.command(action);near(s.summary().oral.plaque,b.plaque);near(s.summary().oral.mineral,b.mineral);}
});
test('water flushes dissolved material and previously applied agents without sterilisation',()=>{
 const s=make();run(s,600);s.command('oral_fluoride');s.command('oral_antiseptic');const a=s.summary().oral;s.command('oral_water');const b=s.summary().oral;
 assert.ok(b.acid<a.acid&&b.minPH>a.minPH);assert.ok(b.fluoride<a.fluoride&&b.antiseptic<a.antiseptic);near(a.plaque,b.plaque);near(s.summary().carbonError,0);
});
test('fluoride changes mineral balance without magically changing plaque metabolism or pH',()=>{
 const a=results.water.summary().oral,b=results.fluoride.summary().oral;
 near(a.plaque,b.plaque);near(a.minPH,b.minPH);near(a.acidMade,b.acidMade);assert.ok(b.mineral>a.mineral);assert.ok(b.dissolved<a.dissolved);
});
test('antiseptic acts transiently and retains inactive attached material',()=>{
 const a=results.water.summary().oral,b=results.antiseptic.summary().oral;assert.ok(b.active<a.active);assert.ok(b.acidMade<a.acidMade);assert.ok(b.dead>0);assert.ok(b.plaque>results.brush_regular.summary().oral.plaque);
 const s=make();s.command('oral_antiseptic');run(s,600);assert.ok(s.summary().oral.antiseptic<.01);assert.ok(s.entities.every(e=>e.mass>0));near(s.summary().carbonError,0);
});
test('no-cleaning accumulation and regrowth after one brush differ from repeated cleaning',()=>{
 const n=results.none.summary().oral,once=results.brush_once.summary().oral,regular=results.brush_regular.summary().oral;
 assert.ok(n.plaque>make().summary().oral.plaque*5);assert.ok(once.plaque>regular.plaque*2);assert.ok(regular.mineral>n.mineral);assert.ok(n.defects>0);assert.equal(results.none.commands.length,0);
});
test('less saliva impairs buffering and clearance under identical sugar inputs',()=>{
 const a=make(),b=make();b.command('oral_dry');run(a,600);run(b,600);near(a.inputCarbon,b.inputCarbon);assert.ok(b.summary().oral.minPH<a.summary().oral.minPH);assert.ok(b.oral.dissolved>a.oral.dissolved);
 const before=[...b.oral.mineral];b.command('oral_saliva');assert.deepEqual(b.oral.mineral,before);
});
test('resting conditions permit remineralisation but never restore lost structural capacity',()=>{
 const s=replay(exportReplay(results.none)),caps=[...s.oral.capacity],start=s.summary().oral;s.command('oral_snacks_off');s.command('oral_brush');s.command('oral_fluoride');run(s,2400);
 assert.ok(s.summary().oral.minPH>start.minPH);assert.ok(s.summary().oral.mineral>start.mineral);assert.ok(s.oral.capacity.every((v,i)=>v<=caps[i]));assert.ok(s.oral.mineral.every((v,i)=>v<=s.oral.capacity[i]));assert.ok(s.summary().oral.defects>0);
});
test('carbon and separate mineral budgets remain nonnegative and bounded for 6000 steps',()=>{
 const s=make();for(let i=0;i<6000;i++){if(i===100)s.command('oral_dry');if(i===700)s.command('oral_fluoride');if(i===1800)s.command('oral_brush');if(i===3000)s.command('oral_snacks_off');s.step();}
 assert.equal(s.stopped,true);near(s.summary().carbonError,0);near(s.summary().oral.mineralError,0);
 for(const key of ['sugar','acid','buffer','matrix','dead','waste','mineral','capacity','ions','fluoride','antiseptic'])assert.ok(s.oral[key].every(v=>Number.isFinite(v)&&v>=0));
 assert.ok(s.oral.mineral.every((v,i)=>v<=s.oral.capacity[i]&&v<=1));
});
test('every care variant has an exact replay and validates its own guided plan',()=>{
 for(const [trial,s] of Object.entries(results)){
  const learning=new LearningSession({version:1,study:'oral',oralTrial:trial,prediction:1,reflection:'Разные механизмы.',guided:true}),record=learning.export(s);
  assert.deepEqual(replay(record).snapshot(),s.snapshot());assert.deepEqual(learningMeta(record.learning,record),learning.meta);
  const changed={...record.learning,oralTrial:trial==='none'?'water':'none'};assert.throws(()=>learningMeta(changed,record));
 }
});
test('wrong engine and invalid variant are rejected; branch does not apply future care',()=>{
 const s=results.brush_regular,r=exportReplay(s);assert.throws(()=>validateReplay({...r,engine:'local-0.8.0'}));assert.throws(()=>learningMeta({version:1,study:'oral',oralTrial:'__proto__',prediction:1,reflection:'',guided:true},r));
 const b=replay(r,500);run(b,400);assert.equal(b.commands.length,1);const c=replay(r,900);assert.equal(c.commands.length,3);assert.ok(b.summary().oral.plaque>c.summary().oral.plaque);
});
test('rendering reads computed structural capacity and never modifies biology',()=>{
 const s=make(),hash=checksum(s.snapshot()),g=oralSurfaceGeometry(s);assert.ok(g.vertices.every(Number.isFinite));assert.ok(g.indices.every(i=>i<g.vertices.length/6));assert.equal(checksum(s.snapshot()),hash);
 const y=oralSurfaceHeight(s,-20,-20);s.oral.capacity[0]=.5;assert.ok(oralSurfaceHeight(s,-20,-20)<y);assert.equal(oralSurfaceGeometry(s).vertices.length,g.vertices.length);
});
test('narrator distinguishes sugar, buffering, early mineral change and structural defects',()=>{
 const s=results.none,l=new LearningSession({version:1,study:'oral',oralTrial:'none',prediction:1,reflection:'',guided:true});
 for(const kind of ['oral_sugar','oral_acid','oral_buffer','oral_defect']){const e=s.events.find(e=>e.kind===kind);assert.ok(e,kind);const n=narrate(s,e);assert.ok(n.rule&&n.limit);}
 assert.match(narrate(s,s.events.find(e=>e.kind==='oral_defect')).rule,/уже не растёт/);assert.match(report(s,results.none,l).observations.join(' '),/не процент здоровья/);
});
