import type { CSSProperties } from "react";
import { Label as TamaguiLabel } from "tamagui";

import { isWeb } from "@/api/common/platform";

import type { LabelProps } from "./types";

const DEFAULT_LABEL_WEB_STYLE = { userSelect: "text" } as CSSProperties;

export function Label(props: LabelProps) {
  return (
    <TamaguiLabel
      {...props}
      style={isWeb() ? ([DEFAULT_LABEL_WEB_STYLE, props.style] as const) : props.style}
    />
  );
}
