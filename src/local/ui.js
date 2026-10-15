import {LocalSimulation} from './engine.js';
import {ReplayRunner} from './replay.js';
import {LearningSession,learningMeta} from './learning.js';
import {LearningView} from './learning-view.js';
import {LOCAL_SCENARIOS,EVENT_NAMES,LOCAL_LIMITS,LOCAL_SPECIES,LOCAL_ACTION_NAMES,LOCAL_STATE_NAMES,LOCAL_CAUSE_NAMES,commandsFor,siteForScenario} from './traits.js';
const $=id=>document.getElementById(id);
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export class LocalController {
 constructor({world,navigate,selectAgent,dialog,explain,getPaused,setPaused,onChange}){
  Object.assign(this,{world,navigate,selectAgent,dialog,explain,getPaused,setPaused,onChange});this.control=null;this.substep=0;this.record=null;this.request=0;this.busy=false;this.lastHUD=-1;this.learning=null;
  $('local-scenario').innerHTML=Object.entries(LOCAL_SCENARIOS).map(([id,name])=>`<option value="${id}">${name}</option>`).join('');
  $('local-scenario').value='community';
  $('local-scenario').onchange=()=>this.refresh(true);
  $('local-open').onclick=()=>$('local-lab').scrollIntoView({block:'start',behavior:world.calm?'auto':'smooth'});
  $('local-start').onclick=()=>this.start($('local-scenario').value);
  $('local-exit').onclick=()=>this.exit();
  document.querySelectorAll('[data-local-action]').forEach(b=>b.onclick=()=>{
   if(!this.world.local||this.busy)return;
   const e=this.world.local.get(this.world.selected+1),pos=this.world.local.oral?[0,3,0]:e?.alive?e.pos:[0,3,0];
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
  if(this.world.model.site.id!==siteForScenario(scenario)){this.explain('Другой биотоп',scenario==='oral'?'Откройте полость рта для опыта с зубом.':'Откройте толстую кишку для этого опыта.');return;}
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
  if(sim.stopped||this.learning.meta.guided&&(sim.tick>=this.learning.study.end||sim.contactStudy&&[14,16,45,61].includes(sim.tick))){this.learning.capture(sim,this.control);this.setPaused(true);}
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
 async finish(target=null){
  if(!this.world.local||this.busy)return;
  if(this.record){await this.seek(Math.min(target??this.record.endTick,this.record.endTick));return;}
  if(!this.learning.meta.guided)return;
  target=Math.min(target??this.learning.study.end,this.learning.study.end);
  if(!Number.isInteger(target)||target<0)return;
  if(target<this.world.local.tick){await this.seek(target);return;}
  this.cancel();const token=this.request;this.busy=true;this.setPaused(true);this.refresh(true);
  try{
   while(token===this.request&&this.world.local&&this.world.local.tick<target){
    if(token!==this.request)return;
    for(let i=0;i<(this.world.local.oral||this.world.local.ecology||this.world.local.axis||this.world.local.pulseRelay||this.world.local.contactStudy?120:30)&&this.world.local.tick<target;i++)this.advance();
    this.world.cloud.sync();$('local-progress').textContent=`Расчёт: ${this.world.local.tick} / ${target}`;
    await new Promise(resolve=>setTimeout(resolve,0));
   }
  }catch(error){this.explain('Расчёт остановлен',error.message);}
  finally{if(token===this.request){this.busy=false;$('local-progress').textContent='';this.refresh(true);}}
 }
 async restore(record,target){
  const runner=new ReplayRunner(record,target),meta=learningMeta(record.learning,runner.record);
  if(this.world.model.site.id!==siteForScenario(runner.record.scenario))throw new Error(runner.record.scenario==='oral'?'Откройте полость рта перед загрузкой опыта с зубом':'Откройте толстую кишку перед загрузкой локального опыта');
  this.cancel();const token=this.request;this.busy=true;this.setPaused(true);this.refresh(true);
  const baseline=new LocalSimulation({seed:runner.record.seed,scenario:runner.record.scenario,engine:runner.record.engine}),learning=new LearningSession(meta);
  learning.capture(runner.sim,baseline);
  try{let done=false;while(!done){
   if(token!==this.request)return;
   for(let n=0;n<(runner.sim.oral||runner.sim.ecology||runner.sim.axis||runner.sim.pulseRelay||runner.sim.contactStudy?120:30)&&!done;n++){
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
  const site=this.world.model.site.id;
  for(const option of $('local-scenario').options)option.disabled=siteForScenario(option.value)!==site;
  if(!this.world.local&&$('local-scenario').selectedOptions[0]?.disabled)$('local-scenario').value=site==='mouth'?'oral':'community';
  this.learningView?.refresh(force);
  $('local-fields').hidden=!!this.world.local?.oral||!!this.world.local?.ecology||!!this.world.local?.axis||!!this.world.local?.pulseRelay||!!this.world.local?.contactStudy;$('local-field').disabled=!!this.world.local?.oral;$('local-slice').disabled=!!this.world.local?.oral;
  $('local-color-legend').textContent=this.world.local?.pulseRelay?'Две функциональные группы: образование ацетата и бутирата. Размер связан с биомассой; метка пищевого входа прослеживается в таблице, не в декоративных частицах.':this.world.local?.contactStudy?'Донор #1 и получатель #2 удерживаются в заданных позициях. Жёлтый означает наличие pDemoR; связь рисуется только по действующей попытке.':this.world.local?.axis?'3D-узлы — схема сенсорного эпителия, глутаматного выхода, афферента и NTS; яркость связана с вычисленной активностью. Это не анатомические размеры и не отдельные нейроны.':this.world.local?.ecology?'Мятный — потребители R, фиолетовый — потребители Q, золотой — новичок. Фигурки представляют биомассу групп, не индивидуальные клетки. Карта общего расчёта и баланс — выше.':this.world.local?.oral?'Оранжевые группы — микроколонии, не отдельные клетки. Жёлтый гель — налёт; розовые ореолы — кислота; голубые частицы — поток слюны. Эмаль меняет вид по запасу минералов, не по таймеру.':this.world.local?.mucus?'Голубой и мятный — слои слизи. Высота связана с вычисленным запасом, не с диагнозом. Мысли подписывают источник питания; вид не задаёт «полезность» или «вредность».':this.world.local?.assay?'Ⅱ голубой S — медленное состояние; ◆ золотой R-demo — наследуемая устойчивость, не pDemoR. Вариант и состояние подписаны в карточке и мыслях.':'Жёлтый — pDemoR; розовый — заражение; белый — фагоцит; охристый — спора. Цвет не означает «полезный» или «вредный». ';
  const active=!!this.world.local; $('local-controls').hidden=!active;$('local-exit').hidden=!active;$('local-start').disabled=this.busy||this.world.model.site.id!==siteForScenario($('local-scenario').value);
  $('local-scenario').disabled=this.busy;$('local-load').disabled=this.busy;
  for(const id of ['density','life-rate','feed-nearby','explode','connections','pick-layers'])$(id).disabled=(active&&!(id==='explode'&&this.world.inspect))||(id==='feed-nearby'&&!['colon','mouth','small'].includes(this.world.model.site.id));
  document.querySelectorAll('[data-exp]').forEach(b=>{if(active)b.disabled=true;});
  document.querySelectorAll('[data-field]').forEach(b=>b.disabled=active);
  $('pause').disabled=this.busy;$('local-pause').textContent=this.getPaused()?'▷ Продолжить':'Ⅱ Пауза';
  for(const id of ['local-step','local-save','local-fork','local-pause'])$(id).disabled=this.busy;
  document.querySelectorAll('[data-local-action]').forEach(b=>{const sim=this.world.local;b.hidden=!commandsFor(sim?.scenario).includes(b.dataset.localAction);b.disabled=this.busy||!!sim?.stopped||(b.dataset.localAction==='challenge'&&!!sim?.assay?.bath)||(b.dataset.localAction==='washout'&&!sim?.assay?.bath)||(b.dataset.localAction==='substrate_off'&&!sim?.mucus?.substrate)||(b.dataset.localAction==='substrate_on'&&!!sim?.mucus?.substrate)||(b.dataset.localAction==='secretion_slow'&&sim?.mucus?.secretionScale===.25)||(b.dataset.localAction==='secretion_restore'&&sim?.mucus?.secretionScale===1);});
  $('readouts').hidden=active;$('local-readouts').hidden=!active;
  if(!active){$('local-summary').textContent='Новый режим: численные агенты, причинные события, химия и воспроизведение. Выберите толстую кишку или полость рта для соответствующего опыта.';return;}
  if(!force&&this.lastHUD===this.world.local.tick)return;this.lastHUD=this.world.local.tick;
  const s=this.world.local.summary();$('local-summary').textContent=`${LOCAL_SCENARIOS[this.world.local.scenario]} · t=${s.time.toFixed(1)} уч. ед. · ${s.axis?'индивидуальные клетки не моделируются · агентов':s.ecology||s.pulseRelay?'функциональных групп':s.oral?'микроколоний':'живых агентов'} ${s.alive}${s.oral||s.ecology||s.pulseRelay?' (не число клеток)':' · генеалогических записей '+this.world.local.entities.length}. ${s.stopped?'Достигнут предел времени. ':''}${s.capacityHits?'Лимит агентов ограничивает новые рождения. ':''}${s.assay?'Равномерный лабораторный тест; не лечение кишечника. ':''}Не клиническая модель.`;
  $('local-readouts').innerHTML=(s.pulseRelay?[['O₂ просвет',s.pulseRelay.oxygenLumen.toFixed(3)],['O₂ ткань',s.pulseRelay.oxygenTissue.toFixed(3)],['Расход O₂',s.pulseRelay.oxygenUsed.toFixed(3)]]:s.contact?[['Расстояние',s.contact.distance],['Копия у получателя',s.contact.recipientHas?'есть':'нет'],['Попытка · шаги',s.contact.elapsed+'/30']]:s.axis?[['Глюкоза крови · мМ',s.axis.bloodConcentration.toFixed(3)],['NTS · норм.',s.axis.nts.toFixed(3)],['Баланс · ммоль',s.axis.error.toExponential(1)]]:s.ecology?[['Новичок · C',s.ecology.newcomer.toFixed(3)],['Ресурс R',s.ecology.r.toFixed(3)],['Кровь D',s.ecology.transport.bloodD.toFixed(3)],['Кровь M',s.ecology.transport.bloodM.toFixed(3)]]:s.oral?[['Микроколонии',s.cells],['Налёт · у.е.',s.oral.plaque.toFixed(2)],['Минимальный pH',s.oral.minPH.toFixed(2)],['Минерал · % модели',s.oral.mineral.toFixed(1)],['Дефектные участки',s.oral.defects]]:[['Клетки',s.cells],['Фаги',s.phages],['pDemoR',s.plasmids],['Инфицированы',s.infected],['Лизогены',s.lysogens],['Споры',s.spores],...(s.mucus? [['Мин. запас слизи',(s.mucus.minInner*100).toFixed(1)+'%'],['Тонких участков',s.mucus.thinPatches]]:[]),...(s.assay? [['Медленные S',s.assay.persisters],['Наследуемые R',s.assay.resistant]]:[]),['Фагоциты',s.immune],['Бутират · у.е.',s.butyrate.toFixed(3)]]).map(([k,v])=>`<div class="readout"><small>${k}</small><b>${v}</b></div>`).join('');
  $('local-seek').max=this.record?.endTick??s.tick;$('local-seek').value=s.tick;$('local-seek').disabled=this.busy;$('local-cursor').textContent=`Шаг ${s.tick} / ${$('local-seek').max}`;
  $('local-field').value=this.world.cloud.fieldKind;$('local-slice').value=String(this.world.cloud.slice);
  const events=this.world.local.events.filter(e=>e.kind!=='birth').slice(-7).reverse();
  $('local-events').replaceChildren(...events.map(event=>{const b=document.createElement('button');b.textContent=`${(event.tick*.1).toFixed(1)} · ${EVENT_NAMES[event.kind]||event.kind}${event.action?' · '+LOCAL_ACTION_NAMES[event.action]:''} · ${event.actors.map(id=>'#'+id).join(' → ')}`;b.disabled=this.busy;b.onclick=()=>{this.learningView.selectEvent(event);if(!event.actors.length)return;const id=event.actors.find(id=>this.world.local.get(id)?.alive)||event.actors[0];this.selectAgent(id-1);this.world.focusAgent(id-1);};return b;}));
 }
 history(){
  const sim=this.world.local;if(!sim)return;const id=this.world.selected+1,h=sim.lineage(id);
  const heading=sim.axis?'Нервный путь · журнал':h?`#${id} · ${LOCAL_SPECIES[h.entity.species].name}`:'Выберите агента в сцене или журнале';
  const lineage=sim.pulseRelay?'<p>Каждый ID — функциональная группа. Метки пищевых импульсов учитываются в биомассе и продуктах; индивидуальные родословные здесь не рассчитываются.</p>':sim.axis?'<p>Здесь нет индивидуальных клеток или родословных. Журнал показывает входы глюкозы, вмешательства и вычисленные изменения вызванного ответа.</p>':sim.ecology?'<p>Каждый ID — функциональная группа. Родословные отдельных клеток не вычисляются. R/Q обозначают ресурсы, а не реальные штаммы; виды используются только как графические формы. Журнал ниже показывает изменение условий и вычисленные переходы.</p>':sim.oral?'<p>Каждый ID — микроколония. Меняется её активная биомасса, а не число нарисованных клеток; индивидуальные деления и родословные в этом модуле не рассчитываются.</p>':h?`<p>Состояние: ${escape(LOCAL_STATE_NAMES[h.entity.state]||h.entity.state)}. Родители: ${h.entity.parents.join(', ')||'начальная клетка'}. Потомки: ${h.children.join(', ')||'пока нет'}. ${h.entity.host?'Хозяин происхождения фага: #'+h.entity.host:''}</p><p>Плазмиды: ${h.entity.plasmids.join(', ')||'нет'}. Причина завершения: ${escape(LOCAL_CAUSE_NAMES[h.entity.cause]||LOCAL_STATE_NAMES[h.entity.state]||h.entity.state)}.</p>`:'';
  const events=sim.oral||sim.ecology||sim.axis||sim.pulseRelay?sim.events.slice(-100):h?h.events:sim.events.slice(-100);
  this.dialog('ПРИЧИННЫЙ ЖУРНАЛ И ГЕНЕАЛОГИЯ',`<h2>${heading}</h2>${lineage}${sim.oral||sim.ecology||sim.axis||sim.pulseRelay?'':`<p>pDemoR — условная совместимая плазмида с учебным признаком устойчивости; это не свойство всех плазмид. ID сохраняются после гибели. Хозяин фага — контекст происхождения, не генетический родитель.</p>`}<div class="notice">Лимиты: ${LOCAL_LIMITS.alive} живых агентов, ${LOCAL_LIMITS.ids} ID, ${LOCAL_LIMITS.ticks} шагов. Сохраняется до ${LOCAL_LIMITS.events} последних событий. Полное состояние восстанавливается из начальных условий и команд той же версии.</div>${events.slice(-100).reverse().map(e=>`<article class="timeline-item"><b>${(e.tick*.1).toFixed(1)} · ${EVENT_NAMES[e.kind]||e.kind}</b><p>${e.actors.map(id=>'#'+id).join(' → ')} ${e.cause?escape(LOCAL_CAUSE_NAMES[e.cause]||e.cause):''} ${e.burst!==undefined?' · потомство: '+e.burst:''}</p><button class="outline" data-history-event="${e.seq}">Почему это произошло? →</button></article>`).join('')}`);
  document.querySelectorAll('[data-history-event]').forEach(b=>b.onclick=()=>{const event=sim.events.find(e=>e.seq===+b.dataset.historyEvent);if(event){$('dialog').close();this.learningView.selectEvent(event);$('learning-panel').scrollIntoView({block:'start',behavior:'auto'});}});
 }

 compare(){const a=this.control.summary(),b=this.world.local.summary();const col=(s,title)=>`<div><h3>${title}</h3><p>${s.pulseRelay?`O₂ просвета: ${s.pulseRelay.oxygenLumen.toFixed(4)}<br>Общий расход O₂: ${s.pulseRelay.oxygenUsed.toFixed(4)}`:s.contact?`Расстояние: ${s.contact.distance}<br>Копия у получателя: ${s.contact.recipientHas?'есть':'нет'}<br>Передач: ${s.contact.transfers}`:s.axis?`Глюкоза крови: ${s.axis.bloodConcentration.toFixed(4)} мМ<br>NTS: ${s.axis.nts.toFixed(4)} норм.<br>Баланс глюкозы: ${s.axis.error.toExponential(2)} ммоль`:s.ecology?`Биомасса новичка: ${s.ecology.newcomer.toFixed(4)}<br>Доступный R: ${s.ecology.r.toFixed(4)}<br>D в крови: ${s.ecology.transport.bloodD.toFixed(4)}<br>M в крови: ${s.ecology.transport.bloodM.toFixed(4)} · у.е. C`:s.oral?`Микроколоний: ${s.alive}`:`Живых: ${s.alive}<br>pDemoR: ${s.plasmids}<br>Фагов: ${s.phages}<br>Лизогенов: ${s.lysogens}<br>Бутират: ${s.butyrate.toFixed(3)} у.е.<br>Поглощений: ${s.counts.engulf||0}`}${s.oral?`<br>Налёт: ${s.oral.plaque.toFixed(3)} у.е.<br>pH: ${s.oral.minPH.toFixed(2)}<br>Минеральный запас: ${s.oral.mineral.toFixed(1)}% модели<br>Структурных дефектов: ${s.oral.defects}`:''}${s.mucus?`<br>Минимальный внутренний запас: ${(s.mucus.minInner*100).toFixed(1)}% начального<br>Тонких участков: ${s.mucus.thinPatches} / 144<br>Гликанов потреблено: ${(s.mucus.outerUsed+s.mucus.innerUsed).toFixed(3)} у.е.`:''}<br>Погрешность углеродного баланса: ${s.carbonError.toExponential(2)}</p></div>`;this.dialog('ЛОКАЛЬНЫЙ КОНТРОЛЬ',`<h2>Одинаковый старт, шаг ${b.tick}</h2><div class="comparison">${col(a,'Без ваших вмешательств')}${col(b,'Ваш опыт')}</div><p>Оба расчёта начинают с одного seed и сценария. Меняется вмешательство, не графическая плотность. Условные количества — не анализ микробиома пациента.</p><button class="outline" id="compare-graphs">Траектории A/B во времени →</button>`);$('compare-graphs').onclick=()=>{$('dialog').close();$('learning-chart-area').scrollIntoView({block:'center',behavior:'auto'});};}
}
