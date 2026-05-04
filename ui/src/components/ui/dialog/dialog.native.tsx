import { Dialog as HeroUIDialog } from "heroui-native";
import { View } from "react-native";

import type { DialogProps } from "./types";

export function Dialog({
  actions,
  children,
  description,
  isOpen,
  onOpenChange,
  title,
}: DialogProps) {
  return (
    <HeroUIDialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <HeroUIDialog.Portal>
        <HeroUIDialog.Overlay />
        <HeroUIDialog.Content>
          <HeroUIDialog.Close variant="ghost" />
          <View className="mb-4 gap-1.5">
            <HeroUIDialog.Title>{title}</HeroUIDialog.Title>
            {description ? (
              <HeroUIDialog.Description>{description}</HeroUIDialog.Description>
            ) : null}
          </View>
          {children ? <View className="mb-4">{children}</View> : null}
          {actions ? <View className="flex-row justify-end gap-3">{actions}</View> : null}
        </HeroUIDialog.Content>
      </HeroUIDialog.Portal>
    </HeroUIDialog>
  );
}
