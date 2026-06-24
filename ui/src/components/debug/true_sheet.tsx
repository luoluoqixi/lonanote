import { type NavigationProp, useNavigation } from "@react-navigation/native";
import { useCallback, useSyncExternalStore } from "react";
import { Dimensions, Platform, View } from "react-native";
import { useTheme } from "tamagui";

import { isDesktop, isWeb } from "@/api/common";
import { NativeSheetStack } from "@/components/ui";
import { DEBUG_OVERLAY_PORTAL_HOST } from "@/components/ui/sheet/native_sheet/true_sheet/overlay_toast_layout";
import { TrueSheetPanel } from "@/components/ui/sheet/native_sheet/true_sheet/panel";
import { trueSheetInnerStackScreenOptions } from "@/components/ui/sheet/native_sheet/true_sheet/stack";
import { TrueSheetToolbarHeader } from "@/components/ui/sheet/native_sheet/true_sheet/toolbar_header";
import { useResolvedeColorScheme } from "@/hooks/settings";

import {
  DEBUG_NATIVE_SHEET_NAME,
  cleanupDebugSectionSheet,
  closeDebugPanel,
  closeDebugSectionSheet,
  getDebugNestedSectionSheetDetents,
  getDebugPanelOpen,
  getDebugSectionOverlayPortalHost,
  getDebugSectionSheetName,
  openDebugSection,
  setDebugPanelOpen,
  subscribeDebugPanelState,
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

  if (!definition) {
    return null;
  }

  const screenWidth = Dimensions.get("window").width;
  const grabberHitboxWidth = screenWidth - (Platform.OS === "ios" ? 40 : 32);
  const isIos = Platform.OS === "ios";

  return (
    <TrueSheetPanel
      chrome={isIos ? "plain" : "toolbar"}
      header={
        isIos ? (
          <View
            pointerEvents="none"
            style={{ alignItems: "center", height: 20, justifyContent: "center" }}
          >
            <View
              pointerEvents="none"
              style={{
                backgroundColor: "rgba(128, 128, 128, 0.35)",
                borderRadius: isIos ? 2.5 : 2,
                height: isIos ? 5 : 4,
                width: isIos ? 36 : 32,
              }}
            />
          </View>
        ) : undefined
      }
      name={getDebugSectionSheetName(sectionKey)}
      onDidDismiss={() => cleanupDebugSectionSheet(sectionKey)}
      onRequestClose={() => void closeDebugSectionSheet(sectionKey)}
      overlayPortalHostName={getDebugSectionOverlayPortalHost(sectionKey)}
      sheetProps={{
        detents: getDebugNestedSectionSheetDetents(),
        ...(isIos
          ? {
              grabberOptions: {
                adaptive: false,
                color: "transparent",
                height: 24,
                topMargin: 10,
                width: grabberHitboxWidth,
              },
              headerStyle: {
                height: 44,
                left: 0,
                position: "absolute" as const,
                right: 0,
                top: 0,
                zIndex: 1,
              },
            }
          : undefined),
      }}
      title={!isIos ? definition.label : undefined}
    >
      {isIos ? <TrueSheetToolbarHeader title={definition.label} transparent /> : null}
      <DebugSectionPage layoutHost="nativeSheet" sectionKey={sectionKey} />
    </TrueSheetPanel>
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
