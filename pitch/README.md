# Rejoin 3-minute pitch

Edit assembled with [ffmpeg-skill](https://github.com/kajisho5/ffmpeg-skill) (`insert` → `join` → `caption` → `graphics` → `export` → `check` → `look`).

Default delivery: **YouTube 16:9 1080p, ~180 s, burned captions, no voiceover**.

```bash
bash pitch/build.sh
```

Outputs land in `pitch/out/rejoin_pitch.mp4`. Intermediates stay in `pitch/work/` (gitignored).

Re-render after dropping new files:

```bash
# optional product capture
cp /path/to/sim-demo.mp4 pitch/assets/demo.mp4

# optional narration (WAV/M4A/MP3), timed to pitch/script.md
cp /path/to/vo.wav pitch/assets/voiceover.wav

# optional licensed bed
cp /path/to/bed.mp3 pitch/assets/music.mp3

bash pitch/build.sh
```

## What this cut already has

- Storyboard and spoken script (`script.md`)
- Brand colours from the Rejoin UI (`brand.json`)
- Title cards for hook, problem, product, flow, safety, close
- Burned captions (`cues.txt`) so the pitch reads without audio
- A `project.json` for ffmpeg-skill `render.py` once clips exist
- A slot for a live iMessage-sim capture (`assets/demo.mp4`)

## What I still need from you

Send any of these and the next render will swap them in. Nothing below is required for a watchable first cut.

1. **Voiceover** — read `script.md` in one take (or per beat). WAV/M4A, ~3:00. I will replace the silent track and duck music under it.
2. **Product demo capture** — 40–50 s of the real flow: `#sim` → **sample** → **I'm still at the ruins** → **skip** → **call**. Screen recording, 16:9 if you can.
3. **Talking-head / B-roll** — you on camera, Cozumel/port, ship, ruins. Any 16:9 clips; I will cut them to the beats in `storyboard.md`.
4. **Logo** — PNG with transparency. Until then the wordmark is typeset.
5. **Music** — a licensed bed you own. I will not invent copyrighted tracks.
6. **Destination** — assumed YouTube 16:9. Say if you need Reels/TikTok 9:16 (that version must be a 60–90 s cut, not a full 3:00).
7. **Names / ask** — founder names, course, dollar/time ask for the close card.

If you send nothing, keep using this captioned storyboard cut and swap files in later.
