package edu.rpi.poly;

import android.util.Log;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

/**
 * Bootstraps FCM push registration on first launch and forwards the token to
 * the Polymer backend.
 *
 * Design notes:
 *   - We inject a tiny JS snippet into the WebView that talks to
 *     window.Capacitor.Plugins.PushNotifications. The native plugin is
 *     auto-registered by Capacitor at startup, so we only need to drive it
 *     from JS — no reflection, no fragile native-plugin calls from Java.
 *   - The token POST is fire-and-forget. The backend upserts by token so
 *     duplicate calls are safe.
 *   - Endpoint: https://poly.rpi.edu/api/push/register
 *     Body:     { "token": "...", "platform": "android" }
 *   - If @capacitor/push-notifications is absent (dummy google-services.json,
 *     no Firebase project) the JS gracefully short-circuits.
 */
final class PushRegistration {

    private static final String TAG = "PushRegistration";
    private static final String REGISTER_URL = "https://poly.rpi.edu/api/push/register";

    private PushRegistration() {}

    static void start(final BridgeActivity activity) {
        try {
            final WebView webView = activity.getBridge().getWebView();
            if (webView == null) {
                Log.w(TAG, "no WebView; skipping push registration");
                return;
            }
            // Post so we run after the bridge has finished wiring up Capacitor.
            webView.post(new Runnable() {
                @Override
                public void run() {
                    try {
                        webView.evaluateJavascript(buildBootstrapScript(), null);
                    } catch (Throwable t) {
                        Log.w(TAG, "push registration evaluate failed", t);
                    }
                }
            });
        } catch (Throwable t) {
            Log.w(TAG, "push registration start failed", t);
        }
    }

    /**
     * Emits a JS bootstrap that:
     *   1) Subscribes to the PushNotifications registration event.
     *   2) POSTs the FCM token to the Polymer backend.
     *   3) Routes notification taps to action.data.articleUrl when present.
     *   4) Requests permission then calls register() if granted.
     *
     * All calls are null-guarded so a build without Firebase still starts.
     */
    private static String buildBootstrapScript() {
        return "(function(){\n"
                + "  try {\n"
                + "    if (window.__polyPushBootstrapped) return;\n"
                + "    window.__polyPushBootstrapped = true;\n"
                + "    var tryInit = function() {\n"
                + "      var Cap = window.Capacitor;\n"
                + "      if (!Cap || !Cap.Plugins || !Cap.Plugins.PushNotifications) {\n"
                + "        return false;\n"
                + "      }\n"
                + "      var PN = Cap.Plugins.PushNotifications;\n"
                + "      PN.addListener('registration', function(token){\n"
                + "        try {\n"
                + "          fetch('" + REGISTER_URL + "', {\n"
                + "            method: 'POST',\n"
                + "            headers: { 'Content-Type': 'application/json' },\n"
                + "            body: JSON.stringify({\n"
                + "              token: token && token.value,\n"
                + "              platform: 'android'\n"
                + "            })\n"
                + "          }).catch(function(err){ console.warn('push register POST failed', err); });\n"
                + "        } catch (e) { console.warn('push register threw', e); }\n"
                + "      });\n"
                + "      PN.addListener('registrationError', function(err){\n"
                + "        console.warn('push registration error', err);\n"
                + "      });\n"
                + "      PN.addListener('pushNotificationActionPerformed', function(action){\n"
                + "        try {\n"
                + "          var url = action && action.notification && action.notification.data && action.notification.data.articleUrl;\n"
                + "          if (url) window.location.href = url;\n"
                + "        } catch (e) { console.warn('push nav failed', e); }\n"
                + "      });\n"
                + "      PN.requestPermissions().then(function(res){\n"
                + "        if (res && res.receive === 'granted') {\n"
                + "          PN.register();\n"
                + "        }\n"
                + "      }).catch(function(err){ console.warn('push perm failed', err); });\n"
                + "      return true;\n"
                + "    };\n"
                + "    if (!tryInit()) {\n"
                + "      // Wait for Capacitor to finish wiring up.\n"
                + "      var attempts = 0;\n"
                + "      var iv = setInterval(function(){\n"
                + "        attempts += 1;\n"
                + "        if (tryInit() || attempts > 40) clearInterval(iv);\n"
                + "      }, 250);\n"
                + "    }\n"
                + "  } catch(e) { console.warn('push init failed', e); }\n"
                + "})();";
    }
}
