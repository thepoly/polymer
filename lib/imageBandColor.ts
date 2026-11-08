import fs from 'node:fs'
import path from 'node:path'
import { cache } from 'react'
import sharp from 'sharp'

/**
 * A solid colour picked from a photo, for a band of text that sits beside it.
 * `light` is a deep shade for light mode (white text on it); `dark` is a pale
 * tint for dark mode (black text on it). Both are CSS colour strings.
 */
export type BandColors = { light: string; dark: string }

const MEDIA_PREFIX = '/api/media/file/'

/** Where uploaded files live: prod's shared media dir, or the repo's ./media locally. */
const mediaDirs = () =>
  [process.env.MEDIA_DIR, '/var/www/polymer-media', path.join(process.cwd(), 'media')].filter(
    (dir): dir is string => Boolean(dir),
  )

/** Map a public media URL (`/api/media/file/NAME`, possibly via next/image) to its file on disk. */
function resolveMediaFile(url: string): string | null {
  let pathname = url
  try {
    const parsed = new URL(url, 'http://local')
    // next/image URLs carry the real path in ?url=
    pathname = parsed.searchParams.get('url') ?? parsed.pathname
  } catch {
    return null
  }
  if (!pathname.startsWith(MEDIA_PREFIX)) return null
  const name = decodeURIComponent(pathname.slice(MEDIA_PREFIX.length))
  for (const dir of mediaDirs()) {
    const resolved = path.resolve(dir, name)
    // Guard against a stored filename escaping the media directory.
    if (!resolved.startsWith(path.resolve(dir) + path.sep)) continue
    if (fs.existsSync(resolved)) return resolved
  }
  return null
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [h * 60, s, l]
}

const HUE_BINS = 12

/**
 * Pick the photo's dominant tint: bucket pixels by hue, weighting each by how
 * colourful it is (chroma), and take the heaviest bucket's average hue and
 * saturation. Near-white and near-black pixels carry no hue and are skipped.
 * A photo with no real colour comes back neutral.
 */
async function computeBandColors(url: string): Promise<BandColors | null> {
  const file = resolveMediaFile(url)
  if (!file) return null
  try {
    const { data } = await sharp(file).resize(32, 32, { fit: 'cover' }).removeAlpha().raw().toBuffer({ resolveWithObject: true })

    const weight = new Array<number>(HUE_BINS).fill(0)
    const sinSum = new Array<number>(HUE_BINS).fill(0)
    const cosSum = new Array<number>(HUE_BINS).fill(0)
    const satSum = new Array<number>(HUE_BINS).fill(0)
    let total = 0
    for (let i = 0; i < data.length; i += 3) {
      const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2])
      if (l < 0.08 || l > 0.94) continue
      const chroma = s * (1 - Math.abs(2 * l - 1))
      if (chroma < 0.04) continue
      const bin = Math.floor(h / (360 / HUE_BINS)) % HUE_BINS
      const rad = (h * Math.PI) / 180
      weight[bin] += chroma
      sinSum[bin] += Math.sin(rad) * chroma
      cosSum[bin] += Math.cos(rad) * chroma
      satSum[bin] += s * chroma
      total += chroma
    }

    // Too little colour to call: use a neutral near-black / near-white.
    const pixels = data.length / 3
    if (total / pixels < 0.02) return { light: 'hsl(0 0% 9%)', dark: 'hsl(0 0% 92%)' }

    const best = weight.indexOf(Math.max(...weight))
    const hue = Math.round(((Math.atan2(sinSum[best], cosSum[best]) * 180) / Math.PI + 360) % 360)
    // Keep it rich but never garish: the band should read as ink, not paint.
    const sat = Math.round(Math.min(0.55, Math.max(0.2, satSum[best] / weight[best])) * 100)
    return { light: `hsl(${hue} ${sat}% 17%)`, dark: `hsl(${hue} ${sat}% 88%)` }
  } catch {
    return null
  }
}

/** Band colours for a photo URL, sampled once per request. Null if the file can't be read. */
export const getBandColors = cache((url: string | null | undefined) =>
  url ? computeBandColors(url) : Promise.resolve(null),
)
