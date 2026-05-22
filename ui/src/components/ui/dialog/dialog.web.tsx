import { AlertDialog as HeroUIDialog } from "@heroui/react";
import { StyleSheet } from "react-native";

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
  const flattened = StyleSheet.flatten(contentStyle);

  void nativeProps;

  return (
    <HeroUIDialog isOpen={isOpen} onOpenChange={onOpenChange} {...(webProps as any)}>
      <HeroUIDialog.Trigger></HeroUIDialog.Trigger>
      <HeroUIDialog.Backdrop variant="opaque" isDismissable>
        <HeroUIDialog.Container>
          <HeroUIDialog.Dialog
            aria-label={accessibilityLabel}
            style={{
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              overflow: "hidden",
              ...flattened,
            }}
          >
            <HeroUIDialog.CloseTrigger />
            <HeroUIDialog.Header>
              <HeroUIDialog.Heading>{title}</HeroUIDialog.Heading>
            </HeroUIDialog.Header>
            <HeroUIDialog.Body className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {children}
            </HeroUIDialog.Body>
            {actions ? <HeroUIDialog.Footer>{actions}</HeroUIDialog.Footer> : null}
          </HeroUIDialog.Dialog>
        </HeroUIDialog.Container>
      </HeroUIDialog.Backdrop>
    </HeroUIDialog>
  );
}
