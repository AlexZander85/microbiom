import {STUDIES,METRICS,RELAY,narrate,highlights,report} from './learning.js';
import {assayCounts} from './persistence.js';
import {LOCAL_ACTION_NAMES,EVENT_NAMES} from './traits.js';
const $=id=>document.getElementById(id);
const esc=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>v===0?'0':Math.abs(v)<.001?v.toExponential(2):Number.isInteger(v)?String(v):v.toFixed(3);
export function chartMarkup(points,metric,commands=[]){
 const key=Object.hasOwn(METRICS,metric)?metric:'butyrate',m=METRICS[key];
 if(!points.length)return '';
 const max=Math.max(...points.flatMap(p=>[p.a[key],p.b[key]]),.000001),end=Math.max(1,points.at(-1).tick);
 const x=t=>56+t/end*548,y=v=>170-v/max*138;
 const path=side=>points.map((p,i)=>i&&!m.continuous&&m.unit!=='у.е.'&&m.unit!=='у.е. накопительно'?`H${x(p.tick).toFixed(2)}V${y(p[side][key]).toFixed(2)}`:`${i?'L':'M'}${x(p.tick).toFixed(2)},${y(p[side][key]).toFixed(2)}`).join(' ');
 const last=points.at(-1),title=`${m.name}. Контроль A: ${num(last.a[key])}, опыт B: ${num(last.b[key])}, t = ${(last.tick*.1).toFixed(1)}. ${m.unit}.`;
 return `<svg viewBox="0 0 640 208" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>
 <path d="M56 30V170H604" fill="none" stroke="#72949b"/><path d="M56 101H604M56 32H604" stroke="#72949b" opacity=".22"/>
 <text x="49" y="36" text-anchor="end">${num(max)}</text><text x="49" y="174" text-anchor="end">0</text><text x="56" y="194">0</text><text x="330" y="194" text-anchor="middle">${(last.tick*.05).toFixed(1)}</text><text x="604" y="194" text-anchor="end">${(last.tick*.1).toFixed(1)} уч. ед.</text>
 ${commands.filter(c=>c.tick<=last.tick).slice(-12).map(c=>`<path d="M${x(c.tick)} 27V170" stroke="#d0afef" stroke-dasharray="2 5" opacity=".65"><title>${esc(LOCAL_ACTION_NAMES[c.kind])} · t=${(c.tick*.1).toFixed(1)}</title></path>`).join('')}
 <path d="${path('a')}" fill="none" stroke="#8ce3ce" stroke-width="3.5" stroke-dasharray="7 5"/>
 <path d="${path('b')}" fill="none" stroke="#ffe18e" stroke-width="2"/>
 <circle cx="${x(last.tick)}" cy="${y(last.a[key])}" r="4" fill="#8ce3ce"/><rect x="${x(last.tick)-3}" y="${y(last.b[key])-3}" width="6" height="6" fill="#ffe18e"/>
 </svg>`;
}
export class LearningView {
 constructor(controller){
  this.c=controller;this.eventSeq=null;this.lastDraw=-1;this.lastSession=null;
  $('study-cards').innerHTML=Object.entries(STUDIES).map(([id,s],i)=>`<article class="study-card"><span class="eyebrow">МИНИ-ИССЛЕДОВАНИЕ 0${i+1}</span><h3>${s.title}</h3><p>${s.question}</p><button class="outline" data-study="${id}">Предсказать и проверить →</button></article>`).join('');
  $('study-cards').onclick=e=>{const b=e.target.closest('[data-study]');if(b)this.prepare(b.dataset.study);};
  $('learning-metric').innerHTML=Object.entries(METRICS).map(([id,m])=>`<option value="${id}">${m.name}</option>`).join('');
  $('learning-metric').onchange=()=>this.refresh(true);
  $('learning-report').onclick=()=>this.showReport();
  document.querySelectorAll('[data-assay-stop]').forEach(b=>b.onclick=()=>this.c.finish(+b.dataset.assayStop));
  document.querySelectorAll('[data-mucus-stop]').forEach(b=>b.onclick=()=>this.c.finish(+b.dataset.mucusStop));
  $('mucus-scene').onclick=()=>{this.c.navigate(2.2);$('expedition').scrollIntoView({block:'start',behavior:'auto'});};
  $('learning-finish').onclick=()=>this.c.finish();
  $('learning-control').onclick=()=>this.c.compare();
  $('learning-latest').onclick=()=>{this.eventSeq=null;this.showEvent();};
  $('learning-rewind').onclick=()=>{const sim=this.c.world.local,e=sim?.events.find(e=>e.seq===this.eventSeq)||this.latest();if(e)this.c.seek(e.tick);};
  $('learning-focus').onclick=()=>{
   const sim=this.c.world.local,e=sim?.events.find(e=>e.seq===this.eventSeq)||this.latest();
   const id=e?.actors.find(id=>sim.get(id)?.alive);
   if(id){this.c.selectAgent(id-1);this.c.world.focusAgent(id-1);$('expedition').scrollIntoView({block:'start',behavior:'auto'});}
  };
  $('learning-links').onclick=e=>{const b=e.target.closest('[data-story-event]');if(b){this.eventSeq=+b.dataset.storyEvent;this.showEvent();}};
  $('learning-bookmarks').onclick=e=>{const b=e.target.closest('[data-story-tick]');if(b)this.c.seek(+b.dataset.storyTick);};
  $('relay-start').onclick=()=>{this.c.start('community');$('relay-details').open=true;this.refresh(true);};
  $('relay-steps').innerHTML=RELAY.map((s,i)=>`<button class="relay-step" data-relay="${i}" aria-pressed="false"><strong>${s.title}</strong><span>${s.text}</span><b id="relay-value-${i}">0 / 0</b><small>опыт / контроль · у.е. с начала</small></button>`).join('');
  $('relay-steps').onclick=e=>{const b=e.target.closest('[data-relay]');if(b)this.relay(+b.dataset.relay);};
 }
 prepare(id){
  if(this.c.busy||this.c.world.model.site.id!=='colon')return;
  this.c.setPaused(true);const s=STUDIES[id];
  this.c.dialog('01 / ПРЕДСКАЖИТЕ · РЕЗУЛЬТАТ ЕЩЁ НЕ ИЗВЕСТЕН',`<h2>${s.title}</h2><p>${s.setup}</p><form id="study-form"><fieldset class="prediction-options"><legend>${s.question}</legend>${s.options.map((o,i)=>`<label><input type="radio" name="prediction" value="${i}" required> ${o}</label>`).join('')}</fieldset><p class="notice">Это предположение, не экзамен. После опыта можно изменить объяснение. Начнётся новый локальный расчёт; текущий при необходимости сохраните заранее.</p><button class="primary" type="submit">Сохранить прогноз и начать →</button></form>`);
  $('study-form').onsubmit=e=>{
   e.preventDefault();const answer=new FormData(e.target).get('prediction');if(answer===null)return;const prediction=Number(answer);
   if(!Number.isInteger(prediction)||prediction<0||prediction>=s.options.length)return;
   $('dialog').close();this.c.start(s.scenario,{version:1,study:id,prediction,reflection:'',guided:true});
   $('learning-panel').scrollIntoView({block:'start',behavior:'auto'});
  };
 }
 latest(){const events=this.c.world.local?.events||[];return events.filter(e=>!['birth','death'].includes(e.kind)).at(-1)||events.at(-1);}
 showEvent(){
  const sim=this.c.world.local;if(!sim)return;
  const event=sim.events.find(e=>e.seq===this.eventSeq)||this.latest();
  $('learning-rewind').disabled=this.c.busy||!event;$('learning-focus').disabled=this.c.busy||!event?.actors.some(id=>sim.get(id)?.alive);
  const stamp=`${event?.seq}:${this.eventSeq}`;if(this.storyStamp===stamp)return;this.storyStamp=stamp;
  const n=narrate(sim,event);
  $('narrator-time').textContent=`СОБЫТИЕ · t = ${(n.tick*.1).toFixed(1)}${this.eventSeq?' · выбранное':' · последнее'}`;
  $('narrator-title').textContent=n.title;$('narrator-text').textContent=n.text;$('narrator-rule').textContent=n.rule;$('narrator-limit').textContent=n.limit;
  $('learning-links').innerHTML=n.links.map(p=>`<button class="outline" data-story-event="${p.seq}">← ${esc(p.label)} · t=${(p.tick*.1).toFixed(1)}</button>`).join('');
  $('learning-rewind').disabled=this.c.busy||!event;$('learning-focus').disabled=this.c.busy||!n.actors.some(id=>sim.get(id)?.alive);
 }
 selectEvent(event){this.eventSeq=event.seq;this.showEvent();}
 relay(i){
  const sim=this.c.world.local;if(!sim)return;
  const r=RELAY[i];this.c.world.cloud.fieldKind=r.field;this.c.world.cloud.slice=r.slice;this.c.world.cloud.updateField();
  $('local-field').value=r.field;$('local-slice').value=String(r.slice);
  document.querySelectorAll('[data-relay]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.relay===i)));
  $('relay-explanation').textContent=`${r.text} В опыте ${num(sim.flux[r.key])}, в контроле ${num(this.c.control.flux[r.key])} у.е. с начала. Показан срез поля «${$('local-field').selectedOptions[0].textContent}», y=${r.slice}. Это суммарный поток, не путь молекулы от конкретного донора.`;
 }
 refresh(force=false){
  const c=this.c,sim=c.world.local,session=c.learning,active=!!sim;
  $('learning-panel').hidden=!active;
  $('persistence-panel').hidden=!sim?.assay;
  $('mucus-panel').hidden=!sim?.mucus;
  $('relay-details').hidden=!!sim?.mucus;
  $('mucus-scene').disabled=c.busy;
  document.querySelectorAll('[data-mucus-stop]').forEach(b=>b.disabled=c.busy||!sim?.mucus||(!session?.meta.guided&&!c.record)||(!!c.record&&+b.dataset.mucusStop>c.record.endTick));
  document.querySelectorAll('[data-assay-stop]').forEach(b=>b.disabled=c.busy||!sim?.assay||(!session?.meta.guided&&!c.record)||(!!c.record&&+b.dataset.assayStop>c.record.endTick));
  document.querySelectorAll('[data-study]').forEach(b=>b.disabled=c.busy||c.world.model.site.id!=='colon');
  $('relay-start').disabled=c.busy||c.world.model.site.id!=='colon';
  $('learning-finish').disabled=c.busy||(!c.record&&(!session?.meta.guided||sim?.tick>=session.study?.end));
  for(const id of ['learning-report','learning-control','learning-latest'])$(id).disabled=c.busy;
  if(!active||!session)return;
  if(this.lastSession!==session){this.lastSession=session;this.eventSeq=null;this.storyStamp=null;this.lastDraw=-1;$('learning-metric').value=session.study?.metric||(sim.mucus?'mucusMinimum':sim.assay?'persisterLine':'butyrate');document.querySelectorAll('[data-relay]').forEach(b=>b.setAttribute('aria-pressed','false'));$('relay-explanation').textContent='Выберите этап: он покажет соответствующее поле в сцене. Нулевое значение означает, что поток ещё не произошёл или нужных участников нет.';}
  const study=session.study;
  $('learning-title').textContent=study?.title||'Что происходит и почему';
  $('learning-phase').textContent=!study?'СВОБОДНАЯ ЛАБОРАТОРИЯ':!session.meta.guided?'СВОБОДНАЯ ВЕТКА':sim.tick>=study.end?'04 / ИТОГ · ПЛАН ЗАВЕРШЁН':'02 / НАБЛЮДАЕМ · 03 / СРАВНИВАЕМ';
  $('learning-setup').textContent=study?study.setup:'Выберите событие, сравните траектории и проследите обмен веществ. Ни рассказчик, ни график не изменяют модель.';
  $('learning-prediction').textContent=study?'Ваш прогноз: '+study.options[session.meta.prediction]:'Прогноз не записан. Для опыта с вопросом выберите мини-исследование выше.';
  $('learning-finish').textContent=c.record?'Досмотреть запись →':'Рассчитать до итога →';
  this.showEvent();
  if(sim.assay){
   const a=assayCounts(sim),bath=sim.assay.bath,round=sim.assay.rounds.length;
   const phase=bath?`Воздействие №${round}`:round?`Препарат удалён · восстановление после №${round}`:'До воздействия · наблюдение';
   $('persistence-stage').textContent=phase;
   $('persistence-live').textContent=`Сейчас: медленных S ${a.persisters}; активных в линии исходных персистеров ${a.recoveredLine}; наследуемых R ${a.resistant}. Генотип S не становится R при пробуждении.`;
   $('persistence-rounds').innerHTML=sim.assay.rounds.length?sim.assay.rounds.map(r=>`<tr><th>№${r.round}<small>шаг ${r.startTick}–${r.endTick??'…'}</small></th>${['sensitive','persisterOrigin','resistant'].map(k=>`<td>${r.start[k]} → ${r.end?r.end[k]:'ещё идёт'}</td>`).join('')}</tr>`).join(''):'<tr><td colspan="4">Воздействий ещё не было. Контроль A не получает препарат.</td></tr>';
  }
  if(sim.mucus){
   const m=sim.summary().mucus,a=c.control.summary().mucus;
   $('mucus-stage').textContent=`${m.substrate?'Субстрат поступает':'Приток субстрата остановлен'} · производство хозяина ×${m.secretionScale} · шаг ${sim.tick}`;
   $('mucus-minimum').textContent=(m.minInner*100).toFixed(1)+'%';
   $('mucus-thin').textContent=m.thinPatches+' / 144';
   $('mucus-consumers').textContent=m.foragers;
   $('mucus-control-note').textContent=`Контроль A: минимальный запас ${(a.minInner*100).toFixed(1)}%; потреблено ${(a.outerUsed+a.innerUsed).toFixed(3)} у.е. гликанов. Потребление может идти без истончения внутреннего слоя.`;
   $('mucus-budget').textContent=`С начала B · хозяин выделил ${m.secreted.toFixed(3)}; наружу перешло ${m.matured.toFixed(3)}; микробы использовали ${(m.outerUsed+m.innerUsed).toFixed(3)} (внутренних ${m.innerUsed.toFixed(3)}); выведено из участка ${m.exported.toFixed(3)} у.е. C. Осталось в слоях ${(m.inner+m.outer).toFixed(3)}, в резерве хозяина ${m.host.toFixed(3)}. Внешние входы: пищевой субстрат ${m.foodInput.toFixed(3)}, ресурс хозяина ${m.hostInput.toFixed(3)}. Погрешность баланса ${sim.summary().carbonError.toExponential(1)}.`;
   const samples=session.points(sim,c.control);
   $('mucus-checkpoints').innerHTML=[90,360,720].map(t=>{const p=samples.find(p=>p.tick===t);return `<tr><th>Шаг ${t}</th><td>${p?p.a.mucusMinimum.toFixed(1)+'%':'—'}</td><td>${p?p.b.mucusMinimum.toFixed(1)+'%':'ещё не рассчитан'}</td></tr>`;}).join('');
  }
  if(!force&&Math.floor(sim.tick/10)===this.lastDraw)return;
  this.lastDraw=Math.floor(sim.tick/10);
  const key=$('learning-metric').value,points=session.points(sim,c.control),last=points.at(-1);
  $('learning-chart').innerHTML=chartMarkup(points,key,sim.commands);
  $('chart-values').textContent=`A · контроль: ${num(last.a[key])}   /   B · опыт: ${num(last.b[key])} ${METRICS[key].unit}. t = ${sim.time.toFixed(1)}.`;
  $('chart-command-list').textContent=sim.commands.length?'Вмешательства только в B: '+sim.commands.slice(-6).map(x=>`${LOCAL_ACTION_NAMES[x.kind]} при t=${(x.tick*.1).toFixed(1)}`).join('; '):'Вмешательств пока нет. Совпадающие линии — тоже результат.';
  $('learning-bookmarks').innerHTML=highlights(sim).map(e=>`<button class="outline" data-story-tick="${e.tick}" ${c.busy?'disabled':''}>↶ ${esc(EVENT_NAMES[e.kind])} · ${(e.tick*.1).toFixed(1)}</button>`).join('');
  RELAY.forEach((r,i)=>{$('relay-value-'+i).textContent=`${num(sim.flux[r.key])} / ${num(c.control.flux[r.key])}`;});
 }
 showReport(){
  const c=this.c;if(!c.world.local||c.busy)return;c.setPaused(true);c.learning.capture(c.world.local,c.control);
  const r=report(c.world.local,c.control,c.learning);
  c.dialog('04 / ОБЪЯСНИТЕ СВОИМИ СЛОВАМИ',`<h2>${esc(r.title)}</h2><p class="tag">${esc(r.phase)}</p><h3>Ваш прогноз</h3><p>${esc(r.prediction)}</p><h3>Что получилось в расчёте</h3><ul>${r.observations.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><h3>Как это объясняет модель</h3><p>${esc(r.explanation)}</p><p>${esc(r.prompt)}</p><label for="study-reflection">Моё объяснение · сохраняется вместе с записью</label><textarea id="study-reflection" maxlength="600" rows="3" placeholder="Я ожидал… Наблюдал… Теперь думаю…">${esc(c.learning.meta.reflection)}</textarea><p id="reflection-status" role="status">До 600 символов. Это заметка, не оценка.</p><p class="notice">${esc(r.limitation)}${r.truncated?' Достигнут лимит агентов или истории: выводы дополнительно ограничены.':''}</p><div class="action-row"><button class="primary" id="report-save">Сохранить опыт и объяснение ↓</button><button class="outline" id="report-back">Вернуться к событиям</button></div>`);
  $('study-reflection').oninput=e=>{c.learning.meta.reflection=e.target.value;if(c.record)c.record.learning={...c.learning.meta};$('reflection-status').textContent='Заметка сохранена в текущем опыте. Скачайте JSON, чтобы перенести её.';};
  $('report-save').onclick=()=>c.save();$('report-back').onclick=()=>$('dialog').close();
 }
}
