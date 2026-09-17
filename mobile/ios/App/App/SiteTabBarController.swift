import UIKit

/// The site's primary sections, shown as native tabs on iPhone.
enum SiteSection: Int, CaseIterable {
    case home, news, features, opinion, sports

    var path: String {
        switch self {
        case .home: return "/"
        case .news: return "/news"
        case .features: return "/features"
        case .opinion: return "/opinion"
        case .sports: return "/sports"
        }
    }

    var title: String {
        switch self {
        case .home: return "Home"
        case .news: return "News"
        case .features: return "Features"
        case .opinion: return "Opinion"
        case .sports: return "Sports"
        }
    }

    var image: UIImage? {
        switch self {
        case .home: return Self.symbol("house")
        case .news: return Self.symbol("newspaper")
        case .features: return Self.symbol("building.columns")
        case .opinion: return Self.symbol("quote.bubble")
        case .sports: return Self.symbol("figure.hockey") ?? Self.symbol("sportscourt")
        }
    }

    var selectedImage: UIImage? {
        switch self {
        case .home: return Self.symbol("house.fill")
        case .news: return Self.symbol("newspaper.fill")
        case .features: return Self.symbol("building.columns.fill")
        case .opinion: return Self.symbol("quote.bubble.fill")
        case .sports: return Self.symbol("figure.hockey") ?? Self.symbol("sportscourt.fill")
        }
    }

    // Smaller than the tab bar's default symbol size, which reads heavy with
    // these glyphs. The tab bar re-applies its own symbol configuration to
    // symbol images, so flatten each one into a plain template image to keep
    // the size.
    private static func symbol(_ name: String) -> UIImage? {
        guard let symbol = UIImage(systemName: name, withConfiguration: UIImage.SymbolConfiguration(pointSize: 15, weight: .medium)) else {
            return nil
        }
        return UIGraphicsImageRenderer(size: symbol.size).image { _ in
            symbol.draw(at: .zero)
        }.withRenderingMode(.alwaysTemplate)
    }

    /// The section whose front page is `path`. Deeper pages such as articles
    /// return nil: they stay in whichever tab opened them, like a navigation
    /// stack would.
    init?(frontPagePath path: String) {
        guard let section = SiteSection.allCases.first(where: { $0.path == MainViewController.normalizedPath(path) }) else {
            return nil
        }
        self = section
    }
}

/// One per tab. The app has a single web view, which moves into whichever
/// host is selected.
final class TabHostViewController: SiteHostViewController {
    let section: SiteSection

    init(section: SiteSection) {
        self.section = section
        super.init(nibName: nil, bundle: nil)
        tabBarItem = UITabBarItem(title: section.title, image: section.image, selectedImage: section.selectedImage)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}

/// iPhone root: a native tab bar over the Capacitor web view, replacing the
/// site's own bottom nav (which the Android shell keeps). Each tab remembers
/// the last page it showed; re-tapping the selected tab returns to its
/// section front, then scrolls to the top.
final class SiteTabBarController: UITabBarController, UITabBarControllerDelegate {

    private let site: MainViewController
    private var lastURLs: [SiteSection: URL] = [:]

    init(site: MainViewController) {
        self.site = site
        site.usesNativeTabBar = true
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private var hosts: [TabHostViewController] {
        return viewControllers?.compactMap { $0 as? TabHostViewController } ?? []
    }

    private var selectedSection: SiteSection {
        return SiteSection(rawValue: selectedIndex) ?? .home
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        delegate = self
        tabBar.tintColor = MainViewController.brandRed
        viewControllers = SiteSection.allCases.map { TabHostViewController(section: $0) }
        if #available(iOS 26.0, *) {
            tabBarMinimizeBehavior = .onScrollDown
        }

        site.onURLChange = { [weak self] url in
            self?.siteDidNavigate(to: url)
        }
        site.onThemeChange = { [weak self] dark in
            self?.tabBar.overrideUserInterfaceStyle = dark ? .dark : .light
        }
        hosts.first?.embed(site)
    }

    private func siteDidNavigate(to url: URL) {
        // In-page links to a section front (e.g. from the site's menu) move
        // the tab selection along with them.
        if let section = SiteSection(frontPagePath: url.path), section != selectedSection, section.rawValue < hosts.count {
            hosts[section.rawValue].embed(site)
            selectedIndex = section.rawValue
        }
        lastURLs[selectedSection] = url
    }

    // MARK: - UITabBarControllerDelegate

    func tabBarController(_ tabBarController: UITabBarController, shouldSelect viewController: UIViewController) -> Bool {
        guard let host = viewController as? TabHostViewController else { return false }
        if host === selectedViewController {
            site.showFrontPage(path: host.section.path)
            return false
        }
        host.embed(site)
        return true
    }

    func tabBarController(_ tabBarController: UITabBarController, didSelect viewController: UIViewController) {
        guard let host = viewController as? TabHostViewController else { return }
        if let url = lastURLs[host.section] {
            site.navigate(to: url.path + (url.query.map { "?" + $0 } ?? ""))
        } else {
            site.navigate(to: host.section.path)
        }
    }
}
