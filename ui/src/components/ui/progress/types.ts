import type { ComponentProps } from "react";
import type { Progress as TamaguiProgress } from "tamagui";

export interface ProgressProps extends ComponentProps<typeof TamaguiProgress> {
  indicatorProps?: ProgressIndicatorProps;
}

export type ProgressIndicatorProps = ComponentProps<typeof TamaguiProgress.Indicator>;
