import { Dialog as HeroUIDialog } from "heroui-native";
import { StyleSheet, View, type ViewStyle, useWindowDimensions } from "react-native";

import { resolvePercentageValue as rpv } from "../utils";
import type { DialogProps } from "./types";

const DEFAULT_MAX_SIZE = 0.9;

const portalStyle: ViewStyle = {
  width: "100%",
  height: "100%",
  alignItems: "center",
};

export function Dialog({
  actions,
  accessibilityLabel,
  children,
  contentStyle,
  isOpen,
  onOpenChange,
  title,
  isCloseOnPressOverlay = true,
  width,
  height,
  maxWidth,
  maxHeight,
}: DialogProps) {
  const resolvedContentStyle = StyleSheet.flatten(contentStyle);
  const size = useWindowDimensions();

  const normalizedContentStyle: ViewStyle | undefined = resolvedContentStyle
    ? {
        ...resolvedContentStyle,
        width: rpv(resolvedContentStyle.width, size.width),
        maxWidth: rpv(resolvedContentStyle.maxWidth, size.width),
        height: rpv(resolvedContentStyle.height, size.height),
        maxHeight: rpv(resolvedContentStyle.maxHeight, size.height),
      }
    : undefined;

  const defaultContentWrapStyle: ViewStyle = {
    overflow: "hidden",
    maxWidth: rpv(maxWidth, size.width) ?? size.width * DEFAULT_MAX_SIZE,
    maxHeight: rpv(maxHeight, size.height) ?? size.height * DEFAULT_MAX_SIZE,
    width: rpv(width, size.width),
    height: rpv(height, size.height),
    alignSelf: "center",
  };

  return (
    <HeroUIDialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <HeroUIDialog.Portal style={portalStyle}>
        <HeroUIDialog.Overlay isCloseOnPress={isCloseOnPressOverlay} />
        <HeroUIDialog.Content
          accessibilityLabel={accessibilityLabel}
          style={[defaultContentWrapStyle, normalizedContentStyle]}
        >
          <HeroUIDialog.Close />
          <HeroUIDialog.Title>{title}</HeroUIDialog.Title>
          {children ? (
            <View className="mb-4" style={{ flexShrink: 1, minHeight: 0 }}>
              {children}
            </View>
          ) : null}
          {actions ? <View className="flex-row justify-end gap-3">{actions}</View> : null}
        </HeroUIDialog.Content>
      </HeroUIDialog.Portal>
    </HeroUIDialog>
  );
}
