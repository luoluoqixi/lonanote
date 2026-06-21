import { type NavigationProp, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Dimensions, Platform, View } from "react-native";
import { useTheme } from "tamagui";

import { isDesktop, isWeb } from "@/api/common";
import { TrueSheetPanel } from "@/components/ui/true_sheet/panel";
import {
  TrueSheetInnerStack,
  TrueSheetStackHost,
  trueSheetInnerStackScreenOptions,
} from "@/components/ui/true_sheet/stack";
import { TrueSheetToolbarHeader } from "@/components/ui/true_sheet/toolbar_header";
import { DEBUG_OVERLAY_PORTAL_HOST } from "@/components/ui/utils/overlay_toast_layout";
import { useResolvedeColorScheme } from "@/hooks/settings";

import {
  DEBUG_NESTED_SECTION_SHEET_DETENTS,
  DEBUG_TRUE_SHEET_NAME,
  cleanupDebugSectionSheet,
  closeDebugPanel,
  closeDebugSectionSheet,
  getDebugSectionOverlayPortalHost,
  getDebugSectionSheetName,
  markDebugPanelClosed,
  openDebugSection,
  switchDebugPanelToFullPage,
} from "./debug_panel_sheet_state";
import { DebugHomePage } from "./pages/debug_home_page";
import { DebugSectionPage } from "./pages/debug_section_page";
import { DEBUG_PANEL_ROUTE_DEFINITIONS, type DebugTabKey } from "./routes";

type DebugSheetParamList = { index: undefined } & Record<DebugTabKey, undefined>;

function IosDebugHomeRoute() {
  const navigation = useNavigation<NavigationProp<DebugSheetParamList>>();

  const handleModeChange = useCallback((mode: "fullPage" | "trueSheet") => {
    if (mode === "fullPage") {
      void switchDebugPanelToFullPage();
    }
  }, []);

  return (
    <DebugHomePage
      currentSheetMode="trueSheet"
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

function createIosDebugSectionRoute(key: DebugTabKey) {
  return function IosDebugSectionRoute() {
    return <DebugSectionPage layoutHost="trueSheet" sectionKey={key} />;
  };
}

function IosDebugTrueSheetHost() {
  const colorScheme = useResolvedeColorScheme();
  const theme = useTheme();

  return (
    <TrueSheetStackHost
      initialRouteName="index"
      name={DEBUG_TRUE_SHEET_NAME}
      onDidDismiss={markDebugPanelClosed}
      onRequestClose={() => void closeDebugPanel()}
      overlayPortalHostName={DEBUG_OVERLAY_PORTAL_HOST}
      screenOptions={trueSheetInnerStackScreenOptions(
        colorScheme,
        theme.background.val,
        theme.accentColor.val,
        theme.color.val,
      )}
    >
      <TrueSheetInnerStack.Screen
        component={IosDebugHomeRoute}
        name="index"
        options={{ title: "调试面板" }}
      />
      {DEBUG_PANEL_ROUTE_DEFINITIONS.map((definition) => (
        <TrueSheetInnerStack.Screen
          key={definition.key}
          component={createIosDebugSectionRoute(definition.key)}
          name={definition.key}
          options={{ title: definition.label }}
        />
      ))}
    </TrueSheetStackHost>
  );
}

function AndroidDebugHomeRoute({ onNavigate }: { onNavigate: (key: DebugTabKey) => void }) {
  const handleModeChange = useCallback((mode: "fullPage" | "trueSheet") => {
    if (mode === "fullPage") {
      void switchDebugPanelToFullPage();
    }
  }, []);

  return (
    <DebugHomePage
      currentSheetMode="trueSheet"
      onOpenPanel={(key) => {
        void openDebugSection(key).then((handled) => {
          if (!handled) {
            onNavigate(key);
          }
        });
      }}
      onSheetModeChange={handleModeChange}
    />
  );
}

function AndroidDebugTrueSheetHost() {
  const [screen, setScreen] = useState<"home" | DebugTabKey>("home");
  const isHome = screen === "home";
  const sectionDefinition = isHome
    ? undefined
    : DEBUG_PANEL_ROUTE_DEFINITIONS.find((definition) => definition.key === screen);

  return (
    <TrueSheetPanel
      canGoBack={!isHome}
      chrome="toolbar"
      name={DEBUG_TRUE_SHEET_NAME}
      onBack={() => setScreen("home")}
      onDidDismiss={markDebugPanelClosed}
      onRequestClose={() => void closeDebugPanel()}
      overlayPortalHostName={DEBUG_OVERLAY_PORTAL_HOST}
      title={isHome ? "调试面板" : (sectionDefinition?.label ?? "调试")}
    >
      {isHome ? (
        <AndroidDebugHomeRoute onNavigate={(key) => setScreen(key)} />
      ) : (
        <DebugSectionPage layoutHost="trueSheet" sectionKey={screen} />
      )}
    </TrueSheetPanel>
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
        detents: [...DEBUG_NESTED_SECTION_SHEET_DETENTS],
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
      <DebugSectionPage layoutHost="trueSheet" sectionKey={sectionKey} />
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

export function DebugTrueSheetHost() {
  if (isWeb() || isDesktop()) {
    return null;
  }

  return (
    <>
      <DebugSectionSheets />
      {Platform.OS === "android" ? <AndroidDebugTrueSheetHost /> : <IosDebugTrueSheetHost />}
    </>
  );
}
