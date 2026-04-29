# Audio Transcription Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add audio upload + async high-accuracy transcription with speaker diarization, accessible via a fully-custom Payload admin UI for writers/editors/EIC/admins.

**Architecture:** Polymer (Next.js + Payload) holds 3 new collections (`audioFiles`, `audioJobs`, `transcripts`), receives uploads, transcodes to opus 32 kbps mono 16 kHz, dispatches over a Cloudflare Tunnel + CF Access service-token to a separate FastAPI service running WhisperX on a homelab RTX 4070. The GPU service POSTs an HMAC-signed webhook back. The custom Payload admin UI handles upload, status polling, transcript editing, export, and Postgres FTS search.

**Tech Stack:** Next.js 16, React 19, Payload 3.80, PostgreSQL, ffmpeg/ffprobe, WhisperX (separate service), Cloudflare Tunnel + Access.

**Spec:** `docs/superpowers/specs/2026-04-28-audio-transcription-design.md`
**GPU service prompt:** `docs/superpowers/specs/2026-04-28-polymer-transcribe-prompt.md`

---

## File Map

**New (polymer side):**

```
collections/{AudioFiles,AudioJobs,Transcripts}.ts
migrations/20260428_100000_add_audio_transcription.ts
lib/transcribe/{ffmpeg,hmac,dispatch,types,segments,exporters,config,highlight}.ts
app/api/transcribe/{upload,webhook,search}/route.ts
app/api/transcribe/[id]/{route,transcript/route,dispatch/route,audio/route}.ts
app/(payload)/admin/transcribe/search/page.tsx
components/Transcribe/{JobsListView,UploadModal,JobEditView,StatusPanel}.tsx
components/Transcribe/Editor/{Editor,AudioPlayer,SpeakerSidebar,SegmentList,Segment,FindReplace,ExportMenu}.tsx
components/Transcribe/Search/{SearchView,Snippet}.tsx
components/Transcribe/hooks/{useTranscript,useAudioPlayback,useJobStatus}.ts
components/Transcribe/transcribe.css
tests/lib/transcribe/{hmac,segments,exporters,highlight}.test.ts
```

**Modified:**
`payload.config.ts`, `migrations/index.ts`, `scripts/run_deploy_sql_migrations.sh`, `scripts/generate-env.js`, `package.json`, `payload-types.ts` (auto), `.github/workflows/deploy.yml`.

---

## Phase 1 — Foundation

### Task 1: AudioFiles upload collection

**Files:** create `collections/AudioFiles.ts`; modify `payload.config.ts`.

Implement an upload-enabled collection with slug `audio-files`:
- `staticDir`: `process.env.AUDIO_DIR || '/var/www/polymer-media/audio'`.
- `mimeTypes`: `audio/mpeg`, `audio/mp4`, `audio/x-m4a`, `audio/wav`, `audio/x-wav`, `audio/ogg`, `audio/flac`, `audio/webm`, `audio/opus`.
- Fields: `durationSeconds` (number, readonly), `uploader` (relationship → users, sidebar, readonly).
- Access: read = uploader OR staff (admin/eic/editor); create = any of admin/eic/editor/writer; update = false; delete = admin only.
- `beforeChange` hook (operation === 'create'): set `data.uploader = req.user.id`.
- `admin.hidden`: hide collection from sidebar except for admins.

Follow `collections/DeviceTokens.ts` for the role-check shape using a `UserWithRoles` cast.

Register in `payload.config.ts` by adding the import and appending to the `collections: [...]` array.

- [ ] Step 1: Write the collection file.
- [ ] Step 2: Register in `payload.config.ts`.
- [ ] Step 3: `git add collections/AudioFiles.ts payload.config.ts && git commit -m "feat(transcribe): add AudioFiles upload collection"`.

---

### Task 2: AudioJobs collection

**Files:** create `collections/AudioJobs.ts`; modify `payload.config.ts`.

Slug `audio-jobs`, label "Transcript / Transcripts", group "Newsroom".

Fields:
| name | type | notes |
|---|---|---|
| `title` | text | required |
| `kind` | select | required, default `interview`; options: interview / meeting / presser / lecture / court / other |
| `notes` | textarea | |
| `audioFile` | relationship → audio-files | required, readonly |
| `uploader` | relationship → users | sidebar, readonly |
| `status` | select | required, default `queued`; options: queued / dispatching / processing / completed / failed; readonly, sidebar |
| `externalJobId` | text | hidden, readonly |
| `callbackSecret` | text | hidden, readonly |
| `progress` | number | hidden, readonly |
| `dispatchAttempts` | number | default 0, hidden |
| `error` | textarea | readonly, condition: only when present |
| `transcribedAt` | date | readonly, hidden |

Access:
- `read`: uploader OR staff (admin/eic/editor) → use Payload `where` filter for non-staff.
- `create`: writer/editor/eic/admin.
- `update` / `delete`: uploader or admin.

`beforeChange` hook on create sets `uploader` from `req.user.id` if not already set.

Custom views are wired in Tasks 12 & 14, leave `admin.components.views` empty for now.

- [ ] Step 1: Write file.
- [ ] Step 2: Register in `payload.config.ts`.
- [ ] Step 3: `git add collections/AudioJobs.ts payload.config.ts && git commit -m "feat(transcribe): add AudioJobs collection with kind/status/dispatch fields"`.

---

### Task 3: Transcripts collection

**Files:** create `collections/Transcripts.ts`; modify `payload.config.ts`.

Slug `transcripts`. Hidden from sidebar for non-admins.

Fields:
- `audioJob` — relationship → audio-jobs, required, unique, readonly.
- `data` — `json`, required.
- `searchableText` — `textarea`, hidden.
- `editedAt` — date, readonly.
- `editedBy` — relationship → users, readonly.

Access: read for any authenticated staff (we enforce ownership at the route layer because Payload access can't easily join across collections); update by any authenticated user (route enforces ownership); delete admin-only.

- [ ] Step 1: Write file.
- [ ] Step 2: Register in `payload.config.ts`.
- [ ] Step 3: `git add collections/Transcripts.ts payload.config.ts && git commit -m "feat(transcribe): add Transcripts collection with json data + searchable text"`.

---

### Task 4: Migration (TypeScript) + SQL deploy script entry

**Files:** create `migrations/20260428_100000_add_audio_transcription.ts`; modify `migrations/index.ts`; modify `scripts/run_deploy_sql_migrations.sh`.

The migration creates three tables and two enums, plus the locked-documents-rels columns Payload requires.

DDL (used in both the TS migration's `up()` body and the appended SQL block):

```sql
DO $$ BEGIN
  CREATE TYPE "public"."enum_audio_jobs_kind" AS ENUM('interview','meeting','presser','lecture','court','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "public"."enum_audio_jobs_status" AS ENUM('queued','dispatching','processing','completed','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "audio_files" (
  "id" serial PRIMARY KEY NOT NULL,
  "duration_seconds" numeric,
  "uploader_id" integer,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "url" varchar,
  "thumbnail_u_r_l" varchar,
  "filename" varchar,
  "mime_type" varchar,
  "filesize" numeric,
  "width" numeric,
  "height" numeric,
  "focal_x" numeric,
  "focal_y" numeric
);
CREATE UNIQUE INDEX IF NOT EXISTS "audio_files_filename_idx" ON "audio_files" USING btree ("filename");
CREATE INDEX IF NOT EXISTS "audio_files_uploader_idx" ON "audio_files" USING btree ("uploader_id");
CREATE INDEX IF NOT EXISTS "audio_files_created_at_idx" ON "audio_files" USING btree ("created_at");
DO $$ BEGIN
  ALTER TABLE "audio_files" ADD CONSTRAINT "audio_files_uploader_id_users_id_fk"
    FOREIGN KEY ("uploader_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "audio_jobs" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" varchar NOT NULL,
  "kind" "public"."enum_audio_jobs_kind" NOT NULL DEFAULT 'interview',
  "notes" varchar,
  "audio_file_id" integer NOT NULL,
  "uploader_id" integer,
  "status" "public"."enum_audio_jobs_status" NOT NULL DEFAULT 'queued',
  "external_job_id" varchar,
  "callback_secret" varchar,
  "progress" numeric,
  "dispatch_attempts" numeric DEFAULT 0,
  "error" varchar,
  "transcribed_at" timestamp(3) with time zone,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "audio_jobs_status_idx" ON "audio_jobs" USING btree ("status");
CREATE INDEX IF NOT EXISTS "audio_jobs_uploader_idx" ON "audio_jobs" USING btree ("uploader_id");
CREATE INDEX IF NOT EXISTS "audio_jobs_created_at_idx" ON "audio_jobs" USING btree ("created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "audio_jobs_external_job_id_idx" ON "audio_jobs" USING btree ("external_job_id") WHERE "external_job_id" IS NOT NULL;
DO $$ BEGIN
  ALTER TABLE "audio_jobs" ADD CONSTRAINT "audio_jobs_audio_file_id_audio_files_id_fk"
    FOREIGN KEY ("audio_file_id") REFERENCES "public"."audio_files"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "audio_jobs" ADD CONSTRAINT "audio_jobs_uploader_id_users_id_fk"
    FOREIGN KEY ("uploader_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "transcripts" (
  "id" serial PRIMARY KEY NOT NULL,
  "audio_job_id" integer NOT NULL,
  "data" jsonb NOT NULL,
  "searchable_text" text,
  "edited_at" timestamp(3) with time zone,
  "edited_by_id" integer,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "transcripts_audio_job_idx" ON "transcripts" USING btree ("audio_job_id");
CREATE INDEX IF NOT EXISTS "transcripts_searchable_text_fts_idx" ON "transcripts"
  USING gin (to_tsvector('english', coalesce("searchable_text", '')));
DO $$ BEGIN
  ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_audio_job_id_audio_jobs_id_fk"
    FOREIGN KEY ("audio_job_id") REFERENCES "public"."audio_jobs"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_edited_by_id_users_id_fk"
    FOREIGN KEY ("edited_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "audio_files_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "audio_jobs_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "transcripts_id" integer;
DO $$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audio_files_fk"
    FOREIGN KEY ("audio_files_id") REFERENCES "public"."audio_files"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audio_jobs_fk"
    FOREIGN KEY ("audio_jobs_id") REFERENCES "public"."audio_jobs"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_transcripts_fk"
    FOREIGN KEY ("transcripts_id") REFERENCES "public"."transcripts"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_audio_files_id_idx" ON "payload_locked_documents_rels" ("audio_files_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_audio_jobs_id_idx" ON "payload_locked_documents_rels" ("audio_jobs_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_transcripts_id_idx" ON "payload_locked_documents_rels" ("transcripts_id");
```

The TypeScript migration follows `migrations/20260424_020000_add_device_tokens.ts` for shape: `up({ db })` runs `db.execute(sql\`<DDL>\`)`; `down()` reverses.

`migrations/index.ts`: import the new module and add to the exported `migrations` array (matches existing pattern).

`scripts/run_deploy_sql_migrations.sh`: append the same DDL above into the heredoc, and add `('20260428_100000_add_audio_transcription', <next-batch>, NOW(), NOW())` to the tracking insert list (next batch = current max + 1; check the file).

- [ ] Step 1: Write `migrations/20260428_100000_add_audio_transcription.ts`.
- [ ] Step 2: Register in `migrations/index.ts`.
- [ ] Step 3: Append to `scripts/run_deploy_sql_migrations.sh`.
- [ ] Step 4: `pnpm db:fresh` — expect clean rebuild.
- [ ] Step 5: `pnpm generate:types` — expect `payload-types.ts` updated.
- [ ] Step 6: Commit migration files + payload-types.

---

## Phase 2 — Transport

### Task 5: Types + env config

**Files:** create `lib/transcribe/types.ts`, `lib/transcribe/config.ts`; modify `scripts/generate-env.js`.

`types.ts` exports:
- `Speaker`: `{ id: string; label: string | null }`
- `Word`: `{ word: string; start: number; end: number; score?: number }`
- `Segment`: `{ id: string; speakerId: string; start: number; end: number; text: string; words: Word[]; edited?: boolean }`
- `TranscriptData`: `{ language: string; duration: number; model: string; speakers: Speaker[]; segments: Segment[] }`
- `TranscribeWebhookBody`: webhook payload shape (job_id, status, metadata.audioJobId, result with snake_case speaker_id, error)

`config.ts` exports `getTranscribeConfig()` returning either `{ configured: false }` or `{ configured: true, url, apiKey, cfClientId, cfClientSecret, publicBaseUrl }` from env vars `TRANSCRIBE_API_URL`, `TRANSCRIBE_API_KEY`, `TRANSCRIBE_CF_ACCESS_CLIENT_ID`, `TRANSCRIBE_CF_ACCESS_CLIENT_SECRET`, `TRANSCRIBE_PUBLIC_BASE_URL` (fallback `NEXT_PUBLIC_SITE_URL`). Strip trailing slashes.

`generate-env.js`: append stub entries for the five `TRANSCRIBE_*` vars and `AUDIO_DIR=/var/www/polymer-media/audio`.

- [ ] Step 1–3: write files, modify generate-env.js.
- [ ] Step 4: commit.

---

### Task 6: HMAC sign/verify util + tests

**Files:** create `lib/transcribe/hmac.ts`, `tests/lib/transcribe/hmac.test.ts`; modify `package.json` (add `vitest` devDep + `test:unit` script).

`hmac.ts` exports two functions using `node:crypto`:
- `signBody(body, secret)`: returns hex digest of HMAC-SHA256(body, secret) via `createHmac`.
- `verifySignature(body, header, secret)`: strips optional `sha256=` prefix; uses `timingSafeEqual` on equal-length hex buffers; returns false on null/undefined/malformed.

Tests cover:
1. signBody is deterministic (assert exact known digest for `signBody('hello', 'secret')`).
2. verifySignature accepts `sha256=` prefix and bare hex.
3. Tampered body fails.
4. Wrong secret fails.
5. Null/undefined header fails.
6. Malformed hex fails.

- [ ] Step 1: `pnpm add -D vitest` and add `"test:unit": "vitest run"` to scripts.
- [ ] Step 2–4: write hmac.ts, tests, run `pnpm test:unit`.
- [ ] Step 5: commit.

---

### Task 7: ffmpeg / ffprobe wrappers

**Files:** create `lib/transcribe/ffmpeg.ts`.

Two async functions, both shelling out via Node's `spawn` (from `node:child_process`) with array args — never construct a shell command string and never use the unsafe shell-execution variants. The array form passes args directly to the binary, so it is shell-injection safe.

1. `ffprobe(filePath: string): Promise<{ durationSeconds: number; hasAudio: boolean }>` — run `ffprobe` with arguments `['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', filePath]`. Buffer stdout, parse JSON, return `{ durationSeconds: Number(format.duration ?? 0), hasAudio: streams.some(s => s.codec_type === 'audio') }`. Reject with stderr on non-zero exit.

2. `transcodeToOpus(input: string, output: string): Promise<void>` — run `ffmpeg` with arguments `['-y', '-i', input, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'libopus', '-b:a', '32k', '-application', 'voip', output]`. Reject with last 2 KB of stderr on non-zero exit; resolve on zero.

- [ ] Step 1: write the file.
- [ ] Step 2 (manual smoke if any sample file exists; else covered by Task 9 integration).
- [ ] Step 3: commit.

---

### Task 8: Dispatch helper

**Files:** create `lib/transcribe/dispatch.ts`.

Export `dispatchToTranscribeApi({ audioPath, audioFilename, audioMimeType, audioJobId, callbackSecret })` returning `{ externalJobId, queuePosition }`.

Behavior:
- Read config via `getTranscribeConfig()`. Throw if not configured.
- Build `callback_url = ${publicBaseUrl}/api/transcribe/webhook`.
- Stream file from disk → `Blob` (use `Response` constructor on `Readable.toWeb(createReadStream(path))` then `.blob()`).
- Build `FormData` with: `audio` (Blob with filename), `callback_url`, `callback_secret`, `job_metadata: JSON.stringify({ audioJobId })`.
- POST `${url}/v1/jobs` with headers `Authorization: Bearer ${apiKey}`, `CF-Access-Client-Id: ${cfClientId}`, `CF-Access-Client-Secret: ${cfClientSecret}`. Use `AbortSignal.timeout(10 * 60 * 1000)`.
- On non-OK: throw with status + first 500 chars of body. On OK: parse `{ job_id, queue_position }` and return.

- [ ] Step 1: write file.
- [ ] Step 2: commit.

---

### Task 9: Upload route

**Files:** create `app/api/transcribe/upload/route.ts`.

POST handler:
1. Auth via `payload.auth({ headers })`. 401 on no user. 403 if no staff role.
2. Read `formData()`. Require `audio` instanceof File. Read `title`, `kind`, `notes` form fields.
3. Buffer the file to a temp path under `os.tmpdir()`.
4. `ffprobe` it; reject 415 if no audio stream, 400 if duration > 6 hours.
5. Create `audio-files` record via `payload.create({ collection: 'audio-files', file: { data, mimetype, name, size }, data: { durationSeconds, uploader: user.id } })`.
6. Generate `callbackSecret = randomBytes(32).toString('hex')`.
7. Create `audio-jobs` record with `status: 'queued'`, the audioFile id, uploader, title/kind/notes, callbackSecret.
8. Return 201 `{ id: job.id, status: 'queued' }`.
9. Fire `dispatchInBackground(...)` with `void` (don't await). Cleanup temp file in `finally`.

`dispatchInBackground({ audioJobId, audioFilePath, audioFilename, audioMimeType, callbackSecret })`:
- Get config; if not configured, mark job failed with explanatory error and return.
- Set status `dispatching`. Transcode to a sibling `.opus` file. Call `dispatchToTranscribeApi`. Set status `processing` + `externalJobId`.
- On error: read job, increment `dispatchAttempts`. If >= 3, mark failed. Else set status `queued` and schedule retry via `setTimeout` with backoff `[60_000, 300_000, 1_500_000][attempts-1]` ms.
- `finally`: unlink the .opus.

- [ ] Step 1: write file.
- [ ] Step 2: commit.

---

### Task 10: Webhook + status + audio-stream routes

**Files:** create `app/api/transcribe/webhook/route.ts`, `app/api/transcribe/[id]/route.ts`, `app/api/transcribe/[id]/audio/route.ts`.

**Webhook** (`POST`):
1. Read raw body via `req.text()`, parse JSON.
2. Read `body.metadata.audioJobId`. 400 if missing.
3. `payload.findByID({ collection: 'audio-jobs', id, overrideAccess: true })`. 404 if not found. 409 if no `callbackSecret`.
4. `verifySignature(rawBody, headers['x-polymer-transcribe-signature'], job.callbackSecret)`. 401 if invalid.
5. If `status === 'failed'` or no result: update job `{ status: 'failed', error }`. Return ok.
6. Else: map `body.result` to `TranscriptData` (snake → camel for `speaker_id`); compute `searchableText` by joining all segment.text. Upsert into `transcripts` (find existing by audioJob, otherwise create). Update job `{ status: 'completed', transcribedAt: now, error: null }`.
7. Return 200 ok.

**Status** (`GET /:id`):
- Auth required. Return `{ id, status, progress, error, transcribedAt, title, kind }`.

**Audio stream** (`GET /:id/audio`):
- Auth required. Find job with depth 1 to populate `audioFile`. 404 if missing.
- Resolve filesystem path via `process.env.AUDIO_DIR || '/var/www/polymer-media/audio'` + `audioFile.filename`.
- Support HTTP `Range` header: parse `bytes=N-M?`, stream `createReadStream(path, { start, end })` with status 206 + `Content-Range`, `Accept-Ranges`, `Content-Length`, `Content-Type` headers.
- Otherwise stream the whole file, status 200.

- [ ] Step 1: write three files.
- [ ] Step 2: commit.

---

### Task 11: Transcript GET/PATCH + dispatch retry

**Files:** create `app/api/transcribe/[id]/transcript/route.ts`, `app/api/transcribe/[id]/dispatch/route.ts`.

**GET /:id/transcript**: auth; find by `audioJob.equals(id)`; return `{ id, data, editedAt }`. 404 if none.

**PATCH /:id/transcript**: auth; require `body.data.segments` array; recompute `searchableText`; update `data, searchableText, editedAt: now, editedBy: user.id`.

**POST /:id/dispatch (retry)**: auth; load job with depth 1; require `audioFile.filename`; reset `status: 'queued', dispatchAttempts: 0, error: null`; generate fresh `callbackSecret`; in a fire-and-forget IIFE: set status `dispatching`, transcode original audio (under `AUDIO_DIR`), call `dispatchToTranscribeApi`, set status `processing` + `externalJobId`; on error mark `failed`; cleanup .opus in finally.

(The retry route inlines its own dispatch flow rather than importing from the upload route, to avoid a Next.js cyclic resolution at build time. Acceptable duplication for v1.)

- [ ] Step 1: write two files.
- [ ] Step 2: `pnpm typecheck` clean.
- [ ] Step 3: commit.

---

## Phase 3 — Custom Payload UI Shell

### Task 12: JobsListView

**Files:** create `components/Transcribe/JobsListView.tsx`, `components/Transcribe/transcribe.css`; modify `collections/AudioJobs.ts`.

Client component, default export. Uses `@payloadcms/ui` `Gutter` for layout.

State:
- `jobs: Job[]`, `kind: string`, `status: string`, `search: string`, `showUpload: boolean`, `loading: boolean`.

Effect:
- On mount and on filter change, fetch `/api/audio-jobs?depth=1&limit=100&sort=-createdAt&where[kind][equals]=…&where[status][equals]=…&where[title][like]=…` (omit empty filters).

Render:
- Header: "Transcripts" title + green "+ Upload audio" button.
- Filter row: search input, kind select, status select, link to `/admin/transcribe/search`.
- Table with columns: Title, Kind, Status (color pill), Uploader, Created.
- Row click → `router.push('/admin/collections/audio-jobs/${id}')`.
- When `showUpload`: render `<UploadModal>` (Task 13); on `onCreated(id)` push to that job's edit view.

CSS file: status pill colors (queued/dispatching gray, processing blue, completed green, failed red), table hover, filters layout.

Register in `AudioJobs` admin block:
```ts
admin: {
  // … existing …
  components: { views: { list: { Component: '@/components/Transcribe/JobsListView#default' } } },
}
```

- [ ] Step 1–3: css, component, register.
- [ ] Step 4: commit.

---

### Task 13: UploadModal

**Files:** create `components/Transcribe/UploadModal.tsx`.

Props: `{ onClose: () => void; onCreated: (id: number) => void }`.

State: `file`, `title`, `kind`, `notes`, `submitting`, `progress (0–100)`, `error`.

UI:
- Modal overlay (fixed, centered). Click outside closes.
- Drag/drop zone — onDrop sets file and seeds title from filename without extension. Click triggers hidden `<input type="file" accept="audio/*,…">`.
- Inputs: title, kind select (6 options), notes textarea.
- Submit uses `XMLHttpRequest` with `upload.onprogress` for granular progress. POST to `/api/transcribe/upload` with `withCredentials = true`.
- On 201 success → call `onCreated(json.id)`. On error → display message.

- [ ] Step 1–2: write file, commit.

---

### Task 14: JobEditView + StatusPanel + useJobStatus + Editor stub

**Files:** create `components/Transcribe/JobEditView.tsx`, `components/Transcribe/StatusPanel.tsx`, `components/Transcribe/hooks/useJobStatus.ts`, `components/Transcribe/Editor/Editor.tsx` (stub); modify `collections/AudioJobs.ts`.

`useJobStatus(id, intervalMs = 5000)`:
- Polls `/api/transcribe/${id}` every interval until status is `completed` or `failed`.
- Returns latest `JobStatusInfo` or null.
- Cleans up interval on unmount.

`StatusPanel`: takes `info` + `onRetry`. Renders title + sub copy per status, a progress bar (when not completed/failed), the error text (if any), and a "Retry" button when `failed` (calls onRetry which POSTs `/api/transcribe/:id/dispatch`).

`JobEditView`:
- Use `useParams()` to get the audio-job id from the admin URL.
- Hook into `useJobStatus(id)`.
- If `info.status === 'completed'`, render `<Editor audioJobId={id} title kind />`.
- Otherwise render `<StatusPanel info onRetry={...} />`.

`Editor` stub: just `<div>Editor coming for job {audioJobId}…</div>` — full implementation in Phase 4.

Register edit view in AudioJobs admin block:
```ts
components: {
  views: {
    list: { Component: '@/components/Transcribe/JobsListView#default' },
    edit: { default: { Component: '@/components/Transcribe/JobEditView#default' } },
  },
}
```

- [ ] Step 1–4: write files, register.
- [ ] Step 5: smoke test (`pnpm dev`, exercise upload → status panel polling).
- [ ] Step 6: commit.

---

## Phase 4 — Editor Core

### Task 15: useTranscript hook

**Files:** create `components/Transcribe/hooks/useTranscript.ts`.

`useTranscript(audioJobId)` returns `{ data, update, forceSave, saveState }`.

Behavior:
- On mount, `GET /api/transcribe/${id}/transcript` once → `setData(j.data)`.
- `update(next)`: setState immediately, store `dirtyRef = next`, set `saveState = 'dirty'`, debounce 2 s and then call `flush()`.
- `flush()`: PATCH `${id}/transcript` with `{ data: dirtyRef }`. On success → `'saved'`; on error → `'error'`. Clear dirtyRef.
- `forceSave()`: cancel timer, call flush.
- `saveState`: 'idle' | 'dirty' | 'saving' | 'saved' | 'error'.

- [ ] Step 1–2: write, commit.

---

### Task 16: AudioPlayer + useAudioPlayback

**Files:** create `components/Transcribe/Editor/AudioPlayer.tsx`, `components/Transcribe/hooks/useAudioPlayback.ts`.

`AudioPlayer` is `forwardRef<HTMLAudioElement, { audioJobId: string }>`, renders `<audio src="/api/transcribe/${audioJobId}/audio" controls preload="metadata" />`.

`useAudioPlayback(audioRef, data)` returns `{ segmentId: string|null, wordIndex: number|null, time }`. On `timeupdate`, do a binary search over `data.segments` (sorted by start time) to find the active segment, then a linear search across that segment's `words` for the active word.

- [ ] Step 1–2: write, commit.

---

### Task 17: SegmentList (virtualized) + Segment

**Files:** create `components/Transcribe/Editor/SegmentList.tsx`, `components/Transcribe/Editor/Segment.tsx`; modify `package.json`.

`pnpm add react-window` + `pnpm add -D @types/react-window`.

`Segment` (memoized): props `{ seg, speakers, isCurrent, currentWordIndex, onSeek, onTextChange, onSpeakerChange }`. Renders:
- Row 1: speaker `<select>` (options from speakers array, value = seg.speakerId), clickable timestamp button (calls onSeek(seg.start)).
- Row 2: if `seg.edited` or `currentWordIndex === null` → `contentEditable` `<div>` showing seg.text; on blur, call `onTextChange(seg.id, e.currentTarget.textContent ?? '')`.
- Otherwise → list of `<span>`s, one per word, click seeks to word.start, the active word gets `.word--current` class with a yellow background.

`SegmentList` uses `VariableSizeList` from `react-window`:
- `height = 600`, `width = "100%"`, `itemCount = segments.length`, `overscanCount = 5`.
- Estimate row height by `Math.max(60, Math.ceil(words/12) * 24 + 50)` (refine later if needed).
- `useEffect` watches `currentSegmentId` and calls `listRef.current.scrollToItem(idx, 'smart')`.

- [ ] Step 1–3: install, write, commit.

---

### Task 18: SpeakerSidebar + Editor wrapper

**Files:** create `components/Transcribe/Editor/SpeakerSidebar.tsx`; modify `components/Transcribe/Editor/Editor.tsx`.

`SpeakerSidebar`: title "Speakers", a row per speaker. Click row → in-place input (autoFocus, commit on blur or Enter). Show segment count under each label.

`Editor` (full, replacing the stub):
- Uses `useTranscript`, `useAudioPlayback`, `useRef<HTMLAudioElement>`.
- Computes `segmentCounts` via useMemo over `data.segments`.
- Header bar: title + saveState indicator (● Unsaved, ○ Saving…, ✓ Saved, red Save failed).
- Audio player below header.
- Two-column body: SpeakerSidebar (220px) | SegmentList (rest).
- `onSeek`, `onTextChange`, `onSpeakerChange`, `onRename` callbacks rebuild data immutably and call `update(...)`.

- [ ] Step 1–2: write, commit.

---

## Phase 5 — Editor Advanced

### Task 19: Segment utilities + tests

**Files:** create `lib/transcribe/segments.ts`, `tests/lib/transcribe/segments.test.ts`.

Exports:
- `nextSegmentId(segments)` — finds max `seg_NNNN` and returns next as `seg_${(max+1).padStart(4, '0')}`.
- `mergeSegments(data, idA, idB)` — only merges adjacent segments (by index). The merged segment takes the lower id, lower start, higher end, concatenated text (whitespace-collapsed), concatenated word lists, `edited: true`. Result keeps segments sorted by start.
- `splitSegment(data, segmentId, wordIndex)` — splits at word index; refuses 0 or last (no-op). Left keeps the original id; right gets `nextSegmentId`. Both `edited: true`. Right's start = right's first word's start.
- `reassignSpeaker(data, segmentId, newSpeakerId)` — if `newSpeakerId` not in speakers, append `{ id, label: null }` first.

Tests (≥6):
1. `nextSegmentId` returns next zero-padded.
2. Merge two adjacent → one combined segment.
3. Merge non-adjacent → no-op.
4. Split at middle word index → 3 segments total, ids correct.
5. Split at 0 or last → no-op.
6. Reassign to existing → speakers length stable; segment.speakerId updated.
7. Reassign to unknown id → speakers grows by one.

- [ ] Step 1–3: write, run, commit.

---

### Task 20: Wire merge/split/reassign into UI

**Files:** modify `components/Transcribe/Editor/Segment.tsx`, `components/Transcribe/Editor/SegmentList.tsx`, `components/Transcribe/Editor/Editor.tsx`.

Add three optional props on `Segment`: `onMergeAbove`, `onMergeBelow`, `onSplitAt`. Render `↑ merge` / `↓ merge` icons in the segment header (small, low-contrast). In the rendered word `<span>`s, `onClick` checks `e.altKey` — alt-click calls `onSplitAt(seg.id, wordIndex)` instead of seek.

Plumb the props through `SegmentList`'s `Row` to each `Segment`.

In `Editor`, define:
- `onMergeAbove(id)`: locate index, no-op if 0, else `update(mergeSegments(data, segments[idx-1].id, id))`.
- `onMergeBelow(id)`: symmetric.
- `onSplitAt(id, wordIndex)`: `update(splitSegment(data, id, wordIndex))`.

Speaker reassign already works via the `<select>` per segment from Task 17 (Editor's `onSpeakerChange` now uses `reassignSpeaker(data, ...)` instead of inline code so unknown-speaker handling is consistent).

- [ ] Step 1–3: edit Segment, edit SegmentList, edit Editor.
- [ ] Step 4: commit.

---

### Task 21: Find & Replace

**Files:** create `components/Transcribe/Editor/FindReplace.tsx`; modify `components/Transcribe/Editor/Editor.tsx`.

Component: floating panel (top-right, `position: fixed`, z-index 100). State: `find`, `replace`, `regex`, `caseSensitive`, `error`.

`buildPattern()`: returns RegExp or null. If `regex`, construct directly with caught syntax error → set error. Else escape the find string. Flag `g` always; case sensitivity adds/removes `i`.

`matchCount`: aggregate `match(p)?.length ?? 0` across all segments.

`apply()`: maps segments with `text.replace(p, replace)`; if changed, set `edited: true`. Calls `onApply(next)` then `onClose()`.

In Editor: state `showFind`, render conditionally, listen for `cmd/ctrl+f` via `window` keydown effect (preventDefault).

- [ ] Step 1–3: write, wire, commit.

---

### Task 22: Export menu + tests

**Files:** create `lib/transcribe/exporters.ts`, `tests/lib/transcribe/exporters.test.ts`, `components/Transcribe/Editor/ExportMenu.tsx`; modify `components/Transcribe/Editor/Editor.tsx`.

`exporters.ts` exports `buildPlainText(data, includeSpeakers=true)`, `buildSrt(data)`, `buildVtt(data)`, `buildJson(data)`. Internal `fmtTimestamp(t, sep=','|'.')` produces `HH:MM:SS,mmm` (SRT) or `HH:MM:SS.mmm` (VTT). `speakerLabel(speakers, id)` falls back to id when label null.

- TXT: `${speaker}: ${text}\n\n…\n` or just `${text}\n\n…\n`.
- SRT: per-segment cue numbered from 1, comma timestamps.
- VTT: `WEBVTT\n\n` + cue blocks with `<v Speaker>text` syntax.
- JSON: `JSON.stringify(data, null, 2)`.

Tests assert exact strings on a small fixture (2 segments, 2 speakers, one labeled, one not).

`ExportMenu` component: 4 buttons (TXT/SRT/VTT/JSON). Each builds a Blob, makes an object URL, sets `<a download>`, clicks programmatically, revokes URL after a tick.

In `Editor` header, render `<ExportMenu data={data} baseName={(title || 'transcript').replace(/[^a-z0-9-]+/gi, '_')} />`.

- [ ] Step 1–5: write, test, wire, commit.

---

## Phase 6 — Search

### Task 23: Search API route + safe highlight ranges

**Files:** create `app/api/transcribe/search/route.ts`, `lib/transcribe/highlight.ts`, `tests/lib/transcribe/highlight.test.ts`.

`highlight.ts` exports `findMatchRanges(text: string, query: string, opts?: { caseSensitive?: boolean }): Array<{ start: number; end: number }>` — splits `query` into terms (whitespace-separated, quoted-phrase support optional for v1), and returns sorted, non-overlapping ranges where any term occurs. Ranges are character offsets into `text`. Tests cover: single term, multiple terms, overlapping/adjacent merges, empty query → `[]`.

(We compute highlight ranges on the server alongside the snippet, so the client never has to inject HTML — it just renders text segments and `<mark>` React elements based on numeric ranges.)

GET handler:
- Auth required.
- Read `q` query param. Empty → return `{ results: [] }`.
- Determine if user is staff (admin/eic/editor).
- Use `pg.Pool` from `process.env.DATABASE_URL`. Run a parameterized query joining `transcripts` to `audio_jobs`, filtered by FTS match on `to_tsvector('english', searchable_text) @@ websearch_to_tsquery('english', $1)`. For non-staff, also filter `j.uploader_id = $2`.
- Compute snippet client-side prep: select up to ~200 chars around the first match in `searchable_text`. Use `findMatchRanges` to map `q` terms onto the snippet substring (re-zero offsets after slicing).
- Use `ts_rank` to order results, limit 50.
- Return `{ results: [{ transcript_id, audio_job_id, title, kind, uploader_id, snippet, ranges }] }` where `ranges` are the offset pairs into `snippet`.

- [ ] Step 1: write `highlight.ts` + tests; run.
- [ ] Step 2: write search route.
- [ ] Step 3: commit.

---

### Task 24: SearchView page + Snippet component

**Files:** create `app/(payload)/admin/transcribe/search/page.tsx`, `components/Transcribe/Search/SearchView.tsx`, `components/Transcribe/Search/Snippet.tsx`.

`Snippet` (pure component): props `{ text: string; ranges: Array<{ start: number; end: number }> }`. Returns React fragments — slices the string at each range boundary and wraps the in-range slices with a `<mark>` element. **No HTML injection of any kind** — the rendered output is plain text plus React-built `<mark>` elements. Trivial implementation, ~15 lines.

`SearchView` (client): input field, debounced 250 ms, fetch `/api/transcribe/search?q=…`, render results as a list. Each result: linked title (to `/admin/collections/audio-jobs/${audio_job_id}`), kind subtitle, `<Snippet text={r.snippet} ranges={r.ranges} />`.

The page file is a tiny server component that imports and renders the client `SearchView`.

- [ ] Step 1–3: write Snippet, SearchView, page route.
- [ ] Step 4: commit.

---

## Phase 7 — Verification

### Task 25: Lint, typecheck, test, build

- [ ] `pnpm lint` clean.
- [ ] `pnpm typecheck` clean.
- [ ] `pnpm test:unit` all green.
- [ ] `pnpm build` succeeds.
- [ ] Commit any chore fixes.

---

### Task 26: Local end-to-end smoke + deploy wiring

- [ ] `pnpm db:fresh && pnpm dev`.
- [ ] Log in as a writer; click through list → upload (small <10s sample) → status polling.
- [ ] Without homelab live: simulate a webhook delivery via `curl` with HMAC-signed body to verify the receiver path:

  ```bash
  JOB=1
  SECRET=$(psql "$DATABASE_URL" -tAc "SELECT callback_secret FROM audio_jobs WHERE id = $JOB")
  BODY='{"job_id":"x","status":"completed","metadata":{"audioJobId":'$JOB'},"result":{"language":"en","duration":3,"model":"t","speakers":[{"id":"SPEAKER_00"}],"segments":[{"id":"seg_0001","speaker_id":"SPEAKER_00","start":0,"end":3,"text":"Hi","words":[{"word":"Hi","start":0,"end":1}]}]},"error":null}'
  SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | awk '{print $2}')
  curl -X POST http://localhost:3000/api/transcribe/webhook \
    -H "Content-Type: application/json" \
    -H "X-Polymer-Transcribe-Signature: sha256=$SIG" \
    -d "$BODY"
  ```
- [ ] Verify editor renders. Exercise speaker rename, text edit, merge ↑↓, alt-click split, find/replace, exports.
- [ ] Add `TRANSCRIBE_API_URL`, `TRANSCRIBE_API_KEY`, `TRANSCRIBE_CF_ACCESS_CLIENT_ID`, `TRANSCRIBE_CF_ACCESS_CLIENT_SECRET`, `TRANSCRIBE_PUBLIC_BASE_URL` to `.github/workflows/deploy.yml` (the `.env` write step). Note that prod VM needs `ffmpeg` (`pacman -S ffmpeg`).
- [ ] Final commit.

---

## Self-Review

- [x] **Spec coverage:** every spec section has a task. Collections T1–3, migration T4, transport T5–11, custom UI shell T12–14, editor T15–18, advanced T19–22, search T23–24, verification T25–26.
- [x] **No placeholders:** all "TBD" or generic phrases removed; tasks describe concrete behavior + tests.
- [x] **Type consistency:** `TranscriptData`/`Segment`/`Speaker`/`Word` defined once in `lib/transcribe/types.ts`; all consumers reference it. Slugs `audio-files`/`audio-jobs`/`transcripts` consistent in collections, migration table names, and route consumers.
- [x] **Bite-size:** each task ≤ ~6 steps; each step is a single concrete action.

## Out of Scope (per spec)

Real-time collab, per-job sharing UI, DOCX export, model fine-tuning, auto article-draft generation.
