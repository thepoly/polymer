import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { SerializeLexical, LexicalNode } from '@/components/Article/RichTextParser'
import type { Media } from '@/payload-types'

function mockMedia(id: number, w: number, h: number, alt: string): Media {
  return {
    id,
    alt,
    url: `https://picsum.photos/seed/${id}/${w}/${h}`,
    width: w,
    height: h,
    updatedAt: '',
    createdAt: '',
  } as unknown as Media
}

const galleryImages = [
  { image: mockMedia(10, 800, 800, 'We the People — preamble of the Constitution'), caption: 'We the People' },
  { image: mockMedia(20, 800, 800, 'The Constitutional Convention, Philadelphia 1787'), caption: 'Constitutional Convention' },
  { image: mockMedia(30, 800, 800, 'Original manuscript of the United States Constitution'), caption: 'Original manuscript' },
]

const carouselImages = [
  { image: mockMedia(40, 1200, 800, 'Independence Hall, Philadelphia'), caption: 'Independence Hall' },
  { image: mockMedia(50, 900, 800, 'Article I — The Legislature'), caption: 'Article I' },
  { image: mockMedia(60, 1400, 800, 'Article II — The Executive'), caption: 'Article II' },
  { image: mockMedia(70, 800, 800, 'Article III — The Judiciary'), caption: 'Article III' },
  { image: mockMedia(80, 1100, 800, 'The Bill of Rights'), caption: 'Bill of Rights' },
]

const bodyNodes: LexicalNode[] = [
  {
    type: 'paragraph',
    version: 1,
    children: [
      {
        type: 'text',
        version: 1,
        text: 'We the People of the United States, in Order to form a more perfect Union, establish Justice, insure domestic Tranquility, provide for the common defence, promote the general Welfare, and secure the Blessings of Liberty to ourselves and our Posterity, do ordain and establish this Constitution for the United States of America.',
      },
    ],
  },
  {
    type: 'paragraph',
    version: 1,
    children: [
      {
        type: 'text',
        version: 1,
        text: 'All legislative Powers herein granted shall be vested in a Congress of the United States, which shall consist of a Senate and House of Representatives. The House of Representatives shall be composed of Members chosen every second Year by the People of the several States, and the Electors in each State shall have the Qualifications requisite for Electors of the most numerous Branch of the State Legislature.',
      },
    ],
  },
  {
    type: 'block',
    version: 1,
    fields: {
      blockType: 'photo_gallery',
      images: galleryImages,
    },
  } as unknown as LexicalNode,
  {
    type: 'paragraph',
    version: 1,
    children: [
      {
        type: 'text',
        version: 1,
        text: 'No Person shall be a Representative who shall not have attained to the Age of twenty five Years, and been seven Years a Citizen of the United States, and who shall not, when elected, be an Inhabitant of that State in which he shall be chosen. Representatives and direct Taxes shall be apportioned among the several States which may be included within this Union, according to their respective Numbers.',
      },
    ],
  },
  {
    type: 'paragraph',
    version: 1,
    children: [
      {
        type: 'text',
        version: 1,
        text: 'The Senate of the United States shall be composed of two Senators from each State, chosen by the Legislature thereof, for six Years; and each Senator shall have one Vote. Immediately after they shall be assembled in Consequence of the first Election, they shall be divided as equally as may be into three Classes.',
      },
    ],
  },
  {
    type: 'block',
    version: 1,
    fields: {
      blockType: 'carousel',
      images: carouselImages,
    },
  } as unknown as LexicalNode,
  {
    type: 'paragraph',
    version: 1,
    children: [
      {
        type: 'text',
        version: 1,
        text: 'The executive Power shall be vested in a President of the United States of America. He shall hold his Office during the Term of four Years, and, together with the Vice President, chosen for the same Term, be elected as follows: Each State shall appoint, in such Manner as the Legislature thereof may direct, a Number of Electors, equal to the whole Number of Senators and Representatives to which the State may be entitled in the Congress.',
      },
    ],
  },
  {
    type: 'paragraph',
    version: 1,
    children: [
      {
        type: 'text',
        version: 1,
        text: 'The judicial Power of the United States, shall be vested in one supreme Court, and in such inferior Courts as the Congress may from time to time ordain and establish. The Judges, both of the supreme and inferior Courts, shall hold their Offices during good Behaviour, and shall, at stated Times, receive for their Services, a Compensation, which shall not be diminished during their Continuance in Office.',
      },
    ],
  },
]

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-bg-main transition-colors duration-300">
      <Header mobileTight />
      <article className="container mx-auto px-4 md:px-6 mt-8 md:mt-12">
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex flex-col gap-4 max-w-[680px] w-full mx-auto">
            <span className="font-meta text-accent font-[440] italic text-[15px] md:text-[16px] tracking-[0.06em]">
              Features
            </span>
            <h1 className="font-display font-bold text-[39px] md:text-[34px] lg:text-[42px] text-text-main leading-[1.05] tracking-[-0.02em]">
              The Constitution of the United States
            </h1>
            <h2 className="font-meta text-xl md:text-2xl font-normal text-text-muted leading-snug">
              A framework for a government of the people, by the people, and for the people — with photo gallery and carousel examples.
            </h2>
          </div>
          <div className="max-w-[680px] w-full mx-auto font-meta text-[13px] text-text-muted">
            The Polytechnic Staff · September 17, 1787
          </div>
        </div>

        <div className="max-w-[680px] mx-auto article-body">
          <SerializeLexical nodes={bodyNodes} />
        </div>
      </article>
      <Footer />
    </main>
  )
}
