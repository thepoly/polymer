import Image from 'next/image'
import { Media } from '@/payload-types'
import { getCaptionPlacement, type CaptionPlacement } from '@/lib/imageLuminance'
import {
  captionPlainText,
  CreditedImage,
  PhotoCaption,
  PopulatedCreditedImage,
} from './PhotoCaption'

type Props = {
  images: CreditedImage[]
  /** Runs under the whole gallery and replaces the per-photo captions. */
  caption?: string | null
}

type PlacedImage = PopulatedCreditedImage & { placement: CaptionPlacement }

function distributeToColumns(images: PlacedImage[], colCount: number): PlacedImage[][] {
  const columns: PlacedImage[][] = Array.from({ length: colCount }, () => [])
  const heights = new Array(colCount).fill(0)

  for (const img of images) {
    const aspect = (img.image.height || 800) / (img.image.width || 1200)
    const shortest = heights.indexOf(Math.min(...heights))
    columns[shortest].push(img)
    heights[shortest] += aspect
  }

  return columns
}

export async function PhotoGallery({ images, caption }: Props) {
  const populated = images.filter((img): img is PopulatedCreditedImage =>
    typeof img.image === 'object' && img.image !== null && !!(img.image as Media).url
  )
  if (!populated.length) return null

  const colCount = Math.min(populated.length, 3)
  const mdGridCols = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3' }[colCount]

  const galleryCaption = caption?.trim()
  // Dropped before sampling so the area measured below matches what is drawn.
  const entries = galleryCaption
    ? populated.map((entry) => ({ ...entry, caption: null }))
    : populated

  // The caption and credit sit on the photo, so both the corner they occupy and
  // their colour come from the pixels they will actually cover.
  const placed: PlacedImage[] = await Promise.all(
    entries.map(async (entry) => ({
      ...entry,
      placement: await getCaptionPlacement(entry.image, captionPlainText(entry), colCount),
    })),
  )
  const columns = distributeToColumns(placed, colCount)

  return (
    <div className="my-10 relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
      <div className={`grid grid-cols-1 ${mdGridCols}`}>
        {columns.map((col, colIdx) => (
          <div key={colIdx} className="flex flex-col">
            {col.map((entry, i) => (
              <figure key={i} className="m-0 relative">
                <Image
                  src={entry.image.url!}
                  alt={entry.image.title || ""}
                  width={entry.image.width || 1200}
                  height={entry.image.height || 800}
                  sizes={`(max-width: 768px) 100vw, ${Math.round(100 / colCount)}vw`}
                  loading="lazy"
                  className="w-full h-auto"
                />
                <PhotoCaption
                  entry={entry}
                  tone={entry.placement.tone}
                  corner={entry.placement.corner}
                  className="absolute inset-x-0 bottom-0 px-4 pt-2 pb-3"
                />
              </figure>
            ))}
          </div>
        ))}
      </div>
      {galleryCaption && (
        <p className="m-0 px-4 pt-1.5 font-meta text-[12px] italic text-text-muted transition-colors">
          {galleryCaption}
        </p>
      )}
    </div>
  )
}
