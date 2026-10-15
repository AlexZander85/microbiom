import {LocalSimulation} from './engine.js';
import {ReplayRunner} from './replay.js';
import {LearningSession,learningMeta} from './learning.js';
import {LearningView} from './learning-view.js';
import {LOCAL_SCENARIOS,EVENT_NAMES,LOCAL_LIMITS,LOCAL_SPECIES,LOCAL_ACTION_NAMES,LOCAL_STATE_NAMES,LOCAL_CAUSE_NAMES} from './traits.js';
const $=id=>document.getElementById(id);
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export class LocalController {
 constructor({world,navigate,selectAgent,dialog,explain,getPaused,setPaused,onChange}){
  Object.assign(this,{world,navigate,selectAgent,dialog,explain,getPaused,setPaused,onChange});this.control=null;this.substep=0;this.record=null;this.request=0;this.busy=false;this.lastHUD=-1;this.learning=null;
  $('local-scenario').innerHTML=Object.entries(LOCAL_SCENARIOS).map(([id,name])=>`<option value="${id}">${name}</option>`).join('');
  $('local-open').onclick=()=>$('local-lab').scrollIntoView({block:'start',behavior:world.calm?'auto':'smooth'});
  $('local-start').onclick=()=>this.start($('local-scenario').value);
  $('local-exit').onclick=()=>this.exit();
  document.querySelectorAll('[data-local-action]').forEach(b=>b.onclick=()=>{
   if(!this.world.local||this.busy)return;
   const e=this.world.local.get(this.world.selected+1),pos=e?.alive?e.pos:[0,3,0];
   try{this.world.local.command(b.dataset.localAction,pos);this.record=null;this.learning.fork();this.learning.capture(this.world.local,this.control);this.world.cloud.sync();this.refresh(true);}catch(error){this.explain('Вмешательство не выполнено',error.message);}
  });
  $('local-pause').onclick=()=>{if(!this.busy){this.setPaused(!this.getPaused());this.refresh(true);}};
  $('local-step').onclick=()=>{if(!world.local||this.busy)return;this.setPaused(true);this.step();};
  $('local-save').onclick=()=>this.save();
  $('local-load').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>200000)throw new Error('Файл слишком большой (лимит 200 КБ)');const record=JSON.parse(await file.text());await this.restore(record,record.endTick);}catch(error){this.explain('Запись не загружена',error.message);}finally{e.target.value='';}};
  $('local-seek').onchange=()=>this.seek(+$('local-seek').value);
  $('local-fork').onclick=()=>{if(this.busy)return;this.record=null;this.learning?.fork();this.setPaused(false);this.refresh(true);};
  $('local-history').onclick=()=>this.history();
  for(const id of ['local-field','local-slice'])$(id).onchange=()=>{if(!world.local)return;world.cloud.fieldKind=$('local-field').value;world.cloud.slice=+$('local-slice').value;world.cloud.updateField();};
  this.learningView=new LearningView(this);this.refresh(true);
 }
 start(scenario,meta){
  if(this.world.model.site.id!=='colon'){this.explain('Локальный эксперимент доступен для толстой кишки','Переключитесь на толстую кишку. Эти учебные параметры не переносятся автоматически на другие биотопы.');return;}
  this.cancel();this.record=null;this.substep=0;this.control=new LocalSimulation({scenario});this.world.enterLocal(new LocalSimulation({scenario}));this.learning=new LearningSession(meta);this.learning.applyPlan(this.world.local);this.learning.capture(this.world.local,this.control);this.world.cloud.sync();$('local-scenario').value=scenario;this.navigate(2.35);this.setPaused(false);this.onChange();this.refresh(true);
  this.explain('Запущен локальный эксперимент', 'Каждый видимый агент имеет собственное состояние. Учебные штаммы и скорости условны; это не образец пациента. Агрегированная модель на время опыта остановлена.');
 }
 cancel(){this.request++;this.busy=false;$('local-progress').textContent='';}
 exit(){this.cancel();this.record=null;this.control=null;this.learning=null;this.world.leaveLocal();this.onChange();this.refresh(true);}
 tick(){if(!this.world.local||this.busy||this.getPaused())return;if(++this.substep===3){this.substep=0;this.step();}}
 advance(){
  const sim=this.world.local;
  if(this.record||this.learning.meta.guided&&sim.tick>=this.learning.study.end)this.learning.fork();
  this.record=null;sim.step();this.control.step();this.learning.applyPlan(sim);this.learning.capture(sim,this.control);
  if(sim.stopped||this.learning.meta.guided&&sim.tick>=this.learning.study.end){this.learning.capture(sim,this.control);this.setPaused(true);}
 }
 step(){if(!this.world.local||this.busy)return;this.advance();this.world.cloud.sync();this.refresh();}
 exportRecord(){return this.world.local?this.learning.export(this.world.local):null;}
 save(){
  if(!this.world.local||this.busy)return;
  const blob=new Blob([JSON.stringify(this.exportRecord(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='microcosmos-local-replay.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 seek(target){
  if(!this.world.local||this.busy)return;
  const record=this.record||this.exportRecord();
  return this.restore(record,target).catch(error=>this.explain('Воспроизведение остановлено',error.message));
 }
 async finish(){
  if(!this.world.local||this.busy)return;
  if(this.record){await this.seek(this.record.endTick);return;}
  if(!this.learning.meta.guided)return;
  this.cancel();const token=this.request;this.busy=true;this.setPaused(true);this.refresh(true);
  try{
   while(token===this.request&&this.world.local&&this.world.local.tick<this.learning.study.end){
    if(token!==this.request)return;
    for(let i=0;i<30&&this.world.local.tick<this.learning.study.end;i++)this.advance();
    this.world.cloud.sync();$('local-progress').textContent=`Расчёт: ${this.world.local.tick} / ${this.learning.study.end}`;
    await new Promise(resolve=>setTimeout(resolve,0));
   }
  }catch(error){this.explain('Расчёт остановлен',error.message);}
  finally{if(token===this.request){this.busy=false;$('local-progress').textContent='';this.refresh(true);}}
 }
 async restore(record,target){
  const runner=new ReplayRunner(record,target),meta=learningMeta(record.learning,runner.record);
  if(this.world.model.site.id!=='colon')throw new Error('Откройте толстую кишку перед загрузкой локального опыта');
  this.cancel();const token=this.request;this.busy=true;this.setPaused(true);this.refresh(true);
  const baseline=new LocalSimulation({seed:runner.record.seed,scenario:runner.record.scenario}),learning=new LearningSession(meta);
  learning.capture(runner.sim,baseline);
  try{let done=false;while(!done){
   if(token!==this.request)return;
   for(let n=0;n<30&&!done;n++){
    done=runner.run(1);while(baseline.tick<runner.sim.tick)baseline.step();learning.capture(runner.sim,baseline);
   }
   $('local-progress').textContent=`Воспроизведение: ${runner.sim.tick} / ${target}`;await new Promise(resolve=>setTimeout(resolve,0));
  }
   if(token!==this.request)return;
   learning.capture(runner.sim,baseline);
   this.learning=learning;this.world.enterLocal(runner.sim);$('local-scenario').value=runner.sim.scenario;this.control=baseline;this.record={...runner.record,learning:{...meta}};this.substep=0;this.navigate(2.35);this.onChange();
  }finally{if(token===this.request){this.busy=false;$('local-progress').textContent='';this.refresh(true);}}
 }

 refresh(force=false){
  this.learningView?.refresh(force);
  const active=!!this.world.local; $('local-controls').hidden=!active;$('local-exit').hidden=!active;$('local-start').disabled=this.busy||this.world.model.site.id!=='colon';
  $('local-scenario').disabled=this.busy;$('local-load').disabled=this.busy;
  for(const id of ['density','life-rate','feed-nearby','explode','connections','pick-layers'])$(id).disabled=(active&&!(id==='explode'&&this.world.inspect))||(id==='feed-nearby'&&!['colon','mouth','small'].includes(this.world.model.site.id));
  document.querySelectorAll('[data-exp]').forEach(b=>{if(active)b.disabled=true;});
  document.querySelectorAll('[data-field]').forEach(b=>b.disabled=active);
  $('pause').disabled=this.busy;$('local-pause').textContent=this.getPaused()?'▷ Продолжить':'Ⅱ Пауза';
  for(const id of ['local-step','local-save','local-fork','local-pause'])$(id).disabled=this.busy;
  document.querySelectorAll('[data-local-action]').forEach(b=>b.disabled=this.busy||!!this.world.local?.stopped);
  $('readouts').hidden=active;$('local-readouts').hidden=!active;
  if(!active){$('local-summary').textContent='Новый режим: численные агенты, причинные события, химия и воспроизведение. Работает в локальном участке толстой кишки.';return;}
  if(!force&&this.lastHUD===this.world.local.tick)return;this.lastHUD=this.world.local.tick;
  const s=this.world.local.summary();$('local-summary').textContent=`${LOCAL_SCENARIOS[this.world.local.scenario]} · t=${s.time.toFixed(1)} уч. ед. · живых ${s.alive} · генеалогических записей ${this.world.local.entities.length}. ${s.stopped?'Достигнут предел времени. ':''}${s.capacityHits?'Лимит агентов ограничивает новые рождения. ':''}Не клиническая модель.`;
  $('local-readouts').innerHTML=[['Клетки',s.cells],['Фаги',s.phages],['pDemoR',s.plasmids],['Инфицированы',s.infected],['Лизогены',s.lysogens],['Споры',s.spores],['Фагоциты',s.immune],['Бутират · у.е.',s.butyrate.toFixed(3)]].map(([k,v])=>`<div class="readout"><small>${k}</small><b>${v}</b></div>`).join('');
  $('local-seek').max=this.record?.endTick??s.tick;$('local-seek').value=s.tick;$('local-seek').disabled=this.busy;$('local-cursor').textContent=`Шаг ${s.tick} / ${$('local-seek').max}`;
  $('local-field').value=this.world.cloud.fieldKind;$('local-slice').value=String(this.world.cloud.slice);
  const events=this.world.local.events.filter(e=>e.kind!=='birth').slice(-7).reverse();
  $('local-events').replaceChildren(...events.map(event=>{const b=document.createElement('button');b.textContent=`${(event.tick*.1).toFixed(1)} · ${EVENT_NAMES[event.kind]||event.kind}${event.action?' · '+LOCAL_ACTION_NAMES[event.action]:''} · ${event.actors.map(id=>'#'+id).join(' → ')}`;b.disabled=this.busy;b.onclick=()=>{this.learningView.selectEvent(event);if(!event.actors.length)return;const id=event.actors.find(id=>this.world.local.get(id)?.alive)||event.actors[0];this.selectAgent(id-1);this.world.focusAgent(id-1);};return b;}));
 }
 history(){
  const sim=this.world.local;if(!sim)return;const id=this.world.selected+1,h=sim.lineage(id);
  const heading=h?`#${id} · ${LOCAL_SPECIES[h.entity.species].name}`:'Выберите агента в сцене или журнале';
  const lineage=h?`<p>Состояние: ${escape(LOCAL_STATE_NAMES[h.entity.state]||h.entity.state)}. Родители: ${h.entity.parents.join(', ')||'начальная клетка'}. Потомки: ${h.children.join(', ')||'пока нет'}. ${h.entity.host?'Хозяин происхождения фага: #'+h.entity.host:''}</p><p>Плазмиды: ${h.entity.plasmids.join(', ')||'нет'}. Причина завершения: ${escape(LOCAL_CAUSE_NAMES[h.entity.cause]||LOCAL_STATE_NAMES[h.entity.state]||h.entity.state)}.</p>`:'';
  const events=h?h.events:sim.events.slice(-100);
  this.dialog('ПРИЧИННЫЙ ЖУРНАЛ И ГЕНЕАЛОГИЯ',`<h2>${heading}</h2>${lineage}<p>pDemoR — условная совместимая плазмида с учебным признаком устойчивости; это не свойство всех плазмид. ID сохраняются после гибели. Хозяин фага — контекст происхождения, не генетический родитель.</p><div class="notice">Лимиты: ${LOCAL_LIMITS.alive} живых агентов, ${LOCAL_LIMITS.ids} ID, ${LOCAL_LIMITS.ticks} шагов. Сохраняется до ${LOCAL_LIMITS.events} последних событий. Полное состояние восстанавливается из начальных условий и команд той же версии.</div>${events.slice(-100).reverse().map(e=>`<article class="timeline-item"><b>${(e.tick*.1).toFixed(1)} · ${EVENT_NAMES[e.kind]||e.kind}</b><p>${e.actors.map(id=>'#'+id).join(' → ')} ${e.cause?escape(LOCAL_CAUSE_NAMES[e.cause]||e.cause):''} ${e.burst!==undefined?' · потомство: '+e.burst:''}</p><button class="outline" data-history-event="${e.seq}">Почему это произошло? →</button></article>`).join('')}`);
  document.querySelectorAll('[data-history-event]').forEach(b=>b.onclick=()=>{const event=sim.events.find(e=>e.seq===+b.dataset.historyEvent);if(event){$('dialog').close();this.learningView.selectEvent(event);$('learning-panel').scrollIntoView({block:'start',behavior:'auto'});}});
 }

 compare(){const a=this.control.summary(),b=this.world.local.summary();const col=(s,title)=>`<div><h3>${title}</h3><p>Живых: ${s.alive}<br>pDemoR: ${s.plasmids}<br>Фагов: ${s.phages}<br>Лизогенов: ${s.lysogens}<br>Бутират: ${s.butyrate.toFixed(3)} у.е.<br>Поглощений: ${s.counts.engulf||0}<br>Погрешность углеродного баланса: ${s.carbonError.toExponential(2)}</p></div>`;this.dialog('ЛОКАЛЬНЫЙ КОНТРОЛЬ',`<h2>Одинаковый старт, шаг ${b.tick}</h2><div class="comparison">${col(a,'Без ваших вмешательств')}${col(b,'Ваш опыт')}</div><p>Оба расчёта начинают с одного seed и сценария. Меняется вмешательство, не графическая плотность. Условные количества — не анализ микробиома пациента.</p><button class="outline" id="compare-graphs">Траектории A/B во времени →</button>`);$('compare-graphs').onclick=()=>{$('dialog').close();$('learning-chart-area').scrollIntoView({block:'center',behavior:'auto'});};}
}
