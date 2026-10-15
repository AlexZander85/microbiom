import {LOOP_TRIALS,LOOP_RULES} from '../physiology/axis-loop.js';
const $=id=>document.getElementById(id),num=n=>n.toFixed(3);
const explanations={
 source:['Микробы — настоящий источник','loopSource','Пищевой субстрат проходит желудочный и тонкокишечный резервы. Функциональная группа превращает его углерод в биомассу, ацетат, пропионат и учтённые прочие продукты. Выключение ферментации сохраняет клетки и микробный маркер; это не стерилизация.'],
 neural:['01 · По нерву идёт информация','loopNTS','Вход зависит от пропионата в стеночном отсеке, а не от наличия его где угодно. FFAR3-связанное звено посылает нормированный сигнал по афферентной очереди с задержкой 10 шагов. NTS — ядро одиночного пути. Ни ацетат, ни пропионат не транспортируются по нерву.'],
 humoral:['02 · Через кровь переносится вещество','loopBrain','Ацетат проходит стенку, портальную кровь и печень. Часть используется до системной крови. Обмен кровь ↔ мозг зависит от концентраций и собственного переключателя ГЭБ. В мозговом отсеке считаются ацетат и его использование — не настроение и не произвольный балл активности. Отсутствие мозгового пропионата в этом расчёте — исключённый путь, не утверждение его биологической невозможности.'],
 immune:['03 · Эндотелий принимает сигнал','loopEP3','Микробный TLR4-активный материал учитывается в отдельных единицах активности. Кишечная проницаемость меняет его доступность в ткани. Периферический цитокиновый сигнал действует на эндотелий сосудов мозга; далее рассчитываются PGE₂- и EP3-связанные звенья. Это не свободная диффузия цитокинов через ГЭБ. Температура и болезнь не вычисляются.'],
 feedback:['↶ Обратная связь меняет будущий вход','loopDelivered','Тормозящее звено NTS/DMV → моторный выход приходит с задержкой 20 шагов. Выход из желудка умножается на 1 / (1 + 2 × моторный сигнал). Пища не исчезает: она дольше остаётся в желудочном резерве. Это выбранное учебное замыкание, не доказанная FFAR3-зависимость опорожнения желудка. При его выключении другие ветви продолжают работать.']
};
const poolNames={stomach:'Желудочный резерв',small:'Тонкокишечный резерв',colon:'Колонический субстрат',biomass:'Микробная биомасса',terminal:'Прочие продукты / вынос',lumen:'Просвет',wall:'Стеночный отсек',portal:'Портальная кровь',liver:'Печёночный отсек',blood:'Системная кровь',brain:'Мозговой отсек',used:'Использовано · конечный сток',exported:'Выведено · конечный сток'};
const ruleNames={meal:'Пищевой вход · ммоль C',gastric:'Желудочный выход · 1/уч. время',smallTransit:'Тонкокишечный транзит · 1/уч. время',fermentation:'Максимальное потребление · C/C биомассы/уч. время',halfSubstrate:'Полунасыщение субстрата · ммоль C',biomassYield:'Углеродный выход биомассы',acetateYield:'Углеродный выход ацетата',propionateYield:'Углеродный выход пропионата',maintenance:'Поддержание · 1/уч. время',foodExit:'Вынос субстрата · 1/уч. время',absorption:'Всасывание SCFA · 1/уч. время',wallOut:'Стенка → портальная кровь · 1/уч. время',acidExit:'Вынос SCFA · 1/уч. время',portalOut:'Портальная кровь → печень · 1/уч. время',liverOut:'Печень → кровь · 1/уч. время',liverUse:'Использование печенью · 1/уч. время',peripheralUse:'Периферическое использование · 1/уч. время',bbb:'Обмен ацетата через ГЭБ · л/уч. время',brainPartition:'Отношение равновесных концентраций мозг/кровь',brainUse:'Мозговое использование · 1/уч. время',receptorK:'Полунасыщение пропионатного входа · мМ',receptorTau:'Инерция рецепторного звена · уч. время',ntsTau:'Инерция NTS · уч. время',dmvTau:'Инерция моторного звена · уч. время',motorTau:'Инерция эффектора · уч. время',feedbackGain:'Усиление торможения · безразмерное',afferentDelay:'Афферентная задержка · шаги',efferentDelay:'Эфферентная задержка · шаги',markerRelease:'Выделение маркера · ед./ммоль C биомассы/уч. время',markerExit:'Вынос маркера · 1/уч. время',permeability:'Базовый перенос маркера · 1/уч. время',markerClearance:'Тканевый клиренс маркера · 1/уч. время',immuneK:'Полунасыщение TLR4 · ед. маркера в ткани',cytokineTau:'Инерция цитокинового звена · уч. время',endotheliumTau:'Инерция эндотелия · уч. время',pgeTau:'Инерция PGE₂ · уч. время',ep3Tau:'Инерция EP3 · уч. время'};
export class LoopView {
 constructor(controller){
  this.c=controller;this.branch='source';
  $('loop-entry').onclick=()=>controller.learningView.prepare('axisLoop');
  $('loop-restart').onclick=()=>controller.learningView.prepare('axisLoop');
  document.querySelectorAll('[data-loop-stop]').forEach(b=>b.onclick=()=>controller.finish(+b.dataset.loopStop));
  $('loop-map').onclick=e=>{const b=e.target.closest('[data-loop-branch]');if(!b)return;this.branch=b.dataset.loopBranch;$('learning-metric').value=explanations[this.branch][1];this.describe();controller.learningView.refresh(true);};
  $('loop-scene').onclick=()=>{controller.world.follow=false;controller.world.pan=[0,0,0];controller.navigate(2.35);$('expedition').scrollIntoView({block:'start',behavior:'auto'});};
  $('loop-rules').innerHTML=Object.entries(LOOP_RULES).filter(([k])=>k!=='volumes').map(([k,v])=>`<tr><th>${ruleNames[k]}</th><td>${v}</td></tr>`).join('')+Object.entries(LOOP_RULES.volumes).map(([k,v])=>`<tr><th>Объём: ${poolNames[k]} · л</th><td>${v}</td></tr>`).join('');
  this.describe();
 }
 describe(){const [title,,text]=explanations[this.branch];$('loop-detail-title').textContent=title;$('loop-detail-text').textContent=text;document.querySelectorAll('[data-loop-branch]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.loopBranch===this.branch)));}
 refresh(){
  const c=this.c,s=c.world.local;$('loop-panel').hidden=!s?.axisLoop;$('loop-entry').disabled=c.busy||c.world.model.site.id!=='colon';if(!s?.axisLoop)return;
  $('loop-restart').disabled=c.busy;$('loop-scene').disabled=c.busy;
  document.querySelectorAll('[data-loop-stop]').forEach(b=>b.disabled=c.busy||(!c.learning.meta.guided&&!c.record)||(!!c.record&&+b.dataset.loopStop>c.record.endTick));
  const b=s.summary().axisLoop,a=c.control.summary().axisLoop,p=s.axisLoop;
  $('loop-phase').textContent=`Шаг ${s.tick} / ${c.record?.endTick??(c.learning.meta.guided?1400:6000)} · B: ${LOOP_TRIALS[c.learning.meta.loopTrial]?.name||'свободный опыт'}${c.learning.meta.guided?'':' · свободная ветка / запись'}`;
  $('loop-food').textContent=`Желудок ${num(b.stomach)} → тонкая кишка ${num(b.small)} → субстрат микробов ${num(b.substrate)} ммоль C`;
  $('loop-source-value').textContent=`Биомасса ${num(b.biomass)} · ферментировано ${num(b.fermented)} ммоль C`;
  $('loop-neural-value').textContent=`NTS ${num(b.nts)} · норм. 0–1`;
  $('loop-humoral-value').textContent=`Ацетат мозга ${num(b.acetateBrain)} мМ`;
  $('loop-immune-value').textContent=`EP3-мишень ${num(b.ep3)} · норм. 0–1`;
  $('loop-feedback-value').textContent=`Моторный сигнал ${num(b.motor)} → желудочный выход ×${num(b.emptying)}`;
  for(const [key,value] of Object.entries(b.gates)){
   const el=$('loop-gate-'+key);el.textContent=value?'Звено включено':'Звено выключено';el.dataset.open=String(value);
  }
  for(const [id,value] of [['neural',b.nts],['humoral',b.acetateBrain/(1+b.acetateBrain)],['immune',b.ep3],['feedback',b.motor]])$('loop-card-'+id).style.setProperty('--signal',Math.max(.1,value));
  $('loop-barrier').textContent=`Кишечный перенос маркера ×${b.barrier}; это не переключатель ГЭБ.`;
  $('loop-table').innerHTML=[['Ферментировано · ммоль C','fermented'],['NTS · норм. 0–1','nts'],['Ацетат крови · мМ модели','acetateBlood'],['Ацетат мозга · мМ модели','acetateBrain'],['Использовано в мозге · ммоль ацетата','brainUsed'],['Мозговая экспозиция · мМ × уч. время','exposure'],['Цитокиновый сигнал · норм. 0–1','cytokines'],['Эндотелий · норм. 0–1','endothelium'],['PGE₂-звено · норм. 0–1','pge'],['EP3-мишень · норм. 0–1','ep3'],['Моторный выход · норм. 0–1','motor'],['Желудочный выход · множитель','emptying'],['Доставлено колоническому отсеку · ммоль C','delivered']].map(([label,key])=>`<tr><th>${label}</th><td>${num(a[key])}</td><td>${num(b[key])}</td></tr>`).join('');
  $('loop-budget').textContent=`B · 1 ммоль C начальной биомассы + ${num(b.input)} входа = ${num(s.carbon())} в текущих пулах и конечных стоках. Ошибка ${b.carbonError.toExponential(2)} ммоль C. Маркер: вход ${num(p.marker.input)} = просвет ${num(p.marker.lumen)} + ткань ${num(p.marker.tissue)} + вынос ${num(p.marker.exported)}; ошибка ${b.markerError.toExponential(2)} ед. активности. Сигналы не прибавляются к массе.`;
  $('loop-pools').innerHTML=['food','acetate','propionate'].flatMap(k=>Object.entries(p[k]).map(([pool,v])=>`<tr><th>${{food:'Субстрат / биомасса',acetate:'Ацетат',propionate:'Пропионат'}[k]} · ${poolNames[pool]}</th><td>${num(v)}</td><td>${k==='food'?'—':num(v/(k==='acetate'?2:3))}</td></tr>`)).join('');
  $('loop-ledger').textContent=Object.values(p.ledger).filter(e=>e.amount>0).map(e=>`${e.material}: ${e.from} → ${e.to}: ${num(e.amount)} ${e.material==='marker'?'ед. маркера':'ммоль C'}`).join('\n');
 }
}
