/* eslint-disable prettier/prettier */

const fs = require("node:fs");
const path = require("node:path");

const {
  IOSConfig,
  withAppDelegate,
  withInfoPlist,
  withXcodeProject,
} = require("expo/config-plugins");

const LEGACY_STARTUP_BLOCK = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif`;

const SCENE_STARTUP_COMMENT_TEXT =
  "// iOS 27 要求使用 UIScene 生命周期；窗口创建和 React Native 启动由 SceneDelegate 负责。";
const SCENE_STARTUP_COMMENT = `    ${SCENE_STARTUP_COMMENT_TEXT}`;

const SCENE_DELEGATE_CONTENTS = `internal import Expo
import React

@objc(SceneDelegate)
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard
      let windowScene = scene as? UIWindowScene,
      let appDelegate = UIApplication.shared.delegate as? AppDelegate,
      let reactNativeFactory = appDelegate.reactNativeFactory
    else {
      return
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window

    reactNativeFactory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions(from: connectionOptions)
    )
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard
      let urlContext = URLContexts.first,
      let appDelegate = UIApplication.shared.delegate as? AppDelegate
    else {
      return
    }

    var options: [UIApplication.OpenURLOptionsKey: Any] = [
      .openInPlace: urlContext.options.openInPlace,
    ]
    if let sourceApplication = urlContext.options.sourceApplication {
      options[.sourceApplication] = sourceApplication
    }
    if let annotation = urlContext.options.annotation {
      options[.annotation] = annotation
    }

    _ = appDelegate.application(
      UIApplication.shared,
      open: urlContext.url,
      options: options
    )
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else {
      return
    }

    _ = appDelegate.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in }
    )
  }

  func sceneDidBecomeActive(_ scene: UIScene) {
    appDelegate?.applicationDidBecomeActive(UIApplication.shared)
  }

  func sceneWillResignActive(_ scene: UIScene) {
    appDelegate?.applicationWillResignActive(UIApplication.shared)
  }

  func sceneWillEnterForeground(_ scene: UIScene) {
    appDelegate?.applicationWillEnterForeground(UIApplication.shared)
  }

  func sceneDidEnterBackground(_ scene: UIScene) {
    appDelegate?.applicationDidEnterBackground(UIApplication.shared)
  }

  private var appDelegate: AppDelegate? {
    UIApplication.shared.delegate as? AppDelegate
  }

  private func launchOptions(
    from connectionOptions: UIScene.ConnectionOptions
  ) -> [UIApplication.LaunchOptionsKey: Any]? {
    var launchOptions: [UIApplication.LaunchOptionsKey: Any] = [:]

    if let urlContext = connectionOptions.urlContexts.first {
      launchOptions[.url] = urlContext.url
      if let sourceApplication = urlContext.options.sourceApplication {
        launchOptions[.sourceApplication] = sourceApplication
      }
      if let annotation = urlContext.options.annotation {
        launchOptions[.annotation] = annotation
      }
    }

    if let userActivity = connectionOptions.userActivities.first {
      launchOptions[.userActivityDictionary] = [
        UIApplication.LaunchOptionsKey.userActivityType.rawValue: userActivity.activityType,
        "UIApplicationLaunchOptionsUserActivityKey": userActivity,
      ]
    }

    return launchOptions.isEmpty ? nil : launchOptions
  }
}
`;

function withSceneAppDelegate(config) {
  return withAppDelegate(config, (modConfig) => {
    const appDelegate = modConfig.modResults;
    if (appDelegate.language !== "swift") {
      throw new Error("with-ios-scene-lifecycle 目前只支持 Swift AppDelegate。");
    }

    if (appDelegate.contents.includes(LEGACY_STARTUP_BLOCK)) {
      appDelegate.contents = appDelegate.contents.replace(
        LEGACY_STARTUP_BLOCK,
        SCENE_STARTUP_COMMENT,
      );
    } else if (appDelegate.contents.includes(SCENE_STARTUP_COMMENT_TEXT)) {
      appDelegate.contents = appDelegate.contents.replace(
        /^[ \t]*\/\/ iOS 27 要求使用 UIScene 生命周期；窗口创建和 React Native 启动由 SceneDelegate 负责。$/m,
        SCENE_STARTUP_COMMENT,
      );
    } else {
      throw new Error(
        "无法在 AppDelegate.swift 中定位旧的 React Native 启动代码，未应用 UIScene 生命周期修改。",
      );
    }

    return modConfig;
  });
}

function withSceneManifest(config) {
  return withInfoPlist(config, (modConfig) => {
    modConfig.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).SceneDelegate",
          },
        ],
      },
    };
    return modConfig;
  });
}

function withSceneDelegateFile(config) {
  return withXcodeProject(config, (modConfig) => {
    const projectName = modConfig.modRequest.projectName;
    if (!projectName) {
      throw new Error("无法确定 iOS project name，未生成 SceneDelegate.swift。");
    }

    const relativePath = path.join(projectName, "SceneDelegate.swift");
    const absolutePath = path.join(
      modConfig.modRequest.platformProjectRoot,
      relativePath,
    );

    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, SCENE_DELEGATE_CONTENTS, "utf8");

    if (!modConfig.modResults.hasFile(relativePath)) {
      modConfig.modResults = IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: relativePath,
        groupName: projectName,
        project: modConfig.modResults,
      });
    }

    return modConfig;
  });
}

module.exports = function withIosSceneLifecycle(config) {
  config = withSceneAppDelegate(config);
  config = withSceneManifest(config);
  config = withSceneDelegateFile(config);
  return config;
};
