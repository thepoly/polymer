import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for "The Poly" Android and iOS shells.
 *
 * The app loads the production site directly via `server.url`, so `webDir`
 * is only a formal requirement and points at a tiny placeholder bundle.
 * See docs/superpowers/specs/2026-04-24-capacitor-android-app-design.md
 */
const config: CapacitorConfig = {
  appId: 'edu.rpi.poly',
  appName: 'The Poly',
  webDir: 'assets',
  server: {
    url: 'https://poly.rpi.edu',
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    // The native container already places the web view below the status
    // bar, and the page handles the bottom safe area itself
    // (env(safe-area-inset-bottom)), so UIKit shouldn't inset it again.
    contentInset: 'never',
  },
  plugins: {
    SplashScreen: {
      // The splash is dismissed from MainActivity once the WebView reports
      // document.readyState === 'complete' (plus a small settle delay), so
      // the red splash covers the full remote-site init rather than fading
      // on a fixed timer and flashing unstyled / half-hydrated content.
      // A hard backstop in MainActivity guarantees dismissal if the page
      // never reports ready (e.g. broken network).
      //
      // On iOS the plugin skips its launch splash when launchShowDuration is
      // 0, so MainViewController.swift holds an equivalent red overlay with
      // the same readiness poll, settle delay, backstop, and fade.
      launchShowDuration: 0,
      launchAutoHide: false,
      launchFadeOutDuration: 250,
      backgroundColor: '#D6001C',
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
