// Bake code into the token shape the HyperFrames code-* blocks read (window.__TOKENS), with a local Shiki.
// A token keeps one key across states (its text plus how often that text has appeared), so code-morph glides it.
import { codeToTokens } from 'shiki';

const THEME = 'github-dark';

export async function bakeStates(states, lang) {
  const out = [];
  let bg, fg;
  for (const code of states) {
    const r = await codeToTokens(code, { lang, theme: THEME });
    bg = r.bg; fg = r.fg;
    const seen = new Map(), tokens = [];
    r.tokens.forEach((line, i) => {
      if (i) tokens.push({ key: 'nl-' + i, content: '\n', color: fg, fontStyle: 0 });
      for (const t of line) {
        const n = (seen.get(t.content) || 0) + 1;
        seen.set(t.content, n);
        tokens.push({ key: t.content + '#' + n, content: t.content, color: t.color || fg, fontStyle: t.fontStyle || 0 });
      }
    });
    out.push({ code, tokens });
  }
  return { lang, theme: THEME, bg, fg, states: out };
}

// How many code states each block reads: [min, max].
export const CODE_BLOCKS = {
  'code-diff': [2, 2], 'code-morph': [2, 8], 'code-typing': [1, 1], 'code-highlight': [1, 1], 'code-scroll': [1, 1],
  'code-3d-extrude': [1, 1], 'code-particle-assemble': [1, 1], 'code-shader-dissolve': [1, 1],
};

// Fill a block's HTML with the reel's code: replace the baked __TOKENS, keep the block's own __BLOCK
// and override its fields (duration, line, seed), and show the real file name in the title bar.
export async function fillCodeBlock(html, b) {
  const m = /window\.__BLOCK = (\{[\s\S]*?\});/.exec(html);
  if (!m) throw new Error(`block ${b.block}: no window.__BLOCK found`);
  const seq = /seq:\s*"([^"]+)"/.exec(m[1])[1];
  const baked = await bakeStates(b.states, b.lang);
  const over = { duration: b.duration };
  if (b.id) over.id = b.id;
  if (b.line != null) over.line = b.line;
  if (b.seed != null) over.seed = b.seed;
  const tokens = /<script>\s*window\.__TOKENS = [\s\S]*?<\/script>/;
  if (!tokens.test(html)) throw new Error(`block ${b.block}: no window.__TOKENS script found`);
  const data = `window.__TOKENS = ${JSON.stringify({ [seq]: baked }).replace(/</g, '\\u003c')};\n` +
    `window.__BLOCK = Object.assign(${m[1]}, ${JSON.stringify(over)});`;
  html = html.replace(tokens, () => `<script>\n${data}\n</script>`);
  if (b.file) html = html.replace(/(<span class="filename"\s*>\s*<span class="accent">)[^<]*(<\/span>)[^<]*/, (_, a, c) => a + esc(b.file) + c + ' ');
  return html;
}

// Give a block a reel-unique composition id, so two copies of one block can share a reel.
export function renameBlock(html, from, to) {
  const q = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html
    .replace(new RegExp(`data-composition-id="${q}"`, 'g'), `data-composition-id="${to}"`)
    .replace(new RegExp(`__timelines\\[(["'])${q}\\1\\]`, 'g'), `__timelines["${to}"]`);
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
