#!/usr/bin/env node
/**
 * Print the next patch version for Android auto-release.
 *
 * Usage:
 *   node mobile/scripts/bump-patch.mjs           # no prior tag -> 0.0.0
 *   node mobile/scripts/bump-patch.mjs v0.0.1-android  # -> 0.0.2
 *   node mobile/scripts/bump-patch.mjs 1.2.3    # -> 1.2.4
 *
 * Output: the next version (without leading `v` or `-android` suffix) on stdout.
 */

const arg = (process.argv[2] ?? '').trim();

if (!arg) {
  // No prior tag: start at 0.0.0 so the first release gets v0.0.0-android.
  process.stdout.write('0.0.0\n');
  process.exit(0);
}

const stripped = arg.replace(/^v/, '').replace(/-android$/, '');
const match = stripped.match(/^(\d+)\.(\d+)\.(\d+)$/);
if (!match) {
  console.error(`unable to parse version: ${arg}`);
  process.exit(1);
}

const major = Number.parseInt(match[1], 10);
const minor = Number.parseInt(match[2], 10);
const patch = Number.parseInt(match[3], 10);
process.stdout.write(`${major}.${minor}.${patch + 1}\n`);
