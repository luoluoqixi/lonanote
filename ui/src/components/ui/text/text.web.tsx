import { Typography } from "@heroui/react";

import type { TextProps } from "./types";

export function Text({ children, className, nativeProps, webProps }: TextProps) {
  void nativeProps;
  return (
    <Typography className={className} {...(webProps as any)}>
      {children}
    </Typography>
  );
}
