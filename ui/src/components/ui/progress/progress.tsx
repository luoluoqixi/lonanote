import { Progress as TamaguiProgress } from "tamagui";

import type { ProgressIndicatorProps, ProgressProps } from "./types";

function ProgressRoot(props: ProgressProps) {
  const { children, indicatorProps, ...rootProps } = props;

  return (
    <TamaguiProgress {...rootProps}>
      {children ?? <ProgressIndicator {...indicatorProps} />}
    </TamaguiProgress>
  );
}

function ProgressIndicator(props: ProgressIndicatorProps) {
  return <TamaguiProgress.Indicator {...props} />;
}

export const Progress = Object.assign(ProgressRoot, {
  Indicator: ProgressIndicator,
});
