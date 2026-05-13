import { Dialog as HeroUIDialog } from "heroui-native";
import { View } from "react-native";

import type { DialogProps } from "./types";

export function Dialog({
  actions,
  children,
  contentStyle,
  description,
  isOpen,
  onOpenChange,
  title,
}: DialogProps) {
  return (
    <HeroUIDialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <HeroUIDialog.Portal>
        <HeroUIDialog.Overlay />
        <HeroUIDialog.Content style={[{ overflow: "hidden" }, contentStyle]}>
          <HeroUIDialog.Close variant="ghost" className="absolute top-3 right-2.5 z-50" />
          <View className="mb-4 gap-1.5 pr-10">
            <HeroUIDialog.Title>{title}</HeroUIDialog.Title>
            {description ? (
              <HeroUIDialog.Description>{description}</HeroUIDialog.Description>
            ) : null}
          </View>
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
