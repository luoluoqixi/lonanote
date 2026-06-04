/**
 * SDK 56：勿从 `@react-navigation/native-stack` 导入，使用 expo-router 内 vendored 副本。
 */
export {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
  type NativeStackNavigationProp,
} from "expo-router/build/react-navigation/native-stack";
