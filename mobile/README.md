# mobile — "The Poly" Android app

Capacitor-based Android WebView shell for [poly.rpi.edu](https://poly.rpi.edu).
The app is a thin native wrapper around the production website, plus a push
notifications plugin for breaking-news alerts.

The authoritative design doc lives at
[`docs/superpowers/specs/2026-04-24-capacitor-android-app-design.md`](../docs/superpowers/specs/2026-04-24-capacitor-android-app-design.md).

## Layout

```
mobile/
├── assets/                       # webDir placeholder (unused at runtime; server.url is poly.rpi.edu)
├── resources/                    # source art for @capacitor/assets (icon + splash)
├── scripts/
│   ├── bump-patch.mjs            # computes next patch version for CI auto-release
│   ├── generate-icons.sh         # re-renders resources/*.png from resources/*.svg
│   └── sync-version.mjs          # writes versionName/versionCode into android/app/build.gradle
├── android/                      # generated Capacitor Android project
├── capacitor.config.ts           # appId, appName, server.url
└── package.json                  # Capacitor 6 deps
```

## Prerequisites

- Node 20+ and pnpm 10
- JDK 17 (Temurin / OpenJDK)
- Android SDK (Platform 34 + Build Tools 34+)
- ImageMagick and `rsvg-convert` if you plan to regenerate the icon/splash source art

## Local development

Install everything (repo root and `mobile/`), then sync and run:

```bash
# from repo root
pnpm install

cd mobile
pnpm install
npx cap sync android

# open Android Studio
npx cap open android

# or run on a connected device/emulator directly
npx cap run android
```

To build an unsigned debug APK on the command line:

```bash
cd mobile/android
./gradlew assembleDebug
# APK: mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

### Regenerating icons / splash

The app icon source is `public/static-app-icon.svg` at the repo root (the red
"p" logo). The adaptive foreground, monochrome silhouette, and splash art
live as SVGs under `mobile/resources/` and are rendered into the PNG inputs
that `@capacitor/assets` expects. To regenerate everything:

```bash
mobile/scripts/generate-icons.sh
cd mobile
npx @capacitor/assets generate --android --assetPath resources
npx cap sync android
```

The monochrome variant powers Android 13+ "Themed icons". The adaptive XML
(`mipmap-anydpi-v26/ic_launcher.xml`) already references
`@drawable/ic_launcher_monochrome`; if you change the logo, re-render the
`icon-monochrome.svg` so the silhouette keeps matching the foreground.

## Firebase setup (for push notifications)

Until Firebase is configured the app still builds and runs — it just can't
register for push. To enable push:

1. **Create a Firebase project** named "The Poly" (or reuse an existing one).
2. **Add an Android app** with package name `edu.rpi.poly`.
3. **Download `google-services.json`** and drop it at
   `mobile/android/app/google-services.json`.
   - Locally: this is enough. Gradle will pick it up and apply
     `com.google.gms.google-services` automatically.
   - For CI: `base64 -w0 google-services.json` and paste the output into
     the GitHub secret `GOOGLE_SERVICES_JSON_BASE64`. The release workflow
     decodes it at build time.
4. **Service account for backend**: In Firebase → Project settings → Service
   accounts → Generate new private key. Save the JSON and set it as the
   `FCM_SERVICE_ACCOUNT_JSON` env var on the production server (via
   `/var/www/polymer/shared/.env`).

A dummy `google-services.json.placeholder` is checked in so Gradle can apply
the google-services plugin (and produce an installable APK) before the real
config lands.

## Release signing

One-time keystore generation (run locally on a trusted machine, never in CI):

```bash
keytool -genkey -v -keystore release.keystore -alias polymer \
  -keyalg RSA -keysize 2048 -validity 10000

# store the raw keystore in a password manager — losing it means future
# Play Store updates under this key become impossible.
base64 -w0 release.keystore > release.keystore.b64
```

Then set these GitHub repo secrets:

| Secret                         | Contents                                           |
|--------------------------------|----------------------------------------------------|
| `ANDROID_KEYSTORE_BASE64`      | base64 of `release.keystore`                       |
| `ANDROID_KEYSTORE_PASSWORD`    | keystore password you entered at `keytool` prompt  |
| `ANDROID_KEY_ALIAS`            | `polymer` (or whatever `-alias` you used)          |
| `ANDROID_KEY_PASSWORD`         | key password (usually same as keystore password)   |
| `GOOGLE_SERVICES_JSON_BASE64`  | base64 of `google-services.json`                   |

When the keystore secret is present the Android workflow runs
`./gradlew assembleRelease` and publishes a signed APK to GitHub Releases.
Without it, the workflow falls back to `assembleDebug` so releases are still
installable via sideload.

For local signed builds, put `release.keystore` next to `android/app/build.gradle`
and export:

```bash
export ANDROID_KEYSTORE_PASSWORD=...
export ANDROID_KEY_ALIAS=polymer
export ANDROID_KEY_PASSWORD=...
cd mobile/android && ./gradlew assembleRelease
```

Set `ANDROID_KEYSTORE_PATH` if the keystore lives somewhere other than
`mobile/android/app/release.keystore`.

## Versioning

- `versionName` follows `x.y.z` and is kept in `android/app/build.gradle`.
- `versionCode` is monotonically incremented every build via
  `mobile/scripts/sync-version.mjs <versionName>`; CI runs this before
  assembling the APK.
- Git tags use `vX.Y.Z-android` (platform suffix) to distinguish mobile
  releases from potential future iOS/web tags.
- The release workflow in `.github/workflows/android-build.yml` auto-bumps
  the patch on every push to `main` touching `mobile/**`.

## Known limitations (v0.0.0)

- **Theme bridge is one-way.** The system bars follow the Android UI mode
  (light/dark) via `Theme.AppCompat.DayNight`, but toggling the in-site theme
  button does not move the native bars because the WebView loads a remote
  origin and we can't inject JS across origins yet. A full bridge is v0.1.0
  work — see `assets/theme-bridge.js` for the reference snippet.
- **Offline mode**: none. If poly.rpi.edu is down the app shows the
  WebView's default error page.
- **Deep links** are declared for `https://poly.rpi.edu/*` with
  `autoVerify="true"`, but verification requires a `.well-known/assetlinks.json`
  hosted on production with the release keystore's SHA-256 fingerprint. Do
  that after the first signed release.

## References

- Design spec: [`docs/superpowers/specs/2026-04-24-capacitor-android-app-design.md`](../docs/superpowers/specs/2026-04-24-capacitor-android-app-design.md)
- Capacitor: https://capacitorjs.com/docs/android
- Adaptive icons: https://developer.android.com/develop/ui/views/launch/icon_design_adaptive
- Themed icons (monochrome): https://developer.android.com/develop/ui/views/launch/icon_design_adaptive#monochromatic_app_icons
