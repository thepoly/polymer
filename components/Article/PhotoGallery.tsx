import Image from 'next/image'
import { Media } from '@/payload-types'

type GalleryImage = { image: Media | number; caption?: string | null }

type Props = {
  images: GalleryImage[]
}

export function PhotoGallery({ images }: Props) {
  const populated = images.filter((img): img is { image: Media; caption?: string | null } =>
    typeof img.image === 'object' && img.image !== null && !!img.image.url
  )
  if (!populated.length) return null

  const cols = Math.min(populated.length, 3)
  const mdGridCols = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3' }[cols]

  return (
    <div className="my-10 relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
      <div
        className={`grid grid-cols-1 ${mdGridCols}`}
      >
        {populated.map(({ image, caption }, i) => (
          <div key={i} className="relative overflow-hidden">
            <Image
              src={image.url!}
              alt={image.alt || caption || ''}
              width={image.width || 1200}
              height={image.height || 800}
              className="w-full h-auto"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
