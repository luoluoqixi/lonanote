import { Spinner as HeroUISpinner } from "@heroui/react";

import type { SpinnerProps } from "./types";

export function Spinner({ className, nativeProps, size = "md", webProps }: SpinnerProps) {
  void nativeProps;
  return <HeroUISpinner className={className} size={size} {...(webProps as any)} />;
}
