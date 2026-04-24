import { getCurrentEdition } from '@/lib/getCurrentEdition'
import FooterClient from './FooterClient'

export default async function Footer() {
  const edition = await getCurrentEdition()
  return <FooterClient volume={edition.volume} edition={edition.issue} />
}
