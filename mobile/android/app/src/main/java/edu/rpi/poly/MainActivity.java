package edu.rpi.poly;

import android.animation.ArgbEvaluator;
import android.animation.ValueAnimator;
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

    // Matches the web-side document.startViewTransition() radial wipe.
    private static final long BAR_COLOR_ANIM_DURATION_MS = 320;

    // null = defer to system / cookie.
    // true / false = site-controlled override (via window.PolyTheme.setDark).
    private Boolean siteThemeOverride = null;

    // Tracks the currently rendered bar color so we can animate from it and
    // so we can no-op when applyBars() is called with the same target.
    private Integer currentBarColor = null;
    // Whether the most recently applied appearance was "dark bars" (i.e. dark
    // background, light glyph icons). Used for no-op detection.
    private Boolean currentDark = null;
    private ValueAnimator barColorAnimator = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.addJavascriptInterface(new ThemeBridge(), "PolyTheme");
        }

        final boolean initialDark = resolveInitialTheme();

        // Stall bar colorization briefly so the red splash can fade out
        // without a mid-animation flip to white or black. The first
        // application is intentionally NOT animated — there is no prior
        // color to interpolate from (the decor has been showing the red
        // launch color), so a crossfade would look wrong. User-driven
        // toggles and system theme changes animate normally.
        final View decor = getWindow().getDecorView();
        decor.postDelayed(new Runnable() {
            @Override
            public void run() {
                applyBars(siteThemeOverride != null ? siteThemeOverride : initialDark, false);
            }
        }, BAR_COLOR_APPLY_DELAY_MS);

        PushRegistration.start(this);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        applyBars(siteThemeOverride != null ? siteThemeOverride : resolveInitialTheme(), true);
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
        applyBars(dark, true);
    }

    private void applyBars(final boolean dark, final boolean animate) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                final Window window = getWindow();
                final int targetColor = dark ? DARK_BG : LIGHT_BG;

                WindowCompat.setDecorFitsSystemWindows(window, true);

                // No-op if we're already at the target state and nothing is
                // in flight. Avoids redundant animator churn from rapid
                // repeat toggles that happen to land on the same value.
                if (currentDark != null
                        && currentDark == dark
                        && currentBarColor != null
                        && currentBarColor == targetColor
                        && (barColorAnimator == null || !barColorAnimator.isRunning())) {
                    return;
                }

                // Cancel any in-flight animation so the new target wins.
                if (barColorAnimator != null && barColorAnimator.isRunning()) {
                    barColorAnimator.cancel();
                }

                final WindowInsetsControllerCompat controller =
                        new WindowInsetsControllerCompat(window, window.getDecorView());

                if (!animate) {
                    window.setStatusBarColor(targetColor);
                    window.setNavigationBarColor(targetColor);
                    controller.setAppearanceLightStatusBars(!dark);
                    controller.setAppearanceLightNavigationBars(!dark);
                    currentBarColor = targetColor;
                    currentDark = dark;
                    return;
                }

                final int startColor = currentBarColor != null
                        ? currentBarColor
                        : (dark ? LIGHT_BG : DARK_BG);

                // If appearance is flipping, we swap at the midpoint so the
                // system icons don't become invisible against an
                // intermediate color. If appearance isn't flipping (same
                // dark/light as before but different target color — rare),
                // just set it up front.
                final boolean appearanceFlips = currentDark == null || currentDark != dark;
                final boolean targetDark = dark;
                if (!appearanceFlips) {
                    controller.setAppearanceLightStatusBars(!targetDark);
                    controller.setAppearanceLightNavigationBars(!targetDark);
                }

                final ArgbEvaluator evaluator = new ArgbEvaluator();
                final ValueAnimator animator = ValueAnimator.ofObject(evaluator, startColor, targetColor);
                animator.setDuration(BAR_COLOR_ANIM_DURATION_MS);
                animator.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
                    private boolean appearanceSwapped = false;

                    @Override
                    public void onAnimationUpdate(ValueAnimator animation) {
                        int c = (Integer) animation.getAnimatedValue();
                        window.setStatusBarColor(c);
                        window.setNavigationBarColor(c);
                        currentBarColor = c;
                        if (appearanceFlips
                                && !appearanceSwapped
                                && animation.getAnimatedFraction() >= 0.5f) {
                            controller.setAppearanceLightStatusBars(!targetDark);
                            controller.setAppearanceLightNavigationBars(!targetDark);
                            appearanceSwapped = true;
                        }
                    }
                });
                animator.addListener(new android.animation.AnimatorListenerAdapter() {
                    @Override
                    public void onAnimationEnd(android.animation.Animator animation) {
                        // Guarantee final state regardless of mid-flight cancellation.
                        window.setStatusBarColor(targetColor);
                        window.setNavigationBarColor(targetColor);
                        controller.setAppearanceLightStatusBars(!targetDark);
                        controller.setAppearanceLightNavigationBars(!targetDark);
                        currentBarColor = targetColor;
                        currentDark = targetDark;
                        if (barColorAnimator == animation) {
                            barColorAnimator = null;
                        }
                    }
                });
                barColorAnimator = animator;
                animator.start();
            }
        });
    }

    private class ThemeBridge {
        @JavascriptInterface
        public void setDark(boolean dark) {
            siteThemeOverride = dark;
            applyBars(dark, true);
        }
    }
}
