import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const envPath = path.join(process.cwd(), '.env');

if (!fs.existsSync(envPath)) {
  console.log('No .env file found. Generating one...');
  
  const secret = crypto.randomBytes(32).toString('hex');
  const content = `PAYLOAD_SECRET=${secret}
# DATABASE_URL=postgres://user:password@host:port/database_name
# LEGACY_DATABASE_URI=postgres://user:password@host:port/legacy_database_name
# NEXT_PUBLIC_SITE_URL=http://localhost:3000
`;
  
  fs.writeFileSync(envPath, content);
  console.log('.env file created with a generated PAYLOAD_SECRET.');
  console.log('Please update DATABASE_URL in .env with your actual database connection string.');
} else {
  console.log('.env file already exists. Skipping generation.');
}
