# dsh-agents-board

The agents board plugin for the DeepSeek Harness web GUI: one panel with every agent and subagent across all chats — steps, context, tokens, presets, live counters.

Plugin version: **1.24.6**.

> **Languages / Языки:** English first, the Russian original follows after the divider.
> Английская версия — полный перевод русской части; обе описывают одну и ту же версию.

---

## Installation

Requirements: an installed DeepSeek Harness (a repository clone with `pnpm install` completed). Windows PowerShell 5.1+ ships with Windows; Node.js 22.19+/24+ is required by the harness itself, not by the installer. `%DSH_HOME%` defaults to `C:\<user>\.dsh`; the installer honors a custom `DSH_HOME` environment variable.

```powershell
powershell -ExecutionPolicy Bypass -File install.ps1
```

Or just double-click **`install.bat`** in this folder — a plain cmd wrapper that runs `install.ps1` from its own location and keeps the console window open until you press a key.

The script (run from the plugin folder):

1. Copies the **whole folder** — `package.json`, `host.mjs`, `client.js`, `install.ps1`, `install.bat`, `uninstall.ps1`, `uninstall.bat`, `README.md`, `cordis.patch.yml`, `PLUGIN-FAILSAFE-REPORT.md` — into `%DSH_HOME%\plugins\dsh-agents-board\`. That copy is the live plugin.
2. Adds a managed row to `%DSH_HOME%\profiles\web\cordis.patch.yml` (marked `# dsh-agents-board (managed by install.ps1)`), pointing at `…\plugins\dsh-agents-board\host.mjs`.
3. Rewrites `cordis.patch.yml` in the master folder — an informational copy of the installed row only.
4. Ensures the `agents-board:` section in `%DSH_HOME%\settings.yaml` (creates the file on a fresh harness; an existing user file is never overwritten — only a missing section is restored).

**Fresh harness:** the installer is self-sufficient — it creates `%DSH_HOME%\plugins\dsh-agents-board\`, the `profiles\web\` directory and `cordis.patch.yml`, and `settings.yaml` with the plugin's section if they do not exist yet. Then start `pnpm dsh web` once: the harness scaffolds the rest of the profile and activates the plugin row that is already in place. A missing default chime `.wav` only affects the `wav` sound mode; `browser` works everywhere.

Re-running is safe and idempotent: the copy and the row are refreshed, no duplicates appear. The harness **never reads** the master folder after installation — you may rename, move, or copy it to another PC; the server start is unaffected. If you changed files in the master folder, run `install.ps1` again to refresh the installed copy.

After installing, restart `pnpm dsh web` and refresh the page (F5). The client module registry is built at server start, so the very first plugin load requires a restart; every later toggle does not.

## Uninstalling

```powershell
powershell -ExecutionPolicy Bypass -File uninstall.ps1
```

(or double-click **`uninstall.bat`**).

The script works the same from the master folder and from the installed copy (`%DSH_HOME%\plugins\dsh-agents-board\uninstall.ps1`). It:

1. Removes the managed row from `%DSH_HOME%\profiles\web\cordis.patch.yml`.
2. Deletes the installed copy `%DSH_HOME%\plugins\dsh-agents-board\` (if the script runs from that folder and Windows blocks deleting its own folder, the leftover files are harmless — delete them manually).
3. Removes the `agents-board` section from `settings.yaml`.

The master folder is left untouched. Restart `pnpm dsh web` afterwards.

## Moving to another PC

1. Copy the whole `dsh-agents-board` folder to the other PC at any path (for example `C:\Tools\dsh-agents-board`) — USB drive, archive, network.
2. That PC needs the harness installed and `pnpm dsh web` run at least once (see the requirements above).
3. Run `powershell -ExecutionPolicy Bypass -File C:\Tools\dsh-agents-board\install.ps1` — or just double-click `C:\Tools\dsh-agents-board\install.bat` — the script locates its own folder (`$PSScriptRoot`), copies everything into `%DSH_HOME%\plugins\dsh-agents-board\`, and writes the row into the profile patch. pnpm is not needed to install the plugin.
4. Restart `pnpm dsh web` and refresh the page — the board appears on its own.

## What appears in the interface

### Sidebar button (`sidebar.footer.action`)

In the narrow rail — a status dot (blue "working" when sessions are running, gray otherwise); in the wide rail — the "Agents board" label. A click opens/closes the panel.

### The board panel (overlay)

Three columns:

| Column | Criterion |
|---|---|
| **Working** | the session is running and not archived |
| **Done** | not running, not blank, not archived |
| **Archive** | the session is in the registry-wide archive |

Inside a column, cards are sorted by last activity (freshest first). Blank placeholder sessions never reach the board. Subagents are full cards marked "subagent of «parent»"; clicking any card opens that session (subagents through their open-subagent address) and closes the panel. **Finished subagents do not clutter the board**: while running, a subagent shows in Working like any session (or Archive if it got archived there); once it stops, its card leaves every column — Done and Archive alike, where crashed subagents used to pile up. The parent card keeps counting them through the subagent badge. This filter affects subagent rows only. **New results glow green**: a session that finished while you were not looking at it carries a soft green fill in Done (18% `state-success-primary`, 30% on hover). The board reads the harness's own completion signal — the same `completed` bit that lights the sidebar dot: it arms on the running→idle edge of a session you were not viewing and disarms the moment you open it (sidebar click or board card click). Nothing already finished at page load lights up; a completion that lands while you sit in that chat is considered seen; a fresh run that finishes while you are away glows again. On a **Done** card, hovering slides an **Archive** button into the title row (right of the preset badge, animated; the badge shifts left smoothly). The verb is the same registry archive the sidebar menu uses. On an **Archive** card, hovering reveals **Hide** in the same spot. Activating either button animates the card away with the Web Animations API: the card fades out first, then collapses in height (computed start values, so the transition cannot be skipped) — the rows below slide up as the box shrinks — and only after the collapse does the action apply (registry archive, or view-hide on this browser). Hidden rows reappear through the "Show hidden (N)" toggle pinned right under the Archive column header — it stays in place above the list while the cards scroll beneath it. Revealed hidden rows never mix with the visible ones: they render as a separate group **below**, behind a thin "Hidden" divider line, and each grows out of the collapsed state with the same two-phase animation in reverse on reveal; toggling the group back off plays the same dissolve the card buttons use before the rows unmount. While revealed, each hidden row's button reads **Restore** and clicking it moves the row to the visible group with the same grow-out animation played at its destination, once per restore. The hidden set persists in `localStorage` (key `agents-board.hidden`).

Three counters in the header:

- **N working** — running sessions (not archived);
- **N awaiting reply** — sessions waiting for the user (approvals, questions);
- **N tokens total** — the sum across all sessions of all four buckets (uncached input, output, cache read, cache write).

The panel can be **moved by its header** and **resized** by the right edge, the bottom edge, and the bottom-right corner grip (with a diagonal hatch). Minimum 560×360; bounds are the browser window. Position and size are stored in the browser's `localStorage` (key `agents-board.layout`) and restored after closing the panel, reloading the page, and restarting the server; a restored value is clamped to the current window. Close with the Close button, Escape, or a click on the dimmed backdrop. The default size without a stored layout is 1080×720, centered.

### The agent card — four lines

1. **Task name** (the session title; long names truncate — the full text is in the tooltip), the status dot (running/done/archived), the "awaiting reply" mark for sessions with pending interactions — **while a session waits, the whole card interior is tinted red inside its border** (an 18% mix of `state-error-primary` over the panel; a deeper 30% mix on hover; the token itself flips red-600 ↔ red-400 between light and dark themes) — and the **preset badge** in the top-right corner — the agent preset (`creator`, `standard`, …) from the session's `agentPreset` projection; shown only when set.
2. **Data**: `steps · turns` (the `sessionStats` projection), total tokens (four disjoint buckets), last activity time ("N min ago", "N h ago", a date), and total LLM time.
3. **Context**: a line like "context 33%" — the share of the context window from the pressure projection (`projectedTokens ?? pressureTokens` over `contextWindow`); until measured — "context —".
4. **The context progress bar** — present on every card: the filled part is green below 60%, yellow from 60–89%, red at 90% and above; the unfilled remainder of the line is light gray. Until the context is measured, the bar is empty.

### The Settings → Plugins card

A framed area with three settings; all apply immediately, without a restart (values live in `~/.dsh/settings.yaml`, section `agents-board`):

- **Board language**: Auto / EN / RU. "Auto" (the default) = English; RU switches all board text to Russian.
- **Show the agents board** — the toggle. When off, the sidebar button and the panel disappear; the settings card itself remains so you can switch it back on.
- **Notify when an agent finishes** — sound + toast. Off by default. From then on **every** completion rings the Windows system chime (focused page or not) and raises an in-page toast with the session name, lifted clear of the text composer; clicking the toast opens the session. The trigger is the plugin's own running→idle watch over the sessions mirror, so the completion of the session you are currently watching alerts too — not only background ones (the session manager's own bit deliberately skips selected sessions, which muted exactly those). **Audio via** mirrors dsh-text-reader exactly: **Browser** (the page plays the wav itself; the per-app router maps the browser), **Windows + device** (a spawned helper renders on the picked MCI device), **Windows process** (a spawned powershell on the system default — the Stream Deck-style router can map `powershell.exe` wherever you like); any browser playback refusal automatically retries on the helper. A session that stops to wait for your reply — a tool approval, a plan review, or a question — alerts the same way, with its own toast title ("Agent awaits your reply"). Alerts fire even with the board closed; the toggle silences everything.
- **Audio via** (Browser / Windows + device / Windows process) and **Output device** — the device select (visible for Windows + device) lists whatever the host's MCI/winmm enumeration reports, often empty and leaving only the system default. **Test** rings once through the current mode and device; if a freshly reloaded page refuses to start audio (autoplay policy), one ding is queued for your next click. A resync re-arm of an already-viewed completion no longer repaints the green card: the fill requires step growth past what you have seen. Values live in `settings.yaml` (`sound: browser|wav|process`, `device: "name"|""`).

## How it works

- **Two plugin files.** `host.mjs` — the host half on `node:` builtins only: it registers the `agents-board` settings section (`enabled`, `language`, `notify`, `sound: browser|server`, `device`) through the settings service, and mounts GET routes on the web server: `/agents-board/chime.wav` (the wav bytes for the browser-side path), `/agents-board/chime[?device=…]` (spawned-PowerShell winmm/MCI playback, burst-coalesced), `/agents-board/devices` (MCI name list, cached 60 s). The section resolver never throws — any malformed hand edit of `settings.yaml` normalizes to defaults and cannot block the harness boot. The section schema is a hand-rolled schemastery-compatible node: it serializes into a `{uid, refs}` envelope and the client rehydrates it through real schemastery.
- **client.js** — the browser bundle in ModuleLoader format (`window.__ModuleLoader__`), `React.createElement` only (no JSX), baseline externals: react, cordis, client-store, ui-primitives. It registers three slots — `shell.overlay` (the panel plus the completion-toast layer), `sidebar.footer.action` (the button), `settings.plugin.item` (the settings card) — plus the `en`/`ru` dictionaries (`en` is the terminal fallback).
- **Data** — client mirrors only: sessions (state + the `sessionStats`, `tokenUsage`, `contextPressure`, `agentPreset` projections, and the manager's per-row `completed` bit), the archive (`workspaces.archivedSessionIds`), pending interactions (`sessionPendingInteraction`). Nothing is fetched on click — the board updates together with the mirrors.
- **Storage**: settings — `settings.yaml` (section `agents-board`); the window layout — the browser's `localStorage`.

## Files

| File | Role |
|---|---|
| `package.json` | manifest: name `dsh-agents-board`, `dsh.client.platform: web`, export `./client` → `client.js` |
| `host.mjs` | host half: the `agents-board` settings section (`enabled`, `language`, `notify`, `device`) + `/agents-board/chime` `/agents-board/devices` routes (`node:` builtins only) |
| `client.js` | browser bundle: columns, counters, cards, progress bars, button, switch, drag/resize |
| `install.ps1` | one-run installation (copy into `%DSH_HOME%\plugins\` + the profile-patch row) |
| `install.bat` | classic double-click wrapper around `install.ps1` |
| `uninstall.ps1` | one-run removal (the row + the installed copy + the settings section) |
| `uninstall.bat` | classic double-click wrapper around `uninstall.ps1` |
| `cordis.patch.yml` | informational copy of the installed row (rewritten by install.ps1, not used on its own) |
| `README.md` | this file; copied into the installed folder |

## Troubleshooting

- **The board is missing after installation.** The client module registry is built at server start — restart `pnpm dsh web` and refresh the page. Check: `http://127.0.0.1:3080/plugins/dsh-agents-board/client.js` must be served (not 404).
- **The button and the panel disappeared.** The "Show the agents board" toggle in Settings → Plugins is off — switch it back on there.
- **No completion alerts.** The chime needs only the "Notify when an agent finishes" toggle — if it is on but silent, the server was not restarted after the plugin update (`/agents-board/chime.wav` answers 404), or the sound rides the wrong audio session: flip **Sound through** (Browser follows the per-app router's browser mapping, Server follows the system default; whichever of the two you can hear) and press **Test**. The in-page toast needs nothing beyond the toggle; only the hidden-page native popup needs site permission (the padlock).
- **I changed client.js / host.mjs in the master folder, nothing changed on the board.** Run `install.ps1` again (the runtime does not read the master) and refresh the page; host-half edits need a server restart, client-half edits need only F5.
- **I deleted the master folder — will the server fail to start?** It must not: the patch row points at the copy in `%DSH_HOME%\plugins\dsh-agents-board\`, the runtime does not use the master. Deleting the installed copy without uninstalling the row causes a load error — in that case remove the row from `%DSH_HOME%\profiles\web\cordis.patch.yml` or restore the folder.
- **Reset the window layout.** Clear the `agents-board.layout` key in the page's localStorage (DevTools → Application → Local Storage) — the panel returns to 1080×720, centered.

---

# Русский (оригинал)

Плагин-«доска агентов» для web GUI DeepSeek Harness: одна панель со всеми агентами и субагентами из всех чатов — шаги, контекст, токены, режимы, живые счётчики.

Версия плагина: **1.24.6**.

## Установка

Требуется: установленный DeepSeek Harness (клон репозитория с выполненным `pnpm install`). Windows PowerShell 5.1+ есть в Windows по умолчанию; Node.js 22.19+/24+ нужен самому harness, не установщику. `%DSH_HOME%` по умолчанию `C:\<пользователь>\.dsh`; установщик учитывает переменную окружения `DSH_HOME`.

```powershell
powershell -ExecutionPolicy Bypass -File install.ps1
```

Или просто двойной клик по **`install.bat`** в этой папке — классическая cmd-обёртка, которая запускает `install.ps1` из своего же расположения и держит окно консоли открытым до нажатия клавиши.

Скрипт (запускаемый из папки плагина):

1. Копирует **всю папку** — `package.json`, `host.mjs`, `client.js`, `install.ps1`, `install.bat`, `uninstall.ps1`, `uninstall.bat`, `README.md`, `cordis.patch.yml`, `PLUGIN-FAILSAFE-REPORT.md` — в `%DSH_HOME%\plugins\dsh-agents-board\`. Эта копия и есть живой плагин.
2. Добавляет управляемую строку в `%DSH_HOME%\profiles\web\cordis.patch.yml` (помечена маркером `# dsh-agents-board (managed by install.ps1)`), указывающую на `…\plugins\dsh-agents-board\host.mjs`.
3. Переписывает `cordis.patch.yml` в мастер-папке — это только информационная копия установленного ряда.
4. Обеспечивает секцию `agents-board:` в `%DSH_HOME%\settings.yaml` (на пустом harness создаёт файл; существующий пользовательский файл никогда не перезаписывается — восстанавливается только отсутствующая секция).

**Пустой harness:** установщик самодостаточен — сам создаёт `%DSH_HOME%\plugins\dsh-agents-board\`, каталог `profiles\web\` и `cordis.patch.yml`, а также `settings.yaml` с секцией плагина, если их ещё нет. Затем один запуск `pnpm dsh web`: harness достроит остальное профиля и активирует уже установленный ряд плагина. Отсутствие дефолтного .wav влияет только на режим звука `wav`; режим `browser` работает всегда.

Повторный запуск безопасен и идемпотентен: копия и ряд обновляются, дублей не появляется. Папка-мастер после установки harness'ом **не читается** — её можно переименовать, переместить или скопировать на другой ПК; на запуск сервера это не влияет. Если вы изменили файлы в мастер-папке — запустите `install.ps1` заново, чтобы освежить установленную копию.

После установки перезапустите `pnpm dsh web` и обновите страницу (F5). Реестр клиентских модулей строится при старте сервера, поэтому самый первый запуск плагина требует рестарта; все последующие переключения — нет.

## Удаление

```powershell
powershell -ExecutionPolicy Bypass -File uninstall.ps1
```

(или двойной клик по **`uninstall.bat`**).

Скрипт работает одинаково из мастер-папки и из установленной копии (`%DSH_HOME%\plugins\dsh-agents-board\uninstall.ps1`). Он:

1. Убирает управляемую строку из `%DSH_HOME%\profiles\web\cordis.patch.yml`.
2. Удаляет установленную копию `%DSH_HOME%\plugins\dsh-agents-board\` (если скрипт запущен из неё и Windows блокирует удаление собственной папки — оставшиеся файлы безвредны, их можно удалить вручную).
3. Убирает раздел `agents-board` из `settings.yaml`.

Мастер-папку скрипт не трогает. После удаления перезапустите `pnpm dsh web`.

## Перенос на другой ПК

1. Скопируйте всю папку `dsh-agents-board` на другой ПК в любой путь (например `C:\Tools\dsh-agents-board`) — флешкой, архивом, по сети.
2. На том ПК должен быть установлен harness и хотя бы раз запущен `pnpm dsh web` (см. требования выше).
3. Запустите `powershell -ExecutionPolicy Bypass -File C:\Tools\dsh-agents-board\install.ps1` — или просто двойной клик по `C:\Tools\dsh-agents-board\install.bat` — скрипт сам определит свою папку (`$PSScriptRoot`), скопирует всё в `%DSH_HOME%\plugins\dsh-agents-board\` и впишет строку в профильный патч. pnpm для установки плагина не нужен.
4. Перезапустите `pnpm dsh web` и обновите страницу — доска появится сама.

## Что появляется в интерфейсе

### Кнопка в сайдбаре (`sidebar.footer.action`)

В узкой панели — точка-индикатор (голубая «в работе», когда есть запущенные сессии, серая — иначе), в широкой — подпись «Доска агентов». Клик открывает/закрывает панель.

### Панель-доска (overlay)

Три колонки:

| Колонка | Критерий |
|---|---|
| **В работе** | сессия запущена (`running`) и не в архиве |
| **Готово** | не запущена, не пустая, не в архиве |
| **Архив** | сессия в глобальном архиве реестра |

Внутри колонки карточки сортируются по времени последней активности (свежие сверху). Пустые сессии-заглушки (blank) на доску не попадают. Субагенты — полноценные карточки с пометкой «субагент «родитель»»; клик по любой карточке открывает эту сессию (для субагентов — через адрес открытого субагента) и закрывает панель. **Завершённые субагенты не засоряют доску**: работающий субагент показывается в «В работе» как обычная сессия (или в «Архиве», если попал туда); как только он останавливается, его карточка уходит из всех колонок — и из «Готово», и из «Архива», где раньше копились упавшие субагенты. Карточка-родитель продолжает считать их через бейдж субагентов. Фильтр действует только на строки-субагенты. **Новые результаты светятся зелёным**: сессия, завершившаяся, пока вы на неё не смотрели, несёт в «Готово» мягкую зелёную подложку (18% `state-success-primary`, при наведении — 30%). Доска читает собственное завершение harness'а — тот же бит `completed`, что зажигает точку в сайдбаре: он взводится на переходе running→idle у сессии, которую вы не смотрели, и снимается, стоит её открыть (кликом в сайдбаре или по карточке доски). Уже завершённое на момент загрузки страницы не подсвечивается; завершение, случившееся, пока вы сидите в этом чате, считается просмотренным; свежий прогон, упавший за время вашего отсутствия, загорится снова. На карточке в **«Готово»** наведение плавно выезжает кнопкой **«В архив»** в строку названия (правее бейджа режима; бейдж мягко сдвигается влево) — тот же архив реестра, что и в меню сайдбара. На карточке в **«Архиве»** там же появляется **«Скрыть»**. Нажатие убирает карточку двухфазной анимацией через Web Animations API: сначала карточка растворяется, затем схлопывается по высоте (стартовые значения берутся из computed style, поэтому переход не может быть пропущен) — строки ниже поднимаются вместе со схлопыванием — и только после этого применяется действие (архивация реестра или скрытие вида в этом браузере). Скрытые строки появляются через переключатель «Показать скрытые (N)», закреплённый прямо под шапкой колонки «Архив» — он остаётся на месте над списком, пока карточки прокручиваются под ним. Раскрытые скрытые строки никогда не смешиваются с видимыми: они отображаются отдельной группой **ниже**, за тонкой линией-разделителем «Скрытые», и при раскрытии каждая вырастает из схлопнутого состояния той же двухфазной анимацией в обратную сторону; выключение тумблера перед демонтажом строк проигрывает то же растворение, что и кнопки на карточках. В режиме показа кнопка скрытой карточки читается **«Вернуть»** — клик переносит строку в видимую группу с той же анимацией вырастания, проигрываемой на новом месте один раз. Набор скрытых хранится в `localStorage` (ключ `agents-board.hidden`).

В шапке три счётчика:

- **N работают** — запущенные сессии (не в архиве);
- **N ждут ответа** — сессии, ожидающие реакции пользователя (утверждения, вопросы);
- **N токенов всего** — сумма по всем сессиям всех четырёх бакетов (uncached input, output, cache read, cache write).

Панель можно **перемещать за шапку** и **растягивать** за правый край, нижний край и правый нижний уголок (с диагональной штриховкой). Минимум 560×360, границы — текущее окно браузера. Положение и размер запоминаются в `localStorage` браузера (ключ `agents-board.layout`) и восстанавливаются после закрытия панели, перезагрузки страницы и перезапуска сервера; при нехватке места восстанавливаемое значение обрезается по текущему окну. Закрытие: кнопка «Закрыть», Escape, клик по затемнению вокруг панели. Дефолтный размер без сохранённого layout — 1080×720 по центру.

### Карточка агента — четыре строки

1. **Имя задачи** (заголовок сессии, длинные имена обрезаются; полный текст — в подсказке), точка статуса (запущена/готова/архив), пометка «ждёт ответа» для сессий с ожидающими интеракциями — **пока сессия ждёт, фон карточки целиком внутри рамки заливаются красным** (смесь 18% `state-error-primary` с прозрачностью; при наведении — насыщеннее, 30%; сам токен переключается red-600 ↔ red-400 между светлой и тёмной темами) и **бейдж режима** в правом верхнем углу — пресет агента (`creator`, `standard`, …) из проекции сессии `agentPreset`; показывается, только если задан.
2. **Данные**: `шагов · ходов` (проекция `sessionStats`), суммарные токены (четыре disjoint-бакета), время последней активности («N мин назад», «N ч назад», дата) и суммарное время LLM.
3. **Контекст**: строка вида «контекст 33%» — доля окна контекста из проекции давления (`projectedTokens ?? pressureTokens` к `contextWindow`); пока не измерено — «контекст —».
4. **Прогресс-бар контекста** — есть у каждой карточки: заполненная часть зелёная до 60%, жёлтая 60–89%, красная от 90%; незаполненный остаток линии — ярко-серый. Пока контекст не измерен, бар пустой.

### Карточка в Settings → Plugins

Рамка с тремя настройками, все действуют сразу, без перезапуска (значения живут в `~/.dsh/settings.yaml`, раздел `agents-board`):

- **Язык доски**: Авто / EN / RU. «Авто» (значение по умолчанию) = английский; RU переводит весь текст доски на русский.
- **Показывать доску агентов** — тумблер. В выключенном состоянии кнопка в сайдбаре и панель исчезают; сама карточка настроек остаётся, чтобы можно было включить обратно.
- **Уведомлять о завершении задачи** — звук + тост. По умолчанию выключено. С этого момента **каждое** завершение даёт системную «динь» Windows (в фокусе страница или нет) и внутристраничный тост с именем сессии — приподнят над полем ввода, клик открывает сессию. Триггер — собственный наблюдатель перехода «работает → закончил» по зеркалу сессий, поэтому завершение той сессии, на которую вы сейчас смотрите, тоже звонит: менеджерский бит намеренно пропускает выбранную сессию — именно из-за этого «пропуска» звук пропадал. **Озвучивание через** повторяет dsh-text-reader один в один: **Браузер** (страница играет wav сама; поприложенческий роутер ведёт браузер), **Windows + устройство** (spawn'утый помощник играет на выбранном MCI-устройстве), **Процесс Windows** (spawn'утый powershell на системном дефолте — роутер вроде Stream Deck может увести `powershell.exe` куда угодно); если браузер не дал играть, звонок автоматически уходит помощнику. Если сессия остановилась в ожидании вашего ответа — подтверждение инструмента, ревью плана или вопрос — она оповещает так же, со своим заголовком тоста («Агент ждёт вашего ответа»). Оповещение работает даже с закрытой доской; тумблер глушит всё.
- **Озвучивание через** (Браузер / Windows + устройство / Процесс Windows) и **Устройство вывода** — селектор устройства (виден для «Windows + устройство») показывает то, что увидит MCI/winmm-перечисление на сервере — часто пусто, остаётся системный дефолт. **Проба** играет один звонок через текущий режим и устройство; если свежеперезагруженная страница отказалась запускать звук (autoplay-политика), один «динь» ставится в очередь до вашего следующего клика. Повторный ре-арм уже просмотренного завершения больше не красит карточку в зелёный: заливка требует роста шагов сверх просмотренного. Значения живут в том же разделе `settings.yaml` (`sound: browser|wav|process`, `device: "имя"|""`).

## Как это устроено

- **Два файла плагина.** `host.mjs` — host-половина на одних `node:`-встроенных модулях: регистрирует секцию настроек `agents-board` (`enabled`, `language`, `notify`, `sound: browser|server`, `device`) через settings-сервис и вешает на web-сервер GET-маршруты: `/agents-board/chime.wav` (сами wav-байты для браузерного пути), `/agents-board/chime[?device=…]` (проигрывание spawn'утым PowerShell через winmm/MCI, с коалесингом залпов) и `/agents-board/devices` (список имён MCI, кэш 60 с). Резолвер настроек никогда не бросает исключений — любая некорректная hand-правка `settings.yaml` нормализуется к дефолту и не может помешать запуску harness. Схема секции — hand-rolled узел, совместимый с schemastery: сериализуется в `{uid, refs}`-конверт и ре-гидрируется клиентом через настоящий schemastery.
- **client.js** — клиентский бандл в формате ModuleLoader (`window.__ModuleLoader__`), только `React.createElement` (без JSX), базовые внешние модули: react, cordis, client-store, ui-primitives. Регистрирует три слота — `shell.overlay` (панель + слой тостов завершения), `sidebar.footer.action` (кнопка), `settings.plugin.item` (карточка настроек), плюс словари `en`/`ru` (`en` — терминальный fallback).
- **Данные** — только клиентские зеркала: сессии (`sessions` состояние + проекции `sessionStats`, `tokenUsage`, `contextPressure`, `agentPreset` и менеджерский бит `completed` у строки), архив (`workspaces.archivedSessionIds`), ожидающие интеракции (`sessionPendingInteraction`). Ничего не запрашивается с сервера по клику — доска обновляется сама, вместе с зеркалами.
- **Хранилища**: настройки — `settings.yaml` (раздел `agents-board`), layout окна — `localStorage` браузера.

## Файлы

| Файл | Роль |
|---|---|
| `package.json` | манифест: имя `dsh-agents-board`, `dsh.client.platform: web`, экспорт `./client` → `client.js` |
| `host.mjs` | host-половина: секция настроек `agents-board` (`enabled`, `language`, `notify`, `device`) + маршруты `/agents-board/chime` `/agents-board/devices` (только `node:`-встроенные) |
| `client.js` | клиентский бандл: колонки, счётчики, карточки, прогресс-бары, кнопка, переключатель, drag/resize |
| `install.ps1` | подключение одним запуском (копия в `%DSH_HOME%\plugins\` + ряд в профильном патче) |
| `install.bat` | классическая обёртка двойного клика над `install.ps1` |
| `uninstall.ps1` | удаление одним запуском (ряд + установленная копия + раздел настроек) |
| `uninstall.bat` | классическая обёртка двойного клика над `uninstall.ps1` |
| `cordis.patch.yml` | информационная копия установленного ряда (переписывается install.ps1, сам по себе не используется) |
| `README.md` | этот файл; копируется в установленную папку |

## Устранение неполадок

- **После установки доски нет.** Реестр клиентских модулей строится при старте сервера — перезапустите `pnpm dsh web` и обновите страницу. Проверка: `http://127.0.0.1:3080/plugins/dsh-agents-board/client.js` должен отдаваться (не 404).
- **Кнопка и панель исчезли.** Выключен тумблер «Показывать доску агентов» в Settings → Plugins — включите его там же.
- **Нет оповещений.** «Динь» зависит только от тумблера «Уведомлять о завершении задачи»: включён, но тихо — значит сервер не перезапустили после обновления плагина (`/agents-board/chime.wav` отвечает 404), либо звук едет не по тому аудиосессионному пути: переключите **Звук через** (Браузер идёт по назначению браузера в роутере, Сервер — по системному дефолту; слушайте, где громче) и жмите **Проба**. Внутристраничном тосту нужен только тумблер; разрешение сайту — лишь нативному попапу при скрытой странице.
- **Изменил client.js / host.mjs в мастер-папке, на доске ничего не поменялось.** Запустите `install.ps1` заново (мастер не читается рантаймом) и обновите страницу; правки host-половины требуют рестарта сервера, клиентской — достаточно F5.
- **Удалил мастер-папку, сервер не стартует?** Не должен: ряд патча указывает на копию в `%DSH_HOME%\plugins\dsh-agents-board\`, мастер-папка рантаймом не используется. Удаление установленной копии без uninstall'а строки патча приведёт к ошибке загрузки — в этом случае уберите ряд из `%DSH_HOME%\profiles\web\cordis.patch.yml` или верните папку.
- **Сбросить layout окна.** Очистите ключ `agents-board.layout` в localStorage страницы (DevTools → Application → Local Storage) — панель вернётся к 1080×720 по центру.
