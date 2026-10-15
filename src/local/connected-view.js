import {COMPETITION_TRIALS} from './competition.js';
const $=id=>document.getElementById(id),n=v=>Math.abs(v)<.0001&&v!==0?v.toExponential(2):v.toFixed(4);
const names={input:'Внешний вход',stomach:'Желудочный резерв',small:'Тонкокишечный резерв',colon:'Колонический участок',portal:'Портальный отсек',liver:'Печёночный отсек',blood:'Системная кровь',used:'Использовано хозяином',excreted:'Выведено из крови',exported:'Внешний вынос',resident:'Потребители R',newcomer:'Новичок',other:'Потребители Q',maintenance:'Поддержание',washout:'Вымывание'};
const sum=o=>Object.values(o).reduce((a,b)=>a+b,0);
const stock=(sim,key)=>key==='colon'?{r:sim.summary().ecology.r,q:sim.summary().ecology.q,m:sim.summary().ecology.m}:sim.ecology.transport[key];
export class ConnectedView{
 constructor(controller){this.c=controller;this.node='stomach';
  $('connected-restart').onclick=()=>controller.learningView.prepare(controller.world.local.scenario);
  $('connected-nodes').onclick=e=>{const b=e.target.closest('[data-compartment]');if(b){this.node=b.dataset.compartment;this.refresh();}};
  document.querySelectorAll('[data-connected-stop]').forEach(b=>b.onclick=()=>controller.finish(+b.dataset.connectedStop));
 }
 refresh(){const c=this.c,s=c.world.local;$('connected-panel').hidden=!s?.ecology;if(!s?.ecology)return;
  const e=s.summary().ecology,a=c.control.summary().ecology,t=e.transport,competition=s.scenario==='competition';
  $('connected-title').textContent=competition?'Защита без войны · конкуренция за R':'Связанные отсеки · физиология, этап 1';
  $('connected-restart').disabled=c.busy;
  $('competition-observations').hidden=!competition;
  $('connected-phase').textContent=`Шаг ${s.tick} · ${competition?(c.learning.meta.competitionTrial?COMPETITION_TRIALS[c.learning.meta.competitionTrial].name:'свободный опыт'):'B: выход из желудка ×'+t.emptying} · ${c.learning.meta.guided?'учебный план':'свободная ветка'}`;
  for(const b of document.querySelectorAll('[data-connected-stop]')){b.hidden=b.dataset.route!==s.scenario;b.disabled=c.busy||(!c.learning.meta.guided&&!c.record)||(!!c.record&&+b.dataset.connectedStop>c.record.endTick);}
  $('competition-table').innerHTML=[['Биомасса новичка','newcomer'],['Биомасса потребителей R','resident'],['Биомасса потребителей Q','other'],['Доступный R','r'],['Доступный Q','q'],['R потреблён новичком · с начала','usedByNewcomer'],['Новичок: вымыто · с начала','washedNewcomer'],['Новичок: поддержание · с начала','maintenanceNewcomer']].map(([label,k])=>`<tr><th>${label}</th><td>${n(a[k])}</td><td>${n(e[k])}</td></tr>`).join('');
  $('competition-net').textContent=`Сейчас B: чистое изменение биомассы новичка ${n(e.growth)} у.е. C / уч. время. Поступившая извне биомасса не считается ростом. Токсинов, атак и фагов в этом расчёте нет.`;
  for(const b of document.querySelectorAll('[data-compartment]')){const key=b.dataset.compartment;b.setAttribute('aria-pressed',String(key===this.node));b.querySelector('b').textContent=n(sum(stock(s,key)));}
  const bstock=stock(s,this.node),astock=stock(c.control,this.node);
  $('compartment-detail').innerHTML=`<h4>${names[this.node]} · шаг ${s.tick}</h4><p>${Object.entries(bstock).map(([k,v])=>`${k.toUpperCase()}: A ${n(astock[k])} / B ${n(v)}`).join(' · ')} у.е. C.</p><p>Это запас, не концентрация. Выбор узла только меняет просмотр; время и состояние всех отсеков сохраняются.</p>`;
  const out=t.used+t.excreted+e.exported,stored=s.carbon()-out;
  $('connected-balance').textContent=`B: начальный запас ${n(s.initialCarbon)} + входы ${n(s.inputCarbon)} = текущие запасы ${n(stored)} + учтённые выходы ${n(out)}. Ошибка ${s.summary().carbonError.toExponential(2)} у.е. C. Выходы: использование хозяином ${n(t.used)}, из крови ${n(t.excreted)}, колонический вынос и поддержание ${n(e.exported)}. Внесённая биомасса включена во входы.`;
  $('connected-ledger').innerHTML=Object.values(s.ecology.transport.ledger).map(edge=>`<tr><td>${names[edge.from]} → ${names[edge.to]}</td><td>${edge.substance==='biomass'?'биомасса':edge.substance.toUpperCase()}</td><td>${n(edge.amount)}</td></tr>`).join('');
 }
}
