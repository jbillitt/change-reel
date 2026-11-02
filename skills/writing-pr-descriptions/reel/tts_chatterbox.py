# Voice many lines with one Chatterbox-Turbo load. Usage: python tts_chatterbox.py <jobs.json>
# Same jobs.json as tts_batch.py. Each Kokoro voice name maps to a synthetic reference clip
# (voices/<voice>.wav, made by tts_batch.py from Kokoro), so actors keep distinct voices and no real person is cloned.
import os
import sys

from tts_common import REFS, voice_lines

import torch
from chatterbox.tts_turbo import ChatterboxTurboTTS

torch.set_num_threads(max(1, (os.cpu_count() or 4) - 1))
model = ChatterboxTurboTTS.from_pretrained(device="cpu")


def generate(text, job):
    ref = REFS / f'{job["voice"]}.wav'
    return model.generate(text, audio_prompt_path=str(ref) if ref.exists() else None, temperature=0.5), model.sr


voice_lines(sys.argv[1], generate)
