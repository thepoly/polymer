# Audio Upload + Transcription — Design

**Status:** approved 2026-04-28
**Owner:** Ronan
**Implementation:** in this repo (polymer side) + new `polymer-transcribe` repo on homelab

## Goal

Let any user with a `writer`, `editor`, `eic`, or `admin` role upload audio (interviews, meetings, pressers, lectures, court hearings, etc.) directly inside the Payload admin and receive a high-accuracy transcript with speaker diarization and word-level timestamps. Provide a fully custom Payload admin UI for upload, status, transcript editing, and search across past transcripts.

Transcription accuracy is the priority; latency is not. Recordings can be up to 6 hours.

## Architecture

```
[ writer's browser ]
        │ payload-admin session
        ▼
[ polymer (Next.js + Payload) on prod VM ]
        │ multipart, opus 32 kbps mono 16 kHz
        │ over Cloudflare Tunnel + CF Access service token
        ▼
[ polymer-transcribe (FastAPI + WhisperX) on homelab RTX 4070 ]
        │ HMAC-signed webhook
        ▼
[ polymer webhook handler → transcripts row ]
```

Two services, two repos.

- **`polymer` (this repo)** — collections, dispatch, webhook handler, custom Payload admin UI, search.
- **`polymer-transcribe` (new repo, homelab box)** — FastAPI service wrapping WhisperX (faster-whisper backend) + wav2vec2 alignment + pyannote 3.1 diarization. One job at a time on the GPU. Persistent SQLite queue.

The two services communicate only over HTTPS through a Cloudflare Tunnel guarded by Cloudflare Access. The full prompt for the homelab build lives at `docs/superpowers/specs/2026-04-28-polymer-transcribe-prompt.md`.

## Why this shape

- **Custom Payload UI, not the public frontend.** Auth, role check, and document-locking already work in the admin. Writers already use the admin daily.
- **Self-host transcription on a GPU we own.** Source-protection concern: interview audio shouldn't leave our infra to a third-party API. Cloudflare Tunnel gives a public hostname without opening home-network ports.
- **Pre-transcode to opus 32 kbps mono 16 kHz on polymer.** Whisper internally resamples to 16 kHz mono. Sending pre-resampled audio cuts a 6 hr file from 250 MB+ to ~85 MB, fitting under Cloudflare's 100 MB body cap on free/pro plans without accuracy loss.
- **Separate repo for the GPU service.** Different language (Python), different host, different lifecycle. Keeping it out of polymer's CI / Docker contexts.
- **One concurrent GPU job.** A 4070 with 12 GB VRAM holds large-v3 + alignment + pyannote sequentially comfortably; running two at once would OOM. Queue serializes.

## Data Model

Three new Payload collections.

### `audioFiles` (upload-enabled)

Stores raw uploaded audio on disk in `/var/www/polymer-media/audio/`.

| Field | Type | Notes |
|---|---|---|
| (upload built-ins) | — | filename, mimeType, filesize, etc. |
| `durationSeconds` | number | Computed via `ffprobe` in `beforeChange` |
| `uploader` | relationship → users | Set in `beforeChange` from req.user |

Access:
- `read`: uploader + admin/eic/editor.
- `create`: writer/editor/eic/admin.
- `delete`: admin (cascades to audioJobs).

Accept MIME types: `audio/mpeg`, `audio/mp4`, `audio/x-m4a`, `audio/wav`, `audio/x-wav`, `audio/ogg`, `audio/flac`, `audio/webm`, `audio/opus`.

### `audioJobs`

| Field | Type | Notes |
|---|---|---|
| `title` | text | Default = filename, user-editable |
| `kind` | select | `interview` / `meeting` / `presser` / `lecture` / `court` / `other` |
| `notes` | textarea | Free-form |
| `audioFile` | relationship → audioFiles | Required |
| `uploader` | relationship → users | Set in `beforeChange` |
| `status` | select | `queued` / `dispatching` / `processing` / `completed` / `failed` |
| `externalJobId` | text | UUID returned by transcribe API |
| `callbackSecret` | text (hidden) | Random hex generated on dispatch; HMAC key for the webhook |
| `progress` | number 0–100 | Optional, surfaced when API reports it |
| `dispatchAttempts` | number | For retry backoff |
| `error` | textarea | Populated on failure |
| `transcribedAt` | date | Set on webhook success |

Indexes: `status`, `uploader`, `created_at`.

Access:
- `read`: uploader + admin/eic/editor.
- `create`: writer/editor/eic/admin.
- `update`: uploader + admin (only fields the editor exposes).
- `delete`: uploader + admin.

### `transcripts` (1:1 with `audioJobs`)

| Field | Type | Notes |
|---|---|---|
| `audioJob` | relationship → audioJobs | Unique |
| `data` | json | The transcript blob (see shape below) |
| `searchableText` | text (hidden, indexed) | All segment text concatenated, populated on save; backs full-text search |
| `editedAt` | date | Last user edit |
| `editedBy` | relationship → users | |

Postgres: GIN index on `to_tsvector('english', searchable_text)` for fast FTS.

`data` JSON shape:

```json
{
  "language": "en",
  "duration": 3582.4,
  "model": "whisperx-large-v3+pyannote-3.1",
  "speakers": [
    { "id": "SPEAKER_00", "label": "Mayor Smith" },
    { "id": "SPEAKER_01", "label": null }
  ],
  "segments": [
    {
      "id": "seg_0001",
      "speakerId": "SPEAKER_00",
      "start": 12.34,
      "end": 18.91,
      "text": "We have to act now on housing.",
      "words": [
        { "word": "We", "start": 12.34, "end": 12.51, "score": 0.98 }
      ],
      "edited": false
    }
  ]
}
```

`words` keep their original timestamps even after `text` edits (`edited: true` tells the player not to trust word offsets for that segment).

Stored as a single `json` column rather than Payload array fields because a 1-hour transcript can have 5,000+ word objects — array-field rendering would bog down the admin form even though we're not using it.

## API Contract — polymer ↔ polymer-transcribe

Implemented exactly per `docs/superpowers/specs/2026-04-28-polymer-transcribe-prompt.md`. Summary:

- `POST /v1/jobs` — multipart audio, returns `{ job_id, status, queue_position }`.
- `GET /v1/jobs/{id}` — status poll.
- `DELETE /v1/jobs/{id}` — cancel.
- `GET /healthz` — readiness.
- Outbound webhook → polymer's `/api/transcribe/webhook` with `X-Polymer-Transcribe-Signature: sha256=<hex>` (HMAC-SHA256 with the per-job `callbackSecret`).

Three auth layers on requests *into* the GPU service: bearer API key + Cloudflare Access service token (CF-Access-Client-Id/Secret) + the tunnel itself (no public ports). HMAC on the webhook coming back.

## Job Lifecycle

```
upload → audioFile + audioJob(queued) → dispatcher
       → ffmpeg transcode to opus 32 kbps mono 16 kHz
       → multipart POST to /v1/jobs with callback_url + callback_secret
       → store externalJobId, status=processing
       → ... (5–30 min later) ...
       → webhook arrives, HMAC verified
       → upsert transcripts row, status=completed
       → UI poller sees the change, swaps from status panel to editor
```

Failure modes:
- ffmpeg transcode fails → status=failed, error stored.
- Dispatch HTTP fails → exponential backoff 1m / 5m / 25m, max 3 attempts, then status=failed.
- Webhook reports `failed` → record error, surface "retry" button (creates a new audioJob from the same audioFile).
- Webhook with bad signature → 401, no DB write, alert log.
- Webhook for unknown job_id → 404.

## Polymer Routes

| Path | Purpose |
|---|---|
| `app/api/transcribe/upload/route.ts` | Multipart receiver: creates audioFile + audioJob, kicks dispatcher in background |
| `app/api/transcribe/[id]/route.ts` | GET status, DELETE to cancel |
| `app/api/transcribe/[id]/transcript/route.ts` | GET / PATCH transcript JSON (debounced auto-save) |
| `app/api/transcribe/[id]/dispatch/route.ts` | Internal POST to retry dispatch |
| `app/api/transcribe/webhook/route.ts` | HMAC-verified callback from transcribe service |
| `app/api/transcribe/search/route.ts` | Full-text search across user's transcripts |
| `app/api/transcribe/[id]/audio/route.ts` | Streams the original audio for the in-editor player (auth-checked) |

The dispatcher is in-process: the upload route awaits transcode + dispatch (both fast — transcode 30-60s for 1 hr audio, POST is a stream). No new long-running worker; this avoids adding a second PM2 process. If dispatch fails, the row stays `dispatching` with `dispatchAttempts` and a server-side retry timer (a `setTimeout` is fine; if the process restarts, a startup hook re-queues stuck `dispatching` rows).

## Custom Payload Admin UI

All views are registered via `admin.components` in the `audioJobs` collection.

```ts
// In Audio Jobs collection
admin: {
  components: {
    views: {
      list: { Component: '@/components/Transcribe/JobsListView#default' },
      edit: {
        default: { Component: '@/components/Transcribe/JobEditView#default' },
      },
    },
  },
}
```

### Components

```
components/Transcribe/
  JobsListView.tsx               # custom list: filters, status pills, "Upload audio" CTA
  UploadModal.tsx                # drag/drop, kind picker, posts to /api/transcribe/upload
  JobEditView.tsx                # routes between Status / Editor based on status
  StatusPanel.tsx                # queued/processing/failed UI; polls /api/transcribe/[id]
  Editor/
    Editor.tsx                   # the full editor wrapper
    AudioPlayer.tsx              # custom <audio> with word-level seek + current-word highlight
    SpeakerSidebar.tsx           # rename + reassign
    SegmentList.tsx              # virtualized via react-window
    Segment.tsx                  # single segment: speaker pill, contenteditable text, timestamps
    FindReplace.tsx              # regex toggle, find/replace across all segments
    ExportMenu.tsx               # TXT / SRT / VTT / JSON
    contextMenu.tsx              # split, merge above/below, change speaker
  Search/
    SearchView.tsx               # admin route /admin/transcribe/search
  hooks/
    useTranscript.ts             # state + 2s debounced PATCH save
    useAudioPlayback.ts          # current word tracking from audio element
    useJobStatus.ts              # poll status while queued/processing
  utils/
    segments.ts                  # split/merge/reassign helpers (deterministic seg ids)
    exporters.ts                 # buildSrt, buildVtt, buildPlainText
  transcribe.css                 # editor-specific styles
```

### Editor mechanics

- **Speaker rename:** click pill → inline input → updates `speakers[i].label`.
- **Speaker reassign:** right-click segment → dropdown of speakers + "New speaker" (adds `SPEAKER_NN`).
- **Text edit:** segment text is contenteditable. On blur, set `edited: true`, update `text`. Word array unchanged.
- **Segment merge** (with neighbor): concatenates text, takes earliest start + latest end, keeps speaker of first segment. New `id = seg_NNNN` reusing the lower id.
- **Segment split:** at cursor position, splits text in two; new segment timestamps interpolated by word-position ratio.
- **Find/Replace:** regex toggle. Operates on segment text in-memory; saves through normal debounce.
- **Audio sync:** `<audio>` `timeupdate` → find segment+word containing currentTime → scroll into view, apply `.is-current` class.
- **Save:** 2 s inactivity debounce → PATCH `/api/transcribe/[id]/transcript` with full `data` JSON. Optimistic UI; banner on conflict (last-write-wins for v1).
- **Keyboard:** space (play/pause), ⌘/ctrl+f (find), ⌘/ctrl+s (force save), ⌘/ctrl+z/y (undo/redo via local history stack).

### Export formats

- **TXT** — plain or `[Speaker]: text\n\n…`, configurable in the menu.
- **SRT** — sequential indices, `HH:MM:SS,mmm` timestamps, one segment per cue.
- **VTT** — `WEBVTT` header + cue blocks.
- **JSON** — raw `transcripts.data`.

All client-side via `Blob` + `URL.createObjectURL`.

### Search view

`/admin/transcribe/search` — custom non-collection admin route. Searches `transcripts.searchable_text` via Postgres FTS, returns: title, kind, uploader, snippet with `<mark>`-highlighted match, link to editor scrolled to first hit. Scoped by access rules (writers see own, editors+ see all).

## Migration Plan

Per CLAUDE.md, both files must be added.

### TypeScript migration

`migrations/20260428_100000_add_audio_transcription.ts` registered in `migrations/index.ts`.

DDL:
- `audio_files` (upload table, mirrors `media`-style columns minus image sizes).
- `audio_jobs` with FK to `audio_files`, FK to `users`.
- `transcripts` with FK to `audio_jobs`, `data jsonb`, `searchable_text text`, generated `tsvector` GIN index.
- Enum types: `enum_audio_jobs_kind`, `enum_audio_jobs_status`.
- `payload_locked_documents_rels` columns + FKs for the three new collections.

### SQL migration script

Equivalent block appended to `scripts/run_deploy_sql_migrations.sh`, with a tracking INSERT entry: `('20260428_100000_add_audio_transcription', <next-batch>, NOW(), NOW())`.

## Configuration / Env

Polymer:
- `TRANSCRIBE_API_URL` — e.g. `https://transcribe.<domain>`
- `TRANSCRIBE_API_KEY` — bearer token
- `TRANSCRIBE_CF_ACCESS_CLIENT_ID`
- `TRANSCRIBE_CF_ACCESS_CLIENT_SECRET`
- `TRANSCRIBE_PUBLIC_BASE_URL` — polymer's public origin used to build `callback_url`

Update `scripts/generate-env.js` to include the new vars (with stub values for local dev). Update the deploy workflow's secrets list.

## Error Handling Summary

| Failure | Behavior |
|---|---|
| Upload > 1 GB or > 6 hr | 413 / 400 with clear message |
| Bad MIME or bad ffprobe | 415 |
| Transcode fail | status=failed, error stored |
| Dispatch transient fail | retry 1m/5m/25m, then failed |
| Webhook bad signature | 401, no write, log alert |
| Webhook unknown job_id | 404 |
| Webhook reports failure | status=failed, error stored, "retry" CTA in UI |
| Concurrent edit (409) | banner + reload offer |
| Audio fetch in editor (auth fail) | 403 |

## Testing Strategy

**Unit:**
- HMAC verification (valid, tampered body, missing header, wrong key).
- Segment merge/split utilities (deterministic ids, timestamp interpolation, edge cases: first/last segment, empty selection).
- Export builders (SRT, VTT, TXT) — golden snapshots.
- ffprobe wrapper.

**Integration (against a mock transcribe API):**
- Full upload → mocked dispatch → mock webhook → transcript visible.
- Permission tests: writer A cannot read writer B's job; editor can read both.
- Retry path: transcribe API 503 → dispatch retries → eventually fails after 3.

**E2E (Playwright, `tests/transcribe-flow.spec.ts`):**
- Log in as writer → upload sample audio (10s clip in `tests/fixtures/audio/`) → status panel renders → simulate webhook delivery → editor renders → rename speaker → reload → rename persists.

**Manual once homelab is online:**
- Real 5-min, 30-min, 2-hr samples through the live tunnel.

CI already runs lint/typecheck/build/migrate. Playwright stays out of CI for now (per existing pattern); the new spec is run locally + during the deploy smoke check.

## Build Phases

Sequenced so each phase ships something testable.

1. **Foundation** — collections, migrations (TS + SQL), payload-types regen, ffprobe util.
2. **Transport** — upload route, ffmpeg transcoder, dispatch util, webhook handler with HMAC, internal status route, mock-API integration test.
3. **Custom UI shell** — JobsListView (replaces Payload's default), UploadModal, JobEditView routing, StatusPanel with polling.
4. **Editor core** — AudioPlayer, SegmentList (virtualized), Segment, SpeakerSidebar, useTranscript debounced save.
5. **Editor advanced** — speaker reassign, segment merge/split, FindReplace, ExportMenu.
6. **Search** — searchable_text population + tsvector index, search API route, SearchView.
7. **Tests + polish** — unit tests, Playwright e2e, lint + typecheck, deploy env wiring.

The homelab service (`polymer-transcribe`) is built in parallel using the prompt at `docs/superpowers/specs/2026-04-28-polymer-transcribe-prompt.md`.

## Out of Scope (v1)

- Real-time collaborative editing (last-write-wins is fine).
- Per-job sharing UI (role-based visibility covers it).
- DOCX export (drop in later if asked).
- Custom prompt / fine-tuning of Whisper.
- Automatic article-draft generation from transcripts.
