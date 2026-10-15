import {byId} from '../data.js';
export const LOCAL_SPECIES={...byId,immune:{id:'immune',name:'Фагоцит',latin:'Учебная клетка врождённого иммунитета',group:'Клетки хозяина',shape:'protist',color:'#e5f3ff',size:'Условный масштаб клетки хозяина',role:'Распознаёт и поглощает доступные микробы в тканевом отсеке',food:'Здесь не моделируется как микробная трофическая группа',fact:'Хемотаксис, поглощение и переваривание — упрощённые состояния. Не модель всего иммунитета.',refs:[]}};
export const LOCAL_VERSION='local-0.8.0';
export const PERSISTENCE_VERSION='local-0.7.0';
export const LEGACY_VERSION='local-0.5.0';
export function engineForScenario(scenario){return scenario==='mucus'?LOCAL_VERSION:scenario==='persistence'?PERSISTENCE_VERSION:LEGACY_VERSION;}
export function commandsFor(scenario){return scenario==='mucus'?['substrate_off','substrate_on','secretion_slow','secretion_restore']:scenario==='persistence'?['feed','challenge','washout']:['feed','antibiotic','breach','repair','induce','germinate','hypha'];}
export const LOCAL_DT=.1;
export const LOCAL_LIMITS={alive:192,ids:4096,ticks:6000,commands:256,events:12000};
export const LOCAL_SCENARIOS={mucus:'Оборот слизи: расход и обновление',community:'Связанное сообщество',hgt:'Конъюгация и наследование',t6:'T6SS: контакт и иммунность',phage:'Фаг: литический / умеренный',immune:'Барьер и фагоцитоз',cycles:'Деление, почкование, споры',persistence:'Персистенция: пережить и снова расти'};
export const EVENT_NAMES={mucus_supply:'Изменение притока',mucus_switch:'Смена источника углерода',mucus_thin:'Локальное истончение слизи',mucus_recover:'Слой снова пополняется',persistence_enter:'Переход в медленное состояние',persistence_exit:'Возвращение к росту',challenge:'Начало равномерного воздействия',washout:'Препарат удалён из среды',assay_kill:'Гибель при воздействии',birth:'Появление',division:'Деление',bud:'Почкование',branch:'Рост ветви гифы',death:'Гибель',conjugation:'Контакт для конъюгации',transfer:'Копия плазмиды передана',contact_lost:'Контакт прерван',t6:'T6SS: контактный удар',adsorption:'Адсорбция фага',injection:'Введение генома',eclipse:'Синтез компонентов',assembly:'Сборка потомства',lysis:'Лизис и выход фагов',lysogeny:'Лизогения',induction:'Индукция профага',sporulating:'Начало споруляции',spore:'Спора',germinating:'Прорастание',vegetative:'Вегетативная клетка',hypha:'Переход к гифальной форме',recruit:'Хемотаксис фагоцита',engulf:'Поглощение',digest:'Переваривание',command:'Вмешательство',limit:'Достигнут лимит'};
// These are invented experimental variants, NOT measured traits of every named taxon.
export function traits(species,variant='base'){
 const s=LOCAL_SPECIES[species];if(!s)throw new Error('Unknown local species');
 const assay=species==='coli'&&['assay-S','assay-R'].includes(variant);
 return {...(assay?{demoResistance:variant==='assay-R'}:{}),bacterium:s.group==='Бактерии',fungus:s.group==='Грибы',virus:species==='phage',immune:species==='immune',
  donor:species==='coli'&&variant==='donor',compatibility:species==='coli'&&!assay?'F-demo':null,
  receptor:species==='coli'&&variant!=='receptor-negative'?'R-demo':null,
  t6:species==='bact'&&variant==='t6'?'E-demo':null,immunity:variant==='t6'||variant==='immune-E'?'E-demo':null,
  phageType:variant==='temperate'?'temperate':'lytic',spore:species==='cdiff',motile:!!s.flagellum};
}
export const LOCAL_ACTION_NAMES={substrate_off:'остановить приток пищевого субстрата',substrate_on:'вернуть приток пищевого субстрата',secretion_slow:'снизить производство слизи',secretion_restore:'вернуть производство слизи',challenge:'одинаковое воздействие во всём участке',washout:'удаление препарата',feed:'субстрат',antibiotic:'антибиотический импульс',breach:'открытие барьера',repair:'закрытие барьера',induce:'индукция профага',germinate:'сигнал прорастания',hypha:'сигнал гифальной формы'};
export const LOCAL_VARIANT_NAMES={'mucin-switch':'учебный переключатель субстратов','outer-forager':'учебный потребитель наружных гликанов','assay-S':'чувствительный S-demo','assay-R':'наследуемый R-demo (не плазмида)',base:'исходный',donor:'донор pDemoR',t6:'аппарат T6SS / E-demo','immune-E':'защита от E-demo','receptor-negative':'нет рецептора R-demo',temperate:'умеренный фаг',lytic:'литический фаг'};
export const LOCAL_STATE_NAMES={persister:'Ⅱ медленное обратимое состояние',vegetative:'активная клетка',free:'свободный фаг',dead:'погибла',divided:'разделилась',adsorbed:'связался с хозяином',spore:'спора',sporulating:'споруляция',germinating:'прорастание',budding:'почкование',hypha:'гифальная форма',resting:'покой',recruited:'хемотаксис',engulfing:'поглощение',digesting:'переваривание'};
export const LOCAL_CAUSE_NAMES={antibiotic:'антибиотический импульс',starvation:'истощение',T6SS:'T6SS','phage-lysis':'лизис фагом',phagocytosis:'фагоцитоз','spore-decay':'утрата жизнеспособности споры','virion-decay':'распад вирусной частицы'};
