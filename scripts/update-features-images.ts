/**
 * Replace placeholder images on features articles with stock photos from Lorem Picsum.
 *
 * Usage:  node --env-file=.env ./node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/cli.mjs scripts/update-features-images.ts
 */

import { getPayload } from 'payload';
import config from '../payload.config';

async function fetchPhoto(seed: number): Promise<Buffer> {
  // Use a unique seed so each article gets a different photo
  const url = `https://picsum.photos/seed/features${seed}/800/533`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  console.log('Updating features articles with stock images...');

  const payload = await getPayload({ config });

  const { docs: articles } = await payload.find({
    collection: 'articles',
    where: { section: { equals: 'features' } },
    limit: 20,
    sort: '-publishedDate',
  });

  console.log(`Found ${articles.length} features articles.\n`);

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const title = (article.title as string).slice(0, 50);
    console.log(`[${i + 1}/${articles.length}] "${title}..."`);

    try {
      const imgBuffer = await fetchPhoto(i);

      const mediaDoc = await payload.create({
        collection: 'media',
        data: {
          alt: `Stock photo for ${(article.title as string).slice(0, 40)}`,
        },
        file: {
          data: imgBuffer,
          name: `features-stock-${i}.jpg`,
          mimetype: 'image/jpeg',
          size: imgBuffer.length,
        },
      });

      await payload.update({
        collection: 'articles',
        id: article.id,
        data: {
          featuredImage: mediaDoc.id,
        },
      });

      console.log(`  ✓ Updated with stock photo`);
    } catch (err) {
      console.error(`  ✗ Failed:`, err);
    }
  }

  console.log('\nDone!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
