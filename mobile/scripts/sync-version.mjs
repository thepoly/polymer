#!/usr/bin/env node
/**
 * Update Android versionName + auto-increment versionCode in
 * mobile/android/app/build.gradle.
 *
 * Usage: node mobile/scripts/sync-version.mjs <versionName>
 * Example: node mobile/scripts/sync-version.mjs 0.0.1
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const gradlePath = resolve(__dirname, '..', 'android', 'app', 'build.gradle');

const rawVersion = process.argv[2];
if (!rawVersion) {
  console.error('usage: sync-version.mjs <versionName>');
  process.exit(1);
}

const versionName = rawVersion.replace(/^v/, '').replace(/-android$/, '');
if (!/^\d+\.\d+\.\d+(?:[.-].+)?$/.test(versionName)) {
  console.error(`invalid versionName: ${versionName}`);
  process.exit(1);
}

let contents;
try {
  contents = readFileSync(gradlePath, 'utf8');
} catch (err) {
  console.error(`unable to read ${gradlePath}: ${err.message}`);
  process.exit(1);
}

const versionCodeMatch = contents.match(/versionCode\s+(\d+)/);
if (!versionCodeMatch) {
  console.error('versionCode not found in build.gradle');
  process.exit(1);
}
const oldVersionCode = Number.parseInt(versionCodeMatch[1], 10);
const newVersionCode = Number.isFinite(oldVersionCode) ? oldVersionCode + 1 : 1;

let next = contents
  .replace(/versionCode\s+\d+/, `versionCode ${newVersionCode}`)
  .replace(/versionName\s+"[^"]*"/, `versionName "${versionName}"`);

if (next === contents) {
  console.error('build.gradle did not change; check versionCode/versionName patterns');
  process.exit(1);
}

writeFileSync(gradlePath, next);
console.log(`updated ${gradlePath}: versionName=${versionName}, versionCode=${newVersionCode}`);
