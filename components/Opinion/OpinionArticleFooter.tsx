import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

type FooterArticle = {
  title: string;
  image?: string | null;
  url: string;
  label?: string;
};

const moreInOpinion: FooterArticle[] = [
  {
    title: 'RPI Must Do More to Support Student Mental Health',
    image: '/placeholder.jpg',
    url: '#',
    label: 'Op-Ed',
  },
  {
    title: 'The Case for Open-Source Research at Universities',
    image: '/placeholder.jpg',
    url: '#',
    label: 'Staff Editorial',
  },
  {
    title: 'Why Greek Life Still Matters on Campus',
    image: '/placeholder.jpg',
    url: '#',
    label: 'Column',
  },
  {
    title: 'A Letter to the Class of 2029',
    image: '/placeholder.jpg',
    url: '#',
    label: 'Letter to the Editor',
  },
  {
    title: 'Stop Cutting the Arts — They Make Engineers Better',
    image: '/placeholder.jpg',
    url: '#',
    label: 'Endorsement',
  },
  {
    title: 'The Dining Hall Deserves a Reckoning',
    image: '/placeholder.jpg',
    url: '#',
    label: 'Top Hat',
  },
];

const trendingArticles: FooterArticle[] = [
  { title: 'Student Senate Passes Resolution on Campus Safety Lighting', url: '#' },
  { title: 'Men\'s Hockey Advances to ECAC Quarterfinals', url: '#' },
  { title: 'Spring Career Fair Draws Record Number of Employers', url: '#' },
  { title: 'New Maker Space Opens in the Jonsson Engineering Center', url: '#' },
  { title: 'Faculty Vote to Revise General Education Requirements', url: '#' },
  { title: 'Club Sports Funding Faces Cuts in New Budget Proposal', url: '#' },
  { title: 'A Look Inside the Renovation of the Rensselaer Union', url: '#' },
  { title: 'Campus Shuttle Routes to Change Starting Next Semester', url: '#' },
];

export const OpinionArticleFooter: React.FC = () => {
  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 md:px-6 mt-16 mb-8">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-0 lg:gap-10">
        {/* Left: More in Opinion */}
        <div>
          <div className="border-t-2 border-gray-300" />
          <h2 className="text-[17px] font-bold mt-4 mb-6">More in Opinion</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-8">
            {moreInOpinion.map((article, idx) => (
              <Link key={idx} href={article.url} className="group flex flex-col">
                {article.image && (
                  <div className="relative aspect-[3/2] w-full overflow-hidden bg-gray-100 mb-2">
                    <div className="w-full h-full bg-gray-200" />
                  </div>
                )}
                {article.label && (
                  <span className="text-[11px] text-gray-500 mb-1">
                    {article.label}
                  </span>
                )}
                <h3 className="text-[15px] font-semibold leading-snug text-gray-900 group-hover:text-gray-600 transition-colors">
                  {article.title}
                </h3>
              </Link>
            ))}
          </div>
        </div>

        {/* Right: Trending in The Polytechnic */}
        <div className="mt-10 lg:mt-0">
          <div className="border-t-2 border-gray-300" />
          <h2 className="text-[17px] font-bold mt-4 mb-4">Trending in The Polytechnic</h2>

          <div className="flex flex-col">
            {trendingArticles.map((article, idx) => (
              <Link
                key={idx}
                href={article.url}
                className="group py-3 border-b border-gray-200 last:border-b-0"
              >
                <h3 className="text-[15px] font-semibold leading-snug text-gray-900 group-hover:text-gray-600 transition-colors">
                  {article.title}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
