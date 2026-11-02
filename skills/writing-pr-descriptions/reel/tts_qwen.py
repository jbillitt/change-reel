# Voice many lines with one Qwen3-TTS load (Apache-2.0, CPU). Usage: python tts_qwen.py <jobs.json>
# Each voice clones a synthetic Kokoro clip (voices/<voice>.wav) read from the job's ref_text, so no real person is
# cloned. The text fixes, Whisper re-takes and word timings are shared with Chatterbox in tts_common.py.
import os
import sys

from tts_common import REFS, voice_lines

import torch
from huggingface_hub import snapshot_download
from qwen_tts import Qwen3TTSModel

torch.set_num_threads(max(1, (os.cpu_count() or 4) - 1))
# Load by local path: given a repo id, qwen_tts asks the Hub API even in offline mode. setup.mjs fetched the weights.
local = snapshot_download("Qwen/Qwen3-TTS-12Hz-0.6B-Base", local_files_only=True)
model = Qwen3TTSModel.from_pretrained(local, device_map="cpu", dtype=torch.float32)


def generate(text, job):
    wavs, sr = model.generate_voice_clone(text=text, language="English", ref_audio=str(REFS / f'{job["voice"]}.wav'), ref_text=job["ref_text"])
    return torch.as_tensor(wavs[0], dtype=torch.float32).reshape(1, -1), sr


voice_lines(sys.argv[1], generate)
