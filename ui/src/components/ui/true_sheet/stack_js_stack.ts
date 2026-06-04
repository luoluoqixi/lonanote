/**
 * True Sheet 内 Android 等场景：Native Stack 依赖 ScreenContainer，无法挂在 Sheet 子树。
 * 使用 JS Stack（expo-router vendored）。
 */
export {
  createStackNavigator,
  type StackNavigationOptions,
  type StackNavigationProp,
} from "expo-router/build/react-navigation/stack";
