import {LOCAL_SPECIES,EVENT_NAMES,LOCAL_CAUSE_NAMES} from './traits.js';
import {exportReplay} from './replay.js';

// Teaching plans issue the same public commands as free play. No scripted outcomes.
export const STUDIES={
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
 const s=sim.summary();
 return {cells:s.cells,plasmids:s.plasmids,lysogens:s.lysogens,phages:s.phages,butyrate:s.butyrate,acetate:s.acetate,
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
 const kinds=['transfer','division','lysogeny','induction','lysis','engulf','digest','t6'];
 const result=[];
 for(const kind of kinds){const e=sim.events.find(e=>e.kind===kind);if(e)result.push(e);}
 return result.sort((a,b)=>a.seq-b.seq);
}
export function report(sim,control,session){
 const a=measure(control),b=measure(sim),study=session.study;
 const observations=[`Сейчас t = ${sim.time.toFixed(1)} учебных единиц; контроль на том же шаге ${control.tick}.`,
  `Живых микробных клеток: ${b.cells} в опыте / ${a.cells} в контроле. Носителей pDemoR: ${b.plasmids} / ${a.plasmids}.`,
  `Лизогенов: ${b.lysogens} / ${a.lysogens}. Микробов в ткани: ${b.tissueCells} / ${a.tissueCells}.`,
  `Бутирата в среде: ${b.butyrate.toFixed(4)} / ${a.butyrate.toFixed(4)} у.е. Использовано тканью с начала: ${b.tissueButyrate.toFixed(4)} / ${a.tissueButyrate.toFixed(4)} у.е.`];
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
