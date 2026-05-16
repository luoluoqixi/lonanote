import { AlertDialog as HeroUIDialog } from "@heroui/react";
import { StyleSheet } from "react-native";

import type { DialogProps } from "./types";

export function Dialog({
  actions,
  children,
  contentStyle,
  isOpen,
  onOpenChange,
  title,
}: DialogProps) {
  const flattened = StyleSheet.flatten(contentStyle);
  return (
    <HeroUIDialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <HeroUIDialog.Backdrop>
        <HeroUIDialog.Container>
          <HeroUIDialog.Dialog style={{ overflow: "hidden", ...flattened }}>
            <HeroUIDialog.CloseTrigger />
            <HeroUIDialog.Header>
              <HeroUIDialog.Heading>{title}</HeroUIDialog.Heading>
            </HeroUIDialog.Header>
            <HeroUIDialog.Body>{children}</HeroUIDialog.Body>
            <HeroUIDialog.Footer>{actions}</HeroUIDialog.Footer>
          </HeroUIDialog.Dialog>
        </HeroUIDialog.Container>
      </HeroUIDialog.Backdrop>
    </HeroUIDialog>
  );
}
