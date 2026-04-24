package edu.rpi.poly;

import android.content.res.Configuration;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int LIGHT_BG = 0xFFFFFFFF;
    private static final int DARK_BG = 0xFF0A0A0A;
    private static final String SITE_URL = "https://poly.rpi.edu";
    // Keep the red launch bars on screen until the Capacitor splash has faded
    // out (launchShowDuration + launchFadeOutDuration in capacitor.config.ts).
    private static final long BAR_COLOR_APPLY_DELAY_MS = 800;

    // null = defer to system / cookie.
    // true / false = site-controlled override (via window.PolyTheme.setDark).
    private Boolean siteThemeOverride = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.addJavascriptInterface(new ThemeBridge(), "PolyTheme");
        }

        final boolean initialDark = resolveInitialTheme();

        // Stall bar colorization briefly so the red splash can fade out
        // without a mid-animation flip to white or black.
        final View decor = getWindow().getDecorView();
        decor.postDelayed(new Runnable() {
            @Override
            public void run() {
                applyBars(siteThemeOverride != null ? siteThemeOverride : initialDark);
            }
        }, BAR_COLOR_APPLY_DELAY_MS);

        PushRegistration.start(this);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        applyBars(siteThemeOverride != null ? siteThemeOverride : resolveInitialTheme());
    }

    private boolean resolveInitialTheme() {
        Boolean fromCookie = readSiteThemeCookie();
        if (fromCookie != null) return fromCookie;
        return isSystemDark();
    }

    // Reads the site's `theme` cookie so cold launches come up with the
    // bars already matching the in-app theme, without waiting for the
    // WebView + React + JavascriptInterface round trip.
    private Boolean readSiteThemeCookie() {
        try {
            String cookies = CookieManager.getInstance().getCookie(SITE_URL);
            if (cookies == null) return null;
            for (String raw : cookies.split(";")) {
                String cookie = raw.trim();
                if (cookie.startsWith("theme=")) {
                    String value = cookie.substring(6).toLowerCase();
                    if ("dark".equals(value)) return Boolean.TRUE;
                    if ("light".equals(value)) return Boolean.FALSE;
                }
            }
        } catch (Throwable ignored) {
            // Cookie access failed (rare); fall back to system theme.
        }
        return null;
    }

    private boolean isSystemDark() {
        return (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
                == Configuration.UI_MODE_NIGHT_YES;
    }

    private void applyBars(final boolean dark) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                final Window window = getWindow();
                final int color = dark ? DARK_BG : LIGHT_BG;

                WindowCompat.setDecorFitsSystemWindows(window, true);
                window.setStatusBarColor(color);
                window.setNavigationBarColor(color);

                WindowInsetsControllerCompat controller =
                        new WindowInsetsControllerCompat(window, window.getDecorView());
                controller.setAppearanceLightStatusBars(!dark);
                controller.setAppearanceLightNavigationBars(!dark);
            }
        });
    }

    private class ThemeBridge {
        @JavascriptInterface
        public void setDark(boolean dark) {
            siteThemeOverride = dark;
            applyBars(dark);
        }
    }
}
