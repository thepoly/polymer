#!/usr/bin/env bash
# Regenerate the source PNG art for Capacitor's asset generator from the
# checked-in SVGs under mobile/resources/.
#
# Requires: rsvg-convert (librsvg2), magick (ImageMagick 7).
#
# After running this, run `pnpm --filter mobile assets` (or
# `npx @capacitor/assets generate --android`) from mobile/ to produce the
# mipmap-*/ and drawable-*/ outputs under android/app/src/main/res.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RES="$(cd "$HERE/../resources" && pwd)"

if ! command -v rsvg-convert >/dev/null 2>&1; then
  echo "rsvg-convert not found (install librsvg / librsvg2-bin)" >&2
  exit 1
fi

if ! command -v magick >/dev/null 2>&1 && ! command -v convert >/dev/null 2>&1; then
  echo "ImageMagick (magick or convert) not found" >&2
  exit 1
fi

IM_BIN="magick"
if ! command -v magick >/dev/null 2>&1; then
  IM_BIN="convert"
fi

echo "Rendering icon PNGs into $RES"
rsvg-convert -w 1024 -h 1024 "$RES/icon-foreground.svg"  -o "$RES/icon-foreground.png"
rsvg-convert -w 1024 -h 1024 "$RES/icon-monochrome.svg" -o "$RES/icon-monochrome.png"

# Flat 1024×1024 icon (red p on white).
rsvg-convert -w 1024 -h 1024 "$HERE/../../public/static-app-icon.svg" -o "$RES/icon.png"

# Solid-white background for adaptive icon.
"$IM_BIN" -size 1024x1024 canvas:white "$RES/icon-background.png"

echo "Rendering splash PNGs"
rsvg-convert -w 2732 -h 2732 "$RES/splash.svg"      -o "$RES/splash.png"
rsvg-convert -w 2732 -h 2732 "$RES/splash-dark.svg" -o "$RES/splash-dark.png"

echo "Done. Next: (cd mobile && npx @capacitor/assets generate --android)"
