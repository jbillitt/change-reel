# Local background music with MusicGen-small. Usage: python music.py "<prompt>" <seconds> <out.wav>
import sys
import numpy as np
import scipy.io.wavfile as wav
from transformers import AutoProcessor, MusicgenForConditionalGeneration

prompt, seconds, out = sys.argv[1], float(sys.argv[2]), sys.argv[3]
proc = AutoProcessor.from_pretrained("facebook/musicgen-small")
model = MusicgenForConditionalGeneration.from_pretrained("facebook/musicgen-small")
inputs = proc(text=[prompt], padding=True, return_tensors="pt")
tokens = int(seconds * model.config.audio_encoder.frame_rate)
audio = model.generate(**inputs, max_new_tokens=tokens, do_sample=True, guidance_scale=3)
rate = model.config.audio_encoder.sampling_rate
wav.write(out, rate, (audio[0, 0].numpy() * 32767).astype(np.int16))
