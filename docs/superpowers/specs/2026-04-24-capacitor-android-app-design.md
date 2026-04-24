# Capacitor Android App — Design Spec

**Date:** 2026-04-24
**Status:** Approved, in implementation
**Owner:** Ronan

## Overview

Ship "The Poly" as an Android app by wrapping the production web site (`https://poly.rpi.edu`) in a Capacitor WebView. Distribute via GitHub Releases (APK) — no Google Play in v1. Add push notifications for breaking news.

## Goals

- Native-feeling Android app that shows the full Polymer site, including admin
- Push notifications for articles marked `breakingNews: true`
- Auto-build + publish Android release to GitHub on every push to `main` that touches mobile code
- Manual major-version tagging for intentional releases
- Status bar + navigation bar match system / WebView theme for a native feel
- Monochrome "themed icon" support on Android 13+

## Non-Goals (v1)

- Google Play Store listing (paperwork in parallel, not blocking)
- iOS app
- Offline reading / caching of articles
- Static export of Next.js routes
- Blocking admin from the app

## Architecture

**Pattern:** Capacitor remote-URL shell.

```
┌─────────────────────────────────────────────────────┐
│ Android App ("The Poly")                            │
│                                                     │
│   ┌──────────────────────────────────────────┐      │
│   │ System status bar (themed)               │      │
│   ├──────────────────────────────────────────┤      │
│   │ Capacitor WebView                        │      │
│   │   loads https://poly.rpi.edu             │      │
│   │   CSS prefers-color-scheme handles dark  │      │
│   │   Theme button in site header overrides  │      │
│   ├──────────────────────────────────────────┤      │
│   │ System nav bar (themed)                  │      │
│   └──────────────────────────────────────────┘      │
│                                                     │
│   Native plugins: StatusBar, PushNotifications      │
└─────────────────────────────────────────────────────┘
                    ↕
      ┌──────────────────────────────┐
      │ poly.rpi.edu (Next + Payload)│
      │   /api/push/register         │
      │   /api/push/send-to-all      │ (internal, called by hook)
      │   Articles.afterChange hook  │
      └──────────────────────────────┘
                    ↕
              ┌───────────┐
              │  FCM v1   │
              └───────────┘
```

Every web change deploys to prod and is instantly live in the app — no app rebuild required for content or UI.

## Repo Layout

```
polymer/
├── mobile/
│   ├── package.json                          # Capacitor deps only
│   ├── capacitor.config.ts                   # server.url = prod
│   ├── tsconfig.json
│   ├── android/                              # Generated Android project
│   │   └── app/
│   │       ├── build.gradle                  # signing config from env
│   │       ├── google-services.json          # copied from secret at CI build
│   │       └── src/main/
│   │           ├── AndroidManifest.xml       # intent filters for deep links
│   │           ├── java/.../MainActivity.java
│   │           └── res/
│   │               ├── values/colors.xml     # light mode bar colors
│   │               ├── values-night/colors.xml   # dark mode bar colors
│   │               ├── values/themes.xml     # Theme.AppCompat.DayNight
│   │               ├── mipmap-anydpi-v26/ic_launcher.xml  # adaptive + monochrome
│   │               ├── drawable/ic_launcher_foreground.xml   # red "p"
│   │               ├── drawable/ic_launcher_monochrome.xml   # single-tone "p" for themed icons
│   │               └── mipmap-*/ic_launcher.{png,webp}       # raster fallbacks
│   ├── resources/                            # source art for @capacitor/assets
│   │   ├── icon.png                          # 1024×1024 red p on white (foreground)
│   │   ├── icon-background.png               # white bg
│   │   ├── icon-foreground.png               # red p
│   │   ├── icon-monochrome.png               # solid p silhouette for themed icons
│   │   └── splash.png                        # red p on theme-appropriate bg
│   └── scripts/
│       └── sync-version.mjs                  # bumps android versionCode/versionName
│
├── app/api/push/
│   ├── register/route.ts                     # POST; upserts device token
│   └── send/route.ts                         # internal; called by hook
├── collections/
│   ├── Articles.ts                           # adds breakingNews: checkbox
│   └── DeviceTokens.ts                       # NEW collection
├── lib/
│   └── fcm.ts                                # FCM v1 sender (service account JWT)
├── migrations/
│   ├── 20260424_010000_add_breaking_news.ts
│   ├── 20260424_020000_add_device_tokens.ts
│   └── index.ts                              # registers both
├── scripts/
│   └── run_deploy_sql_migrations.sh          # matching SQL + tracking INSERTs
└── .github/workflows/
    └── android-build.yml                     # auto-release on main, manual tags
```

## Android Identity

- **Package name**: `edu.rpi.poly`
- **Display name**: `The Poly`
- **Version naming**:
  - `versionName` = `x.y.z` (e.g. `0.0.0`)
  - `versionCode` = monotonic integer bumped by CI
  - Git tag format: `vX.Y.Z-android` (platform suffix distinguishes from potential future iOS/web tags)
  - First release: `v0.0.0-android`

## Theming (native bars)

- Android parent theme: `Theme.AppCompat.DayNight`
- `values/colors.xml` (light):
  - `statusBarColor` = `#FFFFFF`, status bar icons dark
  - `navigationBarColor` = `#FFFFFF`, nav bar icons dark
- `values-night/colors.xml` (dark):
  - `statusBarColor` = `#0A0A0A` (matches site `prefers-color-scheme: dark` color in `app/(frontend)/layout.tsx:98`)
  - `navigationBarColor` = `#0A0A0A`, nav bar icons light
- `@capacitor/status-bar` plugin used to override dynamically if the user toggles the site's theme button (which overrides system theme)
- A tiny `window.postMessage` bridge injected into the WebView that notifies the Capacitor app when the site's resolved theme class (`html.dark`) changes, and calls `StatusBar.setStyle()` + `StatusBar.setBackgroundColor()` accordingly
- Splash screen uses `values/` and `values-night/` to pick the right background color

## App Icon

- **Not theme-reactive** for the foreground (red "p" always red, white background always white)
- **Monochrome variant** provided so Android 13+ users who enable "Themed icons" in system settings get a dynamic-color version (rendered by the OS from a single-color silhouette)
- Adaptive icon XML: `mipmap-anydpi-v26/ic_launcher.xml` references `@drawable/ic_launcher_background`, `@drawable/ic_launcher_foreground`, `@drawable/ic_launcher_monochrome`

## Push Notifications

### Backend

**Collection: `device-tokens`**

```ts
{
  slug: 'device-tokens',
  admin: { useAsTitle: 'token' },
  access: {
    read: ({ req: { user } }) => Boolean(user?.roles?.includes('admin')),
    create: () => true,   // anonymous device registration
    update: () => false,
    delete: ({ req: { user } }) => Boolean(user?.roles?.includes('admin')),
  },
  fields: [
    { name: 'token', type: 'text', required: true, unique: true, index: true },
    { name: 'platform', type: 'select', options: ['android', 'ios'], required: true, defaultValue: 'android' },
    { name: 'lastSeenAt', type: 'date' },
  ],
  timestamps: true,
}
```

**Article field addition:**

```ts
{
  name: 'breakingNews',
  type: 'checkbox',
  defaultValue: false,
  admin: {
    description: 'Fires a push notification to mobile app users when this article is published.',
    position: 'sidebar',
  },
}
```

**API routes:**

- `POST /api/push/register` — body `{ token, platform? }`. Upserts into `device-tokens`, sets `lastSeenAt = now`. No auth required. Rate-limited loosely (one registration per token per minute) to deter abuse.
- `POST /api/push/send` — internal endpoint, accepts `{ articleId }`, requires a shared secret header (`x-internal-secret`). Invoked from the article hook. Fetches article, fetches all tokens, sends FCM.

**Migrations (dual-path per CLAUDE.md):**

1. `20260424_010000_add_breaking_news.ts` — adds `breaking_news BOOLEAN DEFAULT FALSE` to `articles` and `_articles_v` (drafts table)
2. `20260424_020000_add_device_tokens.ts` — creates `device_tokens` table with `id`, `token UNIQUE`, `platform`, `last_seen_at`, `created_at`, `updated_at`

Both must also be added to `scripts/run_deploy_sql_migrations.sh` with tracking INSERT entries.

**Hook update (collections/Articles.ts):**

Extend the existing `afterChange` hook (which already detects publish transitions) so when `doc.breakingNews === true` AND (isNowPublished && !wasPublished):
- Call the internal `/api/push/send` endpoint asynchronously (fire-and-forget, with error logging)
- Do not block article save on FCM success

**FCM sender (`lib/fcm.ts`):**

- Reads `FCM_SERVICE_ACCOUNT_JSON` env var (production: lives in `/var/www/polymer/shared/.env`)
- Mints a JWT for the service account, exchanges for an OAuth token
- POSTs to `https://fcm.googleapis.com/v1/projects/{projectId}/messages:send`
- Batches if token count is high (FCM v1 has per-message caps; use `multicast` or iterate)
- If `FCM_SERVICE_ACCOUNT_JSON` is missing, logs a warning and returns — non-fatal, lets the app build/deploy without Firebase set up yet

### App side

- Install `@capacitor/push-notifications`
- On first launch: request permission, register with FCM, POST the received token to `https://poly.rpi.edu/api/push/register`
- Listen for notification taps — navigate the WebView to `data.articleUrl`
- Listen for foreground messages — optionally show an in-app banner (v1: just log; notification is already shown by system)

**Firebase setup (user-side, one-time):**
1. Create Firebase project "The Poly"
2. Add Android app with package `edu.rpi.poly`
3. Download `google-services.json` → encode as `GOOGLE_SERVICES_JSON_BASE64` GH secret
4. Generate service account key → encode as `FCM_SERVICE_ACCOUNT_JSON` env var (prod `.env` + GH secret for preview builds)

Until these secrets are set:
- CI build injects a placeholder `google-services.json` (app builds, push plugin initializes but can't register)
- Backend `lib/fcm.ts` short-circuits to log-only

This allows `v0.0.0-android` to ship as a functional shell before Firebase is wired up. Push notifications become live in the next release once Firebase is set up.

## GitHub Release Workflow

**File:** `.github/workflows/android-build.yml`

**Triggers:**

1. `push` to `main` where `mobile/**` OR `.github/workflows/android-build.yml` changed
   - Auto-bumps patch version (reads current `versionName`, increments `Z`)
   - Creates tag `vX.Y.Z-android` automatically
   - Builds APK
   - Creates GitHub Release with APK attached
2. `push` of tag matching `v*.*.*-android` (manual major/minor tag)
   - Builds APK at that tag
   - Creates GitHub Release with APK attached
3. `workflow_dispatch` (manual run button)
   - Builds APK, uploads as workflow artifact, does not create a Release

**Jobs:**

```yaml
name: Android Build & Release

on:
  push:
    branches: [main]
    paths: [mobile/**, .github/workflows/android-build.yml]
    tags: ['v*.*.*-android']
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - uses: pnpm/action-setup@v4
        with: { version: 10 }
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: 17 }
      - uses: android-actions/setup-android@v3

      - name: Determine version
        id: version
        run: |
          if [[ "$GITHUB_REF" == refs/tags/v* ]]; then
            echo "version=${GITHUB_REF#refs/tags/v}" >> $GITHUB_OUTPUT
            echo "auto_tag=false" >> $GITHUB_OUTPUT
          else
            # auto-bump patch from last android tag
            LAST=$(git tag -l 'v*.*.*-android' --sort=-v:refname | head -1)
            NEXT=$(node mobile/scripts/bump-patch.mjs "$LAST")
            echo "version=$NEXT" >> $GITHUB_OUTPUT
            echo "auto_tag=true" >> $GITHUB_OUTPUT
          fi

      - name: Install deps
        run: pnpm install --frozen-lockfile

      - name: Install mobile deps
        working-directory: mobile
        run: pnpm install --frozen-lockfile

      - name: Write google-services.json
        run: |
          if [[ -n "${{ secrets.GOOGLE_SERVICES_JSON_BASE64 }}" ]]; then
            echo "${{ secrets.GOOGLE_SERVICES_JSON_BASE64 }}" | base64 -d > mobile/android/app/google-services.json
          else
            cp mobile/android/app/google-services.json.placeholder mobile/android/app/google-services.json
          fi

      - name: Write keystore (if provided)
        id: keystore
        run: |
          if [[ -n "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" ]]; then
            echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d > mobile/android/app/release.keystore
            echo "signed=true" >> $GITHUB_OUTPUT
          else
            echo "signed=false" >> $GITHUB_OUTPUT
          fi

      - name: Set version in Gradle
        run: node mobile/scripts/sync-version.mjs ${{ steps.version.outputs.version }}

      - name: Sync Capacitor
        working-directory: mobile
        run: npx cap sync android

      - name: Build APK (signed)
        if: steps.keystore.outputs.signed == 'true'
        working-directory: mobile/android
        env:
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
        run: ./gradlew assembleRelease

      - name: Build APK (debug fallback)
        if: steps.keystore.outputs.signed == 'false'
        working-directory: mobile/android
        run: ./gradlew assembleDebug

      - name: Push auto tag
        if: steps.version.outputs.auto_tag == 'true'
        run: |
          git tag v${{ steps.version.outputs.version }}-android
          git push origin v${{ steps.version.outputs.version }}-android

      - name: Create GitHub Release
        if: github.event_name != 'workflow_dispatch'
        uses: softprops/action-gh-release@v2
        with:
          tag_name: v${{ steps.version.outputs.version }}-android
          name: Android v${{ steps.version.outputs.version }}
          generate_release_notes: true
          files: |
            mobile/android/app/build/outputs/apk/release/*.apk
            mobile/android/app/build/outputs/apk/debug/*.apk

      - name: Upload workflow artifact
        if: github.event_name == 'workflow_dispatch'
        uses: actions/upload-artifact@v4
        with:
          name: apk-${{ steps.version.outputs.version }}
          path: mobile/android/app/build/outputs/apk/**/*.apk
```

**Required GH secrets (for fully signed release):**
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `GOOGLE_SERVICES_JSON_BASE64`

**Until secrets are set:** the workflow falls back to building a **debug APK** (installable on any Android device with "Install from unknown sources" enabled). Debug APKs can never be uploaded to Play Store; they're for sideloading and internal testing only. Once secrets land, every future build produces a signed release APK.

**Keystore generation (operator action, one-time):**

```bash
keytool -genkey -v -keystore release.keystore -alias polymer \
  -keyalg RSA -keysize 2048 -validity 10000
base64 release.keystore > release.keystore.b64
# paste into GH secret ANDROID_KEYSTORE_BASE64
# store release.keystore itself in a password manager — losing it means you can
# never publish updates under the same Play Store listing in the future
```

## Release Flow

- **Automatic (patch)**: merge a PR to `main` that touches `mobile/**` → workflow auto-bumps patch, tags `vX.Y.(Z+1)-android`, publishes GitHub Release
- **Manual (minor/major)**:
  ```bash
  git tag v0.1.0-android
  git push origin v0.1.0-android
  ```
  Workflow runs on the tag, builds, publishes GitHub Release

## Install Instructions (README addition)

- Download latest `app-release.apk` (or `app-debug.apk` pre-signing) from Releases
- Enable "Install unknown apps" for the browser/file manager
- Tap the APK to install
- Launch "The Poly"

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Users think WebView = not a real app | Native status/nav bar theming + real app icon + splash make it feel native. Play Store reviewers may still flag; acceptable since we're not shipping to Play in v1. |
| Keystore lost → can't update in Play Store later | Generate now, store in password manager AND as GH secret. Document location in this spec. |
| FCM abuse (anon device token register) | Rate-limit `/api/push/register`, ignore malformed tokens; worst case is one row per bad actor, cheap to clean up |
| Sending push to 10k+ tokens exceeds FCM batch | v1 audience is small. If it grows, batch by 500 or use topic messaging |
| Site outage → app useless | Offline fallback screen with retry. No offline reading in v1. |
| Deep links mis-route | Intent filter for `https://poly.rpi.edu/*` with `android:autoVerify="true"`, hosted `assetlinks.json` at prod |

## Success Criteria

- `v0.0.0-android` GitHub Release exists with an installable debug APK
- APK installs on an Android device
- App launches, loads poly.rpi.edu
- Theme button in site header changes status/nav bar colors natively
- Android 13+ "Themed icons" setting produces a monochrome "p" (not the default red-on-white)
- Auto-tag workflow fires on next push to `main` touching `mobile/**`

## Out of Scope Reminders

- No Play Store submission until operator has created a Play Console account + completed verification
- No iOS — mobile/ directory structure leaves room to add ios/ later
- No offline reading; no AB-testing framework; no in-app advertising SDKs
