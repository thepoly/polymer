const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envPath = path.join(process.cwd(), '.env');

if (!fs.existsSync(envPath)) {
  console.log('No .env file found. Generating one...');
  
  const secret = crypto.randomBytes(32).toString('hex');
  const content = `PAYLOAD_SECRET=${secret}
# DATABASE_URI=postgres://user:password@host:port/database_name
`;
  
  fs.writeFileSync(envPath, content);
  console.log('.env file created with a generated PAYLOAD_SECRET.');
  console.log('Please update DATABASE_URI in .env with your actual database connection string.');
} else {
  console.log('.env file already exists. Skipping generation.');
}
