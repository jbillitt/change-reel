# Procedural background music, synthesised from code: no model, no download, no licence beyond this file.
# Usage: python music_procedural.py <style> <seconds> <out.wav> [--seed S] [--cues 1.7:0.6,9.2] [--bpm N]
# Styles: jazz, lofi, garage, fighter, rocksteady, rumba (Congolese), powermetal, deephouse, techno.
# The seed picks key, tempo, progressions, groove, fills, form, lead voice and the lead's motif, so each PR gets its own
# piece; within a piece things change only where a musician would change them (phrase ends, section starts).
# Cues are scene cuts as time[:transition seconds]. Every hit sits on the beat grid: a cut gets a cymbal on the nearest
# beat when that beat lands inside its sync window, otherwise a swell with no attack that rises into the cut.
import argparse
import hashlib
import json

import numpy as np
import scipy.io.wavfile as wavfile
import scipy.signal as sg

SR = 44100
STYLES = ["jazz", "lofi", "garage", "fighter", "rocksteady", "rumba", "powermetal", "deephouse", "techno"]
ap = argparse.ArgumentParser()
ap.add_argument("style", choices=STYLES)
ap.add_argument("seconds", type=float)
ap.add_argument("out")
ap.add_argument("--seed", default="reel")
ap.add_argument("--cues", default="")
ap.add_argument("--bpm", type=float, default=0)
ap.add_argument("--events", default="", help="write the note and hit schedule here as JSON, for checking it")
A = ap.parse_args()
# One stream per job, so a change to the drums never reshuffles the tune, and noise textures never shift either.
spec_rng, drum_rng, lead_rng, keys_rng, hum_rng, noise_rng = [np.random.default_rng(s) for s in np.random.SeedSequence(
    int(hashlib.sha1(f"{A.style}:{A.seed}".encode()).hexdigest()[:8], 16)).spawn(6)]
N = int((A.seconds + 0.5) * SR)
cues = [(float(t), float(d or 0)) for t, _, d in (c.strip().partition(":") for c in A.cues.split(",") if c.strip())]


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tvec(secs):
    return np.arange(int(secs * SR)) / SR


def sos_lp(fc, order=2):
    return sg.butter(order, fc / (SR / 2), "low", output="sos")


def sos_hp(fc, order=2):
    return sg.butter(order, fc / (SR / 2), "high", output="sos")


def sos_bp(lo, hi, order=2):
    return sg.butter(order, [lo / (SR / 2), hi / (SR / 2)], "band", output="sos")


def release(t, dur, r):
    return np.where(t < dur, 1.0, np.clip((dur + r - t) / r, 0, 1))


class Bus:
    """A stereo bus that notes are placed on; panning is constant power."""

    def __init__(self):
        self.x = np.zeros((N, 2))

    def add(self, sig, at, gain=1.0, pan=0.0):
        i = int(at * SR)
        if i >= N or i + len(sig) <= 0:
            return
        s = sig[max(0, -i):max(0, min(len(sig), N - i))] * gain
        a = (pan + 1) * np.pi / 4
        j = max(0, i)
        self.x[j:j + len(s), 0] += s * np.cos(a)
        self.x[j:j + len(s), 1] += s * np.sin(a)


# ---- instruments -------------------------------------------------------------------------------------------
def rhodes(f, dur, vel=0.6):
    t = tvec(dur + 1.0)
    mod = np.sin(2 * np.pi * f * t) * 1.7 * np.exp(-t / 0.35)
    tone = np.sin(2 * np.pi * f * t + mod) + 0.1 * np.sin(2 * np.pi * f * 7 * t) * np.exp(-t / 0.04)
    amp = (1 - np.exp(-t / 0.003)) * np.exp(-t / (0.9 + 0.3 * dur)) * release(t, dur, 0.3)
    return vel * tone * amp


def vibes(f, dur, vel=0.5):
    t = tvec(dur + 1.4)
    tone = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t / 0.3) \
        + 0.06 * np.sin(2 * np.pi * 10 * f * t) * np.exp(-t / 0.05)
    amp = (1 - np.exp(-t / 0.002)) * np.exp(-t / 1.3) * (1 - 0.3 * (0.5 + 0.5 * np.sin(2 * np.pi * 5.5 * t)))
    return vel * tone * amp * release(t, dur + 0.6, 0.6)


def upright(f, dur, vel=0.7):
    t = tvec(dur + 0.3)
    tone = sum(np.sin(2 * np.pi * f * k * t) / k ** 1.6 * np.exp(-t * (1.2 + 0.9 * k)) for k in range(1, 7))
    amp = (1 - np.exp(-t / 0.004)) * np.exp(-t / 0.7) * release(t, dur, 0.08)
    return vel * tone * amp


def sub(f, dur, f_from=None, vel=0.8):
    t = tvec(dur + 0.1)
    f0 = f_from or f
    freq = f + (f0 - f) * np.exp(-t / 0.07)
    ph = np.cumsum(2 * np.pi * freq / SR)
    tone = np.sin(ph) + 0.12 * np.sin(2 * ph)
    return vel * tone * (1 - np.exp(-t / 0.006)) * release(t, dur, 0.08)


def pluck(f, dur, vel=0.4):
    """A nylon-ish pluck: a bright attack whose upper partials die first."""
    t = tvec(dur + 0.8)
    tone = sum(np.sin(2 * np.pi * f * k * t) / k ** 1.3 * np.exp(-t * (2.5 + 2.2 * k)) for k in range(1, 8))
    return vel * tone * (1 - np.exp(-t / 0.002)) * release(t, dur + 0.3, 0.3)


def saw(f, t):
    return 2 * ((t * f) % 1.0) - 1


PAD_LP = sos_lp(1400)


def pad(freqs, dur, vel=0.3, bright=1400):
    t = tvec(dur + 1.0)
    tone = sum(saw(f * 2 ** (d / 1200), t) for f in freqs for d in (-7, 6))
    tone = sg.sosfilt(PAD_LP if bright == 1400 else sos_lp(bright), tone) / (2 * len(freqs))
    amp = (1 - np.exp(-t / 0.5)) * release(t, dur, 0.9)
    return vel * tone * amp


FORMANTS = {"oo": [(260, 380), (750, 950)], "ah": [(620, 820), (1080, 1380)], "eh": [(480, 640), (1650, 1950)]}
FORMANT_SOS = {v: [sos_bp(lo, hi) for lo, hi in bands] for v, bands in FORMANTS.items()}


def chop(f, dur, vowel="oo", vel=0.5):
    t = tvec(dur + 0.25)
    tone = saw(f * (1 + 0.004 * np.sin(2 * np.pi * 5.2 * t)), t)
    voice = sum(sg.sosfilt(s, tone) for s in FORMANT_SOS[vowel])
    amp = (1 - np.exp(-t / 0.01)) * np.exp(-t / 0.35) * release(t, dur, 0.12)
    return vel * voice * amp * 2.2


HAT_HP, SN_BP, CLAP_BP, BRUSH_BP, RIM_BP, RIDE_HP = sos_hp(7000), sos_bp(900, 5500), sos_bp(900, 2600), \
    sos_bp(1800, 6500), sos_bp(1400, 2600), sos_hp(3000)


def noise(secs):
    return noise_rng.standard_normal(int(secs * SR))


def kick(vel=1.0, punch=1.0):
    t = tvec(0.5)
    f = 46 + 90 * punch * np.exp(-t / 0.035)
    body = np.sin(np.cumsum(2 * np.pi * f / SR)) * np.exp(-t / 0.28)
    click = np.r_[noise(0.004) * 0.3, np.zeros(len(t) - int(0.004 * SR))]
    return vel * (body + click)


def snare(vel=0.6):
    t = tvec(0.3)
    return vel * (sg.sosfilt(SN_BP, noise(0.3)) * np.exp(-t / 0.13) + 0.5 * np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.07))


def clap(vel=0.6):
    t = tvec(0.35)
    env = sum(np.where(t >= o, np.exp(-(t - o) / 0.011), 0) for o in (0, 0.011, 0.022)) + 0.6 * np.where(t >= 0.03, np.exp(-(t - 0.03) / 0.12), 0)
    return vel * sg.sosfilt(CLAP_BP, noise(0.35)) * env


def hat(vel=0.3, open_=False):
    t = tvec(0.5 if open_ else 0.08)
    return vel * sg.sosfilt(HAT_HP, noise(len(t) / SR)) * np.exp(-t / (0.16 if open_ else 0.022))


def ride(vel=0.25):
    t = tvec(1.4)
    metal = sum(np.sin(2 * np.pi * f * t) for f in (3150, 4321, 5507, 6913)) / 4
    return vel * (0.6 * metal + sg.sosfilt(RIDE_HP, noise(1.4)) * 0.5) * np.exp(-t / 0.55)


SOFT_RIDE_BP = sos_bp(2200, 6500)


def soft_ride(vel=0.12):
    """A felt-mallet ride for the jazz: lower partials, the top end filtered off, a 4 ms attack and a short ring."""
    t = tvec(0.9)
    metal = sum(a * np.sin(2 * np.pi * f * t) for f, a in ((2140, 1.0), (2910, .7), (3620, .5), (4480, .3))) / 2.5
    wash = sg.sosfilt(SOFT_RIDE_BP, noise(0.9)) * 0.35
    return vel * (0.5 * metal + wash) * (1 - np.exp(-t / 0.004)) * np.exp(-t / 0.32)


def riser(vel=0.12):
    """A brushed cymbal swell that rises into a cut and dies just after it. It has no attack, so it can sit off the grid."""
    t = tvec(0.95)
    env = np.where(t < 0.8, (t / 0.8) ** 2, np.clip(1 - (t - 0.8) / 0.15, 0, 1))
    return vel * sg.sosfilt(SOFT_RIDE_BP, noise(0.95)) * env


def crash(vel=0.3):
    t = tvec(2.2)
    return vel * sg.sosfilt(RIDE_HP, noise(2.2)) * (1 - np.exp(-t / 0.004)) * np.exp(-t / 0.7)


def brush(vel=0.25):
    t = tvec(0.22)
    return vel * sg.sosfilt(BRUSH_BP, noise(0.22)) * (1 - np.exp(-t / 0.03)) * np.exp(-t / 0.08)


def rim(vel=0.35):
    t = tvec(0.06)
    return vel * sg.sosfilt(RIM_BP, noise(0.06)) * np.exp(-t / 0.012)


def shaker(vel=0.15):
    t = tvec(0.09)
    return vel * sg.sosfilt(HAT_HP, noise(0.09)) * (1 - np.exp(-t / 0.015)) * np.exp(-t / 0.03)


def kick_tight(vel=1.0):
    t = tvec(0.22)
    f = 52 + 120 * np.exp(-t / 0.018)
    body = np.sin(np.cumsum(2 * np.pi * f / SR)) * np.exp(-t / 0.11)
    click = np.r_[sg.sosfilt(sos_hp(2000), noise(0.006)) * 0.6, np.zeros(len(t) - int(0.006 * SR))]
    return vel * np.tanh(1.6 * (body + click))


def snare_big(vel=0.7):
    t = tvec(0.45)
    return vel * np.tanh(1.4 * (sg.sosfilt(SN_BP, noise(0.45)) * np.exp(-t / 0.2) + 0.7 * np.sin(2 * np.pi * 180 * t) * np.exp(-t / 0.09)))


def kick_hard(vel=1.0):
    """A techno kick: a hard click, a fast pitch drop and a clipped body, for the rumble to sit under."""
    t = tvec(0.4)
    f = 48 + 160 * np.exp(-t / 0.02)
    body = np.sin(np.cumsum(2 * np.pi * f / SR)) * np.exp(-t / 0.2)
    click = np.r_[sg.sosfilt(sos_hp(2500), noise(0.005)) * 0.8, np.zeros(len(t) - int(0.005 * SR))]
    return vel * np.tanh(2.2 * (body + click))


def tom(f=110, vel=0.6):
    t = tvec(0.5)
    body = np.sin(np.cumsum(2 * np.pi * f * (1 + 0.5 * np.exp(-t / 0.03)) / SR)) * np.exp(-t / 0.22)
    return vel * np.tanh(1.3 * (body + 0.15 * sg.sosfilt(SN_BP, noise_rng.standard_normal(len(t))) * np.exp(-t / 0.03)))


def conga(f=260, vel=0.3, slap=False):
    """A conga: a pitched skin; a slap adds a crack and chokes the ring."""
    t = tvec(0.35)
    body = np.sin(np.cumsum(2 * np.pi * f * (1 + 0.15 * np.exp(-t / 0.01)) / SR)) * np.exp(-t / (0.05 if slap else 0.16))
    crack = sg.sosfilt(SN_BP, noise_rng.standard_normal(len(t))) * np.exp(-t / 0.012) * (0.7 if slap else 0.12)
    return vel * (body + crack)


def clave(vel=0.3):
    t = tvec(0.08)
    return vel * (np.sin(2 * np.pi * 2500 * t) + 0.3 * np.sin(2 * np.pi * 5100 * t)) * np.exp(-t / 0.018)


def dist_bass(f, dur, vel=0.6):
    t = tvec(dur + 0.03)
    tone = np.tanh(3 * (saw(f, t) + 0.7 * saw(f * 1.006, t)))
    tone = sg.sosfilt(sos_lp(1100), tone) + 0.5 * np.sin(2 * np.pi * f * t)
    return vel * tone * (1 - np.exp(-t / 0.003)) * release(t, dur, 0.03)


def power(freqs, dur, vel=0.4):
    t = tvec(dur + 0.08)
    tone = np.tanh(4 * sum(saw(f * 2 ** (d / 1200), t) for f in freqs for d in (-9, 8)) / len(freqs))
    return vel * sg.sosfilt(sos_lp(3600), tone) * (1 - np.exp(-t / 0.004)) * release(t, dur, 0.08)


def pulse(f, dur, vel=0.3):
    t = tvec(dur + 0.05)
    tone = np.where((t * f) % 1.0 < 0.25, 1.0, -1.0) + 0.5
    return vel * sg.sosfilt(sos_lp(6000), tone) * np.exp(-t / 0.14) * release(t, dur, 0.04)


def blip(f, vel=0.12):
    t = tvec(0.07)
    return vel * np.sin(2 * np.pi * f * t) * np.exp(-t / 0.018)


def ebass(f, dur, vel=0.7):
    """A round electric bass played with the thumb: mostly fundamental, a soft thump, sustained to the note's end."""
    t = tvec(dur + 0.12)
    tone = sum(np.sin(2 * np.pi * f * k * t) / k ** 2 * np.exp(-t * (0.8 + 1.5 * k)) for k in range(1, 5))
    return vel * tone * (1 - np.exp(-t / 0.005)) * np.exp(-t / 1.2) * release(t, dur, 0.06)


def guitar(f, dur, vel=0.4, bright=1.0):
    """A clean electric guitar: more upper partials than the nylon pluck, and a quick choke at the note's end."""
    t = tvec(dur + 0.5)
    tone = sum(np.sin(2 * np.pi * f * k * t) / k ** (1.1 / bright) * np.exp(-t * (1.6 + 1.4 * k / bright))
               for k in range(1, 10) if f * k < SR / 2.2)
    return vel * tone * (1 - np.exp(-t / 0.0015)) * release(t, dur, 0.06)


GTR_HP = sos_hp(220)


def strum(freqs, dur, vel=0.3, gap=0.005):
    """A chord strummed down the strings, a few milliseconds apart; a short dur is a choked skank."""
    out = np.zeros(len(tvec(dur + 0.5)) + int(gap * SR) * len(freqs))
    for j, f in enumerate(freqs):
        s = guitar(f, dur, 2 * vel / len(freqs), 1.4)
        out[j * int(gap * SR):j * int(gap * SR) + len(s)] += s
    return sg.sosfilt(GTR_HP, out)


def organ(freqs, dur, vel=0.3, bars_=(1, 0.8, 0.5, 0.3)):
    """A drawbar organ: four harmonics a note, a key click on the attack and a slow Leslie wobble."""
    t = tvec(dur + 0.08)
    wob = 1 + 0.003 * np.sin(2 * np.pi * 6.2 * t)
    tone = sum(a * np.sin(2 * np.pi * h * np.cumsum(f * wob / SR)) for f in freqs for h, a in zip((1, 2, 3, 4), bars_)) / len(freqs)
    click = np.r_[sg.sosfilt(sos_hp(3000), noise(0.003)) * 0.2, np.zeros(len(t) - int(0.003 * SR))]
    return vel * (tone + click) * (1 - np.exp(-t / 0.004)) * release(t, dur, 0.05)


def melodica(f, dur, vel=0.3):
    """A melodica: a reedy pulse, a breathy attack, and a vibrato that only comes in on held notes."""
    t = tvec(dur + 0.1)
    vib = 1 + 0.006 * np.clip((t - 0.25) / 0.3, 0, 1) * np.sin(2 * np.pi * 5 * t)
    ph = np.cumsum(f * vib / SR) % 1.0
    tone = sg.sosfilt(sos_lp(min(3200, f * 6)), np.where(ph < 0.4, 1.0, -1.0) + 0.2)  # a 40% pulse averages -0.2
    breath = sg.sosfilt(sos_bp(1500, 4000), noise_rng.standard_normal(len(t))) * 0.08 * np.exp(-t / 0.05)
    return vel * (tone + breath) * (1 - np.exp(-t / 0.03)) * release(t, dur, 0.08)


def lead_gtr(f, dur, vel=0.3, drive=5.0):
    """A singing overdriven lead: two detuned saws, clipped hard, with a vibrato that blooms on held notes.
    A low drive leaves the saws nearly clean: a keyboard lead."""
    t = tvec(dur + 0.12)
    vib = 1 + 0.008 * np.clip((t - 0.18) / 0.25, 0, 1) * np.sin(2 * np.pi * 5.8 * t)
    ph = np.cumsum(f * vib / SR)
    tone = np.tanh(drive * ((2 * (ph % 1) - 1) + 0.6 * (2 * ((ph * 1.004) % 1) - 1))) / min(1.0, drive)
    return vel * sg.sosfilt(sos_bp(400, 4200), tone) * (1 - np.exp(-t / 0.006)) * release(t, dur, 0.1)


def choir(freqs, dur, vel=0.3, vowel="ah"):
    """A choir pad: three detuned saws a note, each with its own slow vibrato, through the vowel formants."""
    t = tvec(dur + 0.8)
    tone = sum(2 * (np.cumsum(f * 2 ** (d / 1200) * (1 + 0.004 * np.sin(2 * np.pi * (4.6 + 0.3 * j) * t)) / SR) % 1) - 1
               for j, f in enumerate(freqs) for d in (-9, 0, 9))
    voice = sum(sg.sosfilt(s, tone) for s in FORMANT_SOS[vowel]) / (3 * len(freqs))
    return vel * voice * (1 - np.exp(-t / 0.35)) * release(t, dur, 0.7) * 2.5


def acid(f, dur, cut=900, res=7.0, vel=0.3, accent=False, f_from=None):
    """A 303-style line: a saw through a resonant low-pass whose cutoff falls through each note; accents bite harder."""
    t = tvec(dur + 0.04)
    freq = f if f_from is None else f + (f_from - f) * np.exp(-t / 0.04)
    x = 2 * (np.cumsum(freq / SR + 0 * t) % 1.0) - 1
    env = np.exp(-t / (0.09 if accent else 0.16))
    y, zi = np.zeros_like(x), np.zeros(2)
    for i in range(0, len(x), 64):  # an RBJ biquad, its cutoff stepped every 64 samples
        w = 2 * np.pi * min(SR * 0.45, cut * (1 + (5 if accent else 3) * env[i])) / SR
        al, c = np.sin(w) / (2 * res), np.cos(w)
        bq, aq = np.array([(1 - c) / 2, 1 - c, (1 - c) / 2]), np.array([1 + al, -2 * c, 1 - al])
        y[i:i + 64], zi = sg.lfilter(bq / aq[0], aq / aq[0], x[i:i + 64], zi=zi)
    return vel * (1.3 if accent else 1) * np.tanh(1.5 * y) * (1 - np.exp(-t / 0.002)) * release(t, dur, 0.02)


# ---- effects -----------------------------------------------------------------------------------------------
def reverb(x, secs=1.8, wet=0.22, tone=5000):
    t = tvec(secs)
    out = np.zeros_like(x)
    for c in range(2):
        ir = sg.sosfilt(sos_lp(tone), noise_rng.standard_normal(len(t)) * np.exp(-t / (secs / 5)))
        ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
        out[:, c] = sg.fftconvolve(x[:, c], ir)[:N]
    return x * (1 - wet) + out * wet


def duck(x, times, depth=0.55, rel=0.2):
    g = np.ones(N)
    t = np.arange(N) / SR
    for k in times:
        i = int(k * SR)
        if 0 <= i < N:
            g[i:] = np.minimum(g[i:], 1 - depth * np.exp(-(t[i:] - k) / rel))
    return x * g[:, None]


def lofi_tape(x):
    t = np.arange(N) / SR
    idx = np.arange(N) + SR * (0.0022 * np.sin(2 * np.pi * 0.45 * t) + 0.00035 * np.sin(2 * np.pi * 6.1 * t))
    x = np.stack([np.interp(idx, np.arange(N), x[:, c]) for c in range(2)], axis=1)
    x = sg.sosfilt(sos_lp(3800, 4), x, axis=0)
    x = np.tanh(x * 1.6) / 1.6
    crackle = (noise_rng.random(N) < 0.0007) * noise_rng.standard_normal(N) * 0.25
    hiss = sg.sosfilt(sos_bp(800, 6000), noise_rng.standard_normal(N)) * 0.004
    return x + sg.sosfilt(sos_hp(1200), crackle)[:, None] * 0.5 + hiss[:, None]


# ---- harmony -----------------------------------------------------------------------------------------------
VOICING = {  # rootless, close voicings above the root: the sound of the style lives here
    "maj9": [4, 7, 11, 14], "m9": [3, 7, 10, 14], "13": [4, 10, 14, 21], "7#9": [4, 10, 15, 19], "m11": [3, 10, 14, 17],
    "add9": [2, 4, 7, 12], "6/9": [4, 9, 14, 19], "5": [7, 12],
    "maj": [4, 7, 12], "min": [3, 7, 12], "7": [4, 7, 10, 12], "m7": [3, 7, 10, 12],  # triads for the guitar styles
}
PROGRESSIONS = {
    "jazz": [[(0, "maj9"), (9, "m9"), (2, "m9"), (7, "13")], [(2, "m9"), (7, "13"), (0, "maj9"), (0, "6/9")],
             [(5, "maj9"), (4, "m9"), (2, "m9"), (7, "13")], [(4, "m9"), (9, "13"), (2, "m9"), (7, "13")],
             [(0, "maj9"), (5, "13"), (4, "m9"), (9, "13")]],
    "lofi": [[(5, "maj9"), (4, "7#9"), (9, "m9"), (7, "m11")], [(2, "m9"), (7, "13"), (0, "maj9"), (9, "m9")],
             [(0, "maj9"), (4, "m9"), (5, "maj9"), (7, "13")], [(9, "m9"), (2, "m9"), (7, "13"), (0, "maj9")],
             [(0, "maj9"), (9, "m9"), (5, "maj9"), (4, "7#9")]],
    "garage": [[(0, "m9"), (8, "maj9"), (3, "maj9"), (10, "add9")], [(0, "m11"), (5, "m9"), (8, "maj9"), (7, "7#9")],
               [(0, "m9"), (10, "add9"), (8, "maj9"), (7, "m11")], [(5, "m9"), (8, "maj9"), (0, "m11"), (0, "m9")],
               [(0, "m9"), (3, "maj9"), (10, "add9"), (5, "m11")]],
    "fighter": [[(0, "5"), (8, "5"), (10, "5"), (7, "5")], [(0, "5"), (3, "5"), (10, "5"), (8, "5")], [(0, "5"), (0, "5"), (8, "5"), (10, "5")],
                [(0, "5"), (10, "5"), (8, "5"), (10, "5")], [(0, "5"), (5, "5"), (3, "5"), (10, "5")]],
    "rocksteady": [[(0, "maj"), (5, "maj"), (7, "7"), (5, "maj")], [(0, "maj"), (9, "min"), (5, "maj"), (7, "7")],
                   [(2, "m7"), (7, "7"), (0, "maj"), (0, "maj")], [(0, "maj"), (0, "maj"), (5, "maj"), (7, "7")],
                   [(0, "maj"), (4, "min"), (5, "maj"), (7, "7")]],
    "rumba": [[(0, "maj"), (5, "maj"), (7, "7"), (5, "maj")], [(0, "maj"), (7, "7"), (5, "maj"), (7, "7")],
              [(0, "maj"), (9, "min"), (5, "maj"), (7, "7")], [(0, "maj"), (5, "maj"), (0, "maj"), (7, "7")],
              [(5, "maj"), (0, "maj"), (7, "7"), (0, "maj")]],
    "powermetal": [[(0, "min"), (8, "maj"), (3, "maj"), (10, "maj")], [(0, "min"), (10, "maj"), (8, "maj"), (10, "maj")],
                   [(8, "maj"), (10, "maj"), (0, "min"), (0, "min")], [(0, "min"), (5, "min"), (10, "maj"), (3, "maj")],
                   [(0, "min"), (8, "maj"), (10, "maj"), (7, "maj")]],
    "deephouse": [[(0, "m9"), (0, "m9"), (5, "m9"), (5, "m9")], [(0, "m11"), (10, "add9"), (8, "maj9"), (10, "add9")],
                  [(0, "m9"), (8, "maj9"), (3, "maj9"), (5, "m11")], [(0, "m11"), (3, "maj9"), (5, "m9"), (7, "m9")],
                  [(5, "m9"), (7, "m11"), (0, "m9"), (0, "m11")]],
    "techno": [[(0, "m11")] * 4, [(0, "5"), (0, "5"), (1, "5"), (0, "5")], [(0, "m9"), (0, "m9"), (8, "maj9"), (8, "maj9")],
               [(0, "5"), (0, "5"), (3, "5"), (5, "5")], [(0, "m11"), (0, "m11"), (10, "add9"), (1, "maj9")]],
}
TONIC = {"jazz": (0, "6/9"), "lofi": (0, "maj9"), "garage": (0, "m9"), "fighter": (0, "5"), "rocksteady": (0, "maj"),
         "rumba": (0, "maj"), "powermetal": (0, "min"), "deephouse": (0, "m9"), "techno": (0, "m11")}  # where the piece comes home
MAJOR, MINOR = [0, 2, 4, 5, 7, 9, 11], [0, 2, 3, 5, 7, 8, 10]
SCALE = {"jazz": MAJOR, "lofi": MAJOR, "garage": MINOR, "fighter": MINOR, "rocksteady": MAJOR, "rumba": MAJOR,
         "powermetal": MINOR, "deephouse": MINOR, "techno": [0, 1, 3, 5, 7, 8, 10]}
ST = A.style
key = int(spec_rng.choice({"jazz": [53, 58, 51, 55, 50, 56], "lofi": [53, 55, 50, 52, 57, 48], "garage": [50, 52, 53, 45, 47, 48],
                           "fighter": [40, 38, 41, 43, 45], "rocksteady": [53, 55, 57, 58, 50, 52], "rumba": [52, 55, 57, 50, 53],
                           "powermetal": [40, 38, 42, 43, 45], "deephouse": [48, 50, 52, 53, 55], "techno": [45, 43, 41, 46, 48]}[ST]))
bpm = A.bpm or float(spec_rng.choice({"jazz": [100, 104, 108, 112, 116], "lofi": [68, 72, 76, 80, 84], "garage": [128, 130, 132, 134, 136],
                                      "fighter": [138, 142, 146, 150, 154], "rocksteady": [72, 76, 80, 84], "rumba": [112, 116, 120, 124],
                                      "powermetal": [160, 168, 174, 180], "deephouse": [118, 120, 122, 124], "techno": [126, 128, 130, 132]}[ST]))
beat = 60 / bpm
bar = 4 * beat
s16 = beat / 4
bars = int(np.ceil(A.seconds / bar)) + 1
pa, pb = (int(i) for i in spec_rng.choice(len(PROGRESSIONS[ST]), 2, replace=False))
PROG = {"A": PROGRESSIONS[ST][pa], "B": PROGRESSIONS[ST][pb]}

# Form: phrases of four bars (two on a short reel), sections of two phrases. Sections follow a seeded form, the B
# sections changing progression, groove and motif; the bar in which the closing fade starts goes home to the tonic.
P = 2 if bars < 16 else 4
S = 2 * P
form = str(spec_rng.choice(["AABA", "ABAB", "AABB", "ABAA"]))
home = max(2, int((A.seconds - 2.0) // bar))
# Swing, deterministic: jazz eighths near 3:1 at these tempos; the rest push every other sixteenth, metal not at all.
SWING = {"jazz": (0.70, 0.75), "lofi": (0.13, 0.2), "garage": (0.1, 0.17), "fighter": (0, 0), "rocksteady": (0.12, 0.2),
         "rumba": (0.03, 0.08), "powermetal": (0, 0), "deephouse": (0.05, 0.12), "techno": (0, 0.04)}[ST]
SWING = spec_rng.uniform(*SWING) if SWING[1] else 0


def letter(b):
    return form[(b // S) % len(form)]


def chord(b):
    root, q = TONIC[ST] if b >= home else PROG[letter(b)][b % 4]
    return key + root, VOICING[q]


def at(b, i):
    """The time of sixteenth i of bar b on the swung grid. Every note and hit is placed through this."""
    b, i = b + i // 16, i % 16
    t = b * bar + i * s16
    if ST == "jazz":
        return t + (SWING - 0.5) * beat * (i % 4 == 2)
    return t + SWING * s16 * (i % 2)


drums, keys, bass, lead, fx = Bus(), Bus(), Bus(), Bus(), Bus()
events, kicks, placed = [], [], set()


def hit(fn, t, gain=1.0, pan=0.0, *a):
    slot = (fn.__name__, round(t / 0.02))
    if slot in placed:  # a drum retriggered on itself is a click, not an accent
        return
    placed.add(slot)
    events.append({"t": round(t, 4), "part": "drums", "kind": fn.__name__})
    if fn in (kick, kick_tight, kick_hard):
        kicks.append(t)
    drums.add(fn(*a), t + hum_rng.normal(0, 0.001), gain * hum_rng.uniform(0.92, 1.08), pan)


def play(bus, part, sig, t, midi, gain=1.0, pan=0.0):
    events.append({"t": round(t, 4), "part": part, "midi": int(midi)})
    bus.add(sig, t + hum_rng.normal(0, 0.003), gain * hum_rng.uniform(0.92, 1.08), pan)


# ---- drums -------------------------------------------------------------------------------------------------
# Each style has a few idiomatic grooves and fills; a piece draws one groove for its A sections and another for its B
# sections, plus which instrument keeps the subdivision. Within a section the groove only changes at phrase ends:
# a push on the last bar of a phrase, a one-beat fill on the last bar of a section.
def pick(options, k=1):
    idx = drum_rng.choice(len(options), k, replace=False)
    return [options[int(i)] for i in idx] if k > 1 else options[int(idx[0])]


if ST == "lofi":
    KICKS = pick([((0, 10), (0, 7, 10)), ((0, 6, 10), (0, 10, 11)), ((0, 3, 10), (0, 10)), ((0, 9, 10), (0, 7, 10)),
                  ((0, 7, 10), (0, 10))], 2)
    ghosts = pick([(), (7,), (15,), (7, 15)])
    subdiv = pick(["hat8", "hat16", "shaker"])
    FILLS = pick([[(snare, 12, 0.5, 0.25), (snare, 13, 0.6, 0.3), (snare, 14, 0.7, 0.38), (snare, 15, 0.8, 0.45)],
                  [(snare, 12, 0.7, 0.35), (kick, 14, 0.7, 0.8, 0.7), (snare, 15, 0.7, 0.4)], []], 2)
elif ST == "garage":
    KICKS = pick([((0, 10), (0, 7, 10)), ((0, 10), (0, 10, 13)), ((0, 11), (0, 7, 11)), ((0, 6, 10), (0, 10))], 2)
    ghosts = pick([(), (15,), (7,)])
    subdiv = pick(["shaker", "rim", "hat16"])
    FILLS = pick([[(clap, 12, 0.35, 0.35), (clap, 14, 0.4, 0.4), (clap, 15, 0.45, 0.5)],
                  [(snare, 13, 0.5, 0.25), (snare, 14, 0.5, 0.32), (snare, 15, 0.5, 0.4)], []], 2)
elif ST == "fighter":
    KICKS = pick([[q * 4 + i for q in range(4) for i in (0, 2, 3)], list(range(0, 16, 2)), [0, 3, 4, 8, 11, 12], [0, 4, 8, 11, 14],
                  [0, 2, 3, 4, 8, 10, 11, 12]], 2)
    ghosts, subdiv = (), "hat8"
    FILLS = pick([[x for k in range(4) for x in ((kick_tight, 12 + k, 0.85, 0.9), (snare_big, 12 + k, 1, 0.25 + 0.1 * k))],
                  [(snare_big, 12, 0.8, 0.4), (snare_big, 13, 0.8, 0.45), (kick_tight, 14, 0.85, 0.9), (snare_big, 14, 0.8, 0.5),
                   (snare_big, 15, 0.8, 0.6)]], 2)
elif ST == "rocksteady":
    # One drop (kick and cross-stick on three alone), a rockers kick on one as well, or steppers on every beat.
    KICKS = pick([((8,), (8,)), ((8,), (8, 14)), ((0, 8), (8,)), ((0, 8), (0, 8, 11)), ((0, 4, 8, 12), (0, 4, 8, 12))], 2)
    ghosts = pick([(), (6,), (14,), (6, 14)])
    subdiv = pick(["hat8", "hat16"])
    FILLS = pick([[(snare, 12, 0.5, 0.3), (snare, 13, 0.5, 0.35), (snare, 14, 0.6, 0.4), (snare, 15, 0.7, 0.5)],
                  [(tom, 12, 0.6, 180, 0.5), (tom, 14, 0.6, 130, 0.55), (snare, 15, 0.7, 0.45)],
                  [(rim, 12, 1, 0.3), (rim, 14, 1, 0.3), (snare, 15, 0.7, 0.4)]], 2)
elif ST == "rumba":
    # The song section rides a clave over congas and maracas; the B sections are the sebene, on a cavacha snare.
    KICKS = pick([((0, 8), (0, 8)), ((0, 6, 8), (0, 8)), ((0, 10), (0, 8, 10))], 2)
    CLAVE = pick([(0, 3, 6, 10, 12), (0, 3, 7, 10, 12), (2, 4, 8, 11, 14)])  # son 3-2, rumba 3-2, son 2-3
    tumbao = pick([(0, 2, 4, 6, 7, 8, 10, 12, 14, 15), (4, 6, 7, 12, 14, 15), (2, 4, 6, 7, 10, 12, 14, 15)])
    FILLS = pick([[(tom, 12, 0.6, 220, 0.5), (tom, 13, 0.6, 180, 0.5), (tom, 14, 0.7, 140, 0.55), (tom, 15, 0.7, 110, 0.6)],
                  [(conga, 12, 1, 330, 0.4, True), (conga, 13, 1, 260, 0.35), (conga, 14, 1, 200, 0.4), (conga, 15, 1, 200, 0.45)],
                  [(snare, 12, 0.5, 0.3), (snare, 13, 0.5, 0.35), (snare, 14, 0.6, 0.4), (snare, 15, 0.7, 0.5)]], 2)
elif ST == "powermetal":
    KICKS = pick([list(range(16)), [0, 2, 4, 6, 8, 10, 12, 13, 14, 15], [q * 4 + i for q in range(4) for i in (0, 2, 3)],
                  list(range(8)) + [8, 10, 12, 14]], 2)
    FILLS = pick([[x for k in range(4) for x in ((kick_tight, 12 + k, 0.8, 0.85), (tom, 12 + k, 0.8, 260 - 45 * k, 0.7))],
                  [x for k in range(4) for x in ((kick_tight, 12 + k, 0.8, 0.85), (snare_big, 12 + k, 0.9, 0.35 + 0.1 * k))],
                  [(snare_big, 12, 0.9, 0.6), (tom, 13, 0.8, 200, 0.7), (tom, 14, 0.8, 150, 0.7), (snare_big, 15, 0.9, 0.7)]], 2)
elif ST == "deephouse":
    KICKS = pick([((0, 4, 8, 12), (0, 4, 8, 12)), ((0, 4, 8, 12), (0, 4, 8, 12, 15)), ((0, 4, 8, 12), (0, 4, 7, 8, 12))], 2)
    subdiv = pick(["hat16", "shaker", "none"])
    perc = pick(["rim", "conga", "none"])
    FILLS = pick([[(clap, 12, 0.35, 0.3), (clap, 14, 0.4, 0.35), (clap, 15, 0.45, 0.4)],
                  [(snare, 12, 0.4, 0.15), (snare, 13, 0.4, 0.2), (snare, 14, 0.45, 0.25), (snare, 15, 0.5, 0.3)],
                  [(conga, 12, 1, 330, 0.3, True), (conga, 14, 1, 260, 0.3), (conga, 15, 1, 200, 0.35)], []], 2)
elif ST == "techno":
    KICKS = pick([((0, 4, 8, 12), (0, 4, 8, 12)), ((0, 4, 8, 12), (0, 4, 8, 12, 14)), ((0, 4, 8, 12), (0, 3, 4, 8, 12))], 2)
    subdiv = pick(["hat16", "ride8", "none"])
    snap = pick(["clap", "rim", "none"])  # what marks two and four, if anything
    FILLS = pick([[(snare, 12 + k, 0.5, 0.15 + 0.1 * k) for k in range(4)],
                  [(clap, 12, 0.4, 0.3), (clap, 13, 0.4, 0.35), (clap, 14, 0.45, 0.4), (clap, 15, 0.5, 0.45)],
                  [(snare, 12, 0.5, 0.2), (snare, 13, 0.5, 0.3), (snare, 14, 0.5, 0.4), (tom, 15, 0.7, 110, 0.6)]], 2)
else:
    KICKS = pick([(0, 4, 6, 8, 12, 14), (0, 4, 8, 12), (0, 4, 6, 8, 10, 12, 14), (0, 4, 6, 8, 12)], 2)  # the ride: spang-a-lang, quarters, eighths, spang on two
    ghosts = pick([(), (10,), (14,)])
    subdiv = pick(["brush", "rim"])  # who marks two and four
    feather = bool(drum_rng.random() < 0.5)
    FILLS = pick([[(brush, 10, 1, 0.2), (brush, 12, 1, 0.3), (brush, 14, 1, 0.4)],
                  [(kick, 14, 0.4, 0.8, 0.5), (soft_ride, 14, 1, 0.1)], []], 2)

muted = set()  # (bar, beat) where a fill replaces the groove's kick and snare


def fill(b, gain=1.0):
    muted.add((b, 3))
    for fn, i, g, *a in FILLS[(b // S) % len(FILLS)]:
        hit(fn, at(b, i), g * gain, 0.05, *a)


def accent(t):
    """A cymbal on a beat: where a section starts, or where a cut lands on the grid."""
    if ST == "jazz":  # soft corporate: the ride and a feathered kick together, never a crash
        hit(soft_ride, t, 1, 0.3, 0.16)
        hit(kick, t, 0.4, 0, 0.8, 0.5)
    else:
        hit(crash, t, 1, 0.3, {"fighter": 0.26, "powermetal": 0.28, "garage": 0.18, "rocksteady": 0.14, "rumba": 0.15,
                               "deephouse": 0.16, "techno": 0.12}.get(ST, 0.22))
        hit({"fighter": kick_tight, "powermetal": kick_tight, "techno": kick_hard}.get(ST, kick), t, 0.8, 0, 0.9)


# Cuts first, so their fills claim their beats before the groove is laid. The sync window is ITU-R BT.1359's
# detectability threshold (sound 45 ms early to 125 ms late), widened by half of any transition the cut has.
on_beat, accents = 0, []
for c, d in cues:
    if not 0 < c < A.seconds - 0.5:
        continue
    b0 = int(c // bar)
    cands = [(at(b, i), b, i) for b in range(max(0, b0 - 1), min(bars, b0 + 2)) for i in (0, 4, 8, 12, 14)]
    cands = [x for x in cands if -0.045 - d / 2 <= x[0] - c <= 0.125 + d / 2]
    if cands:
        t, b, i = min(cands, key=lambda x: abs(x[0] - c))
        on_beat += 1
        accents.append(t)
        accent(t)
        if i == 0 and b >= 2 and (b - 1, 3) not in muted:
            fill(b - 1, 0.8)
    else:
        hit(riser, c - 0.8, 1, 0.3, 0.16 if ST in ("fighter", "powermetal") else 0.12)

for b in range(S - 1, bars, S):  # section ends
    if b + 1 < home:
        fill(b)
        if all(abs(x - at(b + 1, 0)) > beat for x in accents):
            accent(at(b + 1, 0))
if home < bars and (home - 1, 3) not in muted:  # the way home
    fill(home - 1, 0.8)
    accent(at(home, 0))


def groove(b):
    """The groove's hits for bar b as (fn, sixteenth, gain, pan, args, is kick or snare)."""
    g = KICKS[letter(b) == "B"]
    push, out = b % P == P - 1, []
    if ST == "lofi":
        out += [(kick, i, 0.9, 0, (0.9, 0.7), True) for i in g[b % 2]]
        out += [(snare, i, 0.8, 0.05, (0.5,), True) for i in (4, 12)]
        out += [(snare, i, 0.8, 0.1, (0.13,), True) for i in ghosts]
        if subdiv == "shaker":
            out += [(shaker, i, 1, 0.35, (0.1 if i % 4 else 0.14,), False) for i in range(0, 16, 2)]
        else:
            out += [(hat, i, 1, 0.3, (0.12 if i % 4 else 0.18,), False) for i in range(0, 16, 2)]
            out += [(hat, i, 1, 0.3, (0.05,), False) for i in range(1, 16, 2)] if subdiv == "hat16" else []
        out += [(kick, 14, 0.6, 0, (0.9, 0.7), True), (rim, 15, 1, -0.3, (0.2,), False)] if push else []
    elif ST == "garage":
        out += [(kick, i, 0.8, 0, (0.9, 0.9), True) for i in g[b % 2]]
        out += [(clap, i, 0.45, 0, (0.5,), True) for i in (4, 12)]
        out += [(rim, i, 1, -0.3, (0.12,), True) for i in ghosts]
        out += [(hat, i, 1, -0.25, (0.11,), False) for i in (2, 6, 10, 14) if not (push and i == 14)]
        ghost = {"shaker": (shaker, 0.06), "rim": (rim, 0.07), "hat16": (hat, 0.05)}[subdiv]
        out += [(ghost[0], i, 1, 0.35, (ghost[1],), False) for i in (3, 7, 11, 15)]
        out += [(hat, 14, 1, 0.2, (0.12, True), False)] if push else []
    elif ST == "fighter":
        out += [(kick_tight, i, 0.85, 0, (0.9 if i % 4 == 0 else 0.7,), True) for i in g]
        out += [(snare_big, i, 0.8, 0.05, (0.7,), True) for i in (4, 12)]
        if letter(b) == "B":  # the B sections ride the bell instead of the hats
            out += [(ride, i, 1, 0.3, (0.16,), False) for i in range(0, 16, 4)]
        else:
            out += [(hat, i, 1, 0.3, (0.1 if i % 4 else 0.14,), False) for i in range(0, 16, 2)]
        out += [(kick_tight, i, 0.85, 0, (0.75,), True) for i in (12, 13, 14, 15)] if push else []
    elif ST == "rocksteady":
        out += [(kick, i, 0.85, 0, (0.85, 0.6), True) for i in g[b % 2]]
        out += [(rim, 8, 1, -0.15, (0.32,), True)]  # the drop: the cross-stick lands with the kick on three
        out += [(snare, i, 0.8, 0.1, (0.1,), True) for i in ghosts]
        out += [(hat, i, 1, 0.3, (0.12 if i % 4 else 0.16,), False) for i in range(0, 16, 2) if not (push and i == 14)]
        out += [(hat, i, 1, 0.3, (0.05,), False) for i in range(1, 16, 2)] if subdiv == "hat16" else []
        out += [(hat, 14, 1, 0.3, (0.12, True), False), (snare, 15, 0.8, 0.1, (0.3,), True)] if push else []
    elif ST == "rumba":
        sebene = letter(b) == "B"
        out += [(kick, i, 0.8, 0, (0.8, 0.7), True) for i in ((0, 4, 8, 12) if sebene else g[b % 2])]
        out += [(conga, i, 1, 0.25, (200 if i in (6, 7, 14, 15) else 330 if i in (4, 12) else 260,
                                     0.3 if i in (4, 6, 7, 12, 14, 15) else 0.1, i in (4, 12)), False) for i in tumbao]
        if sebene:  # the cavacha: a snare on every sixteenth, the off-beat eighths leaning forward
            out += [(snare, i, 1, -0.1, (0.2 if i % 4 == 2 else 0.07,), True) for i in range(16)]
            out += [(hat, i, 1, 0.3, (0.12,), False) for i in (2, 6, 10, 14)]
        else:
            out += [(clave, i, 1, -0.35, (0.22,), False) for i in CLAVE]
            out += [(shaker, i, 1, 0.4, (0.1 if i % 4 else 0.13,), False) for i in range(0, 16, 2)]
        out += [(tom, 14, 0.6, 0.2, (150, 0.5), True), (tom, 15, 0.6, 0.2, (120, 0.5), True)] if push else []
    elif ST == "powermetal":
        out += [(kick_tight, i, 0.8, 0, (0.85 if i % 4 == 0 else 0.62,), True) for i in g]
        out += [(snare_big, i, 0.85, 0.05, (0.75,), True) for i in (4, 12)]
        if letter(b) == "B":  # the B sections crash on every beat
            out += [(crash, i, 1, 0.35, (0.07,), False) for i in range(0, 16, 4)]
        else:
            out += [(ride, i, 1, 0.3, (0.1 if i % 4 else 0.15,), False) for i in range(0, 16, 2)]
        out += [(snare_big, i, 0.8, 0.05, (0.4 + 0.08 * (i - 12),), True) for i in (13, 14, 15)] if push else []
    elif ST == "deephouse":
        out += [(kick, i, 0.95, 0, (1.0, 1.1), True) for i in g[b % 2]]
        out += [(clap, i, 0.5, 0, (0.45,), True) for i in (4, 12)]
        out += [(hat, i, 1, 0.2, (0.13, True), False) for i in (2, 6, 10, 14)]  # open hats on the off-beats
        out += {"hat16": [(hat, i, 1, -0.3, (0.05,), False) for i in range(1, 16, 2)],
                "shaker": [(shaker, i, 1, -0.35, (0.07 if i % 2 else 0.04,), False) for i in range(16) if i % 4 != 2],
                "none": []}[subdiv]
        out += {"rim": [(rim, i, 1, 0.4, (0.12,), False) for i in (3, 11)],
                "conga": [(conga, i, 1, -0.4, (260 if i == 6 else 200, 0.18, False), False) for i in (6, 14, 15)],
                "none": []}[perc]
        out += [(clap, 15, 0.3, 0.1, (0.3,), True)] if push else []
    elif ST == "techno":
        out += [(kick_hard, i, 0.95, 0, (1.0,), True) for i in g[b % 2]]
        out += [(hat, i, 1, 0.25, (0.14,), False) for i in (2, 6, 10, 14)]
        if subdiv == "hat16":
            out += [(hat, i, 1, -0.25, (0.05 if i % 2 else 0.07,), False) for i in range(16) if i % 4 != 2]
        elif subdiv == "ride8" and letter(b) == "B":
            out += [(ride, i, 1, -0.3, (0.07,), False) for i in (2, 6, 10, 14)]
        out += {"clap": [(clap, i, 0.45, 0.05, (0.4,), True) for i in (4, 12)],
                "rim": [(rim, i, 1, 0.3, (0.18,), True) for i in (4, 12)], "none": []}[snap]
        out += [(kick_hard, 14, 0.7, 0, (0.8,), True)] if push else []
    else:
        out += [(soft_ride, i, 1, 0.35, (0.12 if i % 8 == 0 else 0.09 if i % 4 == 0 else 0.06,), False) for i in g]
        out += [(brush, i, 1, -0.2, (0.3,), True) for i in (4, 12)] if subdiv == "brush" else [(rim, 12, 1, -0.2, (0.22,), True)]
        out += [(kick, i, 0.2, 0, (0.8, 0.5), True) for i in (0, 4, 8, 12)] if feather else [(kick, 0, 0.35, 0, (0.8, 0.5), True)]
        out += [(brush, i, 1, 0.1, (0.12,), True) for i in ghosts]
        out += [(brush, 14, 1, 0.1, (0.16,), True)] if push else []
    return out


for b in range(1, bars):
    for fn, i, g, pan, a, ks in groove(b):
        if not (ks and (b, i // 4) in muted):
            hit(fn, at(b, i), g, pan, *a)


# ---- lead --------------------------------------------------------------------------------------------------
# A short motif drawn from an interval chain (steps far likelier than leaps, a leap answered by a step back, a pull
# toward the middle of the range), restated each bar from the chord tone nearest the phrase's arch, turned upside
# down or backwards on the phrase's third bar, with chord tones on the strong beats and a held chord tone at the end
# of each phrase. Bars the mask leaves out are rests, so the lead breathes under the narration.
CELLS = {  # (sixteenth, length) rhythm cells a lead bar is built from; the gaps are rests
    "jazz": [[(0, 4), (4, 2), (6, 2), (8, 6)], [(2, 2), (4, 4), (10, 2), (12, 4)], [(0, 6), (6, 2), (8, 4)],
             [(4, 2), (6, 2), (8, 2), (10, 6)], [(0, 2), (2, 2), (4, 2), (6, 2), (8, 8)], [(0, 4), (6, 2), (8, 2), (10, 6)]],
    "lofi": [[(2, 2), (4, 4), (10, 6)], [(0, 3), (3, 3), (6, 2), (8, 8)], [(6, 2), (8, 2), (10, 6)],
             [(0, 8), (12, 4)], [(0, 2), (2, 2), (4, 4), (12, 2), (14, 2)], [(4, 4), (10, 2), (12, 4)]],
    "rocksteady": [[(2, 2), (4, 4), (8, 8)], [(0, 6), (6, 2), (8, 4), (12, 4)], [(4, 2), (6, 2), (8, 2), (10, 6)],
                   [(0, 3), (3, 3), (6, 10)], [(2, 2), (6, 2), (8, 4), (14, 2)]],
    "rumba": [[(0, 4), (4, 2), (6, 2), (8, 8)], [(2, 2), (4, 2), (6, 2), (8, 4), (12, 4)], [(0, 6), (6, 2), (8, 2), (10, 6)],
              [(0, 2), (2, 2), (4, 4), (10, 2), (12, 4)], [(4, 4), (8, 2), (10, 2), (12, 4)]],
    "powermetal": [[(0, 2), (2, 2), (4, 2), (6, 2), (8, 8)], [(0, 4), (4, 4), (8, 4), (12, 4)], [(0, 6), (6, 2), (8, 8)],
                   [(0, 2), (2, 2), (4, 4), (8, 2), (10, 2), (12, 4)], [(0, 8), (8, 4), (12, 4)]],
    "deephouse": [[(0, 4), (6, 2), (10, 6)], [(2, 2), (4, 2), (8, 8)], [(0, 8), (10, 2), (12, 4)],
                  [(6, 2), (8, 2), (10, 2), (12, 4)], [(0, 2), (3, 3), (8, 8)]],
}
MASKS = {2: ["11", "10"], 4: ["1110", "1101", "1010", "1111"]}
ARCH = {2: [1, -1], 4: [0, 1, 3, 1]}
LO, HI, MID = 0, 10, 4


def deg_midi(d):
    return key + 12 + 12 * (d // 7) + SCALE[ST][d % 7]


def stable(d, b):
    r, v = chord(b)
    return (deg_midi(d) - r) % 12 in {0} | {iv % 12 for iv in v if iv % 12 in (3, 4, 7, 10, 11)}


def nearest(d, b, ok):
    for k in sorted(range(-4, 5), key=lambda k: (abs(k), abs(d + k - MID))):
        if LO <= d + k <= HI and ok(d + k, b):
            return d + k
    return d


def step(prev_iv, d):
    ivs = np.arange(-4, 5)
    w = np.array([1, 2, 6, 14, 3, 14, 6, 2, 1], float)
    if abs(prev_iv) >= 3:
        w *= np.where((np.sign(ivs) == -np.sign(prev_iv)) & (np.abs(ivs) <= 2), 4.0, 0.25)
    w *= np.exp(-0.15 * (np.abs(d + ivs - MID) - abs(d - MID)))
    w[(d + ivs < LO) | (d + ivs > HI)] = 0
    return int(lead_rng.choice(ivs, p=w / w.sum()))


def motif(n):
    out, d, iv = [], MID, 0
    for _ in range(n):
        iv = step(iv, d)
        d += iv
        out.append(iv)
    return out


def vary(m, op):
    return [-x for x in m] if op == 1 else m[::-1] if op == 2 else [-x for x in m[::-1]] if op == 3 else m


def lead_notes():
    """(bar, sixteenth, length, midi) for every lead note."""
    themes, out, prev = {}, [], MID
    for L in "AB":
        ra, rb = (int(i) for i in lead_rng.choice(len(CELLS[ST]), 2, replace=False))
        themes[L] = (CELLS[ST][ra], CELLS[ST][rb], motif(5), int(lead_rng.integers(1, 4)), MASKS[P][int(lead_rng.integers(len(MASKS[P])))])
    for b in range(P, home):
        ca, cb, m, op, mask = themes[letter(b)]
        j = b % P
        if mask[j] == "0":
            continue
        r, _ = chord(b)
        cell, mv = (ca if j % 2 == 0 else cb), vary(m, op if j == P - 2 and P == 4 else 0)
        last_bar = j == mask.rindex("1")
        for k, (on, ln) in enumerate(cell):
            if k == 0:
                d = nearest(MID + ARCH[P][j], b, stable)
            else:
                d = prev + mv[(k - 1) % len(mv)]
                d = d if LO <= d <= HI else prev - mv[(k - 1) % len(mv)]
                d = min(HI, max(LO, d))
            if (on in (0, 8) and not stable(d, b)) or (deg_midi(d) - r) % 12 == 6:
                d = nearest(d, b, stable)
            if last_bar and k == len(cell) - 1:  # the phrase's close: a held chord tone, the root on every second phrase
                d = nearest(d, b, (lambda x, bb: (deg_midi(x) - r) % 12 == 0) if (b // P) % 2 else stable)
                ln = 16 - on
            out.append((b, on, ln, deg_midi(d)))
            prev = d
    return out


# ---- the parts ---------------------------------------------------------------------------------------------
def speech_dip(x, k):
    """Take a few dB out of 1-3 kHz, where the narration's consonants live."""
    return x - k * sg.sosfilt(sos_bp(1000, 3000), x, axis=0)


def low(m, floor):
    """Note m moved by octaves into the octave starting at floor."""
    return floor + (m - floor) % 12


def bass_note(r, v, nr, iv):
    """A bass figure's step as a note: "3" is the chord's third, "n" a semitone below the next chord's root."""
    return nr - 1 if iv == "n" else r + (v[0] if iv == "3" else iv)


def third_up(m):
    """The diatonic third above m, for a twin-guitar harmony."""
    pc = (m - key) % 12
    if pc not in SCALE[ST]:
        return m + 3
    j = SCALE[ST].index(pc)
    return m + (SCALE[ST][(j + 2) % 7] - pc) % 12


def under(m, b):
    """The highest chord tone at least a third below m: the second guitar's line."""
    r, v = chord(b)
    pcs = {r % 12} | {(r + iv) % 12 for iv in v}
    return next(x for x in range(m - 3, m - 16, -1) if x % 12 in pcs)


BASS_FIGS = {  # (sixteenth, step, length) bass figures; a piece draws one for its A sections and one for its B
    "rocksteady": [[(0, 0, 6), (6, 0, 2), (8, 7, 4), (14, 12, 2)], [(2, 0, 4), (6, "3", 2), (8, 7, 6), (14, "n", 2)],
                   [(0, 0, 4), (4, 7, 2), (6, 9, 2), (8, 12, 4), (12, 9, 2), (14, 7, 2)], [(2, 0, 2), (4, 0, 4), (10, 7, 2), (12, "3", 4)]],
    "rumba": [[(0, 0, 4), (6, 7, 2), (8, 12, 4), (12, 7, 2), (14, "n", 2)], [(0, 0, 3), (3, 0, 3), (6, 7, 2), (8, "3", 4), (12, 7, 4)],
              [(0, 0, 6), (6, "3", 2), (8, 7, 6), (14, "n", 2)]],
    "sebene": [[(0, 0, 2), (3, 7, 2), (6, 12, 2), (8, 0, 2), (11, 7, 2), (14, "n", 2)],
               [(0, 0, 3), (3, 0, 1), (6, "3", 2), (8, 7, 3), (11, 7, 1), (14, 12, 2)]],
    "deephouse": [[(2, 0, 2), (6, 0, 2), (10, 0, 2), (14, 12, 2)], [(3, 0, 3), (6, 0, 2), (10, 7, 2), (14, 0, 2)],
                  [(2, 0, 3), (6, 0, 1), (10, 7, 3), (14, "n", 2)], [(0, 0, 2), (3, 0, 2), (7, 7, 2), (10, 0, 4)]],
}


def figure(name):
    opts = BASS_FIGS[name]
    return opts[int(keys_rng.integers(len(opts)))]


voice = None
if ST == "jazz":
    # Soft corporate jazz: swung ride, brushes or a rim click, walking bass, comped Rhodes, vibes or Rhodes on top.
    voice = str(keys_rng.choice(["vibes", "rhodes", "trade"]))
    comp = {L: [[(2, 3), (8, 5)], [(0, 3), (6, 4)], [(2, 3), (10, 4)]][int(keys_rng.integers(3))] for L in "AB"}
    for b in range(bars):
        r, v = chord(b)
        nr, _ = chord(b + 1)
        walk = [r, r + v[0] - 12 + 12 * (v[0] < 3), r + 7, nr - 1 if keys_rng.random() < 0.6 else nr + 1]
        for q, m in enumerate(walk if b < bars - 1 else [r]):
            play(bass, "bass", upright(hz(m - 12), beat * 0.9), at(b, 4 * q), m - 12, 0.9)
        # comping on the section's figure, anticipating the next chord on a phrase's last bar
        hits_ = comp[letter(b)] + ([(14, 2)] if b % P == P - 1 and b + 1 < bars else [])
        for i, ln in hits_:
            cr, cv = chord(b + 1) if i == 14 else (r, v)
            for k, iv in enumerate(cv):
                play(keys, "keys", rhodes(hz(cr + iv), ln * s16, 0.16), at(b, i) + k * 0.006, cr + iv, 1, -0.25 + 0.15 * k)
    for b, on, ln, m in lead_notes():
        use = voice if voice != "trade" else ("vibes" if letter(b) == "A" else "rhodes")
        sig = vibes(hz(m), ln * s16 * 0.9, 0.18 if on % 8 == 0 else 0.15) if use == "vibes" else rhodes(hz(m), ln * s16, 0.13)
        play(lead, "lead", sig, at(b, on), m, 1, 0.25)
    mix = drums.x * 0.8 + speech_dip(keys.x, 0.2) + bass.x * 0.9 + speech_dip(lead.x, 0.3)
    mix = reverb(mix, 1.6, 0.18, 6000)

elif ST == "lofi":
    # Lo-fi: dusty boom-bap with swung sixteenths, warm seventh chords, a mellow bass, a Rhodes or pluck lead, tape.
    voice = str(keys_rng.choice(["rhodes", "pluck", "trade"]))
    for b in range(bars):
        r, v = chord(b)
        for k, iv in enumerate(v):
            play(keys, "keys", rhodes(hz(r + iv), bar * 0.95, 0.26), at(b, 0) + k * 0.012, r + iv, 1, -0.2 + 0.12 * k)
        play(bass, "bass", sub(hz(r - 12), beat * 1.7, vel=0.55), at(b, 0), r - 12)
        play(bass, "bass", sub(hz(r - 5), beat * 0.9, vel=0.45), at(b, 10), r - 5)
    for b, on, ln, m in lead_notes():
        use = voice if voice != "trade" else ("rhodes" if letter(b) == "A" else "pluck")
        sig = rhodes(hz(m), ln * s16 * 0.9, 0.11) if use == "rhodes" else pluck(hz(m), ln * s16 * 0.9, 0.13)
        play(lead, "lead", sig, at(b, on), m, 1, 0.3)
    mix = duck(speech_dip(keys.x, 0.2) + speech_dip(lead.x, 0.3) * 1.4, kicks, 0.25, 0.25) + drums.x * 0.9 + bass.x * 0.45
    mix = reverb(mix, 1.4, 0.16, 4500)
    mix = lofi_tape(mix)

elif ST == "garage":
    # Soft future garage: two-step drums, sub notes that start on the kicks, airy pads and a vocal-chop motif that
    # swaps its two shapes in the B sections.
    voice = "chops"
    vowels = [str(v) for v in keys_rng.choice(list(FORMANTS), size=8)]
    prev = None
    for b in range(bars):
        r, v = chord(b)
        pattern = KICKS[letter(b) == "B"][b % 2]
        play(keys, "keys", pad([hz(r + iv) for iv in v], bar * 1.02, 0.7, 2200), at(b, 0), r)
        m = r - 12 if r - 12 >= 38 else r
        # the sub plays from each kick to the next, gliding in from the last note
        starts = [at(b, i) for i in pattern] + [at(b + 1, 0)]
        for k in range(len(pattern)):
            note = m - 12 + (7 if k == len(pattern) - 1 and b % 2 else 0)
            play(bass, "bass", sub(hz(note), (starts[k + 1] - starts[k]) * 0.92, hz(prev) if prev else None, 0.7), starts[k], note)
            prev = note
        if 1 <= b < home and b % P != P - 1:  # the chops rest on a phrase's last bar, under the hat push
            shapes = ((3, 6, 10), (2, 9))
            motif_ = shapes[(b + (letter(b) == "B")) % 2]
            for k, i in enumerate(motif_):
                mm = r + v[(b + k) % len(v)] + 12
                play(lead, "lead", chop(hz(mm), s16 * 1.6, vowels[(b + k) % 8], 0.18), at(b, i), mm, 1, -0.3 + 0.3 * k)
    rain = sg.sosfilt(sos_bp(2500, 9000), noise_rng.standard_normal(N)) * 0.01
    mix = duck(speech_dip(keys.x, 0.2) + speech_dip(lead.x, 0.35) * 1.6, kicks, 0.45, 0.22) \
        + duck(bass.x, kicks, 0.3, 0.15) * 0.45 + drums.x * 0.9 + rain[:, None]
    mix = reverb(mix, 2.6, 0.3, 5500)

elif ST == "fighter":
    # Fighter: a Matrix-style arcade fight. A kick figure per section, big snares on two and four, a distorted
    # power-chord riff on the gallop, square-wave arpeggios over the minor pentatonic that turn round at each phrase
    # end, and a digital-rain motif above the voice band.
    voice = "arps"
    penta = [0, 3, 5, 7, 10]
    shape = {L: [int(x) for x in keys_rng.permutation(8)] for L in "AB"}
    rain_ = {L: [(int(i), int(n)) for i, n in zip(keys_rng.choice(16, 3, replace=False), keys_rng.integers(0, 5, 3))] for L in "AB"}
    for b in range(bars):
        r, v = chord(b)
        if b >= 1:
            for q in range(4):
                for i in (0, 2, 3):
                    up = 12 if (q == 3 and i == 3) else 0
                    play(bass, "bass", dist_bass(hz(r - 12 + up), s16 * (1.8 if i == 0 else 0.9)), at(b, q * 4 + i), r - 12 + up)
            for i in (0, 6, 10):
                play(keys, "keys", power([hz(r + iv) for iv in [0] + v], s16 * 1.6), at(b, i), r)
        arp = shape[letter(b)][::-1] if b % P == P - 1 else shape[letter(b)]
        for i in range(16):
            n_ = arp[i % 8]
            note = r + 24 + penta[n_ % 5] + 12 * (n_ // 5)
            note -= (note - key) % 12 not in SCALE[ST]  # a pentatonic on bVI or bVII steps outside the key
            play(lead, "lead", pulse(hz(note), s16 * 0.8, 0.22 if i % 4 == 0 else 0.15), at(b, i), note, 1, 0.25 if i % 2 else -0.25)
        if b % 2:
            for i, n_ in rain_[letter(b)]:
                play(fx, "fx", blip(hz(key + 60 + penta[n_])), at(b, i), key + 60 + penta[n_], 1, 0.6 if i % 2 else -0.6)
    mix = drums.x + duck(bass.x * 0.55 + keys.x * 0.5, kicks, 0.2, 0.08) + speech_dip(lead.x, 0.3) * 0.4 + fx.x
    mix = reverb(mix, 1.2, 0.12, 6000)
    mix = np.tanh(mix * 1.3)

elif ST == "rocksteady":
    # Rocksteady: a one-drop groove, a round melodic bass that often leaves beat one empty, a choked guitar skank on two
    # and four doubled by a piano, an organ bubble in the B sections, and a melodica or organ lead.
    voice = str(keys_rng.choice(["melodica", "organ", "trade"]))
    figs = {L: figure("rocksteady") for L in "AB"}
    skank_at = {L: [(4, 12), (4, 12, 14), (4, 6, 12, 14)][int(keys_rng.integers(3))] for L in "AB"}
    for b in range(bars):
        r, v = chord(b)
        nr, _ = chord(b + 1)
        for i, iv, ln in (figs[letter(b)] if b < bars - 1 else [(0, 0, 8)]):
            m = bass_note(low(r, 33), v, low(nr, 33), iv)
            play(bass, "bass", ebass(hz(m), ln * s16 * 0.9), at(b, i), m, 0.95)
        gtr = [low(r, 55) + iv for iv in [0] + v]
        for i in skank_at[letter(b)]:
            play(keys, "keys", strum([hz(m) for m in gtr], s16 * 0.6, 0.3), at(b, i), gtr[0], 1, 0.3)
            for k, m in enumerate(gtr[1:]):
                play(keys, "keys", rhodes(hz(m), s16 * 0.6, 0.08), at(b, i) + 0.004 * k, m, 1, -0.3)
        if letter(b) == "B":  # the organ bubble
            for i in (2, 6, 10, 14):
                play(keys, "keys", organ([hz(low(r, 48) + iv) for iv in v], s16 * 1.2, 0.12), at(b, i), low(r, 48), 1, -0.15)
    for b, on, ln, m in lead_notes():
        use = voice if voice != "trade" else ("melodica" if letter(b) == "A" else "organ")
        sig = melodica(hz(m), ln * s16 * 0.9, 0.16) if use == "melodica" else organ([hz(m)], ln * s16 * 0.9, 0.16, (1, 0.6, 0.2, 0.4))
        play(lead, "lead", sig, at(b, on), m, 1, 0.2)
    mix = drums.x * 0.85 + bass.x + speech_dip(keys.x, 0.25) * 0.9 + speech_dip(lead.x, 0.3)
    mix = reverb(mix, 1.2, 0.16, 3500)
    mix = np.tanh(2 * mix / (np.max(np.abs(mix)) + 1e-9))  # the skank and rim are spiky: tame them so the bed sits level

elif ST == "rumba":
    # Congolese rumba: a sweet song section over the clave, congas and maracas, two clean guitars in thirds and a round
    # melodic bass; the B sections drop into the sebene, a high guitar ostinato over the cavacha.
    voice = "guitars"
    figs = {"A": figure("rumba"), "B": figure("sebene")}
    arp = [int(x) for x in keys_rng.permutation(4)]  # the rhythm guitar's eighth-note arpeggio over four chord tones
    solo = [[int(x) for x in keys_rng.integers(0, 6, 8)] for _ in range(2)]  # two sebene ostinatos over six chord tones
    for b in range(bars):
        r, v = chord(b)
        nr, _ = chord(b + 1)
        for i, iv, ln in (figs[letter(b)] if b < bars - 1 else [(0, 0, 8)]):
            m = bass_note(low(r, 33), v, low(nr, 33), iv)
            play(bass, "bass", ebass(hz(m), ln * s16 * 0.9, 0.75), at(b, i), m)
        tones = [low(r, 59) + iv for iv in (0, v[0], 7, 12)]
        if letter(b) == "A" or b >= home:
            for k, i in enumerate(range(0, 16, 2)):
                m = tones[arp[k % 4]]
                play(keys, "keys", guitar(hz(m), s16 * 1.8, 0.11, 1.2), at(b, i), m, 1, -0.35)
        else:
            six = [low(r, 67) + o + iv for o in (0, 12) for iv in (0, v[0], 7)]
            for i in range(16):
                m = six[solo[(b // P) % 2][i % 8]]
                play(lead, "lead", guitar(hz(m), s16 * 0.9, 0.16 if i % 4 == 0 else 0.12, 1.4), at(b, i), m, 1, 0.35)
            for k, i in enumerate((0, 3, 6, 8, 11, 14)):  # the second guitar answers on the off-beats
                play(keys, "keys", guitar(hz(tones[k % 4]), s16 * 1.4, 0.1, 1.1), at(b, i), tones[k % 4], 1, -0.35)
    for b, on, ln, m in lead_notes():
        if letter(b) == "A":  # the song section's melody, with a second guitar a third or so below
            play(lead, "lead", guitar(hz(m), ln * s16 * 0.95, 0.15, 1.3), at(b, on), m, 1, 0.3)
            h = under(m, b)
            play(lead, "lead", guitar(hz(h), ln * s16 * 0.95, 0.1, 1.2), at(b, on) + 0.003, h, 1, -0.1)
    mix = drums.x * 0.85 + bass.x * 0.9 + speech_dip(keys.x, 0.25) + speech_dip(lead.x, 0.3) * 1.1
    mix = reverb(mix, 1.5, 0.2, 5000)

elif ST == "powermetal":
    # Power metal: a double kick under the piece, palm-muted power chords on the eighths, open chords and a choir in
    # the B sections, and a twin-guitar lead harmonised a third above, or one that hands the B sections to the keys.
    voice = str(keys_rng.choice(["twin guitars", "trade"]))
    vowel = {L: str(keys_rng.choice(["ah", "oo"])) for L in "AB"}
    for b in range(bars):
        r, v = chord(b)
        root = low(r, 40)
        if b == 0:  # the intro: an open chord and the choir swelling in before the drums
            play(keys, "keys", power([hz(root + x) for x in (0, 7, 12)], bar * 0.95, 0.42), at(0, 0), root)
            play(fx, "fx", choir([hz(low(r, 55) + iv) for iv in (0, v[0], 7)], bar, 0.55, vowel["A"]), at(0, 0), low(r, 55))
            continue
        for i in range(0, 16, 2):
            play(bass, "bass", dist_bass(hz(root - 12), s16 * 1.7, 0.55), at(b, i), root - 12)
        if letter(b) == "B" or b >= home:
            for i in (0, 8):
                play(keys, "keys", power([hz(root + x) for x in (0, 7, 12)], beat * 1.9, 0.42), at(b, i), root)
            play(fx, "fx", choir([hz(low(r, 55) + iv) for iv in (0, v[0], 7)], bar, 0.55, vowel[letter(b)]), at(b, 0), low(r, 55))
        else:
            for i in range(0, 16, 2):  # palm-muted: short and dark
                play(keys, "keys", power([hz(root + x) for x in (0, 7)], s16 * 1.1, 0.4), at(b, i), root)
    for b, on, ln, m in lead_notes():
        if voice == "trade" and letter(b) == "B":
            play(lead, "lead", lead_gtr(hz(m + 12), ln * s16 * 0.95, 0.22, 0.6), at(b, on), m + 12, 1, 0.1)
            continue
        play(lead, "lead", lead_gtr(hz(m + 12), ln * s16 * 0.95, 0.2), at(b, on), m + 12, 1, -0.25)
        h = third_up(m) + 12
        play(lead, "lead", lead_gtr(hz(h), ln * s16 * 0.95, 0.14), at(b, on) + 0.004, h, 1, 0.25)
    mix = drums.x + duck(bass.x * 0.5 + keys.x * 0.5, kicks, 0.1, 0.05) + speech_dip(lead.x, 0.35) * 0.45 \
        + speech_dip(fx.x, 0.2) * 0.6
    mix = reverb(mix, 1.4, 0.14, 6000)
    mix = np.tanh(mix * 1.3)

elif ST == "deephouse":
    # Deep house: four on the floor, open hats on the off-beats, minor-ninth chords on a Rhodes, an organ or a pad, a
    # warm sub that dodges the kick, and a vocal-chop or Rhodes lead; the chords and lead duck under every kick.
    voice = str(keys_rng.choice(["chops", "rhodes"]))
    tone_ = str(keys_rng.choice(["rhodes", "organ", "pad"]))
    shapes = [[(0, 6), (6, 2), (10, 4)], [(3, 3), (10, 3)], [(2, 2), (6, 2), (10, 2), (14, 2)], [(0, 3), (3, 3), (10, 4)]]
    stabs = {L: [(0, 16)] if tone_ == "pad" else shapes[int(keys_rng.integers(len(shapes)))] for L in "AB"}
    figs = {L: figure("deephouse") for L in "AB"}
    vowels = [str(x) for x in keys_rng.choice(list(FORMANTS), size=8)]
    prev = None
    for b in range(bars):
        r, v = chord(b)
        nr, _ = chord(b + 1)
        cr = low(r, 48)
        for i, ln in stabs[letter(b)]:
            if tone_ == "rhodes":
                for k, iv in enumerate(v):
                    play(keys, "keys", rhodes(hz(cr + iv), ln * s16, 0.16), at(b, i) + k * 0.008, cr + iv, 1, -0.25 + 0.15 * k)
            elif tone_ == "organ":
                play(keys, "keys", organ([hz(cr + iv) for iv in v], ln * s16 * 0.9, 0.2, (1, 0.5, 0.6, 0.2)), at(b, i), cr, 1, -0.1)
            else:
                play(keys, "keys", pad([hz(cr + iv) for iv in v], bar * 1.02, 0.6, 1800), at(b, 0), cr)
        if b >= 1:  # the sub glides in from the last note when it is near
            for i, iv, ln in figs[letter(b)]:
                m = bass_note(low(r, 33), v, low(nr, 33), iv)
                play(bass, "bass", sub(hz(m), ln * s16 * 0.9, hz(prev) if prev and abs(prev - m) <= 7 else None, 0.7), at(b, i), m)
                prev = m
    for b, on, ln, m in lead_notes():
        sig = chop(hz(m), min(ln, 4) * s16, vowels[(b + on) % 8], 0.2) if voice == "chops" else rhodes(hz(m), ln * s16 * 0.9, 0.12)
        play(lead, "lead", sig, at(b, on), m, 1, 0.25)
    mix = duck(speech_dip(keys.x, 0.2) + speech_dip(lead.x, 0.35) * 1.3, kicks, 0.4, 0.18) \
        + duck(bass.x, kicks, 0.6, 0.12) * 0.55 + drums.x * 0.85
    mix = reverb(mix, 2.2, 0.24, 5000)

else:
    # Techno: a hard four on the floor over a reverb rumble, an acid line whose filter opens and closes over sixteen
    # bars (or, in dub techno, an off-beat sub and echoing chord stabs), and in the B sections a three-step blip that
    # rolls across the bar line.
    voice = str(keys_rng.choice(["acid", "dub"]))
    line = {}
    for L in "AB":  # sixteen steps a section: (on, step above the root, accent, slide into the next)
        steps = [(bool(keys_rng.random() < 0.72), [0, 0, 0, 12, 1, 3, 7, 10][int(keys_rng.integers(8))],
                  bool(keys_rng.random() < 0.3), bool(keys_rng.random() < 0.18)) for _ in range(16)]
        line[L] = [(True, 0, True, False)] + steps[1:]
    stab_at = {L: int(keys_rng.choice([3, 6, 10, 14])) for L in "AB"}
    for b in range(bars):  # the bass starts in bar zero, before the drums, as the intro
        r, v = chord(b)
        root = low(r, 40)
        cut = 450 + 1500 * (0.5 - 0.5 * np.cos(2 * np.pi * b / 16))
        glide = None
        for i, (on, iv, acc, slide) in enumerate(line[letter(b)] if voice == "acid" else []):
            if not on:
                glide = None
                continue
            m = root + iv
            play(bass, "bass", acid(hz(m), s16 * (1.05 if slide else 0.6), cut, 7.0, 0.3, acc, hz(glide) if glide else None), at(b, i), m)
            glide = m if slide else None
        if voice == "dub":
            for i in (2, 6, 10, 14):
                play(bass, "bass", sub(hz(root - 12), s16 * 1.6, vel=0.8), at(b, i), root - 12)
        stab = [hz(low(r, 48) + iv) for iv in v]
        if voice == "dub":  # a stab every bar, echoed twice on the dotted eighth, into the next bar if need be
            for k in range(3):
                play(fx, "fx", organ(stab, s16 * 1.2, 0.24 * 0.55 ** k, (1, 0.3, 0.5, 0.1)), at(b, stab_at[letter(b)] + 3 * k),
                     low(r, 48), 1, 0.3 - 0.3 * k)
        elif b % 2:
            play(fx, "fx", organ(stab, s16 * 1.5, 0.22, (1, 0.3, 0.5, 0.1)), at(b, stab_at[letter(b)]), low(r, 48), 1, 0.3)
        if letter(b) == "B" and b < home:
            for i in range(16):
                if (b * 16 + i) % 3 == 0:
                    n_ = low(r, 72) + (0, 7, 12)[((b * 16 + i) // 3) % 3]
                    play(lead, "lead", blip(hz(n_), 0.12), at(b, i), n_, 1, 0.5 if i % 2 else -0.5)
    rumble = Bus()
    for k in kicks:
        rumble.add(kick_hard(0.8), k)
    rumble = duck(sg.sosfilt(sos_lp(130, 4), reverb(rumble.x, 1.6, 1.0, 200), axis=0), kicks, 0.9, 0.15)
    mix = drums.x * 0.8 + rumble * 0.25 + duck(bass.x * (1 if voice == "acid" else 0.4), kicks, 0.35, 0.1) \
        + speech_dip(reverb(fx.x, 3.0, 0.5, 3000), 0.3) * 0.5 + speech_dip(lead.x, 0.3) * 0.35
    mix = np.tanh(mix * 0.5)

# Intro and ending: fade in over the first moments and out over the last two seconds.
t = np.arange(N) / SR
mix *= np.clip(t / min(0.6, A.seconds / 4), 0, 1)[:, None]
mix *= np.clip((A.seconds - t) / 2.0, 0, 1)[:, None]
mix /= np.max(np.abs(mix)) + 1e-9
wavfile.write(A.out, SR, (mix[: int(A.seconds * SR)] * 0.89 * 32767).astype(np.int16))
if A.events:
    with open(A.events, "w") as f:
        json.dump({"style": ST, "bpm": bpm, "key": key, "third": SCALE[ST][2], "swing": float(SWING), "home": home, "bars": bars,
                   "accents": accents, "events": sorted(events, key=lambda e: e["t"])}, f)
print(f"{A.out}: {ST}, {bpm:.0f} bpm, key {key}, form {form}, lead {voice}, {on_beat}/{len(cues)} cuts on the beat, {A.seconds:.1f}s")
