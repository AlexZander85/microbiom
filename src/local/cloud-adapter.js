import {LOCAL_SPECIES,EVENT_NAMES} from './traits.js';
import {liveColor} from '../webgl2/living.js';
const STATES={persister:'Ⅱ медленная S · не спора',vegetative:'Вегетативная клетка',free:'Свободный фаг',dead:'Погибла',divided:'Разделилась на потомков',adsorbed:'Связался с хозяином',spore:'Спора',sporulating:'Формирует спору',germinating:'Прорастает',budding:'Образует почку',hypha:'Гифальная форма',resting:'Фагоцит: наблюдение',recruited:'Движение по сигналу',engulfing:'Поглощение',digesting:'Переваривание'};
export class LocalCloud {
 constructor(sim,model){this.sim=sim;this.model=model;this.capacity=8000;this.requested=192;this.ids=Object.keys(LOCAL_SPECIES);for(const k of ['x','y','z','size','angle','phase','activity'])this[k]=new Float32Array(this.capacity);this.species=new Uint8Array(this.capacity);this.alive=new Uint8Array(this.capacity);this.events=[];this.deposits=[];this.fieldPixels=new Float32Array(20*20*3);this.fieldKind='food';this.slice=3;this.lastTick=-1;this.sync();}
 sync(){const sim=this.sim;if(this.lastTick===sim.tick&&this.lastCommands===sim.commands.length&&this.count===sim.entities.length)return;this.lastCommands=sim.commands.length;this.count=sim.entities.length;this.visualTime=sim.time;for(const e of sim.entities){const i=e.id-1;this.x[i]=e.pos[0]*2;this.y[i]=e.pos[1]*2;this.z[i]=e.pos[2]*2;this.alive[i]=+e.alive;this.species[i]=this.ids.indexOf(e.species);this.size[i]=(e.traits.immune?.95:e.traits.virus?.24:.4)*Math.cbrt(Math.max(.1,e.mass)/(e.traits.virus?.025:1));this.phase[i]=e.id*2.4;this.angle[i]=e.id;this.activity[i]=e.state==='persister'?0:Math.min(1,sim.chemistry.sample('food',e.pos)*4);}
  this.updateField();this.lastTick=sim.tick;
 }
 updateField(){for(let z=0;z<20;z++)for(let x=0;x<20;x++){const p=[((x+.5)/20*64-32)/2,this.slice,((z+.5)/20*64-32)/2],inside=Math.abs(p[0])<12&&Math.abs(p[2])<12,value=inside?Math.min(1,this.sim.chemistry.sample(this.fieldKind,p)*8):0,k=(z*20+x)*3;this.fieldPixels[k]=this.fieldKind==='drug'?0:value;this.fieldPixels[k+1]=this.fieldKind==='oxygen'?value:0;this.fieldPixels[k+2]=this.fieldKind==='signal'||this.fieldKind==='drug'?value:0;}}
 advance(){this.sync();}
 update(){this.sync();}
 reset(){this.sync();}
 position(i){return[this.x[i],this.y[i],this.z[i]];}
 shape(i){const e=this.sim.entities[i];return e.state==='spore'?'oval':e.state==='hypha'?'rod':e.traits.fungus?(e.state==='budding'?'yeast':'oval'):LOCAL_SPECIES[e.species].shape;}
 color(i){const e=this.sim.entities[i];return e.state==='persister'?'#94d7f2':e.traits.demoResistance?'#f7d48a':e.traits.immune?'#eef8ff':e.state==='spore'?'#c6a77b':e.infection?'#f299d9':e.plasmids.includes('pDemoR')?'#ffe879':liveColor(e.species);}
 thought(i){const e=this.sim.entities[i];if(!e)return '';if(e.mucusCell)return `#${e.id} ${!e.alive?(STATES[e.state]||e.state):e.species==='faec'?'Мне достался ацетат соседа':e.species==='akk'?'Использую наружные гликаны':e.mucusMode==='mucin'?'Пищи мало — использую гликаны':'Использую пищевой субстрат'}`;const phase={adsorbed:'адсорбция',injected:'геном введён',eclipse:'синтез',assembly:'сборка',lysogen:'профаг'},inf=e.infection?` · фаг: ${phase[e.infection.stage]||e.infection.stage}`:'';return `#${e.id} ${STATES[e.state]||e.state}${inf}${e.plasmids.length?' · pDemoR':''}${e.assayCell?(e.traits.demoResistance?' · R-demo':' · S-demo'):''}`;}
 history(i){return this.sim.lineage(i+1);}
}
