package edu.rpi.poly;

import android.content.res.Configuration;
import android.os.Bundle;
import android.view.Window;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int LIGHT_BG = 0xFFFFFFFF;
    private static final int DARK_BG = 0xFF0A0A0A;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applySystemBars();
        PushRegistration.start(this);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        applySystemBars();
    }

    // Theme.SplashScreen (the activity's launch theme) ignores our themed
    // statusBarColor/navigationBarColor attributes, which is why the bars
    // stayed black regardless of light/dark before. Pinning them here at
    // runtime forces the bars to the current uiMode's colors.
    private void applySystemBars() {
        final Window window = getWindow();
        final boolean night =
                (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
                        == Configuration.UI_MODE_NIGHT_YES;
        final int color = night ? DARK_BG : LIGHT_BG;

        WindowCompat.setDecorFitsSystemWindows(window, true);
        window.setStatusBarColor(color);
        window.setNavigationBarColor(color);

        WindowInsetsControllerCompat controller =
                new WindowInsetsControllerCompat(window, window.getDecorView());
        controller.setAppearanceLightStatusBars(!night);
        controller.setAppearanceLightNavigationBars(!night);
    }
}
