import ExpoModulesCore
import UIKit

public class NativeSystemFontsModule: Module {
  private func families() -> [String] {
    UIFont.familyNames.filter { family in
      !["emoji", "symbol", "icon"].contains { family.lowercased().contains($0) }
    }.sorted { $0.localizedStandardCompare($1) == .orderedAscending }
  }

  public func definition() -> ModuleDefinition {
    Name("NativeSystemFonts")

    AsyncFunction("list") { (_: Bool) -> [[String: Any]] in
      self.families().map { name in
        ["platform": "ios", "familyKey": name, "displayName": name,
         "ui": ["available": true], "editor": ["available": true]]
      }
    }.runOnQueue(.main)

    AsyncFunction("resolve") { (selection: [String: String], consumer: String) -> [String: Any] in
      guard selection["platform"] == "ios", let family = selection["familyKey"],
        ["ui", "editor"].contains(consumer), self.families().contains(family),
        !UIFont.fontNames(forFamilyName: family).isEmpty else {
        throw NSError(domain: "NativeSystemFonts", code: 1, userInfo: [NSLocalizedDescriptionKey: "当前字体不可用，已使用系统默认"])
      }
      // RN 可直接匹配系统 family；WKWebView 用公开的 PostScript 名逐 face 验证。
      if consumer == "ui" { return ["family": family, "faces": []] }
      let faces: [[String: Any]] = UIFont.fontNames(forFamilyName: family).compactMap { name in
        guard let font = UIFont(name: name, size: 16) else { return nil }
        let traits = font.fontDescriptor.symbolicTraits
        let values = font.fontDescriptor.object(forKey: .traits) as? [UIFontDescriptor.TraitKey: Any]
        let weight = (values?[.weight] as? NSNumber)?.doubleValue ?? 0
        // UIFont 的 weight 是 -1...1，映射到 CSS 常用的九档。
        let levels: [(Double, Int)] = [(-0.8,100),(-0.6,200),(-0.4,300),(0,400),(0.23,500),(0.3,600),(0.4,700),(0.56,800),(0.62,900)]
        let cssWeight = levels.min(by: { abs($0.0 - weight) < abs($1.0 - weight) })?.1 ?? 400
        return ["family": family, "weight": cssWeight, "italic": traits.contains(.traitItalic),
                "source": ["kind": "local", "name": name]]
      }
      return ["family": family, "faces": faces]
    }.runOnQueue(.main)
  }
}
