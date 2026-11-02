# Shared by the cloning voice engines (tts_qwen.py, tts_chatterbox.py): the text fixes, the Whisper check that
# re-takes misheard lines, and the word timings frames reveal on. Each engine only supplies generate().
import json
import os
import re
from pathlib import Path

os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
# Weights are fetched once by setup.mjs; builds never call the network.
os.environ.setdefault("HF_HUB_OFFLINE", "1")

# These engines read spelling, not phonemes: "API" comes out as "appy". Dotted letters ("A.P.I.") are read as
# letters (checked with Whisper); long all-caps words are lowercased so "RESIZED" is read as a word.
ACRONYMS = {"api", "bff", "id", "ids", "ui", "url", "sdk", "sql", "http", "https", "pr", "ci", "cd", "aws", "ld", "sso",
            "uuid", "mfe", "spa", "css", "html", "nr", "jwt", "dto", "orm", "cli", "dns", "iam", "s3", "ux"}
SAY_AS = {"json": "jason", "oauth": "oh auth", "graphql": "graph Q.L.", "github": "git hub"}
REFS = Path.home() / ".cache" / "pr-reel" / "voices"


def speakable(text):
    text = re.sub(r"(?<=[A-Za-z0-9])[-_/](?=[A-Za-z0-9])", " ", text)  # rust-resizer, user_id, a/b
    text = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", text)                    # userId -> user Id

    def word(m):
        w, low = m.group(0), m.group(0).lower()
        if low in SAY_AS:
            return SAY_AS[low]
        if low in ACRONYMS or (w.isupper() and len(w) <= 4 and len(w) > 1):
            core = low[:-1] if low.endswith("s") and low[:-1] in ACRONYMS else low
            return ".".join(core.upper()) + "." + ("s" if core != low else "")
        if w.isupper() and len(w) > 4:
            return low
        return w

    text = re.sub(r"[A-Za-z][A-Za-z0-9]*", word, text)
    return re.sub(r"\.\s*([.,;:!?])", r".\1", text).replace("..", ".")


SAME = {"organization": "organisation", "a.p.i.": "api", "b.f.f.": "bff", "i.d.": "id", "i.d.s": "ids", "u.i.": "ui",
        # respellings the build makes for heteronyms; Whisper writes the real word
        "red": "read", "reed": "read", "rered": "reread", "rereed": "reread"}


def words(text):
    text = re.sub(r"(?<=[A-Za-z0-9])[-_/](?=[A-Za-z0-9])", " ", text)
    text = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", text).lower()
    return [SAME.get(w, w).replace(".", "") for w in re.findall(r"[a-z0-9.']+", text) if w.strip(".")]


def distance(a, b):
    row = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        prev, row[0] = row[0], i
        for j, y in enumerate(b, 1):
            prev, row[j] = row[j], min(row[j] + 1, row[j - 1] + 1, prev + (x != y))
    return row[-1] / max(1, len(a))


def key_terms(text):
    # The words a slip would make wrong: acronyms, identifiers and shouted words. "a part" heard as "apart" is fine.
    raw = re.findall(r"[A-Za-z][A-Za-z0-9]*(?:[-_][A-Za-z0-9]+)*", text)
    keys = [w for w in raw if w.lower() in ACRONYMS or (w.isupper() and len(w) > 1) or re.search(r"[a-z][A-Z]|[-_]", w)]
    return set(words(" ".join(keys)))


def voice_lines(jobs_path, generate):
    """generate(spoken_text, job) -> (wav tensor shaped (1, n), sample_rate). Voices every job in jobs.json."""
    import torchaudio as ta
    from transformers import pipeline
    asr = pipeline("automatic-speech-recognition", model="openai/whisper-small.en", device="cpu")
    hear = lambda wav, sr, **kw: asr({"raw": ta.functional.resample(wav, sr, 16000)[0].numpy(), "sampling_rate": 16000}, **kw)
    for job in json.loads(Path(jobs_path).read_text(encoding="utf-8")):
        want, keys, best = words(job["text"]), key_terms(job["text"]), None
        for take in range(3):
            wav, sr = generate(speakable(job["text"]), job)
            got = words(hear(wav, sr)["text"])
            pairs = {a + b: [a, b] for a, b in zip(want, want[1:])}  # Whisper hears "a part" as "apart"
            got = [x for w in got for x in (pairs[w] if w not in want and w in pairs else [w])]
            err = distance(want, got) + len(keys - set(got))
            # A take can trail off into seconds of noise that Whisper ignores; one far longer than the words is a miss.
            long = wav.shape[-1] / sr > 0.6 * len(want) + 1.2
            err += 1 if long else 0
            if best is None or err < best[0]:
                best = (err, wav, sr, " ".join(got))
            if not long and not keys - set(got) and distance(want, got) <= 0.15:
                best = (0, wav, sr, " ".join(got))
                break
        err, wav, sr, heard = best
        # When each part of the line is spoken, as [fraction of the text, seconds] points; frames reveal on these.
        chunks = hear(wav, sr, return_timestamps="word").get("chunks", [])
        ends = [c["timestamp"][1] for c in chunks if c["timestamp"][1] is not None]
        if ends:  # cut anything after the last spoken word, plus a short tail
            wav = wav[..., : min(wav.shape[-1], int((max(ends) + 0.3) * sr))]
        ta.save(job["out"], wav, sr)
        total, acc, points = sum(len(c["text"].strip()) + 1 for c in chunks) or 1, 0, [[0, 0]]
        for c in chunks:
            s, e = c["timestamp"]
            n = len(c["text"].strip()) + 1
            if s is not None:
                points.append([acc / total, s])
            acc += n
            if e is not None:
                points.append([acc / total, e])
        Path(job["out"] + ".words.json").write_text(json.dumps(points), encoding="utf-8")
        note = "" if err == 0 else f'  (closest of {take + 1} takes heard: "{heard}")'
        print(f'{job["out"]}: {wav.shape[-1] / sr:.2f}s{note}', flush=True)
