export const revalidate = 0;
import Header from "@/components/Header";
import FrontPage from "@/components/FrontPage";
import { getPayload } from "payload";
import config from "@/payload.config";
import { Article as PayloadArticle, Media } from "@/payload-types";
import { Article as ComponentArticle } from "@/components/FrontPage/types";

const formatArticle = (article: PayloadArticle | number | null | undefined): ComponentArticle | null => {
  if (!article || typeof article === 'number') return null;
  
  const authors = article.authors
    ?.map((author) => {
      if (typeof author === 'number') return '';
      return `${author.firstName} ${author.lastName}`;
    })
    .filter(Boolean)
    .join(' AND ');

  const date = article.publishedDate ? new Date(article.publishedDate) : null;

  let dateString: string | null = null;
  if (date) {
    const now = new Date().getTime();
    const diffMs = now - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      dateString = `${diffMins} MINUTE${diffMins !== 1 ? 'S' : ''} AGO`;
    } else if (diffHours < 24) {
      dateString = `${diffHours} HOUR${diffHours !== 1 ? 'S' : ''} AGO`;
    } else if (diffDays < 7) {
      dateString = `${diffDays} DAY${diffDays !== 1 ? 'S' : ''} AGO`;
    }
  }

  return {
    id: article.id,
    slug: article.slug || '#',
    title: article.title,
    excerpt: article.subdeck || '',
    author: authors || null,
    date: dateString,
    image: (article.featuredImage as Media)?.url || null,
    section: article.section,
    publishedDate: article.publishedDate,
    createdAt: article.createdAt,
  };
};

export default async function Home() {
  const payload = await getPayload({ config });
  
  const layoutResponse = await payload.find({
    collection: 'layout',
    limit: 1,
    depth: 2,
  });

  const layout = layoutResponse.docs[0];

  if (!layout) {
    return (
      <main className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center h-[50vh]">
            <p className="text-gray-500 font-serif">Please configure the layout in the admin panel.</p>
        </div>
      </main>
    );
  }

    const mainArticle = formatArticle(layout.mainArticle);

    if (!mainArticle) {

      return (

          <main className="min-h-screen bg-white">

            <Header />

            <div className="flex items-center justify-center h-[50vh]">

                <p className="text-gray-500 font-serif">Please assign a main article in the layout configuration.</p>

            </div>

          </main>

        );

    }

  

    const topStories = {

      lead: mainArticle,

      list: [

        formatArticle(layout.top1),

        formatArticle(layout.top2),

        formatArticle(layout.top3),

      ].filter(Boolean) as ComponentArticle[],

    };

  

    const studentSenate = formatArticle(layout.special);

  

        const opinion = [

  

          formatArticle(layout.op1),

  

          formatArticle(layout.op2),

  

          formatArticle(layout.op3),

  

          formatArticle(layout.op4),

  

        ].filter(Boolean) as ComponentArticle[];

  

    return (

      <main className="min-h-screen bg-white">

        <Header />

        <FrontPage 

          topStories={topStories}

          studentSenate={studentSenate || { id: 'fallback', slug: '#', title: 'No Senate Update', excerpt: '', author: '', date: '', image: null, section: 'News' }}

          opinion={opinion}

        />

      </main>

    );

  }

  