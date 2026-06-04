import {
  NavigationContainer,
  type NavigationContainerRef,
  NavigationIndependentTree,
  type ParamListBase,
  createNavigationContainerRef,
} from "expo-router/react-navigation";
import type { ReactNode, Ref } from "react";

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
          <NativeStack.Navigator
            initialRouteName={initialRouteName}
            screenOptions={screenOptions as NativeStackNavigationOptions}
          >
            {children}
          </NativeStack.Navigator>
        </NavigationContainer>
      </NavigationIndependentTree>
    );
  }

  return (
    <NavigationIndependentTree>
      <NavigationContainer ref={ref}>
        <JsStack.Navigator
          initialRouteName={initialRouteName}
          screenOptions={screenOptions as StackNavigationOptions}
        >
          {children}
        </JsStack.Navigator>
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
