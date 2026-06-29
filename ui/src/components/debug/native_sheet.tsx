import { type NavigationProp, useNavigation } from "@react-navigation/native";
import { useCallback, useSyncExternalStore } from "react";
import { Platform, View } from "react-native";
import { useTheme } from "tamagui";

import { isDesktop, isWeb } from "@/api/common";
import { NativeSheet, NativeSheetStack } from "@/components/ui";
import { DEBUG_OVERLAY_PORTAL_HOST } from "@/components/ui/sheet/native_sheet/debug_overlay_portal";
import { nativeSheetStackScreenOptions } from "@/components/ui/sheet/native_sheet/native_sheet_stack_screen_options";
import { useResolvedeColorScheme } from "@/hooks/settings";

import {
  DEBUG_NATIVE_SHEET_NAME,
  closeDebugSectionSheet,
  getDebugNestedSectionSheetSnapPoints,
  getDebugPanelOpen,
  getDebugSectionOverlayPortalHost,
  getDebugSectionSheetName,
  getPresentedDebugSectionSheets,
  markDebugPanelClosed,
  openDebugSection,
  setDebugPanelOpen,
  subscribeDebugPanelState,
  subscribeDebugSectionSheetState,
  switchDebugPanelToFullPage,
  useDebugNestedSectionDetentLevel,
} from "./debug_panel_sheet_state";
import { DebugHomePage } from "./pages/debug_home_page";
import { DebugSectionPage } from "./pages/debug_section_page";
import { DEBUG_PANEL_ROUTE_DEFINITIONS, type DebugTabKey } from "./routes";

type DebugSheetParamList = { index: undefined } & Record<DebugTabKey, undefined>;

function DebugHomeRoute() {
  const navigation = useNavigation<NavigationProp<DebugSheetParamList>>();

  const handleModeChange = useCallback((mode: "fullPage" | "nativeSheet") => {
    if (mode === "fullPage") {
      switchDebugPanelToFullPage();
    }
  }, []);

  return (
    <DebugHomePage
      currentSheetMode="nativeSheet"
      onOpenPanel={(key) => {
        void openDebugSection(key).then((handled) => {
          if (!handled) {
            navigation.navigate(key);
          }
        });
      }}
      onSheetModeChange={handleModeChange}
    />
  );
}

function createDebugSectionRoute(key: DebugTabKey) {
  return function DebugSectionRoute() {
    return <DebugSectionPage layoutHost="nativeSheet" sectionKey={key} />;
  };
}

function DebugNativeSheetStackHost() {
  const colorScheme = useResolvedeColorScheme();
  const theme = useTheme();
  const open = useSyncExternalStore(subscribeDebugPanelState, getDebugPanelOpen, getDebugPanelOpen);

  return (
    <NativeSheetStack
      initialRouteName="index"
      name={DEBUG_NATIVE_SHEET_NAME}
      onOpenChange={(nextOpen: boolean) => {
        if (!nextOpen) {
          markDebugPanelClosed();
          return;
        }

        setDebugPanelOpen(true);
      }}
      open={open}
      overlayPortalHostName={DEBUG_OVERLAY_PORTAL_HOST}
      screenOptions={nativeSheetStackScreenOptions(
        colorScheme,
        theme.background.val,
        theme.accentColor.val,
        theme.color.val,
      )}
    >
      <NativeSheetStack.Screen
        component={DebugHomeRoute}
        name="index"
        options={{ title: "调试面板" }}
      />
      {DEBUG_PANEL_ROUTE_DEFINITIONS.map((definition) => (
        <NativeSheetStack.Screen
          key={definition.key}
          component={createDebugSectionRoute(definition.key)}
          name={definition.key}
          options={{ title: definition.label }}
        />
      ))}
    </NativeSheetStack>
  );
}

function DebugSectionSheet({ sectionKey }: { sectionKey: DebugTabKey }) {
  const definition = DEBUG_PANEL_ROUTE_DEFINITIONS.find(
    (routeDefinition) => routeDefinition.key === sectionKey,
  );
  const theme = useTheme();
  const presentedSheets = useSyncExternalStore(
    subscribeDebugSectionSheetState,
    getPresentedDebugSectionSheets,
    getPresentedDebugSectionSheets,
  );
  const detentLevel = useDebugNestedSectionDetentLevel();

  if (!definition) {
    return null;
  }

  const open = presentedSheets.has(sectionKey);

  return (
    <NativeSheet
      backgroundColor={theme.background.val}
      handle
      name={getDebugSectionSheetName(sectionKey)}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          void closeDebugSectionSheet(sectionKey);
        }
      }}
      overlayPortalHostName={getDebugSectionOverlayPortalHost(sectionKey)}
      open={open}
      position={detentLevel}
      snapPoints={getDebugNestedSectionSheetSnapPoints()}
      snapPointsMode="percent"
    >
      <View style={{ backgroundColor: theme.background.val, flex: 1 }}>
        <DebugSectionPage
          contentTitle={definition.label}
          layoutHost={
            Platform.OS === "ios" || Platform.OS === "android" ? "nativeSheet" : "default"
          }
          sectionKey={sectionKey}
        />
      </View>
    </NativeSheet>
  );
}

function DebugSectionSheets() {
  return (
    <>
      {DEBUG_PANEL_ROUTE_DEFINITIONS.map((definition) => (
        <DebugSectionSheet key={definition.key} sectionKey={definition.key} />
      ))}
    </>
  );
}

export function DebugNativeSheetHost() {
  if (isWeb() || isDesktop()) {
    return null;
  }

  return (
    <>
      <DebugSectionSheets />
      <DebugNativeSheetStackHost />
    </>
  );
}
