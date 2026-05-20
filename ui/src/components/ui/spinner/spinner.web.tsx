import { Spinner as HeroUISpinner } from "@heroui/react";

import type { SpinnerProps } from "./types";

export function Spinner({ className, size = "md" }: SpinnerProps) {
  return <HeroUISpinner className={className} size={size} />;
}
