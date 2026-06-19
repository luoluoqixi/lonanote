import ExpoModulesCore
import UIKit

fileprivate enum VariableBlurDirection {
  case topToBottom
  case bottomToTop

  init(direction: String?) {
    switch direction {
    case "bottomToTop":
      self = .bottomToTop
    default:
      self = .topToBottom
    }
  }
}

public final class VariableBlurView: ExpoView {
  private let effectView = UIVisualEffectView(effect: UIBlurEffect(style: .systemUltraThinMaterial))
  private let maskGradientLayer = CAGradientLayer()
  private var observerToken: (any NSObjectProtocol)?

  private var blurRadius: CGFloat = 32
  private var transitionHeight: CGFloat = 100
  private var direction: VariableBlurDirection = .topToBottom

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)

    backgroundColor = .clear
    isUserInteractionEnabled = false

    maskGradientLayer.colors = [UIColor.black.cgColor as Any, UIColor.clear.cgColor as Any]

    effectView.backgroundColor = .clear
    effectView.isUserInteractionEnabled = false
    effectView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    effectView.frame = bounds

    addSubview(effectView)
    effectView.layer.mask = maskGradientLayer

    updateBlurRadius()

    observerToken = NotificationCenter.default.addObserver(
      forName: UIApplication.willEnterForegroundNotification,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      self?.updateBlurRadius()
    }

    if #available(iOS 17.0, *) {
      registerForTraitChanges([UITraitUserInterfaceStyle.self]) { (self: Self, _: UITraitCollection) in
        self.updateBlurRadius()
      }
    }
  }

  deinit {
    if let observerToken {
      NotificationCenter.default.removeObserver(observerToken)
    }
  }

  public override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
    super.traitCollectionDidChange(previousTraitCollection)
    if #unavailable(iOS 17.0) {
      if traitCollection.hasDifferentColorAppearance(comparedTo: previousTraitCollection) {
        updateBlurRadius()
      }
    }
  }

  public override func layoutSubviews() {
    super.layoutSubviews()

    effectView.frame = bounds
    updateMask()
    updateBlurRadius()
  }

  public func setBlurRadius(_ blurRadius: CGFloat) {
    self.blurRadius = blurRadius
    updateBlurRadius()
  }

  public func setTransitionHeight(_ transitionHeight: CGFloat) {
    self.transitionHeight = transitionHeight
    updateMask()
  }

  public func setDirection(_ direction: String?) {
    self.direction = VariableBlurDirection(direction: direction)
    updateMask()
  }

  private func updateMask() {
    guard bounds.height > 0 else { return }

    let clampedTransitionHeight = max(0, min(transitionHeight, bounds.height))
    let percent = (bounds.height - clampedTransitionHeight) / bounds.height

    switch direction {
    case .topToBottom:
      maskGradientLayer.startPoint = CGPoint(x: 0, y: percent)
      maskGradientLayer.endPoint = CGPoint(x: 0, y: 1)
    case .bottomToTop:
      maskGradientLayer.startPoint = CGPoint(x: 0, y: 1 - percent)
      maskGradientLayer.endPoint = CGPoint(x: 0, y: 0)
    }

    maskGradientLayer.frame = bounds
  }

  private func updateBlurRadius() {
    guard let backgroundLayer = effectView.layer.sublayers?.first else { return }

    backgroundLayer.filters?.removeAll { String(describing: $0) != "gaussianBlur" }
    let filter = backgroundLayer.filters?.last as? NSObject
    filter?.setValue(blurRadius, forKey: "inputRadius")
  }
}
