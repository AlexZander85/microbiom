import {LocalSimulation} from './engine.js';
import {LOCAL_LIMITS,LOCAL_SCENARIOS,engineForScenario,commandsFor} from './traits.js';
export function checksum(value){const text=JSON.stringify(value);let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return(h>>>0).toString(16).padStart(8,'0');}
export function exportReplay(sim){return {format:'microcosmos-local-replay',version:1,engine:sim.version,seed:sim.seed,scenario:sim.scenario,endTick:sim.tick,commands:sim.commands.map(c=>({...c,pos:[...c.pos]})),checksum:checksum(sim.snapshot()),notice:'Uncalibrated local experiment; not clinical data. Fixed 0.1 teaching-time step.'};}
export function validateReplay(data){
 if(!data||data.format!=='microcosmos-local-replay'||data.version!==1||data.engine!==engineForScenario(data.scenario))throw new Error('Несовместимая версия записи');
 if(!Number.isInteger(data.seed)||data.seed<0||data.seed>0xffffffff||!Object.hasOwn(LOCAL_SCENARIOS,data.scenario)||!Number.isInteger(data.endTick)||data.endTick<0||data.endTick>LOCAL_LIMITS.ticks||!Array.isArray(data.commands)||data.commands.length>LOCAL_LIMITS.commands||typeof data.checksum!=='string'||!(/^[0-9a-f]{8}$/).test(data.checksum))throw new Error('Некорректные параметры записи');
 let previous=0;const commands=data.commands.map(c=>{
  if(!c||!Number.isInteger(c.tick)||c.tick<previous||c.tick>data.endTick||c.tick>=LOCAL_LIMITS.ticks||!commandsFor(data.scenario).includes(c.kind)||!Array.isArray(c.pos)||c.pos.length!==3||c.pos.some(v=>!Number.isFinite(v))||Math.abs(c.pos[0])>12||Math.abs(c.pos[2])>12||c.pos[1]<-2||c.pos[1]>6)throw new Error('Некорректное вмешательство');
  previous=c.tick;return {tick:c.tick,kind:c.kind,pos:[...c.pos]};
 });
 return {format:data.format,version:1,engine:data.engine,seed:data.seed,scenario:data.scenario,endTick:data.endTick,commands,checksum:data.checksum};
}
export class ReplayRunner {
 constructor(record,target=record.endTick){this.record=validateReplay(record);if(!Number.isInteger(target)||target<0||target>this.record.endTick)throw new Error('Некорректная позиция воспроизведения');this.target=target;this.sim=new LocalSimulation(this.record);this.cursor=0;this.apply();}
 apply(){while(this.cursor<this.record.commands.length&&this.record.commands[this.cursor].tick===this.sim.tick){const c=this.record.commands[this.cursor++];this.sim.command(c.kind,c.pos);}}
 run(budget=100){for(let n=0;n<budget&&this.sim.tick<this.target;n++){this.sim.step();this.apply();}const done=this.sim.tick===this.target;if(done&&this.target===this.record.endTick&&checksum(this.sim.snapshot())!==this.record.checksum)throw new Error('Состояние не совпало с контрольной суммой. Запись повреждена или вычислительная среда отличается.');return done;}
}
export function replay(record,target=record.endTick){const runner=new ReplayRunner(record,target);while(!runner.run(200)){}return runner.sim;}
