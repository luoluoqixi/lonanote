import { type NavigationProp, useNavigation } from "expo-router/react-navigation";

import { TrueSheetInnerStack } from "@/components/ui/true_sheet/stack";

import { DEBUG_PANEL_ROUTE_DEFINITIONS, type DebugTabKey } from "../routes";
import { DebugHomeScreen, DebugSectionScreen } from "../screens";
import { switchDebugPanelToFullPage } from "./api";
import { DebugTrueSheetScroll } from "./shared_scroll";

export type DebugTrueSheetStackParamList = {
  index: undefined;
} & Record<DebugTabKey, undefined>;

export function DebugTrueSheetHomeRoute() {
  const navigation = useNavigation<NavigationProp<DebugTrueSheetStackParamList>>();

  return (
    <DebugTrueSheetScroll>
      <DebugHomeScreen
        onOpenPanel={(key) => navigation.navigate(key)}
        onSwitchToFullPage={() => {
          void switchDebugPanelToFullPage();
        }}
      />
    </DebugTrueSheetScroll>
  );
}

function createDebugTrueSheetSectionRoute(sectionKey: DebugTabKey) {
  return function DebugTrueSheetSectionRoute() {
    return (
      <DebugTrueSheetScroll>
        <DebugSectionScreen layoutHost="trueSheet" sectionKey={sectionKey} />
      </DebugTrueSheetScroll>
    );
  };
}

export function createDebugTrueSheetStackScreens() {
  return (
    <>
      <TrueSheetInnerStack.Screen
        component={DebugTrueSheetHomeRoute}
        name="index"
        options={{ title: "调试面板" }}
      />
      {DEBUG_PANEL_ROUTE_DEFINITIONS.map((definition) => (
        <TrueSheetInnerStack.Screen
          key={definition.key}
          component={createDebugTrueSheetSectionRoute(definition.key)}
          name={definition.key}
          options={{ title: definition.label }}
        />
      ))}
    </>
  );
}
