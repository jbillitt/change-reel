#!/usr/bin/env node
// Deals seeded scenario candidates for a change reel, so reels vary instead of repeating the examples.
//   node reel/pick-scenario.mjs --pattern reroute --seed "$PR" [--humour] [--n 3] [--avoid coffee-stand,pan]
//   node reel/pick-scenario.mjs --list     # the whole catalogue, with the number of combinations
// Worlds and designs from the last reels built on this machine are avoided automatically (--no-history turns it off).
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { PATTERNS, WORLDS, TELLINGS, GENRES, LOOKS, DESIGNS } from './scenarios.mjs';

export const HISTORY = join(homedir(), '.cache', 'pr-reel', 'history.json');

const args = process.argv.slice(2), opt = (k) => { const i = args.indexOf('--' + k); return i < 0 ? undefined : args[i + 1]; };
const has = (k) => args.includes('--' + k);

if (has('list')) {
  const out = ['# Change reel scenarios', '', '## Change patterns', ...Object.entries(PATTERNS).map(([k, v]) => `- \`${k}\`: ${v}`),
    '', '## Worlds', ...WORLDS.map((w) => `- \`${w.id}\` ${w.world} (${w.kind}; ${w.fits.join(', ')}): ${w.map}`),
    '', '## Tellings', ...TELLINGS.map((t) => `- \`${t.id}\`: ${t.telling}`),
    '', '## Designs (for frame scenes)', ...DESIGNS.map((d) => `- \`${d.id}\` (${d.source}): ${d.brief}`),
    '', '## Humour frames', ...GENRES.map((g) => `- \`${g.id}\`: ${g.frame}${g.overlay ? ' (bundled overlay)' : ''}`),
    '', `Standard: ${WORLDS.length} worlds x ${TELLINGS.length} tellings x ${DESIGNS.length} designs = ${WORLDS.length * TELLINGS.length * DESIGNS.length} combinations.`,
    `Humour: ${WORLDS.length} worlds x ${GENRES.length} frames x ${DESIGNS.length} designs = ${WORLDS.length * GENRES.length * DESIGNS.length} combinations.`,
    'Both before inventing a world that is not listed.'];
  console.log(out.join('\n'));
  process.exit(0);
}

const pattern = opt('pattern'), humour = has('humour'), n = Number(opt('n') || 3);
const seed = opt('seed') || String(Date.now()), avoid = new Set((opt('avoid') || '').split(',').filter(Boolean));
let recent = [];
try { if (!has('no-history') && existsSync(HISTORY)) recent = JSON.parse(readFileSync(HISTORY, 'utf8')); } catch { recent = []; }
recent.slice(-8).forEach((r) => r.world && avoid.add(r.world));
const recentDesigns = new Set(recent.slice(-4).map((r) => r.design).filter(Boolean));
if (pattern && !PATTERNS[pattern]) { console.error(`unknown --pattern ${pattern}; one of: ${Object.keys(PATTERNS).join(', ')}`); process.exit(2); }

// A small seeded generator: the same seed and pattern always deal the same hand.
let state = createHash('sha1').update(`${seed}|${pattern || ''}|${humour}`).digest().readUInt32LE(0) || 1;
const rnd = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const fitting = WORLDS.filter((w) => !avoid.has(w.id) && (!pattern || w.fits.includes(pattern)));
const pool = fitting.length >= n ? fitting : WORLDS.filter((w) => !avoid.has(w.id));
const worlds = shuffle(pool).slice(0, n), tellings = shuffle(TELLINGS), genres = shuffle(GENRES.filter((g) => !avoid.has(g.id)));
const designs = shuffle(DESIGNS.filter((d) => !avoid.has(d.id) && !recentDesigns.has(d.id)));

const hand = worlds.map((w, i) => {
  const d = designs[i % designs.length];
  const c = { world: w.id, scene: w.world, build: 'frame scenes: draw this world, with its parts labelled by the real component names', map: w.map,
    design: d.id, design_brief: d.brief, ...(d.fonts ? { fonts: d.fonts } : {}), look: d.source === 'look' ? d.id : 'studio' };
  if (humour) {
    const g = genres[i % genres.length];
    c.genre = g.id; c.frame = g.frame;
    c.overlay = g.overlay ? `bundled: humour.genre "${g.overlay}"` : g.stage ? `genre "none", "stage": "${g.stage}"` : 'write humour.overlay for this reel, or genre "none"';
    if (g.look) { c.look = g.look; c.design = g.look; }
  } else { c.telling_id = tellings[i % tellings.length].id; c.telling = tellings[i % tellings.length].telling; }
  return c;
});
console.log(JSON.stringify({ pattern: pattern || null, humour, candidates: hand, avoided: [...avoid], note: 'Pick the candidate that explains this diff best, or invent a better world. Record the pick as reel.json "scenario": { world, telling, design }. Draw the world; never fall back to a boxes-and-arrows system diagram.' }, null, 2));
