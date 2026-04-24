# Android Release Runbook

Operator guide for the Android APK release pipeline. Canonical workflow:
`.github/workflows/android-build.yml`. Full design context:
`docs/superpowers/specs/2026-04-24-capacitor-android-app-design.md`.

## How the workflow works

The workflow has **one job** (`build`) that runs in one of three modes based on
what triggered it:

| Trigger                                              | Mode              | What it does                                                   |
| ---------------------------------------------------- | ----------------- | -------------------------------------------------------------- |
| Push to `main` touching `mobile/**` or the workflow  | `tag-and-release` | Auto-bumps patch, creates + pushes tag, builds APK, publishes Release |
| Push of a tag matching `v*.*.*-android`              | `release`         | Builds APK at tag, publishes Release (no auto-bump)            |
| Manual `workflow_dispatch` (Actions UI)              | `artifact`        | Builds APK, uploads as workflow artifact (no tag, no release)  |

Version source of truth is the newest git tag matching `v*.*.*-android`.
`mobile/scripts/bump-patch.mjs` reads that tag and emits the next patch value;
`mobile/scripts/sync-version.mjs` writes that value into Gradle before build.

### Why a single job (not two)

Pushing a tag with the default `GITHUB_TOKEN` does **not** trigger another
workflow run (GitHub blocks this to prevent recursion). A naive split job
(`tag-from-main` then `build-and-release`) would silently drop the Release on
auto-bumps. One job keeps the tag + build + release atomic.

## Cutting a manual release (minor/major bump)

```bash
# At the commit you want to release from:
git tag v0.1.0-android
git push origin v0.1.0-android
```

The workflow picks up the tag push, builds, and publishes the Release. Use this
any time you want to bump beyond an auto-patch (e.g. feature milestone).

## Cutting an auto-patch release

Just merge to `main` with changes under `mobile/**`. The workflow handles the
rest. If the version collides with an already-existing tag, the workflow fetches
the existing tag and attaches the Release to it rather than failing.

## Dry-run build

Go to Actions → Android Build & Release → Run workflow. This produces a
timestamped artifact (`apk-<version>-dev`) with a 14-day retention window. No
tag, no Release.

## Required GitHub Secrets

| Secret                           | Required for                | Notes                                                 |
| -------------------------------- | --------------------------- | ----------------------------------------------------- |
| `GOOGLE_SERVICES_JSON_BASE64`    | Push notifications          | Base64 of Firebase `google-services.json`             |
| `ANDROID_KEYSTORE_BASE64`        | Signed release APK          | Base64 of `release.keystore`                          |
| `ANDROID_KEYSTORE_PASSWORD`      | Signed release APK          | Keystore password                                     |
| `ANDROID_KEY_ALIAS`              | Signed release APK          | Key alias inside the keystore (e.g. `polymer`)        |
| `ANDROID_KEY_PASSWORD`           | Signed release APK          | Key password                                          |

**All four `ANDROID_*` secrets must be present together** or the workflow falls
back to a debug APK. Debug APKs install on any device with sideloading enabled
but are not acceptable to the Play Store.

If `GOOGLE_SERVICES_JSON_BASE64` is absent, the build uses
`mobile/android/app/google-services.json.placeholder` (committed stub). Push
notifications won't register but the app still builds and runs.

## One-time keystore setup

```bash
keytool -genkey -v -keystore release.keystore -alias polymer \
  -keyalg RSA -keysize 2048 -validity 10000
base64 -w 0 release.keystore > release.keystore.b64
```

1. Paste the contents of `release.keystore.b64` into the
   `ANDROID_KEYSTORE_BASE64` secret.
2. Set `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`polymer`),
   `ANDROID_KEY_PASSWORD` to whatever you entered during `keytool`.
3. **Save `release.keystore` itself in a password manager.** If this file is
   lost you can never ship updates to the same Play Store listing under the
   same signing identity. The secret in GitHub is a copy, not a backup —
   secrets are write-only and cannot be exported.

Full details in `mobile/README.md` once the mobile scaffold lands.

## Installing the APK (for testers)

1. Go to the [Releases page](https://github.com/RonanH67/polymer/releases) and
   grab the newest `*-android` release.
2. Download `app-release.apk` (signed) or `app-debug.apk` (unsigned dev build).
3. On the Android device: Settings → Apps → Special access → Install unknown
   apps. Enable the app you'll open the APK with (e.g. Files, Chrome).
4. Open the APK file. Accept the install prompt.
5. Launch "The Poly".

If Play Protect warns about an unknown app, that's expected — the APK isn't
Play Store distributed. Tap "Install anyway".

## Troubleshooting

### Build fails with "keystore not found" / "release.keystore"

The signing secrets were partially set. Either (a) set all four `ANDROID_*`
secrets or (b) clear `ANDROID_KEYSTORE_BASE64` entirely to force the debug
fallback. The workflow treats "any missing" as "use debug".

### Build fails with "google-services.json is missing or malformed"

Either `GOOGLE_SERVICES_JSON_BASE64` is set but the decoded content is
invalid, or the placeholder at `mobile/android/app/google-services.json.placeholder`
does not exist in the repo. Fix the secret, or ensure the mobile scaffold has
committed a valid placeholder.

### The workflow ran on a `main` push but produced no Release

Verify the push actually changed `mobile/**` or the workflow file itself. The
path filter excludes unrelated pushes (e.g. backend-only changes) to avoid
version churn. Check the Actions run log for "No event triggered — path filter
did not match".

### `git tag ... already exists` error

The auto-bump collision guard handles this — the workflow will fetch the
existing tag and attach the Release to it. If you see this error despite the
guard, the tag might exist on origin but the workflow fetched an outdated
remote state; rerun the workflow.

### Release is created but APK is missing from assets

Check the "Build" step log for Gradle failures. `fail_on_unmatched_files: false`
means the Release gets created even if the APK path is empty — the Release will
be there but have no downloads. Rebuild after fixing the Gradle issue.

### Want to retract a release

Delete it manually: `gh release delete v0.1.0-android --cleanup-tag`. The
workflow won't re-create unless `main` is pushed again with mobile changes (in
which case the patch would bump to the next number) or you re-push the tag.
