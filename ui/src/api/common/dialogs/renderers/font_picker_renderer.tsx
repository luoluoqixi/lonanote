import { FontPicker } from "@/components/settings/font_picker";

import type { DialogRendererProps } from "../dialog_content_registry";

export function FontPickerRenderer({
  payload,
  onComplete,
}: DialogRendererProps<"settings.font-picker">) {
  return (
    <FontPicker
      consumer={payload.consumer}
      dialogContentOnly
      open
      onOpenChange={(open) => {
        if (!open) onComplete(null);
      }}
    />
  );
}
