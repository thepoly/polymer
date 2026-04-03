import Image from 'next/image'
import { Media } from '@/payload-types'

type CarouselImage = { image: Media | number; caption?: string | null }

type Props = {
  images: CarouselImage[]
}

export function Carousel({ images }: Props) {
  const populated = images.filter((img): img is { image: Media; caption?: string | null } =>
    typeof img.image === 'object' && img.image !== null && !!img.image.url
  )
  if (!populated.length) return null

  return (
    <div className="my-10 relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-x-auto scrollbar-hide">
      <div className="flex h-[360px] md:h-[480px]">
        {populated.map(({ image, caption }, i) => {
          const aspectRatio =
            image.width && image.height ? image.width / image.height : 3 / 2
          return (
            <div
              key={i}
              className="relative flex-shrink-0 h-full overflow-hidden"
              style={{ width: `${aspectRatio * 100}%`, maxWidth: '80vw', minWidth: '40vw' }}
            >
              <Image
                src={(image.sizes?.gallery?.url) || image.url!}
                alt={image.title || ""}
                fill
                sizes="(max-width: 768px) 80vw, 40vw"
                quality={70}
                loading="lazy"
                className="object-cover"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
