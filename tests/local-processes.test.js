import test from 'node:test';
import assert from 'node:assert/strict';
import {ChemicalGrid,CHEMICALS} from '../src/local/chemistry.js';
import {LocalSimulation,SpatialIndex} from '../src/local/engine.js';
import {exportReplay,replay,validateReplay,checksum,ReplayRunner} from '../src/local/replay.js';
import {LOCAL_LIMITS} from '../src/local/traits.js';
import {LocalCloud} from '../src/local/cloud-adapter.js';
import {Model} from '../src/model.js';
const run=(s,n)=>{for(let i=0;i<n;i++)s.step();return s;};
const make=scenario=>new LocalSimulation({scenario});

test('3D finite-volume diffusion conserves all channels with no-flux boundaries and stable substeps',()=>{
 const grid=new ChemicalGrid();for(const k of CHEMICALS)grid.add(k,[-11.9,-1.9,11.9],1);
 for(let i=0;i<30;i++)grid.diffuse(1,.4);
 for(const k of CHEMICALS){assert.ok(Math.abs(grid.total(k)-1)<1e-12);assert.ok(grid.values[k].every(v=>Number.isFinite(v)&&v>=-1e-14));}
 assert.throws(()=>grid.diffuse(Infinity));assert.throws(()=>grid.add('food',[0,0,0],-1));
});
test('epithelial permeability restricts cross-interface diffusion, not an identical field everywhere',()=>{
 const closed=new ChemicalGrid(),open=new ChemicalGrid();for(const f of [closed,open])f.add('food',[0,-.5,0],1);
 closed.diffuse(.1,1);open.diffuse(.1,0);
 assert.ok(open.sample('food',[0,.5,0])>closed.sample('food',[0,.5,0])*10);
 assert.equal(open.sample('food',[10,5,10]),0);
});
test('3D neighbourhood hash rejects distant and vertically separated contacts',()=>{
 const a={id:1,alive:true,pos:[0,0,0]},b={id:2,alive:true,pos:[.5,0,0]},c={id:3,alive:true,pos:[0,4,0]};
 assert.deepEqual(new SpatialIndex([a,b,c]).near(a,1).map(e=>e.id),[2]);
});
test('HGT requires sustained compatible contact and retains a donor copy',()=>{
 const s=run(make('hgt'),35);assert.deepEqual(s.get(1).plasmids,['pDemoR']);assert.deepEqual(s.get(2).plasmids,['pDemoR']);assert.deepEqual(s.get(3).plasmids,[]);
 assert.equal(s.counts.transfer,1);assert.ok(s.events.find(e=>e.kind==='conjugation').tick<s.events.find(e=>e.kind==='transfer').tick);
});
test('HGT cancels on contact loss and cannot transfer between incompatible or dead cells',()=>{
 const s=run(make('hgt'),10);s.get(2).pos=[10,3,0];run(s,40);assert.equal(s.counts.transfer||0,0);assert.equal(s.counts.contact_lost,1);
 const dead=make('hgt');dead.kill(dead.get(2),'test');run(dead,40);assert.equal(dead.counts.transfer||0,0);
});
test('T6SS changes only a nearby susceptible target, not immune or distant controls',()=>{
 const s=run(make('t6'),40);assert.equal(s.get(2).alive,false);assert.equal(s.get(2).cause,'T6SS');assert.equal(s.get(3).hp,1);assert.equal(s.get(4).hp,1);assert.equal(s.counts.t6,2);
});
test('lytic cycle has ordered stages, receptor specificity and resource-funded progeny',()=>{
 const s=run(make('phage'),110),kinds=s.events.filter(e=>e.actors.includes(1)).map(e=>e.kind);
 for(const kind of ['adsorption','injection','eclipse','assembly','lysis','death'])assert.ok(kinds.includes(kind));
 assert.ok(kinds.indexOf('injection')<kinds.indexOf('assembly'));assert.equal(s.get(1).alive,false);assert.equal(s.get(5).infection,null);
 const burst=s.events.find(e=>e.kind==='lysis');assert.equal(burst.burst,8);
 for(const id of burst.actors.slice(1)){assert.deepEqual(s.get(id).parents,[2]);assert.equal(s.get(id).host,1);}
 assert.ok(Math.abs(s.summary().carbonError)<1e-9);
});
test('temperate infection is non-lytic until induction; induction leads to release',()=>{
 const s=run(make('phage'),30);assert.equal(s.get(3).infection.stage,'lysogen');assert.equal(s.get(3).alive,true);
 s.command('induce');run(s,90);assert.equal(s.get(3).alive,false);assert.equal(s.counts.induction,1);assert.equal(s.counts.lysis,2);
});
test('lysis cancels when a host is killed before assembly',()=>{
 const s=run(make('phage'),20);s.kill(s.get(1),'test');run(s,110);assert.equal(s.counts.lysis||0,0);
});
test('innate immune state machine engulfs and digests tissue targets, not luminal controls',()=>{
 const s=run(make('immune'),80);assert.equal(s.get(2).alive,false);assert.equal(s.get(2).cause,'phagocytosis');assert.equal(s.get(3).alive,true);
 assert.equal(s.counts.engulf,1);assert.equal(s.counts.digest,1);assert.equal(s.get(1).gut,0);assert.ok(Math.abs(s.summary().carbonError)<1e-9);
});
test('bacterial division inherits plasmids, uses new stable IDs and records parent history',()=>{
 const s=run(make('cycles'),2),parent=s.get(1),line=s.lineage(1);assert.equal(parent.state,'divided');assert.equal(line.children.length,2);
 for(const id of line.children){assert.deepEqual(s.get(id).plasmids,['pDemoR']);assert.deepEqual(s.get(id).parents,[1]);assert.ok(id>1);}
});
test('fungal bud separates without killing its mother; spores need both substrate and germination cue',()=>{
 const s=run(make('cycles'),100);assert.equal(s.get(2).alive,true);assert.ok(s.lineage(2).children.length>0);assert.equal(s.get(3).state,'spore');
 s.command('germinate',[4,3,0]);run(s,2);assert.equal(s.get(3).state,'spore');
 s.command('feed',[4,3,0]);run(s,35);assert.equal(s.get(3).state,'vegetative');assert.ok(s.counts.germinating>0);
});
test('Candida hyphal transition and branching are conditional, not applied to all fungi',()=>{
 const s=make('cycles');s.command('hypha');run(s,2);assert.equal(s.get(2).state,'hypha');assert.equal(s.counts.branch,1);assert.equal(s.get(3).state,'vegetative');
});
test('3D chemical metabolism, births, deaths and interventions preserve the carbon ledger',()=>{
 for(const scenario of ['community','hgt','t6','phage','immune','cycles']){
  const s=make(scenario);s.command('feed');s.command('antibiotic');s.command('breach');run(s,400);
  assert.ok(Math.abs(s.summary().carbonError)<1e-8,`${scenario}: ${s.summary().carbonError}`);
  for(const k of CHEMICALS)assert.ok(s.chemistry.values[k].every(v=>Number.isFinite(v)&&v>=-1e-12));
 }
});
test('identical seed and ordered interventions reproduce fields, random state, IDs and events exactly',()=>{
 const a=make('community'),b=make('community');for(const s of [a,b]){s.command('feed');run(s,60);s.command('breach');run(s,35);s.command('antibiotic');run(s,90);}
 assert.deepEqual(a.snapshot(),b.snapshot());assert.deepEqual(replay(exportReplay(a)).snapshot(),a.snapshot());
});
test('replay can seek, reconstruct matched control and fork without applying future commands',()=>{
 const s=make('hgt');run(s,20);s.command('feed');const earlier=s.snapshot();run(s,50);s.command('antibiotic');run(s,60);const record=exportReplay(s),branch=replay(record,20);
 assert.deepEqual(branch.snapshot(),earlier);assert.equal(branch.commands.length,1);branch.command('breach');run(branch,20);assert.equal(branch.commands.length,2);
 assert.deepEqual(replay(exportReplay(branch)).snapshot(),branch.snapshot());assert.equal(record.commands[1].kind,'antibiotic');
 const incremental=new ReplayRunner(record);while(!incremental.run(7)){}assert.deepEqual(incremental.sim.snapshot(),s.snapshot());
});
test('commands at tick zero and at the final tick survive JSON save/load',()=>{
 const s=make('phage');s.command('feed');run(s,30);s.command('induce');const record=JSON.parse(JSON.stringify(exportReplay(s)));assert.deepEqual(replay(record).snapshot(),s.snapshot());
});
test('import validates schema, ordering, coordinate bounds, engine and checksum before accepting state',()=>{
 const record=exportReplay(make('hgt'));
 for(const bad of [{...record,version:2},{...record,engine:'future'},{...record,endTick:1e12},{...record,seed:-1},{...record,scenario:'__proto__'},{...record,commands:[{tick:0,kind:'<script>',pos:[0,0,0]}]},{...record,commands:[{tick:0,kind:'feed',pos:[Infinity,3,0]}]},{...record,commands:new Array(300).fill({tick:0,kind:'feed',pos:[0,3,0]})}])assert.throws(()=>validateReplay(bad));
 assert.throws(()=>replay({...record,checksum:'00000000'}));assert.throws(()=>replay(record,-1));
});
test('graphics adapter is read-only; density, calm and visual rate do not change local ecology',()=>{
 const s=run(make('community'),10),snapshot=s.snapshot(),model=new Model(),aggregate=model.snapshot(),cloud=new LocalCloud(s,model);
 cloud.advance(50,{rate:4});cloud.reset(7000);cloud.fieldKind='oxygen';cloud.slice=-1;cloud.updateField();
 assert.deepEqual(s.snapshot(),snapshot);assert.deepEqual(model.snapshot(),aggregate);assert.equal(cloud.count,s.entities.length);assert.equal(cloud.position(0)[0],Math.fround(s.get(1).pos[0]*2));
});
test('caps constrain births explicitly and fixed time limit stops without corrupting balance',()=>{
 const s=make('cycles');while(s.entities.filter(e=>e.alive).length<LOCAL_LIMITS.alive)s.create('coli',[8,3,8]);s.initialCarbon=s.carbon();run(s,2);assert.ok(s.summary().alive<=LOCAL_LIMITS.alive);assert.ok(s.capacityHits>0);assert.ok(Math.abs(s.summary().carbonError)<1e-9);
 s.tick=LOCAL_LIMITS.ticks-1;s.step();assert.equal(s.stopped,true);const hash=checksum(s.snapshot());s.step();assert.equal(checksum(s.snapshot()),hash);assert.throws(()=>s.command('feed'));
});

test('acquired pDemoR changes antibiotic susceptibility, not merely the colour or label',()=>{
 const protectedCell=run(make('hgt'),40),susceptible=replay(exportReplay(protectedCell));susceptible.get(2).plasmids=[];
 // Matched mechanistic fixture: disable further contact in both arms, vary only the acquired trait.
 for(const s of [protectedCell,susceptible]){s.get(2).traits.compatibility=null;s.command('antibiotic',s.get(2).pos);run(s,50);}
 assert.ok(protectedCell.get(2).hp>susceptible.get(2).hp);assert.equal(protectedCell.get(2).traits.receptor,susceptible.get(2).traits.receptor);
});

test('lysogenic genome is inherited vertically and remains inducible in descendants',()=>{
 const s=run(make('phage'),30);s.command('feed',s.get(3).pos);s.command('feed',s.get(3).pos);run(s,400);
 const children=s.lineage(3).children;assert.ok(children.length>=2);assert.ok(children.every(id=>s.get(id).infection?.stage==='lysogen'));
 s.command('induce');assert.ok(children.every(id=>s.get(id).infection.stage==='eclipse'));
});
