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
`install.ps1` (v1.24.5+) сам: создаёт `%DSH_HOME%\plugins\dsh-agents-board`
(полная копия), создаёт `profiles\web\` и `cordis.patch.yml` с управляемым рядом
(если их нет), создаёт `settings.yaml` с секцией `agents-board:` (если файла
нет; существующий пользовательский файл никогда не перезаписывается — только
восстанавливается отсутствующая секция), предупреждает об отсутствии
дефолтного .wav (режим `browser` работает всегда). `DSH_HOME` берётся из
окружения, по умолчанию `%USERPROFILE%\.dsh`. После установки — один запуск
`pnpm dsh web`: harness достроит остальное, ряд плагина уже на месте.
