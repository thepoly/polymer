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
  const formattedDate = date 
    ? date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase()
    : null;

  // Simple "days ago" logic for the mock look
  let dateString = formattedDate;
  if (date) {
    const diffTime = Math.abs(new Date().getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) dateString = 'TODAY';
    else dateString = `${diffDays} DAY${diffDays > 1 ? 'S' : ''} AGO`;
  }

  return {
    id: article.id,
    title: article.title,
    excerpt: article.subdeck || '',
    author: authors || null,
    date: dateString,
    image: (article.featuredImage as Media)?.url || null,
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

      formatArticle(layout.op5),

    ].filter(Boolean) as ComponentArticle[];

  

    return (

      <main className="min-h-screen bg-white">

        <Header />

        <FrontPage 

          topStories={topStories}

          studentSenate={studentSenate || { id: 'fallback', title: 'No Senate Update', excerpt: '', author: '', date: '', image: null }}

          opinion={opinion}

        />

      </main>

    );

  }

  