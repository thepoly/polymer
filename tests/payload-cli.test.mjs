import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const binPath = fileURLToPath(new URL('../node_modules/payload/bin.js', import.meta.url));

function fixture(run) {
  const dir = mkdtempSync(path.join(tmpdir(), 'polymer-payload-cli-'));
  // Keep Payload's environment search inside this isolated fixture.
  writeFileSync(path.join(dir, '.env'), '\n');
  try {
    run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function invoke(dir, args, { environment = {}, nodeArgs = [] } = {}) {
  const env = { ...process.env };
  delete env.NODE_ENV;
  delete env.PAYLOAD_CONFIG_PATH;
  const result = spawnSync(process.execPath, [...nodeArgs, binPath, ...args], {
    cwd: dir,
    env: { ...env, ...environment },
    encoding: 'utf8',
    timeout: 30_000,
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null, result.stderr);
  return result;
}

for (const flags of [[], ['--disable-transpile']]) {
  const mode = flags.length ? 'native JS' : 'tsx';
  for (const [name, source, expected] of [
    ['completed script succeeds', 'await Promise.resolve()', 0],
    ['unfinished script fails', 'await new Promise(() => {})', 13],
    ['thrown error fails', "throw new Error('EXPECTED_FAILURE')", 1],
    ['explicit exit code survives', 'process.exit(7)', 7],
  ]) {
    test(`${mode}: ${name}`, () => fixture(dir => {
      const script = path.join(dir, 'script.mjs');
      writeFileSync(script, `console.log('SCRIPT_STARTED');\n${source}\n`);
      const result = invoke(dir, ['run', script, ...flags]);
      assert.match(result.stdout, /SCRIPT_STARTED/);
      assert.equal(result.status, expected, result.stderr);
    }));
  }
}

test('an unfinished config import fails before migrations', () => fixture(dir => {
  const config = path.join(dir, 'config.mjs');
  writeFileSync(config, "console.log('CONFIG_STARTED');\nexport default await new Promise(() => {});\n");
  const result = invoke(dir, ['migrate', '--help'], {
    environment: { PAYLOAD_CONFIG_PATH: config },
  });
  assert.match(result.stdout, /CONFIG_STARTED/);
  assert.equal(result.status, 13, result.stderr);
}));

function conditionalPackage(dir, name) {
  const packageDir = path.join(dir, 'node_modules', name);
  mkdirSync(packageDir, { recursive: true });
  const entry = {
    development: './development.mjs',
    production: './production.mjs',
    node: './node.mjs',
  };
  writeFileSync(path.join(packageDir, 'package.json'), JSON.stringify({
    name,
    type: 'module',
    exports: { '.': entry, './subpath': entry },
  }));
  for (const condition of Object.keys(entry)) {
    writeFileSync(path.join(packageDir, `${condition}.mjs`), `export default '${condition}';\n`);
  }
}

for (const scenario of [
  { name: 'default development', lexical: 'development', other: 'node' },
  { name: 'production from .env', dotenv: 'NODE_ENV=production\n', lexical: 'production', other: 'node' },
  { name: 'process environment overrides .env', dotenv: 'NODE_ENV=production\n', environment: { NODE_ENV: 'development' }, lexical: 'development', other: 'node' },
  { name: 'explicit conditions survive', environment: { NODE_ENV: 'production' }, nodeArgs: ['--conditions=development'], lexical: 'development', other: 'development' },
]) {
  test(`Lexical resolution: ${scenario.name}`, () => fixture(dir => {
    for (const name of ['lexical', '@lexical/probe', 'unrelated-package']) conditionalPackage(dir, name);
    if (scenario.dotenv) writeFileSync(path.join(dir, '.env'), scenario.dotenv);
    const script = path.join(dir, 'resolve.mjs');
    writeFileSync(script, `
      import lexical from 'lexical';
      import subpath from 'lexical/subpath';
      import scoped from '@lexical/probe';
      import unrelated from 'unrelated-package';
      console.log(JSON.stringify({ lexical, subpath, scoped, unrelated }));
    `);
    const result = invoke(dir, ['run', script], scenario);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout.trim()), {
      lexical: scenario.lexical,
      subpath: scenario.lexical,
      scoped: scenario.lexical,
      unrelated: scenario.other,
    });
  }));
}
