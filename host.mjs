/**
 * dsh-agents-board, Host half (dsh v0.2.0-rc.2).
 *
 * Official-style config: the exported `Config` schema (schemastery, volatile
 * fields) IS the settings surface — the Plugins page generates its form from
 * it and writes through the profile's config editor; the settings service
 * publishes the namespace under this row's id (`agents-board`). No
 * installSection, no hand-rolled schema: that API is gone in rc.2.
 *
 * The chime endpoints (/chime, /chime.wav, /devices) are unchanged: browser
 * playback streams the wav from the page's own audio session; wav/process
 * render through winmm in a spawned PowerShell (routable per-app).
 *
 * Fail-safe: every startup step is contained. If schemastery cannot load the
 * board loses only the Plugins-page form; if the web server is missing the
 * board loses only the chime routes. The harness boots either way.
 */

import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'

export const name = 'agents-board'

/**
 * The web server is a hard dependency: declaring it makes this fiber wait
 * until the service exists, so the `ctx.webServer` property read in `apply`
 * is legal (property access follows the inject declaration).
 */
export const inject = ['webServer']

/**
 * Schemastery powers the Config schema. A plugin package outside the harness
 * tree may not resolve the bare specifier, so both paths are contained and
 * fully synchronous (createRequire — no top-level await): the bare name
 * first (installed hosts), then the vendored CJS copy the installer
 * provisions into `./deps/` (source checkouts). Without either the board
 * still runs with internal defaults — it only loses the Plugins-page form.
 */
const requireFromHere = createRequire(import.meta.url)
let z = undefined
try {
  z = requireFromHere('@deepseek-ai/schemastery')
} catch {
  /* fall through to the vendored copy */
}
if (z === undefined) {
  try {
    z = requireFromHere('./deps/schemastery.cjs')
  } catch (error) {
    console.error('agents-board: schemastery unavailable; the board runs without the Plugins-page form.', error)
  }
}

/**
 * Board configuration. Every field is volatile: the Plugins page edits them
 * live — the fiber is NOT reloaded on a write, so `apply` holds volatile
 * references whose `.get()` always returns the current value.
 *
 * enabled  — the whole board (button, panel, toasts) on/off.
 * language — board copy language; `auto` renders the English dictionary.
 * notify   — completion/pending alerts on/off.
 * sound    — browser (page audio), wav (MCI device), process (PowerShell).
 * device   — winmm index or MCI device name for the `wav` mode.
 */
export let Config = undefined
if (z !== undefined) {
  Config = z.object({
    enabled: z.boolean().default(true).volatile(),
    language: z.union(['auto', 'en', 'ru']).default('ru').volatile(),
    notify: z.boolean().default(true).volatile(),
    sound: z.union(['browser', 'wav', 'process']).default('browser').volatile(),
    device: z.string().default('').volatile(),
  })
}

/** Allowed board languages; `auto` renders the English dictionary. */
const LANGUAGES = ['auto', 'en', 'ru']

/** Live config reference, set on every `apply` (volatile refs or plain values). */
let live = null

/**
 * Read one config value whether it arrived as a volatile reference (rc.2
 * volatile fields) or a plain value (older loaders, absent schema). Never
 * throws: a hiccup reads as the fallback.
 * @param {string} key - config field.
 * @param {boolean|string} fallback - default when the value is absent.
 * @returns {boolean|string} the current value.
 */
function readValue(key, fallback) {
  try {
    const value = live === null || live === undefined ? undefined : live[key]
    if (value !== null && typeof value === 'object' && typeof value.get === 'function') {
      const snapshot = value.get()
      return snapshot === undefined || snapshot === null ? fallback : snapshot
    }
    return value === undefined || value === null ? fallback : value
  } catch {
    return fallback
  }
}

/**
 * Resolved board state for the routes and diagnostics.
 * @returns {{ enabled: boolean, language: string, notify: boolean, sound: string, device: string }}
 */
function boardSnapshot() {
  const enabled = readValue('enabled', true) !== false
  const rawLanguage = readValue('language', 'auto')
  const language = typeof rawLanguage === 'string' && LANGUAGES.includes(rawLanguage) ? rawLanguage : 'auto'
  const notify = readValue('notify', true) === true
  // Sound modes mirror dsh-text-reader: "browser" plays the wav in the page
  // (the per-app router maps the browser), "wav" renders on the picked MCI
  // device, "process" plays from a spawned PowerShell on the system default.
  // The legacy "server" value folds into "process".
  const rawSound = readValue('sound', 'browser')
  const sound = rawSound === 'wav' || rawSound === 'process' ? rawSound : rawSound === 'server' ? 'process' : 'browser'
  const device = sanitizeDevice(readValue('device', ''))
  return { enabled, language, notify, sound, device }
}

/**
 * Current board state (compatibility export).
 * @returns {{ enabled: boolean, language: string, notify: boolean, sound: string, device: string }}
 */
export function readBoardState() {
  return boardSnapshot()
}

/** The Windows system chime rendered on a completion. */
const CHIME_WAV = 'C:\\Windows\\Media\\Windows Notify System Generic.wav'

/**
 * WinMM helpers compiled into the helper process: device listing and
 * blocking playback of one WAV through a chosen render device. Playback
 * goes through the waveOut API DIRECTLY: MCI's `open … device N` fails for
 * every wave device index on Windows (measured: open error for 0..N, only
 * the mapper default plays), so a chosen device could never sound via MCI.
 * Opening the exact device also bypasses per-app audio routers: the stream
 * is bound to the selected endpoint, not to powershell.exe's default.
 * .NET Framework exposes no managed endpoint API, so MME functions do.
 */
const WINMM_CS = [
  'using System;',
  'using System.Text;',
  'using System.Runtime.InteropServices;',
  'public static class TrdOut {',
  '[DllImport("winmm.dll")] public static extern uint waveOutGetNumDevs();',
  '[DllImport("winmm.dll", CharSet=CharSet.Unicode)] public static extern uint waveOutGetDevCaps(uint id, out WAVOUTDEVCAPS caps, uint size);',
  // Exact WAVEOUTCAPSW layout: WORD/WORD/DWORD header + 32 WCHARs + tail —
  // 84 bytes. Declaring the WORDs as uint (60 bytes) makes waveOutGetDevCapsW
  // reject the call for every device and the picker render empty (the same
  // bug dsh-text-reader fixed).
  '[StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public struct WAVOUTDEVCAPS { public ushort wMid; public ushort wPid; public uint vDriverVersion; [MarshalAs(UnmanagedType.ByValTStr, SizeConst=32)] public string szPname; public uint dwFormats; public ushort wChannels; public ushort wReserved1; public uint dwSupport; }',
  '[DllImport("winmm.dll")] public static extern uint waveOutOpen(out IntPtr hWaveOut, uint device, ref WAVEFORMATEX fmt, IntPtr callback, IntPtr instance, uint flags);',
  '[DllImport("winmm.dll")] public static extern uint waveOutPrepareHeader(IntPtr h, ref WAVEHDR hdr, uint size);',
  '[DllImport("winmm.dll")] public static extern uint waveOutWrite(IntPtr h, ref WAVEHDR hdr, uint size);',
  '[DllImport("winmm.dll")] public static extern uint waveOutUnprepareHeader(IntPtr h, ref WAVEHDR hdr, uint size);',
  '[DllImport("winmm.dll")] public static extern uint waveOutClose(IntPtr h);',
  '[StructLayout(LayoutKind.Sequential)] public struct WAVEFORMATEX { public ushort wFormatTag; public ushort nChannels; public uint nSamplesPerSec; public uint nAvgBytesPerSec; public ushort nBlockAlign; public ushort wBitsPerSample; public ushort cbSize; }',
  '[StructLayout(LayoutKind.Sequential)] public struct WAVEHDR { public IntPtr lpData; public uint dwBufferLength; public uint dwBytesRecorded; public IntPtr dwUser; public uint dwFlags; public uint dwLoops; public IntPtr lpNext; public IntPtr reserved; }',
  'public static string List() { StringBuilder sb = new StringBuilder(); uint n = waveOutGetNumDevs(); for (uint i = 0; i < n; i++) { WAVOUTDEVCAPS c; if (waveOutGetDevCaps(i, out c, (uint)Marshal.SizeOf(typeof(WAVOUTDEVCAPS))) == 0) { sb.Append(i).Append("|").Append(c.szPname).Append("\\n"); } } return sb.ToString(); }',
  // Parse the RIFF chunks, open the exact waveOut device (0xFFFFFFFF = the
  // mapper/system default) and write the whole PCM buffer blocking. WAVs
  // must be PCM (1) or IEEE float (3) - everything on file is PCM.
  'public static string WaveOutPlay(string file, uint dev) { byte[] bytes; try { bytes = System.IO.File.ReadAllBytes(file); } catch (Exception e) { return "read failed: " + e.Message; } if (bytes.Length < 44 || bytes[0] != 82 || bytes[1] != 73) { return "not a riff wav"; } bool haveFmt = false; ushort tag = 0, ch = 0, bits = 0; uint rate = 0; byte[] data = null; int pos = 12; while (pos + 8 <= bytes.Length) { string id = Encoding.ASCII.GetString(bytes, pos, 4); uint size = BitConverter.ToUInt32(bytes, pos + 4); int body = pos + 8; if (id == "fmt " && size >= 16) { tag = BitConverter.ToUInt16(bytes, body); ch = BitConverter.ToUInt16(bytes, body + 2); rate = BitConverter.ToUInt32(bytes, body + 4); bits = BitConverter.ToUInt16(bytes, body + 14); haveFmt = true; } else if (id == "data" && data == null) { uint n = size; if (n > (uint)(bytes.Length - body)) { n = (uint)(bytes.Length - body); } data = new byte[n]; Array.Copy(bytes, body, data, 0, n); } pos = body + (int)size; if ((size & 1) == 1) { pos++; } } if (!haveFmt || data == null) { return "bad wav chunks"; } if (tag != 1 && tag != 3) { return "unsupported wav format " + tag; } uint align = (uint)ch * (uint)bits / 8u; WAVEFORMATEX f; f.wFormatTag = tag; f.nChannels = ch; f.nSamplesPerSec = rate; f.nAvgBytesPerSec = align * rate; f.nBlockAlign = (ushort)align; f.wBitsPerSample = bits; f.cbSize = 0; IntPtr h; uint r = waveOutOpen(out h, dev, ref f, IntPtr.Zero, IntPtr.Zero, 0); if (r != 0) { return "open failed: code " + r; } GCHandle pin = GCHandle.Alloc(data, GCHandleType.Pinned); try { WAVEHDR hdr; hdr.lpData = pin.AddrOfPinnedObject(); hdr.dwBufferLength = (uint)data.Length; hdr.dwBytesRecorded = 0; hdr.dwUser = IntPtr.Zero; hdr.dwFlags = 0; hdr.dwLoops = 0; hdr.lpNext = IntPtr.Zero; hdr.reserved = IntPtr.Zero; uint hs = (uint)Marshal.SizeOf(typeof(WAVEHDR)); r = waveOutPrepareHeader(h, ref hdr, hs); if (r != 0) { waveOutClose(h); return "prepare failed: code " + r; } r = waveOutWrite(h, ref hdr, hs); if (r != 0) { waveOutUnprepareHeader(h, ref hdr, hs); waveOutClose(h); return "write failed: code " + r; } while ((hdr.dwFlags & 1) == 0) { System.Threading.Thread.Sleep(10); } waveOutUnprepareHeader(h, ref hdr, hs); waveOutClose(h); return "ok"; } finally { pin.Free(); } }',
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
 * The PowerShell command: compile the winmm helper and play the chime on the
 * exact waveOut device (0xFFFFFFFF = mapper/system default; digits = device
 * index from the picker; anything non-numeric falls back to the mapper).
 * The helper parses the wav and drives waveOutOpen/waveOutWrite directly.
 * @param {string} device - sanitized device token.
 * @returns {string} the command text.
 */
export function buildChimeScript(device) {
  const dev = sanitizeDevice(device)
  return [
    "$ErrorActionPreference='Stop'",
    // Whitespace stays: this Windows file name has spaces. The rest is
    // stripped to a conservative charset before it reaches the shell.
    `$out='${CHIME_WAV.replace(/[^A-Za-z0-9_.:\\\- ]/g, '')}'`,
    `$devId=if ('${dev.replace(/'/g, "''")}' -match '^[0-9]{1,2}$') { [uint32]$Matches[0] } else { [uint32]4294967295 }`,
    'Add-Type -TypeDefinition @"',
    WINMM_CS.replace(/\$/g, '`$'),
    '"@',
    'if (-not (Test-Path $out)) { throw "missing wav" }',
    '$r=[TrdOut]::WaveOutPlay($out,$devId)',
    "if ($r -ne 'ok') { throw $r }",
  ].join('\n')
}

/**
 * The PowerShell command enumerating WinMM render devices through the
 * waveOut API (`waveOutGetNumDevs` + `waveOutGetDevCapsW` with the exact
 * WAVEOUTCAPSW layout - the MCI "status … capabilities" detour was a
 * workaround for a broken struct and is retired). Errors surface as a
 * TRDERR: line, mirroring dsh-text-reader.
 * @returns {string} the command text.
 */
export function buildListScript() {
  return [
    "$ErrorActionPreference='Stop'",
    '[Console]::OutputEncoding=[Text.Encoding]::UTF8',
    'try {',
    'Add-Type -TypeDefinition @"',
    WINMM_CS.replace(/\$/g, '`$'),
    '"@',
    '[TrdOut]::List()',
    '} catch { Write-Output ("TRDERR:" + $_.Exception.Message) }',
  ].join('\n')
}

/** Timestamp of the last accepted chime; coalesces burst completions. */
let lastChimeAt = 0

/**
 * Play the chime through winmm on the chosen device and REPORT the outcome.
 * The script runs via -File on a temp copy: that exact shape is verified to
 * produce sound, while -Command + detached + ignored stdio made every
 * failure invisible (the mode stayed silent without a trace). The HTTP
 * caller waits for the child (~3-4 s) and receives the exit code and the
 * tail of stderr, which the Probe button surfaces verbatim.
 * @param {string} device - winmm index or MCI device name, '' for default.
 * @returns {Promise<object>} a small JSON-able outcome for the HTTP caller.
 */
async function playChime(device) {
  const now = Date.now()
  if (now - lastChimeAt < 1200) return { ok: true, skipped: 'burst' }
  lastChimeAt = now
  const scriptPath = join(tmpdir(), 'dsh-ab-chime-' + randomUUID().slice(0, 8) + '.ps1')
  try {
    writeFileSync(scriptPath, buildChimeScript(device), 'utf8')
  } catch (error) {
    return { ok: false, error: 'temp write failed: ' + String(error && error.message ? error.message : error) }
  }
  try {
    return await new Promise((resolve) => {
      let child
      try {
        child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
          { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
      } catch (error) {
        resolve({ ok: false, error: 'spawn failed: ' + String(error && error.message ? error.message : error) })
        return
      }
      let stderr = ''
      const timer = setTimeout(() => {
        try {
          child.kill()
        } catch {
          /* already gone */
        }
      }, 30000)
      if (child.stderr !== null) {
        child.stderr.on('data', (chunk) => {
          stderr += String(chunk)
        })
      }
      child.on('error', (error) => {
        clearTimeout(timer)
        resolve({ ok: false, error: 'spawn failed: ' + String(error && error.message ? error.message : error) })
      })
      child.on('close', (code) => {
        clearTimeout(timer)
        if (code === 0) {
          resolve({ ok: true })
          return
        }
        const tail = stderr.trim().split(/\r?\n/).filter((l) => l.length > 0).slice(-3).join(' | ')
        resolve({ ok: false, exit: code, error: tail !== '' ? tail : 'exit code ' + code })
      })
    })
  } finally {
    try {
      unlinkSync(scriptPath)
    } catch {
      /* best effort */
    }
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
      // waveOut enumeration prints "index|name" per device; a TRDERR: line
      // means the helper failed (report empty - the picker falls back to
      // the system default).
      const items = []
      const seen = new Set()
      for (const line of stdout.trim().split(/\r?\n/)) {
        if (line.startsWith('TRDERR:') || line.length === 0) continue
        const at = line.indexOf('|')
        const id = (at >= 0 ? line.slice(0, at) : line).trim()
        const name = (at >= 0 ? line.slice(at + 1) : '').trim()
        if (id.length === 0 || seen.has(id)) continue
        seen.add(id)
        items.push({ id, name: name !== '' ? name : id })
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
    // An explicit ?device= wins (the Plugins page probes with its current
    // selection); otherwise the saved setting plays. The caller waits for
    // the render (a few seconds) and gets the real outcome back: the Probe
    // button surfaces any failure verbatim instead of staying silent.
    // The whole branch is guarded: a throw here would surface as a bare
    // 400 from the web server guard with no trace on the page.
    try {
      const match = raw.match(/[?&]device=([^&]*)/)
      let dev = boardSnapshot().device
      if (match) {
        try {
          dev = decodeURIComponent(match[1])
        } catch {
          dev = match[1]
        }
      }
      const outcome = await playChime(dev)
      res.writeHead(200, json)
      res.end(JSON.stringify(outcome))
    } catch (error) {
      console.error('[agents-board] /chime failed:', error)
      res.writeHead(200, json)
      res.end(JSON.stringify({ ok: false, error: String(error && error.message ? error.message : error) }))
    }
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
 * Plugin body: keep the live config reference and register the chime routes.
 *
 * rc.2 official-style: the exported `Config` schema is the whole settings
 * surface — the settings service publishes it (under this row's id) and the
 * Plugins page renders and writes it; a volatile write does NOT reload the
 * fiber, so the captured volatile references simply return new values.
 *
 * Fail-safe: the webServer property is legal here (declared in `inject`), and
 * the registration itself is contained — a failure costs the board its chime
 * routes only; the server boots normally either way.
 * @param {import('@deepseek-ai/cordis').Context} ctx - host plugin context.
 * @param {Record<string, unknown> | undefined} config - row config; volatile
 *   fields arrive as live references, plain fields as values.
 */
export function apply(ctx, config) {
  live = config === null || config === undefined || typeof config !== 'object' ? {} : config
  try {
    ctx.effect(() => ctx.webServer.register({
      kind: 'prefix',
      path: '/agents-board',
      handler: handleRequest,
    }), 'agents-board: chime routes')
  } catch (error) {
    // No routes: chime and device probing stay silent, the server lives on.
    console.error('agents-board: chime routes failed; the board starts without them.', error)
  }
}
