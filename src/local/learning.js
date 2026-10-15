import {LOOP_TRIALS,loopPlan} from '../physiology/axis-loop.js';
import {PULSE_TRIALS,pulsePlan} from './pulse-relay.js';
import {CONTACT_TRIALS,contactPlan} from './contact-study.js';
import {AXIS_TRIALS,axisPlan} from '../physiology/gut-brain.js';
import {COMPETITION_TRIALS,competitionPlan} from './competition.js';
import {ORAL_TRIALS,oralPlan} from './oral.js';
import {LOCAL_SPECIES,EVENT_NAMES,LOCAL_CAUSE_NAMES} from './traits.js';
import {assayCounts} from './persistence.js';
import {exportReplay} from './replay.js';

// Teaching plans issue the same public commands as free play. No scripted outcomes.
export const STUDIES={
 axisLoop:{title:'Три пути к мозгу — один обратный контур',scenario:'axisLoop',end:1400,metric:'loopNTS',
 question:'Можно ли прервать один путь, сохранив другие, и изменит ли обратный сигнал будущую доставку пищи?',
 options:['Все пути — один общий сигнал, различий не будет','Пути различаются; моторная обратная связь меняет дальнейший приток','Ацетат в крови уже показывает настроение'],
 setup:'A и B: одинаковая функциональная микробная группа и два входа по 12 ммоль C на шагах 10 и 500. В B меняем только выбранное звено. Пропионат связан с нервным входом, ацетат отдельно переносится через кровь и ГЭБ, микробный маркер запускает периферический иммунный сигнал. Тормозящий моторный выход изменяет скорость желудочного опорожнения. Все коэффициенты учебные. В варианте спасения на шаге 250 дополнительно вносятся 6 ммоль C готовых SCFA: это отдельный внешний вход, а не равная общая доза.',
 plan:loopPlan(),prompt:'Что сохранилось перед выключенным звеном и что изменилось после него? Сравните кровь и мозг при блоке ГЭБ. Затем разомкните моторный выход: изменилась ли доставка субстрата, а не только яркость стрелки?',
 takeaway:'Три ветви имеют разные измеряемые выходы: NTS, мозговой пул/использование ацетата и EP3-связанную иммунную мишень. Они не складываются в здоровье мозга. Нервный путь передаёт информацию, гуморальный — вещество, иммунный — сигнал через эндотелий. Только выбранная нервно-моторная ветвь замыкает управление желудочным выходом. Сведение FFAR3-входа и торможения опорожнения в один контур — явное учебное допущение: литература не задаёт нам его знак и численное усиление. Выключенная ферментация не означает стерильность: микробный маркер может сохраняться.'},
 pulseRelay:{title:'От выбранной еды до кислорода',scenario:'pulseRelay',end:1000,metric:'relayOxygen',
 question:'Если прервать одно звено эстафеты, останется ли кислородный ответ прежним?',options:['Да: сама еда мгновенно задаёт кислород','Нет: важны превращения и использование продукта тканью','Весь эффект можно приписать любой выбранной молекуле'],
 setup:'A и B получают два одинаковых импульса по 8 у.е. C на шагах 10 и 300. Метка каждого входа сохраняется при смешении, росте, превращениях и выносе. В B до шага 500 выключаем выбранное звено, A не меняем. Ткань получает бутират и при его окислении расходует кислород; поступление, перенос в просвет и вынос O₂ учитываются отдельно. Это усреднённые пулы и условные коэффициенты, не полная биохимия колоноцита.',
 plan:pulsePlan(),prompt:'Где задержался углерод выбранного импульса? Почему наличие бутирата в ткани не гарантирует расход O₂? Почему общий кислородный сдвиг нельзя сложить из «эффектов» двух импульсов?',
 takeaway:'Субстрат поддерживает образование ацетата, затем бутирата. При доступных субстрате и O₂ ткань расходует оба; меньше O₂ остаётся для переноса в просвет. Метка считает происхождение углерода, включая биомассу и вынос. Расход O₂, связанный с окислением меченой доли, — учёт конкретного потока; общий сдвиг запаса O₂ является совместным нелинейным ответом и не принадлежит одному импульсу. Восстановление звена не перемещает накопленные вещества мгновенно.'},
 contact:{title:'Что изменится, если прервать контакт?',scenario:'contact',end:130,metric:'contactRecipient',
 question:'Что произойдёт с передачей pDemoR, если разнести донор и получатель?',options:['Любой разрыв удаляет все копии плазмиды','Ранний разрыв остановит незавершённую передачу; поздний не удалит полученную копию','Клетки закончат передачу на расстоянии по таймеру'],
 setup:'Две совместимые клетки удерживаются в заданных позициях. Начальное расстояние 1; передаче нужны расстояние ≤1.5 и 30 непрерывных шагов контакта. В A пару не трогаем. В B можно разорвать связь раньше или позже, вернуть близость либо переместить пару вместе. В этом изолированном опыте нет роста, деления, случайного движения и гибели: меняем расстояние, не питание.',
 plan:contactPlan(),prompt:'Почему после возврата нужен новый полный контакт? Чем поздний разрыв отличается от раннего? Что проверяет перемещение обеих клеток вместе?',
 takeaway:'Контакт запускает процесс, но ещё не означает полученную копию. Незавершённая передача отменяется при потере близости; новый контакт начинает свой отсчёт. Разрыв после завершения не удаляет уже полученную плазмиду, донор сохраняет свою. Контрольное перемещение пары проверяет относительное расстояние, а не сам факт движения. Порог и длительность учебные; это один механизм конъюгации, не правило для всех обменов между клетками.'},
 gutbrain:{title:'Кишечник сообщает — мозг получает сигнал',scenario:'gutbrain',end:1000,metric:'axisNTS',
 question:'Поступление глюкозы в кровь и передача сигнала от кишечника — одно и то же?',options:['Да: вещество в крови уже является нервным сигналом','Нет: нервный путь можно прервать отдельно от всасывания','По этому опыту можно определить настроение человека'],
 setup:'Отдельный путь добавленной глюкозы: 1 ммоль на шагах 10 и 600 в A и B. В B можно прервать синаптическую или вагальную передачу до шага 450, либо направить те же импульсы сразу в кровь. A получает глюкозу через желудочный резерв и сохраняет передачу. Мишень — вызванная активность NTS, ядра одиночного пути ствола мозга. Нормированная модельная активность, не измеренная частота импульсов. Это нутриентный путь, не доказательство действия микробиома.',
 plan:axisPlan(),prompt:'Почему при блокаде в крови есть глюкоза, но вызванный ответ слабее? После восстановления передачи вернулся ли ответ на второй импульс?',
 takeaway:'Сенсорное звено в кишечном эпителии реагирует на глюкозу; глутаматная передача возбуждает вагальный афферент. По нерву идёт сигнал, а не глюкоза или серотонин. Стволовая мишень получает задержанный вход. Здесь вычислены только этот учебный путь и параллельный перенос добавленной глюкозы. Прямое поступление в кровь не активирует выбранный кишечный сенсор, но в настоящем организме существуют и другие сенсоры. Нет настроения, диагноза, полного мозга или микробного причинного звена.'},
 competition:{title:'Защита без войны',scenario:'competition',end:1600,metric:'newcomer',
 question:'Можно ли ограничить новичка, не нападая на него?',options:['Нет: защита возможна только через уничтожение','Да: соседи могут раньше использовать общий ресурс','Любая добавленная группа поможет одинаково'],
 setup:'A и B получают одинаковую небольшую группу новичка на шаге 30. Он использует R, как и часть жителей. В B на шаге 300 полностью выводим потребителей R — потерю функции задаём как внешний вынос, не антибиотик. На шаге 900 возвращаем выбранную функцию. Есть варианты без возврата и без нарушения. Q — другой ресурс. Все количества — условные эквиваленты углерода; фигурки — группы, не клетки.',
 plan:competitionPlan(),prompt:'После потери потребителей сначала изменился R или биомасса новичка? Почему равная добавка потребителей Q не заменяет потребителей R?',
 takeaway:'Здесь нет атак, токсинов или уничтожения новичка. Жители с большим сродством к R оставляют мало доступного ресурса: прирост новичка не покрывает поддержание и вымывание. Потеря функции освобождает нишу. Возврат именно потребления R ограничивает рост; потребление Q не является его заменой. Это функциональная конкуренция в учебной модели, не рекомендация пробиотика или лечения.'},
 transport:{title:'Одна еда — разные пути и задержки',scenario:'transport',end:1200,metric:'bloodD',
 question:'Если замедлить выход из желудка, тот же пищевой импульс появится в крови в тот же момент?',options:['Да: все отсеки заполнятся мгновенно','Нет: профиль изменят перенос, всасывание и использование','Появление вещества в крови доказывает его действие на мозг'],
 setup:'В A и B одинаковый импульс D/R/Q на шаге 10. Только в B выход из желудочного резерва медленнее в пять раз. D всасывается в тонкокишечном отсеке; остаток попадает в общий колонический ресурс R. R и Q кормят разные группы; продукт M может всасываться. Все отсеки принадлежат одному расчёту. D, R, Q и M — условные пулы, не названия реальных молекул.',
 plan:[{tick:0,kind:'transit_slow',pos:[0,3,0]}],prompt:'Почему пик D в крови запаздывает и уменьшается? Куда ушёл материал, которого уже нет в просвете? Можно ли из этого заключить что-либо о настроении?',
 takeaway:'Поступление в желудок не равно появлению в крови. Материал удерживается в отсеках, часть всасывается, часть используется печёночным отсеком, часть достигает системной крови и затем используется или выводится. Карта показывает запасы, реестр — накопленные переносы. Этап 1 не рассчитывает мозг, ГЭБ, нервные сигналы или настроение.'},
 oral:{title:'Что остаётся после чистки?',scenario:'oral',end:2400,metric:'oralPH',
  question:'Чистка, вода и разные ополаскиватели делают с налётом и эмалью одно и то же?',
  options:['Да: любой уход мгновенно удаляет налёт и чинит эмаль','Нет: удаление налёта, кислотность и минеральный баланс — разные процессы','Микробов нужно уничтожить полностью'],
  setup:'Два одинаковых участка зубной поверхности с небольшим налётом и подготовленной ранней потерей минералов. Одинаковые сахарные импульсы идут с шага 30 каждые 120 шагов. A остаётся без ухода; B получает выбранное вмешательство с шага 360. Чистка здесь только механическая, фтор показан отдельно. Шаги не равны дням; это не сравнение эффективности реальных средств.',
  plan:oralPlan('brush_regular'),
  prompt:'Удалился ли прикреплённый налёт? Изменился ли pH сразу или позже? Почему улучшение минерального запаса не означает восстановления уже утраченной формы зуба?',
  takeaway:'Без механического удаления налёт может накапливаться, а повторные сахара поддерживают кислые фазы. Слюна смывает растворённые вещества, нейтрализует кислоту и приносит минералы. Чистка снимает часть налёта, но не стерилизует рот и не чинит эмаль мгновенно. Вода меняет растворённую среду; фтор меняет баланс потери и возврата минералов; антисептик временно снижает активность, не удаляя весь каркас. Полоскания не заменяют чистку. Ранняя деминерализация и полость — не одно и то же.'},
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
 loopNTS:{name:'NTS · нервный ответ',unit:'норм. 0–1',continuous:true},
 loopBlood:{name:'Ацетат · системная кровь',unit:'мМ модели',continuous:true},
 loopBrain:{name:'Ацетат · мозговой пул',unit:'мМ модели',continuous:true},
 loopExposure:{name:'Ацетат · мозговая экспозиция',unit:'мМ × уч. время',continuous:true},
 loopBrainUsed:{name:'Ацетат · использовано в мозговом отсеке',unit:'ммоль ацетата',continuous:true},
 loopCytokines:{name:'Периферический цитокиновый сигнал',unit:'норм. 0–1',continuous:true},
 loopEP3:{name:'Иммунная EP3-связанная мишень',unit:'норм. 0–1',continuous:true},
 loopMotor:{name:'Тормозящий моторный выход',unit:'норм. 0–1',continuous:true},
 loopEmptying:{name:'Множитель желудочного выхода',unit:'доля базовой скорости',continuous:true},
 loopStomach:{name:'Пища · желудочный резерв',unit:'ммоль C',continuous:true},
 loopDelivered:{name:'Доставлено колоническому отсеку',unit:'ммоль C накопительно',continuous:true},
 loopSource:{name:'Ферментировано микробами',unit:'ммоль C накопительно',continuous:true},
 relayOxygen:{name:'Эстафета · O₂ в просвете',unit:'у.е. O₂',continuous:true},relayTissueOxygen:{name:'Эстафета · O₂ в ткани',unit:'у.е. O₂',continuous:true},relayOxygenUsed:{name:'Эстафета · израсходовано O₂ с начала',unit:'у.е. O₂',continuous:true},relayButyrate:{name:'Эстафета · бутират в ткани',unit:'у.е. C',continuous:true},relaySelectedUsed:{name:'Выбранный импульс · окислено тканью с начала',unit:'у.е. C',continuous:true},relaySelectedOxygen:{name:'Выбранный импульс · связанный расход O₂',unit:'у.е. O₂',continuous:true},
 contactRecipient:{name:'Контакт · копия у получателя',unit:'0 нет / 1 есть'},contactDistance:{name:'Контакт · расстояние',unit:'уч. расстояние',continuous:true},contactProgress:{name:'Контакт · выполнено шагов текущей попытки',unit:'из 30'},axisNTS:{name:'Ось · вызванная активность NTS',unit:'норм. активность 0–1',continuous:true},axisVagus:{name:'Ось · вагальный афферент',unit:'норм. активность 0–1',continuous:true},axisBlood:{name:'Ось · добавленная глюкоза в крови',unit:'мМ модели',continuous:true},axisLumen:{name:'Ось · глюкоза в кишечном отсеке',unit:'мМ модели',continuous:true},
 newcomer:{name:'Конкуренция · биомасса новичка',unit:'у.е. C',continuous:true},
 resident:{name:'Конкуренция · биомасса потребителей R',unit:'у.е. C',continuous:true},
 resourceR:{name:'Конкуренция · доступный ресурс R',unit:'у.е. C',continuous:true},
 bloodD:{name:'Перенос · D в системной крови',unit:'у.е. C, не концентрация',continuous:true},
 bloodM:{name:'Перенос · M в системной крови',unit:'у.е. C, не концентрация',continuous:true},
 stomach:{name:'Перенос · запас в желудочном резерве',unit:'у.е. C',continuous:true},
 oralPH:{name:'Зуб · минимальный pH в налёте',unit:'pH модели',continuous:true},
 oralPlaque:{name:'Зуб · прикреплённый налёт',unit:'у.е.'},
 oralActive:{name:'Зуб · активная биомасса',unit:'у.е.'},
 oralMineral:{name:'Зуб · средний минеральный запас',unit:'% модельного максимума',continuous:true},
 oralDefects:{name:'Зуб · участки структурного дефекта',unit:'из 36'},
 oralAcidTime:{name:'Зуб · время кислых фаз с начала',unit:'уч. ед.',continuous:true},
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
export function studyFor(meta){
 const s=meta.study&&STUDIES[meta.study];
 if(meta.study==='axisLoop'){const trial=meta.loopTrial??'intact';if(!Object.hasOwn(LOOP_TRIALS,trial))throw new Error('Неизвестный контроль контура');return {...s,plan:loopPlan(trial),title:s.title+' · '+LOOP_TRIALS[trial].name};}
 if(meta.study==='pulseRelay'){const trial=meta.relayTrial??'consumer';if(!Object.hasOwn(PULSE_TRIALS,trial))throw new Error('Неизвестный вариант эстафеты');return {...s,plan:pulsePlan(trial),title:s.title+' · '+PULSE_TRIALS[trial].name};}
 if(meta.study==='contact'){const trial=meta.contactTrial??'early';if(!Object.hasOwn(CONTACT_TRIALS,trial))throw new Error('Неизвестный вариант контакта');return {...s,plan:contactPlan(trial),title:s.title+' · '+CONTACT_TRIALS[trial].name};}
 if(meta.study==='gutbrain'){const trial=meta.axisTrial??'synapse';if(!Object.hasOwn(AXIS_TRIALS,trial))throw new Error('Неизвестный контроль оси');return {...s,plan:axisPlan(trial),title:s.title+' · '+AXIS_TRIALS[trial].name};}
 if(meta.study==='competition'){const trial=meta.competitionTrial??'function';if(!Object.hasOwn(COMPETITION_TRIALS,trial))throw new Error('Неизвестный вариант восстановления');return {...s,plan:competitionPlan(trial),title:s.title+' · '+COMPETITION_TRIALS[trial].name};}
 if(meta.study!=='oral')return s;
 const trial=meta.oralTrial??'brush_regular';if(!Object.hasOwn(ORAL_TRIALS,trial))throw new Error('Неизвестный вариант ухода');
 return {...s,plan:oralPlan(trial),title:s.title+' · '+ORAL_TRIALS[trial].name};
}
export function learningMeta(data,record){
 if(data===undefined)return {version:1,study:null,prediction:null,reflection:'',guided:false};
 if(!data||data.version!==1||!(data.study===null||Object.hasOwn(STUDIES,data.study))||typeof data.reflection!=='string'||data.reflection.length>600||typeof data.guided!=='boolean')throw new Error('Некорректная учебная запись');
 if(data.loopTrial!==undefined&&(data.study!=='axisLoop'||typeof data.loopTrial!=='string'||!Object.hasOwn(LOOP_TRIALS,data.loopTrial)))throw new Error('Некорректный контроль контура');
 if(data.relayTrial!==undefined&&(data.study!=='pulseRelay'||typeof data.relayTrial!=='string'||!Object.hasOwn(PULSE_TRIALS,data.relayTrial)))throw new Error('Некорректный вариант эстафеты');
 if(data.contactTrial!==undefined&&(data.study!=='contact'||typeof data.contactTrial!=='string'||!Object.hasOwn(CONTACT_TRIALS,data.contactTrial)))throw new Error('Некорректный вариант контакта');
 if(data.relayPulse!==undefined&&(record.scenario!=='pulseRelay'||typeof data.relayPulse!=='string'||!(/^(meal-[12]|manual-[1-6])$/).test(data.relayPulse)))throw new Error('Некорректная метка импульса');
 if(data.axisTrial!==undefined&&(data.study!=='gutbrain'||!Object.hasOwn(AXIS_TRIALS,data.axisTrial)))throw new Error('Некорректный контроль оси');
 if(data.competitionTrial!==undefined&&(data.study!=='competition'||!Object.hasOwn(COMPETITION_TRIALS,data.competitionTrial)))throw new Error('Некорректный вариант восстановления');
 if(data.oralTrial!==undefined&&(data.study!=='oral'||!Object.hasOwn(ORAL_TRIALS,data.oralTrial)))throw new Error('Некорректный вариант ухода');
 const study=studyFor(data);
 if(study){
  if(record.scenario!==study.scenario||!Number.isInteger(data.prediction)||data.prediction<0||data.prediction>=study.options.length)throw new Error('Прогноз не соответствует исследованию');
  if(data.guided){
   const expected=study.plan.filter(c=>c.tick<=record.endTick);
   if(record.endTick>study.end||JSON.stringify(record.commands)!==JSON.stringify(expected))throw new Error('Команды не соответствуют учебному плану');
  }
 }else if(data.prediction!==null||data.guided)throw new Error('Некорректный свободный опыт');
 return {version:1,study:data.study,prediction:data.prediction,reflection:data.reflection,guided:data.guided,...(data.study==='axisLoop'?{loopTrial:data.loopTrial??'intact'}:{}),...(data.study==='pulseRelay'?{relayTrial:data.relayTrial??'consumer',relayPulse:data.relayPulse??'meal-1'}:data.relayPulse!==undefined?{relayPulse:data.relayPulse}:{}),...(data.study==='contact'?{contactTrial:data.contactTrial??'early'}:{}),...(data.study==='gutbrain'?{axisTrial:data.axisTrial??'synapse'}:{}),...(data.study==='competition'?{competitionTrial:data.competitionTrial??'function'}:{}),...(data.study==='oral'?{oralTrial:data.oralTrial??'brush_regular'}:{})};
}
export function measure(sim){
 const s=sim.summary(),a=assayCounts(sim);
 return {loopNTS:s.axisLoop?.nts??0,loopBlood:s.axisLoop?.acetateBlood??0,loopBrain:s.axisLoop?.acetateBrain??0,loopExposure:s.axisLoop?.exposure??0,loopBrainUsed:s.axisLoop?.brainUsed??0,loopCytokines:s.axisLoop?.cytokines??0,loopEP3:s.axisLoop?.ep3??0,loopMotor:s.axisLoop?.motor??0,loopEmptying:s.axisLoop?.emptying??0,loopStomach:s.axisLoop?.stomach??0,loopDelivered:s.axisLoop?.delivered??0,loopSource:s.axisLoop?.fermented??0,...(s.pulseRelay?{pulseOrigins:s.pulseRelay.pulses}:{}),relayOxygen:s.pulseRelay?.oxygenLumen??0,relayTissueOxygen:s.pulseRelay?.oxygenTissue??0,relayOxygenUsed:s.pulseRelay?.oxygenUsed??0,relayButyrate:s.pulseRelay?.tissue??0,relaySelectedUsed:s.pulseRelay?.pulses['meal-1']?.oxidized??0,relaySelectedOxygen:s.pulseRelay?.pulses['meal-1']?.oxygenUsed??0,contactRecipient:+(s.contact?.recipientHas??false),contactDistance:s.contact?.distance??0,contactProgress:s.contact?.elapsed??0,axisNTS:s.axis?.nts??0,axisVagus:s.axis?.afferent??0,axisBlood:s.axis?.bloodConcentration??0,axisLumen:s.axis?.lumenConcentration??0,newcomer:s.ecology?.newcomer??0,resident:s.ecology?.resident??0,resourceR:s.ecology?.r??0,bloodD:s.ecology?.transport.bloodD??0,bloodM:s.ecology?.transport.bloodM??0,stomach:s.ecology?.transport.stomach??0,oralPH:s.oral?.minPH??0,oralPlaque:s.oral?.plaque??0,oralActive:s.oral?.active??0,oralMineral:s.oral?.mineral??0,oralDefects:s.oral?.defects??0,oralAcidTime:s.oral?.acidTime??0,mucusMinimum:(s.mucus?.minInner??0)*100,mucusOuter:s.mucus?.outer??0,mucusThin:s.mucus?.thinPatches??0,mucusForagers:s.mucus?.foragers??0,mucusSecreted:s.mucus?.secreted??0,mucusConsumed:s.mucus?(s.mucus.outerUsed+s.mucus.innerUsed):0,persisters:a.persisters,persisterLine:a.persisterOrigin,sensitiveLine:a.sensitive,geneticR:a.resistant,recoveredLine:a.recoveredLine,cells:s.cells,plasmids:s.plasmids,lysogens:s.lysogens,phages:s.phages,butyrate:s.butyrate,acetate:s.acetate,
  tissueCells:sim.entities.filter(e=>e.alive&&!e.traits.immune&&!e.traits.virus&&e.pos[1]<0).length,
  tissueButyrate:sim.flux.tissueButyrate};
}
export class LearningSession {
 constructor(meta={version:1,study:null,prediction:null,reflection:'',guided:false}){this.meta={...meta,...(meta.study==='axisLoop'?{loopTrial:meta.loopTrial??'intact'}:{}),...(meta.study==='pulseRelay'?{relayTrial:meta.relayTrial??'consumer',relayPulse:meta.relayPulse??'meal-1'}:{}),...(meta.study==='contact'?{contactTrial:meta.contactTrial??'early'}:{}),...(meta.study==='gutbrain'?{axisTrial:meta.axisTrial??'synapse'}:{}),...(meta.study==='competition'?{competitionTrial:meta.competitionTrial??'function'}:{}),...(meta.study==='oral'?{oralTrial:meta.oralTrial??'brush_regular'}:{})};this.samples=[];}
 get study(){return studyFor(this.meta);}
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
 case 'relay_pulse':text=`Внесён импульс ${e.pulse}: ${e.amount} у.е. C.`;rule='Его метка переносится пропорционально фактическим потокам. Это происхождение массы в усреднённых пулах, не траектория одной молекулы.';break;
 case 'relay_condition':text='Изменена доступность звена эстафеты.';rule='Запасы не исчезают по команде. Последующие превращения и кислородный расход зависят от текущих ресурсов; контроль не меняется.';break;
 case 'relay_oxygen':text=`Запас O₂ просвета снизился до ${e.lumen.toFixed(3)} у.е.`;rule='Расход тканью изменил запас и последующий перенос O₂. Отметка 0.65 нужна для журнала, это не диагноз и не физиологическая норма.';for(const p of sim.events.filter(p=>p.seq<e.seq&&p.kind==='relay_pulse').slice(-2))link(p);link(sim.events.filter(p=>p.seq<e.seq&&p.kind==='relay_condition').at(-1));break;
 case 'contact_condition':text=`Расстояние пары теперь ${e.distance.toFixed(1)} учебной единицы.`;rule='Команда меняет позиции, не плазмиды и не жизнеспособность. Правило контакта проверит незавершённую попытку на следующем шаге.';break;
 case 'loop_meal':text=`В желудочный резерв вошло ${e.amount} ммоль C пищи.`;rule='Неперевариваемый хозяином ферментируемый субстрат постепенно проходит тонкокишечный отсек и достигает микробов. Обратный моторный сигнал меняет выход из желудка, не создаёт и не удаляет пищу.';break;
 case 'loop_condition':text='Изменено отдельное звено общего контура.';rule='Уже накопленные вещества и отправленные сигналы не обнуляются. Нервный блок может позднее изменить и материальные потоки через обратную связь: это вторичный эффект, не прямой блок всасывания.';break;
 case 'loop_rescue':text='В просвет внесены готовые ацетат и пропионат при сохранении остальных условий.';rule='Дополнительные 6 ммоль C учтены как внешний вход. Это обход микробного синтеза, не восстановление микробной группы и не равная суммарная доза с A.';break;
 case 'loop_response':text='Ветвь «'+({source:'микробный источник',neural:'NTS',humoral:'мозговой ацетат',immune:'EP3-связанная мишень',feedback:'моторная обратная связь'}[e.branch]||e.branch)+'» пересекла учебную отметку журнала.';rule='Событие вычислено из текущего состояния. Вещество, нервная активность и иммунный сигнал — разные величины; отметки не являются клиническими порогами.';limit='Тормозящее замыкание FFAR3 → NTS → моторный выход — учебная гипотеза, а не валидация всего рефлекса.';break;
 case 'axis_pulse':text=`Внесён ${e.amount} ммоль добавленной глюкозы: ${e.route==='gut'?'в желудочный резерв':'в кровь'}.`;rule='Количество, концентрация и нервный ответ — разные величины. Учтён только добавленный материал, не базальная гликемия.';break;
 case 'axis_condition':text='Изменена передача или маршрут следующего импульса.';rule='Нервные блоки не меняют перенос глюкозы. При выключении вагального входа уже отправленный сигнал ещё может дойти; остаточная активность затухает.';break;
 case 'axis_response':text='Вызванная активность стволовой мишени NTS пересекла учебную отметку 0.1.';rule='Ответ вычислен из кишечного сенсора, синаптической передачи, задержки и затухания. Отметка — для журнала, не клинический порог.';break;
 case 'axis_decay':text='Вызванная активность NTS снизилась ниже отметки 0.05.';rule='Это затухание ответа выбранного пути, не выключение мозга и не изменение настроения.';break;
 case 'competition_arrival':text='Внесена небольшая группа новичка, использующая R.';rule='Плановое внесение одинаково в A и B. Входящая биомасса учтена отдельно от прироста. Новичок не получает заранее заданную судьбу.';break;
 case 'competition_condition':text='Изменено условие опыта: '+(e.action==='remove_competitors'?'потребители R выведены во внешний резерв':e.action==='restore_competitors'?'добавлены потребители R':e.action==='restore_other'?'добавлена равная биомасса потребителей Q':'перенос или поступление материала')+'.';rule='Команда меняет условие, но не переписывает биомассу новичка. Дальше работают потребление, прирост, поддержание и вымывание.';break;
 case 'competition_growth':text='Вычисленный прирост новичка стал больше его потерь.';rule='Больше доступного R позволяет получить больше материала для роста. Нет атаки на соседей.';link(sim.events.filter(p=>p.seq<e.seq&&p.kind==='competition_condition').at(-1));break;
 case 'competition_limited':text='Прирост новичка больше не покрывает потери биомассы.';rule='Часть материала тратится на поддержание, часть вымывается. Меньше биомассы не означает, что кто-то убил клетки.';link(sim.events.filter(p=>p.seq<e.seq&&p.kind==='competition_condition').at(-1));break;
 case 'transport_meal':text='D/R/Q поступили в желудочный резерв.';rule='Это внешний вход, а не мгновенное всасывание. Следующие отсеки получают фактически перенесённые количества с задержкой.';break;
 case 'oral_sugar':text=e.manual?'В B добавлен ручной сахарный импульс.':'В оба участка по общему расписанию поступил сахарный субстрат.';rule='Кислоту производит метаболизм микроколоний. Само внесение сахара не задаёт pH и не вычитает минералы эмали.';limit='Модель углеводной нагрузки, не напитка с заданной собственной кислотностью. Эрозия пищевыми кислотами не моделируется.';break;
 case 'oral_care':text=`${e.action==='oral_brush'?'Механически снята часть налёта':'Изменены условия поверхности'}. Налёт: ${e.plaqueBefore.toFixed(3)} → ${e.plaqueAfter.toFixed(3)} у.е.`;rule=e.action==='oral_brush'?'Сняты активная биомасса, матрикс и неактивный материал. В условных углублениях удаляется меньше. Чистка не меняет минеральный запас мгновенно.':e.action==='oral_fluoride'?'Фторсодержащий вариант меняет последующие скорости растворения и реминерализации. Он не уничтожает налёт и не даёт мгновенного ремонта.':e.action==='oral_antiseptic'?'Антисептический вариант временно подавляет метаболизм и переводит часть активной биомассы в неактивный прикреплённый материал. Каркас остаётся.':e.action==='oral_water'?'Вода удаляет часть растворённых сахаров, кислот и остатков средств. Прикреплённый налёт остаётся.':'Поток слюны и повторные сахарные нагрузки меняют последующие процессы, а не мгновенно переписывают эмаль.';limit='Изолированные учебные механизмы, не состав конкретного средства и не дозировка. Ополаскиватели — не замена щётке и межзубной гигиене.';break;
 case 'oral_acid':text=`Минимальный pH налёта снизился до ${e.ph.toFixed(2)}.`;rule='Производство и удержание кислоты превысили нейтрализацию и вынос. При низком pH модель переводит минерал эмали в растворённый пул.';limit='Порог 5.5 здесь выбран для опыта; в реальности он зависит от состава среды и не является универсальной границей кариеса.';break;
 case 'oral_buffer':text=`Минимальный pH поднялся до ${e.ph.toFixed(2)}.`;rule='Буфер и вынос слюной теперь успевают уменьшать кислотную нагрузку. Благоприятная среда позволяет части растворённых минералов возвращаться в ранний дефект.';limit='Нейтральный pH не доказывает отсутствие налёта и не означает мгновенное восстановление зуба.';break;
 case 'oral_defect':text=`В участке ${e.patch+1} возник учебный структурный дефект.`;rule='Длительная вычисленная потеря минералов пересекла условный порог. Верхняя граница восстановления формы снизилась и уже не растёт от чистки или полоскания.';limit='Это не диагностика полости, не клинический порог и не срок до кариеса. Сформированная полость требует стоматологической оценки.';break;
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
 const kinds=['loop_meal','loop_condition','loop_rescue','loop_response','relay_pulse','relay_condition','relay_oxygen','contact_condition','contact_lost','conjugation','axis_pulse','axis_condition','axis_response','axis_decay','competition_arrival','competition_condition','competition_growth','competition_limited','transport_meal','oral_sugar','oral_care','oral_acid','oral_buffer','oral_defect','mucus_supply','mucus_switch','mucus_thin','mucus_recover','persistence_enter','persistence_exit','challenge','washout','transfer','division','lysogeny','induction','lysis','engulf','digest','t6'];
 const result=[];
 for(const kind of kinds){const e=sim.events.find(e=>e.kind===kind);if(e)result.push(e);}
 for(const e of sim.events)if(['loop_meal','loop_condition','loop_rescue','loop_response','relay_pulse','relay_condition','contact_condition','conjugation','contact_lost','axis_condition','axis_pulse','competition_condition','mucus_supply','challenge','washout'].includes(e.kind)&&!result.includes(e))result.push(e);
 return result.sort((a,b)=>a.seq-b.seq);
}
export function report(sim,control,session){
 const a=measure(control),b=measure(sim),study=session.study;
 const observations=[`Сейчас t = ${sim.time.toFixed(1)} учебных единиц; контроль на том же шаге ${control.tick}.`,
  `Живых микробных клеток: ${b.cells} в опыте / ${a.cells} в контроле. Носителей pDemoR: ${b.plasmids} / ${a.plasmids}.`,
  `Лизогенов: ${b.lysogens} / ${a.lysogens}. Микробов в ткани: ${b.tissueCells} / ${a.tissueCells}.`,
  `Бутирата в среде: ${b.butyrate.toFixed(4)} / ${a.butyrate.toFixed(4)} у.е. Использовано тканью с начала: ${b.tissueButyrate.toFixed(4)} / ${a.tissueButyrate.toFixed(4)} у.е.`];
 if(sim.axisLoop){const a=control.summary().axisLoop,b=sim.summary().axisLoop;observations.splice(1);observations.push(
  `NTS B / A: ${b.nts.toFixed(4)} / ${a.nts.toFixed(4)} норм.; мозговой ацетат ${b.acetateBrain.toFixed(4)} / ${a.acetateBrain.toFixed(4)} мМ; EP3 ${b.ep3.toFixed(4)} / ${a.ep3.toFixed(4)} норм.`,
  `Ацетат крови B / A: ${b.acetateBlood.toFixed(4)} / ${a.acetateBlood.toFixed(4)} мМ; мозговое использование ${b.brainUsed.toFixed(4)} / ${a.brainUsed.toFixed(4)} ммоль ацетата. Это не настроение.`,
  `Множитель желудочного выхода B / A: ${b.emptying.toFixed(4)} / ${a.emptying.toFixed(4)}; доставлено в колонический отсек ${b.delivered.toFixed(4)} / ${a.delivered.toFixed(4)} ммоль C.`,
  `Внешний вход B / A: ${b.input} / ${a.input} ммоль C. Ошибки B: углерод ${b.carbonError.toExponential(2)} ммоль C, TLR4-маркер ${b.markerError.toExponential(2)} ед. активности. Ни маркер, ни нормированные сигналы не прибавляются к углероду.`);}
 if(sim.pulseRelay){const b=sim.summary().pulseRelay,a=control.summary().pulseRelay,id=session.meta.relayPulse??'meal-1',p=b.pulses[id];observations.splice(1);observations.push(`O₂ просвета B / A: ${b.oxygenLumen.toFixed(4)} / ${a.oxygenLumen.toFixed(4)} у.е.; весь расход O₂: ${b.oxygenUsed.toFixed(4)} / ${a.oxygenUsed.toFixed(4)}.`,p?`Выбран ${id}, вход ${p.input} у.е. C: окислено тканью ${p.oxidized.toFixed(4)}, связанный расход O₂ ${p.oxygenUsed.toFixed(4)}; ошибка метки ${p.error.toExponential(2)}.`:`Выбран ${id}, но его ещё не вносили.`,`Общий баланс C: ${sim.summary().carbonError.toExponential(2)}, отдельный баланс O₂: ${b.oxygenError.toExponential(2)}. Сдвиг O₂ не раскладывается здесь на причинные эффекты импульсов.`);}
 if(sim.contactStudy){const b=sim.summary().contact,a=control.summary().contact;observations.splice(1);observations.push(`Расстояние B / A: ${b.distance} / ${a.distance}. Копия у получателя B / A: ${b.recipientHas?'есть':'нет'} / ${a.recipientHas?'есть':'нет'}.`,`Прерванных попыток B / A: ${b.interruptions} / ${a.interruptions}. Передач: ${b.transfers} / ${a.transfers}. Донор сохраняет копию: ${b.donorHas?'да':'нет'}.`,`Передачи в B на шагах: ${sim.events.filter(e=>e.kind==='transfer').map(e=>e.tick).join(', ')||'не было'}; A: ${control.events.filter(e=>e.kind==='transfer').map(e=>e.tick).join(', ')||'не было'}. Движок проверяет расстояние; движение без изменения расстояния не разрывает связь.`);}
 if(sim.axis){const b=sim.summary().axis,a=control.summary().axis;observations.splice(1);observations.push(`Глюкоза в крови B / A: ${b.bloodConcentration.toFixed(4)} / ${a.bloodConcentration.toFixed(4)} мМ добавленного материала.`, `NTS B / A: ${b.nts.toFixed(4)} / ${a.nts.toFixed(4)} нормированной вызванной активности; площадь ответа ${b.ntsArea.toFixed(3)} / ${a.ntsArea.toFixed(3)}.`, `Ошибка баланса глюкозы ${b.error.toExponential(2)} ммоль. Нутриентный путь; влияние состава микробиома и настроение не вычисляются.`);}
 if(sim.ecology){
  const e=sim.summary().ecology,c=control.summary().ecology;observations.splice(1);
  observations.push(`Новичок B / A: ${e.newcomer.toFixed(4)} / ${c.newcomer.toFixed(4)} у.е. C. Потребители R: ${e.resident.toFixed(4)} / ${c.resident.toFixed(4)}. Доступный R: ${e.r.toFixed(4)} / ${c.r.toFixed(4)}.`,
   `Новичок с начала B: потребил R ${e.usedByNewcomer.toFixed(4)}; вымыто ${e.washedNewcomer.toFixed(4)}; поддержание ${e.maintenanceNewcomer.toFixed(4)} у.е. C. Это группы, не индивидуальные клетки.`,
   `В крови B / A: D ${e.transport.bloodD.toFixed(4)} / ${c.transport.bloodD.toFixed(4)}; M ${e.transport.bloodM.toFixed(4)} / ${c.transport.bloodM.toFixed(4)} у.е. C, не концентрация.`,
   `Ошибка общего баланса B: ${sim.summary().carbonError.toExponential(2)}. Мозг и нейросигналы не рассчитываются.`);
 }
 if(sim.oral){
  const o=sim.summary().oral,c=control.summary().oral;observations.splice(1);
  observations.push(`Налёт B / A: ${o.plaque.toFixed(3)} / ${c.plaque.toFixed(3)} у.е.; активная биомасса ${o.active.toFixed(3)} / ${c.active.toFixed(3)}.`,
   `Минимальный pH: ${o.minPH.toFixed(2)} / ${c.minPH.toFixed(2)}. Средний минеральный запас: ${o.mineral.toFixed(1)}% / ${c.mineral.toFixed(1)}% модельного максимума, не процент здоровья.`,
   `Участков структурного дефекта: ${o.defects} / ${c.defects} из 36. Время кислых фаз: ${o.acidTime.toFixed(1)} / ${c.acidTime.toFixed(1)} учебных единиц, не дней.`,
   `Баланс C: ${sim.summary().carbonError.toExponential(1)}; баланс минералов: ${o.mineralError.toExponential(1)}. Опыт не моделирует зубной камень, дёсны и все виды бактерий.`);
 }
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
