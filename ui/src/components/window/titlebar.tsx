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

const TITLE_RESERVED_WIDTH = 200;

export function TitleBar() {
  const theme = useUiTheme();
  const separatorColor = useSeparatorColor();
  const { presentation } = useAppMenuContext();
  const desktop = isDesktop();
  const mac = desktop && os() === "macos";
  const [barWidth, setBarWidth] = useState(1024);
  const [leftWidth, setLeftWidth] = useState(mac ? 80 : 280);
  const [expandedLeftWidth, setExpandedLeftWidth] = useState(280);
  const compact =
    barWidth < Math.max(desktop ? 520 : 310, expandedLeftWidth * 2 + TITLE_RESERVED_WIDTH);
  const titleInset = Math.max(
    presentation.native ? (mac ? 80 : 8) : leftWidth,
    desktop && !mac ? 138 : 8,
  );
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
        <View
          {...(desktop ? tauriDragRegionProps : {})}
          style={[styles.title, { left: titleInset, right: titleInset }]}
          pointerEvents="none"
        >
          <Text
            numberOfLines={1}
            style={{
              color: theme.foreground,
              fontSize: 14,
              fontWeight: "500",
              maxWidth: "100%",
              textAlign: "center",
            }}
          >
            {getAppTitle()}
          </Text>
        </View>
        {!presentation.native ? (
          <View
            onLayout={(event) => {
              const width = event.nativeEvent.layout.width + 8;
              setLeftWidth(width);
              if (!compact) setExpandedLeftWidth(width);
            }}
            style={styles.left}
          >
            {presentation.icon ? (
              <View {...tauriDragRegionProps} style={styles.iconDragRegion}>
                <View pointerEvents="none">
                  <Image
                    source={require("../../../assets/images/favicon.png")}
                    resizeMode="contain"
                    style={styles.icon}
                    accessibilityLabel="LonaNote"
                  />
                </View>
              </View>
            ) : null}
            <AppMenubar compact={compact} />
          </View>
        ) : null}
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
    flexShrink: 0,
    gap: 8,
    height: "100%",
  },
  icon: { width: 20, height: 20 },
  iconDragRegion: { height: "100%", justifyContent: "center" },
  title: {
    position: "absolute",
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    paddingHorizontal: 8,
  },
});
