# Payload CLI backport

`payload@3.80.0.patch` backports the CLI fix from
[payloadcms/payload#18398](https://github.com/payloadcms/payload/pull/18398),
released in Payload 3.91.0. Payload, Lexical and tsx versions stay unchanged.

Lexical's asynchronous Node entry points can leave the Payload config import
unfinished. The old CLI exits 0 when Node's event loop empties, before running
migrations. The patch makes two changes:

- After loading environment files, register a CLI-only resolver that selects
  Lexical's equivalent static development or production exports. It preserves
  explicit conditions and leaves unrelated packages' resolution unchanged.
  Use upstream's `module.register` fallback on both Node 20 and newer versions:
  our pinned tsx 4.21 uses asynchronous hooks, which must share the resolver's
  hook chain. Upstream's synchronous branch assumes its separate tsx upgrade.
- Await CLI startup in all three loader modes. An unsettled top-level await
  exits nonzero (Node exit code 13), preserving successful and explicit exits.

The registration is in `dist/bin/index.js`, not the CMS runtime entry point.
No application schema, migration SQL, editor configuration or public-page code
changes. This backport does not include upstream's separate tsx upgrade.

pnpm applies the patch during installation through the version-specific
`patchedDependencies` entry in `pnpm-workspace.yaml`. Commit the patch and its
lockfile hash together; no manual `node_modules` edits or postinstall patching
are needed. A clean `pnpm install --frozen-lockfile` must apply it successfully.

`pnpm test:payload-cli` verifies process exit codes, stalled config imports,
environment-file selection, explicit conditions and resolution isolation.
CI runs these checks before applying migrations to its fresh Postgres service.
The migration step retains its `Done.` completion check and propagates pipeline
failures.

When upgrading Payload to a release containing #18398, remove the patch and its
`patchedDependencies` entry, regenerate the lockfile, and rerun these checks and
fresh-database migrations. Review compatibility and schema changes separately.
