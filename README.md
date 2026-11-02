# change-reel

A Claude Code plugin that writes pull request descriptions a reviewer can read in five minutes.

- **Diagram, when the change earns one.** A gate decides. If it passes, you get an animated Mermaid diagram with colour that encodes added, changed and removed parts, and motion that traces one request's journey.
- **Short, plain prose.** About 80% ASD-STE100: one idea per sentence, active voice, no filler.
- **Review-request DMs.** A Slack-ready ask of 60 words or fewer.
- **Change reels.** A narrated 20-60 s video (1920x1080, 30 fps) that explains the change as motion design, built on [HyperFrames](https://github.com/heygen-com/hyperframes) with local TTS and procedural music. Nothing leaves your machine.
- **UI recordings.** With your consent, Claude records the changed flow in Chrome and attaches it as MP4.

## Install

```
/plugin marketplace add jbillitt/change-reel
/plugin install change-reel@change-reel
```

The skill (`writing-pr-descriptions`) triggers when you ask Claude to write or update a PR description, make a change reel, or draft a review request.

## Change reel set-up

Diagrams and prose need nothing extra. Reels need Node.js 22.12+, Python 3.10+, FFmpeg, Google Chrome and `gh` 2.99+. From the installed skill folder:

```bash
node reel/setup.mjs --check          # what is missing
node reel/setup.mjs                  # local install: npm packages, a Python venv, Kokoro voices
node reel/setup.mjs --qwen-voices    # recommended: Qwen3-TTS voices (about 6.5 GB)
```

Everything installs under `~/.cache/pr-reel`. Builds refuse remote assets, strip hosted-AI API keys from their environment, and never call hosted voice, music or video services.

## Licence

MIT. Set-up fetches HyperFrames (Apache-2.0) at run time; it is not bundled.
