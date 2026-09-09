import fs from 'node:fs'
import path from 'node:path'
import { cache } from 'react'
import sharp from 'sharp'
import type { Media } from '@/payload-types'

const mediaDir = process.env.MEDIA_DIR || '/var/www/polymer-media'

/**
 * Which flat colour a caption laid over a photo should use.
 * `light` = white text (the pixels under it are dark), `dark` = black text.
 */
export type CaptionTone = 'light' | 'dark'

/** Which bottom corner of the photo the caption sits in. */
export type CaptionCorner = 'left' | 'right'

export type CaptionPlacement = {
  corner: CaptionCorner
  tone: CaptionTone
}

/**
 * Geometry of the overlaid caption, mirroring the classes PhotoGallery puts on
 * it (`px-4 pt-2 pb-3`, `text-[12px]`). Kept here so the sampled rectangle and
 * the rendered box stay in step.
 */
const FONT_SIZE = 12
const LINE_HEIGHT = 18
const PAD_X = 16
const PAD_TOP = 8
const PAD_BOTTOM = 12

/** Raleway at 12px averages a little over half an em per character. */
const AVG_CHAR_WIDTH = FONT_SIZE * 0.52

/**
 * The gallery grid is viewport-relative, so a column has no single pixel
 * width. Sampling has to assume one; this is a mid-range desktop, the width
 * most readers see. A narrower viewport wraps to more lines and covers more of
 * the photo, which only ever makes the sampled rectangle a subset of the real
 * one — the text still sits inside what was measured.
 */
const REFERENCE_VIEWPORT = 1280

/**
 * Mean luminance (0–255) above which the sampled pixels count as bright enough
 * for black text. Sits slightly above the midpoint because white text on a
 * mid-tone photo stays readable further down than black text does.
 */
const DARK_TEXT_THRESHOLD = 145

/**
 * How much flatter the right corner has to measure before it beats the left.
 * Left is the default because it matches reading order and keeps a gallery
 * from flip-flopping between corners over trivial differences.
 */
const CORNER_MARGIN = 3

const luminance = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const FALLBACK: CaptionPlacement = { corner: 'left', tone: 'light' }

/**
 * Resolve the on-disk file to sample. Prefers the generated `gallery` size —
 * it is the variant actually displayed and is far cheaper to decode than the
 * original upload.
 */
function resolveFilePath(media: Media): string | null {
  const candidates = [media.sizes?.gallery?.filename, media.filename].filter(
    (name): name is string => typeof name === 'string' && name.length > 0,
  )

  for (const name of candidates) {
    // Guard against a stored filename escaping the media directory.
    const resolved = path.resolve(mediaDir, name)
    if (!resolved.startsWith(path.resolve(mediaDir) + path.sep)) continue
    if (fs.existsSync(resolved)) return resolved
  }

  return null
}

/**
 * The rectangle, in the sampled file's own pixels, that the caption text
 * actually covers in a given bottom corner: as wide as the text runs and as
 * tall as it wraps. Everything outside it is irrelevant to readability.
 */
function captionRect(
  fileWidth: number,
  fileHeight: number,
  text: string,
  colCount: number,
  corner: CaptionCorner,
) {
  const displayWidth = REFERENCE_VIEWPORT / colCount
  // Image pixels per CSS pixel once the photo is scaled into its column.
  const scale = fileWidth / displayWidth

  const contentWidthCss = Math.max(1, displayWidth - PAD_X * 2)
  const charsPerLine = Math.max(1, Math.floor(contentWidthCss / AVG_CHAR_WIDTH))
  const lines = Math.max(1, Math.ceil(text.length / charsPerLine))

  // A single short line stops well before the far edge; anything that wraps
  // fills the column.
  const textWidthCss =
    lines > 1 ? contentWidthCss : Math.min(contentWidthCss, text.length * AVG_CHAR_WIDTH)
  const boxHeightCss = lines * LINE_HEIGHT + PAD_TOP + PAD_BOTTOM

  const padPx = Math.round(PAD_X * scale)
  const width = clamp(Math.round(textWidthCss * scale), 1, Math.max(1, fileWidth - padPx * 2))
  const height = clamp(Math.round(boxHeightCss * scale), 1, fileHeight)

  const left =
    corner === 'left'
      ? clamp(padPx, 0, fileWidth - width)
      : clamp(fileWidth - padPx - width, 0, fileWidth - width)

  return { left, top: fileHeight - height, width, height }
}

type RegionStats = {
  /** Average luminance, 0–255. Decides black vs white text. */
  mean: number
  /** Standard deviation of luminance. Lower means a flatter, calmer area. */
  deviation: number
}

async function sampleRegion(
  filePath: string,
  rect: { left: number; top: number; width: number; height: number },
): Promise<RegionStats> {
  const { data } = await sharp(filePath)
    .extract(rect)
    // 16x16 is enough to characterise a region; anything finer just costs time.
    .resize(16, 16, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const values: number[] = []
  for (let i = 0; i < data.length; i += 3) {
    values.push(luminance(data[i], data[i + 1], data[i + 2]))
  }

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length

  return { mean, deviation: Math.sqrt(variance) }
}

async function computePlacement(
  media: Media,
  text: string,
  colCount: number,
): Promise<CaptionPlacement> {
  const filePath = resolveFilePath(media)
  // Legacy-archive rows are served from another upstream and have no local
  // file, so there is nothing to sample. White text bottom-left is the safer
  // default: it reads against most photographs, where black disappears into
  // shadow.
  if (!filePath) return FALLBACK

  try {
    const { width, height } = await sharp(filePath).metadata()
    if (!width || !height) return FALLBACK

    const [left, right] = await Promise.all(
      (['left', 'right'] as const).map((corner) =>
        sampleRegion(filePath, captionRect(width, height, text, colCount, corner)),
      ),
    )

    // The calmer corner wins: text over an even area stays legible, while the
    // same text over high-contrast detail does not, whatever colour it is.
    const corner: CaptionCorner = right.deviation + CORNER_MARGIN < left.deviation ? 'right' : 'left'
    const chosen = corner === 'right' ? right : left

    return { corner, tone: chosen.mean > DARK_TEXT_THRESHOLD ? 'dark' : 'light' }
  } catch {
    return FALLBACK
  }
}

/**
 * Place and colour a photo's credit from the pixels it will actually sit on:
 * whichever bottom corner is least busy, then black or white to suit that
 * corner's brightness. Memoised per render pass, so a gallery that repeats an
 * image only decodes it once.
 */
export const getCaptionPlacement = cache(
  async (media: Media, text: string, colCount: number): Promise<CaptionPlacement> =>
    computePlacement(media, text, colCount),
)
