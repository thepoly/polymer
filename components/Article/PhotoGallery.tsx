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

  return (
    <div className="my-10 relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen md:left-auto md:right-auto md:ml-0 md:mr-0 md:w-full md:max-w-[680px]">
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {populated.map(({ image, caption }, i) => (
          <div key={i} className="relative aspect-square overflow-hidden">
            <Image
              src={image.url!}
              alt={image.alt || caption || ''}
              fill
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
