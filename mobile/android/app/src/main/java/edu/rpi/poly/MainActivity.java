package edu.rpi.poly;

import android.content.res.Configuration;
import android.os.Bundle;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int LIGHT_BG = 0xFFFFFFFF;
    private static final int DARK_BG = 0xFF0A0A0A;

    // null = no override; mirror the phone's ui mode.
    // true / false = site-controlled override (via window.PolyTheme.setDark).
    private Boolean siteThemeOverride = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            // Exposes window.PolyTheme.setDark(boolean) to poly.rpi.edu so the
            // in-app theme toggle can drive the Android status + navigation bars.
            webView.addJavascriptInterface(new ThemeBridge(), "PolyTheme");
        }

        applyBars(isSystemDark());
        PushRegistration.start(this);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        // If the site hasn't reported a theme yet, follow the system. Once the
        // site has spoken we keep honoring its choice until it changes.
        applyBars(siteThemeOverride != null ? siteThemeOverride : isSystemDark());
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

    // JavaScript interface exposed to the WebView as `window.PolyTheme`.
    // Only setDark(boolean) is exposed; no sensitive capabilities are reachable.
    private class ThemeBridge {
        @JavascriptInterface
        public void setDark(boolean dark) {
            siteThemeOverride = dark;
            applyBars(dark);
        }
    }
}
