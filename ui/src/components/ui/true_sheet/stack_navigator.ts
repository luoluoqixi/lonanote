import { Platform } from "react-native";

import type { StackNavigationOptions } from "./stack_js_stack";
import type { NativeStackNavigationOptions } from "./stack_native_stack";

/** True Sheet 内：iOS 用 Native Stack；Android Sheet 子树无法用 react-native-screens。 */
export const trueSheetUsesNativeStackNavigator = Platform.OS === "ios";

export type TrueSheetInnerStackScreenOptions =
  | NativeStackNavigationOptions
  | StackNavigationOptions;
