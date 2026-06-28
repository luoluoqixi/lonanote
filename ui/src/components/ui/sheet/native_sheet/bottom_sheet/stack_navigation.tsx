import {
  NavigationContainer,
  type NavigationContainerRef,
  NavigationIndependentTree,
  type ParamListBase,
  createNavigationContainerRef,
} from "@react-navigation/native";
import {
  type StackNavigationOptions,
  type StackNavigationProp,
  createStackNavigator,
} from "@react-navigation/stack";
import type { ReactNode, Ref } from "react";
import { StyleSheet, View } from "react-native";

const BottomSheetStack = createStackNavigator();

export type BottomSheetStackNavigationRef<ParamList extends ParamListBase = ParamListBase> =
  NavigationContainerRef<ParamList>;

export type BottomSheetStackNavigationOptions = StackNavigationOptions;
export type BottomSheetStackNavigationPropAlias<ParamList extends ParamListBase = ParamListBase> =
  StackNavigationProp<ParamList>;

export function createBottomSheetStackNavigationRef<
  ParamList extends ParamListBase = ParamListBase,
>() {
  return createNavigationContainerRef<ParamList>();
}

type BottomSheetStackNavigationProps = {
  children: ReactNode;
  initialRouteName?: string;
  navigationRef?: BottomSheetStackNavigationRef;
  screenOptions?: BottomSheetStackNavigationOptions;
};

export function BottomSheetStackNavigation({
  children,
  initialRouteName,
  navigationRef,
  screenOptions,
}: BottomSheetStackNavigationProps) {
  const ref = navigationRef as unknown as Ref<NavigationContainerRef<ParamListBase>>;

  return (
    <NavigationIndependentTree>
      <NavigationContainer ref={ref}>
        <View style={styles.stackRoot}>
          <BottomSheetStack.Navigator
            initialRouteName={initialRouteName}
            screenOptions={screenOptions}
          >
            {children}
          </BottomSheetStack.Navigator>
        </View>
      </NavigationContainer>
    </NavigationIndependentTree>
  );
}

export const BottomSheetInnerStack = BottomSheetStack;

const styles = StyleSheet.create({
  stackRoot: {
    flex: 1,
    minHeight: 0,
  },
});
