# Build polymer-transcribe — a GPU transcription microservice

> Paste this entire document into a fresh Claude Code session on the homelab box. It is the complete brief.

You are building a brand-new repo, **`polymer-transcribe`**, on this homelab box. It's a FastAPI service that wraps WhisperX + pyannote for high-accuracy transcription with speaker diarization, exposed publicly via a Cloudflare Tunnel guarded by Cloudflare Access. It's consumed by a separate app called `polymer` (a Next.js + Payload CMS newsroom platform) running elsewhere; this repo only knows the API contract below.

Use the superpowers skills for this work — especially `brainstorming` (briefly, since this prompt nails down the design), `writing-plans`, `test-driven-development`, and `verification-before-completion`. Don't skip the plan.

## Hardware & host

- Arch Linux homelab, NVIDIA RTX 4070 (12 GB VRAM), recent CUDA-capable driver.
- Service runs as a dedicated system user (`transcribe`), under systemd, on `127.0.0.1:8088`.
- Public exposure is via `cloudflared` named tunnel only; no inbound ports opened.

## Goal

Accept multipart audio uploads, run WhisperX large-v3 + wav2vec2 alignment + pyannote-3.1 diarization, then POST the result back to a caller-supplied webhook. One job at a time on the GPU, with a persistent queue that survives restarts. Accuracy is the priority; throughput is not.

## Stack (pin these)

- Python 3.11
- FastAPI + uvicorn (single worker; the GPU is the bottleneck)
- whisperx (faster-whisper backend, fp16, batch_size=8)
- pyannote.audio 3.1 (requires accepting the model license on Hugging Face and an `HF_TOKEN`)
- httpx for outbound webhooks
- aiosqlite for the job store
- pydantic v2 for schemas
- python-multipart for uploads

## Repo layout

```
polymer-transcribe/
  pyproject.toml                # uv or pip-tools managed; pin everything
  README.md                     # setup, env vars, systemd, cloudflared
  src/polymer_transcribe/
    __init__.py
    main.py                     # FastAPI app factory
    config.py                   # env/settings via pydantic-settings
    api/
      jobs.py                   # POST/GET/DELETE /v1/jobs
      health.py                 # GET /healthz
      auth.py                   # bearer-token dependency
    core/
      queue.py                  # asyncio.Queue + worker loop
      store.py                  # aiosqlite job persistence
      pipeline.py               # whisperx + pyannote wrapper
      webhook.py                # HMAC-signed callback w/ retry
      audio.py                  # ffprobe validation, normalization
      models.py                 # pydantic schemas
  tests/
    test_api_jobs.py
    test_pipeline_smoke.py      # tiny 5-second clip, real GPU
    test_webhook_signing.py
    test_queue_recovery.py
  deploy/
    polymer-transcribe.service  # systemd unit
    cloudflared-config.yml      # named tunnel config template
    install.sh                  # one-shot setup script
  data/                         # gitignored: sqlite, audio uploads, model cache
```

## API contract — implement EXACTLY this

(All endpoints under `/v1` except `/healthz`. JSON unless stated.)

### `POST /v1/jobs` (multipart/form-data)

Auth: `Authorization: Bearer <TRANSCRIBE_API_KEY>`.

Form fields:
- `audio` — file (required). Accept: opus, wav, mp3, flac, m4a, ogg, mp4. Reject anything else with 415.
- `callback_url` — https URL (required).
- `callback_secret` — hex string (required), used as HMAC-SHA256 key for the webhook.
- `job_metadata` — JSON string (optional), opaque to us, returned verbatim in the webhook.
- `language` — ISO 639-1 code (optional). Default: auto-detect.
- `min_speakers`, `max_speakers` — int (optional).

Behavior:
1. Validate auth → 401 on miss.
2. ffprobe the upload; reject if duration > 6 hours or no audio stream → 400.
3. Persist file to `${DATA_DIR}/audio/<job_id>.<ext>`.
4. Insert job row in SQLite (`status=queued`).
5. Enqueue.
6. Respond `201 { job_id, status: "queued", queue_position }`.

### `GET /v1/jobs/{job_id}`

Auth: Bearer. Returns current row: `{ job_id, status, progress, queue_position, error }`. 404 if unknown.

### `DELETE /v1/jobs/{job_id}`

Auth: Bearer. If queued → mark cancelled, drop from queue. If processing → set a cancel flag the worker checks between phases (transcribe / align / diarize). Respond 204. The cancelled job sends a `failed` webhook with `error: "cancelled"`.

### `GET /healthz`

No auth. `{ status, gpu_available, model_loaded, queue_depth, version, uptime_s }`. Used by the tunnel and by polymer's monitoring.

### Outbound webhook → `callback_url`

After a job finishes (success OR failure), POST JSON. Compute `sha256_hmac = HMAC-SHA256(raw_body_bytes, callback_secret)`. Send headers:

```
Content-Type: application/json
X-Polymer-Transcribe-Signature: sha256=<hex>
X-Polymer-Transcribe-Job-Id: <uuid>
```

Body:
```json
{
  "job_id": "<uuid>",
  "status": "completed" | "failed",
  "metadata": <whatever was passed as job_metadata, parsed back to JSON>,
  "result": {
    "language": "en",
    "duration": 3582.4,
    "model": "whisperx-large-v3+pyannote-3.1",
    "speakers": [{"id": "SPEAKER_00"}, {"id": "SPEAKER_01"}],
    "segments": [{
      "id": "seg_0001",
      "speaker_id": "SPEAKER_00",
      "start": 12.34,
      "end": 18.91,
      "text": "We have to act now on housing.",
      "words": [{"word": "We", "start": 12.34, "end": 12.51, "score": 0.98}]
    }]
  } | null,
  "error": null | "string"
}
```

Retry policy: on non-2xx or network error, retry 5 times with exponential backoff (1s, 4s, 16s, 64s, 256s). After 5 failures, log and give up but leave job marked `completed`/`failed` in our store. The receiver MUST be idempotent on `job_id`.

## Pipeline details

- Models load **once at startup** (cold start ~30–90s on RTX 4070); never per-job. Block readiness (`/healthz` reports `model_loaded: false`) until done.
- Order: faster-whisper transcribe → wav2vec2 align (English: `WAV2VEC2_ASR_LARGE_LV60K_960H`; other languages: WhisperX's auto-pick) → pyannote diarize → assign speakers to words.
- compute_type=`float16`, batch_size=`8`, device=`cuda`. If `int8_float16` gives noticeable accuracy hit, prefer fp16.
- VAD filter on (silero).
- Segment IDs must be deterministic (`seg_0001`, `seg_0002`, …) so polymer can diff edits sanely.
- After each job: `torch.cuda.empty_cache()`. If a job throws OOM, fail it cleanly and continue serving — never leave the worker dead.
- Delete the audio file from disk after a successful webhook delivery. On failure, keep for `${FAILED_AUDIO_RETENTION_DAYS:-7}` days.

## Queue & restart resilience

- One asyncio worker, one job at a time.
- SQLite stores: `id, status, audio_path, callback_url, callback_secret, job_metadata, language, min_speakers, max_speakers, queue_position, progress, error, created_at, started_at, finished_at`.
- On startup: any row in `processing` → revert to `queued` (it didn't survive the restart) and re-enqueue at front. Any in `queued` re-enqueued in `created_at` order.
- Progress reporting: emit 0/25/50/75/100 between phases (transcribe / align / diarize / done) — fine-grained progress isn't worth it for a single-GPU service.

## Security model

Three layers, all required:

1. **Cloudflare Tunnel** — `cloudflared` outbound to CF, no inbound ports. Configured via `deploy/cloudflared-config.yml` (template; the operator fills in tunnel ID + hostname).
2. **Cloudflare Access "service auth" application policy** — on `transcribe.<domain>`. Edge rejects requests missing valid `CF-Access-Client-Id` + `CF-Access-Client-Secret`. README documents exactly how to set up the Access app and generate the service token.
3. **Bearer `TRANSCRIBE_API_KEY`** — checked by FastAPI itself. Defense-in-depth in case CF Access is misconfigured.

The webhook direction uses HMAC-SHA256 with the per-job `callback_secret` so polymer can verify a webhook came from us without sharing a long-lived secret.

## Configuration (env)

```
TRANSCRIBE_API_KEY=<long random hex>
HF_TOKEN=<HuggingFace token with pyannote-3.1 license accepted>
DATA_DIR=/var/lib/polymer-transcribe
HOST=127.0.0.1
PORT=8088
WHISPER_MODEL=large-v3
COMPUTE_TYPE=float16
BATCH_SIZE=8
MAX_AUDIO_HOURS=6
WEBHOOK_TIMEOUT_S=30
FAILED_AUDIO_RETENTION_DAYS=7
LOG_LEVEL=info
```

`.env.example` checked in; real `.env` written by `install.sh` from prompts.

## Build order

1. `install.sh`: create `transcribe` user, install system deps (ffmpeg, libsndfile), create venv, `pip install -e .`, create `DATA_DIR` with right perms, install systemd unit, prompt for env values.
2. Implement schemas, store, queue, pipeline, API in that order with TDD.
3. Smoke-test locally with curl + a 10-second sample clip.
4. Set up `cloudflared` named tunnel + Access service-auth app (README walks the operator through it).
5. End-to-end test through the tunnel from another machine.

## Acceptance criteria

- `pytest` green; pipeline test transcribes a real 10-second sample and produces aligned, diarized output.
- `systemctl status polymer-transcribe` clean; `/healthz` returns `model_loaded: true` after ~60s startup.
- A 30-min real audio file submitted via `curl` through the tunnel completes in under 15 minutes wall-clock and delivers a signature-verified webhook to a test sink (`https://webhook.site` is fine for first verification).
- Killing the service mid-job and restarting → job picks up from `queued` (a fresh full re-run; we don't checkpoint mid-pipeline).
- README has the exact `cloudflared` + Access setup steps, the systemd commands, and a `curl` example.

When the service is up and the tunnel works, hand back: the public hostname, the bearer API key, the CF Access client id/secret, and a sample webhook body. Polymer integration on the other side keys off those.
