import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // La pastille rouge est remise à zéro quand l'agent ouvre l'app :
        // les notifications ont été vues, le compteur n'a plus lieu d'être.
        application.applicationIconBadgeNumber = 0
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    // MARK: - Notifications distantes (APNs)
    //
    // Le plugin @capacitor/push-notifications n'écoute PAS UIApplicationDelegate
    // directement : il s'abonne aux notifications internes
    // `.capacitorDidRegisterForRemoteNotifications` / `...DidFailToRegister...`.
    // Sans les deux relais ci-dessous, `PushNotifications.register()` reste sans
    // effet et l'événement « registration » n'arrive jamais au code web — donc
    // aucun jeton n'est enregistré et l'agent ne reçoit rien.

    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications,
                                        object: deviceToken)
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications,
                                        object: error)
    }

    // MARK: - Scène

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}
