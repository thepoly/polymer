import Image from 'next/image'
import { Media } from '@/payload-types'

type GalleryImage = { image: Media | number; caption?: string | null }

type Props = {
  images: GalleryImage[]
}

type PopulatedImage = { image: Media; caption?: string | null }

function distributeToColumns(images: PopulatedImage[], colCount: number): PopulatedImage[][] {
  const columns: PopulatedImage[][] = Array.from({ length: colCount }, () => [])
  const heights = new Array(colCount).fill(0)

  for (const img of images) {
    const aspect = (img.image.height || 800) / (img.image.width || 1200)
    const shortest = heights.indexOf(Math.min(...heights))
    columns[shortest].push(img)
    heights[shortest] += aspect
  }

  return columns
}

export function PhotoGallery({ images }: Props) {
  const populated = images.filter((img): img is PopulatedImage =>
    typeof img.image === 'object' && img.image !== null && !!img.image.url
  )
  if (!populated.length) return null

  const colCount = Math.min(populated.length, 3)
  const mdGridCols = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3' }[colCount]
  const columns = distributeToColumns(populated, colCount)

  return (
    <div className="my-10 relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
      <div className={`grid grid-cols-1 ${mdGridCols}`}>
        {columns.map((col, colIdx) => (
          <div key={colIdx} className="flex flex-col">
            {col.map(({ image }, i) => (
              <Image
                key={i}
                src={(image.sizes?.gallery?.url) || image.url!}
                alt={image.title || ""}
                width={(image.sizes?.gallery?.width) || image.width || 1200}
                height={(image.sizes?.gallery?.height) || image.height || 800}
                sizes={`(max-width: 768px) 100vw, ${Math.round(100 / colCount)}vw`}
                quality={70}
                loading="lazy"
                className="w-full h-auto"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
