// Build a change reel from reel.json: voice each line, time scenes to the audio, render to MP4. Local only.
// Usage: node build-reel.mjs <reel.json> <out.mp4> [--silent]
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CODE_BLOCKS, fillCodeBlock, renameBlock } from './bake-code.mjs';
import { CACHE, CB_PY, HF_SRC, LOCKDOWN, QWEN_PY, VENV_PY, findChrome, hasHfSource, hasNaturalVoices, hasQwenVoices } from './setup.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const [specPath, outPath] = args;
const silent = args.includes('--silent');
// --snapshot 3,12,20 writes PNG frames to <out> (a folder) instead of rendering a video.
const snapAt = args.includes('--snapshot') ? args[args.indexOf('--snapshot') + 1] : null;

const VOICES = ['af_heart', 'af_nova', 'af_sky', 'am_adam', 'am_michael', 'bf_emma', 'bf_isabella', 'bm_george'];
const ROLES = ['neutral', 'changed', 'added', 'removed', 'flag'];
// Serious looks, picked by seed. The humour pack is opt-in only, via tone: 'humour'.
export const LOOKS = ['studio', 'blueprint', 'paper', 'iso', 'riso', 'terminal', 'ink', 'dusk', 'notebook', 'whiteboard', 'infographic', 'diorama'];
// Asked for by name only, never picked by seed.

export const HUMOUR = ['sportscast', 'nature-doc', 'heist', 'auction', 'wrestling', 'bakeoff', 'awards', 'mecha', 'trailer'];
const TONES = ['default', 'humour'];
// Run by stage.html between any two scenes; a scene's `transition` is how it arrives.
export const TRANSITIONS = ['cut', 'push', 'push-up', 'blur', 'zoom', 'iris', 'wipe', 'blinds', 'light-leak', 'dip', 'glitch'];
const W = 1920, H = 1080;
// Procedural beds in music_procedural.py.
export const MUSIC_STYLES = ['jazz', 'lofi', 'garage', 'fighter', 'rocksteady', 'rumba', 'powermetal', 'deephouse', 'techno'];

// The same seed always picks the same look, so a PR's reel keeps its style across rebuilds.
export function pickLook(spec) {
  if (spec.look) return spec.look;
  const seed = String(spec.seed ?? spec.pr ?? spec.title);
  const h = createHash('sha1').update(seed).digest();
  return LOOKS[h.readUInt32BE(0) % LOOKS.length];
}

// Fail fast, before minutes of model work, with the JSON path of every problem.
export function validate(spec) {
  const errs = [];
  const need = (cond, path, msg) => { if (!cond) errs.push(`${path}: ${msg}`); };
  const str = (v) => typeof v === 'string' && v.trim() !== '';
  need(str(spec.title), 'title', 'required string');
  for (const k of ['hook', 'pr']) need(spec[k] === undefined || str(spec[k]), k, 'must be a non-empty string');
  need(spec.music === undefined || str(spec.music) || (spec.music && MUSIC_STYLES.includes(spec.music.style)
    && (spec.music.bpm === undefined || (typeof spec.music.bpm === 'number' && spec.music.bpm >= 60 && spec.music.bpm <= 180))),
    'music', `must be a MusicGen prompt, or { "style": one of ${MUSIC_STYLES.join(', ')}, "seed"?, "bpm"? }`);
  need(spec.look === undefined || LOOKS.includes(spec.look), 'look', 'must be one of ' + LOOKS.join(', '));
  if (spec.humour !== undefined) {
    need(spec.tone === 'humour', 'humour', 'only allowed with tone: humour');
    need(spec.humour.genre === undefined || spec.humour.genre === 'none' || HUMOUR.includes(spec.humour.genre), 'humour.genre', 'must be one of ' + HUMOUR.join(', ') + ', or use humour.overlay');
    need(spec.humour.overlay === undefined || str(spec.humour.overlay), 'humour.overlay', 'must be a path to an overlay .js file');
  }
  need(spec.tone === undefined || TONES.includes(spec.tone), 'tone', 'must be default or humour');
  need(spec.seed === undefined || ['string', 'number'].includes(typeof spec.seed), 'seed', 'must be a string or number');
  for (const k of ['coldOpen', 'chapters']) need(spec[k] === undefined || typeof spec[k] === 'boolean', k, 'must be true or false');
  if ((spec.scenes || []).some((s) => s.type === 'frame'))
    need(spec.scenario && str(spec.scenario.world), 'scenario', 'a reel with frame scenes records its dealt world: "scenario": { "world", "telling", "design" } (node reel/pick-scenario.mjs)');
  need(Array.isArray(spec.scenes) && spec.scenes.length > 0, 'scenes', 'required non-empty array');
  const frameIds = new Set();
  (spec.scenes || []).forEach((s, i) => {
    const p = `scenes[${i}]`;
    need(['frame', 'cast', 'flow', 'concept', 'story', 'custom', 'board', 'code', 'user', 'card'].includes(s.type), `${p}.type`, 'must be frame, cast, flow, concept, story, custom, board, code, user or card');
    need(s.transition === undefined || TRANSITIONS.includes(s.transition), `${p}.transition`, 'must be one of ' + TRANSITIONS.join(', '));
    need(s.transitionLen === undefined || (typeof s.transitionLen === 'number' && s.transitionLen >= 0.2 && s.transitionLen <= 1.5), `${p}.transitionLen`, 'must be 0.2-1.5 seconds');
    if (s.type === 'card') { need(str(s.text), `${p}.text`, 'required string'); return; }
    if (s.type === 'frame') {
      need(typeof s.id === 'string' && /^[a-z][a-z0-9-]{0,40}$/.test(s.id) && !frameIds.has(s.id), `${p}.id`, 'required, unique, lower-case letters, digits and hyphens');
      frameIds.add(s.id);
      need(str(s.src) || (Array.isArray(s.blocks) && s.blocks.length > 0), `${p}`, 'a frame needs src (its composition) or blocks, or both');
      const lines = s.lines || [];
      need(Array.isArray(lines), `${p}.lines`, 'must be an array');
      lines.forEach((l, j) => need(str(l.say), `${p}.lines[${j}].say`, 'required string'));
      if (lines.length) need(VOICES.includes(s.voice), `${p}.voice`, 'must be one of ' + VOICES.join(', '));
      else need(typeof s.hold === 'number' && s.hold > 0, `${p}.hold`, 'a frame with no lines needs hold (seconds on screen)');
      const point = (v) => v === undefined || (Array.isArray(v) && v.length === 2 && Number.isInteger(v[0]) && v[0] >= 0 && v[0] < Math.max(1, lines.length) && v[1] >= 0 && v[1] <= 1);
      (s.blocks || []).forEach((b, k) => {
        const bp = `${p}.blocks[${k}]`;
        need(typeof b.block === 'string' && /^[a-z0-9-]+$/.test(b.block), `${bp}.block`, 'required: a registry block name, such as code-diff');
        need(b.src === undefined || str(b.src), `${bp}.src`, 'must be a path to an edited copy of the block');
        const range = CODE_BLOCKS[b.block];
        if (range && !b.src) {
          need(Array.isArray(b.states) && b.states.length >= range[0] && b.states.length <= range[1] && b.states.every(str),
            `${bp}.states`, `${b.block} needs ${range[0] === range[1] ? range[0] : range.join('-')} code state(s), the real code before and after`);
          need(str(b.lang), `${bp}.lang`, 'required: the language, such as ts, js, cs or python');
        }
        need(point(b.at) && point(b.until), `${bp}`, 'at and until are [line index, fraction of that line]');
        need(b.box === undefined || (Array.isArray(b.box) && b.box.length === 3 && b.box.every((n) => typeof n === 'number')), `${bp}.box`, 'must be [x, y, width] in 1920x1080 pixels');
      });
      return;
    }
    need(Array.isArray(s.lines) && s.lines.length > 0, `${p}.lines`, 'required non-empty array');
    const lines = s.lines || [];
    lines.forEach((l, j) => need(str(l.say), `${p}.lines[${j}].say`, 'required string'));
    if (s.type === 'cast') {
      const ids = new Set();
      (s.cast || []).forEach((c, k) => {
        const cp = `${p}.cast[${k}]`;
        need(str(c.id), `${cp}.id`, 'required string'); ids.add(c.id);
        need(str(c.name), `${cp}.name`, 'required string');
        need(ROLES.includes(c.role), `${cp}.role`, 'must be one of ' + ROLES.join(', '));
        need(VOICES.includes(c.voice), `${cp}.voice`, 'must be one of ' + VOICES.join(', '));
      });
      need(ids.size > 0, `${p}.cast`, 'required non-empty array');
      lines.forEach((l, j) => {
        need(ids.has(l.who), `${p}.lines[${j}].who`, `unknown actor "${l.who}"`);
        if (l.carry) {
          need(str(l.carry.label), `${p}.lines[${j}].carry.label`, 'required string');
          need(ids.has(l.carry.to), `${p}.lines[${j}].carry.to`, `unknown actor "${l.carry.to}"`);
        }
      });
    }
    if (s.type === 'board') {
      need(VOICES.includes(s.voice), `${p}.voice`, 'must be one of ' + VOICES.join(', '));
      lines.forEach((l, j) => need(str(l.write), `${p}.lines[${j}].write`, 'required string'));
    }
    if (s.type === 'custom') need(str(s.name) && str(s.src), `${p}`, 'a custom scene needs name and src (a .js file that sets window.REEL_SCENES[name])');
    if (s.type === 'story' || s.type === 'custom') need(VOICES.includes(s.voice), `${p}.voice`, 'must be one of ' + VOICES.join(', '));
    if (s.type === 'concept') {
      need(['points', 'gate', 'fill', 'translate', 'stack', 'basket', 'pan', 'carousel', 'counter'].includes(s.kind), `${p}.kind`, 'must be points, gate, fill, translate, stack, basket, pan, carousel or counter');
      need(VOICES.includes(s.voice), `${p}.voice`, 'must be one of ' + VOICES.join(', '));
    }
    if (s.type === 'flow') {
      need(VOICES.includes(s.voice), `${p}.voice`, 'must be one of ' + VOICES.join(', '));
      const nodes = new Set(), edges = new Set();
      (s.nodes || []).forEach((n, k) => {
        need(str(n.id) && str(n.label) && Number.isInteger(n.x) && Number.isInteger(n.y), `${p}.nodes[${k}]`, 'needs id, label and integer x, y');
        nodes.add(n.id);
      });
      need(nodes.size > 1, `${p}.nodes`, 'needs at least two nodes');
      (s.edges || []).forEach((e, k) => {
        need(str(e.id) && nodes.has(e.from) && nodes.has(e.to), `${p}.edges[${k}]`, 'needs an id and from/to that name nodes');
        edges.add(e.id);
      });
      lines.forEach((l, j) => (l.do || []).forEach((a, k) => {
        const ap = `${p}.lines[${j}].do[${k}]`;
        [].concat(a.travel || []).concat(a.draw || [], a.retire || [], a.reply || [], a.to || []).forEach((id) => need(edges.has(id), ap, `unknown edge "${id}"`));
        [a.switch, a.pulse, a.morph, a.reveal].filter(Boolean).forEach((id) => need(nodes.has(id), ap, `unknown node "${id}"`));
        if (a.note) need(nodes.has(a.note) || edges.has(a.note), ap, `unknown node or edge "${a.note}"`);
      }));
    }
    if (s.type === 'code') {
      need(VOICES.includes(s.voice), `${p}.voice`, 'must be one of ' + VOICES.join(', '));
      need(str(s.file), `${p}.file`, 'required string (the path shown in the header)');
      lines.forEach((l, j) => need(Array.isArray(l.diff) && l.diff.length > 0 && l.diff.length <= 12 && l.diff.every((d) => typeof d === 'string' && /^[+ -]/.test(d)),
        `${p}.lines[${j}].diff`, '1-12 real diff lines, each starting with +, - or a space'));
    }
    if (s.type === 'user') {
      need(s.persona && str(s.persona.initials) && str(s.persona.label), `${p}.persona`, 'needs initials and label');
      need(s.persona && VOICES.includes(s.persona.voice), `${p}.persona.voice`, 'must be one of ' + VOICES.join(', '));
      need(s.screen && str(s.screen.title) && str(s.screen.before), `${p}.screen`, 'needs title and before');
      const shows = lines.some((l) => l.show === 'after');
      if (shows) need(str(s.screen && s.screen.after) && str(s.screen && s.screen.action), `${p}.screen`,
        'a line with "show": "after" needs screen.after and screen.action (the button the user clicks)');
    }
  });
  return errs;
}

// A frame or block must not load anything from the network: builds are local only.
function offline(html, name) {
  const hit = /(?:\b(?:src|href)\s*=\s*["']\s*|url\(\s*["']?\s*|@import\s+["'])((?:https?:)?\/\/[^"')\s]+)/i.exec(html);
  if (hit) throw new Error(`${name} loads ${hit[1]} from the network. Reels build offline: inline it, or use a file beside reel.json.`);
}

// Swap a registry block's CDN scripts and web fonts for local copies (gsap and three ship in node_modules).
function vendor(html) {
  return html
    .replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/gsap@[^"]+"><\/script>/g, '')
    .replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^"]+"><\/script>/g, '')
    .replace(/<link\b[^>]*fonts\.(?:googleapis|gstatic)\.com[^>]*>/g, '');
}

// When the voice says each word of a line: from Whisper's timings when the voice engine gave them
// (points of [fraction of the text, seconds]), else spread by word length.
function wordTimes(say, start, len, points) {
  const words = say.split(' '), total = say.length || 1;
  const at = (f) => {
    if (!points || points.length < 2) return len * .94 * f;
    for (let i = 1; i < points.length; i++) {
      const [f0, t0] = points[i - 1], [f1, t1] = points[i];
      if (f <= f1) return f1 > f0 ? t0 + (t1 - t0) * (f - f0) / (f1 - f0) : t1;
    }
    return points[points.length - 1][1];
  };
  let pos = 0;
  return words.map((w) => {
    const s = at(pos / total), e = at(Math.min(1, (pos + w.length) / total));
    pos += w.length + 1;
    return { w, start: +(start + s).toFixed(3), end: +(start + e).toFixed(3) };
  });
}

// Words spelt one way and said two ways. Voice engines read spelling, so the spoken text gets a respelling chosen
// from the sentence ("it was read" -> red, "to read" -> reed). Captions keep the real word. Whisper hears "red" and
// "reed" as distinct words. "live" is left alone: no respelling of it could be checked, and "lyve" was heard as "leave".
const PAST_AUX = /^(has|have|had|having|was|were|is|are|be|been|being|got|gets|get)$/;
const PRESENT_AUX = /^(to|will|would|can|could|should|shall|must|may|might|do|does|did|don't|doesn't|didn't|won't|can't|cannot|please|let's|always|never|often|then)$/;
const SINGULAR = /^(it|he|she|this|that|which|who|everyone|nobody|someone)$/;
// A plural or first/second-person subject reads in the present ("users read"); a singular noun would say "reads".
const PLURAL_SUBJECT = /^(i|you|we|they|people|both|all|many|some|few)$|[^s]s$/;
export function sayHeteronyms(text) {
  const parts = text.split(/(\s+)/), bare = parts.map((p) => p.toLowerCase().replace(/[^a-z'-]/g, ''));
  const pastSentence = /\b\w*[^e\s]ed\b|\b(was|were|had|did|yesterday|before|previously|used to)\b/i.test(text);
  const near = (i, step) => { for (let j = i + step; j >= 0 && j < parts.length; j += step) if (bare[j]) return bare[j]; return ''; };
  // A word that opens a sentence is an instruction ("Read the docs"), so it takes the present.
  const opens = (i) => { for (let j = i - 1; j >= 0; j--) if (parts[j].trim()) return /[.!?:;]["')\]]*$/.test(parts[j]); return true; };
  const keep = (orig, spoken) => orig.replace(/[A-Za-z]+/, (w) => (w[0] === w[0].toUpperCase() ? spoken[0].toUpperCase() + spoken.slice(1) : spoken));
  return parts.map((p, i) => {
    const w = bare[i], prev = near(i, -1), next = near(i, 1);
    if (w === 'read' || w === 'reread') {
      const past = PRESENT_AUX.test(prev) || next === 'only' || opens(i) ? false
        : PAST_AUX.test(prev) || SINGULAR.test(prev) || (/^[a-z]+$/.test(prev) && !PLURAL_SUBJECT.test(prev)) ? true : pastSentence;
      return keep(p, (w === 'reread' ? 're' : '') + (past ? 'red' : 'reed'));
    }
    if (w === 'read-only') return keep(p, 'reed');
    return p;
  }).join('');
}

// F.cue(line, word, end) inside a frame: seconds from the frame's start when that word (its text, or its index) is
// spoken; end: true gives when it finishes. With no word, the line's start (or end).
const CUE = `F.cue = function (line, word, end) {
  var l = F.lines[line]; if (!l) throw new Error('cue: no line ' + line);
  if (word == null) return end ? l.start + l.len : l.start;
  var norm = function (s) { return String(s).toLowerCase().replace(/[^a-z0-9-]/g, ''); };
  var i = typeof word === 'number' ? word : l.words.findIndex(function (w) { return norm(w.w).indexOf(norm(word)) === 0; });
  if (i < 0 || i >= l.words.length) throw new Error('cue: no word ' + word + ' in line ' + line);
  return end ? l.words[i].end : l.words[i].start;
};`;

// Effects that fill the room. At most one in 6 s, and max(2, total / 15) in a reel.
export const BIG = new Set(['sparkle', 'chime', 'notification', 'riser', 'impact-bass', 'impact-bass-1', 'impact-bass-2', 'whoosh-cinematic']);

// Keep the cues a viewer can hear as separate events. Author cues (a line's sfx) are placed before automatic ones,
// each in time order; a cue that breaks a rule is dropped and logged, and a dropped cue never counts towards a limit.
export function budgetCues(cues, total) {
  const cap = Math.max(2, Math.ceil(total / 15)), kept = [];
  const order = [...cues].sort((a, b) => (a.auto ? 1 : 0) - (b.auto ? 1 : 0) || a.at - b.at);
  for (const c of order) {
    const big = BIG.has(c.name), near = (s) => kept.filter((k) => Math.abs(k.at - c.at) < s);
    // Every 2 s window that holds c starts at c itself or at a kept cue less than 2 s before it.
    const crowded = [c.at, ...near(2).map((k) => k.at).filter((t) => t < c.at)]
      .some((s) => kept.filter((k) => k.at >= s && k.at < s + 2).length >= 3);
    // A repeated ping steps through the chord (1, 5, 3), so a run of ticks reads as a phrase, not a copy.
    const why = c.name !== 'ping' && near(big ? 8 : 1.2).some((k) => k.name === c.name) ? `the same effect within ${big ? 8 : 1.2} s`
      : crowded ? 'more than 3 effects in 2 s'
      : big && near(6).some((k) => BIG.has(k.name)) ? 'more than one big effect in 6 s'
      : big && kept.filter((k) => BIG.has(k.name)).length >= cap ? `more than ${cap} big effects in a ${total} s reel`
      : null;
    if (why) console.warn(`reel: dropped sfx ${c.name} at ${c.at.toFixed(2)}s: ${why}`); else kept.push(c);
  }
  return kept.sort((a, b) => a.at - b.at);
}

// Bundled effects differ by over 30 LU, so each is gained to a common loudness before its authored vol.
const SFX_REF = -18, SFX_MAX_GAIN = 4;
let levels = null;
// A file's loudest 400 ms (max momentary loudness), cached by content. Padding gives short files a full window.
function sfxLevel(file) {
  const cacheFile = join(CACHE, 'sfx-levels.json');
  if (!levels) { try { levels = JSON.parse(readFileSync(cacheFile, 'utf8')); } catch { levels = {}; } }
  const sha = createHash('sha1').update(readFileSync(file)).digest('hex');
  if (levels[sha] === undefined) {
    const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'apad=pad_dur=0.5,ebur128', '-f', 'null', '-'], { encoding: 'utf8' });
    const m = [...(r.stderr || '').matchAll(/\bM:\s*(-?\d+(?:\.\d+)?)/g)].map((x) => +x[1]);
    if (!m.length) throw new Error(`could not measure the loudness of ${file}`);
    levels[sha] = Math.max(...m);
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(cacheFile, JSON.stringify(levels, null, 1));
  }
  return levels[sha];
}
export const sfxGain = (vol, level) => Math.min(SFX_MAX_GAIN, vol * 10 ** ((SFX_REF - level) / 20));

// Bundle a three entry into an IIFE once per three version and entry content (r160+ ship no UMD build).
async function bundleThree(entry) {
  const src = join(here, entry), version = JSON.parse(readFileSync(join(here, 'node_modules', 'three', 'package.json'), 'utf8')).version;
  const out = join(CACHE, 'lib', `${entry.replace(/\.js$/, '')}-${version}-${createHash('sha1').update(readFileSync(src)).digest('hex').slice(0, 8)}.global.js`);
  if (!existsSync(out)) {
    const { build } = await import('esbuild');
    await build({ entryPoints: [src], bundle: true, format: 'iife', minify: true, legalComments: 'eof', outfile: out, absWorkingDir: here, logLevel: 'error' });
  }
  return out;
}

// An opt-in voice server on this machine with an OpenAI-style speech endpoint.
async function speakHttp(jobs) {
  const url = new URL(process.env.REEL_TTS_URL || 'http://127.0.0.1:3900/v1/audio/speech');
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw new Error('REEL_TTS_URL must point at this machine (127.0.0.1, localhost or [::1])');
  const voices = JSON.parse(process.env.REEL_TTS_VOICES || '{}');
  for (const j of jobs) {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: process.env.REEL_TTS_MODEL || 'tts-1', voice: voices[j.voice] || j.voice, input: j.text, response_format: 'wav' }) });
    if (!res.ok) throw new Error(`voice server: ${res.status} ${(await res.text()).slice(0, 200)}`);
    writeFileSync(j.out, Buffer.from(await res.arrayBuffer()));
  }
}

async function main() {
  if (!specPath || !outPath) throw new Error('Usage: node build-reel.mjs <reel.json> <out.mp4> [--silent]');
  const spec = JSON.parse(readFileSync(specPath, 'utf8'));
  const errs = validate(spec);
  if (errs.length) { console.error('reel.json is not valid:\n  ' + errs.join('\n  ')); process.exit(1); }

  const chrome = findChrome();
  if (!chrome) throw new Error('No Chrome found. Run: node setup.mjs --check');
  const env = { ...process.env, ...LOCKDOWN, HYPERFRAMES_BROWSER_PATH: chrome };
  // Hosted services must never see PR content: drop any keys that would switch them on.
  for (const k of ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'HEYGEN_API_KEY', 'HYPERFRAMES_API_KEY', 'ELEVENLABS_API_KEY', 'OPENAI_API_KEY']) delete env[k];
  const mods = join(here, 'node_modules');
  // No shell anywhere: arguments come from reel.json, so they must never reach cmd.exe or sh.
  const run = (cmd, a, cwd) => execFileSync(cmd, a, { cwd, env, encoding: 'utf8' });
  const hyperframes = (a, cwd) => run(process.execPath, [join(mods, 'hyperframes', 'bin', 'hyperframes.mjs'), ...a], cwd);
  const duration = (f) => parseFloat(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]));

  const proj = mkdtempSync(join(tmpdir(), 'pr-reel-'));
  try {
    mkdirSync(join(proj, 'audio'), { recursive: true });

    let musicIn = null;

    // Voice every line in one batch (one model load), then lay scenes end to end on the clock.
    const GAP = 0.15, INTRO = 0.4, OUTRO_PAD = 0.2;
    const voiceOf = (scene, line) => scene.type === 'cast' ? scene.cast.find((c) => c.id === line.who).voice
      : scene.type === 'user' ? scene.persona.voice : scene.voice;
    const lines = spec.scenes.flatMap((s) => (s.lines || []).map((l) => ({ s, l })));
    lines.forEach((x, i) => { x.wav = join(proj, 'audio', `line${i}.wav`); });
    if (!silent) {
      // The cloning engines take their timbre from a reference clip. Each is a Kokoro voice reading REF, so no real person is cloned.
      const REF = 'This change moves one request to a new service. The old path stays in place behind the flag. Reviewers should check the error messages, and confirm that crop still works the same way as before.';
      const jobs = lines.map((x) => ({ text: x.l.speak || sayHeteronyms(x.l.say), voice: voiceOf(x.s, x.l), out: x.wav, ref_text: REF }));
      writeFileSync(join(proj, 'tts.json'), JSON.stringify(jobs));
      // Qwen3-TTS when installed, then Chatterbox, then Kokoro; REEL_TTS=qwen|chatterbox|kokoro|http picks one.
      const engine = process.env.REEL_TTS || (hasQwenVoices() ? 'qwen' : hasNaturalVoices() ? 'chatterbox' : 'kokoro');
      if (engine === 'qwen' && !hasQwenVoices()) throw new Error('REEL_TTS=qwen, but Qwen3-TTS is not installed. Run: node setup.mjs --qwen-voices');
      if (engine === 'chatterbox' && !hasNaturalVoices()) throw new Error('REEL_TTS=chatterbox, but it is not installed. Run: node setup.mjs --natural-voices');
      if (engine === 'http') await speakHttp(jobs);
      else if (engine === 'qwen' || engine === 'chatterbox') {
        const refs = join(CACHE, 'voices');
        mkdirSync(refs, { recursive: true });
        const missing = [...new Set(lines.map((x) => voiceOf(x.s, x.l)))].filter((v) => !existsSync(join(refs, v + '.wav')));
        if (missing.length) {
          writeFileSync(join(proj, 'refs.json'), JSON.stringify(missing.map((v) => ({ text: REF, voice: v, out: join(refs, v + '.wav'), speed: 1.0 }))));
          run(VENV_PY, [join(here, 'tts_batch.py'), 'refs.json'], proj);
        }
        const said = engine === 'qwen' ? run(QWEN_PY, [join(here, 'tts_qwen.py'), 'tts.json'], proj)
          : run(CB_PY, [join(here, 'tts_chatterbox.py'), 'tts.json'], proj);
        for (const l of said.split('\n')) if (l.includes('closest of')) console.warn('reel: check pronunciation: (closest' + l.split('(closest')[1]);
      } else run(VENV_PY, [join(here, 'tts_batch.py'), 'tts.json'], proj);
    }
    // The cold open (hook) runs before the first scene, unless the reel opens on a frame of its own.
    const OPEN = spec.coldOpen === false ? 0 : 1.7;
    spec.timing = { open: OPEN };
    let t = OPEN, n = 0;
    const clips = [];
    for (const scene of spec.scenes) {
      scene.start = t;
      t += INTRO;
      for (const line of scene.lines || []) {
        let len = Math.max(1.6, line.say.split(/\s+/).length * 0.36);
        if (!silent) {
          len = duration(lines[n].wav);
          clips.push({ src: `audio/line${n}.wav`, start: t, len });
        }
        line.start = t; line.len = len; n++;
        t += len + GAP;
      }
      if (scene.type === 'card') t += scene.hold || 1.6;
      if (scene.type === 'frame') t += scene.hold || 0;
      scene.end = t + OUTRO_PAD;
      t = scene.end;
    }
    const total = Math.ceil(t * 10) / 10;
    lines.forEach((x) => {
      const pts = existsSync(x.wav + '.words.json') ? JSON.parse(readFileSync(x.wav + '.words.json', 'utf8')) : null;
      x.l.words = wordTimes(x.l.say, x.l.start, x.l.len, pts);
    });
    // A transition straddles the cut: the scene leaving stays up D/2 longer, the one arriving starts D/2 early.
    spec.scenes.forEach((sc) => { sc.vstart = sc.start; sc.vend = sc.end; });
    spec.scenes.forEach((sc, i) => {
      const D = sc.transition && sc.transition !== 'cut' && (i > 0 || OPEN > 0) ? (sc.transitionLen || 0.6) : 0;
      sc.tin = D;
      if (!D) return;
      sc.vstart = sc.start - D / 2;
      if (i > 0) spec.scenes[i - 1].vend = sc.start + D / 2;
    });
    if (total > 60 && !snapAt) console.warn('reel: ' + total + 's is over the 60 s cap; cut lines before the full render (about 2.4 spoken words a second).');

    // ffmpeg with a filter graph and one [out]. A long graph goes in a file: Windows caps a command line at 32k characters.
    const ffmpeg = (ins, graph, out) => {
      const g = graph.length > 6000 ? (writeFileSync(join(proj, out + '.graph'), graph), ['-filter_complex_script', out + '.graph']) : ['-filter_complex', graph];
      run('ffmpeg', ['-v', 'error', '-y', ...ins, ...g, '-map', '[out]', '-t', String(total), out], proj);
    };
    // One voice stem: the music and the effects both duck under it.
    const voiceWav = clips.length ? 'audio/voice.wav' : null;
    if (voiceWav) ffmpeg(clips.flatMap((c) => ['-i', c.src]), clips.map((c, i) =>
      `[${i}:a]aresample=44100,aformat=channel_layouts=stereo,adelay=${Math.round(c.start * 1000)}:all=1[v${i}]`).join(';')
      + `;${clips.map((_, i) => `[v${i}]`).join('')}amix=inputs=${clips.length}:normalize=0,apad,atrim=0:${total}[out]`, voiceWav);

    // Tonal effects follow the bed's key; with no procedural bed, any key fits.
    let tonal = { key: 60, third: 4 };
    if (!silent && spec.music) {
      const dir = join(CACHE, 'music');
      mkdirSync(dir, { recursive: true });
      if (typeof spec.music === 'object') {
        // Procedural: written for this reel's length and cuts in a few seconds, so never cached.
        // Each cut carries its transition length: a dissolve widens the window a cymbal can land in.
        const cuts = spec.scenes.slice(1).map((s) => `${s.start.toFixed(2)}:${s.tin}`).concat(OPEN ? [`${OPEN.toFixed(2)}:${spec.scenes[0].tin}`] : []);
        musicIn = join(proj, 'audio', 'bed.wav');
        run(VENV_PY, [join(here, 'music_procedural.py'), spec.music.style, String(total), musicIn,
          '--seed', String(spec.music.seed ?? spec.seed ?? spec.pr ?? spec.title), '--cues', cuts.join(','),
          '--events', join(proj, 'audio', 'bed.json'), ...(spec.music.bpm ? ['--bpm', String(spec.music.bpm)] : [])], proj);
        const bed = JSON.parse(readFileSync(join(proj, 'audio', 'bed.json'), 'utf8'));
        tonal = { key: bed.key, third: bed.third };
      } else {
        // MusicGen beds take minutes on CPU, so each is cached by prompt and length (in 10 s steps, so it never loops).
        const secs = Math.ceil(total / 10) * 10;
        musicIn = join(dir, createHash('sha1').update(spec.music + ':' + secs).digest('hex').slice(0, 12) + '.wav');
        if (!existsSync(musicIn)) run(VENV_PY, [join(here, 'music.py'), spec.music, String(secs), musicIn], dir);
      }
    }

    let music = '';
    if (musicIn) {
      // Loop and fade the bed, then duck it under the voice with a sidechain compressor.
      const fade = `afade=t=in:d=0.8,afade=t=out:st=${Math.max(0, total - 2)}:d=2`;
      ffmpeg(['-stream_loop', '-1', '-i', musicIn, ...(voiceWav ? ['-i', voiceWav] : [])], voiceWav
        ? `[0:a]aresample=44100,atrim=0:${total},${fade}[bed];[1:a]aresample=44100[vo];[bed][vo]sidechaincompress=threshold=0.015:ratio=9:attack=25:release=420[out]`
        : `[0:a]aresample=44100,atrim=0:${total},${fade}[out]`, 'audio/music.wav');
      music = `<audio data-start="0" data-duration="${total}" data-track-index="9" data-volume="0.3" src="audio/music.wav"></audio>`;
    }

    // Sound effects: in-key bells written for this reel, else the HyperFrames bundle (Pixabay licence).
    const sfxDir = join(mods, 'hyperframes', 'dist', 'skills', 'media-use', 'audio', 'assets', 'sfx');
    const tonalDir = join(proj, 'audio', 'tonal');
    if (!silent) run(VENV_PY, [join(here, 'sfx_tonal.py'), tonalDir, '--key', String(tonal.key), '--third', String(tonal.third)], proj);
    const sfxPath = (name) => [join(tonalDir, name + '.wav'), join(sfxDir, name + '.mp3')].find((f) => existsSync(f));
    // A cue that plays again takes its next variant (name, name-1, name-2), so repeats never sound copied.
    const variants = (name) => [name, `${name}-1`, `${name}-2`, `${name}-3`].map(sfxPath).filter(Boolean);
    const sfx = [];
    const cue = (name, at, vol, auto = true) => {
      if (!variants(name).length) return console.warn(`reel: no sound effect named ${name}; skipped`);
      if (!silent && at >= 0 && at < total) sfx.push({ name, at, vol, auto });
    };
    // Every cue sits on a visible event: a moving transition, an item landing, a lever moving. A plain cut,
    // a dip or an iris stays dry: the procedural bed already marks cuts on the beat.
    const ARRIVE = { push: 'whoosh-short', 'push-up': 'whoosh-short', wipe: 'whoosh-short', blinds: 'whoosh-short', zoom: 'whoosh-short', blur: 'whoosh-short', glitch: 'glitch' };
    spec.scenes.forEach((sc, i) => {
      if ((i > 0 || OPEN > 0) && ARRIVE[sc.transition]) cue(ARRIVE[sc.transition], sc.start - Math.min(0.22, sc.tin / 2), sc.transition === 'glitch' ? 0.25 : 0.3);
    });
    // When each concept step's motion lands, relative to the step start (line start + 20% of the line).
    const STEP_SFX = {
      basket: (q) => q.add ? [['pop', 0.72, 0.45]] : q.remove ? [['whoosh-short', 0.05, 0.25]] : q.receipt ? [['typing', 0.3, 0.2]] : [],
      pan: (q) => q.add ? [['pop', 0.72, 0.45]] : q.remove ? [['whoosh-short', 0.05, 0.25]] : q.receipt ? [['chime', 0.2, 0.25]] : [],
      counter: () => [['whoosh-short', 0.3, 0.22], ['ping', 1.35, 0.3]],
      stack: () => [['pop', 0.7, 0.4]],
      carousel: () => [['click-soft', 0, 0.35]],
      gate: () => [['click', 0, 0.4]],
      points: () => [['click', 0, 0.4]],
    };
    spec.scenes.forEach((sc) => {
      const steps = sc.labels?.steps || [];
      (sc.lines || []).forEach((l, li) => {
        if (sc.type === 'concept' && STEP_SFX[sc.kind]) {
          const n = l.step ?? li, q = steps[n];
          if (q || (!steps.length && n < (sc.lines || []).length)) for (const [name, dt, vol] of STEP_SFX[sc.kind](q || {})) cue(name, l.start + l.len * 0.2 + dt, vol);
        }
        if (sc.type === 'flow') for (const a of l.do || []) if (a.switch) cue('click', l.start + l.len * (a.at || 0), 0.4);
        // Custom scenes name their own cues: "sfx": [{ "name": "pop", "at": 0.6 }], at as a fraction of the line.
        // "word" places the cue on a spoken word instead (plus "offset" seconds), where frames reveal things.
        for (const s of l.sfx || []) {
          const bare = (x) => String(x).toLowerCase().replace(/[^a-z0-9-]/g, '');
          const w = s.word && l.words.find((x) => bare(x.w).startsWith(bare(s.word)));
          if (s.word && !w) console.warn(`reel: sfx word "${s.word}" is not in "${l.say}"`);
          cue(s.name, w ? w.start + (s.offset || 0) : l.start + l.len * (s.at || 0), s.vol ?? 0.35, false);
        }
      });
      for (const l of sc.lines || []) {
        if (sc.type === 'cast' && l.enter) cue('whoosh-short', l.start - 0.55, 0.25);
        if (sc.type === 'cast' && l.carry) { const t0 = l.start + l.len * 0.45; cue('whoosh-short', t0 + 0.15, 0.22); cue('pop', t0 + 1.12, 0.45); }
        if (sc.type === 'code') cue('typing', l.start + 0.15, 0.22);
        if (sc.type === 'board' && l.box) cue('chime', l.start + Math.min(l.len * 0.72, 2.4) + 0.1, 0.32);
        if (sc.type === 'user' && l.show === 'after') { cue('click', l.start + 0.78, 0.5); cue('pop', l.start + 1.05, 0.3); }
      }
    });
    // One effects stem: budget, rotate variants, level each file, then mix, duck under the voice and limit.
    const played = {};
    const kept = budgetCues(sfx, total).map((c) => {
      const v = variants(c.name), file = v[(played[c.name] = (played[c.name] ?? -1) + 1) % v.length];
      return { ...c, file, gain: sfxGain(c.vol, sfxLevel(file)) };
    });
    let sfxTag = '';
    if (kept.length) {
      const n = kept.length;
      ffmpeg([...kept.flatMap((c) => ['-i', c.file]), ...(voiceWav ? ['-i', voiceWav] : [])], [
        ...kept.map((c, i) => `[${i}:a]aresample=44100,aformat=channel_layouts=stereo,volume=${c.gain.toFixed(4)},adelay=${Math.round(c.at * 1000)}:all=1[s${i}]`),
        `${kept.map((_, i) => `[s${i}]`).join('')}amix=inputs=${n}:normalize=0[mix]`,
        voiceWav ? `[${n}:a]aresample=44100,aformat=channel_layouts=stereo[vo];[mix][vo]sidechaincompress=threshold=0.03:ratio=3:attack=5:release=250[duck]` : '[mix]anull[duck]',
        // level=0: alimiter otherwise lifts its output back to full scale.
        `[duck]alimiter=limit=0.5:level=0,apad,atrim=0:${total}[out]`,
      ].join(';'), 'audio/sfx.wav');
      sfxTag = `<audio data-start="0" data-duration="${total}" data-track-index="3" data-volume="1" src="audio/sfx.wav"></audio>`;
    }

    const audio = clips.map((c, i) =>
      `<audio data-start="${c.start.toFixed(2)}" data-duration="${c.len.toFixed(2)}" data-track-index="${1 + (i % 2)}" data-volume="1" src="${c.src}"></audio>`
    ).concat(sfxTag).join('\n') + '\n' + music;

    // Fonts ship as files from local npm packages, so the reel looks the same on every OS.
    mkdirSync(join(proj, 'fonts'), { recursive: true });
    copyFileSync(join(mods, '@fontsource-variable', 'archivo', 'files', 'archivo-latin-wdth-normal.woff2'), join(proj, 'fonts', 'archivo-wdth.woff2'));
    copyFileSync(join(mods, '@fontsource', 'jetbrains-mono', 'files', 'jetbrains-mono-latin-500-normal.woff2'), join(proj, 'fonts', 'jetbrains-mono-500.woff2'));
    copyFileSync(join(mods, '@fontsource', 'caveat', 'files', 'caveat-latin-600-normal.woff2'), join(proj, 'fonts', 'caveat-600.woff2'));
    copyFileSync(join(mods, 'gsap', 'dist', 'gsap.min.js'), join(proj, 'gsap.min.js'));
    copyFileSync(join(here, 'art.js'), join(proj, 'art.js'));
    const look = pickLook(spec);
    copyFileSync(join(here, 'looks', look + '.js'), join(proj, 'look.js'));
    // Humour is an overlay on top of the look: a bundled genre, or one written for this reel.
    let overlayTag = '';
    if (spec.tone === 'humour') {
      // One comic frame per reel: the one the script asked for, or one picked by seed.
      const h = spec.humour || {};
      const seed = createHash('sha1').update('humour:' + String(spec.seed ?? spec.pr ?? spec.title)).digest().readUInt32BE(0);
      const genre = h.genre || HUMOUR[seed % HUMOUR.length];
      // genre 'none': the joke lives in the script and the device alone.
      if (genre !== 'none') {
        const src = h.overlay ? resolve(dirname(resolve(specPath)), h.overlay) : join(here, 'looks', 'humour', genre + '.js');
        copyFileSync(src, join(proj, 'overlay.js'));
        overlayTag = '<script src="overlay.js"></script>';
      }
    }
    // Frame scenes: each is a HyperFrames sub-composition, plus any registry blocks, mounted in #fw-<n> over the
    // scene's window. A frame reads its own timings from window.__REEL[id], in seconds from its own start.
    const specDir = dirname(resolve(specPath)), frameData = {}, mounts = [], libs = new Set();
    let track = 20;
    const mount = (id, start, dur, box) => `<div class="m" id="m-${id}" data-composition-id="${id}" data-composition-src="compositions/${id}.html"`
      + ` data-start="${start.toFixed(3)}" data-duration="${dur.toFixed(3)}" data-track-index="${track++}" data-width="${W}" data-height="${H}"`
      + (box ? ` style="transform:translate(${box[0]}px,${box[1]}px) scale(${(box[2] / W).toFixed(4)});transform-origin:0 0"` : '') + '></div>';
    if (spec.scenes.some((s) => s.type === 'frame')) mkdirSync(join(proj, 'compositions'), { recursive: true });
    for (const [i, sc] of spec.scenes.entries()) {
      if (sc.type !== 'frame') continue;
      const local = (x) => +(x - sc.vstart).toFixed(3), dur = sc.vend - sc.vstart;
      const L = sc.lines || [], when = (p, dflt) => {
        if (!p) return dflt;
        const l = L[p[0]];
        return l ? l.start + l.len * p[1] : sc.start + (sc.end - sc.start) * p[1];
      };
      frameData[sc.id] = { duration: +dur.toFixed(3), end: local(sc.end), width: W, height: H, transitionIn: sc.tin || 0,
        lines: L.map((l) => ({ say: l.say, start: local(l.start), len: +l.len.toFixed(3), words: l.words.map((w) => ({ w: w.w, start: local(w.start), end: local(w.end) })) })) };
      const inner = [];
      if (sc.src) {
        const html = readFileSync(resolve(specDir, sc.src), 'utf8');
        if (!/<template[\s>]/.test(html)) throw new Error(`${sc.src}: a frame is a sub-composition, so everything goes inside <template>`);
        if (!html.includes(`data-composition-id="${sc.id}"`)) throw new Error(`${sc.src}: its root needs data-composition-id="${sc.id}" (the scene id)`);
        offline(html, sc.src);
        if (html.includes('THREE_MODERN')) libs.add('three-modern');
        // The timings go inside the frame itself: a sub-composition gets copies of host data, not its functions.
        const data = JSON.stringify(frameData[sc.id]).replace(/</g, '\\u003c');
        const boot = `<script>(function () { var R = window.__REEL = window.__REEL || {}, F = R[${JSON.stringify(sc.id)}] = ${data};\n${CUE}\n})();</script>`;
        writeFileSync(join(proj, 'compositions', sc.id + '.html'), html.replace(/<template[^>]*>/, (t) => t + '\n' + boot));
        inner.push(mount(sc.id, sc.vstart, dur));
      }
      for (const [k, b] of (sc.blocks || []).entries()) {
        const uid = `${sc.id}-${b.block}-${k}`, t0 = when(b.at, sc.vstart), t1 = when(b.until, sc.vend);
        const from = b.src ? resolve(specDir, b.src) : join(HF_SRC, 'registry', 'blocks', b.block, b.block + '.html');
        if (!b.src && !hasHfSource()) throw new Error('Registry blocks need the HyperFrames references. Run: node setup.mjs');
        if (!existsSync(from)) throw new Error(`no block named ${b.block} (looked in ${from})`);
        let html = readFileSync(from, 'utf8');
        if (/three(?:\.min)?\.js/.test(html)) libs.add('three');
        html = vendor(html);
        if (b.states) html = await fillCodeBlock(html, { ...b, id: uid, duration: +(t1 - t0).toFixed(2) });
        html = renameBlock(html, b.block, uid);
        offline(html, b.src || b.block);
        writeFileSync(join(proj, 'compositions', uid + '.html'), html);
        inner.push(mount(uid, t0, t1 - t0, b.box));
      }
      mounts.push(`<div class="fw" id="fw-${i}">${inner.join('')}</div>`);
    }
    // Registry blocks get window.THREE (the r147 look); lit 3D frames get window.THREE_MODERN. Separate bundles, so
    // the r147 patches never reach a modern frame.
    let libTags = '';
    for (const [lib, entry] of [['three', 'three-global.js'], ['three-modern', 'three-modern.js']]) {
      if (!libs.has(lib)) continue;
      copyFileSync(await bundleThree(entry), join(proj, lib + '.js'));
      libTags += `<script src="${lib}.js"></script>`;
    }
    if (libs.has('three-modern')) { copyFileSync(join(here, 'lit.js'), join(proj, 'lit.js')); libTags += '<script src="lit.js"></script>'; }

    const html = readFileSync(join(here, 'stage.html'), 'utf8')
      .replace('{{FRAMES}}', () => mounts.join('\n'))
      .replace('{{LIBS}}', () => libTags)
      .replaceAll('{{TOTAL}}', String(total))
      .replace('{{AUDIO}}', audio)
      .replace('{{OVERLAY}}', overlayTag)
      .replace('{{CUSTOM}}', spec.scenes.filter((x) => x.type === 'custom').map((x, i) => {
        copyFileSync(resolve(dirname(resolve(specPath)), x.src), join(proj, 'custom-' + i + '.js'));
        return '<script src="custom-' + i + '.js"></script>';
      }).join('\n'))
      .replace('{{SPEC}}', () => JSON.stringify(spec).replace(/</g, '\\u003c'))
      // Snapshots are the check pass: mark overlaps, off-frame and early text on the PNGs themselves.
      .replace('{{LINT}}', () => snapAt && process.env.REEL_LINT !== '0' ? (copyFileSync(join(here, 'lint.js'), join(proj, 'lint.js')), '<script src="lint.js"></script>') : '');
    writeFileSync(join(proj, 'index.html'), html);

    if (snapAt) hyperframes(['snapshot', '--at', snapAt, '--no-end', '--describe', 'false', '-o', resolve(outPath), '.'], proj);
    // 30 fps at 1920x1080: frames carry real camera and type motion now.
    else hyperframes(['render', '--fps', process.env.REEL_FPS || '30', '-o', resolve(outPath)], proj);
    console.log(`reel: ${total}s, ${n} lines, look ${look} -> ${outPath}`);
    // Log the world and design, so pick-scenario.mjs deals something else next time. Snapshots are drafts, not logged.
    if (!snapAt && spec.scenario) {
      const hist = join(CACHE, 'history.json');
      let h = [];
      try { h = JSON.parse(readFileSync(hist, 'utf8')); } catch { h = []; }
      h.push({ pr: spec.pr || spec.title, world: spec.scenario.world, telling: spec.scenario.telling, design: spec.scenario.design, at: new Date().toISOString() });
      writeFileSync(hist, JSON.stringify(h.slice(-50), null, 1));
    }
  } finally {
    // The build folder holds PR-derived narration; never leave it in temp.
    if (process.env.REEL_KEEP) console.log('kept build: ' + proj); else rmSync(proj, { recursive: true, force: true });
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main().catch((e) => { console.error(e.message || e); process.exit(1); });
