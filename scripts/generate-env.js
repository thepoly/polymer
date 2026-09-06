import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const envPath = path.join(process.cwd(), '.env');

if (!fs.existsSync(envPath)) {
  console.log('No .env file found. Generating one for local docker-compose dev.');

  const secret = crypto.randomBytes(32).toString('hex');
  const content = `PAYLOAD_SECRET=${secret}
DATABASE_URL=postgres://polymer:polymer@127.0.0.1:5433/polymer_dev
# Migrations in migrations/ are the source of truth for schema in this repo.
# Payload's dev-mode db.push would otherwise try to reconcile the database
# against the collection definitions on boot and block on an interactive
# "DATA LOSS WARNING ... (y/N)" prompt, hanging every request.
PAYLOAD_DISABLE_PUSH=1
NEXT_PUBLIC_POSTHOG_KEY=
# LEGACY_DATABASE_URI=postgres://user:password@host:port/legacy_database_name
# NEXT_PUBLIC_SITE_URL=http://localhost:3000
# NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
# Audio transcription service (homelab GPU box behind Cloudflare Tunnel).
# Leave blank to disable transcription locally.
TRANSCRIBE_API_URL=
TRANSCRIBE_API_KEY=
TRANSCRIBE_CF_ACCESS_CLIENT_ID=
TRANSCRIBE_CF_ACCESS_CLIENT_SECRET=
TRANSCRIBE_PUBLIC_BASE_URL=http://localhost:3000
AUDIO_DIR=/var/www/polymer-media/audio
`;

  fs.writeFileSync(envPath, content);
  console.log('.env file created. DATABASE_URL points at the docker-compose db on :5433.');
  console.log('Run "pnpm dev" to start the db and Next.js together.');
} else {
  console.log('.env file already exists. Skipping generation.');
}
