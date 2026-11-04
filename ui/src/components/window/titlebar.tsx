import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useUiTheme } from "rn-ui-kit";

import { isDesktop, os } from "@/api/common/platform";
import { useAppMenuContext } from "@/components/app_menu/app_menu_host";
import { AppMenubar } from "@/components/app_menu/app_menubar";
import { TITLE_HEIGHT, getAppTitle } from "@/config";
import { useSeparatorColor } from "@/hooks/ui/use_separator_color";

import { tauriDragRegionProps } from "./tauri_drag_region";
import { TitleBarDragOverlay } from "./titlebar_drag_overlay";
import { WindowControls } from "./window_controls";

export function TitleBar() {
  const theme = useUiTheme();
  const separatorColor = useSeparatorColor();
  const { presentation } = useAppMenuContext();
  const desktop = isDesktop();
  const mac = desktop && os() === "macos";
  const [barWidth, setBarWidth] = useState(1024);
  const [leftWidth, setLeftWidth] = useState(mac ? 80 : 280);
  if (!presentation.visible) return null;
  return (
    <>
      {desktop ? <TitleBarDragOverlay reservedLeft={mac ? 0 : leftWidth} /> : null}
      <View
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
        style={[
          styles.bar,
          {
            backgroundColor: theme.background,
            borderBottomColor: separatorColor,
            height: desktop ? TITLE_HEIGHT : 44,
            paddingLeft: mac ? 80 : 8,
            paddingRight: desktop && !mac ? 138 : 8,
          },
        ]}
      >
        {!presentation.native ? (
          <View
            onLayout={(event) => setLeftWidth(event.nativeEvent.layout.width + 8)}
            style={styles.left}
          >
            {presentation.icon ? (
              <Image
                source={require("../../../assets/images/favicon.png")}
                resizeMode="contain"
                style={styles.icon}
                accessibilityLabel="LonaNote"
              />
            ) : null}
            <AppMenubar compact={barWidth < (desktop ? 520 : 310)} />
          </View>
        ) : null}
        <View {...(desktop ? tauriDragRegionProps : {})} style={styles.title}>
          <Text
            {...(desktop ? tauriDragRegionProps : {})}
            numberOfLines={1}
            style={{ color: theme.foreground, fontSize: 14, fontWeight: "500" }}
          >
            {getAppTitle()}
          </Text>
        </View>
        {desktop && !mac ? <WindowControls /> : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    position: "relative",
    width: "100%",
    flexShrink: 0,
    zIndex: 100,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    maxWidth: "75%",
    gap: 8,
    height: "100%",
  },
  icon: { width: 20, height: 20 },
  title: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    paddingHorizontal: 8,
  },
});
