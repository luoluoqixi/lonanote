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
        <DialogPrimitive.Overlay className="absolute inset-0 bg-black/45" />
        <View
          className="absolute inset-0 items-center justify-center px-4"
          pointerEvents="box-none"
        >
          <DialogPrimitive.Content className="w-full max-w-105 rounded-2xl bg-content1 p-6 shadow-xl">
            <DialogPrimitive.Close className="self-end rounded-md px-2 py-1">
              <Text className="text-sm text-foreground/70">关闭</Text>
            </DialogPrimitive.Close>
            <View className="mt-1 mb-4 gap-1.5">
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
        </View>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
