import type { ComponentType } from "react";

import { DesktopSettingsDialog } from "@/components/settings/desktop/settings_dialog";

import type { DialogRendererProps } from "./dialog_content_registry";

export function registerSettingsDialogRenderer(
  renderers: Map<string, ComponentType<DialogRendererProps<any>>>,
) {
  renderers.set("settings", ({ payload, onComplete }: DialogRendererProps<"settings">) => (
    <DesktopSettingsDialog
      initialPageId={payload.initialPageId as never}
      isOpen
      nativeWindow
      onOpenChange={(open) => {
        if (!open) onComplete(null);
      }}
    />
  ));
}
