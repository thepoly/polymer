import UIKit
import WebKit
import Capacitor

/// Bridge controller hosting the site; counterpart of the Android shell's
/// MainActivity, adapted to feel native on iOS.
///
///   - Launch: a logo-on-background view matching LaunchScreen.storyboard
///     covers the web view until the site reports document.readyState ===
///     'complete' plus a settle delay, with a hard backstop so a dead network
///     never strands the user on it. (The SplashScreen plugin can't do this on
///     iOS: it skips its launch splash entirely when launchShowDuration is 0.)
///   - Chrome: on iPhone the site's sections live in a native tab bar
///     (SiteTabBarController), so the site's own bottom nav is hidden. Off-site
///     links open in an in-app Safari sheet (ExternalLinksPlugin).
///   - Gestures: rubber-band scrolling, pull to refresh, and edge swipes that
///     walk back and forward through the site's history.
///   - Theme: status bar glyphs and native chrome follow the site's theme. The
///     site pushes it through window.PolyTheme.setDark, the same bridge the
///     Android shell exposes; until it does, the `theme` cookie and then the
///     system appearance decide.
///   - Injects the push registration bootstrap (PushRegistration.swift) and
///     loads universal links for the site in the web view.
///
/// Like the Android shell's WebView, this view sits below the status bar
/// (SiteHostViewController); the site's fixed article header has no
/// top safe-area padding of its own. It still runs under the home indicator
/// and tab bar, whose height reaches the page as env(safe-area-inset-bottom).
class MainViewController: CAPBridgeViewController {

    static let brandRed = UIColor(red: 214 / 255, green: 0, blue: 28 / 255, alpha: 1)
    private static let lightBackground = UIColor.white
    private static let darkBackground = UIColor(red: 10 / 255, green: 10 / 255, blue: 10 / 255, alpha: 1)

    // Same splash timings as MainActivity.
    private static let splashReadyPollInterval: TimeInterval = 0.12
    private static let splashSettleDelay: TimeInterval = 0.35
    private static let splashHideBackstop: TimeInterval = 8
    private static let splashFadeOutDuration: TimeInterval = 0.25

    private static let themeMessageName = "polyTheme"

    // The initial about:blank document is already 'complete', so require a
    // real http(s) page before treating the site as ready.
    private static let pageReadyScript = "location.protocol.indexOf('http') === 0 && document.readyState === 'complete'"

    /// Set before the view loads when a native tab bar replaces the site's
    /// bottom nav.
    var usesNativeTabBar = false

    /// Called whenever the web view's URL changes, including client-side
    /// (pushState) navigations.
    var onURLChange: ((URL) -> Void)?

    /// Called with the resolved theme (true = dark) whenever it's applied.
    var onThemeChange: ((Bool) -> Void)?

    private var splashView: UIView?
    private var splashLogoCenterY: NSLayoutConstraint?
    private var urlObservation: NSKeyValueObservation?
    private var loadingObservation: NSKeyValueObservation?

    // nil = the site hasn't pushed a theme yet; defer to the cookie / system.
    private var siteThemeOverride: Bool?
    private var cookieTheme: Bool?

    static func normalizedPath(_ path: String) -> String {
        if path.isEmpty { return "/" }
        return path.count > 1 && path.hasSuffix("/") ? String(path.dropLast()) : path
    }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        guard let webView = webView else { return }

        bridge?.registerPluginInstance(ExternalLinksPlugin())

        let contentController = webView.configuration.userContentController
        contentController.add(WeakScriptMessageHandler(self), name: Self.themeMessageName)
        contentController.addUserScript(WKUserScript(source: shellScript(),
                                                     injectionTime: .atDocumentStart,
                                                     forMainFrameOnly: true))
        contentController.addUserScript(WKUserScript(source: PushRegistration.bootstrapScript,
                                                     injectionTime: .atDocumentEnd,
                                                     forMainFrameOnly: true))

        // Capacitor turns rubber-banding off; iOS readers expect it, along
        // with pull to refresh and edge swipes through history.
        let scrollView = webView.scrollView
        scrollView.bounces = true
        scrollView.alwaysBounceVertical = true
        let refreshControl = UIRefreshControl()
        refreshControl.addTarget(self, action: #selector(refreshPage), for: .valueChanged)
        scrollView.refreshControl = refreshControl
        webView.allowsBackForwardNavigationGestures = true

        urlObservation = webView.observe(\.url, options: [.new]) { [weak self] webView, _ in
            guard let url = webView.url else { return }
            DispatchQueue.main.async {
                self?.onURLChange?(url)
            }
        }
        loadingObservation = webView.observe(\.isLoading, options: [.new]) { [weak self] webView, _ in
            guard !webView.isLoading else { return }
            DispatchQueue.main.async {
                self?.webView?.scrollView.refreshControl?.endRefreshing()
            }
        }

        NotificationCenter.default.addObserver(self,
                                               selector: #selector(handleUniversalLink(_:)),
                                               name: .capacitorOpenUniversalLink,
                                               object: nil)
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        showSplash()
        applyTheme(animated: false)
        readThemeCookie()

        // A universal link that cold-launched the app is posted before this
        // controller starts observing, but Capacitor keeps it as lastURL.
        if let url = ApplicationDelegateProxy.shared.lastURL {
            loadSiteURL(url)
        }

        scheduleSplashHideWhenReady()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        // This view starts below the status bar (SiteHostViewController), so
        // shift the logo up to where LaunchScreen.storyboard centers it on
        // the full screen.
        if let window = view.window {
            splashLogoCenterY?.constant = -view.convert(CGPoint.zero, to: window).y / 2
        }
        // The spinner normally sits behind the page, where the site's fixed
        // article header covers it. Draw it in front instead.
        if let scrollView = webView?.scrollView, let refreshControl = scrollView.refreshControl {
            scrollView.bringSubviewToFront(refreshControl)
        }
    }

    override func didMove(toParent parent: UIViewController?) {
        super.didMove(toParent: parent)
        applyTheme(animated: false)
    }

    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        if traitCollection.hasDifferentColorAppearance(comparedTo: previousTraitCollection) {
            applyTheme(animated: true)
        }
    }

    // MARK: - Navigation

    /// Navigates within the site: client-side through one of the page's own
    /// links when it has one, otherwise with a normal page load.
    func navigate(to path: String) {
        guard let webView = webView else { return }
        if let current = webView.url,
           Self.normalizedPath(current.path) + (current.query.map { "?" + $0 } ?? "") == Self.normalizedPath(path) {
            return
        }
        guard let data = try? JSONSerialization.data(withJSONObject: path, options: .fragmentsAllowed),
              let argument = String(data: data, encoding: .utf8) else { return }
        webView.evaluateJavaScript("!!(window.PolyShell && window.PolyShell.navigate(\(argument)))") { [weak self] result, _ in
            guard (result as? Bool) != true,
                  let base = self?.bridge?.config.serverURL,
                  let url = URL(string: path, relativeTo: base) else { return }
            _ = self?.webView?.load(URLRequest(url: url.absoluteURL))
        }
    }

    /// Re-selecting the current tab: back to the section front, or up to the
    /// top when already there.
    func showFrontPage(path: String) {
        guard let webView = webView else { return }
        if let current = webView.url, Self.normalizedPath(current.path) == path {
            webView.scrollView.setContentOffset(.zero, animated: true)
        } else {
            navigate(to: path)
        }
    }

    @objc private func refreshPage() {
        webView?.reload()
    }

    // MARK: - Splash

    private func showSplash() {
        // Same layout as LaunchScreen.storyboard, so the hand-off from the
        // system launch screen is invisible.
        let splash = UIView()
        splash.backgroundColor = UIColor(named: "LaunchBackground") ?? .systemBackground
        splash.translatesAutoresizingMaskIntoConstraints = false
        let logo = UIImageView(image: UIImage(named: "LaunchLogo"))
        logo.translatesAutoresizingMaskIntoConstraints = false
        splash.addSubview(logo)
        view.addSubview(splash)
        let logoCenterY = logo.centerYAnchor.constraint(equalTo: splash.centerYAnchor)
        NSLayoutConstraint.activate([
            splash.topAnchor.constraint(equalTo: view.topAnchor),
            splash.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            splash.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            splash.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            logo.centerXAnchor.constraint(equalTo: splash.centerXAnchor),
            logoCenterY
        ])
        splashView = splash
        splashLogoCenterY = logoCenterY
    }

    private func scheduleSplashHideWhenReady() {
        DispatchQueue.main.asyncAfter(deadline: .now() + Self.splashHideBackstop) { [weak self] in
            self?.hideSplash()
        }
        pollPageReady()
    }

    private func pollPageReady() {
        guard splashView != nil, let webView = webView else { return }
        webView.evaluateJavaScript(Self.pageReadyScript) { [weak self] result, _ in
            guard let self = self, self.splashView != nil else { return }
            if (result as? Bool) == true {
                DispatchQueue.main.asyncAfter(deadline: .now() + Self.splashSettleDelay) { [weak self] in
                    self?.hideSplash()
                }
            } else {
                DispatchQueue.main.asyncAfter(deadline: .now() + Self.splashReadyPollInterval) { [weak self] in
                    self?.pollPageReady()
                }
            }
        }
    }

    private func hideSplash() {
        guard let splash = splashView else { return }
        splashView = nil
        UIView.animate(withDuration: Self.splashFadeOutDuration, animations: {
            splash.alpha = 0
        }, completion: { _ in
            splash.removeFromSuperview()
        })
        applyTheme(animated: true)
    }

    // MARK: - Theme

    private var isDarkTheme: Bool {
        return siteThemeOverride ?? cookieTheme ?? (traitCollection.userInterfaceStyle == .dark)
    }

    private func applyTheme(animated: Bool) {
        let dark = isDarkTheme

        // Painted before a page's first frame, e.g. during full reloads.
        let background = dark ? Self.darkBackground : Self.lightBackground
        webView?.backgroundColor = background
        webView?.scrollView.backgroundColor = background
        // The container's background fills the strip behind the status bar;
        // while the launch view is up it matches that instead.
        parent?.view.backgroundColor = splashView != nil
            ? (UIColor(named: "LaunchBackground") ?? .systemBackground)
            : background
        onThemeChange?(dark)

        // The launch view follows the system appearance, like the storyboard.
        let style: UIStatusBarStyle = splashView != nil ? .default : (dark ? .lightContent : .darkContent)
        guard style != statusBarStyle else { return }
        if animated {
            setStatusBarStyle(style)
        } else {
            statusBarStyle = style
            setNeedsStatusBarAppearanceUpdate()
        }
    }

    // Reads the site's `theme` cookie so cold launches match the in-app theme
    // before the site's own PolyTheme.setDark call lands.
    private func readThemeCookie() {
        guard let webView = webView, let host = bridge?.config.serverURL.host else { return }
        webView.configuration.websiteDataStore.httpCookieStore.getAllCookies { [weak self] cookies in
            guard let self = self else { return }
            let cookie = cookies.first { cookie in
                cookie.name == "theme" && host.hasSuffix(cookie.domain.trimmingCharacters(in: CharacterSet(charactersIn: ".")))
            }
            switch cookie?.value.lowercased() {
            case "dark":
                self.cookieTheme = true
            case "light":
                self.cookieTheme = false
            default:
                return
            }
            self.applyTheme(animated: false)
        }
    }

    // MARK: - Universal links

    @objc private func handleUniversalLink(_ notification: Notification) {
        guard let url = (notification.object as? [String: Any])?["url"] as? URL else { return }
        DispatchQueue.main.async { [weak self] in
            self?.loadSiteURL(url)
        }
    }

    private func loadSiteURL(_ url: URL) {
        guard let host = bridge?.config.serverURL.host, url.host == host else { return }
        _ = webView?.load(URLRequest(url: url))
    }

    // MARK: - Page scripts

    /// Injected at document start on every page.
    private func shellScript() -> String {
        var script = #"""
        window.PolyTheme = {
          setDark: function (dark) {
            try { window.webkit.messageHandlers.polyTheme.postMessage(!!dark); } catch (e) {}
          }
        };

        window.PolyShell = {
          platform: 'ios',
          // Client-side navigation through one of the site's own Next.js links
          // when the page has one. Returns false so the caller can do a full load.
          navigate: function (path) {
            var selector = 'a[href="' + path + '"]';
            var link = document.querySelector('nav[aria-label="Primary"] ' + selector) || document.querySelector(selector);
            if (!link) return false;
            link.click();
            return true;
          }
        };

        // A touch that starts at the left edge belongs to the native back
        // swipe; keep it away from the site's swipe-to-open menu drawer.
        (function () {
          var edgeTouch = false;
          var swallow = function (e) { if (edgeTouch) e.stopImmediatePropagation(); };
          var options = { capture: true, passive: true };
          window.addEventListener('touchstart', function (e) {
            edgeTouch = e.touches.length === 1 && e.touches[0].clientX <= 24;
            swallow(e);
          }, options);
          window.addEventListener('touchmove', swallow, options);
          window.addEventListener('touchend', function (e) { swallow(e); edgeTouch = false; }, options);
          window.addEventListener('touchcancel', function (e) { swallow(e); edgeTouch = false; }, options);
        })();

        // The web view starts below the status bar, so the mobile header
        // doesn't need the extra 0.75rem it adds on top of the safe area.
        (function () {
          var style = document.createElement('style');
          style.textContent = 'header.safe-area-top { padding-top: var(--safe-area-top) !important; }';
          (document.head || document.documentElement).appendChild(style);
        })();
        """#

        if usesNativeTabBar {
            script += #"""

            // The native tab bar replaces the site's bottom nav. The tab bar's
            // height reaches the page as env(safe-area-inset-bottom), so drop the
            // nav's body padding and the solid safe-area strip, letting content
            // scroll under the tab bar.
            (function () {
              var style = document.createElement('style');
              style.textContent =
                'nav[aria-label="Primary"].fixed { display: none !important; }' +
                'body.has-bottom-nav { padding-bottom: 0 !important; }' +
                'html:not(.standalone-pwa) body::after { display: none !important; }';
              (document.head || document.documentElement).appendChild(style);
            })();
            """#
        }
        return script
    }
}

extension MainViewController: WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == Self.themeMessageName,
              message.frameInfo.isMainFrame,
              let dark = message.body as? Bool else { return }
        siteThemeOverride = dark
        applyTheme(animated: true)
    }
}

/// WKUserContentController retains its handlers, and the web view (which owns
/// the controller) is retained by MainViewController, so register through a
/// weak hop to avoid a cycle.
private final class WeakScriptMessageHandler: NSObject, WKScriptMessageHandler {
    private weak var target: WKScriptMessageHandler?

    init(_ target: WKScriptMessageHandler) {
        self.target = target
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(userContentController, didReceive: message)
    }
}
