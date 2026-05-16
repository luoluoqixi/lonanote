import { Dialog as HeroUIDialog } from "heroui-native";
import { View } from "react-native";

import type { DialogProps } from "./types";

export function Dialog({
  actions,
  children,
  contentStyle,
  isOpen,
  onOpenChange,
  title,
}: DialogProps) {
  return (
    <HeroUIDialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <HeroUIDialog.Portal>
        <HeroUIDialog.Overlay />
        <HeroUIDialog.Content style={[{ overflow: "hidden" }, contentStyle]}>
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
