import UIKit
import Capacitor

/// Scene lifecycle for the single app window. iPhone gets the native tab bar
/// (SiteTabBarController); iPad shows the site's own desktop navigation. URL
/// opens arrive here instead of the app delegate, so forward them to
/// Capacitor's proxy the way the stock AppDelegate template does.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        let site = MainViewController()
        let window = UIWindow(windowScene: windowScene)
        if windowScene.traitCollection.userInterfaceIdiom == .phone {
            window.rootViewController = SiteTabBarController(site: site)
        } else {
            let host = SiteHostViewController()
            host.embed(site)
            window.rootViewController = host
        }
        self.window = window
        window.makeKeyAndVisible()

        // Cold launches deliver their link in the connection options rather
        // than through the continue / openURLContexts callbacks below.
        if let userActivity = connectionOptions.userActivities.first {
            self.scene(scene, continue: userActivity)
        }
        if !connectionOptions.urlContexts.isEmpty {
            self.scene(scene, openURLContexts: connectionOptions.urlContexts)
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        for context in URLContexts {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: context.url)
        }
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity) { _ in }
    }

}
