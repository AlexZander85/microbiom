import {AXIS_TRIALS} from '../physiology/gut-brain.js';
const $=id=>document.getElementById(id),num=n=>n.toFixed(4);
export class AxisView{
 constructor(controller){this.c=controller;document.querySelectorAll('[data-axis-stop]').forEach(b=>b.onclick=()=>controller.finish(+b.dataset.axisStop));$('axis-restart').onclick=()=>controller.learningView.prepare('gutbrain');}
 refresh(){const c=this.c,s=c.world.local;$('axis-panel').hidden=!s?.axis;if(!s?.axis)return;const a=c.control.summary().axis,b=s.summary().axis;
 $('axis-restart').disabled=c.busy;document.querySelectorAll('[data-axis-stop]').forEach(el=>el.disabled=c.busy||(!c.learning.meta.guided&&!c.record)||(!!c.record&&+el.dataset.axisStop>c.record.endTick));
 $('axis-phase').textContent=`Шаг ${s.tick} · ${AXIS_TRIALS[c.learning.meta.axisTrial]?.name||'свободный опыт'} · синапс ${b.synapseEnabled?'проводит':'блокирован'} · вагальный вход ${b.vagusEnabled?'проводит':'блокирован'}`;
 const stages=[['sensor','Сенсор кишечного эпителия'],['glutamate','Глутаматный выход клетки'],['afferent','Вагальный афферент'],['nts','Стволовая мишень · NTS']];
 $('axis-stages').innerHTML=stages.map(([key,label])=>`<article><small>${label}</small><b>${num(b[key])}</b><meter min="0" max="1" value="${b[key]}" aria-label="${label}: ${num(b[key])}"></meter><span>A: ${num(a[key])}</span></article>`).join('');
 $('axis-table').innerHTML=[['Кишечная глюкоза · мМ','lumenConcentration'],['Добавленная глюкоза в крови · мМ','bloodConcentration'],['Вызванный NTS · норм. активность','nts'],['Площадь ответа NTS · норм. акт. × уч. время','ntsArea'],['Использовано глюкозы · ммоль','used'],['Кишечный вынос · ммоль','excreted']].map(([label,key])=>`<tr><th>${label}</th><td>${num(a[key])}</td><td>${num(b[key])}</td></tr>`).join('');
 $('axis-budget').textContent=`B · вход ${num(b.input)} ммоль = желудочный резерв ${num(b.stomach)} + кишечный ${num(b.lumen)} + портальный ${num(b.portal)} + печёночный ${num(b.liver)} + кровь ${num(b.blood)} + использование ${num(b.used)} + кишечный вынос ${num(b.excreted)}. Ошибка ${b.error.toExponential(2)} ммоль. Начальный добавленный материал = 0; базальная гликемия не рассчитывается.`;
 $('axis-ledger').textContent=Object.entries(s.axis.ledger).map(([k,v])=>`${k}: ${num(v)} ммоль`).join(' · ');
 }
}
