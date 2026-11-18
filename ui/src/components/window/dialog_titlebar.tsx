import { StyleSheet, View } from "react-native";
import { Text, useUiTheme } from "rn-ui-kit";

import { os } from "@/api/common/platform";
import { TITLE_HEIGHT } from "@/config";
import { useSeparatorColor } from "@/hooks/ui/use_separator_color";

import { tauriDragRegionProps } from "./tauri_drag_region";
import { TitleBarDragOverlay } from "./titlebar_drag_overlay";
import { WindowControls, WindowPinControl } from "./window_controls";

/** 内容 Dialog 和辅助编辑器复用工作台拖拽层，macOS 保留系统交通灯。 */
export function DialogTitleBar({ title, showPin = false }: { title: string; showPin?: boolean }) {
  const theme = useUiTheme();
  const borderColor = useSeparatorColor();
  const mac = os() === "macos";
  const controlsWidth = mac ? (showPin ? 36 : 0) : showPin ? 174 : 138;
  const titleInset = mac ? 80 : controlsWidth + 8;
  return (
    <>
      <TitleBarDragOverlay reservedLeft={mac ? 80 : 0} reservedRight={controlsWidth} />
      <View
        style={[
          styles.bar,
          {
            backgroundColor: theme.background,
            borderBottomColor: borderColor,
          },
        ]}
      >
        <View
          {...tauriDragRegionProps}
          pointerEvents="none"
          style={[styles.title, { left: titleInset, right: titleInset }]}
        >
          <Text
            numberOfLines={1}
            style={{ fontSize: 13, color: theme.foreground, maxWidth: "100%", textAlign: "center" }}
          >
            {title}
          </Text>
        </View>
        {mac ? showPin ? <WindowPinControl /> : null : <WindowControls showPin={showPin} />}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: TITLE_HEIGHT,
    flexShrink: 0,
    justifyContent: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    position: "relative",
    zIndex: 100,
  },
  title: {
    position: "absolute",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
  },
});
