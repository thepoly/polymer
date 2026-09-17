# mobile — "The Poly" Android and iOS apps

Capacitor-based WebView shells for [poly.rpi.edu](https://poly.rpi.edu), one
per platform. Each app is a thin native wrapper around the production
website, plus a push notifications plugin for breaking-news alerts.

The authoritative design doc lives at
[`docs/superpowers/specs/2026-04-24-capacitor-android-app-design.md`](../docs/superpowers/specs/2026-04-24-capacitor-android-app-design.md).
The iOS app follows the same design; its platform notes are in the
[iOS](#ios) section below.

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
├── ios/                          # Capacitor iOS project (Swift Package Manager, no CocoaPods)
├── capacitor.config.ts           # appId, appName, server.url
└── package.json                  # Capacitor 6 deps
```

## Prerequisites

- Node 20+ and pnpm 10
- JDK 17 (Temurin / OpenJDK)
- Android SDK (Platform 34 + Build Tools 34+)
- ImageMagick and `rsvg-convert` if you plan to regenerate the icon/splash source art

iOS prerequisites are listed under [iOS](#ios).

## Local development

Install everything (repo root and `mobile/`), then sync and run:

```bash
# from repo root
pnpm install

cd mobile
# --ignore-workspace: the repo-root pnpm-workspace.yaml otherwise makes this
# install the root project and leave mobile/node_modules empty.
pnpm install --ignore-workspace
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

## iOS

The iOS app lives in `ios/`. It shares the Android app's plumbing (same
site, theme bridge, push flow) but uses native iOS chrome and gestures
where Android relies on the website's own UI:

| Android (`android/app/src/main/`) | iOS (`ios/App/App/`) |
| --- | --- |
| `MainActivity.java`: red splash until the page is ready; system bars follow `window.PolyTheme.setDark` | `MainViewController.swift`: logo launch view with the same readiness timings; status bar and tab bar follow the same `PolyTheme` bridge |
| The site's web bottom nav | `SiteTabBarController.swift`: native tab bar (Liquid Glass on iOS 26+) |
| Off-site links open in the browser | `ExternalLinksPlugin.swift`: in-app Safari sheet |
| System back button | Edge swipe back/forward through history, plus pull to refresh |
| `PushRegistration.java`: JS bootstrap for `@capacitor/push-notifications` | `PushRegistration.swift`: same bootstrap (`platform: 'ios'`) plus the APNs → FCM token swap |
| App Links intent filter for `poly.rpi.edu` | Associated Domains entitlement (`applinks:poly.rpi.edu`), routed by `SceneDelegate.swift` |
| `google-services.json` (gitignored) | `GoogleService-Info.plist` (gitignored) |

Native dependencies come from Swift Package Manager. `npx cap sync ios`
regenerates `ios/App/CapApp-SPM/Package.swift` from the installed Capacitor
plugins, and the Xcode project pulls `FirebaseCore` + `FirebaseMessaging`
from `firebase-ios-sdk`. There is no Podfile.

### Prerequisites

- macOS with Xcode 16.3 or newer (Firebase's Swift package needs Swift 6.1).
  App Store and TestFlight uploads need whichever Xcode Apple currently
  requires.
- An iOS Simulator runtime (Xcode → Settings → Components).
- Node 20+ and pnpm 10.

### Local development

```bash
cd mobile
pnpm install --ignore-workspace
npx cap sync ios      # writes capacitor.config.json into the app, regenerates CapApp-SPM
npx cap open ios      # opens App.xcodeproj; pick a simulator and press Run
```

Or build from the command line (this is what `.github/workflows/ios-build.yml`
runs, also available as `pnpm build:ios`):

```bash
cd mobile/ios/App
xcodebuild -project App.xcodeproj -scheme App -configuration Debug \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath build CODE_SIGNING_ALLOWED=NO build
```

Simulator builds need no Apple Developer account. Physical devices do: the
app uses the Push Notifications and Associated Domains capabilities, which
free personal teams can't sign. Pick the team under the App target →
Signing & Capabilities.

### Firebase setup (iOS)

Use the same Firebase project as Android:

1. **Add an iOS app** in Firebase → Project settings with bundle ID
   `edu.rpi.poly`.
2. **Download `GoogleService-Info.plist`** to
   `mobile/ios/App/App/GoogleService-Info.plist`. A build phase copies it into
   the app bundle when it exists. Without it, the app still runs, push
   registration is disabled, and Xcode prints a build warning.
   - For CI: `base64 -i GoogleService-Info.plist | pbcopy`, then paste into
     the GitHub secret `GOOGLE_SERVICE_INFO_PLIST_BASE64`.
3. **Upload an APNs auth key.** Create a key with the Apple Push
   Notifications service enabled (Apple Developer → Certificates, IDs &
   Profiles → Keys), then upload the `.p8` under Firebase → Project
   settings → Cloud Messaging → Apple app configuration with its key ID and
   your team ID. The same key covers development and production builds.
4. **No backend changes.** The app registers an FCM token (not the raw APNs
   token) with `platform: 'ios'`, so `/api/push/send` → `lib/fcm.ts` reaches
   iPhones through the existing `FCM_SERVICE_ACCOUNT_JSON`.

### How it works

- **Launch.** `LaunchScreen.storyboard` shows the red "p" on the site's
  background color (white, or #0A0A0A in dark mode), the way iOS apps
  launch, rather than Android's full-bleed red. The SplashScreen plugin skips
  its iOS launch splash when `launchShowDuration` is 0 (the value the Android
  flow relies on), so `MainViewController` keeps an identical view over the
  web view until `document.readyState === 'complete'` plus 350 ms, with an
  8 s backstop and a 250 ms fade, matching `MainActivity`. The tab bar is
  already live underneath.
- **Tab bar (iPhone).** Home, News, Features, Opinion, and Sports are native
  tabs over the one web view. Tapping a tab navigates client-side by
  clicking the site's own Next.js link for that section (falling back to a
  page load). Articles opened from a tab stay in that tab, each tab
  remembers its last page, and re-tapping the selected tab returns to the
  section front, then scrolls to the top. On iOS 26+ the bar minimizes while
  scrolling down. The app hides the site's web bottom nav with an injected
  stylesheet keyed to `nav[aria-label="Primary"]`, so keep that selector in
  mind when changing `components/BottomNav.tsx`. iPad keeps the site's own
  desktop navigation.
- **Safe areas and theme.** `SiteHostViewController` pins the web view below
  the status bar, the same place Android's WebView starts, because the
  site's fixed article header (`ArticleScrollBar`) has no top safe-area
  padding. An injected rule also drops the extra 0.75rem the mobile header
  (`header.safe-area-top`) adds above the logo. The web view still runs under
  the home indicator and tab bar, whose height reaches the page as
  `env(safe-area-inset-bottom)` (`ios.contentInset: 'never'`). The status bar
  strip, status bar glyphs, and tab bar follow `window.PolyTheme.setDark`,
  which `ThemeProvider` already calls for Android, falling back to the
  `theme` cookie and then the system appearance.
- **Gestures.** Rubber-band scrolling and pull to refresh are back on
  (Capacitor disables bouncing). Edge swipes move back and forward through
  history; an injected capture-phase touch listener keeps touches that start
  at the left edge away from the site's swipe-to-open menu drawer.
- **Links.** Off-site links open in an in-app Safari sheet
  (`ExternalLinksPlugin`, via Capacitor's `shouldOverrideLoad` hook).
  Same-site links that request a new window load in place.
- **Push.** The bootstrap script runs at document end on every page load:
  it requests permission, POSTs the token to `/api/push/register`, and sends
  notification taps to `data.articleUrl`. `FirebaseAppDelegateProxyEnabled`
  is off, so `AppDelegate` hands the APNs token to Firebase Messaging
  explicitly.
- **Lifecycle.** Scene-based (`SceneDelegate` builds the window), which
  recent iOS SDKs require for apps to launch.

### Known limitations

- **Universal links** need
  `https://poly.rpi.edu/.well-known/apple-app-site-association` to list
  `<TEAM_ID>.edu.rpi.poly` before iOS opens site links in the app. The
  entitlement and the in-app routing are already in place.
- **No release pipeline yet.** `ios-build.yml` only compiles for the
  simulator. TestFlight and App Store uploads need an Apple Developer
  Program team, an App Store Connect app record, and signing secrets,
  analogous to the Android keystore secrets.
- **Versioning.** `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` are set
  by hand in the Xcode project until there's a release lane.
- **Deprecated FCM token API.** Firebase 12.18 deprecated
  `Messaging.token(completion:)` in favor of installation-ID registration.
  The app still uses the token API (one build warning) because
  `lib/fcm.ts` and the Android app address devices by registration token.
  Moving to installation IDs means changing the backend send path for both
  platforms.
- **Offline mode:** none, same as Android. If poly.rpi.edu is unreachable,
  the web view stays blank after the splash backstop.

## References

- Design spec: [`docs/superpowers/specs/2026-04-24-capacitor-android-app-design.md`](../docs/superpowers/specs/2026-04-24-capacitor-android-app-design.md)
- Capacitor: https://capacitorjs.com/docs/android, https://capacitorjs.com/docs/ios
- Capacitor + Swift Package Manager: https://capacitorjs.com/docs/ios/spm
- Firebase Cloud Messaging on Apple platforms: https://firebase.google.com/docs/cloud-messaging/ios/client
- Adaptive icons: https://developer.android.com/develop/ui/views/launch/icon_design_adaptive
- Themed icons (monochrome): https://developer.android.com/develop/ui/views/launch/icon_design_adaptive#monochromatic_app_icons
