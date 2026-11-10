# Original energetic electro-pop track for the reel: 160 BPM (scene cuts land on the beat), synthesized from scratch.
import numpy as np
from scipy.signal import butter, lfilter
from scipy.io import wavfile
SR, BPM, DUR = 44100, 160, 24.0
beat = 60 / BPM; N = int(SR * DUR); mix = np.zeros((N, 2)); rng = np.random.default_rng(7)
def t_(d): return np.arange(int(SR * d)) / SR
def lp(x, f): b, a = butter(2, min(f, SR / 2 - 100) / (SR / 2)); return lfilter(b, a, x)
def hp(x, f): b, a = butter(2, f / (SR / 2), 'high'); return lfilter(b, a, x)
def add(x, start, g=1.0, pan=0.0):
    i = int(start * SR)
    if i >= N: return
    x = x[:N - i]; mix[i:i + len(x), 0] += x * g * (1 - pan) ** .5; mix[i:i + len(x), 1] += x * g * (1 + pan) ** .5
def hz(m): return 440 * 2 ** ((m - 69) / 12)
def saw(f, t): return 2 * ((f * t) % 1) - 1

def kick():
    t = t_(.35); f = 45 + 110 * np.exp(-t * 40)
    return np.tanh(2.5 * np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-t * 9)
def clap():
    t = t_(.25); n = hp(rng.standard_normal(len(t)), 1500)
    env = sum(np.exp(-np.clip(t - d, 0, None) * 60) * (t >= d) for d in (0, .01, .022)) * np.exp(-t * 10)
    return n * env
def hat(o=False):
    t = t_(.18 if o else .04); return hp(rng.standard_normal(len(t)), 8000) * np.exp(-t * (18 if o else 90))
def stab(midis, d=.17, cut=4000):
    t = t_(d); x = sum(saw(hz(m) * k, t) for m in midis for k in (1, 1.006, .994)) / (3 * len(midis))
    return lp(x, cut) * np.exp(-t * 9)
def bass(m, d):
    t = t_(d); x = saw(hz(m), t) * .6 + np.sin(2 * np.pi * hz(m) * t)
    return lp(x, 700) * np.minimum(1, t / .005) * np.exp(-t * 6)
def lead(m, d):
    t = t_(d); x = np.sign(np.sin(2 * np.pi * hz(m) * t)) * .5 + np.sin(2 * np.pi * hz(m) * 2 * t) * .3
    return lp(x, 3500) * np.minimum(1, t / .01) * np.exp(-t * 4)
def riser(d):
    t = t_(d); n = rng.standard_normal(len(t)); f = np.linspace(400, 9000, len(t))
    out = np.zeros_like(n); seg = 2048
    for i in range(0, len(n), seg): out[i:i + seg] = lp(hp(n[i:i + seg], 300), f[i])
    return out * (t / d) ** 2
def impact():
    t = t_(.8); return (np.sin(2 * np.pi * 50 * t) * .8 + hp(rng.standard_normal(len(t)), 200) * .3) * np.exp(-t * 4)
def whoosh(d=.35):
    t = t_(d); return lp(hp(rng.standard_normal(len(t)), 800), 6000) * np.sin(np.pi * t / d) ** 2
def click():
    t = t_(.05); return np.sin(2 * np.pi * 2200 * t) * np.exp(-t * 120)

# Am – F – C – G, two bars (8 beats = 3 s) per chord
CH = [([57, 60, 64], 45), ([53, 57, 60], 41), ([48, 52, 55], 36), ([55, 59, 62], 43)]
MEL = [76, 74, 72, 74, 76, 79, 76, 72]                    # hook, one note per beat
DROP = 3.0                                                # intro until 3 s, then full beat
nb = int(DUR / beat)
for b in range(nb):
    tb = b * beat; chord, root = CH[(b // 8) % 4]; full = tb >= DROP
    cut = 900 + 3100 * min(1, tb / DROP) if not full else 4500   # intro: filter opens up
    add(stab([m + 12 for m in chord], cut=cut), tb + beat / 2, .16 if full else .10, pan=.25)   # off-beat stabs
    if not full:
        if b % 2 == 0: add(kick(), tb, .25)
        continue
    if b % 2 == 0: add(kick(), tb, .7)                    # kick every other beat (= 80 BPM pulse)
    if b % 4 == 2: add(clap(), tb, .35)
    add(hat(), tb, .08, .3); add(hat(o=(b % 2 == 1)), tb + beat / 2, .07, -.3)
    for e in range(2): add(bass(root, beat / 2), tb + e * beat / 2, .32)   # driving 8th bass
    if (b // 8) % 2 == 1 and tb < DUR - 3: add(lead(MEL[b % 8], beat * .9), tb, .10, -.15)

add(riser(DROP - .2), .2, .18); add(impact(), DROP, .5)
for c in (1.5, 5.25, 9, 12.75, 16.5, 20.25): add(whoosh(), c - .25, .12)
for c in (12.75 + 2.4, 16.5 + 1.9, 20.25 + 1.9): add(click(), c, .3)
add(impact(), 20.25, .35)                                  # hit on the final scene

fade = np.ones(N); fi, fo = int(.3 * SR), int(1.5 * SR)
fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] = np.linspace(1, 0, fo)
mix *= fade[:, None]; mix = np.tanh(mix / np.abs(mix).max() * 1.4) ; mix /= np.abs(mix).max() / .9
wavfile.write('music_food.wav', SR, (mix * 32767).astype(np.int16)); print('ok')
