package edu.rpi.poly;

import android.content.res.Configuration;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

/**
 * Host activity for the Capacitor WebView.
 *
 * The WebView loads https://poly.rpi.edu (configured in capacitor.config.ts).
 * This class layers two native behaviours on top of Capacitor's defaults:
 *
 *   1) System-bar theming that follows the Android UI mode. The parent theme
 *      (Theme.AppCompat.DayNight.NoActionBar) already resolves the correct
 *      colors from values/ vs values-night/; this class just forces a refresh
 *      when the uiMode changes at runtime so the bars pick up the new tone
 *      without a full activity recreate.
 *
 *      Known tradeoff (see design spec §Theme bridge): toggling the in-site
 *      theme button while the Android system theme is fixed will not move
 *      the system bars. A full bridge needs coordinated postMessage support
 *      on the web side, scheduled for v0.1.0.
 *
 *   2) Push-notification registration. Deferred to PushRegistration so
 *      failures (no Firebase, missing plugin, no network) don't crash the
 *      main activity. Device-token POST goes to the production /api/push/register.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Fire-and-forget; handles its own errors.
        PushRegistration.start(this);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);

        int currentNightMode = newConfig.uiMode & Configuration.UI_MODE_NIGHT_MASK;
        if (currentNightMode == Configuration.UI_MODE_NIGHT_YES
                || currentNightMode == Configuration.UI_MODE_NIGHT_NO) {
            // Re-resolve themed resources so the status/nav bar colours
            // pick up the new night-qualifier values immediately.
            getWindow().getDecorView().requestApplyInsets();
        }
    }
}
