import Image from 'next/image'
import { Media } from '@/payload-types'
import { CreditedImage, PhotoCaption, PopulatedCreditedImage } from './PhotoCaption'

type Props = {
  images: CreditedImage[]
}

export function Carousel({ images }: Props) {
  const populated = images.filter((img): img is PopulatedCreditedImage =>
    typeof img.image === 'object' && img.image !== null && !!(img.image as Media).url
  )
  if (!populated.length) return null

  return (
    <div className="my-10 relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex items-start">
          {populated.map((entry, i) => {
            const { image } = entry
            const aspectRatio =
              image.width && image.height ? image.width / image.height : 3 / 2
            return (
              <figure
                key={i}
                className="m-0 flex-shrink-0 flex flex-col"
                style={{ width: `${aspectRatio * 100}%`, maxWidth: '80vw', minWidth: '40vw' }}
              >
                <div className="relative h-[360px] md:h-[480px] overflow-hidden">
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
                <PhotoCaption entry={entry} className="px-4 pt-1.5" />
              </figure>
            )
          })}
        </div>
      </div>
    </div>
  )
}
