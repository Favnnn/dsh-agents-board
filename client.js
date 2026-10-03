window.__ModuleLoader__.load({
	id: "dsh-agents-board",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let store = require("@deepseek-ai/dsh-client-store");
		let primitives = require("@deepseek-ai/dsh-client-ui-primitives");

		//#region stylesheet
		const css = ".aboard-backdrop{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--dsw-alias-label-primary) 22%,transparent)}.aboard-panel{position:absolute;display:flex;flex-direction:column;box-sizing:border-box;padding:14px 16px 16px;background:var(--dsw-specific-menu);border:1px solid var(--dsw-alias-border-l1);box-shadow:var(--dsw-elevation-prominent);border-radius:20px;--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2)}.aboard-header{display:flex;align-items:center;gap:12px;flex:none;padding-bottom:10px;cursor:move;user-select:none;touch-action:none}.aboard-title{margin:0;font-size:14px;font-weight:600;line-height:20px;color:var(--dsw-alias-label-primary)}.aboard-counters{display:flex;flex:1;gap:6px;flex-wrap:wrap;min-width:0}.aboard-counter{display:inline-flex;align-items:center;gap:5px;padding:1px 8px;border-radius:999px;background:var(--dsw-alias-fill-l2);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:20px;white-space:nowrap}.aboard-counter svg{flex:none}.aboard-close{flex:none;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border:0;border-radius:8px;background:0 0;color:var(--dsw-alias-label-tertiary);cursor:pointer}.aboard-close:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-fill-l2)}.aboard-columns{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;min-height:0;flex:1}.aboard-column{display:flex;flex-direction:column;min-height:0;gap:6px}.aboard-columnHead{flex:none;display:flex;align-items:center;gap:6px;padding:0 2px;font-size:12px;font-weight:600;line-height:18px;color:var(--dsw-alias-label-secondary)}.aboard-columnCount{color:var(--dsw-alias-label-tertiary);font-weight:400}.aboard-columnBody{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding:2px}.aboard-empty{margin:6px 2px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}.aboard-card{position:relative;display:flex;flex-direction:column;gap:4px;align-items:stretch;width:100%;text-align:left;padding:8px 10px;border:1px solid var(--dsw-alias-border-l3);border-radius:10px;background:0 0;cursor:pointer;flex:none}.aboard-card:hover{background:var(--dsw-alias-fill-l2)}.aboard-card.aboard-cardWaiting{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 18%,transparent)}.aboard-card.aboard-cardWaiting:hover{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 30%,transparent)}.aboard-card.aboard-cardFinished{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 18%,transparent)}.aboard-card.aboard-cardFinished:hover{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 30%,transparent)}.aboard-cardTitleRow{display:flex;align-items:center;gap:6px;min-width:0}.aboard-cardName{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;line-height:18px;color:var(--dsw-alias-label-primary)}.aboard-cardPending{flex:none;font-size:11px;line-height:16px;color:var(--dsw-alias-state-warn-primary)}.aboard-cardMeta{display:flex;flex-wrap:wrap;gap:2px 10px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);font-family:var(--dsw-font-mono)}.aboard-cardContext{font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);font-family:var(--dsw-font-mono)}.aboard-cardSub{font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary)}.aboard-cardMode{flex:none;max-width:45%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;line-height:16px;color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l3);border-radius:999px;padding:0 6px;transition:margin-left .18s ease}.aboard-progress{display:block;height:4px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-label-tertiary) 30%,transparent);overflow:hidden}.aboard-progressFill{display:block;height:100%;border-radius:999px;transition:width .2s ease}.aboard-progressOk{background:var(--dsw-alias-state-success-primary)}.aboard-progressWarn{background:var(--dsw-alias-state-warn-primary)}.aboard-progressHot{background:var(--dsw-alias-state-error-primary)}.aboard-cardActions{flex:none;display:flex;align-items:center;gap:4px;overflow:hidden;max-width:0;opacity:0;margin-left:-6px;transition:max-width .18s ease,opacity .18s ease,margin-left .18s ease}.aboard-card:hover .aboard-cardActions,.aboard-card:focus-visible .aboard-cardActions,.aboard-card:focus-within .aboard-cardActions{max-width:96px;opacity:1;margin-left:0}.aboard-cardAction{display:inline-flex;align-items:center;height:18px;padding:0 7px;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;background:var(--dsw-specific-menu);color:var(--dsw-alias-label-secondary);font-size:10px;line-height:16px;cursor:pointer;white-space:nowrap;opacity:0;transition:opacity .12s ease .06s}.aboard-card:hover .aboard-cardAction,.aboard-card:focus-visible .aboard-cardAction,.aboard-card:focus-within .aboard-cardAction{opacity:1}.aboard-cardAction:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-fill-l2)}.aboard-hiddenBar{flex:none;display:flex;justify-content:flex-start;padding:0 2px}.aboard-hiddenToggle{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 9px;border:1px dashed var(--dsw-alias-border-l2);border-radius:999px;background:0 0;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:20px;cursor:pointer}.aboard-hiddenToggle:hover{color:var(--dsw-alias-label-secondary)}.aboard-hiddenDivider{display:flex;align-items:center;gap:8px;padding:2px 2px;color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:14px;letter-spacing:.4px;text-transform:uppercase;user-select:none}.aboard-hiddenDivider::before,.aboard-hiddenDivider::after{content:'';flex:1;height:1px;background:var(--dsw-alias-border-l2)}.aboard-grip{position:absolute;z-index:2;touch-action:none}.aboard-gripE{top:0;right:0;bottom:0;width:6px;cursor:ew-resize}.aboard-gripS{left:0;right:0;bottom:0;height:6px;cursor:ns-resize}.aboard-gripSe{right:0;bottom:0;width:16px;height:16px;cursor:nwse-resize;border-bottom-right-radius:16px;background:repeating-linear-gradient(-45deg,transparent 0 4px,var(--dsw-alias-label-tertiary) 4px 5px);opacity:.4}.aboard-button{display:inline-flex;align-items:center;gap:8px;min-height:28px;padding:3px 6px;border:0;border-radius:8px;background:0 0;color:var(--dsw-alias-label-tertiary);cursor:pointer;font-size:12px;line-height:18px}.aboard-button:hover{color:var(--dsw-alias-label-secondary)}.aboard-buttonLabel{white-space:nowrap}.aboard-settings{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:12px;border:1px solid var(--dsw-alias-border-l3);border-radius:12px}.aboard-settingsText{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}.aboard-settingsTitle{margin:0;font-size:13px;font-weight:600;line-height:18px;color:var(--dsw-alias-label-primary)}.aboard-settingsDesc{margin:0;font-size:12px;line-height:16px;color:var(--dsw-alias-label-tertiary)}.aboard-settingsControls{display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:flex-end}.aboard-languageRow{display:flex;align-items:center;gap:8px}.aboard-languageLabel{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}.aboard-segmented{display:inline-flex;align-items:stretch;border:1px solid var(--dsw-alias-border-l3);border-radius:8px;background:var(--dsw-alias-fill-l2);padding:2px;gap:2px}.aboard-segment{border:0;border-radius:6px;background:0 0;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:18px;padding:0 10px;cursor:pointer;white-space:nowrap}.aboard-segment:hover{color:var(--dsw-alias-label-secondary)}.aboard-segmentActive{background:var(--dsw-specific-menu);color:var(--dsw-alias-label-primary)}.aboard-notifyCol{display:flex;flex-direction:column;align-items:flex-end;gap:2px}.aboard-select{height:22px;max-width:190px;padding:0 6px;border:1px solid var(--dsw-alias-border-l3);border-radius:6px;background:var(--dsw-alias-fill-l2);color:var(--dsw-alias-label-primary);font-size:11px;line-height:18px}.aboard-testButton{height:22px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;background:0 0;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:20px;cursor:pointer;white-space:nowrap}.aboard-testButton:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-fill-l2)}.aboard-notifyHint{max-width:280px;text-align:right;font-size:11px;line-height:14px;color:var(--dsw-alias-label-tertiary)}.aboard-toasts{position:fixed;right:18px;bottom:150px;z-index:95;display:flex;flex-direction:column;align-items:flex-end;gap:8px;pointer-events:none}.aboard-toast{pointer-events:auto;display:flex;flex-direction:column;align-items:flex-start;gap:2px;max-width:min(340px,70vw);padding:8px 12px;border:1px solid var(--dsw-alias-border-l3);border-radius:12px;background:var(--dsw-specific-menu);box-shadow:var(--dsw-elevation-prominent);cursor:pointer;text-align:left;animation:aboard-toastIn .18s ease}.aboard-toast:hover{background:var(--dsw-alias-fill-l2)}@keyframes aboard-toastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}.aboard-toastTitle{font-size:11px;line-height:14px;font-weight:600;color:var(--dsw-alias-state-success-primary)}.aboard-toastBody{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:16px;color:var(--dsw-alias-label-primary)}.aboard-segment:disabled{cursor:default;opacity:.5}.aboard-switch{position:relative;flex:none;width:34px;height:18px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-fill-l2);cursor:pointer;padding:0;transition:background .15s,border-color .15s}.aboard-switch[aria-checked='true']{background:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}.aboard-switch::after{content:'';position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:999px;background:var(--dsw-alias-label-tertiary);opacity:1;transition:transform .15s,background .15s}.aboard-switch[aria-checked='true']::after{transform:translateX(16px);background:var(--dsw-specific-menu);opacity:1}.aboard-switch:disabled{opacity:.45;cursor:default}";
		const tagId = "dsh-agents-board/board.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-agents-board";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		//#endregion
		//#region lib/types/client/board-model.js
		const { StateDot, IconCloseOutline16 } = primitives;
		/** Self-contained toggle switch. The harness primitives package no
		 * longer ships a Switch component; destructuring it yielded undefined,
		 * the settings card then called createElement(undefined) and React
		 * error #130 blacked out every plugin card on the Plugins tab. The
		 * board carries its own switch so its card can never die that way. */
		function Switch(props) {
			return react.createElement("button", {
				type: "button",
				role: "switch",
				className: "aboard-switch",
				"aria-checked": props.checked === true,
				"aria-label": props.label,
				disabled: props.disabled === true,
				onClick: () => {
					if (props.disabled !== true) props.onChange(!(props.checked === true));
				}
			});
		}
		/** Disjoint token buckets; reasoning tokens already ride `outputTokens`. */
		function totalTokens(usage) {
			if (!usage) return 0;
			return (usage.uncachedInputTokens || 0) + (usage.outputTokens || 0) + (usage.cacheReadTokens || 0) + (usage.cacheWriteTokens || 0);
		}
		/**
		 * Context occupancy percent from the newest pressure record.
		 * @returns {number|undefined} 0..100, or undefined while unmeasured.
		 */
		function contextPercent(pressure) {
			if (!pressure) return undefined;
			const used = pressure.projectedTokens ?? pressure.pressureTokens;
			if (!used || !pressure.contextWindow) return undefined;
			return Math.max(0, Math.min(100, Math.round((used / pressure.contextWindow) * 100)));
		}
		/** Progress fill class: green below 60%, yellow 60-89%, red at 90% and above. */
		function progressClass(percent) {
			if (percent >= 90) return "aboard-progressHot";
			if (percent >= 60) return "aboard-progressWarn";
			return "aboard-progressOk";
		}
		/**
		 * Subagent descendant counts per possible parent (ui-subagent lineage projection, inlined).
		 * @param {Record<string, {id:string, parentId?:string, origin?:'subagent', running:boolean}>} summaries
		 * @returns {Map<string, {count:number, runningCount:number}>}
		 */
		function indexSubagentDescendants(summaries) {
			const indexed = new Map();
			for (const descendant of Object.values(summaries)) {
				if (!descendant || descendant.origin !== "subagent") continue;
				const seen = new Set();
				let current = descendant;
				while (current && current.origin === "subagent" && current.parentId !== undefined && !seen.has(current.id)) {
					seen.add(current.id);
					const aggregate = indexed.get(current.parentId);
					if (aggregate === undefined) indexed.set(current.parentId, { count: 1, runningCount: descendant.running ? 1 : 0 });
					else {
						aggregate.count += 1;
						if (descendant.running) aggregate.runningCount += 1;
					}
					current = summaries[current.parentId];
				}
			}
			return indexed;
		}
		/**
		 * Pure board derivation over the sessions mirror.
		 * @param {object} list - SessionListState snapshot.
		 * @param {readonly string[]} archivedIds - registry-global archive set.
		 * @param {ReadonlyMap<string, unknown>} pending - pending interactions by session.
		 * @returns {{columns:{running:any[],done:any[],archive:any[]}, runningCount:number, tokensTotal:number, waiting:number, descendants:Map<any, any>}}
		 */
		function deriveBoard(list, archivedIds, pending) {
			const archived = new Set(archivedIds || []);
			const byId = list?.byId || {};
			const columns = { running: [], done: [], archive: [] };
			let tokensTotal = 0;
			let runningCount = 0;
			for (const id of list?.ids || []) {
				const row = byId[id];
				if (!row || row.blank) continue;
				tokensTotal += totalTokens(row.projectionValues && row.projectionValues.tokenUsage);
				const isArchived = archived.has(id);
				const running = row.running === true;
				if (running && !isArchived) runningCount += 1;
				// Finished subagents are results, not tasks: they clutter Done,
				// and crashed ones pile up in Archive. A stopped subagent leaves
				// every column; the parent card still counts it via the subagent
				// badge. Only origin==="subagent" rows are filtered — a running
				// subagent shows in Working (or Archive if it got archived).
				if (!running && row.origin === "subagent") continue;
				if (isArchived) columns.archive.push(row);
				else if (running) columns.running.push(row);
				else columns.done.push(row);
			}
			for (const key of ["running", "done", "archive"]) {
				columns[key].sort((left, right) => right.updatedAt - left.updatedAt);
			}
			return {
				columns,
				runningCount,
				tokensTotal,
				waiting: pending ? pending.size : 0,
				descendants: indexSubagentDescendants(byId),
			};
		}
		/** Human duration: "1h 2m", "3m 40s", "12s". */
		function formatDuration(ms) {
			const total = Math.max(0, Math.floor((ms || 0) / 1000));
			if (total <= 0) return "";
			const hours = Math.floor(total / 3600);
			const minutes = Math.floor((total % 3600) / 60);
			const seconds = total % 60;
			if (hours > 0) return hours + "h " + minutes + "m";
			if (minutes > 0) return minutes + "m " + seconds + "s";
			return seconds + "s";
		}
		//#endregion
		//#region lib/types/client/panel-layout.js
		/** localStorage key carrying the board window's size and position. */
		const LAYOUT_KEY = "agents-board.layout";
		const MIN_WIDTH = 560;
		const MIN_HEIGHT = 360;
		function clampBetween(value, min, max) {
			return Math.min(Math.max(value, min), Math.max(min, max));
		}
		/** The pre-drag default: the historical 1080x720 panel, centered and clamped. */
		function defaultLayout() {
			const width = Math.min(1080, Math.max(MIN_WIDTH, window.innerWidth - 32));
			const height = Math.min(720, Math.max(MIN_HEIGHT, window.innerHeight - 32));
			return {
				width,
				height,
				left: Math.max(8, Math.floor((window.innerWidth - width) / 2)),
				top: Math.max(8, Math.floor((window.innerHeight - height) / 2))
			};
		}
		/**
		 * Restore the persisted window layout, clamped to the current viewport.
		 * @returns {{width:number, height:number, left:number, top:number}|undefined} undefined when nothing usable is stored.
		 */
		function readLayout() {
			try {
				const raw = localStorage.getItem(LAYOUT_KEY);
				if (!raw) return undefined;
				const parsed = JSON.parse(raw);
				if (!parsed || typeof parsed !== "object") return undefined;
				const vw = window.innerWidth;
				const vh = window.innerHeight;
				const width = clampBetween(Number(parsed.width), MIN_WIDTH, vw - 16);
				const height = clampBetween(Number(parsed.height), MIN_HEIGHT, vh - 16);
				const left = clampBetween(Number(parsed.left), Math.min(8, vw - 120), vw - 120);
				const top = clampBetween(Number(parsed.top), 0, vh - 40);
				if (![width, height, left, top].every(Number.isFinite)) return undefined;
				return { width, height, left, top };
			} catch {
				// Unreadable storage (private mode, quota): fall back to the default layout.
				return undefined;
			}
		}
		function writeLayout(layout) {
			try {
				localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
			} catch {
				// Unwritable storage keeps the layout session-only.
			}
		}
		/** One active drag/resize gesture, seeded with the pointer origin and the layout snapshot. */
		function applyGesture(prev, gesture, clientX, clientY) {
			const dx = clientX - gesture.startX;
			const dy = clientY - gesture.startY;
			const vw = window.innerWidth;
			const vh = window.innerHeight;
			if (gesture.mode === "move") {
				return {
					...prev,
					left: clampBetween(gesture.start.left + dx, -(prev.width - 120), vw - 120),
					top: clampBetween(gesture.start.top + dy, 0, vh - 40)
				};
			}
			const next = { ...prev };
			if (gesture.mode === "resize-e" || gesture.mode === "resize-se") {
				next.width = clampBetween(gesture.start.width + dx, MIN_WIDTH, vw - prev.left - 8);
			}
			if (gesture.mode === "resize-s" || gesture.mode === "resize-se") {
				next.height = clampBetween(gesture.start.height + dy, MIN_HEIGHT, vh - prev.top - 8);
			}
			return next;
		}
		//#endregion
		//#region lib/types/client/hidden-archive.js
		/** localStorage key holding the client-only hidden-session id list. */
		const HIDDEN_KEY = "agents-board.hidden";
		/**
		 * Read the client-only hidden set. The board's Archive column stays the
		 * registry archive; this list only hides rows from view on this browser.
		 * @returns {Set<string>} hidden session ids.
		 */
		function readHidden() {
			try {
				const raw = localStorage.getItem(HIDDEN_KEY);
				if (!raw) return new Set();
				const parsed = JSON.parse(raw);
				if (!Array.isArray(parsed)) return new Set();
				return new Set(parsed.filter((entry) => typeof entry === "string"));
			} catch {
				// Unreadable storage: show everything rather than losing rows.
				return new Set();
			}
		}
		function writeHidden(hidden) {
			try {
				localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hidden]));
			} catch {
				// Unwritable storage keeps hiding session-only.
			}
		}
		/** Toggle one id out of (or back into) the client-only hidden set. */
		function toggleHidden(hidden, id) {
			const next = new Set(hidden);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			writeHidden(next);
			return next;
		}
		//#endregion
		//#region lib/types/client/exit-animation.js
		/** Fade phase length in ms. */
		const EXIT_FADE_MS = 240;
		/** Collapse phase length in ms. */
		const EXIT_COLLAPSE_MS = 220;
		/** Flex gap between stacked cards, compensated by a negative bottom margin. */
		const EXIT_GAP_PX = 6;
		/**
		 * Two-phase exit via the Web Animations API: fade out, then collapse the
		 * measured height to zero (rows below ride the shrink), then `commit`
		 * applies the action. WAAPI is used instead of CSS transitions so the
		 * explicit computed start values cannot be skipped. Deliberately no
		 * reduced-motion shortcut: the dissolve is the requested feedback. If the
		 * verb leaves the row mounted (a failed archive), the fill animations are
		 * cancelled so the card fades back in.
		 * @returns {[object, (commit: () => void) => void]} [cardRef, beginExit]
		 */
		function useExitAnimation() {
			const cardRef = react.useRef(null);
			const commitRef = react.useRef(null);
			const animRef = react.useRef([]);
			react.useEffect(() => () => {
				for (const animation of animRef.current) animation.cancel();
				animRef.current = [];
				const pending = commitRef.current;
				commitRef.current = null;
				if (pending) pending();
			}, []);
			const beginExit = (commit) => {
				const el = cardRef.current;
				if (!el || commitRef.current !== null) return;
				if (typeof el.animate !== "function") {
					commit();
					return;
				}
				commitRef.current = commit;
				el.style.overflow = "hidden";
				const fade = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: EXIT_FADE_MS, easing: "ease", fill: "forwards" });
				animRef.current = [fade];
				fade.onfinish = () => {
					if (commitRef.current === null) return;
					const cs = window.getComputedStyle(el);
					const collapse = el.animate([
						{
							height: cs.height,
							marginBottom: "0px",
							paddingTop: cs.paddingTop,
							paddingBottom: cs.paddingBottom,
							borderTopWidth: cs.borderTopWidth,
							borderBottomWidth: cs.borderBottomWidth,
							opacity: 0
						},
						{
							height: "0px",
							marginBottom: "-" + EXIT_GAP_PX + "px",
							paddingTop: "0px",
							paddingBottom: "0px",
							borderTopWidth: "0px",
							borderBottomWidth: "0px",
							opacity: 0
						}
					], { duration: EXIT_COLLAPSE_MS, easing: "ease", fill: "forwards" });
					animRef.current = [collapse];
					collapse.onfinish = () => {
						const pending = commitRef.current;
						commitRef.current = null;
						animRef.current = [];
						if (pending) pending();
						// React removes the committed row on its next render (and an
						// archive RPC round-trip may come later), so restoring a card
						// whose verb is still in flight would flash it back to full
						// size first. Re-check after React has surely settled; if the
						// row survived (failed archive), it then fades back in.
						setTimeout(() => {
							if (el.isConnected) {
								el.style.overflow = "";
								collapse.cancel();
							}
						}, 300);
					};
				};
			};
			return [cardRef, beginExit];
		}
		/**
		 * Reverse of the exit: a revealed hidden row grows out of the collapsed
		 * state while fading in. Run right after mount (before paint) so the row
		 * never flashes at full size.
		 * @param {HTMLElement} el - the freshly mounted card node.
		 */
		function playEnterAnimation(el) {
			if (!el || typeof el.animate !== "function") return;
			const cs = window.getComputedStyle(el);
			el.style.overflow = "hidden";
			const animation = el.animate([
				{
					height: "0px",
					opacity: 0,
					paddingTop: "0px",
					paddingBottom: "0px",
					borderTopWidth: "0px",
					borderBottomWidth: "0px",
					marginBottom: "-" + EXIT_GAP_PX + "px"
				},
				{
					height: cs.height,
					opacity: 1,
					paddingTop: cs.paddingTop,
					paddingBottom: cs.paddingBottom,
					borderTopWidth: cs.borderTopWidth,
					borderBottomWidth: cs.borderBottomWidth,
					marginBottom: "0px"
				}
			], { duration: EXIT_FADE_MS + EXIT_COLLAPSE_MS, easing: "ease" });
			animation.onfinish = () => {
				el.style.overflow = "";
				animation.cancel();
			};
		}
		/**
		 * Same dissolve as the card buttons use, but self-contained: no commit and
		 * no restore-on-failure — the caller removes the node (or cancels) after
		 * the collapse. Returns a cancel function that restores the card, used
		 * when a re-reveal interrupts the exit.
		 * @param {HTMLElement} el - the card node leaving the hidden group.
		 * @returns {(() => void) | null} cancel function, or null when unsupported.
		 */
		function playExitAnimation(el) {
			if (!el || typeof el.animate !== "function") return null;
			const cs = window.getComputedStyle(el);
			el.style.overflow = "hidden";
			const fade = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: EXIT_FADE_MS, easing: "ease", fill: "forwards" });
			const collapse = el.animate([
				{
					height: cs.height,
					marginBottom: "0px",
					paddingTop: cs.paddingTop,
					paddingBottom: cs.paddingBottom,
					borderTopWidth: cs.borderTopWidth,
					borderBottomWidth: cs.borderBottomWidth,
					opacity: 0
				},
				{
					height: "0px",
					marginBottom: "-" + EXIT_GAP_PX + "px",
					paddingTop: "0px",
					paddingBottom: "0px",
					borderTopWidth: "0px",
					borderBottomWidth: "0px",
					opacity: 0
				}
			], { duration: EXIT_COLLAPSE_MS, delay: EXIT_FADE_MS, easing: "ease", fill: "forwards" });
			return () => {
				fade.cancel();
				collapse.cancel();
				el.style.overflow = "";
			};
		}
		//#endregion
		//#region lib/types/client/locales.js
		/** English dictionary — the fallback terminus of every locale chain. */
		const en = {
			"board.title": "Agents board",
			"board.close": "Close",
			"board.resize": "Drag to resize",
			"board.showHidden": "Show hidden ({count})",
			"board.hideHidden": "Hide shown ({count})",
			"board.hiddenLabel": "Hidden",
			"col.running": "Working",
			"col.done": "Done",
			"col.archive": "Archive",
			"col.empty": "Nothing here",
			"counter.running": "{count} working",
			"counter.waiting": "{count} awaiting reply",
			"counter.tokens": "{count} tokens total",
			"card.waiting": "awaiting reply",
			"card.steps": "{count} steps",
			"card.turns": "{count} turns",
			"card.context": "context {percent}%",
			"card.contextUnknown": "context —",
			"card.tokens": "{count} tokens",
			"card.llm": "LLM {duration}",
			"card.subagents": "subagents: {count} ({running} running)",
			"card.parent": "subagent of {parent}",
			"card.mode": "Mode: {mode}",
			"card.archive": "Archive",
			"card.hide": "Hide",
			"card.restore": "Restore",
			"time.now": "just now",
			"time.minAgo": "{count} min ago",
			"time.hourAgo": "{count} h ago",
			"time.dayAgo": "{count} d ago",
			"time.date": "{date}",
			"settings.title": "Agents board",
			"settings.description": "Sidebar button and overlay panel listing every agent: steps, context, tokens, subagents.",
			"settings.switch": "Show the agents board",
			"settings.language": "Language",
			"settings.languageAuto": "Auto",
			"settings.notify": "Notify when an agent finishes",
			"notify.title": "Agent finished a task",
			"notify.pending": "Agent awaits your reply",
			"settings.sound": "Audio via",
			"settings.soundBrowser": "Browser",
			"settings.soundWav": "Windows + device",
			"settings.soundProcess": "Windows process",
			"settings.device": "Output device",
			"settings.deviceDefault": "System default",
			"settings.deviceNone": "no list",
			"settings.test": "Test"
		};
		/** Russian dictionary, key-identical to the English source of truth. */
		const ru = {
			"board.title": "Доска агентов",
			"board.close": "Закрыть",
			"board.resize": "Потяните, чтобы изменить размер",
			"board.showHidden": "Показать скрытые ({count})",
			"board.hideHidden": "Скрыть показанные ({count})",
			"board.hiddenLabel": "Скрытые",
			"col.running": "В работе",
			"col.done": "Готово",
			"col.archive": "Архив",
			"col.empty": "Пусто",
			"counter.running": "{count} работают",
			"counter.waiting": "{count} ждут ответа",
			"counter.tokens": "{count} токенов всего",
			"card.waiting": "ждёт ответа",
			"card.steps": "{count} шагов",
			"card.turns": "{count} ходов",
			"card.context": "контекст {percent}%",
			"card.contextUnknown": "контекст —",
			"card.tokens": "{count} токенов",
			"card.llm": "LLM {duration}",
			"card.subagents": "субагентов: {count} ({running} в работе)",
			"card.parent": "субагент «{parent}»",
			"card.mode": "Режим: {mode}",
			"card.archive": "В архив",
			"card.hide": "Скрыть",
			"card.restore": "Вернуть",
			"time.now": "только что",
			"time.minAgo": "{count} мин назад",
			"time.hourAgo": "{count} ч назад",
			"time.dayAgo": "{count} дн назад",
			"time.date": "{date}",
			"settings.title": "Доска агентов",
			"settings.description": "Кнопка в сайдбаре и панель со всеми агентами: шаги, контекст, токены, субагенты.",
			"settings.switch": "Показывать доску агентов",
			"settings.language": "Язык",
			"settings.languageAuto": "Авто",
			"settings.notify": "Уведомлять о завершении задачи",
			"notify.title": "Агент завершил задачу",
			"notify.pending": "Агент ждёт вашего ответа",
			"settings.sound": "Озвучивание через",
			"settings.soundBrowser": "Браузер",
			"settings.soundWav": "Windows + устройство",
			"settings.soundProcess": "Процесс Windows",
			"settings.device": "Устройство вывода",
			"settings.deviceDefault": "Системное по умолчанию",
			"settings.deviceNone": "нет списка",
			"settings.test": "Проба"
		};
		//#endregion
		//#region lib/types/client/components.js
		/** Stable empty map identity for sessions snapshots without pending interactions. */
		const NO_PENDING = new Map();
		/** Pick the dictionary for an explicit language; falls back to English. */
		function makeT(lang) {
			const dict = lang === "ru" ? ru : en;
			return (key, params) => {
				let text = dict[key] !== undefined ? dict[key] : en[key] !== undefined ? en[key] : key;
				if (params) {
					for (const name of Object.keys(params)) {
						text = text.split("{" + name + "}").join(String(params[name]));
					}
				}
				return text;
			};
		}
		/** `auto` (the default) means English; explicit ru overrides, everything else stays English. */
		function resolveT(board, seatT) {
			if (board.status === "ready") {
				const language = board.value && board.value.language;
				return makeT(language === "ru" ? "ru" : "en");
			}
			return seatT;
		}
		function relativeTime(updatedAt, t) {
			if (!updatedAt) return "";
			const minutes = Math.floor((Date.now() - updatedAt) / 60000);
			if (minutes < 1) return t("time.now");
			if (minutes < 60) return t("time.minAgo", { count: minutes });
			const hours = Math.floor(minutes / 60);
			if (hours < 24) return t("time.hourAgo", { count: hours });
			const days = Math.floor(hours / 24);
			if (days < 7) return t("time.dayAgo", { count: days });
			return t("time.date", { date: new Date(updatedAt).toLocaleDateString() });
		}
		/**
		 * One session card: 1) title 2) data 3) context percent 4) progress bar.
		 * The bar renders on every card; an unmeasured session shows an empty track.
		 * Hover actions: archive (done cards) / unhide (archive cards).
		 * @param {object} props - { row, t, list, pending, descendants, actions, isArchived }
		 */
		function EntryCard({ row, t, list, pending, descendants, actions, isArchived, hiddenSet, showingHidden, restoredSet, onRestored, exitingSet }) {
			const values = row.projectionValues || {};
			const stats = values.sessionStats;
			const percent = contextPercent(values.contextPressure);
			const usage = values.tokenUsage;
			const sub = descendants.get(row.id);
			const parent = row.origin === "subagent" && row.parentId !== undefined
				? (list.byId[row.parentId] ? list.byId[row.parentId].displayTitle : row.parentId)
				: undefined;
			const meta = [];
			if (stats && (stats.steps > 0 || stats.turns > 0)) {
				meta.push(t("card.steps", { count: stats.steps }) + " · " + t("card.turns", { count: stats.turns }));
			}
			if (usage) meta.push(t("card.tokens", { count: totalTokens(usage).toLocaleString() }));
			const when = relativeTime(row.updatedAt, t);
			if (when) meta.push(when);
			if (stats && stats.llmMs > 0) meta.push(t("card.llm", { duration: formatDuration(stats.llmMs) }));
			const [cardRef, beginExit] = useExitAnimation();
			// Only the Archive column passes the sets; other columns stay undefined
			// and simply never count as hidden or restored.
			const isHiddenRow = hiddenSet !== undefined && hiddenSet.has(row.id);
			const isRestored = restoredSet !== undefined && restoredSet.has(row.id) && !isHiddenRow;
			// A hidden row is only mounted while revealed; grow it in on mount.
			// React reuses this instance when the row later moves to the visible
			// group (stable key), so the restore needs its own effect below.
			react.useLayoutEffect(() => {
				if (!isHiddenRow || showingHidden !== true) return;
				if (cardRef.current) playEnterAnimation(cardRef.current);
			}, []);
			// Grow the card in at its destination right after the restore commit,
			// then drop the marker so the animation plays once per restore.
			react.useLayoutEffect(() => {
				if (!isRestored) return;
				if (cardRef.current) playEnterAnimation(cardRef.current);
				const timer = setTimeout(() => onRestored(row.id), EXIT_FADE_MS + EXIT_COLLAPSE_MS + 60);
				return () => clearTimeout(timer);
			}, [isRestored]);
			// Dissolve out when the row joins the exiting batch ("Hide shown").
			const isExiting = exitingSet !== undefined && exitingSet.has(row.id);
			react.useLayoutEffect(() => {
				if (!isExiting || !cardRef.current) return;
				const cancel = playExitAnimation(cardRef.current);
				return cancel === null ? undefined : cancel;
			}, [isExiting]);
			const isWaiting = pending.has(row.id);
			// The green mark is the session manager's own completed bit (the same
			// signal the sidebar dot reads). A page resync can re-arm the bit for
			// an already-viewed completion, so the fill also requires unseen
			// steps: a genuinely new finish always adds assistant steps, a
			// replayed bit does not.
			const rowSteps = stats && typeof stats.steps === "number" ? stats.steps : 0;
			const seenSteps = actions.doneSeen ? actions.doneSeen.get(row.id) : undefined;
			const peakSteps = actions.donePeak ? actions.donePeak.get(row.id) : undefined;
			const freshSteps = Math.max(typeof peakSteps === "number" ? peakSteps : 0, rowSteps);
			const isFreshFinish = !isWaiting && !isArchived && row.completed === true
				&& (!(typeof seenSteps === "number") || seenSteps < freshSteps);
			return react.createElement("button", {
				type: "button",
				ref: cardRef,
				className: isWaiting ? "aboard-card aboard-cardWaiting" : isFreshFinish ? "aboard-card aboard-cardFinished" : "aboard-card",
				onClick: () => actions.openSession(row.id)
			},
				react.createElement("span", { className: "aboard-cardTitleRow" },
					react.createElement(StateDot, { state: isArchived ? "idle" : row.running ? "ongoing" : "done", size: 8 }),
					react.createElement("span", { className: "aboard-cardName", title: row.displayTitle }, row.displayTitle),
					pending.has(row.id) ? react.createElement("span", { className: "aboard-cardPending" }, t("card.waiting")) : null,
					typeof values.agentPreset === "string" && values.agentPreset !== "" ? react.createElement("span", {
						className: "aboard-cardMode",
						title: t("card.mode", { mode: values.agentPreset })
					}, values.agentPreset) : null,
					react.createElement("span", { className: "aboard-cardActions" },
						isArchived
							? react.createElement("button", {
								type: "button",
								className: "aboard-cardAction",
								onClick: (event) => {
									event.stopPropagation();
									// A hidden row never dissolves on restore — it grows back
									// in at its destination via the restoreSession marker.
									if (isHiddenRow) actions.restoreSession(row.id);
									else beginExit(() => actions.hideSession(row.id));
								}
							}, isHiddenRow ? t("card.restore") : t("card.hide"))
							: !row.running
								? react.createElement("button", {
									type: "button",
									className: "aboard-cardAction",
									onClick: (event) => {
										event.stopPropagation();
										beginExit(() => actions.archiveSession(row.id));
									}
								}, t("card.archive"))
								: null
					)
				),
				react.createElement("span", { className: "aboard-cardMeta" }, meta.map((text, index) => react.createElement("span", { key: index }, text))),
				react.createElement("span", { className: "aboard-cardContext" },
					percent === undefined ? t("card.contextUnknown") : t("card.context", { percent })
				),
				react.createElement("span", {
					className: "aboard-progress",
					role: "progressbar",
					"aria-valuemin": 0,
					"aria-valuemax": 100,
					"aria-valuenow": percent === undefined ? 0 : percent
				},
					react.createElement("span", {
						className: "aboard-progressFill" + (percent === undefined ? "" : " " + progressClass(percent)),
						style: { width: (percent === undefined ? 0 : percent) + "%" }
					})
				),
				sub && sub.count > 0 ? react.createElement("span", { className: "aboard-cardSub" }, t("card.subagents", { count: sub.count, running: sub.runningCount })) : null,
				parent ? react.createElement("span", { className: "aboard-cardSub" }, t("card.parent", { parent })) : null
			);
		}
		/**
		 * One board column: header with count plus the card stack. The archive
		 * column also renders the show-hidden toggle when rows are hidden.
		 */
		function Column({ titleKey, rows, emptyKey, isArchived, hiddenCount, showingHidden, onToggleShowHidden, hiddenSet, hiddenStart, restoredSet, onRestored, exitingSet, ...cardProps }) {
			const t = cardProps.t;
			// Hidden rows render below the visible ones, behind a labeled divider.
			const children = [];
			rows.forEach((row, index) => {
				if (isArchived && hiddenStart >= 0 && index === hiddenStart) {
					children.push(react.createElement("div", { className: "aboard-hiddenDivider", key: "aboard-hidden-divider" }, t("board.hiddenLabel")));
				}
				children.push(react.createElement(EntryCard, {
					key: row.id,
					row,
					isArchived,
					t: cardProps.t,
					list: cardProps.list,
					pending: cardProps.pending,
					descendants: cardProps.descendants,
					actions: cardProps.actions,
					hiddenSet,
					showingHidden,
					restoredSet,
					onRestored,
					exitingSet
				}));
			});
			return react.createElement("section", { className: "aboard-column" },
				react.createElement("header", { className: "aboard-columnHead" },
					react.createElement("span", null, t(titleKey)),
					react.createElement("span", { className: "aboard-columnCount" }, String(rows.length))
				),
				// The hidden toggle leads the column body and stays pinned under the
				// header while the list scrolls beneath it.
				isArchived && hiddenCount > 0
					? react.createElement("div", { className: "aboard-hiddenBar" },
						react.createElement("button", {
							type: "button",
							className: "aboard-hiddenToggle",
							onClick: onToggleShowHidden
						}, showingHidden ? t("board.hideHidden", { count: hiddenCount }) : t("board.showHidden", { count: hiddenCount }))
					)
					: null,
				react.createElement("div", { className: "aboard-columnBody" },
					rows.length === 0
						? react.createElement("p", { className: "aboard-empty" }, t(emptyKey))
						: children
				)
			);
		}
		/** The overlay surface once the board is open; owns the data hooks. */
		function BoardSurface(props) {
			const list = props.useSessions(identity);
			const workspaces = props.useWorkspaces(identity);
			const pending = props.useSessionPendingInteraction(identity) || NO_PENDING;
			const board = props.useBoard(identity);
			const t = resolveT(board, props.t);
			const [layout, setLayout] = react.useState(() => readLayout() || defaultLayout());
			const gesture = react.useRef(null);
			const [hidden, setHidden] = react.useState(() => readHidden());
			// Rows just restored from the hidden group: they replay the enter
			// animation at their destination once, then the marker is dropped.
			const [restored, setRestored] = react.useState(() => new Set());
			const restoredRef = react.useRef(new Set());
			// Hidden rows playing their exit dissolve after "Hide shown": they stay
			// mounted (showingHidden held true) until the collapse finishes.
			const [exiting, setExiting] = react.useState(() => new Set());
			const exitingTimerRef = react.useRef(null);
			react.useEffect(() => () => {
				if (exitingTimerRef.current !== null) clearTimeout(exitingTimerRef.current);
			}, []);
			const [showingHidden, setShowingHidden] = react.useState(false);
			const [tick, setTick] = react.useState(0);
			react.useEffect(() => {
				const timer = setInterval(() => setTick((value) => value + 1), 30000);
				return () => { clearInterval(timer); };
			}, []);
			react.useEffect(() => {
				const onKey = (event) => {
					if (event.key === "Escape") props.actions.closeBoard();
				};
				window.addEventListener("keydown", onKey);
				return () => { window.removeEventListener("keydown", onKey); };
			}, [props.actions]);
			// Keep a persisted layout inside the viewport when the window shrinks.
			react.useEffect(() => {
				const onResize = () => {
					setLayout((prev) => {
						const next = {
							width: clampBetween(prev.width, MIN_WIDTH, window.innerWidth - 16),
							height: clampBetween(prev.height, MIN_HEIGHT, window.innerHeight - 16),
							left: clampBetween(prev.left, Math.min(8, window.innerWidth - 120), window.innerWidth - 120),
							top: clampBetween(prev.top, 0, Math.max(0, window.innerHeight - 40))
						};
						return next.width === prev.width && next.height === prev.height && next.left === prev.left && next.top === prev.top ? prev : next;
					});
				};
				window.addEventListener("resize", onResize);
				return () => { window.removeEventListener("resize", onResize); };
			}, []);
			const model = react.useMemo(
				() => deriveBoard(list, workspaces ? workspaces.archivedSessionIds : [], pending),
				[list, workspaces, pending]
			);
			// Client-only view hiding: filtered copies keep the counts registry-true.
			// `showingHidden` appends the hidden rows BELOW the visible ones — never
			// mixed — so the two groups stay separated inside the Archive column.
			const visible = react.useMemo(() => {
				const notHidden = model.columns.archive.filter((row) => !hidden.has(row.id));
				const hiddenRows = model.columns.archive.filter((row) => hidden.has(row.id));
				// While the exit dissolve plays, only the leaving rows stay mounted;
				// anything else removed from the hidden set mid-exit moves at once.
				const shownHiddenRows = exiting.size > 0 ? hiddenRows.filter((row) => exiting.has(row.id)) : hiddenRows;
				const filter = (rows) => rows.filter((row) => showingHidden || !hidden.has(row.id));
				return {
					columns: {
						running: filter(model.columns.running),
						done: filter(model.columns.done),
						archive: showingHidden ? [...notHidden, ...shownHiddenRows] : notHidden
					},
					hiddenArchiveCount: hiddenRows.length,
					hiddenStart: showingHidden ? notHidden.length : -1
				};
			}, [model, hidden, showingHidden, exiting]);
			const toggleShowHidden = () => {
				if (exiting.size > 0) return; // exit dissolve already in progress
				if (showingHidden !== true) {
					setShowingHidden(true);
					return;
				}
				// Toggle-off: hold the hidden group mounted one more pass, play the
				// exit dissolve, then commit the collapse to the hidden state.
				const ids = new Set();
				for (const row of model.columns.archive) if (hidden.has(row.id)) ids.add(row.id);
				setExiting(ids);
				exitingTimerRef.current = setTimeout(() => {
					exitingTimerRef.current = null;
					setExiting(new Set());
					setShowingHidden(false);
				}, EXIT_FADE_MS + EXIT_COLLAPSE_MS + 60);
			};
			const cardProps = {
				t,
				list,
				pending,
				descendants: model.descendants,
				// archiveSession comes from the inject face (apply); hideSession is view-local.
				actions: {
					...props.actions,
					hideSession: (id) => {
						setHidden((prev) => toggleHidden(prev, id));
					},
					// Marking BEFORE the hidden-set update: the same render that moves
					// the row into the visible group also arms its restore animation.
					restoreSession: (id) => {
						restoredRef.current.add(id);
						setRestored(new Set(restoredRef.current));
						setHidden((prev) => {
							const next = new Set(prev);
							next.delete(id);
							writeHidden(next);
							return next;
						});
					},
					onRestoredDone: (id) => {
						restoredRef.current.delete(id);
						setRestored(new Set(restoredRef.current));
					}
				}
			};
			const beginGesture = (mode) => (event) => {
				if (event.button !== 0) return;
				if (mode === "move" && typeof event.target.closest === "function" && event.target.closest("button")) return;
				event.preventDefault();
				gesture.current = { mode, startX: event.clientX, startY: event.clientY, start: layout };
				const onMove = (moveEvent) => {
					const active = gesture.current;
					if (!active) return;
					setLayout((prev) => applyGesture(prev, active, moveEvent.clientX, moveEvent.clientY));
				};
				const onUp = () => {
					gesture.current = null;
					window.removeEventListener("pointermove", onMove);
					window.removeEventListener("pointerup", onUp);
				};
				window.addEventListener("pointermove", onMove);
				window.addEventListener("pointerup", onUp);
			};
			react.useEffect(() => {
				writeLayout(layout);
			}, [layout]);
			return react.createElement("div", {
				className: "aboard-backdrop",
				onClick: (event) => {
					if (event.target === event.currentTarget) props.actions.closeBoard();
				}
			},
				react.createElement("div", {
					className: "aboard-panel",
					role: "dialog",
					"aria-label": t("board.title"),
					style: {
						left: layout.left + "px",
						top: layout.top + "px",
						width: layout.width + "px",
						height: layout.height + "px"
					}
				},
					react.createElement("header", { className: "aboard-header", onPointerDown: beginGesture("move") },
						react.createElement("h2", { className: "aboard-title" }, t("board.title")),
						react.createElement("div", { className: "aboard-counters" },
							react.createElement("span", { className: "aboard-counter" },
								react.createElement(StateDot, { state: model.runningCount > 0 ? "ongoing" : "idle", size: 8 }),
								t("counter.running", { count: model.runningCount })
							),
							react.createElement("span", { className: "aboard-counter" },
								react.createElement(StateDot, { state: model.waiting > 0 ? "warning" : "idle", size: 8 }),
								t("counter.waiting", { count: model.waiting })
							),
							react.createElement("span", { className: "aboard-counter" }, t("counter.tokens", { count: model.tokensTotal.toLocaleString() }))
						),
						react.createElement("button", {
							type: "button",
							className: "aboard-close",
							"aria-label": t("board.close"),
							onClick: props.actions.closeBoard
						}, react.createElement(IconCloseOutline16, { size: 16 }))
					),
					react.createElement("div", { className: "aboard-columns" },
						react.createElement(Column, { titleKey: "col.running", emptyKey: "col.empty", rows: visible.columns.running, isArchived: false, ...cardProps }),
						react.createElement(Column, { titleKey: "col.done", emptyKey: "col.empty", rows: visible.columns.done, isArchived: false, ...cardProps }),
						react.createElement(Column, {
							titleKey: "col.archive",
							emptyKey: "col.empty",
							rows: visible.columns.archive,
							isArchived: true,
							hiddenCount: visible.hiddenArchiveCount,
							showingHidden,
							onToggleShowHidden: toggleShowHidden,
							hiddenSet: hidden,
							hiddenStart: visible.hiddenStart,
							restoredSet: restored,
							onRestored: props.actions.onRestoredDone,
							exitingSet: exiting,
							...cardProps
						})
					),
					react.createElement("span", { className: "aboard-grip aboard-gripE", onPointerDown: beginGesture("resize-e") }),
					react.createElement("span", { className: "aboard-grip aboard-gripS", onPointerDown: beginGesture("resize-s") }),
					react.createElement("span", { className: "aboard-grip aboard-gripSe", onPointerDown: beginGesture("resize-se"), title: t("board.resize") })
				)
			);
		}
		/** Overlay gate: hooks stay unconditional, then render null when closed or disabled. */
		function BoardOverlay(props) {
			const view = props.useView(identity);
			const board = props.useBoard(identity);
			if (!view.open || !isEnabled(board)) return null;
			return react.createElement(BoardSurface, props);
		}
		/** Sidebar footer toggle: icon dot in the rail, dot + label when expanded. */
		function BoardButton(props) {
			const view = props.useView(identity);
			const board = props.useBoard(identity);
			const runningCount = countRunning(props.useSessions(identity));
			const t = resolveT(board, props.t);
			if (!isEnabled(board)) return null;
			return react.createElement("button", {
				type: "button",
				className: "aboard-button",
				"aria-label": t("board.title"),
				"aria-expanded": view.open,
				onClick: props.actions.openBoard
			},
				react.createElement(StateDot, { state: runningCount > 0 ? "ongoing" : "idle", size: 8 }),
				props.wide ? react.createElement("span", { className: "aboard-buttonLabel" }, t("board.title")) : null
			);
		}
		/** Settings → Plugins card: language, board switch, notifications, audio output. */
		function BoardSettingsCard(props) {
			const board = props.useBoard(identity);
			// WinMM render devices, fetched from the host once notify turns on.
			const [devices, setDevices] = react.useState(null);
			// Last local pick: the select and the Test probe answer instantly,
			// without waiting for the settings mirror round-trip.
			const [probeDev, setProbeDev] = react.useState(null);
			react.useEffect(() => {
				if (!board.value || board.value.notify !== true || devices !== null) return;
				let alive = true;
				try {
					fetch("/agents-board/devices").then((r) => r.json()).then((list) => {
						if (alive) setDevices(Array.isArray(list) ? list : []);
					}).catch(() => {
						if (alive) setDevices([]);
					});
				} catch {
					if (alive) setDevices([]);
				}
				return () => {
					alive = false;
				};
			}, [board.value ? board.value.notify === true : false, devices]);
			if (board.status !== "ready") return null;
			const t = resolveT(board, props.t);
			const enabled = board.value ? board.value.enabled !== false : true;
			const language = board.value && typeof board.value.language === "string" ? board.value.language : "auto";
			const notifyOn = board.value ? board.value.notify === true : false;
			const soundMode = board.value && (board.value.sound === "wav" || board.value.sound === "process") ? board.value.sound : "browser";
			const savedDev = board.value && typeof board.value.device === "string" ? board.value.device : "";
			const shownDev = probeDev !== null ? probeDev : savedDev;
			return react.createElement("div", { className: "aboard-settings" },
				react.createElement("div", { className: "aboard-settingsText" },
					react.createElement("h3", { className: "aboard-settingsTitle" }, t("settings.title")),
					react.createElement("p", { className: "aboard-settingsDesc" }, t("settings.description"))
				),
				react.createElement("div", { className: "aboard-settingsControls" },
					react.createElement("div", { className: "aboard-languageRow" },
						react.createElement("span", { className: "aboard-languageLabel" }, t("settings.language")),
						react.createElement("div", { className: "aboard-segmented", role: "group", "aria-label": t("settings.language") },
							["auto", "en", "ru"].map((code) => react.createElement("button", {
								key: code,
								type: "button",
								className: code === language ? "aboard-segment aboard-segmentActive" : "aboard-segment",
								disabled: board.writable !== true,
								"aria-pressed": code === language,
								onClick: () => props.actions.setLanguage(code)
							}, code === "auto" ? t("settings.languageAuto") : code.toUpperCase()))
						)
					),
					react.createElement("div", { className: "aboard-languageRow" },
						react.createElement("span", { className: "aboard-languageLabel" }, t("settings.switch")),
						react.createElement(Switch, {
							checked: enabled,
							label: t("settings.switch"),
							disabled: board.writable !== true,
							onChange: (next) => props.actions.setEnabled(next)
						})
					),
					react.createElement("div", { className: "aboard-notifyCol" },
						react.createElement("div", { className: "aboard-languageRow" },
							react.createElement("span", { className: "aboard-languageLabel" }, t("settings.notify")),
							react.createElement(Switch, {
								checked: notifyOn,
								label: t("settings.notify"),
								disabled: board.writable !== true,
								onChange: (next) => props.actions.setNotify(next)
							})
						)
					),
					notifyOn ? react.createElement("div", { className: "aboard-languageRow" },
						react.createElement("span", { className: "aboard-languageLabel" }, t("settings.sound")),
						react.createElement("select", {
							className: "aboard-select",
							value: soundMode,
							disabled: board.writable !== true,
							onChange: (event) => props.actions.setSound(event.target.value)
						},
							react.createElement("option", { value: "browser" }, t("settings.soundBrowser")),
							react.createElement("option", { value: "wav" }, t("settings.soundWav")),
							react.createElement("option", { value: "process" }, t("settings.soundProcess"))
						),
						react.createElement("button", {
							type: "button",
							className: "aboard-testButton",
							title: t("settings.test"),
							onClick: () => props.actions.testSound()
						}, t("settings.test"))
					) : null,
					notifyOn && soundMode === "wav" ? react.createElement("div", { className: "aboard-languageRow" },
						react.createElement("span", { className: "aboard-languageLabel" }, t("settings.device")),
						react.createElement("select", {
							className: "aboard-select",
							value: shownDev,
							disabled: board.writable !== true,
							onChange: (event) => {
								setProbeDev(event.target.value);
								props.actions.setDevice(event.target.value);
							}
						},
							react.createElement("option", { value: "" }, t("settings.deviceDefault")),
							(devices || []).map((d) => react.createElement("option", { key: d.id, value: d.id }, d.name)),
							devices !== null && devices.length === 0 ? react.createElement("option", { value: "-1", disabled: true }, t("settings.deviceNone")) : null
						)
					) : null
				)
			);
		}
		/** In-page completion toasts, lifted clear of the composer; also the
		 * always-mounted watcher that turns a fresh "awaiting your reply"
		 * state (approval / plan review / question) into an alert. */
		function ToastView(props) {
			const board = props.useBoard(identity);
			const toastState = props.useToasts(identity);
			const pending = typeof props.useSessionPendingInteraction === "function" ? props.useSessionPendingInteraction(identity) : null;
			const pendingPrev = react.useRef(null);
			react.useEffect(() => {
				const ids = pending instanceof Map ? Array.from(pending.keys()) : [];
				const prev = pendingPrev.current;
				pendingPrev.current = ids;
				// First observation only records: sessions already waiting at
				// mount must not flood the page with alerts.
				if (prev === null) return;
				for (const id of ids) {
					if (prev.indexOf(id) < 0) {
						try {
							props.actions.alertPending(id);
						} catch {
							// Stale or missing row: the next pending update retries.
						}
					}
				}
			}, [pending]);
			if (board.status !== "ready") return null;
			const t = resolveT(board, props.t);
			const items = toastState && toastState.items ? toastState.items : [];
			if (items.length === 0) return null;
			return react.createElement("div", { className: "aboard-toasts" },
				items.map((toast) => react.createElement("button", {
					key: toast.key,
					type: "button",
					className: "aboard-toast",
					onClick: () => {
						props.actions.closeToast(toast.key);
						props.actions.openSession(toast.id);
					}
				},
					react.createElement("span", { className: "aboard-toastTitle" }, t(toast.kind === "pending" ? "notify.pending" : "notify.title")),
					react.createElement("span", { className: "aboard-toastBody" }, toast.text)
				))
			);
		}
		function identity(value) {
			return value;
		}
		/** Treat a loading/unavailable scope as the composition default (enabled). */
		function isEnabled(board) {
			return board.status === "ready" ? (board.value ? board.value.enabled !== false : true) : true;
		}
		function countRunning(list) {
			let count = 0;
			for (const id of list?.ids || []) {
				const row = list.byId[id];
				if (row && row.running && !row.blank) count += 1;
			}
			return count;
		}
		//#endregion
		//#region lib/types/client/index.js
		const NS = "agents-board";
		const inject = ["sessions", "slots", "locale", "settingsScope"];
		/**
		 * Client plugin body: dictionaries, the settings scope, and three slot
		 * registrations sharing one inject face (scope + open-state + actions).
		 * @param {object} ctx - client plugin context.
		 */
		function applyBoard(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { en, ru }), "agents-board: dictionaries");
			// The green "finished while away" mark is the session manager's own
			// completed bit (the same one the sidebar dot reads) - no local
			// tracker anymore. Drop the stale key of the removed seen map.
			try {
				localStorage.removeItem("agents-board.seen");
			} catch {
				// Storage disabled: the stale key simply stays unread.
			}
			const scope = ctx.settingsScope.bind({ namespace: NS });
			const view = store.createSnapshotStore({ open: false });
			const actions = {
				openBoard: () => view.set({ open: true }),
				closeBoard: () => view.set({ open: false }),
				setEnabled: (next) => {
					void scope.set("enabled", next);
				},
				setLanguage: (next) => {
					void scope.set("language", next);
				},
				setNotify: (next) => {
					void scope.set("notify", next);
				},
				setDevice: (next) => {
					void scope.set("device", next);
				},
				setSound: (next) => {
					void scope.set("sound", next === "wav" || next === "process" ? next : "browser");
				},
				closeToast: (key) => {
					const cur = toasts.getSnapshot();
					toasts.set({ items: cur.items.filter((item) => item.key !== key) });
				},
				testSound: (device) => {
					playChime(device);
				},
				alertPending: (id) => {
					try {
						const listStore = ctx.sessions.list;
						if (!listStore || typeof listStore.getSnapshot !== "function") return;
						const row = listStore.getSnapshot().byId[id];
						if (!row || row.blank === true || row.origin === "subagent") return;
						notifyFinish(row, false, "pending");
					} catch {
						// Snapshot hiccup: the next pending update retries.
					}
				},
				openSession: (id) => {
					// Record what the user has now seen, so a later resync re-arm of
					// the manager completed bit cannot paint the card green again.
					try {
						const listStore = ctx.sessions.list;
						if (listStore && typeof listStore.getSnapshot === "function") {
							const row = listStore.getSnapshot().byId[id];
							const stats = row && row.projectionValues && row.projectionValues.sessionStats;
							doneSeen.set(id, stats && typeof stats.steps === "number" ? stats.steps : 0);
						}
					} catch {
						// Snapshot hiccup: the green suppression just skips this view.
					}
					const address = ctx.sessions.subagentAddress(id);
					if (address !== undefined) ctx.sessions.openSubagent(address);
					else ctx.sessions.open(id);
					view.set({ open: false });
				},
				archiveSession: (id) => {
					// Optional service: the verb exists only when the workspace
					// controller is composed in; the button hides itself otherwise.
					const workspaces = ctx.get("workspaces");
					if (workspaces === undefined) return Promise.resolve();
					return workspaces.archiveSession(id).catch(() => {
						// Host-side rejection (unknown or currently open session): keep the board as-is.
					});
				}
			};
			// Completion alerts. The trigger is our own running→idle edge over the
			// sessions mirror plus the manager `completed` bit: the bit alone
			// never fires for the session the user is watching (it deliberately
			// skips selected sessions), which muted the completions they observed
			// live. Sound modes mirror dsh-text-reader exactly: the BROWSER plays
			// the wav itself (the per-app router maps the browser), "Windows +
			// устройство" renders on the picked MCI device, "Процесс Windows"
			// plays from a spawned powershell on the system default — which the
			// router can map per-app. Visual is the in-page toast raised above
			// the composer; no native OS popup (it doubled the alert).
			const armed = new Set();
			const runningPrev = new Map();
			const firedAt = new Map();
			const alertedSteps = new Map();
			const donePeak = new Map();
			const doneSeen = new Map();
			const chimeRefs = new Set();
			const toasts = store.createSnapshotStore({ items: [] });
			// Expose the viewed/peak step marks to the cards: EntryCard suppresses
			// the green fill for completions the user has already seen, so a
			// resync re-arm after a window switch cannot repaint them green.
			actions.doneSeen = doneSeen;
			actions.donePeak = donePeak;
			let toastSeq = 0;
			const shouldAlert = (id) => {
				const stamp = Date.now();
				const last = firedAt.get(id);
				if (typeof last === "number" && stamp - last < 15000) return false;
				if (firedAt.size > 200) firedAt.clear();
				firedAt.set(id, stamp);
				return true;
			};
			const pushToast = (id, text, kind) => {
				const key = ++toastSeq;
				const cur = toasts.getSnapshot();
				toasts.set({ items: cur.items.concat([{ key, id, text, kind }]).slice(-3) });
				setTimeout(() => {
					const next = toasts.getSnapshot();
					const items = next.items.filter((item) => item.key !== key);
					if (items.length !== next.items.length) toasts.set({ items });
				}, 8000);
			};
			let chimeQueued = false;
			const queueChimeReplay = () => {
				if (chimeQueued) return;
				chimeQueued = true;
				const flush = () => {
					try {
						window.removeEventListener("pointerdown", flush, true);
						window.removeEventListener("keydown", flush, true);
					} catch {
						// Nothing to remove.
					}
					chimeQueued = false;
					playChime();
				};
				try {
					window.addEventListener("pointerdown", flush, true);
					window.addEventListener("keydown", flush, true);
				} catch {
					chimeQueued = false;
				}
			};
			const playChime = (device) => {
				const mirror = scope.getSnapshot();
				const value = mirror && mirror.value;
				const mode = value && typeof value.sound === "string" ? value.sound : "browser";
				// "Windows + устройство" renders on the picked MCI device (the
				// saved one, or an explicit probe); "Процесс Windows" ignores the
				// device and plays on the system default, so the per-app router
				// can map powershell.exe wherever (the text-reader workflow).
				const chosen = mode === "wav" ? (typeof device === "string" && device !== "" ? device
					: value && typeof value.device === "string" ? value.device : "") : "";
				const viaServer = () => {
					try {
						fetch("/agents-board/chime" + (chosen !== "" ? "?device=" + encodeURIComponent(chosen) : ""), { method: "GET", keepalive: true }).catch(() => {});
					} catch {
						// No fetch: silence.
					}
				};
				if (mode === "wav" || mode === "process") { viaServer(); return; }
				try {
					const audio = new Audio("/agents-board/chime.wav");
					// Strong ref until done: a GC'd element can drop the playback
					// (the Chrome lesson from text-reader utterances).
					chimeRefs.add(audio);
					const drop = () => chimeRefs.delete(audio);
					audio.onended = drop;
					audio.onerror = () => { drop(); viaServer(); };
					const begin = () => {
						try {
							const started = audio.play();
							if (started !== undefined && started !== null && typeof started.catch === "function") {
								started.catch((error) => {
									drop();
									// A freshly reloaded page cannot start audible audio
									// until its first user gesture: queue one ding for
									// the next click/keypress instead of dropping the
									// completion alert entirely.
									if (error && error.name === "NotAllowedError") queueChimeReplay();
									else viaServer();
								});
							}
						} catch {
							drop();
							viaServer();
						}
					};
					begin();
				} catch {
					viaServer();
				}
			};
			const notifyFinish = (row, replayed, kind) => {
				const mirror = scope.getSnapshot();
				const value = mirror && mirror.value;
				if (!value || value.notify !== true) return;
				const stats = row.projectionValues && row.projectionValues.sessionStats;
				const steps = stats && typeof stats.steps === "number" ? stats.steps : -1;
				if (replayed === true) {
					// A resync can re-arm the manager bit for a completion the user
					// has already been alerted about; only grown steps prove a new
					// finish. Fresh running→idle edges are trusted as-is.
					const last = alertedSteps.get(row.id);
					if (steps >= 0 && typeof last === "number" && steps <= last) return;
				}
				if (steps >= 0) alertedSteps.set(row.id, steps);
				if (!shouldAlert(row.id)) return;
				pushToast(row.id, row.displayTitle || row.id, kind);
				playChime();
			};
			ctx.effect(() => {
				const listStore = ctx.sessions.list;
				if (listStore === undefined || typeof listStore.subscribe !== "function" || typeof listStore.getSnapshot !== "function") return;
				const onChange = () => {
					try {
						const snapshot = listStore.getSnapshot();
						const byId = snapshot.byId || {};
						const seen = new Set();
						for (const id of snapshot.ids || []) {
							const row = byId[id];
							if (!row || row.blank === true || row.origin === "subagent") continue;
							seen.add(id);
							const stats = row.projectionValues && row.projectionValues.sessionStats;
							const steps = stats && typeof stats.steps === "number" ? stats.steps : 0;
							if (!(donePeak.get(id) >= steps)) donePeak.set(id, steps);
							// Viewing counts as seen no matter which surface opened it.
							if (snapshot.current === id && row.completed === true) doneSeen.set(id, steps);
							// Own running→idle edge: covers EVERY completion, including
							// the session the user is watching (the manager bit skips
							// selected sessions - that was the muted-completion bug).
							const isRunning = row.running === true;
							if (runningPrev.get(id) === true && isRunning === false) notifyFinish(row, false);
							runningPrev.set(id, isRunning);
							// The manager bit still covers completions whose running
							// frames were never observed (finish while disconnected).
							if (row.completed === true && !armed.has(id)) {
								armed.add(id);
								notifyFinish(row, true);
							}
						}
						for (const id of Array.from(runningPrev.keys())) {
							if (!seen.has(id)) runningPrev.delete(id);
						}
						for (const id of Array.from(armed)) {
							if (!seen.has(id)) armed.delete(id);
						}
					} catch {
						// Mirror hiccup: the next update retries.
					}
				};
				onChange();
				return listStore.subscribe(onChange);
			}, "agents-board: completion notifications");
			const face = () => ({
				hooks: { board: scope, view, toasts },
				actions
			});
			// Every slot registration is contained: a failure must cost the
			// board its surface, never the whole client entry (whose rejection
			// the web shell treats as fatal).
			const safeSlot = (slot, maker) => ctx.slots.inject(slot, () => {
				try {
					return maker();
				} catch (error) {
					console.error("agents-board: slot registration failed (" + slot + "); the board starts without it.", error);
				}
			});
			safeSlot("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "agents-board-overlay",
				order: 40,
				locale: NS,
				inject: face
			}, BoardOverlay));
			safeSlot("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "agents-board-toast",
				order: 41,
				locale: NS,
				inject: face
			}, ToastView));
			safeSlot("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "agents-board-button",
				order: 10,
				locale: NS,
				inject: face
			}, BoardButton));
			safeSlot("settings.plugin.item", () => ctx.slots.register({
				name: "settings.plugin.item",
				key: NS,
				locale: NS,
				inject: face
			}, BoardSettingsCard));
		}
		/**
		 * Fail-safe wrapper: a broken board must never fail the client module
		 * entry - the web shell treats a rejected activation as fatal and
		 * would not mount the application at all. The board simply stays off.
		 */
		function apply(ctx) {
			try {
				return applyBoard(ctx);
			} catch (error) {
				console.error("agents-board: client startup failed; the board stays off.", error);
			}
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
// republished 1.24.0 (bundle snapshot repair)
