import * as DialogPrimitive from "@rn-primitives/dialog";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { WebLayerPortalContainerContext } from "../provider/web_layer_portal_context";
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
  const flattenedContentStyle = StyleSheet.flatten(contentStyle);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay asChild>
          <View className="fixed inset-0 z-40 bg-black/45" />
        </DialogPrimitive.Overlay>
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 max-w-104 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-overlay p-6 shadow-overlay outline-none"
          style={{
            display: "flex",
            flexDirection: "column",
            overflow: "visible",
            width: "98%",
            ...flattenedContentStyle,
          }}
        >
          <WebLayerPortalContainerContext.Provider value={portalContainer}>
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
            {children ? (
              <View className="mb-4" style={{ flex: 1, minHeight: 0 }}>
                {children}
              </View>
            ) : null}
            {actions ? <View className="flex-row justify-end gap-3">{actions}</View> : null}
            <View
              ref={(node) => {
                setPortalContainer(node as unknown as HTMLElement | null);
              }}
              style={{ height: 0, left: 0, position: "absolute", top: 0, width: 0 }}
            />
          </WebLayerPortalContainerContext.Provider>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
