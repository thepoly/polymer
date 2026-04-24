/**
 * theme-bridge.js
 *
 * OPTIONAL enhancement script. NOT currently loaded, because we load
 * the production site via `server.url` and Capacitor does not merge this
 * bundle's JS into a remote origin.
 *
 * Included as a reference for the v0.1.0 theme-bridge work described in
 * docs/superpowers/specs/2026-04-24-capacitor-android-app-design.md. When
 * the backend exposes a way to emit the resolved theme (e.g. by injecting
 * this snippet into the site's <head>, or by listening for postMessage
 * from a native WebView client), this script can be adopted unchanged:
 * it watches `document.documentElement`'s class list for the `dark`
 * marker that the site toggles and drives the Capacitor StatusBar plugin
 * accordingly.
 */
(function () {
  if (typeof window === 'undefined') return;
  if (window.__polyThemeBridgeInstalled) return;
  window.__polyThemeBridgeInstalled = true;

  var LIGHT_BG = '#FFFFFF';
  var DARK_BG = '#0A0A0A';

  function apply(isDark) {
    try {
      var Cap = window.Capacitor;
      var StatusBar = Cap && Cap.Plugins && Cap.Plugins.StatusBar;
      if (!StatusBar) return;
      StatusBar.setStyle({ style: isDark ? 'DARK' : 'LIGHT' });
      StatusBar.setBackgroundColor({ color: isDark ? DARK_BG : LIGHT_BG });
    } catch (err) {
      console.warn('[theme-bridge] failed to apply status bar', err);
    }
  }

  function currentIsDark() {
    return document.documentElement.classList.contains('dark');
  }

  apply(currentIsDark());

  var observer = new MutationObserver(function () {
    apply(currentIsDark());
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
})();
