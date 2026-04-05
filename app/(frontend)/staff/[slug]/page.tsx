import { extractTextFromLexical } from '@/utils/formatArticle';
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
import type { Article, Media, User } from '@/payload-types';
import {
  getStaffPortfolioPage,
  getStaffUserBySlug,
  StaffPortfolioPhoto,
} from '@/lib/staffProfile';
import { fillSeoTemplate, getSeo } from '@/lib/getSeo';

export const revalidate = 60;

type StaffArgs = { params: Promise<{ slug: string }> };

const getUser = cache(async function getUser(slug: string): Promise<User | undefined> {
  return getStaffUserBySlug(slug);
});

type PublicStaffUserSource = Pick<
  User,
  'id' | 'firstName' | 'lastName' | 'slug' | 'headshot' | 'bio' | 'positions'
>;

type PublicStaffArticleSource = Pick<Article, 'id' | 'title' | 'slug' | 'section' | 'publishedDate'>;

type PublicStaffPhotoSource = StaffPortfolioPhoto;

const toPublicStaffUser = (user: PublicStaffUserSource): StaffProfileUser => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  slug: user.slug,
  headshot: typeof user.headshot === 'object' && user.headshot 
    ? { url: user.headshot.url, title: user.headshot.title } 
    : null,
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
  title: extractTextFromLexical(article.title),
  slug: article.slug,
  section: article.section,
  publishedDate: article.publishedDate,
});

const toPublicStaffPhoto = (photo: PublicStaffPhotoSource): StaffProfilePhoto => ({
  id: photo.id,
  url: photo.url,
  title: photo.title,
  alt: photo.alt,
  width: photo.width,
  height: photo.height,
  thumbnailURL: photo.thumbnailURL,
  sizes: photo.sizes,
});

export async function generateMetadata({ params }: StaffArgs): Promise<Metadata> {
  const { slug } = await params;
  const user = await getUser(slug);
  if (!user) return {};

  const seo = await getSeo();
  const name = `${user.firstName} ${user.lastName}`;
  const headshot = user.headshot as Media | null;
  const description = fillSeoTemplate(seo.templates.staffProfileDescription, {
    name,
    siteName: seo.siteIdentity.siteName,
  });

  return {
    title: name,
    description,
    alternates: { canonical: `/staff/${user.slug || user.id}` },
    openGraph: {
      title: `${name} — ${seo.siteIdentity.siteName}`,
      description,
      type: 'profile',
      url: `/staff/${user.slug || user.id}`,
      ...(headshot?.url && {
        images: [{ url: headshot.url, alt: headshot.title || name }],
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
      id: true,
      title: true,
      slug: true,
      section: true,
      publishedDate: true,
    },
  });

  const portfolio = await getStaffPortfolioPage(user.id);

  const publicUser = toPublicStaffUser(user);
  const publicArticles = articles.docs.map((article) => toPublicStaffArticle(article));
  const publicPhotos = portfolio.photos.map((photo) => toPublicStaffPhoto(photo));

  return (
    <div className="max-w-[1200px] mx-auto px-4 pt-3 md:pt-4 pb-12">
      <StaffProfile 
        user={publicUser}
        articles={publicArticles}
        photos={publicPhotos}
        photoToArticleMap={portfolio.photoToArticleMap}
        initialPortfolioHasMore={portfolio.hasMore}
        initialPortfolioNextPage={portfolio.nextPage}
      />
    </div>
  );
}
