import type { CSSProperties } from "react";
import { Label as TamaguiLabel } from "tamagui";

import { isWeb } from "@/api/common/platform";

import type { LabelProps } from "./types";

export function Label(props: LabelProps) {
  return (
    <TamaguiLabel
      {...props}
      style={
        isWeb() ? ([{ userSelect: "text" } as CSSProperties, props.style] as const) : props.style
      }
    />
  );
}
