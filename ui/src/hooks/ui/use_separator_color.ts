import { useUiTheme } from "rn-ui-kit";

const FALLBACK_SEPARATOR_COLOR = "rgba(128, 128, 128, 0.24)";

export function useSeparatorColor() {
  const separatorColor = useUiTheme().border;

  return typeof separatorColor === "string" && separatorColor.length > 0
    ? separatorColor
    : FALLBACK_SEPARATOR_COLOR;
}
