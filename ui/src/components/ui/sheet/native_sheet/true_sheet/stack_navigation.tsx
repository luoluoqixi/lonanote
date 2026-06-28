import {
  NavigationContainer,
  type NavigationContainerRef,
  NavigationIndependentTree,
  type ParamListBase,
  createNavigationContainerRef,
} from "@react-navigation/native";
import type { ReactNode, Ref } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { type StackNavigationOptions, createStackNavigator } from "./stack_js_stack";
import {
  type NativeStackNavigationOptions,
  createNativeStackNavigator,
} from "./stack_native_stack";
import {
  type TrueSheetInnerStackScreenOptions,
  trueSheetUsesNativeStackNavigator,
} from "./stack_navigator";

const NativeStack = createNativeStackNavigator();
const JsStack = createStackNavigator();

export type TrueSheetStackNavigationRef<ParamList extends ParamListBase = ParamListBase> =
  NavigationContainerRef<ParamList>;

export function createTrueSheetStackNavigationRef<
  ParamList extends ParamListBase = ParamListBase,
>() {
  return createNavigationContainerRef<ParamList>();
}

type TrueSheetStackNavigationProps = {
  children: ReactNode;
  initialRouteName?: string;
  navigationRef?: TrueSheetStackNavigationRef;
  screenOptions?: TrueSheetInnerStackScreenOptions;
};

function TrueSheetStackNavigationInner({
  children,
  initialRouteName,
  navigationRef,
  screenOptions,
}: TrueSheetStackNavigationProps) {
  const ref = navigationRef as unknown as Ref<NavigationContainerRef<ParamListBase>>;

  if (trueSheetUsesNativeStackNavigator) {
    return (
      <NavigationIndependentTree>
        <NavigationContainer ref={ref}>
          <View style={styles.nativeStackRoot}>
            <NativeStack.Navigator
              initialRouteName={initialRouteName}
              screenOptions={screenOptions as NativeStackNavigationOptions}
            >
              {children}
            </NativeStack.Navigator>
          </View>
        </NavigationContainer>
      </NavigationIndependentTree>
    );
  }

  return (
    <NavigationIndependentTree>
      <NavigationContainer ref={ref}>
        <View style={styles.stackRoot}>
          <JsStack.Navigator
            detachInactiveScreens={false}
            initialRouteName={initialRouteName}
            screenOptions={screenOptions as StackNavigationOptions}
          >
            {children}
          </JsStack.Navigator>
        </View>
      </NavigationContainer>
    </NavigationIndependentTree>
  );
}

/**
 * True Sheet 内独立 NavigationContainer + Stack（iOS 原生 / Android JS）。
 */
export function TrueSheetStackNavigation(props: TrueSheetStackNavigationProps) {
  return <TrueSheetStackNavigationInner {...props} />;
}

/** 与当前平台匹配的 Stack.Screen */
export const TrueSheetInnerStack = trueSheetUsesNativeStackNavigator ? NativeStack : JsStack;

const styles = StyleSheet.create({
  nativeStackRoot: {
    flex: Platform.OS === "ios" ? 1 : undefined,
    minHeight: Platform.OS === "ios" ? 0 : undefined,
  },
  stackRoot: {
    flex: 1,
    minHeight: 0,
  },
});
