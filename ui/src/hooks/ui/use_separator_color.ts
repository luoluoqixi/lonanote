import { getVariableValue, useTheme } from "@/components/ui/theme";

const FALLBACK_SEPARATOR_COLOR = "rgba(128, 128, 128, 0.24)";

export function useSeparatorColor() {
  const theme = useTheme();
  const separatorColor = getVariableValue(theme.outlineColor ?? theme.borderColor);

  return typeof separatorColor === "string" && separatorColor.length > 0
    ? separatorColor
    : FALLBACK_SEPARATOR_COLOR;
}
