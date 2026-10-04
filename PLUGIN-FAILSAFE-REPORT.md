# Отчёт: пропажа карточек плагинов и fail-safe схема dsh-agents-board

Файл-справка из проекта dsh-agents-board. Раздел 1 — описание проблемы, которое
можно переслать в другие диалоги (для починки соседних плагинов). Раздел 2 —
как устроено самостоятельное отключение плагина при поломке.

---

## 1. Проблема: вкладка Settings → Plugins пустая (React #130)

### Симптомы
- В Settings → Plugins не отображается НИ ОДНА карточка плагина
  (ни свой, ни соседние плагины).
- В консоли браузера повторяется пара ошибок:
  - `Error: Minified React error #130; ...args[]=undefined`
    (https://reactjs.org/docs/error-decoder.html?invariant=130&args[]=undefined)
  - `slot entry crashed in 'settings.plugin.item': Error: Minified React error #130`
    (печатает граница ошибки слота, `ui-renderer/src/client/scoped-slots.tsx`).
- Сервер при этом полностью здоров (проверено прямыми замерами):
  - `POST /api/settings/describe` возвращает все 18 namespace'ов, включая
    все плагинные;
  - boot-граф индекса содержит модули всех плагинов
    (`dsh-agents-board/client.js`, `dsh-text-reader/client.js`, …);
  - все 18 schema-конвертов реазинируются `new Schema(json)` из
    `vendor/schemastery` без единой ошибки.

### Причина
Компонент `Switch` **удалён** из пакета
`@deepseek-ai/dsh-client-ui-primitives` (в текущем чекауте экспорта `Switch`
нет: есть StateDot, иконки, DisclosureRow и пр.).

Бандлы плагинов, собранные раньше, деструктурируют его при загрузке:

```js
const { StateDot, Switch, IconCloseOutline16 } = primitives;   // Switch === undefined
```

Дальше карточка настроек делает `react.createElement(Switch, …)` →
React #130 «Element type is invalid… got: undefined» → граница ошибки
(SlotErrorBoundary) гасит конкретный entry слота. Так как `Switch` использовали
ВСЕ плагинные карточки, вкладка опустела целиком. Панели/кнопки/оверлеи, не
использующие Switch, продолжают работать — этим симптом и отличается.

### Поражённые плагины (проверено grep'ом по установленным копиям)
- `dsh-agents-board` (2 использования createElement(Switch))
- `dsh-text-reader` (9 упоминаний Switch)
- `dsh-background` (7)
- `dsh-workspace-folders` (2)

### Диагностика (как проверить у себя)
```powershell
Select-String -Path "$env:USERPROFILE\.dsh\plugins\<plugin>\client.js" -Pattern 'createElement\(Switch|Switch,'
Select-String -Path "packages\client\ui-primitives\src\index.ts" -Pattern 'Switch'   # → пусто
```
Браузер: F12 → Console → Ctrl+F5 → красные `Minified React error #130`
и `slot entry crashed in 'settings.plugin.item'`.

### Фикс (эталон — dsh-agents-board v1.24.4)
Убрать `Switch` из деструктуры и определить переключатель локально в бандле
(самодостаточный компонент + свои стили в токенах `--dsw-*`):

```js
const { StateDot, IconCloseOutline16 } = primitives;   // без Switch

function Switch(props) {
  return react.createElement("button", {
    type: "button", role: "switch",
    className: "aboard-switch",
    "aria-checked": props.checked === true,
    "aria-label": props.label,
    disabled: props.disabled === true,
    onClick: () => { if (props.disabled !== true) props.onChange(!(props.checked === true)); }
  });
}
```

Правило на будущее: **плагин не имеет права падать из-за примитива харнесса** —
либо самодостаточный компонент, либо `typeof primitives.Switch === "function"
? primitives.Switch : LocalFallback`.

---

## 1а. Сопутствующая гонка монтирования (консоль сервера)

Симптом: при загрузке сервера
`cannot get property "settings" without inject` (и то же для `webServer`).

Причина: ветка `if (ctx.get('settings') !== undefined) registerSection(ctx)`
гонит провайдера сервиса. `ctx.get()` читает глобальный реестр impl'ов (видит
сервис из соседней подветки дерева), а чтение свойства `ctx.settings` разрешено
только по inject-цепочке волокна — отсюда бросок.

Фикс: **всегда** монтировать через вотчер — `ctx.inject(['settings'], cb)`:
он и дожидается сервиса, и декларирует его на дочернем волокне, так что
чтение свойства легально при любом порядке загрузки. Повторные прогоны
вотчера после перезагрузки сервиса дают `settings namespace ... is already
registered` / `webserver: duplicate prefix route ...` — это УСПЕХ (первый
прогон уже зарегистрировал), такие ошибки распознаются по сообщению и глотаются.

---

## 2. Как плагин самостоятельно отключается при поломке (fail-safe)

Семантика харнесса — fail-loud: упавший entry при загрузке откатывает всю
транзакционную группу → `boot()` уничтожает контекст → **сервер мёртв**; на
клиенте `assertEntriesActive` бросает → `page.fail()` → **GUI не монтируется**.
Поэтому изоляция обязана жить ВНУТРИ плагина. Схема dsh-agents-board:

### Host (host.mjs)
1. Всё тело `apply` в `try/catch` — падение apply не выходит наружу.
2. Каждая регистрация — отдельная функция с собственным catch:
   секция настроек (`registerSection`), роуты (`registerRoutes`). Любая поломка
   = строка в консоли `agents-board: ... failed; the board starts without it.`
   и сервер живёт без этой части.
3. Только реактивное монтирование: `ctx.inject(['settings'], registerSection)`,
   `ctx.inject(['webServer'], registerRoutes)` — никаких прямых `ctx.get`-проб,
   гонки провайдера не приводят к падению apply.
4. Идемпотентность: `already registered` / `duplicate prefix route` =
   успех (тихий пропуск), реальные ошибки логируются.
5. Побочные эффекты — только через `ctx.effect(...)` (роуты), чтобы stop/update
   корректно их снимал.

### Client (client.js)
1. Обёртка: `function apply(ctx) { try { return applyBoard(ctx) } catch (e) { console.error("agents-board: client startup failed; the board stays off.", e) } }`
   — упавший клиентский модуль не срывает активацию entry (иначе page.fail),
   доска просто остаётся выключенной.
2. Каждая регистрация слота — через `safeSlot(slot, maker)`:
   `ctx.slots.inject(slot, () => { try { return maker() } catch (e) { console.error("agents-board: slot registration failed (" + slot + "); the board starts without it.", e) } })`
   — падение одного слота не убивает остальные три.
3. В компонентах — защитные чтения (`board.value ? ... : дефолт`,
   `typeof props.useSessionPendingInteraction === "function" ? ... : null`),
   чтобы изменение API харнесса деградировало фичу, а не роняло рендер.

### Итог
Поломка любой части плагина деградирует ТОЛЬКО эту часть (нет карточки / нет
звука / нет панели), сервер и GUI работают, в консоли — точное сообщение
с причиной. Харнесс остаётся нетронутым; никакие правки самого харнесса
не требуются и не допустимы.

### Установка на пустой harness (самодостаточность)
> Историческая справка: здесь описана до-бандловая схема (rc.1, v1.24.5) —
> копия в `%DSH_HOME%\plugins` и управляемый ряд в патче. Актуальная схема —
> раздел 4: официальный `dsh plugin add` tarball'а, копия живёт в
> `profiles\web\node_modules`, легаси-следы установщик зачищает.

`install.ps1` (v1.24.5) тогда сам: создавал `%DSH_HOME%\plugins\dsh-agents-board`
(полную копию), создавал `profiles\web\` и `cordis.patch.yml` с управляемым рядом
(если их нет), создавал `settings.yaml` с секцией `agents-board:` (если файла
нет; существующий пользовательский файл никогда не перезаписывался — только
восстанавливалась отсутствующая секция), предупреждал об отсутствии
дефолтного .wav (режим `browser` работает всегда). `DSH_HOME` берётся из
окружения, по умолчанию `%USERPROFILE%\.dsh`. После установки — один запуск
`pnpm dsh web`: harness достроит остальное, ряд плагина уже на месте.

---

## 3. Порт на dsh v0.2.0-rc.2 (v1.25.0) — что переехало и почему

### Что изменилось в harness
- `settings.installSection` больше не существует: настройки плагина теперь —
  это **Config-схема самого плагина** (`export const Config = z.object({...})`,
  schemastery), которую сервис настроек публикует под **id строки** загрузчика.
- Вкладка «Settings → Plugins» заменена отдельной страницей **Plugins**
  (`ui-plugin-manager`): список плагинов, живые тумблеры включения, и
  **автогенерируемая форма** из volatile-полей Config-схемы. Наш прежний слот
  `settings.plugin.item` не существует — карточка настроек убрана из бандла.
- Легаси `settings.yaml` импортируется один раз при первом старте новой версии
  и переименовывается в `settings.yaml.imported`; секции, чей namespace не
  найден среди id строк, отбрасываются с предупреждением. Наша секция
  `agents-board:` в импорт не попала (у старого ряда не было `id:`) —
  значения по умолчанию теперь живут в блоке `config:` строки профиля.
- `Switch` вернулся в `@deepseek-ai/dsh-client-ui-primitives` — но собственный
  fallback в бандле оставлен (правило раздела 1 в силе).
- `sidebar.footer.action` и `shell.overlay` не изменились — кнопка, панель,
  тосты и оповещения работают как были.

### Как теперь устроен плагин
- **host.mjs**: `export const inject = ['webServer']` (волокно само дождётся
  сервиса — старый вотчер `ctx.inject(['webServer'], …)` больше не нужен;
  внутри apply свой try/catch остался). `export const Config` — schemastery-
  схема, все поля `.volatile()` (живое редактирование без перезагрузки волокна:
  `apply` получает volatile-ссылки и читает `field.get()` на каждый запрос).
  schemastery грузится каскадом: голый импорт → `./deps/schemastery.mjs`
  (вендоренная копия из чекаута, ставится install.ps1); без неё доска работает,
  только без формы на странице Plugins.
- **Ряд профиля**: `- id: agents-board` + `config:` с дефолтами. `id` обязателен —
  это и есть namespace, под которым сервис настроек публикует схему, и ключ,
  по которому клиент (`ctx.configForms.get('agents-board')`) получает форму.
- **client.js**: `inject`-список `['sessions','slots','locale','configForms','uiWorkspace']`
  (в package.json — `dsh.client.inject: ['@deepseek-ai/dsh-client-locale',
  '@deepseek-ai/dsh-client-ui-settings']`, как у официальных компаньонов);
  `scope = ctx.configForms.get(NS)` даёт тот же реактивный интерфейс
  (`getSnapshot().value`, `set(field, value)`), что и старый settingsScope, —
  вся логика оповещений/звука не изменилась ни строчкой.
- **Открытие сессии**: `sessions.open/openSubagent` удалены в rc.2 — заменены на
  `uiWorkspace.openSession(target)`, где `target = SessionId | SubagentAddress`;
  `sessions.subagentAddress(id)` на лице сервиса уцелел. Обёртка с fallback
  держит совместимость со старым рантаймом.
- **Деградация оповещений**: у строки списка (`SessionSummary`) больше нет
  менеджерского бита `completed`, а у `SessionListState` — поля `current`.
  Ветки «завершение, пока страница была отключена» и «просмотренное = увиденное»
  стали no-op (охраняемые проверки не падают). Главный триггер — собственный
  running→idle переход — работает, пока страница подключена; тихие периоды
  (рестарт сервера, сон) больше не доигрывают пропущенные завершения.

### Fail-safe в новой архитектуре
Без schemastery → нет схемы → нет формы на странице Plugins, но роуты и доска
работают (внутренние дефолты). Без webServer → нет роутов (волокно с `inject`
просто дождётся сервиса; на host без web-сервера ряд не активируется — это
легально). Ошибка регистрации роутов гасится try/catch — сервер живёт.
Ошибка одного слота гасится safeSlot — остальные слоты живут. Ошибка apply
гасится обёрткой — entry активируется, доска просто выключена. Ручная правка
`config:` строки с мусорным значением — schemastery-валидация ряда отклонит
значение (fail-loud ровно на этом ряду, остальные плагины не затронуты);
дефолты в ряду всегда валидны.

---

## 4. Доставка через официальный бандл (v1.25.1) — почему file://-ряд не работал

### Симптомы после первой rc.2-сборки (v1.25.0)
Свич на странице Plugins не появлялся, доска не открывалась (слоты пусты), при
том что роуты `/agents-board/*` отвечали. Разбор показал две причины:

1. **Страница Plugins строит список из инвентаря установленных бандлов**
   (`remote.pluginInventory`), а не из строк загрузчика. file://-ряд — не
   установленный пакет: для страницы его не существует, и автогенерируемой
   формы он не получает.
2. **Клиентский модуль** плагина попадает в boot-манифест только через пакет
   с `dsh.client` (сканер `ClientModuleRegistry` резолвит строку загрузчика до
   ближайшего package.json). Схема рабочая, но в сочетании с недоступностью
   страницы настройки это переводит доставку целиком на официальный путь.

### Решение: `dsh plugin add` (как у официальных плагинов)
- `install.ps1` теперь **только запускает официальный установщик** из чекаута:
  `pnpm pack` в папке-мастере, затем `pnpm dsh plugin --profile web add
  <tarball>`. CLI сам добавляет пакет в манифест профиля
  (`dsh.profile.bundles`), ставит РЕАЛЬНУЮ КОПИЮ пакета в `node_modules`
  профиля (сначала был вариант с directory-spec — pnpm ставил junction на
  папку-мастер, и перенос папки ломал живой плагин; tarball-путь делает
  мастер независимым: папку можно переносить/удалять свободно) и подключает
  `cordis.patch.yml` бандла как overlay-слой. Ручных записей в профиль больше
  нет (кроме миграционной чистки собственных следов старой схемы —
  маркерованный file://-ряд и копия в `%DSH_HOME%\plugins`, скрипт делает это
  идемпотентно). После правок исходников — повторный запуск `install.ps1`,
  чтобы профиль скопировал новые байты.
- `cordis.patch.yml` бандла — настоящий patch-файл (ряд `name:
  dsh-agents-board`, `id: agents-board`, `config:` с дефолтами), который
  harness читает из установленного бандла сам.
- **host.mjs** грузит schemastery **синхронно** (`createRequire`): голый
  `@deepseek-ai/schemastery` → `./deps/schemastery.cjs` (CJS-сборка из vendor;
  cosmokit подтягивается require(esm) на Node 24). Top-level await убран —
  на один способ отказа меньше.
- **Настройки на странице плагина**: страница ряда — официальный слот
  `plugins.row.config` (ключ `<пакет>#<id ряда>`); наш компонент даёт
  `summary` (описание ряда) и `page` (редактор: язык, уведомления, звук,
  устройство, проба) поверх того же ConfigForm-зеркала. Тумблер включения
  ряда — родной, от страницы Plugins. Позже (v1.25.1, раздел 5) настройки
  подняты на уровень выше — слот `plugins.bundle.config` прямо на странице
  бандла, вложенный слот ряда убран.

### Fail-safe
Без schemastery → нет схемы → на странице плагина показывается «настройки
недоступны», доска живёт на внутренних дефолтах. Ошибка слота гасится
safeSlot. Профиль держит собственную копию пакета (tarball-установка):
перенос или удаление папки-мастера не задевает работающий плагин;
обновление копии — повторный запуск `install.ps1`.

---

## 5. Краш открытия панели и тишина «ждёт ответа» (v1.25.1) — причина и фикс

### Симптомы после перехода на бандл
Кнопка доски на месте, но панель не открывается. Консоль браузера:
`TypeError: props.useSessionPendingInteraction is not a function at BoardSurface`,
`slot entry crashed in 'shell.overlay'`.

### Причина
`BoardSurface` брал у dispatch слота `shell.overlay` три хука старой оболочки:
`useSessions`, `useWorkspaces` и `useSessionPendingInteraction`. В rc.2 первые
два остались, третий удалён — состояние «агент ждёт ответа» переехало В СТРОКУ
сессии: сервис `uiSession` кладёт `pendingInteraction` в каждую строку зеркала
сессий. Незащищённый вызов бросал TypeError — React вырубал запись слота,
панель не рендерилась вообще. Тот же хук питал и оповещение «ждёт ответа» —
потому и не было звука при остановке агента в ожидании подтверждения.

### Фикс (в самом плагине, harness не тронут)
- `BoardSurface`: вызов хука защищён `typeof`; при отсутствии хука карта
  ожиданий собирается из строк зеркала (`pendingFromRows`), так что подсветка
  «ждёт ответа» и счётчик работают на rc.2, а на старой оболочке работает
  прежний путь.
- Наблюдатель в `apply` (тот же, что ловит завершения) теперь отслеживает
  свежие pending-края по `row.pendingInteraction`: новая остановка в ожидании
  ответа даёт звук + тост «Агент ждёт вашего ответа»; первый снапшот только
  заполняет множество, чтобы уже ждущие сессии не заваливали страницу.
- Настройки на Plugins подняты на уровень выше: слот `plugins.bundle.config`
  (ключ — имя пакета) рендерит редактор прямо на странице бандла; вложенная
  страница ряда и слот `plugins.row.config` убраны.

### Урок
Все хуки, которые доска берёт у dispatch слота, обязаны проверяться на
существование: оболочка вправе менять состав props между версиями. Теперь
таких вызовов не осталось — каждый либо наш (inject face), либо защищён.
