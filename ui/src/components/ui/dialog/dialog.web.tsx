import * as DialogPrimitive from "@rn-primitives/dialog";
import { Text, View } from "react-native";

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
    <DialogPrimitive.Root open={isOpen} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/45" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-overlay p-6 shadow-overlay outline-none">
          <DialogPrimitive.Close className="absolute top-3 right-2.5 z-10 rounded-md px-2 py-1">
            <Text className="text-sm text-foreground/70">关闭</Text>
          </DialogPrimitive.Close>
          <View className="mb-4 gap-1.5 pr-12">
            <DialogPrimitive.Title className="text-lg font-semibold text-foreground">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-sm leading-6 text-foreground/70">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </View>
          {children ? <View className="mb-4">{children}</View> : null}
          {actions ? <View className="flex-row justify-end gap-3">{actions}</View> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
