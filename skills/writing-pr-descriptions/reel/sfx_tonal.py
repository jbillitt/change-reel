"""In-key tonal effects for one reel: sparkle, chime and ping as soft glass bells, three variants each.

Usage: python sfx_tonal.py <out dir> --key <midi> --third <3|4>
Writes <name>.wav, <name>-1.wav and <name>-2.wav. Same arguments, same bytes.
"""
import argparse
import os

import numpy as np
from scipy import signal as sg
from scipy.io import wavfile

SR = 44100
ap = argparse.ArgumentParser()
ap.add_argument("out")
ap.add_argument("--key", type=int, default=60, help="the bed's tonic as a MIDI note")
ap.add_argument("--third", type=int, default=4, choices=[3, 4], help="semitones to the scale's third")
A = ap.parse_args()
# Fold the tonic into the octave from MIDI 72, so effects sit above the bed and the voice.
ROOT = 72 + (A.key - 72) % 12
DEG = {1: 0, 3: A.third, 5: 7, 8: 12, 10: 12 + A.third}


def bell(midi, dur, vel=1.0):
    """A soft glass bell: inharmonic partials that die high-first, a 4 ms attack and a click-free sin^2 tail."""
    f = 440.0 * 2 ** ((midi - 69) / 12)
    t = np.arange(int(dur * SR)) / SR
    tone = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / (dur * d))
               for r, a, d in ((1, 1.0, 0.45), (2, 0.35, 0.25), (3.01, 0.18, 0.14), (4.12, 0.1, 0.08)) if f * r < SR / 2.2)
    env = np.minimum(1, t / 0.004)
    tail = int(0.35 * len(t))
    env[-tail:] *= np.sin(np.linspace(np.pi / 2, 0, tail)) ** 2
    return vel * tone * env


def place(notes):
    """notes: (start, midi, dur, vel) -> one mono signal."""
    out = np.zeros(int(max(s + d for s, _, d, _ in notes) * SR) + 1)
    for s, m, d, v in notes:
        x = bell(m, d, v)
        i = int(s * SR)
        out[i:i + len(x)] += x
    return out


def write(name, x):
    x = sg.lfilter([1 - np.exp(-2 * np.pi * 6000 / SR)], [1, -np.exp(-2 * np.pi * 6000 / SR)], x)
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.7
    wavfile.write(os.path.join(A.out, name + ".wav"), SR, (x * 32767).astype(np.int16))


n = lambda deg: ROOT + DEG[deg]
os.makedirs(A.out, exist_ok=True)
for i, suffix in enumerate(["", "-1", "-2"]):
    # sparkle: a rising triad, 55 ms a note, each variant a step higher in the chord
    tri = [[1, 3, 5], [3, 5, 8], [5, 8, 10]][i]
    write("sparkle" + suffix, place([(k * 0.055, n(d), 0.9, 0.8 - 0.1 * k)
                                     for k, d in enumerate(tri)]))
    # chime: two notes that resolve, 5->1, 3->1 or 5->8
    a, b = [(5, 1), (3, 1), (5, 8)][i]
    write("chime" + suffix, place([(0, n(a), 1.2, 0.8), (0.14, n(b), 1.6, 1.0)]))
    # ping: one note, rotating through 1, 5 and 3
    write("ping" + suffix, place([(0, n([1, 5, 3][i]), 0.7, 1.0)]))
print(f"{A.out}: tonal effects on MIDI {ROOT}, third +{A.third}")
