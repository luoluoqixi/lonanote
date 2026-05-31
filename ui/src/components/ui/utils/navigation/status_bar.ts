import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import type { StatusBarStyle } from "expo-status-bar";

import { isMobile, os } from "@/api/common/platform";

export type ResolvedColorScheme = "light" | "dark";

type NativeStackStatusBarStyle = NonNullable<NativeStackNavigationOptions["statusBarStyle"]>;

/**
 * iOS 移动端由 react-native-screens 按屏幕控制状态栏（需 Info.plist
 * `UIViewControllerBasedStatusBarAppearance = YES`），不能与 `expo-status-bar` 同时使用。
 */
export function usesNativeStackStatusBar(): boolean {
  return isMobile() && os() === "ios";
}

/** 随应用深浅色主题：深色界面用浅色状态栏内容，浅色界面用深色内容。 */
export function resolveNativeStackStatusBarStyle(
  colorScheme: ResolvedColorScheme,
): NativeStackStatusBarStyle {
  return colorScheme === "dark" ? "light" : "dark";
}

/** 非 iOS 原生栈场景下根级 `expo-status-bar` 的样式（与主题一致）。 */
export function resolveExpoStatusBarStyle(colorScheme: ResolvedColorScheme): StatusBarStyle {
  return resolveNativeStackStatusBarStyle(colorScheme);
}

type StatusBarOptions = Pick<NativeStackNavigationOptions, "statusBarStyle" | "statusBarAnimation">;

function iosStatusBarOptions(style: NativeStackStatusBarStyle): StatusBarOptions {
  if (!usesNativeStackStatusBar()) {
    return {};
  }

  return {
    statusBarAnimation: "fade",
    statusBarStyle: style,
  };
}

/** 普通全屏 / push 路由：跟随应用主题，切换深浅色时会更新。 */
export function nativeStackStatusBarOptions(
  colorScheme: ResolvedColorScheme,
): StatusBarOptions {
  return iosStatusBarOptions(resolveNativeStackStatusBarStyle(colorScheme));
}

/**
 * Sheet / pageSheet 等模态：状态栏区域常落在背后压暗的父页上，用 `auto` 交给系统按可见背景判断。
 * 仅用于 Sheet 呈现，不要用于首页等普通路由。
 */
export function nativeStackSheetStatusBarOptions(): StatusBarOptions {
  return iosStatusBarOptions("auto");
}
