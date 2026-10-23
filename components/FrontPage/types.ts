import React from 'react';

export interface GameTeam {
  name: string;
  shortName: string;
  logo: string | null;
  /** The school's athletics website */
  url: string | null;
}

/** Result of the game a sports story covers (sports only, optional). */
export interface GameResult {
  opponent: GameTeam;
  homeAway: 'home' | 'away' | 'neutral';
  rpiScore: number | null;
  opponentScore: number | null;
  status: string;
}

export interface Article {
  id: number | string;
  slug: string;
  title: string;
  richTitle?: React.ReactNode;
  excerpt: string;
  author: string | null;
  date: string | null;
  isoDate?: string | null;
  image: string | null;
  imageFull: string | null;
  imageCaption?: string | null;
  imagePhotographer?: string | null;
  imagePhotographerId?: string | number | null;
  imageTitle?: string | null;
  section: string;
  kicker: string | null;
  opinionType?: string | null;
  publishedDate?: string | null;
  createdAt?: string;
  /** Absolute URL for legacy articles that live on an external domain */
  externalUrl?: string;
  isFollytechnic?: boolean | null;
  /** Authors in byline order; href is the staff profile, null for write-ins */
  authorLinks?: { name: string; href: string | null }[];
  sport?: string | null;
  game?: GameResult | null;
}
