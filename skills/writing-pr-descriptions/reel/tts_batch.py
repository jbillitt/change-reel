# Voice many lines with one Kokoro load. Usage: python tts_batch.py <jobs.json>
# jobs.json: [{"text": "...", "voice": "bf_emma", "out": "line0.wav", "speed": 1.05}, ...]
import json
import sys
from pathlib import Path

import soundfile as sf
from kokoro_onnx import Kokoro

cache = Path.home() / ".cache" / "hyperframes" / "tts"
kokoro = Kokoro(str(cache / "models" / "kokoro-v1.0.onnx"), str(cache / "voices" / "voices-v1.0.bin"))
for job in json.loads(Path(sys.argv[1]).read_text(encoding="utf-8")):
    lang = "en-gb" if job["voice"][0] == "b" else "en-us"
    samples, rate = kokoro.create(job["text"], voice=job["voice"], speed=job.get("speed", 1.05), lang=lang)
    sf.write(job["out"], samples, rate)
    print(f'{job["out"]}: {len(samples) / rate:.2f}s')
