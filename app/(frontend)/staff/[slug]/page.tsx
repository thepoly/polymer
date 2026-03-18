import React, { cache } from 'react';
import type { Metadata } from 'next';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { notFound } from 'next/navigation';
import { StaffProfile } from '@/components/StaffProfile';
import { getArticleUrl } from '@/utils/getArticleUrl';
import type { Media } from '@/payload-types';

export const revalidate = 60;

type StaffArgs = { params: Promise<{ slug: string }> };

const getUser = cache(async function getUser(slug: string) {
  const payload = await getPayload({ config });
  const isNumeric = /^\d+$/.test(slug);
  const result = await payload.find({
    collection: 'users',
    where: {
      or: [
        { slug: { equals: slug } },
        ...(isNumeric ? [{ id: { equals: parseInt(slug, 10) } }] : []),
      ],
    },
    depth: 2,
    limit: 1,
  });
  return result.docs[0];
});

export async function generateMetadata({ params }: StaffArgs): Promise<Metadata> {
  const { slug } = await params;
  const user = await getUser(slug);
  if (!user) return {};

  const name = `${user.firstName} ${user.lastName}`;
  const headshot = user.headshot as Media | null;

  return {
    title: name,
    description: `${name} — staff member at The Polytechnic, RPI's student newspaper.`,
    alternates: { canonical: `/staff/${user.slug || user.id}` },
    openGraph: {
      title: `${name} — The Polytechnic`,
      type: 'profile',
      url: `/staff/${user.slug || user.id}`,
      ...(headshot?.url && {
        images: [{ url: headshot.url, alt: name }],
      }),
    },
  };
}

export default async function StaffProfilePage({ params }: StaffArgs) {
  const { slug } = await params;
  const user = await getUser(slug);

  if (!user) {
    notFound();
  }

  const payload = await getPayload({ config });

  // Fetch articles written by this user
  const articles = await payload.find({
    collection: 'articles',
    where: {
      authors: {
        contains: user.id,
      },
    },
    sort: '-publishedDate',
    limit: 20,
  });

  // Fetch photos taken by this user
  const photos = await payload.find({
    collection: 'media',
    where: {
      photographer: {
        equals: user.id,
      },
    },
    limit: 20,
  });

  // For each photo, find the most recent article that uses it
  const photoToArticleMap: Record<number, string> = {};
  if (photos.docs.length > 0) {
    const photoIds = photos.docs.map(p => p.id);
    const relatedArticles = await payload.find({
      collection: 'articles',
      where: {
        featuredImage: {
          in: photoIds,
        },
      },
      sort: '-publishedDate',
      limit: 100, // Should be enough to cover recent usage
    });

    // Populate map with the most recent article for each photo
    relatedArticles.docs.forEach(article => {
      const imageId = typeof article.featuredImage === 'object' ? article.featuredImage?.id : article.featuredImage;
      if (imageId && !photoToArticleMap[imageId]) {
        photoToArticleMap[imageId] = getArticleUrl(article as any);
      }
    });
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-12">
      <StaffProfile 
        user={user as any} 
        articles={articles.docs as any} 
        photos={photos.docs as any}
        photoToArticleMap={photoToArticleMap}
      />
    </div>
  );
}
