import UIKit
import WebKit
import SafariServices
import Capacitor

/// Opens off-site links in an in-app Safari sheet instead of sending the
/// reader out to Safari, and keeps same-site links that ask for a new window
/// in the web view. Capacitor's default for both is UIApplication.open.
/// Registered from MainViewController.capacitorDidLoad; it has no JS API.
@objc(ExternalLinksPlugin)
final class ExternalLinksPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "ExternalLinksPlugin"
    let jsName = "ExternalLinks"
    let pluginMethods: [CAPPluginMethod] = []

    override func shouldOverrideLoad(_ navigationAction: WKNavigationAction) -> NSNumber? {
        guard let bridge = bridge,
              let url = navigationAction.request.url,
              let scheme = url.scheme?.lowercased(),
              scheme == "http" || scheme == "https" else {
            return nil
        }

        // Frame loads (video and social embeds) go through untouched.
        let opensNewWindow = navigationAction.targetFrame == nil
        guard opensNewWindow || navigationAction.targetFrame?.isMainFrame == true else {
            return nil
        }

        if url.host == bridge.config.serverURL.host {
            guard opensNewWindow else { return nil }
            _ = bridge.webView?.load(URLRequest(url: url))
            return true
        }

        let safari = SFSafariViewController(url: url)
        safari.preferredControlTintColor = MainViewController.brandRed
        safari.dismissButtonStyle = .close
        bridge.viewController?.present(safari, animated: true)
        return true
    }
}
