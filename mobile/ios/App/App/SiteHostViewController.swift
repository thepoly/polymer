import UIKit

/// Container for the Capacitor web view. Pins it below the status bar, the
/// way the Android shell lays out its WebView, so the site's headers never
/// sit behind the clock or the camera cutout. The web view still runs under
/// the home indicator and tab bar, which reach the page as
/// env(safe-area-inset-bottom). The status bar strip shows this view's
/// background, which MainViewController keeps in step with the site theme.
class SiteHostViewController: UIViewController {

    func embed(_ site: MainViewController) {
        guard site.parent !== self else { return }
        if site.parent != nil {
            site.willMove(toParent: nil)
            site.view.removeFromSuperview()
            site.removeFromParent()
        }
        addChild(site)
        site.view.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(site.view)
        NSLayoutConstraint.activate([
            site.view.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            site.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            site.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            site.view.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        site.didMove(toParent: self)
        // Lets a tab bar track the page's scrolling (minimize on scroll).
        if let scrollView = site.webView?.scrollView {
            setContentScrollView(scrollView)
        }
        setNeedsStatusBarAppearanceUpdate()
    }

    override var childForStatusBarStyle: UIViewController? {
        return children.first
    }

    override var childForStatusBarHidden: UIViewController? {
        return children.first
    }
}
