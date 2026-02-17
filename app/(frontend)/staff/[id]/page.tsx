import React from 'react';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { notFound } from 'next/navigation';
import { StaffProfile } from '@/components/StaffProfile';
import { getArticleUrl } from '@/utils/getArticleUrl';

export const revalidate = 60;

export default async function StaffProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = await getPayload({ config });
  
  let user;
  try {
    user = await payload.findByID({
      collection: 'users',
      id,
      depth: 2,
    });
  } catch (error) {
    notFound();
  }

  if (!user) {
    notFound();
  }

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
        photoToArticleMap[imageId] = `${getArticleUrl(article as any)}#media-${imageId}`;
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
