#!/usr/bin/env bash
# Assemble the Rejoin 3:00 pitch with ffmpeg-skill scripts only (no raw ffmpeg).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$ROOT/.." && pwd)"
S="${FFMPEG_SKILL:-/tmp/ffmpeg-skill/scripts}"
if [[ ! -f "$S/probe.py" ]]; then
  git clone --depth 1 https://github.com/kajisho5/ffmpeg-skill.git /tmp/ffmpeg-skill
  S=/tmp/ffmpeg-skill/scripts
fi

WORK="$ROOT/work"
OUT="$ROOT/out"
ASSETS="$ROOT/assets"
mkdir -p "$WORK" "$OUT" "$ASSETS"

python3 "$ROOT/make_slides.py"

PY=(python3)
common=(--overwrite --fast --progress)

insert() {
  local img="$1" dur="$2" dest="$3"
  "${PY[@]}" "$S/insert.py" "$img" --duration "$dur" --width 1920 --height 1080 --fps 30 \
    --zoom in --zoom-amount 1.08 --pan right "${common[@]}" -o "$dest"
}

echo "== title cards =="
insert "$ROOT/slides/01_hook.png" 16 "$WORK/01_hook.mp4"
insert "$ROOT/slides/02_problem.png" 28 "$WORK/02_problem.mp4"
insert "$ROOT/slides/03_product.png" 20 "$WORK/03_product.mp4"
insert "$ROOT/slides/04_flow.png" 16 "$WORK/04_flow.mp4"
insert "$ROOT/slides/05_demo.png" 6 "$WORK/05_bumper.mp4"
insert "$ROOT/slides/06_how.png" 22 "$WORK/07_how.mp4"
insert "$ROOT/slides/07_safety.png" 16 "$WORK/08_safety.mp4"
insert "$ROOT/slides/08_close.png" 14 "$WORK/09_close.mp4"

DEMO="$ASSETS/demo.mp4"
if [[ -f "$DEMO" ]]; then
  echo "== demo clip =="
  "${PY[@]}" "$S/probe.py" "$DEMO" --json > "$WORK/demo_probe.json"
  # Cursor capture of this app: ~11s of desktop before #sim, ~2s of logo after.
  DEMO_START="${DEMO_START:-11}"
  DEMO_END="${DEMO_END:-32.5}"
  "${PY[@]}" "$S/cut.py" "$DEMO" --start "$DEMO_START" --end "$DEMO_END" --accurate \
    "${common[@]}" -o "$WORK/demo_cut.mp4"
  "${PY[@]}" "$S/fit.py" "$WORK/demo_cut.mp4" --width 1920 --height 1080 --fps 30 --fit pad \
    --pad-color 0C1118 "${common[@]}" -o "$WORK/demo_fit.mp4"
  "${PY[@]}" "$S/freeze.py" "$WORK/demo_fit.mp4" --hold 24 --mode extend \
    "${common[@]}" -o "$WORK/06_demo.mp4"
else
  echo "== demo placeholder =="
  insert "$ROOT/slides/05_demo.png" 45 "$WORK/06_demo.mp4"
fi

echo "== join =="
"${PY[@]}" "$S/join.py" \
  "$WORK/01_hook.mp4" \
  "$WORK/02_problem.mp4" \
  "$WORK/03_product.mp4" \
  "$WORK/04_flow.mp4" \
  "$WORK/05_bumper.mp4" \
  "$WORK/06_demo.mp4" \
  "$WORK/07_how.mp4" \
  "$WORK/08_safety.mp4" \
  "$WORK/09_close.mp4" \
  --transition fadeblack --duration 0.5 --width 1920 --height 1080 --fps 30 \
  "${common[@]}" -o "$WORK/joined.mp4"

echo "== captions =="
"${PY[@]}" "$S/caption.py" "$WORK/joined.mp4" --text "$ROOT/cues.txt" --brand "$ROOT/brand.json" \
  --size 40 --position bottom --animate pop "${common[@]}" -o "$WORK/captioned.mp4"

echo "== graphics =="
"${PY[@]}" "$S/graphics.py" "$WORK/captioned.mp4" --template progress --brand "$ROOT/brand.json" \
  "${common[@]}" -o "$WORK/gfx.mp4"

CUT="$WORK/gfx.mp4"

if [[ -f "$ASSETS/voiceover.wav" || -f "$ASSETS/voiceover.m4a" || -f "$ASSETS/voiceover.mp3" ]]; then
  VO=$(ls "$ASSETS"/voiceover.{wav,m4a,mp3} 2>/dev/null | head -1)
  echo "== voiceover $VO =="
  "${PY[@]}" "$S/audio.py" "$CUT" --replace "$VO" "${common[@]}" -o "$WORK/vo.mp4"
  CUT="$WORK/vo.mp4"
fi

if [[ -f "$ASSETS/music.mp3" || -f "$ASSETS/music.wav" || -f "$ASSETS/music.m4a" ]]; then
  BED=$(ls "$ASSETS"/music.{mp3,wav,m4a} 2>/dev/null | head -1)
  echo "== music $BED =="
  "${PY[@]}" "$S/audio.py" "$CUT" --music "$BED" --duck --music-volume -18 --music-fade-out 3 \
    "${common[@]}" -o "$WORK/music.mp4"
  CUT="$WORK/music.mp4"
  echo "== loudness =="
  "${PY[@]}" "$S/loudness.py" "$CUT" -I -14 --tp -1 "${common[@]}" -o "$WORK/loud.mp4"
  CUT="$WORK/loud.mp4"
fi

echo "== chapters + export =="
"${PY[@]}" "$S/metadata.py" "$CUT" --chapters "$ROOT/chapters.txt" \
  --title "REJOIN — 3 minute pitch" --artist "Rejoin" \
  "${common[@]}" -o "$WORK/meta.mp4"

PRESET="${EXPORT_PRESET:-youtube}"
"${PY[@]}" "$S/export.py" "$WORK/meta.mp4" --preset "$PRESET" "${common[@]}" -o "$OUT/rejoin_pitch.mp4"

echo "== verify =="
"${PY[@]}" "$S/probe.py" "$OUT/rejoin_pitch.mp4" --json | tee "$OUT/probe.json"
"${PY[@]}" "$S/check.py" "$OUT/rejoin_pitch.mp4" --platform youtube --json | tee "$OUT/check.json" || true
"${PY[@]}" "$S/look.py" "$OUT/rejoin_pitch.mp4" -o "$OUT/rejoin_pitch_sheet.png" --overwrite
"${PY[@]}" "$S/report.py" --before "$WORK/01_hook.mp4" --after "$OUT/rejoin_pitch.mp4" \
  --platform youtube -o "$OUT/report.html" || true

echo "Done: $OUT/rejoin_pitch.mp4"
