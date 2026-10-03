/**
 * dsh-agents-board, Host half.
 *
 * A function plugin with only `node:` builtins: the installed copy lives
 * outside any pnpm tree, so bare package imports cannot resolve here, while
 * `node:child_process` always does. The settings schema is a hand-rolled,
 * schemastery-compatible node — callable with a `toJSON()` producing the
 * `{ uid, refs }` envelope the settings provider serializes to the wire and
 * the web client rehydrates through `new Schema(serialized)`.
 */

import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'

export const name = 'agents-board'

/** Allowed board languages; `auto` renders the English dictionary. */
const LANGUAGES = ['auto', 'en', 'ru']

/**
 * Validate and normalize one merged settings candidate. Never throws: the
 * section must not be able to block a harness boot, so an invalid field
 * normalizes to its default instead. The wire schema (real schemastery on the
 * client) also accepts any string, so normalization is the single authority.
 * @param {unknown} candidate - merged base + user section.
 * @returns {{ enabled: boolean, language: string, notify: boolean, sound: string, device: string }} the normalized section.
 */
function resolveAgentsBoardSection(candidate) {
  if (candidate === undefined || candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return { enabled: true, language: 'auto', notify: false, sound: 'browser', device: '' }
  }
  const enabled = typeof candidate.enabled === 'boolean' ? candidate.enabled : true
  const language = typeof candidate.language === 'string' && LANGUAGES.includes(candidate.language) ? candidate.language : 'auto'
  const notify = typeof candidate.notify === 'boolean' ? candidate.notify : false
  // Sound modes mirror dsh-text-reader: "browser" plays the wav in the page
  // (the per-app router maps the browser), "wav" renders on the picked MCI
  // device, "process" plays from a spawned powershell on the system default
  // (routable per-app). The old "server" value folds into "process".
  const sound = candidate.sound === 'wav' || candidate.sound === 'process' ? candidate.sound : candidate.sound === 'server' ? 'process' : 'browser'
  // The render device is a winmm index or an MCI device name; anything else
  // collapses to the system default.
  const device = typeof candidate.device === 'string' ? sanitizeDevice(candidate.device) : ''
  return { ...candidate, enabled, language, notify, sound, device }
}

/**
 * Build the schemastery-compatible node for `{ enabled, language, notify, sound, device }`.
 * @returns {object} callable schema with a wire `toJSON()` envelope.
 */
function createAgentsBoardSchema() {
  const envelope = {
    uid: 0,
    refs: {
      0: { type: 'object', meta: {}, dict: { enabled: 1, language: 2, notify: 3, sound: 5, device: 4 } },
      1: { type: 'boolean', meta: { default: true } },
      2: { type: 'string', meta: { default: 'auto' } },
      3: { type: 'boolean', meta: { default: false } },
      4: { type: 'string', meta: { default: '' } },
      5: { type: 'string', meta: { default: 'browser' } },
    },
  }
  const schema = (candidate) => resolveAgentsBoardSection(candidate)
  schema.type = 'object'
  schema.meta = envelope.refs[0].meta
  schema.dict = { enabled: envelope.refs[1], language: envelope.refs[2], notify: envelope.refs[3], sound: envelope.refs[5], device: envelope.refs[4] }
  schema.toJSON = () => ({ uid: 0, refs: envelope.refs })
  return schema
}

/** Resolved board configuration for diagnostics and fallback reads. */
const boardState = { enabled: true, language: 'auto', notify: false, sound: 'browser', device: '' }

/** The Windows system chime rendered on a completion. */
const CHIME_WAV = 'C:\\Windows\\Media\\Windows Notify System Generic.wav'

/**
 * WinMM helpers compiled into the helper process: device listing and
 * blocking playback of one WAV through a chosen render device. Carried over
 * from dsh-text-reader. Note the routing reality on this machine: the
 * server-side path plays from powershell.exe, which the per-app audio
 * router does NOT map to the headphones - it lands on the system default
 * (the speakers) unless the router was taught otherwise. The default chime
 * therefore plays browser-side; this path remains the "Server" option and
 * fallback. .NET Framework exposes no managed endpoint API, so MME
 * functions do.
 */
const WINMM_CS = [
  'using System;',
  'using System.Linq;',
  'using System.Text;',
  'using System.Runtime.InteropServices;',
  'public static class TrdOut {',
  '[DllImport("winmm.dll")] public static extern uint waveOutGetNumDevs();',
  '[DllImport("winmm.dll", CharSet=CharSet.Unicode)] public static extern uint waveOutGetDevCaps(uint id, out WAVOUTDEVCAPS caps, uint size);',
  '[StructLayout(LayoutKind.Sequential)] public struct WAVOUTDEVCAPS { public uint wMid; public uint wPid; public uint vDriverVersion; [MarshalAs(UnmanagedType.ByValTStr, SizeConst=32)] public string szPname; public uint dwFormats; public uint wChannels; public uint wReserved1; public uint dwSupport; }',
  '[DllImport("winmm.dll", CharSet=CharSet.Unicode)] public static extern uint mciSendString(string cmd, StringBuilder ret, uint clen, IntPtr hwnd);',
  'public static uint Mci(string cmd) { return mciSendString(cmd, null, 0, IntPtr.Zero); }',
  'public static uint Mci(string cmd, StringBuilder ret, uint clen) { return mciSendString(cmd, ret, clen, IntPtr.Zero); }',
  'public static string List() { StringBuilder sb = new StringBuilder(); uint n = waveOutGetNumDevs(); for (uint i = 0; i < n; i++) { WAVOUTDEVCAPS c; if (waveOutGetDevCaps(i, out c, (uint)Marshal.SizeOf(typeof(WAVOUTDEVCAPS))) == 0) { sb.Append(i).Append("|").Append(c.szPname).Append("\\n"); } } return sb.ToString(); }',
  'public static string Caps() { string alias = "trdc" + Guid.NewGuid().ToString("N").Substring(0, 6); mciSendString("open new type waveaudio alias " + alias, null, 0, IntPtr.Zero); StringBuilder sb = new StringBuilder(1024); mciSendString("status " + alias + " capabilities", sb, 1024, IntPtr.Zero); mciSendString("close " + alias, null, 0, IntPtr.Zero); return sb.ToString(); }',
  'public static string Play(string file, string dev) { string alias = "trd" + Guid.NewGuid().ToString("N").Substring(0, 8); string tgt = (dev == null || dev.Length == 0) ? "" : (dev.All(char.IsDigit) ? (" device " + dev) : (" device \'" + dev + "\'")); string open = ("open \\"" + file + "\\" type waveaudio" + tgt + " alias " + alias); StringBuilder err = new StringBuilder(256); uint r = mciSendString(open, err, 256, IntPtr.Zero); if (r != 0) { return "open failed: " + err.ToString(); } r = mciSendString("play " + alias + " wait", null, 0, IntPtr.Zero); mciSendString("close " + alias, null, 0, IntPtr.Zero); return r == 0 ? "ok" : ("play failed: code " + r); }',
  '}',
].join('\n')

/**
 * Collapse a device identifier to a safe literal: winmm index digits or an
 * MCI device name (quotes and control characters stripped, length capped).
 * @param {unknown} device - raw value from settings or query.
 * @returns {string} sanitized device token, '' for the system default.
 */
function sanitizeDevice(device) {
  const s = String(device === undefined || device === null ? '' : device)
  if (s === '') return ''
  if (/^[0-9]{1,2}$/.test(s)) return s
  const clean = s.replace(/['"\\`$\u0000-\u001f]/g, '').trim().slice(0, 80)
  return clean
}

/**
 * The PowerShell command: compile the winmm helper, play the chime through
 * the chosen waveaudio device (empty = system default; digits = winmm index,
 * anything else = MCI device name). Shaped like dsh-text-reader's
 * buildPlayScript, whose playback that copy is.
 * @param {string} device - sanitized device token.
 * @returns {string} the command text.
 */
export function buildChimeScript(device) {
  const dev = sanitizeDevice(device)
  return [
    "$ErrorActionPreference='Stop'",
    // Whitespace stays: this Windows file name has spaces (MCI receives the
    // path double-quoted). The rest is stripped to a conservative charset.
    `$out='${CHIME_WAV.replace(/[^A-Za-z0-9_.:\\\- ]/g, '')}'`,
    `$dev='${dev.replace(/'/g, "''")}'`,
    'Add-Type -TypeDefinition @"',
    WINMM_CS.replace(/\$/g, '`$'),
    '"@',
    'if (-not (Test-Path $out)) { throw "missing wav" }',
    '$r=[TrdOut]::Play($out,$dev)',
    "if ($r -ne 'ok') { throw $r }",
  ].join('\n')
}

/**
 * The PowerShell command listing MCI waveaudio devices as a comma-separated
 * name line (`status … capabilities`). winmm's own enumeration reports 0
 * devices on this machine even though MCI plays fine, so the names come
 * from MCI itself.
 * @returns {string} the command text.
 */
export function buildListScript() {
  return [
    "$ErrorActionPreference='Stop'",
    '[Console]::OutputEncoding=[Text.Encoding]::UTF8',
    'Add-Type -TypeDefinition @"',
    WINMM_CS.replace(/\$/g, '`$'),
    '"@',
    '[TrdOut]::Caps()',
  ].join('\n')
}

/** Timestamp of the last accepted chime; coalesces burst completions. */
let lastChimeAt = 0

/**
 * Fire-and-forget a tiny PowerShell that renders the chime through winmm to
 * the chosen output device (or the system default). This is the "Server"
 * sound path; the browser path streams the same wav instead.
 * @param {string} device - winmm index or MCI device name, '' for default.
 * @returns {object} a small JSON-able outcome for the HTTP caller.
 */
function playChime(device) {
  const now = Date.now()
  if (now - lastChimeAt < 1200) return { ok: true, skipped: 'burst' }
  lastChimeAt = now
  try {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', buildChimeScript(device)],
      { windowsHide: true, detached: true, stdio: 'ignore' })
    child.on('error', () => { /* no PowerShell on PATH: stay silent */ })
    child.unref()
    return { ok: true }
  } catch (error) {
    return { ok: false, error: String(error && error.message ? error.message : error) }
  }
}

/** Cached device list: {at, items} - winmm enumeration is slow and stable. */
let deviceCache = null

/**
 * Enumerate winmm render devices, 60 s cached.
 * @returns {Promise<Array<{id: string, name: string}>>} devices, [] on failure.
 */
function listDevices() {
  if (deviceCache !== null && Date.now() - deviceCache.at < 60000) return Promise.resolve(deviceCache.items)
  return new Promise((resolve) => {
    const done = (items) => {
      deviceCache = { at: Date.now(), items }
      resolve(items)
    }
    let child
    try {
      child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', buildListScript()],
        { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] })
    } catch {
      done([])
      return
    }
    let stdout = ''
    const timer = setTimeout(() => {
      try {
        child.kill()
      } catch {
        /* already gone */
      }
    }, 20000)
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk)
    })
    child.on('error', () => {
      clearTimeout(timer)
      done([])
    })
    child.on('close', () => {
      clearTimeout(timer)
      // MCI returns the names comma-separated; ids are the names (Play
      // accepts digits as winmm indexes and anything else as device names).
      const items = []
      for (const name of stdout.split(',')) {
        const clean = sanitizeDevice(name)
        if (clean !== '' && !items.some((d) => d.id === clean)) items.push({ id: clean, name: clean })
      }
      done(items)
    })
  })
}

/**
 * Answer one request under the /agents-board prefix.
 * @param {{ method?: string, url?: string }} req - node request.
 * @param {{ writeHead: (code: number, headers?: object) => void, end: (body?: string) => void }} res - node response.
 * @returns {Promise<void>} resolved once the reply is written.
 */
async function handleRequest(req, res) {
  const json = { 'content-type': 'application/json' }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { ...json, allow: 'GET' })
    res.end('{"error":"method-not-allowed"}')
    return
  }
  // The prefix may or may not be stripped before the handler runs.
  const raw = String(req.url || '')
  const path = raw.split('?')[0]
  const route = path.startsWith('/agents-board') ? path.slice('/agents-board'.length) : path
  if (route === '/chime') {
    // An explicit ?device= wins (the settings card probes with its current
    // selection); otherwise the saved setting plays. Device may be an index
    // or an MCI name - percent-decoded, then sanitized.
    const match = raw.match(/[?&]device=([^&]*)/)
    let dev = boardState.device
    if (match) {
      try {
        dev = decodeURIComponent(match[1])
      } catch {
        dev = match[1]
      }
    }
    res.writeHead(200, json)
    res.end(JSON.stringify(playChime(dev)))
    return
  }
  if (route === '/chime.wav') {
    // The wav bytes for the browser-side path: the page plays them through
    // its own audio session, which the per-app router maps (the browser is
    // on the headphones here; unspawned processes default to the speakers).
    try {
      const buf = readFileSync(CHIME_WAV)
      res.writeHead(200, { 'content-type': 'audio/wav', 'content-length': String(buf.length), 'cache-control': 'no-store' })
      res.end(buf)
    } catch {
      res.writeHead(404, json)
      res.end('{"error":"no-wav"}')
    }
    return
  }
  if (route === '/devices') {
    const items = await listDevices()
    res.writeHead(200, json)
    res.end(JSON.stringify(items))
    return
  }
  res.writeHead(404, json)
  res.end('{"error":"not-found"}')
}

/**
 * Plugin body: register the `agents-board` settings section and chime routes.
 *
 * Fail-safe: the board must never take the whole composition down. Every
 * startup step - including each reactive mount waiter, which runs after
 * `apply` returned - is contained, so a board failure leaves the plugin off
 * while the server boots normally.
 * @param {import('@deepseek-ai/cordis').Context} ctx - host plugin context.
 * @param {{ enabled?: boolean, language?: string, notify?: boolean, sound?: string, device?: string } | undefined} config - patch row `config`.
 */
export function apply(ctx, config) {
  try {
    const resolved = resolveAgentsBoardSection(config ?? {})
    boardState.enabled = resolved.enabled
    boardState.language = resolved.language
    boardState.notify = resolved.notify
    boardState.sound = resolved.sound
    boardState.device = resolved.device
  } catch (error) {
    console.error('agents-board: config resolution failed; keeping defaults.', error)
  }

  // The settings service may mount after this row (file:// inserts run early
  // in the layer); wait for it reactively. A one-shot ctx.get raced the
  // provider and silently cost the board its settings card.
  const registerSection = (settingsCtx) => {
    try {
      settingsCtx.settings.installSection(settingsCtx, 'agents-board', createAgentsBoardSchema(), { enabled: boardState.enabled, language: boardState.language, notify: boardState.notify, sound: boardState.sound, device: boardState.device }, {
        setSource: (current) => {
          try {
            boardState.enabled = current.enabled !== false
            boardState.language = LANGUAGES.includes(current.language) ? current.language : 'auto'
            boardState.notify = current.notify === true
            boardState.sound = current.sound === 'wav' || current.sound === 'process' ? current.sound : current.sound === 'server' ? 'process' : 'browser'
            boardState.device = typeof current.device === 'string' ? sanitizeDevice(current.device) : ''
          } catch (error) {
            console.error('agents-board: setSource failed.', error)
          }
        },
        onChange: () => {
          try {
            ctx.logger?.debug?.('agents-board: enabled=%s language=%s notify=%s sound=%s device=%s', boardState.enabled, boardState.language, boardState.notify, boardState.sound, boardState.device)
          } catch {
            // Logging is best-effort.
          }
        },
      })
    } catch (error) {
      // A waiter re-run (the settings service reloaded) finds the section
      // already installed by our first run - that is success, not failure.
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('already registered')) return
      // No settings section: the board loses its card, the server lives on.
      console.error('agents-board: settings section failed; the board starts without it.', error)
    }
  }
  // ALWAYS mount through an inject waiter. It both waits for the service and
  // DECLARES it on the child fiber, making the ctx.settings property access
  // legal. A direct ctx.get probe races the provider: the implementation may
  // already be registered in a sibling subtree that our fiber chain cannot
  // see, and the property read then fails with "cannot get property ...
  // without inject" (the dsh-context panel hits the same race).
  ctx.inject(['settings'], registerSection)

  // The chime endpoints: same reactive mount - the web server may appear
  // after this early file:// row.
  const registerRoutes = (webCtx) => {
    try {
      webCtx.effect(() => webCtx.webServer.register({
        kind: 'prefix',
        path: '/agents-board',
        handler: handleRequest,
      }), 'agents-board: chime routes')
    } catch (error) {
      // A waiter re-run finds the prefix already registered by our first
      // run - that is success, not failure.
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('duplicate prefix route')) return
      // No routes: chime and device probing stay silent, the server lives on.
      console.error('agents-board: chime routes failed; the board starts without them.', error)
    }
  }
  ctx.inject(['webServer'], registerRoutes)
}

/** Current resolved board state (host-side fallback when settings are absent). */
export function readBoardState() {
  return { ...boardState }
}
