import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import FooterClient from './FooterClient'

export default async function Footer() {
  const payload = await getPayload({ config: configPromise })
  const layoutResponse = await payload.find({ collection: 'layout', limit: 1, depth: 0 })
  const layout = layoutResponse.docs[0]

  return <FooterClient volume={layout?.volume} edition={layout?.edition} />
}
