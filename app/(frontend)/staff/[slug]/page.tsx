import React, { cache } from 'react';
import type { Metadata } from 'next';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { notFound } from 'next/navigation';
import {
  StaffProfile,
  StaffProfileArticle,
  StaffProfilePhoto,
  StaffProfileUser,
} from '@/components/StaffProfile';
import { LexicalNode } from '@/components/Article/RichTextParser';
import { getArticleUrl } from '@/utils/getArticleUrl';
import type { Article, Media, User } from '@/payload-types';

export const revalidate = 60;

type StaffArgs = { params: Promise<{ slug: string }> };

const getUser = cache(async function getUser(slug: string): Promise<User | undefined> {
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
    depth: 1,
    limit: 1,
    select: {
      firstName: true,
      lastName: true,
      slug: true,
      headshot: true,
      bio: true,
      positions: true,
    },
  });
  return result.docs[0] as User | undefined;
});

type PublicStaffUserSource = Pick<
  User,
  'id' | 'firstName' | 'lastName' | 'slug' | 'headshot' | 'bio' | 'positions'
>;

type PublicStaffArticleSource = Pick<Article, 'id' | 'title' | 'slug' | 'section' | 'publishedDate'>;

type PublicStaffPhotoSource = Pick<Media, 'id' | 'url' | 'alt' | 'width' | 'height'>;

const toPublicStaffUser = (user: PublicStaffUserSource): StaffProfileUser => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  slug: user.slug,
  headshot: typeof user.headshot === 'object' && user.headshot ? { url: user.headshot.url } : null,
  bio: user.bio
    ? {
        root: {
          children: user.bio.root?.children as LexicalNode[] | undefined,
        },
      }
    : null,
  positions: user.positions?.map((position) => ({
    startDate: position.startDate,
    endDate: position.endDate,
    jobTitle: typeof position.jobTitle === 'object' && position.jobTitle
      ? { title: position.jobTitle.title }
      : null,
  })) || null,
});

const toPublicStaffArticle = (article: PublicStaffArticleSource): StaffProfileArticle => ({
  id: article.id,
  title: article.title,
  slug: article.slug,
  section: article.section,
  publishedDate: article.publishedDate,
});

const toPublicStaffPhoto = (photo: PublicStaffPhotoSource): StaffProfilePhoto => ({
  id: photo.id,
  url: photo.url,
  alt: photo.alt,
  width: photo.width,
  height: photo.height,
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
      _status: {
        equals: 'published',
      },
      authors: {
        contains: user.id,
      },
    },
    sort: '-publishedDate',
    limit: 20,
    depth: 0,
    select: {
      title: true,
      slug: true,
      section: true,
      publishedDate: true,
    },
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
    depth: 0,
    select: {
      url: true,
      alt: true,
      width: true,
      height: true,
    },
  });

  // For each photo, find the most recent article that uses it
  const photoToArticleMap: Record<number, string> = {};
  if (photos.docs.length > 0) {
    const photoIds = photos.docs.map(p => p.id);
    const relatedArticles = await payload.find({
      collection: 'articles',
      where: {
        _status: {
          equals: 'published',
        },
        featuredImage: {
          in: photoIds,
        },
      },
      sort: '-publishedDate',
      limit: 100, // Should be enough to cover recent usage
      depth: 0,
      select: {
        slug: true,
        section: true,
        publishedDate: true,
        createdAt: true,
        featuredImage: true,
      },
    });

    // Populate map with the most recent article for each photo
    relatedArticles.docs.forEach(article => {
      const imageId = typeof article.featuredImage === 'object' ? article.featuredImage?.id : article.featuredImage;
      if (imageId && !photoToArticleMap[imageId]) {
        photoToArticleMap[imageId] = getArticleUrl(article as Article);
      }
    });
  }

  const publicUser = toPublicStaffUser(user);
  const publicArticles = articles.docs.map((article) => toPublicStaffArticle(article));
  const publicPhotos = photos.docs.map((photo) => toPublicStaffPhoto(photo));

  return (
    <div className="max-w-[1200px] mx-auto px-4 pt-3 md:pt-4 pb-12">
      <StaffProfile 
        user={publicUser}
        articles={publicArticles}
        photos={publicPhotos}
        photoToArticleMap={photoToArticleMap}
      />
    </div>
  );
}
