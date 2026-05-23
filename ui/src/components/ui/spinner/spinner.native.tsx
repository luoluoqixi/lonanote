import { Spinner as HeroUISpinner } from "heroui-native";

import type { SpinnerProps } from "./types";

export function Spinner({ className, nativeProps, size = "md", webProps }: SpinnerProps) {
  void webProps;
  return <HeroUISpinner className={className} size={size} {...(nativeProps as any)} />;
}
