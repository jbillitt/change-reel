// node --test reel/
import assert from 'node:assert/strict';
import test from 'node:test';
import { budgetCues, sfxGain } from './build-reel.mjs';

const names = (cues) => cues.map((c) => `${c.name}@${c.at}`);
const quiet = (fn) => { const w = console.warn; console.warn = () => {}; try { return fn(); } finally { console.warn = w; } };

test('budget drops repeats, crowds and stacked big effects', () => {
  const kept = quiet(() => budgetCues([
    { name: 'pop', at: 1, auto: true },
    { name: 'pop', at: 1.5, auto: true }, // same small effect within 1.2 s
    { name: 'click', at: 2, auto: true },
    { name: 'ping', at: 2.4, auto: true },
    { name: 'whoosh-short', at: 2.8, auto: true }, // fourth in [1, 3)
    { name: 'sparkle', at: 10 },
    { name: 'chime', at: 14 }, // big within 6 s of sparkle
    { name: 'chime', at: 17 },
    { name: 'riser', at: 24 }, // over max(2, ceil(30 / 15)) big effects
  ], 30));
  assert.deepEqual(names(kept), ['pop@1', 'click@2', 'ping@2.4', 'sparkle@10', 'chime@17']);
});

test('a run of pings is allowed; it steps through the chord', () => {
  const kept = quiet(() => budgetCues([{ name: 'ping', at: 1 }, { name: 'ping', at: 1.8 }, { name: 'ping', at: 2.6 }], 30));
  assert.equal(kept.length, 3);
});

test('author cues win over automatic ones', () => {
  const kept = quiet(() => budgetCues([{ name: 'chime', at: 5, auto: true }, { name: 'sparkle', at: 8 }], 30));
  assert.deepEqual(names(kept), ['sparkle@8']);
});

test('gain levels a file to -18 LUFS momentary and caps at 4', () => {
  assert.equal(sfxGain(0.5, -18), 0.5);
  assert.ok(Math.abs(sfxGain(1, -24) - 10 ** (6 / 20)) < 1e-9);
  assert.equal(sfxGain(1, -60), 4);
});
