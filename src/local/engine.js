import {ChemicalGrid} from './chemistry.js';
import {traits,LOCAL_DT,LOCAL_LIMITS,LOCAL_VERSION,LOCAL_SCENARIOS} from './traits.js';
const copy=v=>JSON.parse(JSON.stringify(v));
const distance=(a,b)=>Math.hypot(...a.pos.map((v,i)=>v-b.pos[i]));
const living=e=>e.alive&&e.state!=='spore'&&e.state!=='sporulating';
export class SpatialIndex {
 constructor(entities,size=2){this.size=size;this.buckets=new Map();for(const e of entities)if(e.alive){const k=this.key(...e.pos.map(v=>Math.floor(v/size)));if(!this.buckets.has(k))this.buckets.set(k,[]);this.buckets.get(k).push(e);}}
 key(x,y,z){return`${x},${y},${z}`;}
 near(e,radius){const c=e.pos.map(v=>Math.floor(v/this.size)),n=Math.ceil(radius/this.size),out=[];for(let x=-n;x<=n;x++)for(let y=-n;y<=n;y++)for(let z=-n;z<=n;z++)for(const b of this.buckets.get(this.key(c[0]+x,c[1]+y,c[2]+z))||[])if(b!==e&&distance(e,b)<=radius)out.push(b);return out.sort((a,b)=>distance(e,a)-distance(e,b)||a.id-b.id);}
}
export class LocalSimulation {
 constructor({seed=85,scenario='community'}={}){
  if(!Number.isInteger(seed)||seed<0||seed>0xffffffff||!Object.hasOwn(LOCAL_SCENARIOS,scenario))throw new Error('Invalid local configuration');
  this.seed=seed;this.randomState=seed||1;this.scenario=scenario;this.tick=0;this.entities=[];this.events=[];this.sequence=0;this.counts={};this.commands=[];this.jobs=[];this.barrier=1;this.cues={germinate:0,hypha:0};this.stopped=false;this.capacityHits=0;this.chemistry=new ChemicalGrid();this.inputCarbon=0;
  // Read-only accounting for teaching UI; never used by dynamics or replay checksum.
  this.flux={producerFood:0,acetateMade:0,acetateUsed:0,butyrateMade:0,tissueButyrate:0};
  this.chemistry.values.food.fill(scenario==='cycles'?.0001:.035);
  this.chemistry.values.oxygen.fill(.02);
  this.seedScenario();this.initialCarbon=this.carbon();
 }
 get time(){return this.tick*LOCAL_DT;}
 random(){let x=this.randomState;x^=x<<13;x^=x>>>17;x^=x<<5;this.randomState=x>>>0;return this.randomState/4294967296;}
 get(id){return this.entities[id-1];}
 emit(kind,actors=[],extra={}){
  this.counts[kind]=(this.counts[kind]||0)+1;const event={seq:++this.sequence,tick:this.tick,kind,actors:[...actors],...extra};this.events.push(event);
  if(this.events.length>LOCAL_LIMITS.events)this.events.shift();return event;
 }
 create(species,pos,variant='base',parents=[],mass=null){
  if(this.entities.length>=LOCAL_LIMITS.ids||this.entities.filter(e=>e.alive).length>=LOCAL_LIMITS.alive){this.capacityHits++;return null;}
  const t=traits(species,variant),e={id:this.entities.length+1,species,variant,traits:t,pos:[...pos],parents:[...parents],host:null,born:this.tick,died:null,alive:true,state:t.virus?'free':t.immune?'resting':'vegetative',timer:0,age:0,mass:mass??(t.virus?.025:t.immune?2:1),gut:0,hp:1,plasmids:t.donor?['pDemoR']:[],infection:null,cooldown:0,starved:0,target:null};
  this.entities.push(e);this.emit('birth',[e.id,...parents]);return e;
 }
 seedScenario(){
  const add=(sp,x,y,z,v='base',m=null)=>this.create(sp,[x,y,z],v,[],m);
  if(this.scenario==='community'){
   const groups=['bact','bif','faec','coli','meth','cand','blast','cdiff'];
   for(let i=0;i<32;i++){const sp=groups[i%groups.length];add(sp,(this.random()-.5)*16,2+this.random()*2,(this.random()-.5)*16,sp==='bact'&&i===0?'t6':sp==='coli'&&i===3?'donor':'base');}
   add('coli',-1,3,0,'donor');add('coli',0,3,0);add('phage',4,3,0);add('coli',4.3,3,0);add('immune',0,-1,0);
  }else if(this.scenario==='hgt'){
   add('coli',-.5,3,0,'donor');add('coli',.5,3,0);add('bact',0,3,2);this.chemistry.add('food',[0,3,0],3);
  }else if(this.scenario==='t6'){
   add('bact',0,3,0,'t6');add('coli',.8,3,0);add('coli',-.8,3,0,'immune-E');add('coli',6,3,0);
  }else if(this.scenario==='phage'){
   add('coli',-3,3,0);add('phage',-3,3,.3);add('coli',3,3,0);add('phage',3,3,.3,'temperate');add('coli',0,3,5,'receptor-negative');
  }else if(this.scenario==='immune'){
   add('immune',0,-1,0);add('coli',1,-1,0);add('coli',0,3,0);add('cand',-3,-1,0);
  }else{
   add('coli',-4,3,0,'donor',1.7);add('cand',0,3,0,'base',1.7);add('cdiff',4,3,0);
   this.chemistry.add('food',[-4,3,0],1);this.chemistry.add('food',[0,3,0],1);
  }
 }
 carbon(){return this.chemistry.carbon()+this.entities.reduce((sum,e)=>sum+(e.alive?e.mass+e.gut:0),0);}
 command(kind,pos=[0,3,0]){
  if(!['feed','antibiotic','breach','repair','induce','germinate','hypha'].includes(kind)||!Array.isArray(pos)||pos.length!==3||pos.some(v=>!Number.isFinite(v))||Math.abs(pos[0])>12||Math.abs(pos[2])>12||pos[1]<-2||pos[1]>6)throw new Error('Invalid intervention');
  if(this.commands.length>=LOCAL_LIMITS.commands||this.stopped)throw new Error('Session limit reached; start a new experiment');
  this.commands.push({tick:this.tick,kind,pos:[...pos]});this.emit('command',[],{action:kind,pos:[...pos]});
  if(kind==='feed'){this.chemistry.add('food',pos,6);this.inputCarbon+=6;}
  if(kind==='antibiotic')this.chemistry.add('drug',pos,2);
  if(kind==='breach')this.barrier=.1;
  if(kind==='repair')this.barrier=1;
  if(kind==='germinate')this.cues.germinate=150;
  if(kind==='hypha')this.cues.hypha=300;
  if(kind==='induce')for(const e of this.entities)if(e.alive&&e.infection?.stage==='lysogen'){
   e.infection.stage='eclipse';e.infection.remaining=40;this.emit('induction',[e.id]);
  }
 }
 kill(e,cause,release=true){if(!e.alive)return;e.alive=false;e.died=this.tick;e.state='dead';e.cause=cause;
  if(release)this.chemistry.add('detritus',e.pos,e.mass+e.gut);e.mass=0;e.gut=0;this.emit('death',[e.id],{cause});
 }
 grow(e){
  const f=this.chemistry,t=e.traits,dt=LOCAL_DT;
  if(e.state==='spore'){
   if(this.cues.germinate>0&&f.sample('food',e.pos)>.008){e.state='germinating';e.timer=30;this.emit('germinating',[e.id]);}
   if(this.random()<.00002)this.kill(e,'spore-decay');return;
  }
  if(e.state==='sporulating'||e.state==='germinating'){
   if(--e.timer<=0){e.state=e.state==='sporulating'?'spore':'vegetative';e.starved=0;this.emit(e.state,[e.id]);}return;
  }
  const source=e.species==='faec'?'acetate':'food';
  // Methanogen/protist metabolism is not guessed: these are non-growing controls here.
  const oxygen=f.sample('oxygen',e.pos),rate=dt*.09*(e.species==='faec'?1/(1+oxygen*15):1);
  const available=(t.bacterium||t.fungus)?f.take(source,e.pos,Math.min(rate,Math.max(0,(1.7-e.mass)*2))):0;
  if(e.species==='coli'||t.fungus)f.take('oxygen',e.pos,available*.15);
  if(available){const yieldMass=available*.5;e.mass+=yieldMass;
   if(['bact','bif'].includes(e.species)){this.flux.producerFood+=available;this.flux.acetateMade+=available-yieldMass;}
   if(e.species==='faec'){this.flux.acetateUsed+=available;this.flux.butyrateMade+=available-yieldMass;}
   f.add(['bact','bif'].includes(e.species)?'acetate':e.species==='faec'?'butyrate':'waste',e.pos,available-yieldMass);
  }
  const maintenance=Math.min(e.mass,dt*.0015);e.mass-=maintenance;f.add('waste',e.pos,maintenance);
  if(f.sample('food',e.pos)<.002)e.starved++;else e.starved=0;
  if(t.spore&&e.starved>50&&!e.infection){e.state='sporulating';e.timer=25;this.emit('sporulating',[e.id]);return;}
  if(t.bacterium){const drug=f.sample('drug',e.pos);e.hp-=dt*drug*(e.plasmids.includes('pDemoR')?.025:.6);}
  if(e.mass<.08||e.hp<=0){this.kill(e,e.hp<=0?'antibiotic':'starvation');return;}
  if(e.infection&&e.infection.stage!=='lysogen')return;
  if(e.species==='cand'&&this.cues.hypha>0&&e.state==='vegetative'){e.state='hypha';this.emit('hypha',[e.id]);}
  if(e.mass>=1.6&&t.fungus&&e.state==='vegetative'){e.state='budding';e.timer=30;this.emit('bud',[e.id]);}
  if(e.state==='budding'&&--e.timer<=0)this.divide(e,'bud');
  else if(e.mass>=1.6&&t.bacterium)this.divide(e,'division');
  else if(e.mass>=1.6&&e.state==='hypha')this.divide(e,'branch');
 }
 divide(e,kind){
  const needed=kind==='division'?2:1,alive=this.entities.filter(c=>c.alive).length;
  if(this.entities.length+needed>LOCAL_LIMITS.ids||alive+needed>LOCAL_LIMITS.alive){this.capacityHits++;if(e.state==='budding')e.timer=30;return;}
  const children=[],amount=e.mass/2;
  for(let i=0;i<needed;i++){
   const sign=i===0?1:-1,pos=[Math.max(-11.5,Math.min(11.5,e.pos[0]+sign*.65)),e.pos[1],e.pos[2]+(kind==='branch'?.5:0)];pos[2]=Math.max(-11.5,Math.min(11.5,pos[2]));
   const child=this.create(e.species,pos,e.variant,[e.id],amount);child.plasmids=[...e.plasmids];child.infection=e.infection?copy(e.infection):null;
   if(kind==='branch')child.state='hypha';children.push(child.id);
  }
  if(kind==='division'){e.alive=false;e.died=this.tick;e.state='divided';e.mass=0;}else{e.mass=amount;e.state=kind==='branch'?'hypha':'vegetative';}
  this.emit(kind==='bud'?'division':kind,[e.id,...children],{mode:kind});
 }
 step(){
  if(this.stopped)return;
  if(this.tick>=LOCAL_LIMITS.ticks){this.stopped=true;this.emit('limit');return;}
  this.tick++;for(let i=0;i<this.chemistry.n*this.chemistry.n*2;i++){const f=this.chemistry.values,used=f.butyrate[i]*.002;f.butyrate[i]-=used;f.waste[i]+=used;this.flux.tissueButyrate+=used;f.oxygen[i]+=(.08/(1+f.butyrate[i]*10)-f.oxygen[i])*.004;}for(const k in this.cues)this.cues[k]=Math.max(0,this.cues[k]-1);
  this.chemistry.diffuse(LOCAL_DT,this.barrier);
  for(const k of ['drug','signal'])for(let i=0;i<this.chemistry.length;i++)this.chemistry.values[k][i]*=Math.exp(-LOCAL_DT*(k==='drug'?.015:.08));
  const active=this.entities.filter(e=>e.alive);
  for(const e of active){e.age++;e.cooldown=Math.max(0,e.cooldown-1);
   if(e.traits.virus){if(e.age>800)this.kill(e,'virion-decay');continue;}
   if(e.traits.immune)continue;
   this.grow(e);
   if(e.alive&&e.pos[1]<0)this.chemistry.add('signal',e.pos,LOCAL_DT*.04);
  }
  // Sequential, deterministic updates; only living, compatible neighbours participate.
  const index=new SpatialIndex(this.entities);
  this.transfer(index);this.attack(index);this.phages(index);this.immune(index);
  for(const e of this.entities)if(e.alive&&!e.traits.immune&&e.state!=='sporulating'&&e.state!=='hypha'){
   // No decorative clock in biological contacts. Motion is deliberately slow and bounded.
   const speed=e.traits.virus?.025:.012;
   e.pos[0]=Math.max(-11.8,Math.min(11.8,e.pos[0]+(this.random()-.5)*speed));
   e.pos[2]=Math.max(-11.8,Math.min(11.8,e.pos[2]+(this.random()-.5)*speed));
   if(this.barrier<.3&&!e.traits.virus&&e.pos[1]>-.8)e.pos[1]-=.012;
  }
  if(this.tick>=LOCAL_LIMITS.ticks){this.stopped=true;this.emit('limit');}
 }
 transfer(index){
  for(const job of [...this.jobs]){
   const a=this.get(job.from),b=this.get(job.to);
   if(!living(a)||!living(b)||a.infection&&a.infection.stage!=='lysogen'||b.infection&&b.infection.stage!=='lysogen'||distance(a,b)>1.5){this.jobs.splice(this.jobs.indexOf(job),1);this.emit('contact_lost',[a.id,b.id]);continue;}
   if(--job.remaining<=0){if(!b.plasmids.includes('pDemoR')){b.plasmids.push('pDemoR');this.emit('transfer',[a.id,b.id],{plasmid:'pDemoR',donorRetains:true});}a.cooldown=40;this.jobs.splice(this.jobs.indexOf(job),1);}
  }
  for(const a of this.entities)if(living(a)&&a.traits.compatibility&&a.plasmids.includes('pDemoR')&&!a.cooldown&&!a.infection){
   const b=index.near(a,1.5).find(b=>living(b)&&b.traits.compatibility===a.traits.compatibility&&!b.plasmids.includes('pDemoR')&&!b.infection&&!this.jobs.some(j=>j.from===a.id||j.to===b.id));
   if(b){this.jobs.push({from:a.id,to:b.id,remaining:30});this.emit('conjugation',[a.id,b.id]);}
  }
 }
 attack(index){for(const a of this.entities)if(living(a)&&a.traits.t6&&!a.cooldown){const b=index.near(a,1.3).find(b=>living(b)&&b.traits.bacterium&&b.traits.immunity!==a.traits.t6);if(b){a.cooldown=20;b.hp-=.55;this.emit('t6',[a.id,b.id],{effector:a.traits.t6});if(b.hp<=0)this.kill(b,'T6SS');}}}
 phages(index){
  for(const p of this.entities)if(p.alive&&p.traits.virus){
   const h=index.near(p,1.2).find(h=>living(h)&&h.traits.receptor==='R-demo'&&!h.infection);
   if(h){h.infection={stage:'adsorbed',remaining:10,type:p.traits.phageType,founder:p.id};h.mass+=p.mass;p.mass=0;p.alive=false;p.state='adsorbed';p.died=this.tick;this.emit('adsorption',[p.id,h.id]);}
  }
  for(const h of [...this.entities])if(h.alive&&h.infection&&h.infection.stage!=='lysogen'){
   const inf=h.infection;if(--inf.remaining>0)continue;
   if(inf.stage==='adsorbed'){inf.stage='injected';inf.remaining=10;this.emit('injection',[inf.founder,h.id]);}
   else if(inf.stage==='injected'){
    if(inf.type==='temperate'){inf.stage='lysogen';this.emit('lysogeny',[h.id,inf.founder]);}
    else{inf.stage='eclipse';inf.remaining=40;this.emit('eclipse',[h.id]);}
   }else if(inf.stage==='eclipse'){inf.stage='assembly';inf.remaining=40;this.emit('assembly',[h.id]);}
   else{
    const wanted=Math.min(8,Math.floor(h.mass/.025)),children=[];
    for(let i=0;i<wanted;i++){
     const angle=i*Math.PI*2/8,pos=[Math.max(-11.8,Math.min(11.8,h.pos[0]+Math.cos(angle)*.8)),h.pos[1],Math.max(-11.8,Math.min(11.8,h.pos[2]+Math.sin(angle)*.8))];
     const child=this.create('phage',pos,inf.type,[inf.founder],.025);if(!child)break;child.host=h.id;h.mass-=.025;children.push(child.id);
    }
    this.emit('lysis',[h.id,...children],{founder:inf.founder,burst:children.length,limited:children.length<wanted});this.kill(h,'phage-lysis');
   }
  }
 }
 immune(index){for(const e of this.entities)if(e.alive&&e.traits.immune){
  if(e.state==='digesting'){
   if(--e.timer<=0){this.chemistry.add('waste',e.pos,e.gut*.7);e.mass+=e.gut*.3;e.gut=0;e.state='resting';this.emit('digest',[e.id]);}continue;
  }
  if(e.state==='engulfing'){
   const t=this.get(e.target);if(!t?.alive||t.pos[1]>=0||distance(e,t)>1.5){e.state='resting';e.target=null;continue;}
   if(--e.timer<=0){e.gut+=t.mass+t.gut;this.kill(t,'phagocytosis',false);e.state='digesting';e.timer=35;this.emit('engulf',[e.id,t.id]);}continue;
  }
  const target=index.near(e,5).find(t=>living(t)&&!t.traits.immune&&!t.traits.virus&&t.pos[1]<0);
  if(target&&distance(e,target)<1.1){e.state='engulfing';e.timer=15;e.target=target.id;continue;}
  // Climb the diffusing signal; intact luminal commensals are not targets.
  const f=this.chemistry,gradient=[0,1,2].map(k=>{const a=[...e.pos],b=[...e.pos];a[k]+=.7;b[k]-=.7;return f.sample('signal',a)-f.sample('signal',b);}),length=Math.hypot(...gradient);
  if(length>1e-8){if(e.state!=='recruited')this.emit('recruit',[e.id]);e.state='recruited';e.pos=e.pos.map((v,k)=>v+gradient[k]/length*.065);e.pos[0]=Math.max(-11.8,Math.min(11.8,e.pos[0]));e.pos[2]=Math.max(-11.8,Math.min(11.8,e.pos[2]));e.pos[1]=Math.max(-1.8,Math.min(-.1,e.pos[1]));}
 }}
 lineage(id){const entity=this.get(id);if(!entity)return null;const ancestors=[],seen=new Set(),visit=id=>{if(seen.has(id))return;seen.add(id);const a=this.get(id);if(!a)return;ancestors.push(a.id);a.parents.forEach(visit);};entity.parents.forEach(visit);return {entity:copy(entity),ancestors,children:this.entities.filter(e=>e.parents.includes(id)).map(e=>e.id),events:this.events.filter(e=>e.actors.includes(id)).map(copy)};}
 summary(){const active=this.entities.filter(e=>e.alive);return {tick:this.tick,time:this.time,alive:active.length,cells:active.filter(e=>!e.traits.virus&&!e.traits.immune).length,phages:active.filter(e=>e.traits.virus).length,immune:active.filter(e=>e.traits.immune).length,plasmids:active.filter(e=>e.plasmids.includes('pDemoR')).length,infected:active.filter(e=>e.infection&&e.infection.stage!=='lysogen').length,lysogens:active.filter(e=>e.infection?.stage==='lysogen').length,spores:active.filter(e=>e.state==='spore').length,barrier:this.barrier,food:this.chemistry.total('food'),acetate:this.chemistry.total('acetate'),butyrate:this.chemistry.total('butyrate'),carbonError:this.carbon()-this.initialCarbon-this.inputCarbon,counts:{...this.counts},capacityHits:this.capacityHits,stopped:this.stopped};}
 snapshot(){return {engine:LOCAL_VERSION,seed:this.seed,scenario:this.scenario,tick:this.tick,randomState:this.randomState,entities:copy(this.entities),chemistry:this.chemistry.snapshot(),events:copy(this.events),sequence:this.sequence,counts:{...this.counts},jobs:copy(this.jobs),barrier:this.barrier,cues:{...this.cues},commands:copy(this.commands),initialCarbon:this.initialCarbon,inputCarbon:this.inputCarbon,capacityHits:this.capacityHits,stopped:this.stopped};}
}
