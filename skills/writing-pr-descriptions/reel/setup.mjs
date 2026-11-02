// One-time, idempotent set-up for change reels. Everything runs locally; nothing is published.
// Usage: node setup.mjs [--check] [--qwen-voices] [--natural-voices]
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const check = process.argv.includes('--check');
const natural = process.argv.includes('--natural-voices'), qwen = process.argv.includes('--qwen-voices');
const win = platform() === 'win32';
export const CACHE = join(homedir(), '.cache', 'pr-reel');
export const VENV_PY = join(CACHE, 'venv', win ? 'Scripts/python.exe' : 'bin/python');
// Optional natural voices: Chatterbox-Turbo (MIT) in its own venv, because it pins an older torch.
export const CB_PY = join(CACHE, 'venv-cb', win ? 'Scripts/python.exe' : 'bin/python');
export const hasNaturalVoices = () => existsSync(CB_PY) && existsSync(join(CACHE, 'venv-cb', '.ready'));
// The default voices when installed: Qwen3-TTS 0.6B (Apache-2.0) on CPU, in its own venv.
export const QWEN_PY = join(CACHE, 'venv-qwen', win ? 'Scripts/python.exe' : 'bin/python');
export const hasQwenVoices = () => existsSync(QWEN_PY) && existsSync(join(CACHE, 'venv-qwen', '.ready'));
// HyperFrames' own skills and registry, read-only, at the tag of the installed CLI: blueprints, motion and
// transition references, and the code-* blocks. Builds copy blocks from here; nothing is fetched at build time.
export const HF_SRC = join(CACHE, 'hyperframes-src');
export const hfTag = () => 'v' + JSON.parse(readFileSync(join(here, 'node_modules', 'hyperframes', 'package.json'), 'utf8')).version;
export const hasHfSource = () => existsSync(join(HF_SRC, '.ready')) && readFileSync(join(HF_SRC, '.ready'), 'utf8').trim() === hfTag();
export const LOCKDOWN = {
  HYPERFRAMES_NO_TELEMETRY: '1', DO_NOT_TRACK: '1', HYPERFRAMES_NO_UPDATE_CHECK: '1',
  HYPERFRAMES_NO_AUTO_INSTALL: '1', HYPERFRAMES_SKIP_SKILLS: '1',
};

export function findChrome() {
  const c = [process.env.REEL_CHROME,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
  return c.find((p) => existsSync(p)) || null;
}

const out = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  return r.status === 0 ? (r.stdout || '') + (r.stderr || '') : null;
};

function main() {
  const actions = [];
  const ok = [];

  // gh must be new enough to upload video with --attach (added in 2.99.0). Probe the flag, not the version.
  const ghHelp = out('gh', ['pr', 'edit', '--help']);
  if (!ghHelp) actions.push('Install the GitHub CLI: https://cli.github.com');
  else if (!/--attach/.test(ghHelp)) {
    actions.push(win ? 'Upgrade gh: winget upgrade --id GitHub.cli'
      : platform() === 'darwin' ? 'Upgrade gh: brew upgrade gh' : 'Upgrade gh to 2.99.0 or later: https://cli.github.com');
  } else ok.push('gh supports --attach');

  // puppeteer-core in the lockfile needs 22.12.
  const [maj, min] = process.versions.node.split('.').map(Number);
  if (maj < 22 || (maj === 22 && min < 12)) actions.push('Install Node.js 22.12 or later');
  else ok.push('node ' + process.versions.node);
  if (!out('ffmpeg', ['-version'])) actions.push(win ? 'Install FFmpeg: winget install Gyan.FFmpeg' : 'Install FFmpeg');
  else ok.push('ffmpeg');
  if (!findChrome()) actions.push('Install Google Chrome, or set REEL_CHROME to a Chrome or Chromium binary');
  else ok.push('chrome');

  const py = win ? 'py' : 'python3';
  const pyPre = win ? ['-3'] : [];
  if (out(py, [...pyPre, '-c', 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)']) === null) {
    actions.push('Install Python 3.10 or later');
  } else ok.push('python 3.10+');

  if (actions.length) return report('needs_action', ok, actions);
  if (check) {
    // Prove set-up finished: packages import and both voice model files exist.
    const tts = join(homedir(), '.cache', 'hyperframes', 'tts');
    const ready = existsSync(join(here, 'node_modules', 'hyperframes', 'bin', 'hyperframes.mjs'))
      && existsSync(VENV_PY)
      && out(VENV_PY, ['-c', 'import kokoro_onnx, soundfile, transformers, torch, scipy']) !== null
      && existsSync(join(tts, 'models', 'kokoro-v1.0.onnx')) && existsSync(join(tts, 'voices', 'voices-v1.0.bin'));
    if (!ready) actions.push('Run: node setup.mjs');
    else ok.push('packages and voice model');
    if (ready && !hasHfSource()) actions.push('Run: node setup.mjs (fetches the HyperFrames references and blocks)');
    else if (ready) ok.push('HyperFrames references ' + hfTag());
    ok.push(hasQwenVoices() ? 'voices: Qwen3-TTS' : 'Qwen3-TTS voices not installed (recommended: node setup.mjs --qwen-voices)');
    ok.push(hasNaturalVoices() ? 'voices: Chatterbox (fallback)' : 'Chatterbox voices not installed (optional: node setup.mjs --natural-voices)');
    return report(actions.length ? 'needs_action' : 'ok', ok, actions);
  }

  const env = { ...process.env, ...LOCKDOWN, PUPPETEER_SKIP_DOWNLOAD: '1', HYPERFRAMES_PYTHON: VENV_PY };
  const run = (cmd, args, cwd = here) => execFileSync(cmd, args, { cwd, env, stdio: 'inherit' });
  // npm is a .cmd shim on Windows, so it alone needs a shell; its arguments are fixed.
  if (!existsSync(join(here, 'node_modules', 'hyperframes'))) {
    execFileSync('npm', ['ci', '--no-audit', '--no-fund'], { cwd: here, env, stdio: 'inherit', shell: win });
  }
  ok.push('npm packages');

  mkdirSync(CACHE, { recursive: true });
  if (!existsSync(VENV_PY)) run(py, [...pyPre, '-m', 'venv', join(CACHE, 'venv')]);
  run(VENV_PY, ['-m', 'pip', 'install', '-q', 'torch==2.14.1', '--index-url', 'https://download.pytorch.org/whl/cpu']);
  run(VENV_PY, ['-m', 'pip', 'install', '-q', '-r', join(here, 'requirements.txt')]);
  ok.push('python packages');

  // First tts call downloads the Kokoro voice model into ~/.cache/hyperframes.
  run(process.execPath, [join(here, 'node_modules', 'hyperframes', 'bin', 'hyperframes.mjs'), 'tts', 'ready', '-o', join(CACHE, 'warmup.wav')], CACHE);
  ok.push('voice model');

  // About 75 MB of docs and blocks. Code comes in; nothing about any reel goes out.
  if (!hasHfSource()) {
    rmSync(HF_SRC, { recursive: true, force: true });
    run('git', ['clone', '-q', '--depth', '1', '--branch', hfTag(), '--filter=blob:none', '--sparse',
      'https://github.com/heygen-com/hyperframes.git', HF_SRC], CACHE);
    run('git', ['-C', HF_SRC, 'sparse-checkout', 'set', 'skills', 'registry'], CACHE);
    writeFileSync(join(HF_SRC, '.ready'), hfTag());
  }
  ok.push('HyperFrames references ' + hfTag());

  // About 3.5 GB (venv plus model weights from Hugging Face). Only model weights are downloaded; no reel content leaves the machine.
  if (natural && !hasNaturalVoices()) {
    const cbPre = win ? ['-3.12'] : [];
    const cbPy = win ? 'py' : 'python3.12';
    if (out(cbPy, [...cbPre, '-c', 'import sys']) === null) return report('needs_action', ok, ['Install Python 3.12 for natural voices']);
    if (!existsSync(CB_PY)) run(cbPy, [...cbPre, '-m', 'venv', join(CACHE, 'venv-cb')]);
    run(CB_PY, ['-m', 'pip', 'install', '-q', 'chatterbox-tts==0.1.7', 'setuptools<80']);
    run(CB_PY, ['-c', 'from chatterbox.tts_turbo import ChatterboxTurboTTS as T; T.from_pretrained(device="cpu")'], CACHE);
    // Whisper checks each spoken line against the script, and re-takes lines it mishears.
    run(CB_PY, ['-c', 'from transformers import pipeline; pipeline("automatic-speech-recognition", model="openai/whisper-small.en")'], CACHE);
    writeFileSync(join(CACHE, 'venv-cb', '.ready'), 'ok');
  }
  if (natural) ok.push('natural voices (Chatterbox)');

  // About 6.5 GB (venv plus 2.4 GB of weights and Whisper). Only weights are downloaded; no reel content leaves the
  // machine. truststore makes Python trust the Windows certificate store, which corporate TLS inspection needs.
  if (qwen && !hasQwenVoices()) {
    const qPre = win ? ['-3.12'] : [];
    const qPy = win ? 'py' : 'python3.12';
    if (out(qPy, [...qPre, '-c', 'import sys']) === null) return report('needs_action', ok, ['Install Python 3.12 for Qwen3-TTS voices']);
    if (!existsSync(QWEN_PY)) run(qPy, [...qPre, '-m', 'venv', join(CACHE, 'venv-qwen')]);
    run(QWEN_PY, ['-m', 'pip', 'install', '-q', 'torch==2.8.0', 'torchaudio==2.8.0', '--index-url', 'https://download.pytorch.org/whl/cpu']);
    run(QWEN_PY, ['-m', 'pip', 'install', '-q', 'qwen-tts==0.1.1', 'soundfile', 'truststore']);
    const fetch = 'import truststore; truststore.inject_into_ssl(); import torch; from qwen_tts import Qwen3TTSModel; '
      + 'Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-0.6B-Base", device_map="cpu", dtype=torch.float32); '
      + 'from transformers import pipeline; pipeline("automatic-speech-recognition", model="openai/whisper-small.en")';
    run(QWEN_PY, ['-c', fetch], CACHE);
    writeFileSync(join(CACHE, 'venv-qwen', '.ready'), 'ok');
  }
  if (qwen) ok.push('voices: Qwen3-TTS');
  report('ok', ok, []);
}

function report(status, ok, actions) {
  console.log(JSON.stringify({ status, ok, actions }, null, 2));
  process.exitCode = status === 'ok' ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
