/**
 * Seed 12 sports articles with stock images from Lorem Picsum.
 *
 * Usage:  node --env-file=.env ./node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/cli.mjs scripts/seed-sports.ts
 */

import { getPayload } from 'payload';
import config from '../payload.config';

const SPORTS_ARTICLES = [
  {
    title: 'Engineers sweep weekend series against Clarkson with dominant pitching',
    subdeck:
      'RPI baseball took all three games from the Golden Knights behind a combined 24 strikeouts from the starting rotation, improving to 18-4 on the season.',
    author: 'Jake Morales',
  },
  {
    title: "Women's hockey clinches Liberty League title in overtime thriller",
    subdeck:
      'A power-play goal with 47 seconds left in overtime sent the Engineers to the NCAA tournament for the first time in five years, capping off a historic 22-win season.',
    author: 'Samantha Liu',
  },
  {
    title: 'Track and field shatters three school records at Liberty League championships',
    subdeck:
      'Senior sprinter DeShawn Carter led the way with a record-breaking 100m dash, while the relay team and a freshman javelin thrower also etched their names in the record books.',
    author: 'Chris Hernandez',
  },
  {
    title: "Men's lacrosse rallies from four-goal deficit to stun Union in rivalry game",
    subdeck:
      'Down 7-3 at halftime, the Engineers scored six unanswered goals in the second half to pull off the biggest comeback in program history and reclaim the Dutchman Shoes.',
    author: 'Tara Sullivan',
  },
  {
    title: 'Club rugby earns bid to national tournament after undefeated spring season',
    subdeck:
      "The team's 10-0 record and dominant defense — allowing just 42 points all season — earned them a first-round home match in the USA Rugby collegiate championships.",
    author: 'Owen Bradley',
  },
  {
    title: 'New turf and lights unveiled at the renovated East Campus Athletic Village',
    subdeck:
      'The $12 million project brings a FIFA-certified synthetic surface, LED lighting, and expanded seating to the soccer and lacrosse complex, with the first game scheduled for next Saturday.',
    author: 'Priya Kapoor',
  },
  {
    title: "Swimming and diving takes second at conference meet, led by freshman sensation",
    subdeck:
      'First-year swimmer Ellie Tanaka won three individual events and broke two conference records, earning Rookie of the Meet honors and qualifying for NCAA Division III nationals.',
    author: 'Ben Archer',
  },
  {
    title: "Football's spring practice reveals new spread offense under first-year coordinator",
    subdeck:
      'Offensive coordinator Marcus Doyle is installing a tempo-based spread system that he says will better utilize the Engineers\' speed at receiver and create more explosive plays.',
    author: 'Danielle Foster',
  },
  {
    title: 'Former Engineer drafted by New York Red Bulls after standout senior season',
    subdeck:
      'Midfielder Alejandro Reyes became only the fourth RPI soccer alumnus to be selected in the MLS SuperDraft, going in the second round to the Red Bulls.',
    author: 'Leo Nakamura',
  },
  {
    title: "Women's basketball coach reaches 300-win milestone with victory over St. Lawrence",
    subdeck:
      "Coach Janet Murray's 300th career win came in fitting fashion — a 20-point blowout powered by a suffocating full-court press that forced 28 turnovers.",
    author: 'Rachel Kim',
  },
  {
    title: 'Intramural dodgeball league explodes in popularity with over 40 teams registered',
    subdeck:
      "What started as a casual dorm activity has become one of the most popular intramural offerings on campus, with themed teams, a playoff bracket, and a surprisingly intense fan base.",
    author: 'Miles Whitfield',
  },
  {
    title: 'Cross country prepares for nationals after dominant showing at regionals',
    subdeck:
      "Both the men's and women's teams qualified for the NCAA Division III championships, marking the first time since 2014 that both squads earned a trip to nationals in the same year.",
    author: 'Hannah Ortiz',
  },
];

async function fetchPhoto(seed: number): Promise<Buffer> {
  const url = `https://picsum.photos/seed/sports${seed}/800/533`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  console.log('Starting sports article seed...\n');

  const payload = await getPayload({ config });

  for (let i = 0; i < SPORTS_ARTICLES.length; i++) {
    const article = SPORTS_ARTICLES[i];
    console.log(
      `[${i + 1}/${SPORTS_ARTICLES.length}] Creating "${article.title.slice(0, 60)}..."`
    );

    let mediaDoc;
    try {
      const imgBuffer = await fetchPhoto(i);
      mediaDoc = await payload.create({
        collection: 'media',
        data: {
          alt: `Stock photo for ${article.title.slice(0, 40)}`,
        },
        file: {
          data: imgBuffer,
          name: `sports-stock-${i}.jpg`,
          mimetype: 'image/jpeg',
          size: imgBuffer.length,
        },
      });
    } catch (err) {
      console.warn(`  Warning: image failed, creating article without image`, err);
    }

    try {
      await payload.create({
        collection: 'articles',
        data: {
          title: article.title,
          section: 'sports',
          subdeck: article.subdeck,
          slug: article.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .slice(0, 80),
          writeInAuthors: [{ name: article.author }],
          ...(mediaDoc ? { featuredImage: mediaDoc.id } : {}),
          _status: 'published',
          publishedDate: new Date(
            Date.now() - i * 2 * 24 * 60 * 60 * 1000
          ).toISOString(),
        },
      });
      console.log(`  ✓ Created`);
    } catch (err) {
      console.error(`  ✗ Failed:`, err);
    }
  }

  console.log(
    `\nDone! ${SPORTS_ARTICLES.length} sports articles created.`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
