import {LOCAL_SPECIES,EVENT_NAMES,LOCAL_CAUSE_NAMES} from './traits.js';
import {assayCounts} from './persistence.js';
import {exportReplay} from './replay.js';

// Teaching plans issue the same public commands as free play. No scripted outcomes.
export const STUDIES={
 mucus:{title:'Кто обновляет защитное покрытие?',scenario:'mucus',end:720,metric:'mucusMinimum',
  question:'Если микробам станет меньше доступен пищевой субстрат, а затем его приток вернётся, что может произойти со слизью?',
  options:['Любой микроб, питающийся слизью, обязательно вреден','Важен баланс: сколько слизи производится и сколько расходуется','Слизь исчезнет и вернётся мгновенно по кнопке'],
  setup:'В обоих участках хозяин постоянно обновляет слизь. Четыре учебных потребителя наружных гликанов используют её и при обычном питании. Двенадцать переключателей при дефиците субстрата меняют источник углерода; четыре соседа используют ацетат. Только в B на шаге 90 останавливаем приток пищевого субстрата, на шаге 360 возвращаем. Ресурс хозяина поступает отдельно. Контроль A не меняется.',
  plan:[{tick:90,kind:'substrate_off',pos:[0,3,0]},{tick:360,kind:'substrate_on',pos:[0,3,0]}],
  prompt:'Было ли потребление слизи в контроле? Почему возвращение субстрата не восстанавливает запас мгновенно? Чем запас слизи отличается от целостности эпителия?',
  takeaway:'Слизь — не неподвижная стена: хозяин её производит, наружный материал обновляется и используется микробами. Само питание гликанами не равно вреду. Если локальный расход превышает пополнение, запас падает; при изменении условий он может восстановиться с задержкой. Здесь меняется сопротивление слизистого покрытия переносу веществ, а не целостность эпителия. Это не опыт о пропущенном обеде и не прогноз болезни.'},
 persistence:{title:'Пережить — не значит стать устойчивым',scenario:'persistence',end:440,metric:'persisterLine',
  question:'Часть чувствительных клеток пережила первое воздействие в медленном состоянии. После возвращения к росту их потомки обязательно устойчивы?',
  options:['Да: выживание всегда означает новый ген защиты','Нет: чувствительность может сохраниться после восстановления роста','Это споры, а не обычные клетки'],
  setup:'Подготовлены 13 активных чувствительных клеток S, 3 медленные клетки с тем же S-признаком и 4 наследуемых R-demo. В опыте B два одинаковых равномерных воздействия, между ними удаление препарата и восстановление. Контроль A без препарата. Это условный лабораторный тест, не схема лечения.',
  plan:[{tick:10,kind:'challenge',pos:[0,3,0]},{tick:100,kind:'washout',pos:[0,3,0]},{tick:340,kind:'challenge',pos:[0,3,0]},{tick:430,kind:'washout',pos:[0,3,0]}],
  prompt:'Что показало повторное воздействие на линию исходных персистеров? Чем эта линия отличается от R-demo? Почему числа после деления — не процент выживших?',
  takeaway:'Персистенция — переживающая субпопуляция без обязательного изменения чувствительности к препарату. Здесь показан один механизм: обратимое замедление с прекращением роста. После выхода из него дочери снова активны и чувствительны. R-demo наследуется отдельно и позволяет рост при этом воздействии. Персистер не спора и не неуязвим.'},
 inheritance:{title:'Копия, а не потеря',scenario:'hgt',end:320,metric:'plasmids',
  question:'Получатель рядом с донором получит дополнительный субстрат. Что произойдёт с pDemoR при контакте и делении?',
  options:['Донор потеряет свою плазмиду','Получатель получит копию; потомки смогут её унаследовать','Субстрат сам создаст плазмиды у всех'],
  setup:'Две совместимые клетки уже рядом. В опыте добавляем субстрат у получателя #2; в контроле — нет. Передача возможна в обоих расчётах. Сравниваем рост линии, а не приписываем появление плазмиды пище.',
  plan:[{tick:0,kind:'feed',pos:[.5,3,0]}],
  prompt:'Чем передача соседу отличается от наследования дочерьми? Почему передача произошла и в контроле?',
  takeaway:'Пища поддерживает рост, но не создаёт нужные гены. Совместимый контакт передаёт копию; деление может распространить уже имеющуюся инструкцию.'},
 phage:{title:'Один вид — разные судьбы',scenario:'phage',end:180,metric:'lysogens',
  question:'После появления профага подадим сигнал индукции. Все похожие бактерии закончат одинаково?',
  options:['Да, название вида определяет всё','Нет: важны рецептор и состояние фага','Любой фаг всегда остаётся внутри клетки'],
  setup:'Есть литическая пара, умеренная пара и вариант без R-demo. На шаге 35 только в опыте подаём сигнал индукции. Контроль с теми же начальными клетками остаётся без сигнала. Незаражение #5 само по себе не доказывает роль рецептора: для заражения нужен ещё контакт.',
  plan:[{tick:35,kind:'induce',pos:[0,3,0]}],
  prompt:'Что изменил сигнал у лизогена? Почему отсутствие рецептора — другое объяснение, чем лизогения?',
  takeaway:'В модели нужен подходящий рецептор. Умеренный фаг может оставаться профагом, а отдельный сигнал переводит его в продуктивный цикл. Одно имя вида не определяет исход.'},
 boundary:{title:'По разные стороны границы',scenario:'immune',end:360,metric:'tissueCells',
  question:'Откроем барьер. Что станет возможным для клетки #3, которая начинала в просвете?',
  options:['Она сможет попасть в тканевый отсек','Все микробы сразу погибнут','Положение барьера ничего не меняет'],
  setup:'Клетка #2 начинает в ткани, #3 — в просвете. Только в опыте открываем барьер. Сравниваем доступ к ткани; попадание туда не означает мгновенное поглощение.',
  plan:[{tick:0,kind:'breach',pos:[0,3,0]}],
  prompt:'Почему не надо уничтожать всех жителей просвета? Достаточно ли попадания в ткань для немедленного поглощения?',
  takeaway:'В этой модели барьер разделяет отсеки. Фагоцит поглощает доступные близкие цели в ткани, а не всех «плохих» по названию. Движение через открытый барьер условно.'}
};
export const METRICS={
 mucusMinimum:{name:'Слизь · минимальный запас внутреннего слоя',unit:'% начального',continuous:true},
 mucusOuter:{name:'Слизь · наружный запас всего',unit:'у.е.'},
 mucusThin:{name:'Слизь · участки ниже учебного порога',unit:'из 144'},
 mucusForagers:{name:'Слизь · потребители гликанов сейчас',unit:'агенты'},
 mucusSecreted:{name:'Слизь · произведено хозяином с начала',unit:'у.е. накопительно'},
 mucusConsumed:{name:'Слизь · потреблено с начала',unit:'у.е. накопительно'},

 persisters:{name:'Медленные клетки сейчас',unit:'агенты'},
 persisterLine:{name:'Живая линия исходных персистеров S',unit:'агенты'},
 sensitiveLine:{name:'Линия изначально активных S',unit:'агенты'},
 geneticR:{name:'Живые наследуемые R-demo',unit:'агенты'},
 recoveredLine:{name:'Активные потомки исходных персистеров',unit:'агенты'},
 plasmids:{name:'Живые носители pDemoR',unit:'агенты'},
 lysogens:{name:'Живые лизогены',unit:'агенты'},
 tissueCells:{name:'Живые микробы в ткани',unit:'агенты'},
 cells:{name:'Живые микробные клетки',unit:'агенты'},
 phages:{name:'Свободные фаги',unit:'частицы'},
 butyrate:{name:'Бутират в среде',unit:'у.е.'},
 acetate:{name:'Ацетат в среде',unit:'у.е.'},
 tissueButyrate:{name:'Использовано тканью с начала',unit:'у.е. накопительно'}
};
export const RELAY=[
 {key:'producerFood',title:'01 · Разобрать субстрат',text:'Бактероиды и бифидобактерии потребили субстрат.',field:'food',slice:3},
 {key:'acetateMade',title:'02 · Оставить ацетат',text:'Эти группы выделили ацетат в среду.',field:'acetate',slice:3},
 {key:'acetateUsed',title:'03 · Накормить соседа',text:'Фекалибактерии потребили ацетат из среды.',field:'acetate',slice:3},
 {key:'butyrateMade',title:'04 · Выделить бутират',text:'Фекалибактерии выделили бутират.',field:'butyrate',slice:3},
 {key:'tissueButyrate',title:'05 · Достичь ткани',text:'Тканевый отсек использовал бутират.',field:'butyrate',slice:-1}
];
export function learningMeta(data,record){
 if(data===undefined)return {version:1,study:null,prediction:null,reflection:'',guided:false};
 if(!data||data.version!==1||!(data.study===null||Object.hasOwn(STUDIES,data.study))||typeof data.reflection!=='string'||data.reflection.length>600||typeof data.guided!=='boolean')throw new Error('Некорректная учебная запись');
 const study=data.study&&STUDIES[data.study];
 if(study){
  if(record.scenario!==study.scenario||!Number.isInteger(data.prediction)||data.prediction<0||data.prediction>=study.options.length)throw new Error('Прогноз не соответствует исследованию');
  if(data.guided){
   const expected=study.plan.filter(c=>c.tick<=record.endTick);
   if(record.endTick>study.end||JSON.stringify(record.commands)!==JSON.stringify(expected))throw new Error('Команды не соответствуют учебному плану');
  }
 }else if(data.prediction!==null||data.guided)throw new Error('Некорректный свободный опыт');
 return {version:1,study:data.study,prediction:data.prediction,reflection:data.reflection,guided:data.guided};
}
export function measure(sim){
 const s=sim.summary(),a=assayCounts(sim);
 return {mucusMinimum:(s.mucus?.minInner??0)*100,mucusOuter:s.mucus?.outer??0,mucusThin:s.mucus?.thinPatches??0,mucusForagers:s.mucus?.foragers??0,mucusSecreted:s.mucus?.secreted??0,mucusConsumed:s.mucus?(s.mucus.outerUsed+s.mucus.innerUsed):0,persisters:a.persisters,persisterLine:a.persisterOrigin,sensitiveLine:a.sensitive,geneticR:a.resistant,recoveredLine:a.recoveredLine,cells:s.cells,plasmids:s.plasmids,lysogens:s.lysogens,phages:s.phages,butyrate:s.butyrate,acetate:s.acetate,
  tissueCells:sim.entities.filter(e=>e.alive&&!e.traits.immune&&!e.traits.virus&&e.pos[1]<0).length,
  tissueButyrate:sim.flux.tissueButyrate};
}
export class LearningSession {
 constructor(meta={version:1,study:null,prediction:null,reflection:'',guided:false}){this.meta={...meta};this.samples=[];}
 get study(){return this.meta.study?STUDIES[this.meta.study]:null;}
 applyPlan(sim){
  if(!this.meta.guided||!this.study)return;
  for(const c of this.study.plan)if(c.tick===sim.tick&&!sim.commands.some(x=>x.tick===c.tick&&x.kind===c.kind))sim.command(c.kind,c.pos);
 }
 capture(sim,control){
  if(sim.tick!==control.tick)throw new Error('Несинхронный контроль');
  if(sim.tick%10&&sim.commands.at(-1)?.tick!==sim.tick)return;
  const sample={tick:sim.tick,a:measure(control),b:measure(sim)};
  const last=this.samples.at(-1);
  if(last?.tick===sim.tick)this.samples[this.samples.length-1]=sample;
  else {if(last&&last.tick>sim.tick)throw new Error('Историю нужно перестроить при перемотке');this.samples.push(sample);}
 }
 points(sim,control){
  const current={tick:sim.tick,a:measure(control),b:measure(sim)};
  return this.samples.at(-1)?.tick===sim.tick?this.samples:[...this.samples,current];
 }
 fork(){this.meta.guided=false;}
 export(sim){return {...exportReplay(sim),learning:{...this.meta}};}
}
const cell=(sim,id)=>`#${id} (${LOCAL_SPECIES[sim.get(id)?.species]?.name||'агент'})`;
const prior=(sim,e,kind,actor)=>sim.events.filter(p=>p.seq<e.seq&&p.kind===kind&&p.actors.includes(actor)).at(-1);
// Templates describe observed transitions and implemented rules, not medical causes.
export function narrate(sim,event){
 if(!event)return {title:'Сначала наблюдаем',text:'Пока нет выбранного события. Подождите несколько шагов или выберите событие в журнале.',rule:'Начальные пары подготовлены для наблюдения; результат вычисляет модель.',limit:'Учебные параметры, не данные пациента.',links:[],actors:[],tick:0};
 const e=event,[a,b]=e.actors,who=a?cell(sim,a):'Опыт',links=[];
 let text='',rule='',limit='Это правило условной локальной модели, не прогноз для человека.';
 const link=p=>{if(p&&!links.some(x=>x.seq===p.seq))links.push({seq:p.seq,tick:p.tick,label:EVENT_NAMES[p.kind]||p.kind});};
 switch(e.kind){
 case 'mucus_supply':text=e.action==='substrate_off'?'Приток субстрата для микробов остановлен.':e.action==='substrate_on'?'Приток субстрата для микробов возвращён.':e.action==='secretion_slow'?'Производственная способность хозяина снижена до четверти.':'Обычная производственная способность хозяина возвращена.';rule='Уже имеющиеся вещества и слизь не исчезают и не возвращаются по команде. Их количества дальше меняют перенос, питание, секреция и вынос. Контроль не получает эту команду.';limit='Не расписание питания человека. Поток ресурса хозяина здесь независим от потока еды для микробов.';break;
 case 'mucus_switch':text=`${who}: ${e.mode==='mucin'?'использует гликаны слизи':'снова использует пищевой субстрат'}.`;rule=sim.get(a)?.species==='akk'?'Этот учебный потребитель использует только наружный материал, даже при наличии пищевого субстрата. Такое потребление само по себе не истончает внутренний слой.':'Переключение рассчитано по локальному количеству субстрата. При истощении наружного запаса модели доступна часть внутренних гликанов; это явно заданное упрощение ферментативной деградации.';limit='Гликаны — сахарные цепочки муцинов. Учебные варианты и пороги не описывают все штаммы вида. Микробы не проходят в эпителий.';link(sim.events.filter(p=>p.seq<e.seq&&p.kind==='mucus_supply').at(-1));break;
 case 'mucus_thin':text=`В участке ${e.patch+1} внутренний запас снизился до ${(e.fraction*100).toFixed(1)}% начального.`;rule='Здесь расход превысил пополнение. Порог 45% нужен для отметки на графике, а не для диагноза. В модели это повышает перенос веществ через покрытие.';limit='Истончение слизи не равно повреждению эпителия. Его целостность, воспаление и болезнь здесь не рассчитываются.';link(sim.events.filter(p=>p.seq<e.seq&&p.kind==='mucus_supply').at(-1));break;
 case 'mucus_recover':text=`В участке ${e.patch+1} внутренний запас снова превысил 75% начального.`;rule='Пополнение хозяином накопило материал после более тонкого состояния. Это вычисленный запас, а не мгновенная команда ремонта. 75% — учебная отметка, не медицинская норма.';limit='Восстановление зависит от текущего расхода и производства; возвращение пищи не гарантирует его при любых параметрах.';link(sim.events.filter(p=>p.seq<e.seq&&p.kind==='mucus_thin'&&p.patch===e.patch).at(-1));break;

 case 'persistence_enter':text=`${who} перешла в медленное состояние${e.prepared?' (подготовленная начальная субпопуляция)':''}.`;rule='Генетический признак S не изменился. Здесь клетка не растёт и реже гибнет при выбранном воздействии; это не универсальная защита от препаратов.';limit='Один учебный механизм персистенции. В реальности не все персистеры просто «спят». Споровой оболочки нет.';break;
 case 'persistence_exit':text=`${who} вернулась к активному росту после удаления препарата.`;rule='Восстановление требует времени и доступного субстрата. Никакой ген устойчивости не появился; чувствительность активной клетки прежняя.';link(prior(sim,e,'persistence_enter',a));break;
 case 'challenge':text=`Началось равномерное воздействие №${e.round} на весь участок.`;rule='Все клетки видят одну заданную среду: медленные не спрятаны от препарата в другом месте. Здесь нет клинических доз или названий лекарств.';break;
 case 'washout':text=`После воздействия №${e.round} препарат удалён из среды.`;rule='Удаление не оживляет погибших и не мгновенно будит переживших. Наблюдайте восстановление и деление перед новой проверкой.';break;
 case 'assay_kill':text=`${who} погибла при воздействии №${e.round}; состояние в тот момент: ${e.state==='persister'?'медленное':'активное'}.`;rule='Гибель здесь вероятностная. У медленного состояния и R-demo риск ниже, но не нулевой. Выживание одной клетки не доказывает наследуемую устойчивость.';link(prior(sim,e,'persistence_exit',a));break;
 case 'transfer':
  text=`${cell(sim,a)} передал копию pDemoR клетке ${cell(sim,b)}. Донор сохранил свою копию.`;
  rule='Сработали совместимость и непрерывный близкий контакт. Пища не создаёт плазмиду; не каждая плазмида несёт устойчивость.';link(prior(sim,e,'conjugation',a));break;
 case 'conjugation':text=`${who} начал контакт с ${cell(sim,b)}.`;rule='Для передачи контакт должен продержаться 30 шагов. Само сближение ещё не означает передачу.';break;
 case 'contact_lost':text='Контакт прервался до завершения передачи.';rule='Расстояние, жизнеспособность и состояние инфекции проверяются на каждом шаге.';link(prior(sim,e,'conjugation',a));break;
 case 'division':case 'branch':
  text=`${who}: ${e.mode==='bud'?'отделилась почка':e.kind==='branch'?'выросла ветвь':'образовались дочерние клетки'} ${e.actors.slice(1).map(id=>'#'+id).join(', ')}.`;
  rule='Биомасса распределяется, а не создаётся из ничего. Имеющиеся плазмиды копируются потомкам. Деление не равно гибели.';link(prior(sim,e,'transfer',a));break;
 case 'adsorption':text=`Фаг #${a} связался с ${cell(sim,b)}.`;rule='Здесь связывание требует близости, R-demo и отсутствия текущей инфекции. Не любая похожая бактерия подходит.';break;
 case 'lysogeny':text=`В клетке ${who} возникло состояние профага.`;rule='Умеренный вариант в этой схеме не сразу разрушает хозяина. Профаг может наследоваться при делении.';link(prior(sim,e,'injection',a));break;
 case 'induction':
  text=`Профаг в ${who} перешёл к синтезу компонентов.`;rule='На лизоген подействовала команда индукции; далее модель считает сборку и лизис.';
  link(prior(sim,e,'lysogeny',a));link(sim.events.filter(p=>p.seq<e.seq&&p.kind==='command'&&p.action==='induce').at(-1));break;
 case 'lysis':
  text=`${who} лизировалась. Вышло ${e.burst} новых фагов${e.limited?' (выход ограничен ёмкостью модели)':''}.`;
  rule='Перед этим прошли стадии инфекции и сборки. Потомство ограничено биомассой хозяина и лимитом агентов. Это не гарантия роста разнообразия.';
  link(prior(sim,e,'assembly',a));link(prior(sim,e,'induction',a));link(prior(sim,e,'adsorption',a));break;
 case 'recruit':text=`Фагоцит #${a} начал двигаться по градиенту тканевого сигнала.`;rule='Сигнал выделяют микробы в тканевом отсеке. Движение по сигналу ещё не означает контакт или поглощение; барьер и расстояние имеют значение.';break;
 case 'engulf':text=`Фагоцит #${a} поглотил ${cell(sim,b)}.`;rule='Цель была доступна в тканевом отсеке и достаточно близко. Жители за интактным барьером не являются доступными целями.';limit='Распознавание и движение упрощены. Попадание в ткань само по себе не гарантирует немедленное поглощение.';break;
 case 'digest':text=`Фагоцит #${a} закончил переваривание.`;rule='Материал поглощённой клетки распределён между биомассой и продуктами обмена; баланс углерода учитывается.';link(prior(sim,e,'engulf',a));break;
 case 't6':text=`${who} нанёс контактный удар клетке ${cell(sim,b)}.`;rule='Достаточны близость, готовность аппарата и отсутствие подходящего иммунного признака у цели. Это не поведение всех бактерий.';break;
 case 'death':text=`${who}: причина завершения — ${LOCAL_CAUSE_NAMES[e.cause]||'событие модели'}.`;rule='Это причина, записанная движком, а не вывод из внешнего вида клетки.';
  if(e.cause==='phage-lysis')link(prior(sim,e,'lysis',a));
  if(e.cause==='T6SS')link(prior(sim,e,'t6',a));break;
 case 'command':text='В опыт внесено вмешательство; контроль не получил его.';rule='Изменения могут проявиться с задержкой. Сравнивайте одинаковое модельное время, а не только текущую картинку.';break;
 default:text=`${who}: ${EVENT_NAMES[e.kind]||'изменение состояния'}.`;rule='Состояние записано движком. Посмотрите участников и соседние стадии; порядок событий сам по себе не доказывает причину.';
 }
 return {title:EVENT_NAMES[e.kind]||'Событие',text,rule,limit,links,actors:[...e.actors],tick:e.tick,seq:e.seq};
}
export function highlights(sim){
 const kinds=['mucus_supply','mucus_switch','mucus_thin','mucus_recover','persistence_enter','persistence_exit','challenge','washout','transfer','division','lysogeny','induction','lysis','engulf','digest','t6'];
 const result=[];
 for(const kind of kinds){const e=sim.events.find(e=>e.kind===kind);if(e)result.push(e);}
 for(const e of sim.events)if(['mucus_supply','challenge','washout'].includes(e.kind)&&!result.includes(e))result.push(e);
 return result.sort((a,b)=>a.seq-b.seq);
}
export function report(sim,control,session){
 const a=measure(control),b=measure(sim),study=session.study;
 const observations=[`Сейчас t = ${sim.time.toFixed(1)} учебных единиц; контроль на том же шаге ${control.tick}.`,
  `Живых микробных клеток: ${b.cells} в опыте / ${a.cells} в контроле. Носителей pDemoR: ${b.plasmids} / ${a.plasmids}.`,
  `Лизогенов: ${b.lysogens} / ${a.lysogens}. Микробов в ткани: ${b.tissueCells} / ${a.tissueCells}.`,
  `Бутирата в среде: ${b.butyrate.toFixed(4)} / ${a.butyrate.toFixed(4)} у.е. Использовано тканью с начала: ${b.tissueButyrate.toFixed(4)} / ${a.tissueButyrate.toFixed(4)} у.е.`];
 if(sim.mucus){
  const m=sim.summary().mucus,c=control.summary().mucus;
  observations.splice(1,2);
  observations.push(`Минимальный внутренний запас: ${(m.minInner*100).toFixed(1)}% в опыте / ${(c.minInner*100).toFixed(1)}% в контроле от начального. Это не процент здоровья.`,
   `Потреблено гликанов: ${(m.outerUsed+m.innerUsed).toFixed(3)} / ${(c.outerUsed+c.innerUsed).toFixed(3)} у.е.; произведено хозяином: ${m.secreted.toFixed(3)} / ${c.secreted.toFixed(3)} у.е. с начала.`,
   `Участков ниже учебного порога: ${m.thinPatches} / ${c.thinPatches} из 144. Событий повторного пополнения выше 75%: ${sim.counts.mucus_recover||0} / ${control.counts.mucus_recover||0}.`);
  for(const r of sim.mucus.records)observations.push(`Изменение на шаге ${r.tick}: ${r.substrate?'субстрат поступает':'приток субстрата остановлен'}, производство ×${r.secretionScale}; минимальный запас в этот момент ${(r.minInner*100).toFixed(1)}%.`);
 }
 if(sim.assay){
  const ac=assayCounts(sim),cc=assayCounts(control);
  observations.push(`Медленных клеток сейчас: ${ac.persisters} / ${cc.persisters}. Живых в линии исходных персистеров: ${ac.persisterOrigin} / ${cc.persisterOrigin}. Наследуемых R-demo: ${ac.resistant} / ${cc.resistant}.`);
  for(const r of sim.assay.rounds)observations.push(`Воздействие №${r.round}, шаг ${r.startTick}–${r.endTick??'ещё идёт'}: линия исходных персистеров ${r.start.persisterOrigin} → ${r.end?.persisterOrigin??'ждём завершения'}; R-demo ${r.start.resistant} → ${r.end?.resistant??'ждём завершения'}. Численности включают деления, это не проценты выживания.`);
 }
 if(study?.scenario==='hgt'){
  observations.push(`Событий передачи: ${sim.counts.transfer||0} / ${control.counts.transfer||0}. Дочерние клетки получателя #2 в опыте: ${sim.lineage(2)?.children.map(id=>'#'+id).join(', ')||'пока нет'}.`);
 }
 if(study?.scenario==='phage'){
  observations.push(`Индукций: ${sim.counts.induction||0} / ${control.counts.induction||0}. Лизисов: ${sim.counts.lysis||0} / ${control.counts.lysis||0}. Эти счётчики — события, не число живых клеток.`);
 }
 if(study?.scenario==='immune'){
  const e=sim.get(3),c=control.get(3);
  observations.push(`Начальная клетка #3: ${e?.alive?(e.pos[1]<0?'в ткани':'в просвете'):'линия завершилась'}; в контроле: ${c?.alive?(c.pos[1]<0?'в ткани':'в просвете'):'линия завершилась'}. Поглощений: ${sim.counts.engulf||0} / ${control.counts.engulf||0}.`);
 }
 return {title:study?.title||'Мой локальный опыт',prediction:study?study.options[session.meta.prediction]:'Прогноз не записан: свободное исследование.',
  phase:!study?'Свободный опыт':!session.meta.guided?'Свободная ветка исследования':sim.tick>=study.end?'План завершён':'Промежуточный итог — план ещё не завершён',
  observations,explanation:study?.takeaway||'Сопоставьте вмешательства, реальные события и контроль. Отсутствие различий — тоже результат; не каждый процесс присутствует в каждом сценарии.',
  prompt:study?.prompt||'Что изменилось относительно контроля? Какое событие подтверждает ваше объяснение?',
  limitation:'Это один прогон с условными параметрами и начальной расстановкой, не клинические данные. Контроль проверяет вмешательство внутри модели; не доказывает эффект у человека. Для устойчивого вывода нужны повторения с разными начальными условиями.',
  truncated:!!sim.capacityHits||sim.events.length>=12000};
}
