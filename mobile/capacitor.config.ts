import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for "The Poly" Android shell.
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
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#FFFFFF',
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: false,
      splashImmersive: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
