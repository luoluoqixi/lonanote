import { type NavigationProp, useNavigation } from "@react-navigation/native";
import { useCallback, useSyncExternalStore } from "react";
import { Platform } from "react-native";
import { useTheme } from "tamagui";

import { isDesktop, isWeb } from "@/api/common";
import { NativeSheet, NativeSheetStack } from "@/components/ui";
import { DEBUG_OVERLAY_PORTAL_HOST } from "@/components/ui/sheet/native_sheet/true_sheet/overlay_toast_layout";
import { trueSheetInnerStackScreenOptions } from "@/components/ui/sheet/native_sheet/true_sheet/stack";
import { TrueSheetToolbarHeader } from "@/components/ui/sheet/native_sheet/true_sheet/toolbar_header";
import { useResolvedeColorScheme } from "@/hooks/settings";

import {
  DEBUG_NATIVE_SHEET_NAME,
  DEBUG_NESTED_SECTION_SHEET_DETENTS,
  cleanupDebugSectionSheet,
  closeDebugPanel,
  closeDebugSectionSheet,
  getDebugNestedSectionDetentLevel,
  getDebugPanelOpen,
  getDebugSectionOverlayPortalHost,
  getPresentedDebugSectionSheets,
  openDebugSection,
  setDebugPanelOpen,
  subscribeDebugPanelState,
  subscribeDebugSectionSheetState,
  switchDebugPanelToFullPage,
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
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          closeDebugPanel();
          return;
        }

        setDebugPanelOpen(true);
      }}
      open={open}
      overlayPortalHostName={DEBUG_OVERLAY_PORTAL_HOST}
      screenOptions={trueSheetInnerStackScreenOptions(
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
  const presentedSections = useSyncExternalStore(
    subscribeDebugSectionSheetState,
    getPresentedDebugSectionSheets,
    getPresentedDebugSectionSheets,
  );

  if (!definition) {
    return null;
  }

  const open = presentedSections.has(sectionKey);
  const position = getDebugNestedSectionDetentLevel();

  return (
    <NativeSheet
      handle
      modal
      name={`debug-section-${sectionKey}`}
      onOpenChange={(nextOpen: boolean) => {
        if (!nextOpen) {
          cleanupDebugSectionSheet(sectionKey);
        }
      }}
      open={open}
      overlay
      overlayPortalHostName={getDebugSectionOverlayPortalHost(sectionKey)}
      position={position}
      snapPoints={[...DEBUG_NESTED_SECTION_SHEET_DETENTS]}
      snapPointsMode="percent"
    >
      <TrueSheetToolbarHeader
        canGoBack={Platform.OS !== "ios"}
        onBack={() => closeDebugSectionSheet(sectionKey)}
        title={definition.label}
        transparent={Platform.OS === "ios"}
      />
      <DebugSectionPage layoutHost="nativeSheet" sectionKey={sectionKey} />
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
