/**
 * Seed 15 placeholder features articles with placeholder images.
 *
 * Usage:  node --env-file=.env ./node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/cli.mjs scripts/seed-features.ts
 */

import path from 'path';
import fs from 'fs';
import { getPayload } from 'payload';
import config from '../payload.config';
import sharp from 'sharp';

const PLACEHOLDER_ARTICLES = [
  {
    title: 'Inside the lab where students are building the next generation of prosthetic limbs',
    subdeck: 'A team of biomedical engineers is combining 3D printing with neural interfaces to create affordable prosthetics that respond to thought, and they say a working prototype could be ready by next fall.',
    kicker: 'Innovation',
    author: 'Maya Richardson',
  },
  {
    title: 'The forgotten murals of the Rensselaer Union and the artists who painted them',
    subdeck: 'Hidden behind decades of renovations, a series of Depression-era murals tells the story of campus life in the 1930s. A student-led effort is now working to restore them before they deteriorate beyond repair.',
    kicker: 'Campus History',
    author: 'Liam Kowalski',
  },
  {
    title: 'How a Troy community garden became a lifeline for immigrant families',
    subdeck: 'What started as a small plot behind a church has grown into a thriving network of gardens where refugees from six countries grow familiar crops and build connections in an unfamiliar city.',
    kicker: 'Community',
    author: 'Priya Nair',
  },
  {
    title: 'Meet the professor who has been teaching the same course for 40 years — and still loves it',
    subdeck: 'Professor Eleanor Marsh has watched calculus evolve from chalkboards to iPads, but she says the fundamentals of reaching students haven\'t changed since her first lecture in 1986.',
    kicker: 'Profile',
    author: 'Ethan Gallagher',
  },
  {
    title: 'A semester abroad turned into a two-year journey through Southeast Asia',
    subdeck: 'When the pandemic stranded junior Kira Yamamoto in Vietnam, she made the unconventional decision to stay. Now back on campus, she reflects on the experience that reshaped her academic path.',
    kicker: 'Travel',
    author: 'Kira Yamamoto',
  },
  {
    title: 'The student radio station fighting to stay on the air in the streaming age',
    subdeck: 'WRPI has broadcast from the top of the Hirsch Observatory since 1947. With listenership declining and equipment aging, a dedicated group of students is reimagining what college radio can be.',
    kicker: 'Student Media',
    author: 'Dani Ostrowski',
  },
  {
    title: 'What happens to the food left over after every campus dining hall closes for the night',
    subdeck: 'An investigation into the university\'s food waste pipeline reveals a complex system of composting, donations, and disposal — and the students trying to make it more sustainable.',
    kicker: 'Sustainability',
    author: 'Jasmine Herrera',
  },
  {
    title: 'From dorm room startup to $2 million in funding: the story of a student-founded AI company',
    subdeck: 'Two computer science juniors built an AI tutoring platform during finals week as a joke. Eighteen months later, they have a team of twelve and backing from two venture capital firms.',
    kicker: 'Entrepreneurship',
    author: 'Marcus Webb',
  },
  {
    title: 'The architecture students redesigning affordable housing for upstate New York',
    subdeck: 'A studio course is challenging students to create modular housing units that cost under $150,000 to build, using locally sourced materials and passive heating techniques suited to harsh winters.',
    kicker: 'Design',
    author: 'Sophia Tran',
  },
  {
    title: 'Living with a chronic illness while keeping up with an engineering courseload',
    subdeck: 'Three students share their experiences navigating accommodations, managing flare-ups during midterms, and finding community in a campus culture that often equates productivity with worth.',
    kicker: 'Wellness',
    author: 'Robin Akhtar',
  },
  {
    title: 'The underground music scene thriving in Troy\'s abandoned industrial spaces',
    subdeck: 'Warehouse shows, DIY venues, and pop-up performances are drawing students and locals together in spaces that once housed collar factories and iron foundries along the Hudson River.',
    kicker: 'Arts & Culture',
    author: 'Julian Reese',
  },
  {
    title: 'How one alumna went from studying nuclear engineering to running a bakery in Brooklyn',
    subdeck: 'Sarah Chen graduated with honors in 2015 and spent three years at a national lab before trading reactor simulations for sourdough starters. She says the skills transfer more than you\'d think.',
    kicker: 'Alumni',
    author: 'Nora Fitzgerald',
  },
  {
    title: 'The quiet crisis in graduate student mental health — and what the university is doing about it',
    subdeck: 'A recent survey found that nearly half of graduate students reported symptoms of anxiety or depression. The counseling center is expanding services, but students say systemic issues remain unaddressed.',
    kicker: 'Mental Health',
    author: 'Aiden Park',
  },
  {
    title: 'Behind the scenes of the largest student-run hackathon in the Northeast',
    subdeck: 'HackRPI draws over 800 participants each year. Organizers share what it takes to coordinate sponsors, mentors, meals, and sleeping arrangements for a 48-hour coding marathon.',
    kicker: 'Events',
    author: 'Zara Okonkwo',
  },
  {
    title: 'The last independent bookstore in Troy is fighting to survive — with help from students',
    subdeck: 'Market Block Books has been a downtown fixture for fifteen years. As rent rises and foot traffic drops, a group of student volunteers is helping the shop pivot to events, workshops, and online sales.',
    kicker: 'Local Business',
    author: 'Caleb Morrison',
  },
];

async function main() {
  console.log('Starting features article seed...');

  const payload = await getPayload({ config });

  // Create a placeholder image with a warm tone to distinguish from news placeholders
  const imgBuffer = await sharp({
    create: { width: 800, height: 533, channels: 3, background: { r: 40, g: 35, b: 30 } },
  })
    .jpeg({ quality: 60 })
    .toBuffer();

  const tmpDir = path.resolve('scripts', '.tmp-seed');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  for (let i = 0; i < PLACEHOLDER_ARTICLES.length; i++) {
    const article = PLACEHOLDER_ARTICLES[i];
    console.log(`[${i + 1}/${PLACEHOLDER_ARTICLES.length}] Creating "${article.title.slice(0, 50)}..."`);

    // Upload placeholder image
    const tmpFile = path.join(tmpDir, `placeholder-features-${i}.jpg`);
    fs.writeFileSync(tmpFile, imgBuffer);

    let mediaDoc;
    try {
      mediaDoc = await payload.create({
        collection: 'media',
        data: {
          alt: `Placeholder image for ${article.title.slice(0, 40)}`,
        },
        file: {
          data: imgBuffer,
          name: `features-placeholder-${i}.jpg`,
          mimetype: 'image/jpeg',
          size: imgBuffer.length,
        },
      });
    } catch (err) {
      console.warn(`  Warning: image upload failed, creating article without image`, err);
    }

    try {
      await payload.create({
        collection: 'articles',
        data: {
          title: article.title,
          section: 'features',
          subdeck: article.subdeck,
          kicker: article.kicker,
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

  // Cleanup temp files
  try {
    fs.rmSync(tmpDir, { recursive: true });
  } catch {
    // ignore
  }

  console.log(`\nDone! ${PLACEHOLDER_ARTICLES.length} placeholder features articles created.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
