import {PULSE_TRIALS,PULSE_POOLS} from './pulse-relay.js';
import {CONTACT_TRIALS} from './contact-study.js';
const $=id=>document.getElementById(id),n=v=>v===undefined?'—':Math.abs(v)<.0001&&v!==0?v.toExponential(2):v.toFixed(4);
const pools={food:'Субстрат',acetate:'Ацетат',butyrate:'Бутират в просвете',tissue:'Бутират в ткани',producer:'Биомасса первой группы',consumer:'Биомасса второй группы',used:'Терминальные продукты тканевого использования',exported:'Вынос / поддержание'};
export class InvestigationsView{
 constructor(c){this.c=c;for(const key of ['pulse','contact']){document.querySelectorAll(`[data-${key}-stop]`).forEach(b=>b.onclick=()=>c.finish(+b.dataset[key+'Stop']));$(key+'-restart').onclick=()=>c.learningView.prepare(key==='pulse'?'pulseRelay':'contact');}
 $('pulse-selected').onchange=()=>{c.learning.meta.relayPulse=$('pulse-selected').value;if(c.record)c.record.learning={...c.learning.meta};c.refresh(true);};
 $('pulse-scene').onclick=()=>{c.navigate(2.35);$('expedition').scrollIntoView({block:'start',behavior:'auto'});};
 $('contact-scene').onclick=()=>{c.world.follow=false;c.world.pan=[0,0,0];c.navigate(2.85);$('expedition').scrollIntoView({block:'start',behavior:'auto'});};
 }
 refresh(){const c=this.c,s=c.world.local;for(const [key,active] of [['pulse',!!s?.pulseRelay],['contact',!!s?.contactStudy]]){ $(key+'-panel').hidden=!active;if(!active)continue;$(key+'-restart').disabled=c.busy;$(key+'-scene').disabled=c.busy;document.querySelectorAll(`[data-${key}-stop]`).forEach(b=>b.disabled=c.busy||(!c.learning.meta.guided&&!c.record)||(!!c.record&&+b.dataset[key+'Stop']>c.record.endTick));}
 if(s?.pulseRelay){const b=s.summary().pulseRelay,a=c.control.summary().pulseRelay,id=c.learning.meta.relayPulse??'meal-1';
 $('pulse-selected').disabled=c.busy;
 const ids=[...new Set(['meal-1','meal-2',...Object.keys(b.pulses).filter(x=>x.startsWith('manual-')),id])],stamp=ids.join('|');
 if(this.pulseStamp!==stamp){this.pulseStamp=stamp;$('pulse-selected').innerHTML=ids.map(x=>`<option value="${x}">${x==='meal-1'?'Первый импульс · шаг 10':x==='meal-2'?'Второй импульс · шаг 300':'Дополнительный '+x}</option>`).join('');}$('pulse-selected').value=id;
 const p=b.pulses[id],pa=a.pulses[id];
 $('pulse-phase').textContent=`Шаг ${s.tick} · ${PULSE_TRIALS[c.learning.meta.relayTrial]?.name||'свободный опыт'} · использование ацетата ${b.consumerEnabled?'включено':'выключено'} · окисление тканью ${b.respirationEnabled?'включено':'выключено'}`;
 $('pulse-origin').textContent=p?`${id}: поступил на шаге ${p.tick}, ${p.input} у.е. C. Метка — доля происхождения массы, не отдельная молекула. ${pa?'В A есть тот же вход.':'В A этого импульса нет: нулевая кривая означает отсутствие метки, не отсутствие всего обмена.'}`:'Выбранный импульс ещё не внесён. Его график и запасы сейчас нулевые.';
 $('pulse-stock').innerHTML=PULSE_POOLS.map(k=>`<tr><th>${pools[k]}</th><td>${n(pa?.[k])}</td><td>${n(p?.[k])}</td></tr>`).join('');
 const steps=[['foodUsed','1 · Потреблён субстрат'],['acetateMade','2 · Образован ацетат'],['acetateUsed','3 · Ацетат использован соседом'],['butyrateMade','4 · Образован бутират'],['tissueDelivery','5 · Доставлено в ткань'],['oxidized','6 · Окислено тканью']];
 $('pulse-route').innerHTML=steps.map(([k,label])=>`<article><small>${label}</small><b>${n(p?.[k])}</b><span>A ${n(pa?.[k])} · у.е. C с начала</span></article>`).join('');
 $('pulse-oxygen').textContent=`Связанный с окислением выбранной метки расход O₂: B ${n(p?.oxygenUsed)} / A ${n(pa?.oxygenUsed)} у.е. O₂. Общий запас O₂ просвета: B ${n(b.oxygenLumen)} / A ${n(a.oxygenLumen)}; ткани: B ${n(b.oxygenTissue)} / A ${n(a.oxygenTissue)}. Это общий ответ, не сумма независимых «эффектов еды».`;
 $('pulse-budget').textContent=`Баланс C всей системы: ${s.summary().carbonError.toExponential(2)}. Баланс C выбранной метки: ${p?p.error.toExponential(2):'пока нет входа'}. Отдельный баланс O₂: ${b.oxygenError.toExponential(2)}. Строки запасов и конечных выходов дают вход метки; накопленные этапы нельзя складывать друг с другом.`;
 }
 if(s?.contactStudy){const b=s.summary().contact,a=c.control.summary().contact;
 $('contact-phase').textContent=`Шаг ${s.tick} · ${CONTACT_TRIALS[c.learning.meta.contactTrial]?.name||'свободный опыт'}`;
 const status=x=>x.recipientHas?'Копия уже получена':x.pendingInvalidation?'Разнесены · проверка на следующем шаге':x.active?`Контакт: ${x.elapsed}/30 шагов; осталось ${x.remaining}`:'Нет активной передачи';
 $('contact-status').textContent=`A: ${status(a)}. B: ${status(b)}.`;
 $('contact-table').innerHTML=[['Расстояние · учебное',a.distance,b.distance],['Копия у донора',a.donorHas?'есть':'нет',b.donorHas?'есть':'нет'],['Копия у получателя',a.recipientHas?'есть':'нет',b.recipientHas?'есть':'нет'],['Прерванных попыток',a.interruptions,b.interruptions],['Завершённых передач',a.transfers,b.transfers]].map(([label,av,bv])=>`<tr><th>${label}</th><td>${av}</td><td>${bv}</td></tr>`).join('');
 $('contact-timeline').innerHTML=['conjugation','contact_lost','transfer'].flatMap(kind=>s.events.filter(e=>e.kind===kind).map(e=>({tick:e.tick,label:kind==='conjugation'?'Начата новая попытка':kind==='contact_lost'?'Незавершённая попытка отменена':'Передана копия, донор сохранил свою'}))).sort((a,b)=>a.tick-b.tick).map(e=>`<li>Шаг ${e.tick}: ${e.label}</li>`).join('')||'<li>Пока ни одной попытки.</li>';
 }
 }
}
