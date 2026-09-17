import Foundation
import Capacitor
import FirebaseCore
import FirebaseMessaging

/// Bootstraps FCM push registration and forwards the token to the Polymer
/// backend. iOS counterpart of the Android shell's PushRegistration.java.
///
/// Design notes:
///   - The page-side half is the same JS bootstrap the Android shell injects:
///     it drives window.Capacitor.Plugins.PushNotifications, POSTs the token,
///     and routes notification taps to data.articleUrl.
///   - On iOS the plugin's `registration` event would carry the raw APNs
///     device token, which FCM can't address. The app delegate hands that
///     token to Firebase Messaging here and emits the FCM registration token
///     instead, so /api/push/send keeps fanning out through FCM for both
///     platforms.
///   - Endpoint: POST /api/push/register (same origin as the loaded site)
///     Body:     { "token": "...", "platform": "ios" }
///   - GoogleService-Info.plist is gitignored. Builds without it skip Firebase
///     entirely and report a registrationError to JS rather than posting an
///     APNs token the backend can't use.
enum PushRegistration {

    enum RegistrationError: LocalizedError {
        case firebaseNotConfigured
        case missingToken

        var errorDescription: String? {
            switch self {
            case .firebaseNotConfigured:
                return "Firebase is not configured (GoogleService-Info.plist missing from the app bundle)"
            case .missingToken:
                return "Firebase Messaging returned no registration token"
            }
        }
    }

    static func configureFirebase() {
        guard Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil else {
            CAPLog.print("⚡️  GoogleService-Info.plist not bundled; push registration is disabled")
            return
        }
        FirebaseApp.configure()
    }

    /// Swaps the APNs device token for an FCM registration token and hands it
    /// to @capacitor/push-notifications, which emits it as `registration`.
    static func didRegisterForRemoteNotifications(deviceToken: Data) {
        guard FirebaseApp.app() != nil else {
            NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications,
                                            object: RegistrationError.firebaseNotConfigured)
            return
        }
        let messaging = Messaging.messaging()
        messaging.apnsToken = deviceToken
        // token(completion:) is deprecated since Firebase 12.18 in favor of
        // installation-ID registration (register(completion:)), but lib/fcm.ts
        // and the Android app both address devices by FCM registration token.
        // Keep using it until the backend moves to installation IDs; it keeps
        // working while FirebaseMessagingInstallationIdEnabled is unset.
        messaging.token { token, error in
            if let token = token {
                NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: token)
            } else {
                NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications,
                                                object: error ?? RegistrationError.missingToken)
            }
        }
    }

    /// Injected at document end on every page load. Guarded per document, so
    /// a full reload re-attaches listeners; the backend de-dupes re-registers.
    /// The permission prompt only appears once; later calls resolve silently.
    static let bootstrapScript = #"""
    (function () {
      try {
        if (window.__polyPushBootstrapped) return;
        window.__polyPushBootstrapped = true;
        var tryInit = function () {
          var Cap = window.Capacitor;
          if (!Cap || !Cap.Plugins || !Cap.Plugins.PushNotifications) {
            return false;
          }
          var PN = Cap.Plugins.PushNotifications;
          PN.addListener('registration', function (token) {
            try {
              fetch('/api/push/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  token: token && token.value,
                  platform: 'ios'
                })
              }).catch(function (err) { console.warn('push register POST failed', err); });
            } catch (e) { console.warn('push register threw', e); }
          });
          PN.addListener('registrationError', function (err) {
            console.warn('push registration error', err);
          });
          PN.addListener('pushNotificationActionPerformed', function (action) {
            try {
              var url = action && action.notification && action.notification.data && action.notification.data.articleUrl;
              if (url) window.location.href = url;
            } catch (e) { console.warn('push nav failed', e); }
          });
          PN.requestPermissions().then(function (res) {
            if (res && res.receive === 'granted') {
              PN.register();
            }
          }).catch(function (err) { console.warn('push perm failed', err); });
          return true;
        };
        if (!tryInit()) {
          // Wait for Capacitor to finish wiring up.
          var attempts = 0;
          var iv = setInterval(function () {
            attempts += 1;
            if (tryInit() || attempts > 40) clearInterval(iv);
          }, 250);
        }
      } catch (e) { console.warn('push init failed', e); }
    })();
    """#
}
