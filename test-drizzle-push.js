import { config } from 'dotenv';
import path from 'path';
import { getPayload } from 'payload';
import payloadConfig from './payload.config.ts';

config({ path: path.resolve(process.cwd(), '.env') });

async function run() {
  console.log('Simulating PM2 startup...');
  process.stdout.isTTY = false; // Force non-interactive
  try {
    const payload = await getPayload({ config: payloadConfig });
    console.log('Payload initialized successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Payload failed to initialize:', err);
    process.exit(1);
  }
}
run();
