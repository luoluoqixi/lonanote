import { Dialog as HeroUIDialog } from "heroui-native";
import { View } from "react-native";

import type { DialogProps } from "./types";

export function Dialog({
  actions,
  accessibilityLabel,
  children,
  contentStyle,
  isOpen,
  nativeProps,
  onOpenChange,
  title,
  webProps,
}: DialogProps) {
  void webProps;

  return (
    <HeroUIDialog isOpen={isOpen} onOpenChange={onOpenChange} {...(nativeProps as any)}>
      <HeroUIDialog.Portal>
        <HeroUIDialog.Overlay />
        <HeroUIDialog.Content
          accessibilityLabel={accessibilityLabel}
          style={[{ overflow: "hidden" }, contentStyle]}
        >
          <HeroUIDialog.Close />
          <HeroUIDialog.Title>{title}</HeroUIDialog.Title>
          {children ? (
            <View className="mb-4" style={{ flex: 1, minHeight: 0 }}>
              {children}
            </View>
          ) : null}
          {actions ? <View className="flex-row justify-end gap-3">{actions}</View> : null}
        </HeroUIDialog.Content>
      </HeroUIDialog.Portal>
    </HeroUIDialog>
  );
}
