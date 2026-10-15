import test from 'node:test';
import assert from 'node:assert/strict';
import {LocalSimulation} from '../src/local/engine.js';
import {LearningSession,learningMeta,measure,report,narrate,highlights} from '../src/local/learning.js';
import {checksum,replay} from '../src/local/replay.js';
import {LOOP_RULES,LOOP_TRIALS} from '../src/physiology/axis-loop.js';
import {engineForScenario,commandsFor} from '../src/local/traits.js';
const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const fresh=()=>new LocalSimulation({scenario:'axisLoop'});
function run(trial='intact',end=1400){
 const s=fresh(),a=fresh(),l=new LearningSession({version:1,study:'axisLoop',loopTrial:trial,prediction:1,reflection:'Три разных пути',guided:true}),points={};
 l.applyPlan(s);l.capture(s,a);
 while(s.tick<end){s.step();a.step();l.applyPlan(s);l.capture(s,a);if([200,250,500,700,900,1400].includes(s.tick))points[s.tick]={a:a.summary().axisLoop,b:s.summary().axisLoop};}
 return {s,a,l,points};
}
function check(s){
 const p=s.axisLoop,b=s.summary().axisLoop;near(s.summary().carbonError,0);near(b.carbonError,0);near(b.markerError,0);
 for(const pool of [p.food,p.acetate,p.propionate,p.marker])for(const v of Object.values(pool))assert.ok(Number.isFinite(v)&&v>=-1e-12);
 for(const v of [...Object.values(p.immune),...Object.entries(p.neural).filter(([,v])=>typeof v==='number').map(([,v])=>v),...p.neural.inbound,...p.neural.outbound])assert.ok(Number.isFinite(v)&&v>=0&&v<=1);
 assert.ok(b.emptying>=1/3&&b.emptying<=1);assert.equal(p.neural.inbound.length,10);assert.equal(p.neural.outbound.length,20);
 for(const e of Object.values(p.ledger))assert.ok(e.amount>=0&&Number.isFinite(e.amount));
}
test('all nine loop controls conserve carbon and marker independently at every step',()=>{
 for(const loopTrial of Object.keys(LOOP_TRIALS)){
  const s=fresh(),l=new LearningSession({study:'axisLoop',loopTrial,guided:true});l.applyPlan(s);
  for(let i=0;i<1400;i++){s.step();l.applyPlan(s);check(s);}
  assert.equal(s.axisLoop.input,loopTrial==='rescue'?30:24);
 }
});
test('intact is identical to A; computed microbial and three brain endpoints are nonzero',()=>{
 const {s,a}=run();assert.deepEqual(s.snapshot(),a.snapshot());const b=s.summary().axisLoop;
 for(const k of ['fermented','nts','acetateBrain','brainUsed','exposure','ep3','motor'])assert.ok(b[k]>0,k);
 assert.ok(b.emptying<1);assert.deepEqual(new Set(s.axisLoop.marks),new Set(['source','neural','humoral','immune','feedback']));
});
test('carbon yields account for actual microbial substrate use, not a scripted signal',()=>{
 const {s}=run(),p=s.axisLoop,r=LOOP_RULES;
 near(p.flux.acetateMade,p.flux.fermented*r.acetateYield);near(p.flux.propionateMade,p.flux.fermented*r.propionateYield);
 near(Object.values(p.acetate).reduce((a,b)=>a+b,0),p.flux.acetateMade);
 near(Object.values(p.propionate).reduce((a,b)=>a+b,0),p.flux.propionateMade);
 near(p.acetate.brain,p.flux.brainIn-p.flux.brainOut-p.flux.brainUsed);
 const b=s.summary().axisLoop;near(b.acetateBrain,p.acetate.brain/(2*r.volumes.brain));near(b.propionateWall,p.propionate.wall/(3*r.volumes.wall));
});
test('loss of fermentation removes metabolite source, not microbial marker or cells',()=>{
 const {s}=run('source'),b=s.summary().axisLoop;
 for(const k of ['fermented','nts','acetateBrain','brainUsed','motor'])assert.equal(b[k],0,k);
 assert.ok(b.substrate>0);assert.ok(b.biomass>0);assert.ok(b.cytokines>0);assert.equal(b.emptying,1);
});
test('rescue supplies counted metabolite carbon and bypasses synthesis without restoring it',()=>{
 const {s,points}=run('rescue'),b=s.summary().axisLoop;
 assert.equal(b.fermented,0);assert.equal(b.gates.fermentation,false);assert.equal(b.input,30);
 assert.ok(points[500].b.nts>0);assert.ok(b.brainUsed>0);assert.ok(points[500].b.motor>0);
 const source=run('source');near(b.ep3,source.s.summary().axisLoop.ep3);assert.equal(b.biomass,source.s.summary().axisLoop.biomass);
});
test('afferent interruption is selective before feedback changes material delivery',()=>{
 const a=fresh(),b=fresh();a.command('loop_feedback_off');b.command('loop_feedback_off');b.command('loop_neural_off');
 for(let i=0;i<1000;i++){a.step();b.step();}
 assert.ok(a.axisLoop.neural.nts>0);assert.equal(b.axisLoop.neural.nts,0);assert.ok(b.axisLoop.neural.receptor>0);
 for(const k of ['food','acetate','propionate','marker','immune'])assert.deepEqual(a.axisLoop[k],b.axisLoop[k]);
 const closed=run('neural');assert.ok(closed.s.summary().axisLoop.delivered>closed.a.summary().axisLoop.delivered);
});
test('BBB block keeps acetate in blood, does not block neural or immune signals',()=>{
 const {s,a}=run('bbb'),b=s.summary().axisLoop;
 assert.ok(b.acetateBlood>0);assert.equal(b.acetateBrain,0);assert.equal(b.brainUsed,0);assert.equal(b.exposure,0);
 for(const k of ['food','neural','propionate','marker','immune'])assert.deepEqual(s.axisLoop[k],a.axisLoop[k]);
});
test('endothelial blockade preserves peripheral cytokines and other pathways',()=>{
 const {s,a}=run('immune'),b=s.summary().axisLoop;
 assert.ok(b.cytokines>0);assert.equal(b.endothelium,0);assert.equal(b.pge,0);assert.equal(b.ep3,0);
 for(const k of ['food','neural','propionate','acetate','marker'])assert.deepEqual(s.axisLoop[k],a.axisLoop[k]);
 near(b.cytokines,a.summary().axisLoop.cytokines);
});
test('feedback interruption changes actual future substrate delivery, no food teleportation',()=>{
 const {s,a,points}=run('feedback'),b=s.summary().axisLoop;
 assert.equal(b.motor,0);assert.equal(b.emptying,1);assert.ok(b.nts>0);assert.ok(b.acetateBrain>0);assert.ok(b.ep3>0);
 assert.ok(b.delivered>a.summary().axisLoop.delivered);assert.ok(points[700].b.stomach<points[700].a.stomach);
 near(b.input,a.summary().axisLoop.input);assert.ok(Math.abs(b.fermented-a.summary().axisLoop.fermented)>.5);
});
test('intestinal marker permeability is separate from BBB and SCFA transport; repair has a tail',()=>{
 const {s,a,points}=run('barrier');assert.equal(points[200].b.barrier,30);assert.equal(points[700].b.barrier,1);
 assert.ok(points[700].b.ep3>points[700].a.ep3);assert.ok(points[900].b.ep3>points[900].a.ep3);
 for(const k of ['food','acetate','propionate','neural'])assert.deepEqual(s.axisLoop[k],a.axisLoop[k]);
});
test('material advances one compartment per step and neural/efferent delays are real queues',()=>{
 const s=fresh();s.command('loop_source_off');s.command('loop_metabolites');
 s.step();assert.ok(s.axisLoop.acetate.wall>0);assert.equal(s.axisLoop.acetate.portal,0);assert.equal(s.axisLoop.neural.afferent,0);
 s.step();assert.ok(s.axisLoop.acetate.portal>0);assert.equal(s.axisLoop.acetate.liver,0);assert.ok(s.axisLoop.neural.afferent>0);
 s.step();assert.ok(s.axisLoop.acetate.liver>0);assert.equal(s.axisLoop.acetate.blood,0);
 s.step();assert.ok(s.axisLoop.acetate.blood>0);assert.equal(s.axisLoop.acetate.brain,0);
 s.step();assert.ok(s.axisLoop.acetate.brain>0);
 while(s.tick<11)s.step();assert.equal(s.axisLoop.neural.nts,0);s.step();assert.ok(s.axisLoop.neural.nts>0);
 while(s.tick<32)s.step();assert.equal(s.axisLoop.neural.motor,0);s.step();assert.ok(s.axisLoop.neural.motor>0);
});
test('late neural/BBB/immune blocks never erase already present signals and material',()=>{
 const {s}=run('intact',400),before=structuredClone(s.axisLoop);
 for(const c of ['loop_neural_off','loop_bbb_off','loop_immune_off','loop_feedback_off'])s.command(c);
 for(const k of ['food','acetate','propionate','neural','immune'])assert.deepEqual(s.axisLoop[k],before[k]);
 s.step();assert.equal(s.axisLoop.neural.afferent,0);assert.ok(s.axisLoop.neural.nts>0);assert.ok(s.axisLoop.immune.ep3>0);assert.ok(s.axisLoop.acetate.brain>0);assert.ok(s.axisLoop.neural.motor>0);
 assert.ok(s.axisLoop.acetate.brain<before.acetate.brain);near(s.axisLoop.flux.brainIn,before.flux.brainIn);check(s);
});
test('restoring fermentation resumes from stored substrate, with no instant endpoint jump',()=>{
 const {s,points}=run('recover');assert.equal(points[700].b.fermented,0);assert.equal(points[700].b.nts,0);assert.ok(points[900].b.fermented>0);assert.ok(points[900].b.nts>0);
 const before=structuredClone(s.axisLoop);s.command('loop_restore');for(const k of ['food','acetate','propionate','neural','immune'])assert.deepEqual(s.axisLoop[k],before[k]);
});
test('empty substrate cannot create SCFA; reverse BBB flux is bounded and conserved',()=>{
 const s=fresh();s.tick=501;for(let i=0;i<100;i++)s.step();assert.equal(s.axisLoop.flux.fermented,0);assert.equal(s.axisLoop.neural.nts,0);assert.equal(s.axisLoop.acetate.brain,0);check(s);
 s.axisLoop.acetate.brain=2;s.axisLoop.input+=2;s.inputCarbon+=2;const old=s.axisLoop.acetate.brain;s.step();
 assert.ok(s.axisLoop.acetate.brain<old);assert.ok(s.axisLoop.acetate.blood>0);assert.ok(s.axisLoop.flux.brainOut>0);check(s);
});
test('maximum-length mixed-intervention run stays bounded, finite and conservative',()=>{
 const s=fresh(),actions=commandsFor('axisLoop');for(let i=0;i<6000;i++){if(i%113===0)s.command(actions[(i/113)%actions.length]);s.step();if(i%10===0)check(s);}
 assert.equal(s.stopped,true);check(s);assert.ok(Object.keys(s.axisLoop.ledger).length<60);
});
test('all controls replay exactly; saved trial, checkpoints, forks and validation work',()=>{
 for(const trial of Object.keys(LOOP_TRIALS)){
  const {s,l}=run(trial),r=l.export(s);assert.deepEqual(replay(r).snapshot(),s.snapshot());assert.deepEqual(learningMeta(r.learning,r),l.meta);
  const part=replay(r,500),fork=new LearningSession(l.meta);fork.fork();part.command('loop_restore');assert.deepEqual(replay(fork.export(part)).snapshot(),part.snapshot());
 }
 const {s,l}=run('bbb'),r=l.export(s);
 for(const bad of [{...r.learning,loopTrial:'intact'},{...r.learning,loopTrial:'<img>'},{...r.learning,loopTrial:{}},{...r.learning,axisTrial:'synapse'}])assert.throws(()=>learningMeta(bad,r));
 assert.throws(()=>s.command('axis_pulse'));assert.throws(()=>replay({...r,engine:'local-0.11.0'}));
 assert.equal(engineForScenario('axisLoop'),'local-0.13.0');assert.equal(engineForScenario('gutbrain'),'local-0.11.0');assert.equal(engineForScenario('pulseRelay'),'local-0.12.0');
});
test('readouts/narration are observational, report keeps endpoints and units distinct',()=>{
 const {s,a,l}=run(),before=checksum(s.snapshot());measure(s);const text=report(s,a,l).observations.join(' ');
 assert.match(text,/NTS/);assert.match(text,/EP3/);assert.match(text,/ммоль ацетата/);assert.match(text,/желудочного/);
 assert.equal(highlights(s).filter(e=>e.kind==='loop_response').length,5);
 for(const e of highlights(s)){const n=narrate(s,e);assert.ok(n.text.length>0);assert.doesNotMatch(n.text,/undefined|NaN/);}
 assert.equal(checksum(s.snapshot()),before);
});
