import ExpoModulesCore

public final class NativeIosCommonModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NativeIosCommon")

    View(VariableBlurView.self) {
      ViewName("VariableBlurView")

      Prop("blurRadius") { (view: VariableBlurView, blurRadius: Double) in
        view.setBlurRadius(CGFloat(blurRadius))
      }

      Prop("transitionHeight") { (view: VariableBlurView, transitionHeight: Double) in
        view.setTransitionHeight(CGFloat(transitionHeight))
      }

      Prop("direction") { (view: VariableBlurView, direction: String?) in
        view.setDirection(direction)
      }
    }
  }
}
