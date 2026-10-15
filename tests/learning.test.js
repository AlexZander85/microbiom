import test from 'node:test';
import assert from 'node:assert/strict';
import {LocalSimulation} from '../src/local/engine.js';
import {checksum,exportReplay,ReplayRunner,replay} from '../src/local/replay.js';
import {LearningSession,STUDIES,learningMeta,measure,narrate,highlights,report} from '../src/local/learning.js';
import {chartMarkup} from '../src/local/learning-view.js';
const meta=id=>({version:1,study:id,prediction:1,reflection:'Моя гипотеза',guided:true});
function study(id){
 const plan=STUDIES[id],sim=new LocalSimulation({scenario:plan.scenario}),control=new LocalSimulation({scenario:plan.scenario}),learning=new LearningSession(meta(id));
 learning.applyPlan(sim);learning.capture(sim,control);
 for(let i=0;i<plan.end;i++){sim.step();control.step();learning.applyPlan(sim);learning.capture(sim,control);}
 return {sim,control,learning};
}
function restore(record,target=record.endTick){
 const runner=new ReplayRunner(record,target),control=new LocalSimulation(record),learning=new LearningSession(learningMeta(record.learning,runner.record));
 learning.capture(runner.sim,control);let done=false;
 while(!done){done=runner.run(1);while(control.tick<runner.sim.tick)control.step();learning.capture(runner.sim,control);}
 return {sim:runner.sim,control,learning};
}

test('observational flux counters preserve all six pre-change biological checksums',()=>{
 const expected={community:'4d109c59',hgt:'e56296ed',t6:'fe4633e7',phage:'b187c632',immune:'6e5dacb9',cycles:'c96459ff'};
 for(const [scenario,hash] of Object.entries(expected)){
  const s=new LocalSimulation({scenario});for(let i=0;i<120;i++){if(i===10)s.command('feed');s.step();}
  assert.equal(checksum(s.snapshot()),hash,scenario);
 }
});
test('relay accounts for actual conservative uptake, production and tissue sink',()=>{
 const s=new LocalSimulation();for(let i=0;i<160;i++)s.step();
 for(const v of Object.values(s.flux))assert.ok(v>0);
 assert.ok(Math.abs(s.flux.producerFood*.5-s.flux.acetateMade)<1e-12);
 assert.ok(Math.abs(s.flux.acetateUsed*.5-s.flux.butyrateMade)<1e-12);
 assert.ok(Math.abs(s.flux.acetateMade-s.flux.acetateUsed-s.chemistry.total('acetate'))<1e-10);
 assert.ok(Math.abs(s.flux.butyrateMade-s.flux.tissueButyrate-s.chemistry.total('butyrate'))<1e-10);
 assert.ok(Math.abs(s.summary().carbonError)<1e-8);
 const before=checksum(s.snapshot()),flux={...s.flux};measure(s);narrate(s,s.events.at(-1));assert.equal(checksum(s.snapshot()),before);assert.deepEqual(s.flux,flux);
});
test('relay displays honest zero when a scenario has no metabolic participants',()=>{
 const s=new LocalSimulation({scenario:'phage'});for(let i=0;i<130;i++)s.step();assert.ok(Object.values(s.flux).every(x=>x===0));
});
test('inheritance study produces real transfer and daughters, with transfer also in control',()=>{
 const {sim,control,learning}=study('inheritance');assert.equal(sim.counts.transfer,1);assert.equal(control.counts.transfer,1);
 assert.ok(sim.summary().plasmids>control.summary().plasmids);assert.equal(sim.get(1).plasmids[0],'pDemoR');
 assert.ok(sim.lineage(2).children.length);for(const id of sim.lineage(2).children)assert.ok(sim.get(id).plasmids.includes('pDemoR'));
 assert.deepEqual(sim.commands,STUDIES.inheritance.plan);assert.deepEqual(control.commands,[]);
 assert.equal(learningMeta(learning.export(sim).learning,learning.export(sim)).study,'inheritance');
});
test('phage study changes only the scheduled intervention, retains receptor-negative variant',()=>{
 const {sim,control}=study('phage');assert.equal(sim.counts.induction,1);assert.equal(control.counts.induction,undefined);
 assert.equal(sim.counts.lysis,2);assert.equal(control.counts.lysis,1);assert.equal(sim.get(5).alive,true);assert.equal(sim.get(5).infection,null);
 assert.equal(sim.summary().lysogens,0);assert.equal(control.summary().lysogens,1);assert.equal(sim.commands[0].tick,35);
});
test('boundary study teaches access rather than fabricating guaranteed phagocytosis',()=>{
 const {sim,control,learning}=study('boundary');assert.ok(sim.get(3).pos[1]<0);assert.ok(control.get(3).pos[1]>=0);
 assert.equal(sim.get(3).alive,true);assert.equal(control.get(3).alive,true);
 const r=report(sim,control,learning);assert.match(r.observations.join(' '),/Начальная клетка #3: в ткани; в контроле: в просвете/);
 assert.match(r.prompt,/немедленного/);assert.equal(r.phase,'План завершён');
});
test('replay reconstructs flux, paired series, predictions and reflections exactly',()=>{
 for(const id of Object.keys(STUDIES)){
  const original=study(id),record=original.learning.export(original.sim),restored=restore(record);
  assert.deepEqual(restored.sim.flux,original.sim.flux);assert.deepEqual(restored.learning.samples,original.learning.samples);
  assert.deepEqual(restored.learning.meta,original.learning.meta);assert.deepEqual(restored.control.snapshot(),original.control.snapshot());
  assert.deepEqual(restored.learning.export(restored.sim),record);
 }
});
test('seeking discards future samples and forking does not execute future study commands',()=>{
 const original=study('phage'),record=original.learning.export(original.sim),{sim,control,learning}=restore(record,15);
 assert.ok(learning.samples.every(p=>p.tick<=15));assert.equal(learning.points(sim,control).at(-1).tick,15);
 assert.equal(report(sim,control,learning).phase,'Промежуточный итог — план ещё не завершён');
 learning.fork();for(let i=15;i<180;i++){sim.step();control.step();learning.applyPlan(sim);learning.capture(sim,control);}
 assert.equal(sim.counts.induction,undefined);assert.deepEqual(sim.commands,[]);
 assert.match(report(sim,control,learning).phase,/Свободная ветка/);
 const again=restore(learning.export(sim));assert.deepEqual(again.learning.samples,learning.samples);
});
test('learning metadata rejects malformed, forged-plan and incompatible records; legacy accepted',()=>{
 const {sim,learning}=study('phage'),record=learning.export(sim);
 for(const bad of [null,{...record.learning,version:2},{...record.learning,study:'bogus'},{...record.learning,prediction:-1},{...record.learning,reflection:'x'.repeat(601)},{...record.learning,guided:'yes'}])assert.throws(()=>learningMeta(bad,record));
 assert.throws(()=>learningMeta(record.learning,{...record,scenario:'hgt'}));
 assert.throws(()=>learningMeta(record.learning,{...record,commands:[]}));
 assert.throws(()=>learningMeta(record.learning,{...record,endTick:999}));
 assert.equal(learningMeta(undefined,exportReplay(sim)).study,null);assert.deepEqual(replay(exportReplay(sim)).snapshot(),sim.snapshot());
});
test('sampling is bounded, idempotent, synchronized and independent of redraw frequency',()=>{
 const s=new LocalSimulation({scenario:'phage'}),a=new LocalSimulation({scenario:'phage'}),l=new LearningSession();
 l.capture(s,a);l.capture(s,a);assert.equal(l.samples.length,1);
 s.step();assert.throws(()=>l.capture(s,a),/Несинхронный/);a.step();l.capture(s,a);assert.equal(l.samples.length,1);
 // Sampling policy has at most 601 regular slots + 256 intervention slots.
 for(let tick=2;tick<=6000;tick++){s.tick=a.tick=tick;l.capture(s,a);l.capture(s,a);}
 assert.equal(l.samples.length,601);
});
test('causal narrator links actual transfer contact, lysis assembly and induction, not nearby unrelated events',()=>{
 const h=study('inheritance').sim,t=h.events.find(e=>e.kind==='transfer'),n=narrate(h,t);
 assert.match(n.text,/сохранил/);assert.equal(n.links.length,1);assert.equal(h.events.find(e=>e.seq===n.links[0].seq).kind,'conjugation');
 const p=study('phage').sim,e=p.events.find(e=>e.kind==='lysis'&&e.actors[0]===3),story=narrate(p,e);
 assert.ok(story.links.some(x=>x.label==='Индукция профага'));assert.ok(story.links.some(x=>x.label==='Сборка потомства'));
 assert.ok(story.links.every(x=>x.tick<=e.tick));assert.match(story.text,/8 новых фагов/);
 assert.ok(highlights(p).every(e=>p.events.includes(e)));assert.equal(narrate(p,null).seq,undefined);
});
test('summary preserves even incorrect predictions without scoring or forcing a clinical conclusion',()=>{
 const {sim,control,learning}=study('inheritance');learning.meta.prediction=0;const r=report(sim,control,learning);
 assert.equal(r.prediction,STUDIES.inheritance.options[0]);assert.match(r.limitation,/не клинические/);assert.match(r.explanation,/не создаёт/);
 learning.fork();assert.match(report(sim,control,learning).phase,/Свободная ветка/);
});
test('charts are finite at zero/time zero, distinguish A/B without colour and include accessible values',()=>{
 const s=new LocalSimulation({scenario:'phage'}),points=[{tick:0,a:measure(s),b:measure(s)}];
 const svg=chartMarkup(points,'butyrate');assert.match(svg,/role="img"/);assert.match(svg,/stroke-dasharray="7 5"/);assert.match(svg,/Контроль A: 0/);assert.doesNotMatch(svg,/NaN|Infinity/);
 assert.doesNotMatch(chartMarkup(points,'__proto__'),/NaN|Infinity/);
});
